const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const extractSass = new ExtractTextPlugin({
	filename: '../styles/style-main.css',
	disable: process.env.NODE_ENV === 'development'
});

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
				use: extractSass.extract({
					use: [
						{
							loader: 'css-loader',
							options: { minimize: true }
						},
						{
							loader: 'sass-loader'
						}
					],
					fallback: 'style-loader'
				})
			}
		]
	},
	plugins: [extractSass]
};
