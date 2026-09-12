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

A release is pushed straight to `main`. This repository is public, so a pull request here
would publish the review discussion along with the artifact, and it would review a generated
directory rather than an authored change. The release is reviewed upstream, before the tag
exists.

What is not skipped is the diff. Whoever releases reads it before committing, because that
diff is the customer-visible change: skill prose is what an agent will act on in somebody
else's shop.

Stage first, and name the exact paths. A plain `git diff` shows nothing of an untracked
`plugins/carbide`, which is every first release and any release that adds a file, and staging
a whole catalog directory would sweep an unrelated file into the release:

```bash
git add plugins/carbide \
  .claude-plugin/marketplace.json .cursor-plugin/marketplace.json .agents/plugins/marketplace.json
git diff --staged -- plugins/carbide \
  .claude-plugin/marketplace.json .cursor-plugin/marketplace.json .agents/plugins/marketplace.json
git commit -m "Publish carbide <x.y.z>" -- plugins/carbide \
  .claude-plugin/marketplace.json .cursor-plugin/marketplace.json .agents/plugins/marketplace.json
git push origin HEAD:main
```

The release script prints that list, so paste it rather than typing it. It also refuses to run
unless this checkout has an origin, is on `main`, and holds nothing `origin/main` does not: an
unpushed commit here would be published by the release push, and the staged diff cannot show it
because it is already committed.

Commit messages here are as public as the README. Say what the release does, nothing about how
it was made.

## Checks

One workflow, `.github/workflows/validate.yml`, runs on every push to `main`:

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
