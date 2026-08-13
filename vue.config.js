const path = require('path');

module.exports = {
  publicPath:
    process.env.GITHUB_ACTIONS === 'true' ? '/xjtu-scheduling-helper/' : '/',
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
  },
};
