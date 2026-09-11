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

## plugins/carbide is a generated directory

`plugins/carbide/` is generated, not authored here. It is produced from a tagged release of
the plugin and copied in whole.

Never hand-edit anything under it. The next release replaces the directory wholesale and the
edit is lost without warning. Changes belong upstream, in the plugin itself, and arrive here
with the next release.

A release arrives as a pull request, and that diff is the customer-visible change. Read it as
one: skill prose is what an agent will act on in somebody else's shop.

## Checks

One workflow, `.github/workflows/validate.yml`, runs on every pull request and on `main`:

- `claude plugin validate` on the marketplace and on each plugin directory.
- `.github/scripts/check-catalogs.mjs`, which checks the three catalogs against the tree:
  every plugin directory is listed in all three, every listed plugin exists, and each entry
  agrees on version with the manifest it points at.

That second check exists because the CLI reads only the Claude catalog. A release writes four
places at once, and a catalog silently missing an entry, or pinned to a version the manifest
has moved past, is the way that goes wrong. Run it locally with `node
.github/scripts/check-catalogs.mjs`.

Keep this proportionate. One plugin and three catalogs do not need more than this.

## Where reports go

Issues and pull requests stay disabled. Customers reach us at support@machinemetrics.com,
which is where product support already lives, so a report lands with people who can act on it
rather than in a queue nobody owns. The README says so, and SECURITY.md says it again for
vulnerabilities.

## Rules

Nothing enforces these automatically. Check them by hand, and read them before adding
or changing a plugin.

- Plugins authored here carry three manifests under `plugins/<name>/`:
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
