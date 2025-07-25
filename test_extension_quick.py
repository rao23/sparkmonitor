# SparkMonitor VS Code Extension Test

from IPython.display import display
import json

def test_sparkmonitor_renderer():
    """Test the VS Code SparkMonitor renderer"""
    
    # Create sample SparkMonitor data
    spark_data = {
        'cellId': 'test_cell_001',
        'executionCount': 1,
        'jobs': [
            {
                'msgtype': 'sparkJobStart',
                'jobId': 0,
                'status': 'running',
                'details': {'name': 'collect', 'description': 'Test job'},
                'timestamp': 1737650000000
            },
            {
                'msgtype': 'sparkJobEnd', 
                'jobId': 0,
                'status': 'succeeded',
                'details': {'name': 'collect', 'duration': 2500},
                'timestamp': 1737650002500
            }
        ]
    }
    
    # Display with the custom MIME type that should trigger the VS Code renderer
    display({
        'application/vnd.sparkmonitor+json': spark_data,
        'text/plain': f'SparkMonitor: {len(spark_data["jobs"])} Spark job events'
    }, raw=True)
    
    print("✅ If you see a rich table above (not just plain text), the VS Code extension is working!")
    print("❌ If you only see plain text, the extension needs to be installed/activated.")
    
    return spark_data

# Run the test
test_data = test_sparkmonitor_renderer()
