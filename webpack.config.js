const path = require('path');
const webpack = require('webpack');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const autoprefixer = require('autoprefixer');
const ImageminPlugin = require('imagemin-webpack-plugin').default;

const IS_DEV = process.env.NODE_ENV === 'development'	// eslint-disable-line

const plugins = [
	new webpack.LoaderOptionsPlugin({
		options: {
			postcss: function () {
				return [ autoprefixer ];
			}
		}
	}),
	new webpack.DefinePlugin({
		'process.env': {
			'NODE_ENV': IS_DEV ? JSON.stringify('development') : JSON.stringify('production')
		}
	}),
	new ImageminPlugin({
		disable: true, // change to false if you want to compress images even while webpack is in debug mode
		pngquant: {
			quality: '75-90'
		},
		gifsicle: {
			optimizationLevel: 1
		},
		svgo: {},
		plugins: [] // add imagemin-mozjpeg plugin once https://github.com/sindresorhus/execa/issues/61 is available...and prob switch to image-webpack-loader
	})
];

const loaders = [
	{
		test: /\.jsx?$/,
		loader: 'babel-loader',
		exclude: /node_modules/,
		options: {
			cacheDirectory: true
		}
	}, {
		test: /\.scss$/,
		loaders: [
			'style-loader',
			{ loader: 'css-loader', options: { importLoaders: 1 } },
			{
				loader: 'postcss-loader',
				options: {
					plugins: loader => [
						require('autoprefixer')({
							browsers: [
								'>1%',
								'last 4 versions',
								'Firefox ESR',
								'not ie < 9', // React doesn't support IE8 anyway
							],
							flexbox: 'no-2009',
						}),
					]
				}
			},
			'sass-loader'
		]
	}, {
		include: /\.json$/,
		loaders: [ 'json-loader' ]
	}, {
		test: /\.(jpe?g|png|gif|svg)/,
		loaders: [
			{
				loader: 'url-loader',
				query: {
					hash: 'sha512',
					digest: 'hex',
					name: '[name]-[hash].[ext]',
					limit: 10000
				}
			}, {
				loader: 'image-webpack-loader',
				options: {
					optipng: {
						optimizationLevel: 7,
					},
					gifsicle: {
						interlaced: false,
					},
					pngquant: {
						quality: '65-90',
						speed: 4
					},
					mozjpeg: {
						quality: 65
					}
				}
			}
		]
	}, {
		test: /\.(woff|ttf|eot|svg)/,
		loaders: [ 'file-loader' ]
	}
];

if (IS_DEV) {
	plugins.push(
		new webpack.NamedModulesPlugin()
	);

	loaders.unshift({
		enforce: 'pre',
		test: /\.jsx?$/,
		exclude: /node_modules/,
		loader: 'eslint-loader',
	});
} else {
	plugins.push(
		new OptimizeCssAssetsPlugin({
			cssProcessor: require('cssnano'),
			cssProcessorOptions: { discardComments: { removeAll: true } },
			canPrint: true
		}),
		new webpack.LoaderOptionsPlugin({
			minimize: true,
			debug: false
		}),
		new webpack.optimize.UglifyJsPlugin({
			compress: {
				warnings: false,
				screw_ie8: true,
				conditionals: true,
				unused: true,
				comparisons: true,
				sequences: true,
				dead_code: true,
				evaluate: true,
				if_return: true,
				join_vars: true,
			},
			output: {
				comments: false
			}
		})
	);
}

module.exports = {
	devtool: IS_DEV ? 'inline-source-map' : 'nosources-source-map',
	entry: {
		'game': './src/frontend-scripts/game-app.js',
		'charts': './src/charts/charts.js',
		'site': './src/site/site.js'
	},
	output: {
		path: path.resolve(__dirname, 'public/scripts/'),
		publicPath: '/scripts/',
		filename: '[name].js'
	},
	externals: {
		'jquery': 'jQuery'
	},
	module: { loaders },
	resolve: {
		modules: [ './src', './node_modules' ]
	},
	plugins
};
