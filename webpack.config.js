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
    }
};
