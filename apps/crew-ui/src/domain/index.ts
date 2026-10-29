/**
 * The platform-free half of the domain, for a surface that cannot render
 * `<div>`.
 *
 * `src/index.ts` is the web barrel and pulls in every view; React Native must
 * not touch it. These subpath barrels (`@hermes/crew-ui/domain`, `/client`,
 * `/state`) exist so that is impossible rather than merely discouraged — an
 * RN import of a DOM component fails at the module boundary instead of at
 * render time on a device.
 */
export type * from "./types";
export type { CloudAgentsClient, ConversationSnapshot } from "./CloudAgentsClient";
export { CrewError } from "./types";
export { splitMentions } from "./mentions";
export { routineExamples } from "./routineExamples";
