# tool-permissions

A per-tool **approval / permission-mode** gate, ported from OpenHarness (HKUDS)
`permissions/`. Hermes has no native per-tool permission layer; this adds one
via the `pre_tool_call` hook, and directly hardens every tool — including the
`camel-tools` (bash/file/browser/etc.) we added.

## Enable (opt-in, non-disruptive)

With no config the plugin does **nothing** (mode `off`), so existing behavior
is unchanged. Turn it on in `config.yaml` (or `HERMES_PERMISSION_MODE`):

```yaml
permissions:
  mode: full_auto        # off | default | plan | full_auto
  denied_tools: []       # tool names to always block
  allowed_tools: []      # tool names to always allow
  denied_commands:       # fnmatch patterns for the `command` arg
    - "rm -rf /*"
  path_rules:            # glob deny rules on file paths
    - { pattern: "*/secrets/*", allow: false }
  read_only_tools: []    # extra tools to treat as read-only
```

## Modes

| Mode | Behavior |
|---|---|
| `off` | No hook registered. Zero enforcement (default). |
| `full_auto` | Allow everything **except** the credential firewall + deny-lists. |
| `default` | Mutating tools → `approve` (escalates to Hermes' human-approval gate); read-only allowed. |
| `plan` | Mutating tools blocked outright; read-only allowed. |

## Always-on credential firewall

In **every enforcing mode** (including `full_auto`), an un-overridable
`SENSITIVE_PATH_PATTERNS` deny-list blocks tool access to credential/key
material — `*/.ssh/*`, `*/.aws/credentials`, `*/.config/gcloud/*`,
`*/.kube/config`, `*/.hermes/.env`, etc. This is defense-in-depth against
prompt-injection-driven credential exfiltration. Directory-scoped tools
(grep/glob) are matched on the directory root too.

## How it maps to Hermes

`PermissionChecker.evaluate()` → the `pre_tool_call` directive contract:
deny → `{"action": "block"}`, requires-confirmation → `{"action": "approve"}`,
allow → no directive.
