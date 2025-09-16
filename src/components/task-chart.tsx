import React from 'react';
import Plotly from 'plotly.js-basic-dist';
import { observer } from 'mobx-react-lite';
import { useCellStore } from '../store';

import createPlotlyComponent from 'react-plotly.js/factory';
import { ErrorBoundary } from './error-boundary';
const Plot = createPlotlyComponent(Plotly);

// Function to detect if dark mode is active
const isDarkMode = (): boolean => {
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
      tickformat: '%H:%M:%S.%f',
      title: {
        text: ''
      },
      tickfont: {
        color: darkMode ? '#E1E3E1' : '#000' // Axis text color
      },
      gridcolor: darkMode ? 'rgba(225, 227, 225, 0.3)' : undefined, // Translucent grid color in dark mode
      fixedrange: false,
      autorange: true
    },
    yaxis: {
      fixedrange: true,
      dtick: 1, // Force y-axis to show only whole numbers
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
    // Running tasks trace (tasks up to executor cores limit) - Green
    const runningtaskstrace: Plotly.Data = {
      x: taskChartStore.taskDataX,
      y: taskChartStore.taskDataY.map((numTasks, index) => {
        const numCores = taskChartStore.executorDataY[index] || 0;
        return Math.min(numTasks, numCores); // Cap at executor cores
      }),
      type: 'scatter',
      mode: 'lines',
      line: {
        color: '#6DD58C',
        width: 2,
        shape: 'hv'
      },
      fill: 'tozeroy',
      fillcolor: 'rgba(109, 213, 140, 0.3)',
      name: 'Running Tasks',
      legendgroup: 'running',
      showlegend: false
    };

    // Create scheduled tasks data with proper boundary connections
    const createScheduledTasksData = () => {
      const scheduledX: number[] = [];
      const scheduledY: number[] = [];
      const baseX: number[] = [];
      const baseY: number[] = [];
      
      let inScheduledRegion = false;
      
      for (let i = 0; i < taskChartStore.taskDataX.length; i++) {
        const time = taskChartStore.taskDataX[i];
        const numTasks = taskChartStore.taskDataY[i];
        const numCores = taskChartStore.executorDataY[i] || 0;
        const scheduledTasks = Math.max(0, numTasks - numCores);
        
        if (scheduledTasks > 0) {
          if (!inScheduledRegion) {
            // Starting a new scheduled region - add boundary point
            if (i > 0) {
              scheduledX.push(taskChartStore.taskDataX[i-1]);
              scheduledY.push(taskChartStore.executorDataY[i-1] || 0);
              baseX.push(taskChartStore.taskDataX[i-1]);
              baseY.push(taskChartStore.executorDataY[i-1] || 0);
            }
            inScheduledRegion = true;
          }
          
          scheduledX.push(time);
          scheduledY.push(numTasks);
          baseX.push(time);
          baseY.push(numCores);
        } else if (inScheduledRegion) {
          // Ending scheduled region - add boundary point
          scheduledX.push(time);
          scheduledY.push(numCores);
          baseX.push(time);
          baseY.push(numCores);
          inScheduledRegion = false;
        }
      }
      
      return { scheduledX, scheduledY, baseX, baseY };
    };

    const { scheduledX, scheduledY, baseX, baseY } = createScheduledTasksData();

    // Create a "base" trace for scheduled tasks to fill from (executor cores level)
    const scheduledbasetrace: Plotly.Data = {
      x: baseX,
      y: baseY,
      type: 'scatter',
      mode: 'lines',
      line: {
        color: 'transparent',
        width: 0
      },
      name: 'Scheduled Base',
      showlegend: false,
      hoverinfo: 'skip'
    };

    // Scheduled tasks trace (only when above executor cores) - Orange
    const scheduledtaskstrace: Plotly.Data = {
      x: scheduledX,
      y: scheduledY,
      type: 'scatter',
      mode: 'lines',
      line: {
        color: '#FFB74D',
        width: 2,
        shape: 'hv'
      },
      fill: 'tonexty',
      fillcolor: 'rgba(255, 183, 77, 0.5)',
      name: 'Scheduled Tasks',
      legendgroup: 'scheduled',
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

    // Legend entries
    const runningLegend: Plotly.Data = {
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: {
        symbol: 'circle',
        size: 8,
        color: '#6DD58C'
      },
      name: 'Running Tasks',
      legendgroup: 'running',
      showlegend: true
    };

    const scheduledLegend: Plotly.Data = {
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: {
        symbol: 'circle',
        size: 8,
        color: '#FFB74D'
      },
      name: 'Scheduled Tasks',
      legendgroup: 'scheduled',
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

    return [runningtaskstrace, scheduledbasetrace, scheduledtaskstrace, executortrace, jobtrace, runningLegend, scheduledLegend, executorLegend];
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
      xaxis: {
        ...getPlotDefaultLayout().xaxis,
        range: taskChartStore.taskDataX.length > 0 ? 
          [taskChartStore.taskDataX[0], taskChartStore.taskDataX[taskChartStore.taskDataX.length - 1]] : 
          undefined
      },
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
      datarevision: chartRefreshRevision,
      uirevision: 'preserve_zoom'
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
