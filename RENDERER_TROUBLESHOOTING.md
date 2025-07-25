# 🚨 MIME Type Renderer Not Loading - Solutions

## Issue
You're seeing `SparkMonitor: 4 Spark job events` instead of the rich table display, which means VS Code is not using our custom renderer for the `application/vnd.sparkmonitor+json` MIME type.

## Quick Solutions

### Solution 1: Manual Extension Installation

1. **Copy Extension to VS Code Extensions Directory**:
   ```bash
   # For Linux/Mac
   mkdir -p ~/.vscode/extensions/sparkmonitor-vscode-0.0.1
   cp -r vscode-extension/* ~/.vscode/extensions/sparkmonitor-vscode-0.0.1/
   
   # For Windows
   mkdir "%USERPROFILE%\.vscode\extensions\sparkmonitor-vscode-0.0.1"
   copy vscode-extension\* "%USERPROFILE%\.vscode\extensions\sparkmonitor-vscode-0.0.1\"
   ```

2. **Restart VS Code completely**

3. **Check if extension is loaded**:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Type: `Developer: Show Running Extensions`
   - Look for `sparkmonitor-vscode`

### Solution 2: Development Mode (Recommended for Testing)

1. **Open VS Code**
2. **File → Open Folder → Select the `vscode-extension` folder**
3. **Press F5** (or Run → Start Debugging)
4. **This opens a new "Extension Development Host" window**
5. **In the new window, open your test notebook**
6. **Run the test cells - you should see rich displays**

### Solution 3: Package and Install

```bash
# In vscode-extension directory
npm install -g vsce
vsce package
# This creates sparkmonitor-vscode-0.0.1.vsix
```

Then in VS Code:
- **Command Palette → Extensions: Install from VSIX**
- **Select the .vsix file**

## Immediate Workaround: HTML Output

While debugging the extension, you can test the rendering logic by using HTML output:

```python
from IPython.display import display, HTML

# Your SparkMonitor data
spark_data = {
    'cellId': 'test_cell',
    'jobs': [
        {'msgtype': 'sparkJobStart', 'jobId': 0, 'status': 'running'},
        {'msgtype': 'sparkJobEnd', 'jobId': 0, 'status': 'succeeded'}
    ]
}

# Create HTML version of the display
html_output = f"""
<div style="border: 1px solid #e1e4e8; border-radius: 6px; padding: 16px; margin: 8px 0; background-color: #f6f8fa;">
    <div style="display: flex; align-items: center; margin-bottom: 12px; font-weight: bold;">
        <span style="color: #ff6b35; margin-right: 8px;">⚡</span>
        Spark Monitor - Cell {spark_data['cellId']}
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
            <tr style="background-color: #f1f3f4;">
                <th style="padding: 8px; text-align: left; border: 1px solid #d0d7de;">Job ID</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #d0d7de;">Status</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #d0d7de;">Type</th>
            </tr>
        </thead>
        <tbody>
"""

for job in spark_data['jobs']:
    status_color = '#28a745' if job['status'] == 'succeeded' else '#dc3545' if job['status'] == 'failed' else '#007acc'
    html_output += f"""
            <tr>
                <td style="padding: 8px; border: 1px solid #d0d7de;">{job.get('jobId', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #d0d7de;">
                    <span style="color: {status_color}; font-weight: bold;">{job['status']}</span>
                </td>
                <td style="padding: 8px; border: 1px solid #d0d7de;">{job['msgtype']}</td>
            </tr>
    """

html_output += """
        </tbody>
    </table>
</div>
"""

display(HTML(html_output))
```

This will show you exactly what the SparkMonitor display should look like!

## Debug Steps

1. **Try Solution 2 (Development Mode) first** - it's the most reliable for testing
2. **If that works**, the extension code is correct and it's just an installation issue
3. **If it doesn't work**, we need to debug the renderer code further

## Expected Result

When working correctly, you should see:

```
⚡ Spark Monitor - Cell test_cell

┌────────┬────────────┬─────────────────┐
│ Job ID │ Status     │ Type            │
├────────┼────────────┼─────────────────┤
│ 0      │ ✅ Success │ sparkJobStart   │
│ 0      │ ✅ Success │ sparkJobEnd     │
└────────┴────────────┴─────────────────┘
```

Instead of just:
```
SparkMonitor: 4 Spark job events
```
