// Define the structure of Spark job data
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import type { ActivationFunction } from 'vscode-notebook-renderer';
let createRoot: undefined | ((container: HTMLElement) => any) = undefined;
try {
  // Dynamically require if available (React 18+)
  // @ts-ignore
  createRoot = require('react-dom/client').createRoot;
} catch {}
import { Root } from 'react-dom/client';
import { store } from '../../src/store';
import { NotebookStore } from '../../src/store/notebook';
import { Cell } from '../../src/store/cell';
import { CellWidget } from '../../src/components';
import '../style/vscode.css';

// VS Code renderer API: activation function returning renderOutputItem
export const activate: ActivationFunction = (context) => {
  const requestIdToElement = new Map<string, HTMLElement>();
  const displayIdMap = new Map<string, { notebookId: string, cellId: string }>();
  const rootCache = new Map<string, Root>();

  if (typeof context.onDidReceiveMessage === 'function') {
    context.onDidReceiveMessage((msg) => {
      if (msg.type === 'cellAndNotebookInfo' && msg.requestId) {
        const element = requestIdToElement.get(msg.requestId);
        if (element) {
          const displayId = msg.displayId;
          if (!displayIdMap.has(displayId)) {
            displayIdMap.set(displayId, {
              notebookId: msg.notebookId,
              cellId: msg.cellId
            });
            const notebookId = msg.notebookId;
            const cellId = msg.cellId;
            if (notebookId in store.notebooks) {
              const notebookStore = store.notebooks[notebookId];
              if (notebookStore.cells[cellId]) {
                notebookStore.resetCell(cellId);
                let root = rootCache.get(msg.cellId);
                if (root) {
                  root.unmount();
                  rootCache.delete(msg.cellId);
                }
              }
            }
          }
          renderWithIds(element, msg.notebookId, msg.cellId, msg.data, true);
          requestIdToElement.delete(msg.requestId);
        }
      } else if (msg.type === 'initNotebookStore') {
        if (!store.notebooks[msg.notebookId]) {
          store.notebooks[msg.notebookId] = new NotebookStore(msg.notebookId);
        }
      } else if (msg.type === 'deleteNotebookStore') {
        if (store.notebooks[msg.notebookId]) {
          store.notebooks[msg.notebookId].resetNotebook();
          delete store.notebooks[msg.notebookId];
        }
      } else if (msg.type === 'cellRemoved') {
        const cellId = msg.cellId;
        const notebookId = msg.notebookId;

        let root = rootCache.get(cellId);
        if (root) {
          root.unmount();
          rootCache.delete(cellId);
        }
        if (notebookId in store.notebooks) {
          const notebookStore = store.notebooks[notebookId];
          if (notebookStore.cells[cellId]) {
            notebookStore.onCellRemoved(cellId);
          } else {
            console.warn(`Cell ${cellId} not found in NotebookStore for removal.`);
          }
        }
      }
    });
  }

  function renderWithIds(
    element: HTMLElement,
    notebookId: string,
    cellId: string,
    data: any,
    isCellReexecuted: boolean
  ) {
    // Ensure NotebookStore exists in the MobX store
    if (!store.notebooks[notebookId]) {
      store.notebooks[notebookId] = new NotebookStore(notebookId);
    }
    const notebookStore = store.notebooks[notebookId];

    // Ensure Cell exists in the NotebookStore
    if (!notebookStore.cells[cellId]) {
      notebookStore.cells[cellId] = new Cell(cellId, notebookStore);
    }

    // --- Handle SparkMonitor events here, with correct IDs ---
    if (data && data.msgtype === 'fromscala') {
      let msg = data.msg;
      if (typeof msg === 'string') {
        msg = JSON.parse(msg);
      }
      switch (msg['msgtype']) {
        case 'sparkJobStart':
          if (isCellReexecuted) {
            notebookStore.onCellExecutedAgain(cellId);
          }
          notebookStore.onSparkJobStart(cellId, msg);
          break;
        case 'sparkJobEnd':
          notebookStore.onSparkJobEnd(msg);
          break;
        case 'sparkStageSubmitted':
          notebookStore.onSparkStageSubmitted(cellId, msg);
          break;
        case 'sparkStageCompleted':
          notebookStore.onSparkStageCompleted(msg);
          break;
        case 'sparkStageActive':
          notebookStore.onSparkStageActive(msg);
          break;
        case 'sparkTaskStart':
          notebookStore.onSparkTaskStart(msg);
          break;
        case 'sparkTaskEnd':
          notebookStore.onSparkTaskEnd(msg);
          break;
        case 'sparkApplicationStart':
          notebookStore.onSparkApplicationStart(msg);
          break;
        case 'sparkExecutorAdded':
          notebookStore.onSparkExecutorAdded(msg);
          break;
        case 'sparkExecutorRemoved':
          notebookStore.onSparkExecutorRemoved(msg);
          break;
        default:
          // Unknown or unhandled message type
          break;
      }
    }

    let root = rootCache.get(cellId);
    if (!root) {
      const cellWidgetElement = React.createElement(CellWidget, { notebookId, cellId });
      if (createRoot) {
        root = createRoot(element);
        if (!root) {
          console.error('Failed to create React root for element:', element);
          return;
        }
        rootCache.set(cellId, root);
        root.render(cellWidgetElement);
      } else {
        ReactDOM.render(cellWidgetElement, element);
        (element as any)._sparkmonitor_root = true; // Just a flag for React 17
      }
    }
  }

  return {
    renderOutputItem(outputItem: any, element: HTMLElement) {
      if (!outputItem || !outputItem.data) {
        console.warn('No output item data provided');
        return;
      }
      const data = JSON.parse(new TextDecoder().decode(outputItem.data()));
      let msg = data.msg;
      if (typeof msg === 'string') {
        msg = JSON.parse(msg);
      }
      const display_id = outputItem?.metadata?.transient?.display_id || null;
      if (!display_id) {
        console.warn('No display_id found in outputItem metadata');
        return;
      }

      const cached = displayIdMap.get(display_id);
      if (cached) {
        renderWithIds(element, cached.notebookId, cached.cellId, data, false);
        return;
      }

      // Otherwise, request info from the extension
      const requestId = `cell-${Date.now()}-${Math.random()}`;
      requestIdToElement.set(requestId, element);
      if (context && typeof context.postMessage === 'function') {
        context.postMessage({
          type: 'getCellAndNotebookInfo',
          requestId,
          displayId: outputItem.metadata.transient.display_id,
          data: data,       
        });
      }
    }
  }
};