/**
 * `react/jsx-runtime` for the plugin bundle.
 *
 * Our own sources compile with the classic transform, so they never reach for
 * this. The libraries we bundle do: `streamdown` and `lucide-react` ship
 * prebuilt ESM that imports `{ jsx, jsxs, Fragment }` from the automatic
 * runtime, and since React itself is borrowed from the host (see
 * `react-shim.ts`) there is no real `react/jsx-runtime` for them to resolve.
 *
 * The two entry points differ only in how children arrive, and that difference
 * is load-bearing:
 *
 *   jsx()  — one child, or a *dynamic* array. A dynamic array must stay a
 *            single child so React keeps demanding keys for it.
 *   jsxs() — a *static* list the compiler already knew the length of, which is
 *            exactly `createElement(type, props, a, b, c)`.
 *
 * Collapsing them would either lose key warnings or spread an array React was
 * told to treat as one child.
 */

import React from "react";

type Props = Record<string, unknown> & { children?: unknown };

function build(type: unknown, config: Props | null, key: unknown, spreadChildren: boolean) {
  const { children, ...props } = config ?? {};
  if (key !== undefined) (props as Props).key = key;
  if (children === undefined) return React.createElement(type as never, props as never);
  if (spreadChildren && Array.isArray(children)) {
    return React.createElement(type as never, props as never, ...(children as never[]));
  }
  return React.createElement(type as never, props as never, children as never);
}

export function jsx(type: unknown, config: Props | null, key?: unknown) {
  return build(type, config, key, false);
}

export function jsxs(type: unknown, config: Props | null, key?: unknown) {
  return build(type, config, key, true);
}

/** The dev runtime takes three extra debug arguments and ignores them here. */
export const jsxDEV = (type: unknown, config: Props | null, key?: unknown) => jsx(type, config, key);

export const Fragment = React.Fragment;
