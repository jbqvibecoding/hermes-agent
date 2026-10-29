/**
 * The platform-free state layer. See `src/domain/index.ts` for why these
 * subpath barrels exist.
 */
export { useCrewController } from "./useCrewController";
export type { CrewControllerOptions } from "./useCrewController";
export { PageAutosave, MAX_TITLE, MAX_CONTENT } from "./pageAutosave";
export type { SavePage, SaveState, SaveStatus } from "./pageAutosave";
export { webPlatform, alwaysActivePlatform, detectPlatform } from "./platform";
export type { PlatformBridge, WakeReason } from "./platform";
