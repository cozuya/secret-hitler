// webpack.config.prod.js
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Dotenv = require('dotenv-webpack');

process.env.NODE_ENV = 'production';

module.exports = {
	entry: './src/frontend-scripts/game-app.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, '../public/scripts')
	},
	plugins: [
		new MiniCssExtractPlugin({
			// write CSS next to your old location (../styles from scripts/)
			filename: '../styles/style-main.css'
		}),
		new Dotenv({
			path: path.resolve(__dirname, '..', '.env')
		})
	],
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
	// devtool: false,

	module: {
		rules: [
			{
				test: /\.(html)$/,
				use: {
					loader: 'html-loader',
					options: { attrs: [':data-src'] }
				}
			},
			{
				test: /\.(png|svg|jpg|gif)$/,
				use: {
					loader: 'file-loader',
					options: { useRelativePath: true }
				}
			},
			{
				test: /\.(js|jsx)$/,
				use: ['babel-loader'],
				exclude: /node_modules/
			},
			{
				test: /\.s?css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{ loader: 'css-loader', options: { sourceMap: false } },
					{
						loader: 'sass-loader',
						options: {
							implementation: require('sass'),
							sourceMap: false,
							sassOptions: {
								// match your old include-path behavior if you relied on it
								includePaths: [path.resolve(__dirname, '../src/scss')]
							}
						}
					}
				]
			}
		]
	},
	resolve: {
		extensions: ['.js', '.jsx'],
		alias: {
			'react-dom$': 'react-dom/profiling',
			'scheduler/tracing': 'scheduler/tracing-profiling'
		}
	}
};
