var path = require("path");
var webpack = require("webpack");
var nodeModules = "node_modules";
var webModules = "web_modules";
var es6modules = ["lodash-es"].map(function(moduleName){
  return path.join(__dirname, nodeModules, moduleName);
}).concat(["tie"].map(function(moduleName){
  return path.join(__dirname, webModules, moduleName);
}));

module.exports = {
  entry: {
    // includes jquery in the app as it is required by all menu techniques
    app: [ "babel-polyfill",  path.resolve(__dirname, "src/app.js") ],
  },
  output: {
    path: path.join(__dirname, "assets"),
    filename: "[name].js",
    publicPath: "assets/"
  },
  resolve: {
    packageMains: ["webpack", "browser", "web", "browserify", ["jam", "main"], "jsnext:main", "main"],
    modulesDirectories: [ "shim", webModules, nodeModules ]
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: "babel", include: [
          path.join(__dirname, "src")
        ].concat(es6modules)
      },
      { test: /\.handlebars$/, loader: 'handlebars-loader' },
      { test: /\.css$/, loader: 'style?singleton!css' },
    ],
  },
  plugins: [
        new webpack.ProvidePlugin({
            'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        })
    ]
};
