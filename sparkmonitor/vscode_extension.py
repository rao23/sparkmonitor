"""
VS Code specific extensions for SparkMonitor
Detects VS Code environment and outputs monitoring data in appropriate format
"""

import json
import os
from typing import Dict, Any, List


class VSCodeSparkMonitor:
    """VS Code specific SparkMonitor handler"""

    def __init__(self, notebook_id: str = None):
        self.cell_jobs: Dict[str, List[Dict]] = {}
        self.current_cell_id = None
        self.execution_count = 0
        self.cell_start_time = None
        self.notebook_id = notebook_id or self._detect_notebook_id()

    def _detect_notebook_id(self):
        # Try to get the notebook file path from environment or IPython
        try:
            from IPython import get_ipython
            ip = get_ipython()
            if ip and hasattr(ip, 'notebook'):  # Custom attribute
                return getattr(ip, 'notebook', None)
            # Try VS Code env var
            if 'VSCODE_NOTEBOOK_FILE' in os.environ:
                return os.environ['VSCODE_NOTEBOOK_FILE']
        except Exception:
            pass
        return 'unknown_notebook'

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
        
        # Track cell start time for duration calculations
        import time
        self.cell_start_time = int(time.time() * 1000)
        
        # Clear previous cell data and initialize new cell
        if cell_id in self.cell_jobs:
            self.cell_jobs[cell_id] = []  # Clear existing data
        else:
            self.cell_jobs[cell_id] = []
    
    def add_job_event(self, event_data: Dict[str, Any]):
        """Add a Spark job event to the current cell"""
        if not self.current_cell_id:
            # Auto-start cell execution if not already started
            try:
                from IPython import get_ipython
                ip = get_ipython()
                exec_count = getattr(ip, 'execution_count', 1) if ip else 1
                self.start_cell_execution(execution_count=exec_count)
            except:
                self.start_cell_execution()

        # Add timestamp if not present
        if 'timestamp' not in event_data:
            import time
            event_data['timestamp'] = int(time.time() * 1000)

        # Add cell and notebook context
        event_data['cellId'] = self.current_cell_id
        event_data['executionCount'] = self.execution_count
        event_data['notebookId'] = self.notebook_id

        self.cell_jobs[self.current_cell_id].append(event_data)

        # Output immediately for real-time updates (like JupyterLab)
        self.output_cell_data()
    
    def output_cell_data(self):
        """Output the monitoring data for the current cell in VS Code format"""
        if not self.current_cell_id or self.current_cell_id not in self.cell_jobs:
            return
        
        cell_data = {
            'cellId': self.current_cell_id,
            'executionCount': self.execution_count,
            'notebookId': self.notebook_id,
            'jobs': self.cell_jobs[self.current_cell_id]
        }
        # print(f"DEBUG: Outputting cell data: {json.dumps(cell_data, indent=2)}")
        # Output as JSON with the specific MIME type that VS Code renderer expects
        self._display_vscode_output(cell_data)

    def _display_vscode_output(self, data: Dict[str, Any]):
        """Display data using IPython display with VS Code specific MIME type"""
        try:
            from IPython.display import display
            
            # Debug: Print what we're outputting
            # print(f"DEBUG: Outputting MIME type with {len(data.get('jobs', []))} jobs")
            
            # Create display data with our custom MIME type
            display_data = {
                'application/vnd.sparkmonitor+json': data,
                'text/plain': f"SparkMonitor: {len(data.get('jobs', []))} job events"
            }
            
            # Debug: Print the MIME types
            # print("DEBUG: MIME types being output:", list(display_data.keys()))
            
            # display(display_data, raw=True, display_id=self.current_cell_id)
            
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
        # Parse the message exactly like kernelextension.py does
        if isinstance(msg_data, dict):
            msgtype = msg_data.get('msgtype')
            
            if msgtype == 'fromscala':
                # This is the main data from Scala listener
                scala_msg = msg_data.get('msg')
                if scala_msg:
                    try:
                        if isinstance(scala_msg, str):
                            import json
                            parsed_msg = json.loads(scala_msg)
                        else:
                            parsed_msg = scala_msg
                        
                        # Add the message type for consistency
                        parsed_msg['msgtype'] = msgtype
                        vscode_monitor.add_job_event(parsed_msg)
                        
                    except (json.JSONDecodeError, TypeError) as e:
                        # Handle parsing errors gracefully
                        vscode_monitor.add_job_event({
                            'msgtype': 'error',
                            'data': scala_msg,
                            'error': str(e),
                            'status': 'parse_error'
                        })
            
            elif msgtype == 'commopen':
                # Handle comm open message
                vscode_monitor.add_job_event({
                    'msgtype': 'commopen',
                    'status': 'connected'
                })
            
            else:
                # Handle other message types
                vscode_monitor.add_job_event(msg_data)


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


def initialize_vscode_hooks():
    """Initialize hooks to track cell execution"""
    try:
        from IPython import get_ipython
        ip = get_ipython()
        
        if ip and vscode_monitor.is_vscode_environment():
            # Hook into pre_execute to start cell tracking
            def pre_execute_hook():
                vscode_monitor.start_cell_execution(
                    execution_count=getattr(ip, 'execution_count', 1)
                )
            
            # Hook into post_execute to finalize cell data
            def post_execute_hook():
                # Small delay to ensure all Spark events are captured
                import threading
                import time
                
                def delayed_output():
                    time.sleep(0.1)  # Wait 100ms for final events
                    vscode_monitor.output_cell_data()
                
                threading.Thread(target=delayed_output).start()
            
            # Register hooks
            ip.events.register('pre_execute', pre_execute_hook)
            ip.events.register('post_execute', post_execute_hook)
            
    except Exception as e:
        print(f"Warning: Could not initialize VS Code execution hooks: {e}")


# Hook functions for integration
def get_vscode_monitor():
    """Get the VS Code monitor instance"""
    return vscode_monitor


def is_vscode():
    """Check if running in VS Code"""
    return vscode_monitor.is_vscode_environment()


# Initialize hooks when module is imported
initialize_vscode_hooks()