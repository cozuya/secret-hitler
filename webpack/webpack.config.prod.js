const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
	entry: './src/frontend-scripts/game-app.js',
	output: {
		filename: `bundle.js`,
		path: path.resolve(__dirname, '../public/scripts')
	},
	plugins: [new UglifyJSPlugin()],
	module: {
		rules: [
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
						loader: 'css-loader'
						// options: {
						// 	sourceMap: true
						// }
					},
					{
						loader: 'sass-loader'
						// options: {
						// 	sourceMap: true
						// }
					}
				]
			}
		]
	}
};
