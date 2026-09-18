/**
 * Builds the plugin's entry stub into the single IIFE the dashboard host loads
 * (`plugins/hermes-crew/dashboard/dist/index.js`).
 *
 * This is the one place in the repo where a dashboard plugin has a build step.
 * The other bundled plugins are hand-written IIFEs, and that convention is a
 * good one — it keeps them editable without npm. We depart from it for two
 * things that cannot be hand-written: `@novnc/novnc`'s RFB client, which turns
 * "the screen is black" from an unanswerable question into an eight-second
 * error, and `streamdown`, which renders markdown while it is still arriving.
 * The output is committed, so the plugin works in a checkout that has never
 * run npm; only someone *changing* the UI needs it.
 *
 * React is not bundled — see `src/react-shim.ts`. The workspace is not bundled
 * here either — see `vite.workspace.config.ts`.
 */

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { shared } from "./vite.shared";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  ...shared(here),
  build: {
    outDir: here("../dist"),
    emptyOutDir: false,
    // The host injects this with a plain <script> tag, so it must be one
    // classic script with no import statements.
    lib: {
      entry: here("src/main.tsx"),
      formats: ["iife"],
      name: "HermesCrewPlugin",
      fileName: () => "index.js",
    },
    target: "es2022",
    minify: "esbuild",
    sourcemap: false,
  },
});
