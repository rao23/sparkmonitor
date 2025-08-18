// VS Code extension for SparkMonitor
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('SparkMonitor VS Code extension is activated');

  let notebookCellCache = new Map<string, vscode.NotebookCell>();

  // Register messaging for your renderer
  const messaging = vscode.notebooks.createRendererMessaging('sparkmonitor-renderer');

  for (const notebook of vscode.workspace.notebookDocuments) {
    messaging.postMessage({
      type: 'initNotebookStore',
      notebookId: notebook.uri.toString(),
    });
  }

  vscode.workspace.onDidOpenNotebookDocument((notebook) => {
    messaging.postMessage({
      type: 'initNotebookStore',
      notebookId: notebook.uri.toString(),
    });
    for (const cell of notebook.getCells()) {
      notebookCellCache.set(cell.document.uri.toString(), cell);
    }
  });

  vscode.workspace.onDidChangeNotebookDocument((event) => {
    const notebook = event.notebook;
    const currentUris = new Set<string>(notebook.getCells().map(c => c.document.uri.toString()));

    // Detect removed
    for (const [uri, cell] of notebookCellCache) {
      if (!currentUris.has(uri)) {
        notebookCellCache.delete(uri); // cleanup
        messaging.postMessage({
          type: 'cellRemoved',
          cellId: cell.document.uri.toString(),
          notebookId: notebook.uri.toString(),
        });
      }
    }

    // Detect added
    for (const cell of notebook.getCells()) {
      const uri = cell.document.uri.toString();
      if (!notebookCellCache.has(uri)) {
        notebookCellCache.set(uri, cell);
      }
    }
  });

  messaging.onDidReceiveMessage(async (e) => {  
    const { editor, message } = e;
    if (message.type === 'getCellAndNotebookInfo') {
      // You may need to determine the correct cell if multiple outputs
      const cell = editor.notebook.cellAt(editor.selections[0]?.start ?? 0);
      const notebookId = editor.notebook.uri.toString();
      const cellId = cell?.document.uri.toString() || 'unknown-cell';

      // Send info back to renderer
      messaging.postMessage({
        type: 'cellAndNotebookInfo',
        requestId: message.requestId,
        displayId: message.displayId,
        notebookId,
        cellId
      });
    }
  });
}

export function deactivate() {
  console.log('SparkMonitor VS Code extension is deactivated');
}