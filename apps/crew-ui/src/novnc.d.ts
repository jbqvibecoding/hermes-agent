/**
 * Adapted from errand/src/novnc.d.ts — @novnc/novnc ships no types for RFB.
 *
 * The specifier is the bare package name, not errand's
 * `@novnc/novnc/lib/rfb.js`. noVNC 1.7 collapsed to a single entry point: its
 * `exports` field is the *string* `"./core/rfb.js"`, so the package root is
 * RFB and no subpath resolves at all.
 */
declare module "@novnc/novnc" {
  export default class RFB extends EventTarget {
    constructor(target: HTMLElement, url: string, options?: { shared?: boolean; wsProtocols?: string[] });
    scaleViewport: boolean;
    resizeSession: boolean;
    viewOnly: boolean;
    background: string;
    disconnect(): void;
  }
}
