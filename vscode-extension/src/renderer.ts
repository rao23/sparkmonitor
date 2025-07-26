// Define the structure of Spark job data
interface SparkJobData {
  msgtype: string;
  jobId?: number;
  stageId?: number;
  taskId?: number;
  status?: string;
  details?: any;
  timestamp?: number;
}

interface SparkCellData {
  jobs: SparkJobData[];
  cellId: string;
  executionCount?: number;
}

// Define the notebook renderer API types
interface OutputItem {
  json(): any;
  text(): string;
  data(): Uint8Array;
  metadata: Record<string, any>;
}

interface RendererContext {
  readonly workspace: any;
  readonly settings: any;
}

export const activate = (context: RendererContext) => {
  return {
    renderOutputItem(outputItem: OutputItem, element: HTMLElement) {
      try {
        // Parse the data from the notebook output
        const data = outputItem.json() as SparkCellData;
        
        // Create container for Spark monitoring UI
        const container = document.createElement('div');
        container.className = 'sparkmonitor-container';
        container.style.cssText = `
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          padding: 16px;
          margin: 8px 0;
          background-color: var(--vscode-editor-background);
          font-family: var(--vscode-font-family);
        `;

        // Create header
        const header = document.createElement('div');
        header.className = 'sparkmonitor-header';
        header.style.cssText = `
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          font-weight: bold;
          color: var(--vscode-foreground);
        `;
        header.innerHTML = `
          <span style="color: #ff6b35; margin-right: 8px;">⚡</span>
          Spark Monitor - Cell ${data.cellId}
        `;

        // Create content area
        const content = document.createElement('div');
        content.className = 'sparkmonitor-content';
        
        if (data.jobs && data.jobs.length > 0) {
          // Create job table
          const table = document.createElement('table');
          table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          `;
          
          // Table header
          table.innerHTML = `
            <thead>
              <tr style="background-color: var(--vscode-list-hoverBackground);">
                <th style="padding: 8px; text-align: left; border: 1px solid var(--vscode-widget-border);">Job ID</th>
                <th style="padding: 8px; text-align: left; border: 1px solid var(--vscode-widget-border);">Status</th>
                <th style="padding: 8px; text-align: left; border: 1px solid var(--vscode-widget-border);">Type</th>
                <th style="padding: 8px; text-align: left; border: 1px solid var(--vscode-widget-border);">Details</th>
              </tr>
            </thead>
            <tbody>
            </tbody>
          `;
          
          const tbody = table.querySelector('tbody')!;
          
          // Add job rows
          data.jobs.forEach(job => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--vscode-widget-border)';
            
            const statusColor = getStatusColor(job.status);
            
            row.innerHTML = `
              <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">${job.jobId || 'N/A'}</td>
              <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">
                <span style="color: ${statusColor}; font-weight: bold;">${job.status || 'Unknown'}</span>
              </td>
              <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">${job.msgtype}</td>
              <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">
                <details>
                  <summary style="cursor: pointer;">View Details</summary>
                  <pre style="margin-top: 8px; font-size: 10px; white-space: pre-wrap;">${JSON.stringify(job.details || {}, null, 2)}</pre>
                </details>
              </td>
            `;
            
            tbody.appendChild(row);
          });
          
          content.appendChild(table);
        } else {
          // No jobs yet
          const noJobsMsg = document.createElement('div');
          noJobsMsg.style.cssText = `
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
          `;
          noJobsMsg.textContent = 'No Spark jobs detected yet. Run a Spark operation to see monitoring data.';
          content.appendChild(noJobsMsg);
        }

        // Add components to container
        container.appendChild(header);
        container.appendChild(content);
        
        // Clear existing content and add our container
        element.innerHTML = '';
        element.appendChild(container);
        
      } catch (error) {
        console.error('Error rendering SparkMonitor output:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        element.innerHTML = `
          <div style="color: #ff6b6b; padding: 16px; border: 1px solid #ff6b6b; border-radius: 4px;">
            <strong>SparkMonitor Error:</strong> ${errorMessage}
          </div>
        `;
      }
    }
  };
};

function getStatusColor(status?: string): string {
  switch (status?.toLowerCase()) {
    case 'succeeded':
    case 'success':
      return '#28a745';
    case 'failed':
    case 'error':
      return '#dc3545';
    case 'running':
    case 'active':
      return '#007acc';
    case 'pending':
      return '#ffc107';
    default:
      return 'var(--vscode-foreground)';
  }
}

// import type { ActivationFunction } from 'vscode-notebook-renderer';

// export const activate: ActivationFunction = context => ({
//   renderOutputItem(outputItem, element) {
//     element.innerText = JSON.stringify(outputItem.json(), null, 2);
//   }
// });