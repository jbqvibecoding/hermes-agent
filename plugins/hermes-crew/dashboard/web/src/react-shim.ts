/**
 * `react` for the plugin bundle — the host's copy, not ours.
 *
 * The dashboard exposes its React on `window.__HERMES_PLUGIN_SDK__` precisely
 * so plugins do not ship a second one. Two Reacts in one page is not a size
 * problem, it is a correctness one: hooks dispatch through module-level state,
 * so a component built by our React rendered inside the host's tree throws
 * "invalid hook call" on its first `useState`.
 *
 * Vite aliases `react` to this file, so everything in the bundle — our
 * components and the libraries we bundle alongside them — resolves here.
 *
 * The named list is explicit rather than a dynamic re-export because ESM has
 * no way to spread an object into exports. If a bundled library reaches for
 * something missing, the build fails by name at link time, which is exactly
 * when we want to hear about it.
 */

import type * as ReactTypes from "react";

interface PluginSdk { React?: typeof ReactTypes }

const sdk = (globalThis as unknown as { __HERMES_PLUGIN_SDK__?: PluginSdk }).__HERMES_PLUGIN_SDK__;
const React = sdk?.React;

if (!React) {
  throw new Error(
    "hermes-crew: the dashboard plugin SDK is not on the page, so there is no React to borrow.",
  );
}

export default React;

export const {
  Children, Fragment, Profiler, StrictMode, Suspense,
  cloneElement, createContext, createElement, createRef, forwardRef,
  isValidElement, lazy, memo, startTransition, use,
  useActionState, useCallback, useContext, useDebugValue, useDeferredValue,
  useEffect, useId, useImperativeHandle, useInsertionEffect, useLayoutEffect,
  useMemo, useOptimistic, useReducer, useRef, useState,
  useSyncExternalStore, useTransition, version,
} = React;

export type * from "react";
