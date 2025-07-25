"""
VS Code specific extensions for SparkMonitor
Detects VS Code environment and outputs monitoring data in appropriate format
"""

import json
import os
from typing import Dict, Any, List


class VSCodeSparkMonitor:
    """VS Code specific SparkMonitor handler"""
    
    def __init__(self):
        self.cell_jobs: Dict[str, List[Dict]] = {}
        self.current_cell_id = None
        self.execution_count = 0
        
    def is_vscode_environment(self) -> bool:
        """Detect if we're running in VS Code"""
        # Check for VS Code specific environment variables
        vscode_indicators = [
            'VSCODE_PID',
            'VSCODE_IPC_HOOK',
            'VSCODE_CLI',
            'TERM_PROGRAM'
        ]
        
        for indicator in vscode_indicators:
            if indicator in os.environ:
                if indicator == 'TERM_PROGRAM' and os.environ[indicator] == 'vscode':
                    return True
                elif indicator != 'TERM_PROGRAM':
                    return True
        
        return False
    
    def start_cell_execution(self, cell_id: str = None, execution_count: int = None):
        """Called when a cell starts executing"""
        if not cell_id:
            cell_id = f"cell_{execution_count or self.execution_count}"
        
        self.current_cell_id = cell_id
        self.execution_count = execution_count or (self.execution_count + 1)
        
        # Initialize job list for this cell
        if cell_id not in self.cell_jobs:
            self.cell_jobs[cell_id] = []
    
    def add_job_event(self, event_data: Dict[str, Any]):
        """Add a Spark job event to the current cell"""
        if not self.current_cell_id:
            # If no current cell, create one
            self.start_cell_execution()
        
        # Add timestamp if not present
        if 'timestamp' not in event_data:
            import time
            event_data['timestamp'] = int(time.time() * 1000)
        
        self.cell_jobs[self.current_cell_id].append(event_data)
    
    def output_cell_data(self):
        """Output the monitoring data for the current cell in VS Code format"""
        if not self.current_cell_id or self.current_cell_id not in self.cell_jobs:
            return
        
        cell_data = {
            'cellId': self.current_cell_id,
            'executionCount': self.execution_count,
            'jobs': self.cell_jobs[self.current_cell_id]
        }
        
        # Output as JSON with the specific MIME type that VS Code renderer expects
        self._display_vscode_output(cell_data)
    
    def _display_vscode_output(self, data: Dict[str, Any]):
        """Display data using IPython display with VS Code specific MIME type"""
        try:
            from IPython.display import display
            
            # Create display data with our custom MIME type
            display_data = {
                'application/vnd.sparkmonitor+json': data,
                'text/plain': f"SparkMonitor: {len(data.get('jobs', []))} job events"
            }
            
            display(display_data, raw=True)
            
        except ImportError:
            # Fallback if IPython is not available
            print(f"SparkMonitor Data: {json.dumps(data, indent=2)}")
    
    def clear_cell_data(self, cell_id: str = None):
        """Clear job data for a specific cell or current cell"""
        target_cell = cell_id or self.current_cell_id
        if target_cell and target_cell in self.cell_jobs:
            self.cell_jobs[target_cell] = []


# Global instance for VS Code monitoring
vscode_monitor = VSCodeSparkMonitor()


def handle_spark_event(msg_data: Dict[str, Any]):
    """Handle incoming Spark events and route to appropriate handler"""
    if vscode_monitor.is_vscode_environment():
        # Parse the message and add to VS Code monitor
        if isinstance(msg_data, dict) and 'msg' in msg_data:
            try:
                # Try to parse the Scala message
                scala_msg = msg_data['msg']
                if isinstance(scala_msg, str):
                    import json
                    parsed_msg = json.loads(scala_msg)
                else:
                    parsed_msg = scala_msg
                
                vscode_monitor.add_job_event(parsed_msg)
                
            except (json.JSONDecodeError, TypeError):
                # If parsing fails, store the raw message
                vscode_monitor.add_job_event({
                    'msgtype': 'raw',
                    'data': msg_data,
                    'status': 'unknown'
                })


def on_cell_execute_start():
    """Called when a cell starts executing in VS Code"""
    if vscode_monitor.is_vscode_environment():
        # We'll need to hook into cell execution events
        # For now, start a new cell execution
        vscode_monitor.start_cell_execution()


def on_cell_execute_complete():
    """Called when a cell completes execution in VS Code"""
    if vscode_monitor.is_vscode_environment():
        vscode_monitor.output_cell_data()


# Hook functions for integration
def get_vscode_monitor():
    """Get the VS Code monitor instance"""
    return vscode_monitor


def is_vscode():
    """Check if running in VS Code"""
    return vscode_monitor.is_vscode_environment()
