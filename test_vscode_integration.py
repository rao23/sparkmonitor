"""
Test script for SparkMonitor VS Code integration
This simulates Spark job events and outputs them in VS Code format
"""

import json
import sys
import os

# Add the sparkmonitor package to path
sys.path.insert(0, '/usr/local/google/home/siddhantrao/new-sparkmonitor/sparkmonitor')

try:
    from sparkmonitor.vscode_extension import VSCodeSparkMonitor
    
    # Create a VS Code monitor instance
    monitor = VSCodeSparkMonitor()
    
    # Simulate starting a cell execution
    monitor.start_cell_execution(cell_id="test_cell_1", execution_count=1)
    
    # Simulate some Spark job events
    job_events = [
        {
            "msgtype": "sparkJobStart",
            "jobId": 0,
            "status": "running",
            "details": {
                "name": "count",
                "description": "count at <console>:1"
            }
        },
        {
            "msgtype": "sparkStageSubmitted", 
            "jobId": 0,
            "stageId": 0,
            "status": "submitted",
            "details": {
                "name": "Stage 0",
                "numTasks": 1
            }
        },
        {
            "msgtype": "sparkStageCompleted",
            "jobId": 0, 
            "stageId": 0,
            "status": "succeeded",
            "details": {
                "name": "Stage 0",
                "numTasks": 1,
                "completedTasks": 1
            }
        },
        {
            "msgtype": "sparkJobEnd",
            "jobId": 0,
            "status": "succeeded", 
            "details": {
                "name": "count",
                "result": "Job completed successfully"
            }
        }
    ]
    
    # Add each event to the monitor
    for event in job_events:
        monitor.add_job_event(event)
    
    # Output the cell data for VS Code
    print("SparkMonitor VS Code Test - Outputting job data...")
    monitor.output_cell_data()
    
    print("\nTest completed! Check above for SparkMonitor output.")
    
except ImportError as e:
    print(f"Import error: {e}")
    print("Creating manual test output...")
    
    # Manual test output in VS Code format
    test_data = {
        'cellId': 'test_cell_1',
        'executionCount': 1,
        'jobs': [
            {
                "msgtype": "sparkJobStart",
                "jobId": 0,
                "status": "running",
                "details": {"name": "count"}
            },
            {
                "msgtype": "sparkJobEnd", 
                "jobId": 0,
                "status": "succeeded",
                "details": {"name": "count", "result": "Success"}
            }
        ]
    }
    
    # Output in the format VS Code expects
    from IPython.display import display
    display({
        'application/vnd.sparkmonitor+json': test_data,
        'text/plain': f"SparkMonitor: {len(test_data['jobs'])} job events"
    }, raw=True)
