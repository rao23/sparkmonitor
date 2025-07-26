const path = require('path');

module.exports = [
  // Extension configuration
  {
    mode: 'development',
    entry: './src/extension.ts',
    target: 'node',
    output: {
      filename: 'extension.js',
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
        }
      ]
    },
    externals: {
      'vscode': 'commonjs vscode'
    },
    devtool: 'source-map'
  },
  // Renderer configuration
    {
    mode: 'development',
    entry: './src/renderer.ts',
    target: 'web',
    output: {
      filename: 'renderer.js',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'module',
    },
    experiments: {
      outputModule: true // Required for notebook renderers
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
    devtool: 'source-map'
  }
];