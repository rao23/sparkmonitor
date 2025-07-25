const path = require('path');

module.exports = {
  mode: 'development', 
  entry: './src/renderer.ts',
  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs2'
    }
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  target: 'node',
  externals: {
    'vscode': 'commonjs vscode'
  }
};