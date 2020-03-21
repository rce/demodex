const path = require("path")

const { CleanWebpackPlugin } = require("clean-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const merge = require("webpack-merge")

const srcDir = path.resolve(__dirname, "src")
const distDir = path.resolve(__dirname, "dist")
const isLocal = env => env === "local"

module.exports = env => {
  const config = isLocal(env) ? localConfiguration : productionConfiguration
  return merge(commonConfiguration(env), config)
}

const localConfiguration = {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    port: 8888,
    publicPath: "/",
    contentBase: distDir,
    compress: true,
    hot: true,
    watchOptions: {
      poll: true,
    },
    proxy: [{
      context: ["/api"],
      target: "http://localhost:8080",
    }]
  }
}

const productionConfiguration = {
  mode: "production",
  devtool: "source-map",
  plugins: [
    new CleanWebpackPlugin(),
  ]
}

const commonConfiguration = env => ({
  entry: {
    app: path.join(srcDir, "App.tsx"),
  },
  output: {
    filename: isLocal(env) ? "bundle.js" : "bundle.[contenthash].js",
    path: distDir,
  },
  module: {
    rules: [
      {
        test: /\.tsx?/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(srcDir, "index.html"),
    })
  ]
})
