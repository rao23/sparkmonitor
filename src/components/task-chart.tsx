import React from 'react';
import Plotly from 'plotly.js-basic-dist';
import { observer } from 'mobx-react-lite';
import { useCellStore } from '../store';

import createPlotlyComponent from 'react-plotly.js/factory';
import { ErrorBoundary } from './error-boundary';
const Plot = createPlotlyComponent(Plotly);

// Function to detect if dark mode is active
const isDarkMode = (): boolean => {
  // Check for system dark mode preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true;
  }
  
  // Check for JupyterLab dark theme
  const jupyterElement = document.querySelector('[data-jp-theme-light="false"]');
  if (jupyterElement) {
    return true;
  }
  
  // Check for VSCode dark theme
  const vscodeElement = document.querySelector('.vscode-dark, .vscode-high-contrast');
  if (vscodeElement) {
    return true;
  }
  
  return false;
};

const getPlotDefaultLayout = (): Partial<Plotly.Layout> => {
  const darkMode = isDarkMode();
  
  return {
    showlegend: true,
    paper_bgcolor: darkMode ? '#303030' : '#FAFAFA', // Graph background
    plot_bgcolor: darkMode ? '#303030' : '#FAFAFA',  // Plot area background
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
      },
      tickfont: {
        color: darkMode ? '#E1E3E1' : '#000' // Axis text color
      },
      gridcolor: darkMode ? 'rgba(225, 227, 225, 0.3)' : undefined // Translucent grid color in dark mode
    },
    yaxis: {
      fixedrange: true,
      tickfont: {
        color: darkMode ? '#E1E3E1' : '#000' // Axis text color
      },
      gridcolor: darkMode ? 'rgba(225, 227, 225, 0.3)' : undefined // Translucent grid color in dark mode
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
        color: darkMode ? '#E1E3E1' : '#000' // Legend text color
      },
      itemsizing: 'trace',
      tracegroupgap: 5,
      itemclick: 'toggle',
      itemdoubleclick: 'toggleothers'
    }
  };
};

const plotOptions = { displaylogo: false, scrollZoom: true };

const TaskChart = observer(() => {
  const cell = useCellStore();
  const taskChartStore = cell.taskChartStore;

  const [chartRefreshRevision, setRevision] = React.useState(1);
  const [themeRevision, setThemeRevision] = React.useState(1);

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
    const darkMode = isDarkMode();
    
    return {
      ...getPlotDefaultLayout(),
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
            color: darkMode ? '#E1E3E1' : '#000' // Annotation text color
          }
        }
      ],
      datarevision: chartRefreshRevision
    };
  }, [taskChartStore.jobDataX, chartRefreshRevision, themeRevision]);

  // Listen for theme changes
  React.useEffect(() => {
    const handleThemeChange = () => {
      setThemeRevision(prev => prev + 1);
    };

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);

    // Listen for DOM changes that might indicate theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'data-jp-theme-light' ||
             mutation.attributeName === 'class')) {
          handleThemeChange();
        }
      });
    });

    // Observe the document body for class changes (VSCode theme changes)
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class', 'data-jp-theme-light'],
      subtree: true 
    });

    // Observe the document element for JupyterLab theme changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-jp-theme-light'],
      subtree: true
    });

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
      observer.disconnect();
    };
  }, []);

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
