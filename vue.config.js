const path = require('path');
const WorkerPlugin = require('worker-plugin');

module.exports = {
  publicPath:
    process.env.GITHUB_ACTIONS === 'true' ? '/xjtu-scheduling-helper/' : '/',
  devServer: {
    proxy: {
      '/api': {
        target: 'https://xk.shuosc.com',
        changeOrigin: true,
      },
    },
  },
  configureWebpack: {
    plugins: [
      new WorkerPlugin({
        globalObject: 'self',
      }),
    ],
  },
  chainWebpack: (config) => {
    config.plugin('copy').tap((args) => {
      args[0].push({
        from: path.resolve(__dirname, 'lecture_unite.csv'),
        to: 'lecture_unite.csv',
        toType: 'file',
      });
      return args;
    });
  },
  pages: {
    index: {
      entry: 'src/pages/index/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      chunks: ['chunk-vendors', 'chunk-common', 'index'],
    },
    m: {
      entry: 'src/pages/m/main.js',
      template: 'public/m.html',
      filename: 'm.html',
      chunks: ['chunk-vendors', 'chunk-common', 'm'],
    },
    'quick-inputting': {
      entry: 'src/pages/quick-inputting/main.js',
      template: 'public/quick-inputting.html',
      filename: 'quick-inputting.html',
      chunks: ['chunk-vendors', 'chunk-common', 'quick-inputting'],
    },
    redirect: {
      entry: 'src/pages/redirect/main.js',
      template: 'public/redirect.html',
      filename: 'redirect.html',
      chunks: ['chunk-vendors', 'chunk-common', 'redirect'],
    },
  },
};
