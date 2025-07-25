# 🎯 **Direct VS Code Extension Installation**

## **The Problem**
Cell 3 shows plain text instead of rich SparkMonitor display because VS Code extension isn't loaded.

## **Quick Solution: Manual Installation**

### **Step 1: Manual Copy Installation**

```bash
# 1. Create VS Code extensions directory
mkdir -p ~/.vscode/extensions/sparkmonitor-vscode-0.0.1

# 2. Copy all extension files
cp -r /usr/local/google/home/siddhantrao/new-sparkmonitor/sparkmonitor/vscode-extension/* ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/

# 3. Verify the copy
ls ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/
```

### **Step 2: Restart VS Code**
- **Close VS Code completely**
- **Reopen VS Code**
- **Open your test notebook**

### **Step 3: Verify Extension is Loaded**
1. **Command Palette**: `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. **Type**: `Developer: Show Running Extensions`
3. **Look for**: `sparkmonitor-vscode` in the list

### **Step 4: Test**
- **Run Cell 3** in your test notebook
- **Expected**: Rich SparkMonitor table
- **If still plain text**: Extension not loaded

## **Alternative: Development Mode**

If manual installation doesn't work:

1. **Open VS Code**
2. **File → Open Folder**
3. **Select**: `/usr/local/google/home/siddhantrao/new-sparkmonitor/sparkmonitor/vscode-extension`
4. **Press F5** (Start Debugging)
5. **This opens "Extension Development Host" window**
6. **In the new window**: Open your test notebook
7. **Run Cell 3**: Should show rich display

## **Alternative: VSIX Package Installation**

```bash
# Create VSIX package
cd /usr/local/google/home/siddhantrao/new-sparkmonitor/sparkmonitor/vscode-extension
npx vsce package

# Install in VS Code
# Command Palette → Extensions: Install from VSIX
# Select the .vsix file
```

## **Troubleshooting**

### **Check if Extension Directory Exists**
```bash
ls -la ~/.vscode/extensions/ | grep spark
```

### **Check Extension Contents**
```bash
ls ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/
# Should see: package.json, dist/, src/, etc.
```

### **Check Built Files**
```bash
ls ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/dist/
# Should see: extension.js, renderer.js
```

### **VS Code Logs**
1. **Help → Toggle Developer Tools**
2. **Console tab**
3. **Look for errors related to sparkmonitor**

## **Expected Result When Working**

**Current (Cell 3)**:
```
SparkMonitor: 4 job events (MIME type test)
```

**When Extension Works**:
```
⚡ Spark Monitor - Cell html_test_cell

┌────────┬────────────┬─────────────────┬──────────────────┐
│ Job ID │ Status     │ Type            │ Details          │
├────────┼────────────┼─────────────────┼──────────────────┤
│ 0      │ ✅ Success │ sparkJobStart   │ [View Details]   │
│ 0      │ ✅ Success │ sparkJobEnd     │ [View Details]   │
└────────┴────────────┴─────────────────┴──────────────────┘
```

## **Next Steps**

1. **Try manual copy installation first**
2. **If that doesn't work, try development mode**  
3. **Check VS Code developer console for errors**
4. **Report back what you see in running extensions**
