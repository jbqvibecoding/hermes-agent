import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// `hgui` symlinks a worktree's node_modules to the main checkout. Vite realpaths
// those before enforcing server.fs.allow, so codicon/font assets resolve outside
// the worktree root and 404. Whitelist the real node_modules locations.
const real = (p: string): string | null => {
  try {
    return fs.realpathSync(p)
  } catch {
    return null
  }
}

const fsAllow = [
  ...new Set(
    [
      path.resolve(__dirname, '../..'),
      real(path.resolve(__dirname, 'node_modules')),
      real(path.resolve(__dirname, '../../node_modules'))
    ].filter((p): p is string => p !== null)
  )
]

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  css: {
    // Pin an explicit (empty) PostCSS config. Tailwind is handled entirely by
    // `@tailwindcss/vite`, so the renderer needs no PostCSS plugins — and
    // without this, Vite's `postcss-load-config` walks UP the filesystem
    // looking for a stray `postcss.config.*` / `tailwind.config.*`. The desktop
    // build runs from inside the user's home tree (e.g.
    // `C:\Users\<name>\AppData\Local\hermes\hermes-agent\apps\desktop`), so an
    // unrelated Tailwind v3 config higher up the tree gets picked up and
    // reprocesses our v4 stylesheet, failing the build with
    // "`@layer base` is used but no matching `@tailwind base` directive is
    // present." Pinning the config makes the build hermetic.
    postcss: { plugins: [] }
  },
  build: {
    // Keep desktop packaging stable: Shiki ships many dynamic chunks by
    // default, and electron-builder can OOM scanning thousands of files.
    // Collapsing to a single chunk is intentional, so the renderer bundle is
    // large by design (~22 MB). Raise the warning ceiling above that so the
    // cosmetic "chunk larger than 500 kB" nag stays quiet, while still acting
    // as a regression alarm if the bundle balloons well past today's size.
    chunkSizeWarningLimit: 25000,
    rolldownOptions: {
      output: {
        codeSplitting: false
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@hermes/shared': path.resolve(__dirname, '../shared/src'),
      '@hermes/crew-ui/styles.css': path.resolve(__dirname, '../crew-ui/src/ui/styles.css'),
      '@hermes/crew-ui': path.resolve(__dirname, '../crew-ui/src/index.ts'),
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-dev-runtime.js'),
      'react/jsx-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-runtime.js')
    },
    dedupe: ['react', 'react-dom']
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    fs: {
      allow: fsAllow
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 4174
  },
  // Vitest reads this file, so the renderer's tests get the aliases and the
  // react plugin above for free. Two things it was not getting:
  //
  // `environment` lived in the `test:ui` script rather than here, so the
  // invocation AGENTS.md describes ("run via the repo-root vitest") ran
  // component tests under `node` and every one of them died on
  // `document is not defined` — 320 failures, none of them the code's fault.
  //
  // And `electron/*.test.cjs` are `node --test` files with their own script
  // (`test:desktop:platforms`), but vitest's default include matches `.cjs`,
  // so it collected 34 files written for another runner and called each one a
  // failure. That is what made this suite look broken when it mostly is not.
  test: {
    environment: 'jsdom',
    // jsdom ships no `CSS` object, and three components build selectors with
    // `CSS.escape`. See the file for why the polyfill follows the spec.
    setupFiles: ['./src/test-setup.ts'],
    // `electron/` and `scripts/` are `node --test` suites with their own
    // scripts; `build/` is gitignored output that vendors node-pty, whose own
    // test files are not ours to run. All three only show up because vitest's
    // default include matches `.cjs` and `.js` as readily as `.tsx`, and every
    // one of them reports as a failure when vitest tries.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'electron/**',
      'scripts/**'
    ]
  }
})
