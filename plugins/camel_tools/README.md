# camel-tools

Bridges **owl's capability set** into Hermes. owl's toolkits actually live in
the `camel-ai` package (`camel.toolkits.*`) that owl depends on, so this plugin
wraps those toolkits as Hermes tools — reusing the toolkit *implementations*
verbatim and only re-expressing the thin schema/handler envelope.

Tools land in per-domain **non-core** toolsets (`camel_search`, `camel_academic`,
`camel_data`, `camel_math`, `camel_vision`, `camel_video`, `camel_audio`,
`camel_browser`, `camel_weather`, `camel_dev`, `camel_productivity`, `camel_maps`,
`camel_social`). Because they are non-core, Hermes' **Tool Search bridge**
(`tools/tool_search.py`) auto-defers them: the model discovers them on demand via
`tool_search` / `tool_describe` / `tool_call` instead of paying their full JSON
schema on every API call.

## Install / enable

`camel-ai` is a heavy optional dependency, installed on demand:

```
/camel-tools status        # is camel-ai installed?
/camel-tools install       # installs camel-ai[owl]==0.2.84, then restart Hermes
```

(Or `pip install 'camel-ai[owl]==0.2.84'` / `uv sync --extra camel`.) The
`camel.tools` lazy-deps feature and the `camel` pyproject extra track the pin.
When `camel-ai` is absent the plugin degrades gracefully — no tools register.

## Configuration

Model-agnostic toolkits (search, academic, Excel, math, weather-with-key) work
out of the box. Multimodal + browser toolkits route their model calls back to
your **active Hermes model** via `agent.auxiliary_client.call_llm` (no extra
keys). Credentialed toolkits gate on env vars (names track CAMEL 0.2.84):

| Toolkit          | Env vars |
|------------------|----------|
| SearchToolkit (google) | `GOOGLE_API_KEY`, `SEARCH_ENGINE_ID` |
| SearchToolkit (bocha)  | `BOCHA_API_KEY` |
| WeatherToolkit         | `OPENWEATHERMAP_API_KEY` |
| GithubToolkit          | `GITHUB_ACCESS_TOKEN` |
| NotionToolkit          | `NOTION_TOKEN` |
| GoogleMapsToolkit      | `GOOGLE_MAPS_API_KEY` |
| RedditToolkit          | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` |

Browser automation uses Playwright (env's pre-installed Chromium).

## Workspace + .skill install

- `/camel-tools workspace [session]` — provisions the DeerFlow-style
  `/mnt/user-data/{uploads,workspace,outputs}` contract for file-writing tools.
- `/camel-tools install-skill <path.skill> [--overwrite]` — installs an
  agentskills.io/Claude `.skill` ZIP with hardened extraction (traversal /
  symlink / executable-magic / zip-bomb defences).

## Deliberately omitted

- CAMEL `CodeExecutionToolkit` — Hermes has native sandboxed code execution.
- CAMEL `DalleToolkit` — Hermes has native `image_gen`.
- owl `DocumentProcessingToolkit` — heavy dependency tail; document→text is
  routed through the `/mnt/user-data` upload path instead.

> Placement note: this is a **bundled backend** of the Hermes product fork whose
> purpose is integrating owl/deer-flow. Like other bundled backends (spotify,
> web/exa) it adds a `LAZY_DEPS` entry + pyproject extra; it never special-cases
> itself in core files.
