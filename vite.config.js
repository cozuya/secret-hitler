// vite.config.js
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = 8080; // Express
const VITE_PORT = 5173; // Vite dev

export default defineConfig({
	plugins: [
		react({
			jsxRuntime: 'classic',
			babel: {
				plugins: ['@babel/plugin-proposal-optional-chaining', '@babel/plugin-proposal-nullish-coalescing-operator']
			},
			include: /src\/.*\.(js|jsx)$/
		})
	],
	esbuild: false,
	server: {
		port: VITE_PORT,
		proxy: {
			// add every server prefix you call from the client
			'^/(api|account|auth|admin|mod|replay)': {
				target: `http://127.0.0.1:${API_PORT}`,
				changeOrigin: true
			},
			'/socket.io': {
				target: `http://127.0.0.1:${API_PORT}`,
				ws: true,
				changeOrigin: true
			}
		}
	},
	build: {
		outDir: 'public',
		emptyOutDir: false,
		sourcemap: true
	},
	resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
	css: { preprocessorOptions: { scss: { includePaths: ['src/scss'] } } }
});
