/**
 * The resolve/JSX settings both plugin build passes need.
 *
 * Kept in one file so the entry stub and the workspace cannot drift into
 * borrowing React differently — which would be two Reacts on the page, and
 * "invalid hook call" the first time a component in one half rendered inside
 * the other.
 */

import type { UserConfig } from "vite";

export function shared(here: (path: string) => string): UserConfig {
  return {
    resolve: {
      // Exact matches. Plain string aliases are prefix substitutions, so a
      // bare `react` entry would also rewrite `react-dom` and
      // `react/jsx-runtime` into paths under the shim file.
      alias: [
        { find: "@hermes/crew-ui/styles.css", replacement: here("../../../../apps/crew-ui/src/ui/styles.css") },
        { find: /^@hermes\/crew-ui$/, replacement: here("../../../../apps/crew-ui/src/index.ts") },
        { find: /^react$/, replacement: here("src/react-shim.ts") },
        { find: /^react\/jsx-(dev-)?runtime$/, replacement: here("src/jsx-runtime-shim.ts") },
      ],
    },
    esbuild: {
      // No @vitejs/plugin-react: it exists for Fast Refresh and forces the
      // automatic JSX runtime on our own sources. These are production lib
      // builds with no dev server, so the classic transform is enough and
      // compiles straight to the `React.createElement` the shim provides.
      jsx: "transform",
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      jsxInject: `import React from "react"`,
    },
  };
}
