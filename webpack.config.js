var path = require("path");
var webpack = require("webpack");

module.exports = {
  entry: {
    // includes jquery in the app as it is required by all menu techniques
    app: [ path.resolve(__dirname, "src/app.js") ],
  },
  output: {
    path: path.join(__dirname, "assets"),
    filename: "[name].js",
    publicPath: "assets/",
    chunkFilename: 'app.[name].js'
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: "babel", include: path.join(__dirname, "src") }
    ],
  },
};
