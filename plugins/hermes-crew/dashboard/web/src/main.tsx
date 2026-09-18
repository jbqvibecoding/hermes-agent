/**
 * Plugin entry point — bundled to `dashboard/dist/index.js` as an IIFE.
 *
 * Deliberately almost empty. The host injects every enabled plugin's script on
 * dashboard boot, so anything in this file is weight every operator pays on
 * every page load whether or not they ever open /crew. The workspace is
 * fetched on first render of the tab instead; see `workspace.tsx`.
 *
 * `React` is not imported here — the build injects it (see `vite.shared.ts`),
 * because it comes from the host rather than from npm.
 */

/** Where `serve_plugin_asset` publishes this plugin's `dashboard/` directory. */
const ASSETS = "/dashboard-plugins/hermes-crew/dist";

interface PluginRegistry {
  register(name: string, component: React.ComponentType): void;
}

const sdk = (window as unknown as { __HERMES_PLUGIN_SDK__?: unknown }).__HERMES_PLUGIN_SDK__;
const plugins = (window as unknown as { __HERMES_PLUGINS__?: PluginRegistry }).__HERMES_PLUGINS__;

if (sdk && plugins) {
  // `@vite-ignore` because the browser resolves this against the dashboard's
  // origin at run time. Letting Rollup resolve it would inline the workspace
  // back into this file, which is exactly what the split exists to prevent.
  const CrewPage = React.lazy(() => import(/* @vite-ignore */ `${ASSETS}/workspace.js`));

  plugins.register("hermes-crew", () => (
    <React.Suspense fallback={<div className="crew-boot">Loading your crew…</div>}>
      <CrewPage />
    </React.Suspense>
  ));
}
