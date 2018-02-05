const path = require('path');

module.exports = {
	entry: './src/frontend-scripts/game-app.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve('public/scripts')
	},
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
