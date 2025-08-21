import React from 'react';
import Plotly from 'plotly.js-basic-dist';
import { observer } from 'mobx-react-lite';
import { useCellStore } from '../store';

import createPlotlyComponent from 'react-plotly.js/factory';
import { ErrorBoundary } from './error-boundary';
const Plot = createPlotlyComponent(Plotly);

const plotDefaultLayout: Partial<Plotly.Layout> = {
  showlegend: true,
  paper_bgcolor: '#FAFAFA',
  plot_bgcolor: '#FAFAFA',
  margin: {
    t: 50,
    l: 30,
    r: 30,
    b: 60
  },
  xaxis: {
    type: 'date',
    showticklabels: true,
    tickformat: '%H:%M:%S.%L',
    title: {
      text: ''
    }
  },
  yaxis: {
    fixedrange: true
  },
  dragmode: 'pan',
  shapes: [],
  legend: {
    orientation: 'h',
    x: 1,
    xanchor: 'right',
    y: 1.08,
    yanchor: 'top',
    font: {
      family: 'sans-serif',
      size: 12,
      color: '#000'
    },
    itemsizing: 'trace',
    tracegroupgap: 5,
    itemclick: 'toggle',
    itemdoubleclick: 'toggleothers'
  }
};

const plotOptions = { displaylogo: false, scrollZoom: true };

const TaskChart = observer(() => {
  const cell = useCellStore();
  const taskChartStore = cell.taskChartStore;

  const [chartRefreshRevision, setRevision] = React.useState(1);

  const data = React.useMemo(() => {
    const tasktrace: Plotly.Data = {
      x: taskChartStore.taskDataX,
      y: taskChartStore.taskDataY,
      type: 'scatter',
      mode: 'lines',
      line: {
        color: '#6DD58C',
        width: 2,
        shape: 'hv'
      },
      fill: 'tozeroy',
      fillcolor: 'rgba(109, 213, 140, 0.3)',
      name: 'Active Tasks',
      legendgroup: 'tasks',
      showlegend: false
    };
    const executortrace: Plotly.Data = {
      x: taskChartStore.executorDataX,
      y: taskChartStore.executorDataY,
      type: 'scatter',
      mode: 'lines',
      line: {
        color: '#6991D6',
        width: 2,
        shape: 'hv'
      },
      name: 'Executor Cores',
      legendgroup: 'executors',
      showlegend: false
    };
    
    const taskLegend: Plotly.Data = {
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: {
        symbol: 'circle',
        size: 8,
        color: '#6DD58C'
      },
      name: 'Active Tasks',
      legendgroup: 'tasks',
      showlegend: true
    };
    const executorLegend: Plotly.Data = {
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: {
        symbol: 'circle',
        size: 8,
        color: '#6991D6'
      },
      name: 'Executor Cores',
      legendgroup: 'executors',
      showlegend: true
    };
    
    const jobtrace: Plotly.Data = {
      x: taskChartStore.jobDataX,
      y: taskChartStore.jobDataY,
      text: taskChartStore.jobDataText as any,
      type: 'scatter',
      mode: 'markers',
      showlegend: false,
      marker: {
        symbol: 23,
        color: '#4CB5AE',
        size: 1
      }
    };
    return [tasktrace, executortrace, jobtrace, taskLegend, executorLegend];
  }, [
    taskChartStore.taskDataX,
    taskChartStore.taskDataY,
    taskChartStore.executorDataX,
    taskChartStore.executorDataY,
    taskChartStore.jobDataX,
    taskChartStore.jobDataY,
    taskChartStore.jobDataText
  ]);

  const plotLayout: Partial<Plotly.Layout> = React.useMemo(() => {
    return {
      ...plotDefaultLayout,
      shapes: taskChartStore.jobDataX.map(job => {
        return {
          type: 'line',
          yref: 'paper',
          x0: job,
          y0: 0,
          x1: job,
          y1: 1,
          line: {
            color: '#4CB5AE',
            width: 1.5
          }
        };
      }),
      annotations: [
        {
          text: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
          x: 0,
          y: 1.08,
          xref: 'paper',
          yref: 'paper',
          xanchor: 'left',
          yanchor: 'top',
          showarrow: false,
          font: {
            family: 'Roboto',
            size: 12,
            color: '#000'
          }
        }
      ],
      datarevision: chartRefreshRevision
    };
  }, [taskChartStore.jobDataX, chartRefreshRevision]);

  // Periodically refresh the chart by updating the revision
  React.useEffect(() => {
    const refreshInterval = setInterval(() => {
      setRevision(revision => revision + 1);
    }, 2000);
    return () => {
      // clean up when react component is unmounted.
      clearInterval(refreshInterval);
    };
  });

  return (
    <ErrorBoundary>
      <div className="tabcontent">
        <div className="tabcontent-inner">
          <Plot
            layout={plotLayout}
            data={data}
            config={plotOptions}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            revision={chartRefreshRevision}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
});
export default TaskChart;
