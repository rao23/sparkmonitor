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

// VS Code renderer API: activation function returning renderOutputItem
export const activate: ActivationFunction = (context) => {
  // Cache cell/notebook info by element (per cell)
  const requestIdToElement = new Map<string, HTMLElement>();
  const cellNotebookInfo = new WeakMap<HTMLElement, { notebookId: string, cellId: string }>();
  const displayIdMap = new Map<string, { notebookId: string, cellId: string }>();
  const rootCache = new Map<string, Root>();

  if (typeof context.onDidReceiveMessage === 'function') {
    context.onDidReceiveMessage((msg) => {
      console.log('Received message from extension:', msg);
      if (msg.type === 'cellAndNotebookInfo' && msg.requestId) {
        console.log(`Received cell and notebook info for requestId: ${msg.requestId}`, msg);
        const element = requestIdToElement.get(msg.requestId);
        if (element) {
          console.log('Found element for requestId:', msg.requestId, element);
          displayIdMap.set(msg.displayId, {
            notebookId: msg.notebookId,
            cellId: msg.cellId
          });
          renderWithIds(element, msg.notebookId, msg.cellId, msg.data);
          requestIdToElement.delete(msg.requestId); // Clean up
        }
      } else if (msg.type === 'initNotebookStore') {
        console.log('Initializing NotebookStore for notebookId:', msg.notebookId);
        if (!store.notebooks[msg.notebookId]) {
          store.notebooks[msg.notebookId] = new NotebookStore(msg.notebookId);
        }
      }
    });
  }

  function renderWithIds(
    element: HTMLElement,
    notebookId: string,
    cellId: string,
    data: any
  ) {
    console.log(`Rendering cell ${cellId} in notebook ${notebookId}`, data);
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

    // Clear cell state if display_id changes, indicating a new output for cell reexecution
    if (data && data.display_id && notebookStore.cells[cellId].lastDisplayId !== data.display_id) {
      notebookStore.cells[cellId].lastDisplayId = data.display_id;
      notebookStore.onCellExecutedAgain(cellId);
    }

    // --- Handle SparkMonitor events here, with correct IDs ---
    if (data && data.msgtype === 'fromscala') {
      console.log('Handling Processing SparkMonitor message:', data);
      let msg = data.msg;
      if (typeof msg === 'string') {
        msg = JSON.parse(msg);
      }
      console.log('Handling SparkMonitor message:', msg);
      console.log('Handling SparkMonitor message type:', msg['msgtype']);
      switch (msg['msgtype']) {
        case 'sparkJobStart':
          console.log('Handling sparkJobStart for cellId:', cellId);
          notebookStore.onSparkJobStart(cellId, msg);
          break;
        case 'sparkJobEnd':
          console.log('Handling sparkJobEnd for cellId:', cellId);
          notebookStore.onSparkJobEnd(msg);
          break;
        case 'sparkStageSubmitted':
          console.log('Handling sparkStageSubmitted for cellId:', cellId);
          notebookStore.onSparkStageSubmitted(cellId, msg);
          break;
        case 'sparkStageCompleted':
          console.log('Handling sparkStageCompleted for cellId:', cellId);
          notebookStore.onSparkStageCompleted(msg);
          break;
        case 'sparkStageActive':
          console.log('Handling sparkStageActive for cellId:', cellId);
          notebookStore.onSparkStageActive(msg);
          break;
        case 'sparkTaskStart':
          console.log('Handling sparkTaskStart for cellId:', cellId);
          notebookStore.onSparkTaskStart(msg);
          break;
        case 'sparkTaskEnd':
          console.log('Handling sparkTaskEnd for cellId:', cellId);
          notebookStore.onSparkTaskEnd(msg);
          break;
        case 'sparkApplicationStart':
          console.log('Handling sparkApplicationStart for cellId:', cellId);
          notebookStore.onSparkApplicationStart(msg);
          break;
        case 'sparkExecutorAdded':
          console.log('Handling sparkExecutorAdded for cellId:', cellId);
          notebookStore.onSparkExecutorAdded(msg);
          break;
        case 'sparkExecutorRemoved':
          console.log('Handling sparkExecutorRemoved for cellId:', cellId);
          notebookStore.onSparkExecutorRemoved(msg);
          break;
        default:
          // Unknown or unhandled message type
          break;
      }
    }

    // Render the React component for this cell
    let root = rootCache.get(cellId);
    if (!root) {
      console.log('Rendering new CellWidget for element:', element);
      const cellWidgetElement = React.createElement(CellWidget, { notebookId, cellId });
      if (createRoot) {
        root = createRoot(element);
        // (element as any)._sparkmonitor_root = root;
        console.log('Rendering new CellWidget YAYYY');
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
    // const cellWidgetElement = React.createElement(CellWidget, { notebookId, cellId });
    // if (createRoot) {
    //   let root = (element as any)._sparkmonitor_root;
    //   if (!root) {
    //     root = createRoot(element);
    //     (element as any)._sparkmonitor_root = root;
    //   }
    //   root.render(cellWidgetElement);
    // } else {
    //   ReactDOM.render(cellWidgetElement, element);
    // }
  }

  return {
    renderOutputItem(outputItem: any, element: HTMLElement) {
      if (!outputItem || !outputItem.data) {
        console.warn('No output item data provided');
        return;
      }
      // Generate a unique requestId for this render
      // const requestId = `req_${Date.now()}_${Math.random()}`;
      // if (context && typeof context.postMessage === 'function') {
      //   context.postMessage({
      //     type: 'getCellAndNotebookInfo',
      //     requestId
      //   });
      // }
      const data = JSON.parse(new TextDecoder().decode(outputItem.data()));

      // Check if we already have notebook/cell info for this element
      console.log('OutputItem display ID:', outputItem.metadata.transient.display_id);
      console.log('OutputItem:', outputItem);
      console.log('OutputItem data:', data);
      const cached = displayIdMap.get(outputItem.metadata.transient.display_id);
      if (cached) {
        console.log(`Using cached notebookId: ${cached.notebookId}, cellId: ${cached.cellId}`);
        renderWithIds(element, cached.notebookId, cached.cellId, data);
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
        });
      }

      element.innerText = 'Loading SparkMonitor info...';
    }
  }
};