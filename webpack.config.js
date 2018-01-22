var path = require("path");
var webpack = require("webpack");

module.exports = {
    entry: {
        app: ["babel-polyfill", path.resolve(__dirname, "src/main.js")]
    },
    output: {
        path: path.join(__dirname, "assets"),
        filename: "app.js",
        publicPath: "assets/"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: ["babel-loader"],
                include: path.join(__dirname, "src")
            },
            { test: /\.handlebars$/, use: "handlebars-loader" },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            Promise: "es6-promise", // Thanks Aaron (https://gist.github.com/Couto/b29676dd1ab8714a818f#gistcomment-1584602)
            fetch:
                "imports-loader?this=>global!exports-loader?global.fetch!whatwg-fetch"
        })
    ]
};
