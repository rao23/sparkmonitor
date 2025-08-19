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
  // Cache cell/notebook info by element (per cell)
  const requestIdToElement = new Map<string, HTMLElement>();
  const displayIdMap = new Map<string, { notebookId: string, cellId: string }>();
  const rootCache = new Map<string, Root>();

  if (typeof context.onDidReceiveMessage === 'function') {
    context.onDidReceiveMessage((msg) => {
      if (msg.type === 'cellAndNotebookInfo' && msg.requestId) {
        console.log('cellAndNotebookInfo Post Message:', msg);
        const element = requestIdToElement.get(msg.requestId);
        if (element) {
          console.log('cellAndNotebookInfo Cell Element Found:', element);
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
                  console.log('Unmounted existing root for cellId:', msg.cellId);
                  // root = undefined;
                  // renderWithIds(element, msg.notebookId, msg.cellId, msg.data, true);
                }
              }
            }
          }
          renderWithIds(element, msg.notebookId, msg.cellId, msg.data, true);
          // let root = rootCache.get(msg.cellId);
          // if (root) {
          //   root.unmount();
          //   rootCache.delete(msg.cellId);
          //   root = undefined;
          // }
          // rootCache.delete(msg.cellId); // Clear cached root for this cell
          // store.notebooks[msg.notebookId].onCellRemoved(msg.cellId);
          // renderWithIds(element, msg.notebookId, msg.cellId, msg.data, true);
          requestIdToElement.delete(msg.requestId); // Clean up
        }
      } else if (msg.type === 'initNotebookStore') {
        if (!store.notebooks[msg.notebookId]) {
          store.notebooks[msg.notebookId] = new NotebookStore(msg.notebookId);
        }
      } else if (msg.type === 'cellRemoved') {
        const cellId = msg.cellId;
        const notebookId = msg.notebookId;
        // Remove root DOM element from rootCache and unmount
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
      console.log(`Creating new NotebookStore for notebookId: ${notebookId}`);
      store.notebooks[notebookId] = new NotebookStore(notebookId);
    }
    const notebookStore = store.notebooks[notebookId];

    // Ensure Cell exists in the NotebookStore
    if (!notebookStore.cells[cellId]) {
      console.log(`Creating new Cell for cellId: ${cellId}`);
      notebookStore.cells[cellId] = new Cell(cellId, notebookStore);
    }

    // --- Handle SparkMonitor events here, with correct IDs ---
    console.log('Sending handling this data - ', data);
    if (data && data.msgtype === 'fromscala') {
      // console.log('Handling Processing SparkMonitor message:', data);
      let msg = data.msg;
      if (typeof msg === 'string') {
        msg = JSON.parse(msg);
      }
      // console.log('Handling SparkMonitor message:', msg);
      console.log('[Backend] Handling SparkMonitor message type:', msg['msgtype']);
      switch (msg['msgtype']) {
        case 'sparkJobStart':
          console.log('Handling sparkJobStart for cellId:', cellId);
          if (isCellReexecuted) {
            console.log('Cell re-executed, handling accordingly.');
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
      console.log('Rendering new CellWidget for cellId:', cellId);
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
      // console.log('Received outputItem:', outputItem);
      console.log('[Backend] Output item data:', data);
      const display_id = outputItem?.metadata?.transient?.display_id;
      console.log('For displayId: ', display_id, ' this message is:', msg);

      // Check if we already have notebook/cell info for this element
      console.log('Check cache for display id: ', display_id);
      console.log('Current cache state: ', displayIdMap);
      const cached = displayIdMap.get(display_id);
      if (cached) {
        console.log(`[Cache] Using cached notebookId: ${cached.notebookId}, cellId: ${cached.cellId}`);
        renderWithIds(element, cached.notebookId, cached.cellId, data, false);
        return;
      }

      console.log('[Cache] No cached notebook/cell info found, requesting from extension');
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