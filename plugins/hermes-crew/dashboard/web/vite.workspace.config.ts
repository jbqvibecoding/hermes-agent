/**
 * Builds the workspace half of the plugin: `dashboard/dist/workspace.js` plus
 * whatever chunks Rollup splits out of it, and the stylesheet.
 *
 * ES format, unlike the entry stub. That is the whole reason this is a second
 * pass: an IIFE cannot hold a dynamic import (Rollup inlines them) and cannot
 * hold top-level await at all, which noVNC uses. As an ES module, noVNC,
 * shiki and mermaid each land in their own chunk and are fetched only if
 * something on screen needs them.
 *
 * The dashboard serves all of it from `/dashboard-plugins/hermes-crew/dist/`
 * (`serve_plugin_asset` in `hermes_cli/web_server.py` serves any `.js` under a
 * plugin's `dashboard/` directory), and the chunks' relative imports resolve
 * against that URL.
 */

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { shared } from "./vite.shared";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  ...shared(here),
  build: {
    outDir: here("../dist"),
    // This pass runs first and wipes the directory. Chunk names carry content
    // hashes, so without it every streamdown or noVNC bump would leave its
    // predecessor behind — and `dist/` is committed, so those would
    // accumulate in git forever.
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: { entry: here("src/workspace.tsx"), formats: ["es"] },
    rollupOptions: {
      output: {
        entryFileNames: "workspace.js",
        chunkFileNames: "chunk-[name]-[hash].js",
        assetFileNames: (asset) =>
          asset.names?.[0]?.endsWith(".css") ? "style.css" : "[name][extname]",
      },
    },
    target: "es2022",
    minify: "esbuild",
    sourcemap: false,
  },
});
