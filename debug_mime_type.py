"""
Simple test to debug MIME type rendering in VS Code
"""

from IPython.display import display
import json

# Test 1: Very simple data
simple_test = {
    'cellId': 'debug_test',
    'jobs': [
        {
            'msgtype': 'test',
            'jobId': 999,
            'status': 'debug',
            'details': {'message': 'If you see a table, the renderer is working!'}
        }
    ]
}

print("=== DEBUG TEST 1: Simple SparkMonitor Data ===")
display({
    'application/vnd.sparkmonitor+json': simple_test,
    'text/plain': 'DEBUG: If you see only this text, the extension is not loaded'
}, raw=True)

print("=== DEBUG TEST 2: Check Available Renderers ===")
try:
    # This will show what renderers VS Code has available
    import IPython
    print(f"IPython version: {IPython.__version__}")
    
    # Check if VS Code is detected
    import os
    vscode_vars = [k for k in os.environ.keys() if 'VSCODE' in k.upper()]
    print(f"VS Code environment variables: {vscode_vars}")
    
except Exception as e:
    print(f"Error checking environment: {e}")

print("=== DEBUG TEST 3: Alternative MIME Types ===")
# Test with a known working MIME type
display({
    'text/html': '''
    <div style="border: 2px solid red; padding: 10px; background: #ffe6e6;">
        <h3>🔍 HTML Renderer Test</h3>
        <p>If you see this red box, HTML rendering works.</p>
        <p>If SparkMonitor data shows as plain text, the extension isn't loaded.</p>
    </div>
    ''',
    'text/plain': 'HTML test fallback'
}, raw=True)
