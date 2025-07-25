#!/bin/bash

# Script to package the VS Code extension

cd vscode-extension

echo "Installing vsce if not available..."
npm install -g @vscode/vsce 2>/dev/null || true

echo "Building extension..."
npm run build

echo "Packaging extension..."
npx @vscode/vsce package || vsce package

echo "Extension packaged! Look for .vsix file in the directory."
ls -la *.vsix

echo ""
echo "To install:"
echo "1. Open VS Code"
echo "2. Ctrl+Shift+P → 'Extensions: Install from VSIX...'"
echo "3. Select the .vsix file created above"
