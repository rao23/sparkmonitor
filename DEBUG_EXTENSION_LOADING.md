# VS Code Extension Debug Check

## Check if SparkMonitor Extension is Loaded

1. **Open VS Code Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`)

2. **Type**: `Developer: Show Running Extensions`

3. **Look for**: `sparkmonitor-vscode` in the list

4. **If NOT found**: Extension is not loaded

## Alternative: Check Extension Manager

1. **Open Extensions View** (`Ctrl+Shift+X` or `Cmd+Shift+X`)

2. **Search for**: `SparkMonitor`

3. **Status should be**: Enabled

## Manual Installation Steps

If the extension is not loaded, you need to install it:

### Option A: Development Installation
```bash
# Copy extension to VS Code extensions folder
cp -r vscode-extension ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/
```

### Option B: Package and Install
```bash
# Install vsce (VS Code Extension packager)
npm install -g vsce

# Package the extension
cd vscode-extension
vsce package

# Install the .vsix file in VS Code
# File -> Install Extension from VSIX
```

### Option C: Development Mode
```bash
# Open the extension folder in VS Code
code vscode-extension/

# Press F5 to launch Extension Development Host
# This opens a new VS Code window with your extension loaded
# Open your test notebook in that new window
```
