import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite replaces the old webpack build as a drop-in: it bundles the React client
// entry to public/scripts/bundle.js and emits its CSS to public/styles/style-main.css,
// the exact paths the pug views (layout.pug / layout-no-menu.pug) already load.
// React 16 has no automatic JSX runtime, so the plugin runs in classic mode.
export default defineConfig({
  // Many client files are .js but contain JSX (the old webpack ran babel on .js too),
  // so widen the plugin's transform to cover .js, not just .jsx.
  plugins: [react({ jsxRuntime: "classic", include: /\.(js|jsx)$/ })],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [path.resolve(import.meta.dirname, "src/scss")],
        quietDeps: true,
        silenceDeprecations: [
          "import",
          "global-builtin",
          "color-functions",
          "function-units",
          "slash-div",
          "legacy-js-api",
        ],
      },
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "public"),
    emptyOutDir: false,
    sourcemap: true,
    // Extract the bundle's CSS into a real file (public/styles/style-main.css) instead of
    // inlining it into the IIFE — the pug layouts load it via a <link> with a cache-bust query.
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, "src/frontend-scripts/game-app.jsx"),
      output: {
        format: "iife",
        entryFileNames: "scripts/bundle.js",
        // CSS keeps a stable name (the views cache-bust it via ?token); emitted image assets get
        // a content hash so changed images bust the 28-day Express cache.
        assetFileNames: (info) =>
          info.name && info.name.endsWith(".css") ? "styles/style-main.css" : "assets/[name]-[hash][extname]",
      },
    },
  },
});
