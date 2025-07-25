// VS Code extension for SparkMonitor
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('SparkMonitor VS Code extension is now active!');
  
  // Register the notebook output renderer
  // This will be handled by the package.json contributes section
  
  // Register a command to toggle SparkMonitor display
  const toggleCommand = vscode.commands.registerCommand('sparkmonitor.toggle', () => {
    vscode.window.showInformationMessage('SparkMonitor toggle command executed!');
  });
  
  context.subscriptions.push(toggleCommand);
}

export function deactivate() {
  console.log('SparkMonitor VS Code extension is deactivated');
}