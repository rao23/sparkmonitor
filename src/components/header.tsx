import React from 'react';
import { observer } from 'mobx-react-lite';
import { useCellStore, useNotebookStore } from '../store';

export const CellMonitorHeader = observer(() => {
  const notebook = useNotebookStore();
  const cell = useCellStore();

  const isButtonActive = (view: string) =>
    !cell.isCollapsed && cell.view === view ? 'tabbuttonactive' : '';
  const jobButtonClassNames =
    'jobtabletabbuttonicon tabbutton ' + isButtonActive('jobs');
  const tasksButtonClassNames =
    'taskviewtabbuttonicon tabbutton ' + isButtonActive('taskchart');
  const timelineButtonClassNames =
    'timelinetabbuttonicon tabbutton ' + isButtonActive('timeline');

  return (
    <div className="title">
      <div className="titleleft">
        <span className="tbitem badgecontainer">
          Apache Spark:
          <span style={{ marginLeft: '8px' }}>
            <span className="badgeexecutor">
              <span className="badgeexecutorcount">{notebook.numExecutors}</span>{' '}
              Executors
            </span>
            <span className="badgeexecutorcores">
              <span className="badgeexecutorcorescount">
                {notebook.numTotalCores}
              </span>{' '}
              Cores
            </span>
          </span>
          <span style={{ marginLeft: '16px' }}>Jobs:</span>
          <span className="badges">
            {cell.numActiveJobs ? (
              <span className="badgerunning">
                <span className="badgerunningcount">{cell.numActiveJobs}</span>{' '}
                Running
              </span>
            ) : (
              ''
            )}
            {cell.numCompletedJobs ? (
              <span className="badgecompleted">
                <span className="badgecompletedcount">
                  {cell.numCompletedJobs}
                </span>{' '}
                Completed
              </span>
            ) : (
              ''
            )}
            {cell.numFailedJobs ? (
              <span className="badgefailed">
                <span className="badgefailedcount">{cell.numFailedJobs}</span>{' '}
                Failed
              </span>
            ) : (
              ''
            )}
          </span>
        </span>
      </div>
      <div className="titleright">
        <div className="tabbuttons">
          <span
            className={jobButtonClassNames}
            title="Jobs"
            onClick={() => {
              cell.setView('jobs');
            }}
          />
          <span
            className={tasksButtonClassNames}
            title="Tasks"
            onClick={() => {
              cell.setView('taskchart');
            }}
          />
          <span
            className={timelineButtonClassNames}
            title="Event Timeline"
            onClick={() => {
              cell.setView('timeline');
            }}
          />
          {/* TODO <span className="sparkuitabbuttonicon tabbutton" title="Open the Spark UI" /> */}
          <span
            className="closebuttonicon tabbutton"
            title="Close Display"
            onClick={() => {
              cell.toggleHideCellDisplay();
            }}
          />
        </div>
      </div>
    </div>
  );
});
