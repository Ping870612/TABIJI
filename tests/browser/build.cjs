// Offline UI harness: aliases prevent any real Firebase or Google Maps access.
process.env.NODE_ENV = 'production';
process.env.BABEL_ENV = 'production';
process.env.REACT_APP_FIREBASE_API_KEY = 'offline-fixture';
process.env.REACT_APP_IMGBB_API_KEY = 'offline-fixture';
const path = require('path');
const webpack = require('webpack');
const config = require('react-scripts/config/webpack.config')('production');
config.output.path = path.resolve('build-browser-test');
config.cache = false;
config.resolve.plugins = config.resolve.plugins.filter(plugin => plugin.constructor.name !== 'ModuleScopePlugin');
for (const name of ['firebase/app', 'firebase/auth', 'firebase/firestore']) config.resolve.alias[name + '$'] = path.resolve('tests/browser/firebase.js');
config.resolve.alias['@react-google-maps/api$'] = path.resolve('tests/browser/maps.jsx');
const babel = config.module.rules.find(rule => rule.oneOf).oneOf.find(rule => rule.include && rule.loader?.includes('babel-loader'));
babel.include = [babel.include, path.resolve('tests/browser')];
config.plugins = config.plugins.filter(plugin => plugin.constructor.name !== 'ESLintWebpackPlugin');
webpack(config, (error, stats) => {
  if (error || stats.hasErrors()) { console.error(error || stats.toString({ all: false, errors: true })); process.exitCode = 1; }
  else console.log('Offline browser fixture built');
});
