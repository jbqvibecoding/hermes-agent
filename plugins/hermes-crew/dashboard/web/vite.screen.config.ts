/**
 * Builds the read-only screen viewer the phone's WebView loads
 * (`plugins/hermes-crew/dashboard/dist/screen.js`).
 *
 * Its own pass rather than another entry on the plugin bundle, because it has
 * nothing to do with the dashboard tab: no React, no workspace, no shared
 * chunks. It is noVNC plus about a hundred lines of glue, loaded by a page the
 * dashboard serves to a WebView, and a phone on a LAN should not download the
 * markdown renderer to look at a screen.
 *
 * Like the other two passes the output is committed, so the plugin works in a
 * checkout that has never run npm.
 */

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@hermes\/crew-ui\/screen$/, replacement: here("../../../../apps/crew-ui/src/ui/screen/index.ts") },
    ],
  },
  build: {
    outDir: here("../dist"),
    emptyOutDir: false,
    lib: {
      entry: here("src/screen.ts"),
      // An ES module, not the IIFE the other two passes emit: noVNC's
      // `core/util/browser.js` uses top-level await, which an IIFE cannot
      // express. The page therefore loads it with `<script type="module">`,
      // which its `script-src 'self'` covers either way.
      formats: ["es"],
      fileName: () => "screen.js",
    },
    target: "es2022",
    minify: "esbuild",
    sourcemap: false,
  },
});
