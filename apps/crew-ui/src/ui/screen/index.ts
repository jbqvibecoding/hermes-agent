/**
 * The viewer's geometry and its "is it painting?" check, with no React in
 * either — so the WebView bundle that watches a teammate's screen can import
 * them without pulling the whole workspace in behind them.
 */

export { desktopTransform, type DesktopPlacement } from "./transform";
export { canvasHasVisualFrame } from "../vncFrame";
