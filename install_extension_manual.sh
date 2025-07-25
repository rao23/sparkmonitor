#!/bin/bash

echo "🚀 Installing SparkMonitor VS Code Extension (Manual Method)"
echo "============================================================"

# Variables
EXTENSION_DIR="$HOME/.vscode/extensions/sparkmonitor-vscode-0.0.1"
SOURCE_DIR="/usr/local/google/home/siddhantrao/new-sparkmonitor/sparkmonitor/vscode-extension"

# Step 1: Create extension directory
echo "📁 Creating extension directory..."
mkdir -p "$EXTENSION_DIR"

# Step 2: Copy files
echo "📋 Copying extension files..."
cd "$SOURCE_DIR"
cp package.json "$EXTENSION_DIR/"
cp -r dist/ "$EXTENSION_DIR/"

# Step 3: Verify installation
echo "✅ Verifying installation..."
if [ -f "$EXTENSION_DIR/package.json" ] && [ -f "$EXTENSION_DIR/dist/renderer.js" ]; then
    echo "✅ Files copied successfully!"
    echo ""
    echo "📁 Extension installed at: $EXTENSION_DIR"
    echo "📄 Files installed:"
    ls -la "$EXTENSION_DIR"
    echo ""
    echo "🔄 Next steps:"
    echo "1. Restart VS Code completely"
    echo "2. Open Command Palette (Ctrl+Shift+P)" 
    echo "3. Type: 'Developer: Show Running Extensions'"
    echo "4. Look for 'sparkmonitor-vscode' in the list"
    echo "5. Open your test notebook and run Cell 3"
    echo ""
    echo "🎯 Expected: Rich SparkMonitor table instead of plain text"
else
    echo "❌ Installation failed - files not found"
    echo "Please check the source directory: $SOURCE_DIR"
fi
