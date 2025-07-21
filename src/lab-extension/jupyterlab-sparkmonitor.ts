import React from 'react';
import { ICellModel } from '@jupyterlab/cells';
import { NotebookPanel } from '@jupyterlab/notebook';
import {
  IComm,
  IKernelConnection
} from '@jupyterlab/services/lib/kernel/kernel';
import { ICommMsgMsg } from '@jupyterlab/services/lib/kernel/messages';
import { PanelLayout } from '@lumino/widgets';
import CurrentCellTracker from './current-cell';
import { CellWidget } from '../components';
import { ReactWidget } from '@jupyterlab/apputils';

import type { NotebookStore } from '../store/notebook';

export default class JupyterLabSparkMonitor {
  currentCellTracker: CurrentCellTracker;
  cellExecCountSinceSparkJobStart = 0;
  kernel?: IKernelConnection;

  /** Communication object with the kernel. */
  comm?: IComm;

  constructor(
    private notebookPanel: NotebookPanel,
    private notebookStore: NotebookStore
  ) {
    this.createCellReactElements();
    this.currentCellTracker = new CurrentCellTracker(notebookPanel);
    this.kernel = (notebookPanel as any).session
      ? (this.notebookPanel as any).session.kernel
      : this.notebookPanel.sessionContext.session?.kernel;

    // Fixes Reloading the browser
    this.startComm();

    // Fixes Restarting the Kernel
    this.kernel?.statusChanged.connect((_, status) => {
      if (status === 'starting') {
        this.currentCellTracker.cellReexecuted = false;
        this.startComm();
      }
    });

    // listen for cell removed
    this.notebookPanel.content.model?.cells.changed.connect((_, data) => {
      if (data.type === 'remove') {
        data.oldValues.forEach(cell => {
          notebookStore.onCellRemoved(cell.id);
        });
      }
    });
  }

  /**
  //  * Find the correct insertion index for the SparkMonitor widget.
  //  * This method dynamically determines where to insert the widget based on the cell's layout.
  //  */
  // private findInsertionIndex(codeCell: Widget): number {
  //   const layout = codeCell.layout as PanelLayout;
  //   const widgets = layout.widgets;
    
  //   // Look for input area widget (usually has class containing 'input')
  //   for (let i = 0; i < widgets.length; i++) {
  //     const widget = widgets[i];
  //     const node = widget.node;
      
  //     // Check if this widget contains the input area
  //     if (
  //       node.classList.contains('jp-Cell-inputWrapper') ||
  //       node.classList.contains('jp-InputArea') ||
  //       node.querySelector('.jp-InputArea') ||
  //       node.querySelector('.jp-Cell-inputWrapper')
  //     ) {
  //       // Insert after the input area
  //       return i + 1;
  //     }
  //   }
    
  //   // Fallback: look for output area and insert before it
  //   for (let i = 0; i < widgets.length; i++) {
  //     const widget = widgets[i];
  //     const node = widget.node;
      
  //     if (
  //       node.classList.contains('jp-Cell-outputWrapper') ||
  //       node.classList.contains('jp-OutputArea') ||
  //       node.querySelector('.jp-OutputArea') ||
  //       node.querySelector('.jp-Cell-outputWrapper')
  //     ) {
  //       // Insert before the output area
  //       return i;
  //     }
  //   }
    
  //   // Final fallback: append to end
  //   return widgets.length;
  // }

  // /**
  //  * Alternative DOM-based approach for more reliable positioning
  //  */
  // private insertWidgetUsingDOM(codeCell: Widget, sparkWidget: Widget): boolean {
  //   try {
  //     const cellNode = codeCell.node;
      
  //     // Look for input wrapper or input area
  //     const inputWrapper = cellNode.querySelector('.jp-Cell-inputWrapper') || 
  //                         cellNode.querySelector('.jp-InputArea');
      
  //     if (inputWrapper) {
  //       // Create a container for our widget
  //       const container = document.createElement('div');
  //       container.className = 'spark-monitor-container';
        
  //       // Insert after the input wrapper
  //       inputWrapper.parentNode?.insertBefore(container, inputWrapper.nextSibling);
        
  //       // Mount the React widget to the container
  //       container.appendChild(sparkWidget.node);
        
  //       return true;
  //     }
      
  //     return false;
  //   } catch (error) {
  //     console.warn('SparkMonitor: DOM-based insertion failed', error);
  //     return false;
  //   }
  // }

  createCellReactElements() {
    const createElementIfNotExists = (cellModel: ICellModel) => {
      if (cellModel.type === 'code') {
        const codeCell = this.notebookPanel.content.widgets.find(
          widget => widget.model === cellModel
        );
        if (codeCell && !codeCell.node.querySelector('.sparkMonitorCellRoot')) {
          const widget = ReactWidget.create(
            React.createElement(CellWidget, {
              notebookId: this.notebookPanel.id,
              cellId: cellModel.id
            })
          );
          widget.addClass('spark-monitor-cell-widget');

          // Find the correct insertion index dynamically
          const layout = codeCell.layout as PanelLayout;
          let insertIndex = layout.widgets.length; // Default to end
          
          // Look for output area and insert before it
          for (let i = 0; i < layout.widgets.length; i++) {
            const widgetNode = layout.widgets[i].node;
            if (widgetNode.classList.contains('jp-Cell-outputWrapper') || 
                widgetNode.querySelector('.jp-OutputArea')) {
              insertIndex = i;
              break;
            }
          }

          layout.insertWidget(insertIndex, widget);
          codeCell.update();
        }
      }
    };

    const cells = this.notebookPanel.context.model.cells;

    // Ensure new cells created have a monitoring display
    cells.changed.connect((cells, changed) => {
      for (let i = 0; i < cells.length; i += 1) {
        createElementIfNotExists(cells.get(i));
      }
    });

    // Do it the first time
    for (let i = 0; i < cells.length; i += 1) {
      createElementIfNotExists(cells.get(i));
    }
  }

  toggleAll() {
    this.notebookStore.toggleHideAllDisplays();
  }

  startComm() {
    console.log('SparkMonitor: Starting Comm with kernel.');
    this.currentCellTracker.ready().then(() => {
      this.comm =
        'createComm' in (this.kernel || {})
          ? this.kernel?.createComm('SparkMonitor')
          : (this.kernel as any).connectToComm('SparkMonitor');
      if (!this.comm) {
        console.warn('SparkMonitor: Unable to connect to comm');
        return;
      }
      this.comm.open({ msgtype: 'openfromfrontend' });
      this.comm.onMsg = message => {
        this.handleMessage(message);
      };
      this.comm.onClose = message => {
        // noop
      };
      console.log('SparkMonitor: Connection with comms established');
    });
  }

  onSparkJobStart(data: any) {
    const cell = this.currentCellTracker.getActiveCell();
    if (!cell) {
      console.warn('SparkMonitor: Job started with no running cell.');
      return;
    }
    // See if we have a new execution. If it's new (a cell has been run again) we need to clear the cell monitor
    const newExecution =
      this.currentCellTracker.getNumCellsExecuted() >
      this.cellExecCountSinceSparkJobStart;
    if (newExecution) {
      this.cellExecCountSinceSparkJobStart =
        this.currentCellTracker.getNumCellsExecuted();
      this.notebookStore.onCellExecutedAgain(cell.model.id);
    }
    this.notebookStore.onSparkJobStart(cell.model.id, data);
  }

  onSparkStageSubmitted(data: any) {
    const cell = this.currentCellTracker.getActiveCell();
    if (!cell) {
      console.warn('SparkMonitor: Stage started with no running cell.');
      return;
    }
    this.notebookStore.onSparkStageSubmitted(cell.model.id, data);
  }

  handleMessage(msg: ICommMsgMsg) {
    if (!msg.content.data.msgtype) {
      console.warn('SparkMonitor: Unknown message');
    }
    if (msg.content.data.msgtype === 'fromscala') {
      const data: any = JSON.parse(msg.content.data.msg as string);
      switch (data.msgtype) {
        case 'sparkJobStart':
          this.onSparkJobStart(data);
          break;
        case 'sparkJobEnd':
          this.notebookStore.onSparkJobEnd(data);
          break;
        case 'sparkStageSubmitted':
          this.onSparkStageSubmitted(data);
          break;
        case 'sparkStageCompleted':
          this.notebookStore.onSparkStageCompleted(data);
          break;
        case 'sparkStageActive':
          this.notebookStore.onSparkStageActive(data);
          break;
        case 'sparkTaskStart':
          this.notebookStore.onSparkTaskStart(data);
          break;
        case 'sparkTaskEnd':
          this.notebookStore.onSparkTaskEnd(data);
          break;
        case 'sparkApplicationStart':
          this.notebookStore.onSparkApplicationStart(data);
          break;
        case 'sparkApplicationEnd':
          // noop
          break;
        case 'sparkExecutorAdded':
          this.notebookStore.onSparkExecutorAdded(data);
          break;
        case 'sparkExecutorRemoved':
          this.notebookStore.onSparkExecutorRemoved(data);
          break;
        default:
          console.warn('SparkMonitor: Unknown message');
          break;
      }
    }
  }
}