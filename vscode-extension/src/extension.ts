// VS Code extension for SparkMonitor
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('SparkMonitor VS Code extension is activated');

  // Create simple output channel for debugging
  const outputChannel = vscode.window.createOutputChannel('SparkMonitor');
  outputChannel.appendLine('SparkMonitor extension started');
  outputChannel.show(); // This will make the output visible

  // Register messaging for your renderer
  const messaging = vscode.notebooks.createRendererMessaging('sparkmonitor-renderer');

  vscode.workspace.onDidOpenNotebookDocument((notebook) => {
    outputChannel.appendLine(`Opened notebook: ${notebook.uri.toString()}`);
    messaging.postMessage({
      type: 'initNotebookStore',
      notebookId: notebook.uri.toString(),
    });
  });

  messaging.onDidReceiveMessage(async (e) => {
    outputChannel.appendLine('Extension received a message!');
    console.log('Extension received a message!', e);

    const { editor, message } = e;
    if (message.type === 'getCellAndNotebookInfo') {
      outputChannel.appendLine('Processing getCellAndNotebookInfo request');
      // You may need to determine the correct cell if multiple outputs
      const cell = editor.notebook.cellAt(editor.selections[0]?.start ?? 0);
      console.log('Cell and Notebook Info:', {
        notebookId: editor.notebook.uri.toString(),
        cellId: cell?.document.uri.toString() || 'unknown-cell'
      });
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
      outputChannel.appendLine('Sent response back to renderer');
    }
  });
}

export function deactivate() {
  console.log('SparkMonitor VS Code extension is deactivated');
}