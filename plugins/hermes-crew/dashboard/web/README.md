# Building the Crew dashboard bundle

```bash
npm install                 # from the repo root, once
npm run build:crew-plugin   # writes ../dist/
```

You only need this if you are **changing the UI**. `../dist/` is committed, so a
checkout that has never run npm still gets a working `/crew` tab.

## Why this plugin has a build step at all

Every other bundled dashboard plugin is a hand-written IIFE with no build, and
that convention is a good one. Two things here cannot be hand-written:

- **`@novnc/novnc`** — the RFB client that turns "the screen is black" from an
  unanswerable question into an eight-second error. See
  `apps/crew-ui/src/ui/VncDesktop.tsx`.
- **`streamdown`** — renders a teammate's markdown while it is still arriving,
  which is the point of the token stream.

## Why two passes

`npm run build` runs `vite.workspace.config.ts` and then `vite.config.ts`.

The host injects every enabled plugin's script on dashboard boot, for everyone,
whether or not they open the tab. So `index.js` is a **1 KB stub** that
registers a lazily-imported component, and the workspace is a separate ES
module fetched the first time somebody opens `/crew`.

That split is not only about boot cost. An IIFE cannot contain a dynamic import
(Rollup inlines them) and cannot contain top-level await at all, which noVNC
uses — a single-pass IIFE build simply fails. As an ES module, the workspace
splits normally:

| File | Fetched when |
|---|---|
| `index.js` (~1 KB) | dashboard boot |
| `workspace.js` + `chunk-workspace-*.js` (~100 KB) | `/crew` is opened |
| `chunk-rfb-*.js` (~281 KB) | a screen is opened |
| `chunk-mermaid-*.js` (~740 KB) | a teammate writes a ```mermaid block |

The mermaid chunk is the one to keep an eye on: it is large, it is committed,
and it comes in through `streamdown`, which lazy-loads it for diagram fences. It
costs nothing at run time for anyone who never sees a diagram, and it only
changes when `streamdown` is bumped. If it ever stops being worth 740 KB in git,
the fix is to stub streamdown's mermaid entry — not to un-commit `dist/`.

The workspace pass clears `../dist/` before writing. Chunk filenames carry
content hashes, so without that, every dependency bump would leave its
predecessor behind in a directory that is under version control.

## React

React is **not** bundled. It is borrowed from the host through
`window.__HERMES_PLUGIN_SDK__` (see `src/react-shim.ts`). Two Reacts on one page
is not a size problem, it is a correctness one: hooks dispatch through
module-level state, so a component built by a second React throws "invalid hook
call" the moment it renders inside the host's tree.

`src/jsx-runtime-shim.ts` exists for the same reason, one level down: the
libraries we bundle ship prebuilt ESM that imports `react/jsx-runtime`, and
there is no real one to resolve when React itself is borrowed.
