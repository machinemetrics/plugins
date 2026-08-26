# Repository conventions

This repository publishes MachineMetrics plugins to Claude Code, Cursor, and Codex from
one source tree.

## Before finishing any change

```bash
claude plugin validate .
claude plugin validate ./plugins/<name>
```

Both must pass. Anthropic's plugin review pipeline runs the same check on every
submission, so a failure here is a failure there.

## Rules

Nothing enforces these automatically. Check them by hand, and read them before adding
or changing a plugin.

- Every plugin under `plugins/<name>/` carries three manifests:
  `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, and
  `.codex-plugin/plugin.json`. The `name`, `version`, and `description` must match
  across all three, and `name` must equal the directory name.
- Components such as `skills/`, `agents/`, `commands/`, and `hooks/` live at the plugin
  root. Only `plugin.json` goes inside a vendor manifest directory.
- Register every plugin in all three catalogs. The source conventions differ:
  Claude uses `./plugins/<name>`, Cursor uses `./<name>` relative to
  `metadata.pluginRoot`, and Codex uses `{ "source": "local", "path": "./plugins/<name>" }`.
- Codex entries need `policy.installation` set to `AVAILABLE`, `policy.authentication`
  set to `ON_USE` for a plugin with no authenticated MCP server or `ON_INSTALL` for one
  with it, and a `category`.
- Every skill needs YAML frontmatter with a `description`. Hosts use it to decide when
  to load the skill.
- Bump `version` in all three manifests together.

## Writing style for anything user facing

Do not use em dashes. Use colons and periods.
