import React from 'react';
import Plotly from 'plotly.js-basic-dist';
import { observer } from 'mobx-react-lite';
import { useCellStore } from '../store';

import createPlotlyComponent from 'react-plotly.js/factory';
import { ErrorBoundary } from './error-boundary';
const Plot = createPlotlyComponent(Plotly);

const plotDefaultLayout: Partial<Plotly.Layout> = {
  showlegend: true,
  paper_bgcolor: '#FAFAFA',  // Same background for entire chart area including legend
  plot_bgcolor: '#FAFAFA',   // Graph area background color
  margin: {
    t: 50, // top margin
    l: 30, // left margin
    r: 30, // right margin
    b: 60 // bottom margin
  },
  xaxis: {
    type: 'date',
    showticklabels: true,  // Show time tick labels on x-axis
    tickformat: '%H:%M:%S.%L',  // Show only time (hours:minutes:seconds), not date
    title: {
      text: ''  // Remove x-axis title
    }
    // title: 'Time',
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
    // traceorder: 'normal',
    font: {
      family: 'sans-serif',
      size: 12,
      color: '#000'
    },
    itemsizing: 'trace',
    tracegroupgap: 5,
    itemclick: 'toggle',
    itemdoubleclick: 'toggleothers'
    // bgcolor: '#E2E2E2',
    // bordercolor: '#FFFFFF',
    // borderwidth: 2
  }
};

const plotOptions = { displaylogo: false, scrollZoom: true };

const TaskChart = observer(() => {
  const cell = useCellStore();
  const taskChartStore = cell.taskChartStore;

  const [chartRefreshRevision, setRevision] = React.useState(1);

  const data = React.useMemo(() => {
    // Main chart traces - no legend
    const tasktrace: Plotly.Data = {
      x: taskChartStore.taskDataX,
      y: taskChartStore.taskDataY,
      type: 'scatter',
      mode: 'lines',
      line: {
        color: '#6DD58C',
        width: 2,
        shape: 'hv'  // Step chart - horizontal then vertical
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
        shape: 'hv'  // Step chart - horizontal then vertical
      },
      name: 'Executor Cores',
      legendgroup: 'executors',
      showlegend: false
    };
    
    // Legend-only traces with circular markers
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
      text: taskChartStore.jobDataText as any, //this.jobDataText,
      type: 'scatter',
      mode: 'markers',
      // name: 'Jobs',
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
      <div className="tabcontent" style={{ 
        padding: '8px', 
        backgroundColor: '#F0F4F9',
        boxSizing: 'border-box'
      }}>
        <div style={{ 
          backgroundColor: '#FAFAFA',
          borderRadius: '4px',
          height: '100%'
        }}>
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
