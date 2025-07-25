# 🚨 PERMISSION ERROR WORKAROUND - Manual Extension Installation

## The Problem
- `npm install -g @vscode/vsce` failed due to permission issues
- Cell 3 still shows plain text instead of rich SparkMonitor display

## 🛠️ Solution: Manual Installation (No sudo required)

### **Step 1: Manual Copy (Run these commands)**

```bash
# Create extension directory
mkdir -p ~/.vscode/extensions/sparkmonitor-vscode-0.0.1

# Copy essential files
cd /usr/local/google/home/siddhantrao/new-sparkmonitor/sparkmonitor/vscode-extension
cp package.json ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/
cp -r dist/ ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/

# Verify installation
ls ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/
```

### **Step 2: Restart VS Code**
- **Close VS Code completely** (all windows)
- **Reopen VS Code**
- **Open your test notebook**

### **Step 3: Verify Extension Loading**
1. **Command Palette**: `Ctrl+Shift+P` (Linux/Windows) or `Cmd+Shift+P` (Mac)
2. **Type**: `Developer: Show Running Extensions`
3. **Look for**: `sparkmonitor-vscode` in the list

### **Step 4: Test**
- **Run Cell 3** in `SparkMonitor_HTML_Test.ipynb`
- **Expected**: Rich table display instead of plain text

## 🎯 Alternative: Development Mode (No Installation Required)

If manual installation doesn't work, try development mode:

1. **Open VS Code**
2. **File → Open Folder**
3. **Navigate to**: `/usr/local/google/home/siddhantrao/new-sparkmonitor/sparkmonitor/vscode-extension`
4. **Press F5** (Run → Start Debugging)
5. **New "Extension Development Host" window opens**
6. **In the new window**: Open your test notebook
7. **Run Cell 3**: Should show rich display

## 🔍 Troubleshooting

### **Check Extension Directory**
```bash
ls -la ~/.vscode/extensions/ | grep spark
# Should show: sparkmonitor-vscode-0.0.1
```

### **Check Extension Contents**
```bash
ls ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/
# Should show: package.json, dist/
```

### **Check Built Files**
```bash
ls ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/dist/
# Should show: extension.js, renderer.js, and .map files
```

### **VS Code Developer Console**
1. **Help → Toggle Developer Tools**
2. **Console tab**
3. **Look for errors**: Search for "sparkmonitor" or "renderer"

## 📋 Expected Results

### **Before (Current)**
Cell 3 output:
```
SparkMonitor: 4 job events (MIME type test)
💡 Comparison:
- If you see rich tables above: Extension is working! 🎉
- If you see only text: Follow the troubleshooting guide 🔧
```

### **After (When Working)**
Cell 3 output:
```
⚡ Spark Monitor - Cell html_test_cell

┌────────┬────────────┬─────────────────┬──────────────────┐
│ Job ID │ Status     │ Type            │ Details          │
├────────┼────────────┼─────────────────┼──────────────────┤
│ 0      │ ✅ Success │ sparkJobStart   │ [View Details]   │
│ 0      │ ✅ Success │ sparkJobEnd     │ [View Details]   │
└────────┴────────────┴─────────────────┴──────────────────┘

💡 Comparison:
- If you see rich tables above: Extension is working! 🎉
- If you see only text: Follow the troubleshooting guide 🔧
```

## 🚀 Next Steps

1. **Try manual installation first**
2. **If that doesn't work, try development mode**
3. **Check VS Code developer tools for errors**
4. **Report back what you see in "Show Running Extensions"**

The key is getting `sparkmonitor-vscode` to appear in the running extensions list!
