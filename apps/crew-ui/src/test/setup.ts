/**
 * Adapted from errand/src/test/setup.ts.
 *
 * The matchers are extended by hand rather than through
 * `@testing-library/jest-dom/vitest`. In this monorepo npm hoists jest-dom to
 * the root while `vitest` nests under this workspace (the root's other
 * workspaces pin a different version), so jest-dom's vitest entry cannot
 * resolve `vitest` from where it lands. Importing the plain matcher object has
 * no such dependency and produces the same `expect`.
 */

import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

expect.extend(matchers);

// Guarded because `state/portability.test.ts` runs under
// `@vitest-environment node` on purpose — it proves the shared modules survive
// React Native's missing DOM, and it cannot do that if the setup file itself
// reaches for `window` before the first test runs.
if (typeof window !== "undefined") {
  afterEach(() => cleanup());
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
}
