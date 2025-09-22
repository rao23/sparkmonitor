import type { RendererContext, OutputItem } from 'vscode-notebook-renderer';

export function activate(_ctx: RendererContext<void>) {
  return {
    renderOutputItem(outputItem: OutputItem, element: HTMLElement) {
      const raw = new TextDecoder().decode(outputItem.data());

      // Skip rendering if raw data is empty or only whitespace
      if (!raw || raw.trim().length === 0) {
        console.log('Raw data is empty, skipping rendering.');
        return;
      }

      // Filter PySpark progress logs
      const filtered = raw
        .split("\n")
        .filter(line => {
          if (/\[Stage \d+:.*\]/.test(line)) return false; // progress bar logs
          return true;
        })
        .join("\n");

      // Render result if not empty
      if (filtered) {
        const pre = document.createElement("pre");
        pre.textContent = filtered;
        element.appendChild(pre);
      }
    }
  };
}
