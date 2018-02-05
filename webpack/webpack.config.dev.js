const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	entry: './src/frontend-scripts/game-app.js',
	output: {
		filename: `bundle.js?${new Date().getTime()}`,
		chunkFilename: `bundle-chunk.js?${new Date().getTime()}`,
		publicPath: './',
		path: path.resolve(__dirname, 'public/scripts')
	},
	plugins: [
		new HtmlWebpackPlugin({
			hash: true
		})
	],
	module: {
		loaders: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				loader: 'babel-loader',
				options: {
					cacheDirectory: true
				}
			}
		]
	}
};
