const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  externals: [nodeExternals()], // removes node_modules from your final bundle
  entry: './src/main.ts', // make sure this matches the main root of your code 
  output: {
    path: path.join(__dirname, 'dist'), // this can be any path and directory you want
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: true, // enabling this reduces file size and readability
  },
  resolve: {
    modules: [path.join(__dirname, 'src'), 'node_modules'],
    extensions: ['*', '.js', '.jsx', '.json', '.ts', '.tsx'],
    symlinks: false,
    cacheWithContext: false
  }
};