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
| What a backgrounded edit does | `src/draft.test.ts` — including that a *conflict* is never re-sent unattended |
| Everything typechecks together | `tsc -p . --noEmit`, including the shared imports |
| **Layout, keyboard, navigation** | **not verified — needs a device** |
| **Whether the background flush actually fires** | **not verified — depends on OS suspend behaviour no container reproduces** |

### Spaces

Read and write, over the same `PageAutosave` the desktop uses. Two things are
specific to a phone:

- **A flush when the app leaves the foreground.** The autosave is debounced; a
  browser tab stays alive long enough for the timer, but an OS can suspend or
  kill an app the instant you switch away, and the typed text would be gone.
  Not done for a `conflict`, though — re-sending a draft the server already
  refused would turn a conflict you have not seen into a silent attempt to
  overwrite whoever changed the page.
- **A conflict is resolved by hand**, with *Take theirs* and *Keep mine*.
  `PageAutosave.useLatest()` is the only thing in it that discards work, so it
  runs only because somebody pressed it.

Creating and deleting Spaces stays on the dashboard: a phone that can delete a
shared document with a stray tap is a liability.

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

## The teammate's screen

Here now, **read-only**, via a proxy — which is exactly the piece the previous
version of this section said was missing. Tap **Screen** on a teammate whose
computer is online.

`crew/computer.py` serves VNC at `ws://127.0.0.1:{port}/websockify`, and from a
phone `127.0.0.1` is the phone. Publishing that port to the LAN would put an
**unauthenticated remote desktop with the teammate's shell behind it** in front
of the network, so instead `/v1/bots/{id}/screen` relays it:

- the upgrade goes through the dashboard's own WebSocket gate, the same one
  `/v1/events` uses;
- `crew/rfb_guard.py` reads the client→server half of the stream and forwards
  only the three RFB messages a viewer needs to *receive pixels*. Keys, pointer
  and clipboard are dropped **on the server** — the viewer also sets noVNC's
  `viewOnly`, but that is the client describing itself;
- three minutes with nothing crossing closes it, so a backgrounded phone does
  not hold a container's screen open;
- it leaves `screen.opened` / `screen.closed` rows, and says so separately if
  something tried to send input.

What you see is a page the dashboard serves into a `WebView`: noVNC paints the
canvas, cindy's `desktopTransform` (Apache-2.0) does pinch and pan, and
`canvasHasVisualFrame` tells "connected but never painted" apart from a working
screen — which is this image's most likely failure and the thing an iframe
could never distinguish.

**Not verified on a device.** The proxy, the filter and the geometry have
tests; the WebView, the pinch, and whether a 1280×800 desktop is legible on a
phone have not been run on real hardware from this container. Treat the feel of
it as unproven.

**Still not here: taking the wheel.** Watching is the whole feature. That
leaves one gap worth naming — when a login card cannot confirm which page it is
on, it tells you to take the screen, and on a phone there is still nothing to
take.


## Not here yet

- **Push notifications.** `expo-notifications` is only the client half and
  Hermes has no server-side push path, so the app is pull-only. Worth knowing,
  because "approve from your phone" is weaker when nothing taps you on the
  shoulder.
- Markdown tables, headings, links and blockquotes as anything but literal text.
- Creating or deleting Spaces (dashboard only, deliberately).
- **Taking the wheel.** The screen above is read-only, enforced on the server.
- **Gated OAuth dashboards.** This app pairs with a loopback/`--insecure`
  dashboard and authenticates with its session token. A gated install
  authenticates by cookie, which a phone has no way to obtain here, so the
  ticket path exists in the code and is not reachable from this app yet.
- On-demand screen capture. The thread's `screenshot` chip shows images a
  teammate posted as evidence, over the authenticated
  `/screenshots/{bot_id}/{filename}` route; there is no "take one now".
