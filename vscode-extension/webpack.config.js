const path = require('path');

module.exports = (env, argv) => {
  const mode = argv.mode || 'development';
  const isDev = mode === 'development';

  const devtool = isDev ? 'source-map' : false;

  // Extension configuration
  const extensionConfig = {
    mode,
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
    devtool
  };

  // Renderer configuration
  const rendererConfig = {
    mode,
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
    devtool
  };

  // LogRenderer configuration
  const logRendererConfig = {
    mode,
    entry: './src/logRenderer.ts',
    target: 'web',
    output: {
      filename: 'logRenderer.js',
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
        }
      ]
    },
    devtool
  };

  return [extensionConfig, rendererConfig, logRendererConfig];
};