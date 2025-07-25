#!/bin/bash

# SparkMonitor VS Code Extension Installation Script

echo "🚀 Installing SparkMonitor VS Code Extension..."

# Step 1: Navigate to extension directory
cd /usr/local/google/home/siddhantrao/new-sparkmonitor/sparkmonitor/vscode-extension

# Step 2: Ensure everything is built
echo "📦 Building extension..."
npm run build

# Step 3: Check if build was successful
if [ -f "dist/renderer.js" ] && [ -f "dist/extension.js" ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - check npm run build output"
    exit 1
fi

# Step 4: Get VS Code extensions directory
VSCODE_EXTENSIONS_DIR="$HOME/.vscode/extensions"
EXTENSION_DIR="$VSCODE_EXTENSIONS_DIR/sparkmonitor-vscode-0.0.1"

echo "📁 Installing to: $EXTENSION_DIR"

# Step 5: Create extensions directory if it doesn't exist
mkdir -p "$VSCODE_EXTENSIONS_DIR"

# Step 6: Remove old installation if exists
if [ -d "$EXTENSION_DIR" ]; then
    echo "🗑️ Removing old installation..."
    rm -rf "$EXTENSION_DIR"
fi

# Step 7: Copy extension files
echo "📋 Copying extension files..."
mkdir -p "$EXTENSION_DIR"
cp -r * "$EXTENSION_DIR/"

# Step 8: Verify installation
if [ -f "$EXTENSION_DIR/package.json" ] && [ -f "$EXTENSION_DIR/dist/renderer.js" ]; then
    echo "✅ Extension installed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Restart VS Code completely"
    echo "2. Open Command Palette (Ctrl+Shift+P)"
    echo "3. Type: 'Developer: Show Running Extensions'"
    echo "4. Look for 'sparkmonitor-vscode' in the list"
    echo "5. If found, open your test notebook and run cell 3"
    echo ""
    echo "🎯 Expected result: Rich SparkMonitor table instead of plain text"
else
    echo "❌ Installation failed"
    exit 1
fi
