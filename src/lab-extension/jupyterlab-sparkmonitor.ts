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
  
  /** Retry mechanism for comm connection */
  private commRetryTimer?: number;
  private maxRetries = 10;
  private retryCount = 0;
  private retryInterval = 2000; // 2 seconds
  private isCommReady = false;
  private isDisposed = false;
  private healthCheckInterval?: number;
  private isCommCreationInProgress = false;

  constructor(
    private notebookPanel: NotebookPanel,
    private notebookStore: NotebookStore
  ) {
    this.createCellReactElements();
    this.currentCellTracker = new CurrentCellTracker(notebookPanel);
    this.kernel = (notebookPanel as any).session
      ? (this.notebookPanel as any).session.kernel
      : this.notebookPanel.sessionContext.session?.kernel;

    // Start comm with retry mechanism
    this.startCommWithRetry();

    // Handle kernel status changes
    this.kernel?.statusChanged.connect((_, status) => {
      console.log(`SparkMonitor: Kernel status changed to: ${status}`);
      if (status === 'starting') {
        this.currentCellTracker.cellReexecuted = false;
        this.resetCommConnection();
        this.startCommWithRetry();
      } else if (status === 'restarting') {
        this.resetCommConnection();
      } else if (status === 'idle') {
        // If kernel is idle but comm isn't ready, try to establish comm
        if (!this.isCommReady) {
          this.startCommWithRetry();
        }
      }
    });

    // Handle session context changes (for cases where kernel might change)
    this.notebookPanel.sessionContext.sessionChanged.connect(() => {
      console.log('SparkMonitor: Session changed, updating kernel reference');
      this.kernel = this.notebookPanel.sessionContext.session?.kernel || undefined;
      this.resetCommConnection();
      if (this.kernel) {
        this.startCommWithRetry();
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

    // Periodic health check for comm connection
    this.startCommHealthCheck();
  }

  private resetCommConnection() {
    console.log('SparkMonitor: Resetting comm connection');
    this.isCommReady = false;
    this.retryCount = 0;
    this.isCommCreationInProgress = false;
    
    if (this.commRetryTimer) {
      clearTimeout(this.commRetryTimer);
      this.commRetryTimer = undefined;
    }
    if (this.comm) {
      try {
        this.comm.close();
      } catch (e) {
        console.warn('SparkMonitor: Error closing existing comm:', e);
      }
      this.comm = undefined;
    }
  }

  private startCommWithRetry() {
    if (this.isDisposed) {
      console.log('SparkMonitor: Extension disposed, skipping comm retry');
      return;
    }

    if (this.isCommReady) {
      console.log('SparkMonitor: Comm already ready, skipping retry');
      return;
    }

    if (this.isCommCreationInProgress) {
      console.log('SparkMonitor: Comm creation already in progress, skipping retry');
      return;
    }

    if (this.retryCount >= this.maxRetries) {
      console.error(`SparkMonitor: Failed to establish comm after ${this.maxRetries} attempts`);
      return;
    }

    this.retryCount++;
    this.isCommCreationInProgress = true;
    console.log(`SparkMonitor: Attempting to start comm (attempt ${this.retryCount}/${this.maxRetries})`);

    this.startComm()
      .then((success) => {
        this.isCommCreationInProgress = false;
        if (success) {
          console.log('SparkMonitor: Comm successfully established');
          this.isCommReady = true;
          this.retryCount = 0;
        } else {
          this.scheduleCommRetry();
        }
      })
      .catch((error) => {
        this.isCommCreationInProgress = false;
        console.warn('SparkMonitor: Error starting comm:', error);
        this.scheduleCommRetry();
      });
  }

  private scheduleCommRetry() {
    if (this.isDisposed) {
      return;
    }
    
    if (this.retryCount < this.maxRetries) {
      console.log(`SparkMonitor: Scheduling comm retry in ${this.retryInterval}ms`);
      this.commRetryTimer = window.setTimeout(() => {
        this.startCommWithRetry();
      }, this.retryInterval);
    }
  }

  private startCommHealthCheck() {
    // Check comm health every 30 seconds
    this.healthCheckInterval = window.setInterval(() => {
      if (this.isDisposed) {
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
          this.healthCheckInterval = undefined;
        }
        return;
      }
      
      if (!this.isCommReady && this.kernel?.status === 'idle' && !this.isCommCreationInProgress) {
        console.log('SparkMonitor: Health check detected comm is not ready, attempting to reconnect');
        this.startCommWithRetry();
      }
    }, 30000);
  }

  /**
   * Sets up a MutationObserver to remove Spark progress logs and empty outputs
   * from the cell's output area and its underlying model.
   *
   * @param codeCell - The code cell widget
   */
  setupSparkLogAndEmptyOutputObserver(codeCell: any) {
    const widgetPresent = !!codeCell.node.querySelector('.spark-monitor-cell-widget');
    if (!widgetPresent) return;

    const outputWrapper = codeCell.node.querySelector('.jp-Cell-outputWrapper');
    if (!outputWrapper) return;

    // Reference to the output area model (if available)
    const outputAreaModel = codeCell.outputArea?.model;

    // Helper to remove Spark logs and empty outputs
    const scrubOutputs = () => {
      // Remove Spark log outputs and empty outputs from DOM and model
      const outputAreas = outputWrapper.querySelectorAll('.jp-OutputArea-output');
      outputAreas.forEach((outputArea: { textContent: string; remove: () => void; }, idx: any) => {
        const outputText = outputArea.textContent || '';
        // Remove if Spark log OR if empty (no text at all, including whitespace)
        if (
          /Spark.*Progress|Stage \d+|Task \d+/.test(outputText) ||
          outputText.trim() === ''
        ) {
          // Remove DOM node
          outputArea.remove();
          // Remove from model (if available)
          if (outputAreaModel) {
            // Loop backwards to avoid index shift when removing
            for (let i = outputAreaModel.length - 1; i >= 0; i--) {
              const output = outputAreaModel.get(i);
              let isSparkLog = false;
              let isEmpty = false;
              if (output.output_type === 'stream' && typeof output.text === 'string') {
                isSparkLog = /Spark.*Progress|Stage \d+|Task \d+/.test(output.text);
                isEmpty = output.text.trim() === '';
              } else if (
                (output.output_type === 'execute_result' || output.output_type === 'display_data') &&
                typeof output.data === 'object'
              ) {
                // Check all data MIME types for empty string
                isEmpty = Object.values(output.data).every(val =>
                  (typeof val === 'string' ? val.trim() === '' : false)
                );
              }
              if (isSparkLog || isEmpty) {
                outputAreaModel.remove(i);
              }
            }
          }
        }
      });
      // If output area model is now empty, hide the output wrapper. Otherwise, ensure it's visible.
      if (outputAreaModel && outputWrapper) {
        if (outputAreaModel.length === 0) {
          outputWrapper.classList.add('sm-hide-output');
        } else if (outputWrapper) {
          outputWrapper.classList.remove('sm-hide-output');
        }
      }
    };

    // Initial clean-up
    scrubOutputs();

    // Set up the MutationObserver to watch for new output nodes
    const observer = new MutationObserver((_mutations) => {
      scrubOutputs();
    });

    observer.observe(outputWrapper, { childList: true, subtree: true });

    // Return observer for optional clean-up if cell/widget is destroyed
    return observer;
}

  createCellReactElements() {
    const createElementIfNotExists = (cellModel: ICellModel) => {
      if (cellModel.type === 'code') {
        const codeCell = this.notebookPanel.content.widgets.find(
          widget => widget.model === cellModel
        );
        if (codeCell && !codeCell.node.querySelector('.sparkMonitorCellRoot') && 
            !codeCell.node.querySelector('.spark-monitor-cell-widget')) {
          const widget = ReactWidget.create(
            React.createElement(CellWidget, {
              notebookId: this.notebookPanel.id,
              cellId: cellModel.id
            })
          );
          widget.addClass('spark-monitor-cell-widget');

          const layout = codeCell.layout as PanelLayout;
          
          // Function to position the widget at the top of execution area (before output)
          const positionWidget = () => {
            // Look for input wrapper and insert after it, or before output wrapper
            let insertIndex = 1; // Default after input (position 0 is typically input)
            
            for (let i = 0; i < layout.widgets.length; i++) {
              const widgetNode = layout.widgets[i].node;
              
              // If we find the input wrapper, insert right after it
              if (widgetNode.classList.contains('jp-Cell-inputWrapper')) {
                insertIndex = i + 1;
                break;
              }
              
              // If we find the output wrapper, insert before it
              if (widgetNode.classList.contains('jp-Cell-outputWrapper') || 
                  widgetNode.querySelector('.jp-OutputArea')) {
                insertIndex = i; // Insert BEFORE the output area
                break;
              }
            }
            
            return insertIndex;
          };

          // Function to ensure widget stays positioned correctly
          const ensureCorrectPosition = () => {
            const currentIndex = layout.widgets.indexOf(widget);
            const correctIndex = positionWidget();
            
            if (currentIndex !== correctIndex && currentIndex !== -1) {
              layout.removeWidget(widget);
              layout.insertWidget(correctIndex, widget);
              codeCell.update();
            }
          };

          // Initial positioning
          const insertIndex = positionWidget();
          layout.insertWidget(insertIndex, widget);
          codeCell.update();
          
          // Set up MutationObserver to monitor for output area changes
          const observer = new MutationObserver((mutations) => {
            let needsRepositioning = false;
            
            for (const mutation of mutations) {
              if (mutation.type === 'childList') {
                // Check if new output elements were added
                for (const node of Array.from(mutation.addedNodes)) {
                  if (node instanceof Element && 
                      (node.classList.contains('jp-Cell-outputWrapper') ||
                       node.classList.contains('jp-OutputArea') ||
                       node.classList.contains('jp-OutputArea-child') ||
                       node.querySelector('.jp-OutputArea-executeResult, .jp-OutputArea-output'))) {
                    needsRepositioning = true;
                    break;
                  }
                }
                
                // Check if output wrapper was added/modified
                if (mutation.target instanceof Element &&
                    (mutation.target.classList.contains('jp-Cell-outputWrapper') ||
                     mutation.target.classList.contains('jp-OutputArea'))) {
                  needsRepositioning = true;
                }
              }
            }
            
            if (needsRepositioning) {
              // Small delay to ensure DOM is stable
              setTimeout(() => {
                ensureCorrectPosition();
              }, 10);
            }
          });

          // Set up observer to hide Spark logs in output area
          this.setupSparkLogAndEmptyOutputObserver(codeCell);

          // Monitor the entire cell for any changes
          observer.observe(codeCell.node, { 
            childList: true, 
            subtree: true,
            attributes: false 
          });
          
          // Store observer reference for cleanup
          (widget as any)._sparkMonitorObserver = observer;
          
          // Clean up observer when widget is disposed
          widget.disposed.connect(() => {
            if ((widget as any)._sparkMonitorObserver) {
              (widget as any)._sparkMonitorObserver.disconnect();
            }
          });
          
          // Also ensure position is correct after a brief delay (for initial setup)
          setTimeout(() => {
            ensureCorrectPosition();
          }, 100);
        }
      }
    };

    const cells = this.notebookPanel.context.model.cells;

    // Ensure new cells created have a monitoring display
    cells.changed.connect((cells, changed) => {
      if (changed.type === 'add') {
        // Only handle newly added cells
        changed.newValues.forEach(cellModel => {
          createElementIfNotExists(cellModel);
        });
      }
      // Don't handle other change types to avoid duplicates
    });

    // Do it the first time
    for (let i = 0; i < cells.length; i += 1) {
      createElementIfNotExists(cells.get(i));
    }
  }

  toggleAll() {
    this.notebookStore.toggleHideAllDisplays();
  }

  async startComm(): Promise<boolean> {
    console.log('SparkMonitor: Starting Comm with kernel.');
    
    if (!this.kernel) {
      console.warn('SparkMonitor: No kernel available');
      return false;
    }

    // Check if kernel is in a valid state for comm creation
    if (this.kernel.status === 'starting' || this.kernel.status === 'restarting' || this.kernel.status === 'dead') {
      console.warn(`SparkMonitor: Kernel not in valid state for comm (status: ${this.kernel.status})`);
      return false;
    }

    try {
      await this.currentCellTracker.ready();
      
      // Try to create comm using the appropriate method based on kernel version
      let comm: IComm | undefined;
      
      if ('createComm' in this.kernel) {
        // Newer JupyterLab versions
        comm = this.kernel.createComm('SparkMonitor');
      } else if ('connectToComm' in this.kernel) {
        // Older JupyterLab versions
        comm = (this.kernel as any).connectToComm('SparkMonitor');
      } else {
        console.warn('SparkMonitor: Kernel does not support comm creation');
        return false;
      }
          
      if (!comm) {
        console.warn('SparkMonitor: Unable to create comm');
        return false;
      }

      this.comm = comm;

      // Set up event handlers before opening
      this.comm.onMsg = message => {
        this.handleMessage(message);
      };
      
      this.comm.onClose = message => {
        console.log('SparkMonitor: Comm closed, marking as not ready');
        this.isCommReady = false;
        this.isCommCreationInProgress = false;
        // Attempt to reconnect after a short delay if not disposed
        if (!this.isDisposed) {
          setTimeout(() => {
            if (!this.isCommReady && !this.isDisposed) {
              this.startCommWithRetry();
            }
          }, 1000);
        }
      };

      // Open the comm with a timeout
      return new Promise<boolean>((resolve) => {
        let isResolved = false;
        
        // Set a timeout to avoid hanging indefinitely
        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            console.warn('SparkMonitor: Comm open timeout');
            resolve(false);
          }
        }, 5000); // 5 second timeout
        
        try {
          this.comm!.open({ msgtype: 'openfromfrontend' });
          
          // Consider the comm successfully opened immediately after calling open
          // The actual connection will be verified through message handling
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutId);
            console.log('SparkMonitor: Connection with comms established');
            resolve(true);
          }
        } catch (error) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutId);
            console.error('SparkMonitor: Error opening comm:', error);
            resolve(false);
          }
        }
      });
      
    } catch (error) {
      console.error('SparkMonitor: Error establishing comm:', error);
      return false;
    }
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

  // Public method to manually trigger comm retry (useful for debugging)
  public retryCommConnection() {
    console.log('SparkMonitor: Manual comm retry triggered');
    this.resetCommConnection();
    this.startCommWithRetry();
  }

  // Cleanup method
  dispose() {
    console.log('SparkMonitor: Disposing extension');
    this.isDisposed = true;
    
    if (this.commRetryTimer) {
      clearTimeout(this.commRetryTimer);
      this.commRetryTimer = undefined;
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    this.resetCommConnection();
  }
}