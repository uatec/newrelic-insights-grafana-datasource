SystemJS.config({
  map: {
    'plugin-babel': 'path/to/systemjs-plugin-babel/plugin-babel.js',
    'systemjs-babel-build': 'path/to/systemjs-plugin-babel/systemjs-babel-browser.js'
  },
  transpiler: 'plugin-babel'
});