# Carbide plugin

Skills for building and operating custom applications on MachineMetrics.

The plugin guides one loop end to end: specify the application conversationally, build it
with Carbide components, give it storage in Carbide Data when it needs its own, then deploy
it on your own infrastructure and register it so your team runs it inside MachineMetrics
against live production data.

You own your code and your hosting. MachineMetrics governs identity, data access, and what
appears inside the platform.

## What is in it

| Skill | Covers |
| :--- | :--- |
| `/carbide:start` | Begin here, and come back here for every later change. Works out where your project is and takes you to the next step |
| `setup` | Preparing your machine, once: prerequisites, WSL on Windows, connecting to MachineMetrics |
| `spec` | Deciding what to build, and the things it is about, before any code |
| `implement` | Scaffolding, building the interface, and making it run for real |
| `storage-fit` | Whether the application needs its own storage, and whether your model fits |
| `carbide-data` | Designing, publishing and querying the storage once it does |
| `deploy` | Hosting, registration, and embedding in the platform |

Every skill loads itself when it applies to what you are doing. `/carbide:start` is there
when you want to start, or restart, deliberately.

## Requirements

- Claude Code
- A MachineMetrics account, authenticated through `mmdev login`
- Hosting for your deployment that is publicly reachable, persistent, and sanctioned by
  your IT organisation

## Install

Add the MachineMetrics marketplace, then install this plugin. The steps differ by host, and
the [marketplace README](https://github.com/machinemetrics/plugins) has them for Claude Code,
Claude Desktop, Codex and Cursor, along with how to update and manage what you have
installed.

## What it costs to keep installed

Around 750 tokens are added to every session so the agent knows these skills exist. A skill
that fires reads its own contents, which ranges from roughly 2,700 tokens for `start` to
7,100 for `implement`. Nothing is read until a skill applies.

Check the current figures yourself:

```
claude plugin details carbide@machinemetrics
```

## Support

Email [support@machinemetrics.com](mailto:support@machinemetrics.com). Neither this plugin nor
the marketplace takes issues.

## License

MIT. See [LICENSE](LICENSE).
