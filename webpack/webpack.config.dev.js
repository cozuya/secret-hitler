const path = require('path');
const Reload = require('webpack-livereload-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = {
	entry: {
		'./src/frontend-scripts/game-app.js',
		app: './src/index.js'
	},
    	devtool: 'inline-source-map',
    	devServer: {
      		contentBase: './dist',
     		hot: true
    	},
    	plugins: [
      		new CleanWebpackPlugin(['dist']),
      		new HtmlWebpackPlugin({
        		title: 'Hot Module Replacement'
      		}),
     		new webpack.NamedModulesPlugin(),
     		new webpack.HotModuleReplacementPlugin()
    	],
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, '../public/scripts')
	},
	plugins: [new Reload()],
	devtool: 'inline-source-map',
	module: {
		rules: [
			{
				test: /\.(html)$/,
				use: {
					loader: 'html-loader',
					options: {
						attrs: [':data-src']
					}
				}
			},
			{
				test: /\.(png|svg|jpg|gif)$/,
				use: {
					loader: 'file-loader',
					options: {
						useRelativePath: true
					}
				}
			},
			{
				test: /\.(js|jsx)$/,
				use: ['babel-loader'],
				exclude: /node_modules/
			},
			{
				test: /\.scss$/,
				use: [
					{
						loader: 'style-loader'
					},
					{
						loader: 'css-loader',
						options: {
							sourceMap: true
						}
					},
					{
						loader: 'sass-loader',
						options: {
							sourceMap: true
						}
					}
				]
			}
		]
	}
};
