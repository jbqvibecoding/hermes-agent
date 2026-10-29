# @hermes/crew-mobile

The Crew workspace on a phone. Expo / React Native, parallel to `apps/desktop`.

## What is shared and what is not

The view layer is specific to this app — React Native has no `<div>`. Everything
under it is the same code the dashboard plugin and the desktop app run, imported
through subpath exports:

```ts
import { HermesCrewClient } from "@hermes/crew-ui/client";   // REST + event stream
import { useCrewController } from "@hermes/crew-ui/state";    // the whole controller
import type { Agent, Standstill } from "@hermes/crew-ui/domain";
```

**Never import `@hermes/crew-ui` itself.** That barrel pulls in every DOM
component; the subpaths exist so an accidental import fails at the module
boundary instead of at render time on a device.

The one thing this app supplies that the web shells do not is
`src/platform.ts` — `AppState` + NetInfo answering the two questions the
controller's roster safety net asks. See `apps/crew-ui/src/state/platform.ts`.

## Running it

The phone has to be able to reach the operator's Hermes, which by default binds
to loopback and cannot be:

```bash
# on the machine running Hermes
export HERMES_DASHBOARD_SESSION_TOKEN=$(openssl rand -hex 32)   # otherwise it is
                                                                # random per restart
hermes dashboard --host 0.0.0.0
```

`cmd_dashboard` will prompt about auth on a non-loopback bind — that prompt is
the point, not an obstacle. Then in the app's Connect screen enter the address
(`10.0.0.5:8787`) and that token.

```bash
npm run start       # expo
npm run typecheck   # tsc
npm test            # vitest, src/** only — see below
```

## Two honest caveats

**The dependency versions were not resolved by Expo.** `npx expo install` needs
Expo's compatibility API, which the container this was built in cannot reach
(HTTP 403 through the proxy). The versions in `package.json` are the current
published majors with ceilings per the repo's pinning policy, and `react` is
`>=19.2.3` because `react-native@0.86` demands it — npm's resolver caught that
pairing, which is some assurance, but it is not Expo's own matrix. **Run
`npx expo install --fix` on a machine with network access to Expo before
building.**

**The screens have never run.** There is no simulator or device in that
container. What is actually verified:

| Verified | How |
|---|---|
| The shared half works without a DOM | `apps/crew-ui/src/state/portability.test.ts`, under `@vitest-environment node` |
| The connect-screen logic | `src/connection.test.ts` — 13 tests, 5 mutations confirmed |
| The markdown tokeniser | `src/markdown.test.ts` — including that unsupported constructs survive as literal text |
| Approvals always send `contentHash` | `src/approvals.test.ts` — the one claim of this design that code can check |
| Everything typechecks together | `tsc -p . --noEmit`, including the shared imports |
| **Layout, keyboard, navigation, the WebView** | **not verified — needs a device** |

### Markdown: what renders and what does not

Fenced code (monospace, horizontally scrollable), bullet lists, bold and inline
code. Tables, headings, links and blockquotes are **shown as their own literal
characters** rather than rendered — a renderer that silently eats a table is
worse than one that shows the pipes.

### Approvals: two decisions, and always the hash

Discard and Approve plus an optional note, matching the desktop exactly. There
is no "always allow" — adding one would make the phone, which is the weaker
context, the more permissive one. Every decision carries
`ApprovalRequest.contentHash`, so a card rewritten between reading and tapping
is refused by the server rather than silently consented to. The in-thread
`approval_request` chip has no buttons for that reason: its payload has no hash,
so it navigates to the approvals screen instead.

`npm test` covers `src/**` only. The screens under `app/` need jest-expo and a
native mock layer; a suite that rendered them against mocks would prove the
parts nobody was worried about.

## Not here yet

- **Push notifications.** `expo-notifications` is only the client half and
  Hermes has no server-side push path, so the app is pull-only. Worth knowing,
  because "approve from your phone" is weaker when nothing taps you on the
  shoulder.
- Spaces editing, and the teammate's screen via `react-native-webview` (the
  noVNC library is DOM-only and cannot be ported).
- Markdown tables, headings, links and blockquotes as anything but literal text.
