# Third-party code in `@hermes/crew-ui`

Parts of this package are derived from **Errand** by Runta
(<https://github.com/runta-dev/errand>), licensed under the Apache License 2.0.
A copy of that licence is in `licenses/errand-Apache-2.0.txt`.

Each derived file carries a header pointing at the file it came from and saying
how it differs. The point of keeping those notes is that the next person can
tell a deliberate change from a transcription error when Errand moves on.

| Here | From (`errand/src/…`) | Change |
|---|---|---|
| `src/ui/vncFrame.ts` | `ui/components/vncFrame.ts` | verbatim |
| `src/ui/VncDesktop.tsx` | `ui/components/VncDesktop.tsx` | wording; the noVNC import path (see below) |
| `src/ui/VncDesktop.test.tsx` | `ui/components/VncDesktop.test.tsx` | follows those two changes |
| `src/state/useCrewController.ts` | `state/useCrewController.ts` | four changes, each marked `CREW:` in the body |
| `src/state/useCrewController.test.tsx` | `state/useCrewController.test.tsx` | fixtures follow our interface; five cases are new |
| `src/domain/types.ts` | `domain/types.ts` | adds `ChipPart`, rooms, sections, routines |
| `src/domain/CloudAgentsClient.ts` | `domain/CloudAgentsClient.ts` | drops `setAgentUnread`; `sendMessage` takes a thread id; adds the crew-only methods |
| `src/ui/Conversation.tsx` | `ui/components/Conversation.tsx` | chips render; attachments and the Electron bridge removed |
| `src/ui/AgentList.tsx` | `ui/components/AgentList.tsx` | org-chart sections, rooms, status dot; Runta's account footer removed |
| `src/ui/DetailPanel.tsx` | `ui/components/DetailPanel.tsx` | routines section; a cold-start button |
| `src/ui/Select.tsx` | `ui/components/Select.tsx` | verbatim but for the header |
| `src/ui/CommandPalette.tsx` | `ui/components/CommandPalette.tsx` | crew commands and wording |
| `src/ui/styles.css` | `ui/styles.css` | same layout, rewritten to read the host's theme tokens |

Written for this repo rather than ported: `src/client/HermesCrewClient.ts`,
`src/ui/CrewWorkspace.tsx`, `src/ui/HireDialog.tsx`, `src/ui/AgentAvatar.tsx`,
`src/ui/chips/`.

## Notes on the two places we could not follow Errand

**noVNC's import path.** Errand imports `@novnc/novnc/lib/rfb.js`, which worked
on noVNC 1.5. Version 1.7 collapsed the package to a single entry point — its
`exports` field is the *string* `"./core/rfb.js"` — so no subpath resolves at
all and the specifier is the bare package name.

**Runta's `boring-avatars` seed.** Errand generates an avatar from the agent's
name. Teammates here are given an emoji when they are hired, so there is always
a picture the operator chose and the generated fallback would never render;
`AgentAvatar` draws the emoji on a tint derived from the id instead. That drops
a dependency rather than vendoring Runta's brand palette.

## Not taken

Runta's transport layer, its device-flow OAuth, `runtaEndpoints.ts`,
`cloudStreamPath.ts`, its Electron shell and its macOS signing pipeline —
Hermes has its own. Attachments are not here either: the backend has no
attachment store yet, and a paperclip that silently drops files is worse than
no paperclip.

`electron/main/vncOrigin.ts` (101 lines plus 143 of adversarial tests) is worth
coming back for, but not yet. It exists because a renderer sends its own Origin
on a WebSocket upgrade. A teammate's computer is on loopback and websockify does
not check Origin by default, so today there is nothing to authorise. Port it if
either of those stops being true: if websockify is started with
`--verify-origin`, or if a teammate's computer ever runs somewhere other than
this machine.
