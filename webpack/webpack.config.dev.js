const path = require('path');
const Reload = require('webpack-livereload-plugin');

module.exports = {
	entry: './src/frontend-scripts/game-app.js',
	output: {
		filename: `bundle.js?${new Date().getTime()}`,
		path: path.resolve(__dirname, '../public/scripts')
	},
	plugins: [new Reload()],
	devtool: 'inline-source-map',
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
