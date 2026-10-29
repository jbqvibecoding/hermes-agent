import { defineConfig } from "vitest/config";

/**
 * Only `src/**` — the modules with no React Native imports.
 *
 * The screens under `app/` need a device (or jest-expo and a native mock
 * layer) and are verified by `tsc` plus review, not by this. Pretending
 * otherwise would be the worse outcome: a green suite that proves the parts
 * nobody worried about.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
