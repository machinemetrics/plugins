# MachineMetrics plugins

Plugins that let AI coding agents work with MachineMetrics. Install once, then the
plugin's skills are available to your agent whenever they apply.

Supported hosts: Claude Code, Claude Desktop, Codex, and Cursor.

## Available plugins

| Plugin | What it does |
| :--- | :--- |
| `carbide` | Build an application for your shop on MachineMetrics: specify it conversationally, build the interface with Carbide components, store data when it needs storage, then deploy it on your own infrastructure and register it with the platform. |

## Install

### Claude Code

```
/plugin marketplace add machinemetrics/plugins
/plugin install carbide@machinemetrics
```

You are asked where to install it:

- **User**: available to you in every project. Choose this unless you have a reason not to.
- **Project**: available to everyone working in this repository.
- **Local**: available to you in this repository only.

### Claude Desktop

Open the **Code** tab, click the **+** button next to the prompt box, then choose
**Plugins**, then **Add plugin**.

The plugin browser lists plugins from marketplaces you have already added, so add this
marketplace once. Either run the marketplace command above in the integrated terminal
(**Ctrl** and backtick), or add it to your project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "machinemetrics": {
      "source": { "source": "github", "repo": "machinemetrics/plugins" }
    }
  }
}
```

Once the folder is trusted, the marketplace registers automatically and our plugins
appear in the browser.

### Codex

Requires a Codex CLI with plugin support. Check with `codex plugin --help` first, since
older releases have no `plugin` subcommand.

```
codex plugin marketplace add machinemetrics/plugins
```

### Cursor

Add this repository as a marketplace, then install the plugin from the marketplace list.

## Using a plugin

Most of our skills load when your agent decides they apply to what you asked, so you
describe your task and the agent uses the plugin on its own.

Some skills are invoked deliberately instead. Skills are prefixed with the plugin name, so
`carbide` provides one you run yourself:

```
/carbide:start
```

Run that when you want to begin, or come back to, building an application. It works out where
your project already is and takes you to the next step.

To see what a plugin adds before or after installing, including its skills and its
context cost, open the plugin's detail view in `/plugin`, or run:

```
claude plugin details carbide@machinemetrics
```

## Updating

Claude Code refreshes marketplaces in the background and tells you when a new version is
ready. To update now:

```
/plugin marketplace update machinemetrics
```

If a plugin was updated during your session, run `/reload-plugins` to pick it up without
restarting.

## Managing installed plugins

Run `/plugin` and open the **Installed** tab to enable, disable, or remove a plugin. In
Claude Desktop, use **Manage plugins** in the same **+** menu you installed from.

```
/plugin list
/plugin disable carbide@machinemetrics
/plugin uninstall carbide@machinemetrics
```

## Troubleshooting

**`Marketplace "machinemetrics" not found`.** Add the marketplace first with
`/plugin marketplace add machinemetrics/plugins`.

**The plugin installed but its skills are missing.** Run `/reload-plugins`. If the reload
warns that it will re-read the conversation, run `/reload-plugins --force`.

**The plugin is not in the Claude Desktop browser.** The browser only lists marketplaces
already added. Follow the Claude Desktop steps above to add ours.

**Something else.** Open the **Errors** tab in `/plugin`, then contact us with what it
reports.

## Support

Email [support@machinemetrics.com](mailto:support@machinemetrics.com).

This repository does not take issues or pull requests. Support goes through the same channel
as the rest of the product, so it reaches the people who can act on it and is tracked
alongside everything else about your account.

## License

MIT. See [LICENSE](LICENSE).
