/**
 * Type-only half of the jest-dom setup.
 *
 * `src/test/setup.ts` extends the matchers by hand (see the note there), which
 * gives the runtime but not the types. jest-dom ships its own vitest
 * augmentation, but it lives beside the hoisted copy at the repo root and
 * augments the `vitest` it can see from *there* — which is not the one this
 * workspace's tests import, so it silently applies to nothing. Declaring it
 * here resolves `vitest` from here, where the tests actually get it.
 */
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import "vitest";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
