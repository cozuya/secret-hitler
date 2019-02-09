const path = require('path');

// const Reload = require('webpack-livereload-plugin');
// const CleanWebpackPlugin = require('clean-webpack-plugin');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');

process.env.NODE_ENV = 'development';

module.exports = {
	entry: './src/frontend-scripts/game-app.js',

	plugins: [
		new Dotenv({
			path: path.resolve(__dirname, '..', '.env')
		})
	],
	output: {
		filename: `bundle.js`,
		path: path.resolve(__dirname, '../public/scripts')
	},
	plugins: [extractSass],
	optimization: {
		minimizer: [
			new UglifyJSPlugin({
				parallel: true,
				uglifyOptions: {
					mangle: false,
					keep_classnames: true,
					keep_fnames: true
				}
			})
		]
	},
	devtool: 'cheap-module-source-map',
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
				use: {
					loader: 'babel-loader',
					query: {
						presets: ['react-app']
					}
				},
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
	}
};
