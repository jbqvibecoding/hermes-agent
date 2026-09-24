/**
 * `@hermes/crew-ui` — the Crew workspace, written once and mounted twice.
 *
 * The dashboard plugin bundles this into an IIFE
 * (`plugins/hermes-crew/dashboard/web/`); `apps/desktop` imports it as source
 * through its own Vite. Both hand it a `CloudAgentsClient` and nothing else,
 * which is what keeps the two shells from growing separate copies of the
 * conversation logic.
 */

export { CrewWorkspace } from "./ui/CrewWorkspace";
export { Conversation, MessageView } from "./ui/Conversation";
export { AgentList } from "./ui/AgentList";
export { AgentAvatar } from "./ui/AgentAvatar";
export { DetailPanel } from "./ui/DetailPanel";
export { PermissionsPanel } from "./ui/PermissionsPanel";
export { AuditTimeline } from "./ui/AuditTimeline";
export { FilesPanel } from "./ui/FilesPanel";
export { PlanPanel } from "./ui/PlanPanel";
export { CommandPalette } from "./ui/CommandPalette";
export { HireDialog } from "./ui/HireDialog";
export { Select } from "./ui/Select";
export { VncDesktop, VncSurface } from "./ui/VncDesktop";
export { canvasHasVisualFrame } from "./ui/vncFrame";
export { ChipView } from "./ui/chips";
export type { ChipHandlers } from "./ui/chips";

export { useCrewController } from "./state/useCrewController";
export type { CrewControllerOptions } from "./state/useCrewController";

export { HermesCrewClient, defaultEventsUrl } from "./client/HermesCrewClient";
export type { HermesCrewClientOptions } from "./client/HermesCrewClient";

export type { CloudAgentsClient, ConversationSnapshot } from "./domain/CloudAgentsClient";
export * from "./domain/types";
