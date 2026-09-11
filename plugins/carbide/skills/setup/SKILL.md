---
name: setup
description: Prepare a machine for Carbide development and connect it to MachineMetrics. Use when someone is setting up for the first time, when a prerequisite is missing or the wrong version, when mmdev or Docker or Node is not installed, when authentication or environment selection fails, when no MachineMetrics tools are available in the session, or when a build fails for reasons that look environmental rather than about the code.
---

# Prepare the machine

This is machine scoped, not project scoped. It runs once per machine, and again when something
breaks underneath. Do not re-run it for every deployment.

Work in order: each step assumes the one above it succeeded, and the common failures are all
near the top.

Never report a step as done without checking its output. A missing prerequisite discovered at
step 7 costs more than one discovered at step 1.

## Talking to the customer

You are a MachineMetrics assistant helping someone build a deployment. Assume they know
their shop floor and their business, not React, OAuth, or the command line.

- **Say what it means for what they are building first, then the detail.** One plain
  sentence of consequence, then the technical part. Never the other way round.
- **Name the phase you are in.** The skills are the phases: prepare the machine, decide
  what to build, build it, put it live. Saying "that settles the spec, so we can start
  building" tells the customer where they are and what comes next. What stays out of the
  conversation is the machinery inside a phase: gates, rules, routing, section numbers.
  Give the reason for a step, never a citation.
- **Technical detail is welcome when it helps or they ask for it.** Explain a term the
  first time it earns its place, in half a sentence. Skip the ones that change nothing for
  them.
- **Narrate less, report more.** Group the work, then say what came of it.

Friendly does not mean vague. Keep every number, check, and caveat exactly as precise as it
is now: that precision is what catches errors before they reach the shop floor.

## 1. Establish the platform, and where Claude Code will run

Most customers are on Windows. Some are on macOS or Linux. Everything below branches on this,
so settle it before anything else, and do not assume.

### Windows

**On Windows, everything happens inside WSL 2.** Install WSL 2, install Claude Code inside the
distribution, and run every command from a shell in there. There is one supported Windows
arrangement and this is it.

Two other setups look reasonable and do not work. Recognise them quickly, because a customer
will arrive in one of them:

- **The desktop app's WSL session.** Picking a distribution in the Code tab's environment picker
  is the obvious Windows move, and plugins and connectors are both unavailable in those
  sessions, so this plugin cannot load at all. Move them to a shell inside the distribution.
- **Claude Code natively on Windows.** Plugins work there, but `mmdev` does not exist: the
  installer publishes macOS arm64, macOS x64 and Linux x64 only. Developing natively on Windows
  is out of scope, so do not offer it and do not try to work around it.

```powershell
wsl --install
```

Run that in an administrator PowerShell, reboot, and create the Linux user it asks for. Ubuntu
is the default distribution and is fine. WSL 1 is not supported.

Then, inside the distribution:

- **Keep the project in the Linux filesystem**, for example `/home/you/project`. A project under
  `/mnt/c/...` goes through a network filesystem: it is slow and it breaks file watching, which
  presents as a broken dev server rather than a filesystem choice.
- **Docker Desktop** must be installed on Windows with the WSL 2 backend, and integration
  enabled for the distribution, or `docker` will not exist inside it.
- **Set git line endings** so Linux tooling sees LF: `git config --global core.autocrlf false`.
- **Editor**: VS Code with the WSL extension connects to the distribution, so files open in the
  same place the toolchain runs.

If the device is managed by their IT, WSL sessions may be blocked by policy. That is an
administrator question rather than something to work around.

**The plugin does not come with them.** This is the step that gets missed, and it is invisible
until it blocks everything: Claude Code inside the distribution has its own `~/.claude`, so
the marketplace and the plugin are not there. A customer who installed the plugin on Windows,
read this page, and moved into WSL now has a session where `/carbide:start` does not exist.
Say so before they make the move, not after. Re-add the marketplace and install the plugin
inside the distribution, then come back to this skill in that session.

Two things make that harder on a box created minutes ago, and both look like plugin failures:

- **A GitHub source needs credentials the new user does not have yet.** A fresh distribution
  has no `known_hosts` and no git credentials, so a marketplace backed by a private GitHub
  repository fails on the host key before it ever reaches authentication. Accept the host key
  and set up access first, or add a directory-backed marketplace pointing at a copy already on
  disk.
- **Node has to be installed, and the obvious way is the wrong one.** A new distribution has
  no Node at all, and a native Windows install does not carry over. Use `nvm`: `apt` needs
  `sudo`, which cannot work from inside a Claude Code session (see "Install mmdev"), and it
  ships a Node too old for this toolchain anyway.

### macOS

Apple silicon and Intel are both supported directly. Nothing platform specific beyond the
prerequisites below.

### Linux

x64 is supported directly. On arm64 there is no published `mmdev` binary, so check before
promising it.

## 2. Check the base prerequisites

| Tool | Why | Check |
| :--- | :--- | :--- |
| `git` | Templates and projects are git repositories | `git --version` |
| Node and npm | Building and running the deployment | `node --version` |
| Docker | Only if they will build the container the template ships, or run a container locally | `docker --version` |

Node: the project template pins **Node 24** in its Dockerfile and declares no `engines`, so
Node 24 is the reference version. An older major will usually install and then fail somewhere
less obvious, so check it rather than assuming.

Docker is genuinely optional for writing code, because `npm start` runs the app directly. It is
required to produce the deployable artifact, so if they intend to ship during this session,
treat it as required now rather than later. On Windows, `docker` only exists inside the
distribution once Docker Desktop's WSL integration is enabled for it, so a missing `docker` there
is usually a toggle rather than an install.

## 3. Install mmdev

```bash
/bin/bash -c "$(curl -fsSL https://machinemetrics-public.s3.us-west-2.amazonaws.com/MMDevCli/install_cli.sh)" && exec $SHELL -l
```

**Offer the inspect-first form, and expect some customers to require it.** Piping a remote
script straight into a shell is disallowed outright in some managed environments, and a
customer who asks what it does is asking a reasonable question:

```bash
curl -fsSL https://machinemetrics-public.s3.us-west-2.amazonaws.com/MMDevCli/install_cli.sh -o /tmp/install_cli.sh
less /tmp/install_cli.sh          # read it, then
/bin/bash /tmp/install_cli.sh && exec $SHELL -l
```

Do not treat a request to read the script first as an obstacle. It is the same install.

The `exec $SHELL -l` matters: the installer puts `mmdev` in `~/.mmdev` and edits `PATH`, and
without reloading the shell the next command will not find it.

**Version matters more than it looks.** Releases before 0.53.3 stop on an interactive update
prompt on every invocation, including `--version`, which no agent can answer. If `mmdev` appears
to hang and produces nothing, that is what happened. Get past it with
`MMDEV_NO_UPDATE=1 mmdev --version`, then upgrade in place with `mmdev update`. **`mmdev` is
not distributed through npm or Homebrew**, so `npm i -g` and `brew install` are both dead
ends. From 0.53.3 the check is skipped automatically when output is not a terminal, so
agent-driven sessions are never prompted.

The installer is served from commercial infrastructure. If a customer on GovCloud cannot reach
it, installing the CLI is a different procedure rather than a different URL, and that is worth
escalating rather than working around.

**Prefer an install path that does not need `sudo`, here and everywhere else on this page.**
`sudo` cannot authenticate from inside a Claude Code session: there is no terminal to prompt
on, so it fails immediately with `sudo: A terminal is required to authenticate`. It does not
hang and it does not wait, which matters because the failure arrives disguised. Piping into
`sudo`, as in `curl ... | sudo sh`, surfaces as `curl: (23)`, which reads as a network problem
and is not. The `mmdev` installer needs no root, which is why the command above has none.

When something genuinely does need a system package, the way round it depends on the platform.

**Linux and WSL**, where the package manager wants root. Unpack rather than install:

```bash
apt-get download <package>        # no root
dpkg -x <package>.deb ./extracted/
LD_LIBRARY_PATH=./extracted/usr/lib/x86_64-linux-gnu <command>
```

That is Debian and Ubuntu tooling, which is what WSL gives you by default. On another
distribution the equivalent is its own download-and-extract pair.

**macOS**, where the problem mostly does not arise: Homebrew installs into a prefix the user
already owns, so `brew install <package>` needs no root. If a formula does ask for it, that is
the signal to hand the command to the customer rather than to work around it.

If a step truly requires root, hand the customer the command to run themselves in their own
terminal rather than attempting it from the session.

## 4. Authenticate

```bash
mmdev login
```

**`mmdev oauth dev-init` comes after the environment is settled, in step 5, not here.** It
writes a client for whichever environment is active, so running it first initialises the
client for whatever was left over from last time, and switching afterwards leaves a client the
customer's environment cannot use plus a second one on the tenant that nothing can delete.
Authenticate now, choose the environment, then initialise.

## 5. Confirm the customer's environment, and what has to agree with it

```bash
mmdev environment list
mmdev environment switch
```

Confirm which environment is active and say it out loud. A session pointed at the wrong
environment produces data that looks plausible and is not theirs.

**Switch to the customer's environment here rather than inheriting whatever was last active.**
That is `production` for a Commercial customer and `govcloud` for a GovCloud one, and there is
nothing to decide: those are the only environments a customer has. `staging` and `sandbox`
exist inside MachineMetrics and a customer cannot reach them.

**Do not ask which environment to target.** This plugin builds applications for customers, so
the answer is always theirs. Asking invites a choice that does not exist and offers an
environment the person cannot deploy to.

This matters most at `deploy`, and it is not a preference. The hosting-and-authentication path
(a public origin, a registered OAuth redirect, the platform API) exists only on the
customer's environment. A deployment built against `staging` gets as far as being hosted and
publicly reachable and then cannot reach the API at all. A dry run shipped exactly that and
found out only after the site was live.

Two consequences worth saying out loud before switching:

- **Mutations on the customer's environment are not reversible from the CLI.** `mmdev oauth`
  has `add`, `list` and `update` but **no delete**, so every client created there stays there.
  Name a deployment's client after the deployment and reuse it rather than minting a new one
  per attempt. A registered OperatorView tab is likewise visible to operators on tablets as
  soon as it is saved.
- **An agent will hit approval prompts.** Creating a client, or reading the API, on the
  customer's environment is a real production action, and a sandboxed agent is expected to be
  stopped and asked. Treat a denial as a request for confirmation rather than a failure, and
  do not look for a way around it.

**The invariant.** Once a project exists, four things must name the customer's environment.
Not merely agree with each other: **agree on the customer's.** Four legs consistently naming
`staging` is a configuration that passes every internal check and cannot reach the customer's
data, which is how a dry run got a deployment live before noticing.

| | Where |
| :--- | :--- |
| The active `mmdev` environment | `mmdev environment list` |
| The OAuth client's environment | Whichever client `public/default.json` names. See the repair table below |
| The deployment's config | `public/default.json`: `releaseStage`, and `urls` only if something set it |
| **The gateway's environment** | Not printed anywhere. Establish it by asking, see `setup` |

Environment **names** map to API and login URLs, and the mapping is not guessable from the
name. The customer-facing pair is in partitions.md, alongside the note that a deployment sets
a `releaseStage` rather than pasting an `apiUrl`.

**The fourth leg is the one that wastes days.** `mmdev environment list` says what the CLI
targets. Nothing says what the MCP gateway targets, and the two are silently assumed to
agree. A dry run lost several rounds to a suspected staging and production mismatch that did
not exist.

Establish it once, at setup, and say the answer out loud so it is in the transcript: query
the gateway for something whose value you can recognise, for example list machines and check
whether the names and ids are the staging tenant or the production one. Then state which
environment the gateway is on alongside which one `mmdev` is on.

Be careful with the obvious shortcut: in some tenants machine and shift ids are **identical**
across staging and production, so matching ids prove nothing. Check something that differs.

A fresh scaffold does not guarantee they agree. If they disagree, decide which is right and
make the other two match. Noting the mismatch and moving on is not enough: it resurfaces later
as an authentication failure that looks like anything except configuration.

**Now** initialise the local OAuth client, with the customer's environment active:

```bash
mmdev environment list          # confirm the active one first
mmdev oauth dev-init            # writes a LOCAL TEST client for THAT environment
```

The order matters and is the reason this is not in step 4. `dev-init` writes a client for
whichever environment is active, so running it before the switch creates one for the wrong
environment, and `mmdev oauth` has no delete, so the stray client stays on the tenant.

**`dev-init` is per environment, not per project.** `~/.mmrc` is a directory, and the client
is written to `~/.mmrc/environments/<environment>/default.json` as well as the root
`default.json` that mirrors the active one. So switching environment and running `dev-init`
again produces a **second** client, and the one a project gets depends on which environment
was active when `dev-apply` ran. If `~/.mmrc` already holds a client for that environment it prints
`local client already exists` and reuses it, so every project that developer scaffolds carries
the same `LOCAL TEST` client. That is fine for local work. A deployment customers will use
should get its own client instead, which `implement` covers.

**Do not run `mmdev oauth dev-apply` here.** It copies the client into a project's
`public/default.json`, and at setup time there is no project: this skill runs before `start`,
`spec`, and any scaffold. `implement` runs it directly after `mmdev create`, which is the
first moment there is somewhere for it to write.

## 6. Connect the MachineMetrics gateway

The plugin ships no gateway. The customer installs it and chooses their partition. That is
deliberate: a bundled server would take precedence over a connector they configured, so a
customer on GovCloud would be silently pointed at Commercial.

### Is it already connected, and to which partition?

Do not infer the partition from tool names. The same gateway surfaces under different names
depending on how it was installed, and none of them carry the partition. Read the URL:

```bash
claude mcp list
```

Each row prints `name: url - status`. Find the MachineMetrics entry and match its host against
[partitions.md](partitions.md): `agent.machinemetrics.com` is Commercial and
`agent.machinemetrics-us-gov.com` is GovCloud. On Codex use `codex mcp list`; on Cursor read
`~/.cursor/mcp.json`.

If entries for **both** partitions are present, stop and say so. Queries may go to either one.
They should keep one and remove the other.

**Connected is not the same as usable, and there are four states, not two.** Work out which
one you are in before doing anything, because the remedies are different and three of them
look alike:

| State | How you can tell | Remedy |
| :--- | :--- | :--- |
| **Absent** | No MachineMetrics row in `claude mcp list`, and no MachineMetrics tools in the session | Install it: connector, or the fallback below |
| **Present, not authorized** | The row prints `Needs authentication`, or tools exist and every call fails | Authenticate. **This is the one that gets misread as a broken plugin** |
| **Present and authorized** | A real tool call returns real content, and the tool count matches what the connectors page shows | Proceed |
| **Present, authorized, incomplete** | Calls succeed, but the nine Carbide Data tools are absent and the count is short | The grant is narrow, not broken. `carbide-data` diagnoses it; the fallback below is the remedy |

The middle state is the expensive one. A gateway can report connected and refuse every call,
because the plugin-level connection and the server's OAuth token are different things and only
the first is visible. It has cost a live demo: every tool present, every call failing.

**Prove the token with a real call.** Any cheap gateway tool, for example a `knowledgeBase`
query with any string. A successful response proves it. Say you are probing, so the call does
not read as a random detour.

A user who has just re-authenticated may still be talking to a session holding a stale token,
and nothing in the server list reveals that. Their word is not evidence; the response is.

### Ask which partition

Do not guess and do not default:

> Are you on MachineMetrics Commercial, or GovCloud?

GovCloud customers reach the platform at a `machinemetrics-us-gov.com` address and generally
know it, because it is why they are on GovCloud. Everyone else is Commercial.

### Give them the step for their host

**Claude Code, Claude Desktop, or claude.ai.** A connector is the recommended path: it
authenticates once and works across the terminal, the desktop Code tab, and the web app. Hand
them the prefilled link for their partition from [partitions.md](partitions.md). It fills in the
form only; they still review and approve it.

On Team or Enterprise, an Owner can add the connector once for everyone, and
organisation-managed authentication means individual developers never handle it. For a GovCloud
organisation that is also the enforcement point: the Owner adds only the GovCloud connector.

**Fallback, when a connector is not available or is not carrying the right scope.** Three
situations reach this, and the third is the one that gets missed: some organisations block
custom connectors; a developer working only in the terminal may not want one; or a connector
is present and authorized but its grant is too narrow, so part of the tool set never appears.
That last one cannot be fixed from the CLI while the connector owns the flow, which is why
registering directly is the remedy rather than a workaround. Then register the server
directly:

**Choose the scope before running it**, because the flag is the whole decision and the two
cases point opposite ways:

```bash
# No connector available at all, and every project on this machine needs the gateway:
claude mcp add --transport http --scope user  machinemetrics <gateway URL for their partition>

# Working around a connector that exists but carries the wrong scope or partition:
claude mcp add --transport http --scope local machinemetrics <gateway URL for their partition>
```

Do not paste the first form by reflex. `user` shadows a managed connector for every project
on the machine and outlives the problem it was meant to fix, which for a customer who later
moves partition means unrelated projects silently talking to the wrong one.

Three things to say when you offer this, because none of them are obvious:

- **It takes precedence over a connector, permanently.** Scope order is local, project, user,
  plugin-provided, then connector, so this entry wins over any connector the customer
  configures later. That is the same shadowing that made bundling a gateway wrong in the first
  place. Prefer the connector when they can have one, and if they later move partitions or
  their organisation rolls out a managed connector, this has to be removed:
  `claude mcp remove machinemetrics --scope user`.
- **Pick the scope by purpose, not by habit.** `user` covers every project on the machine,
  which is what a developer who has no connector at all usually wants. `local` is this project
  only, and is the default if you omit the flag. It is the right choice when you are working
  around a connector that exists but carries the wrong scope, because the override then
  expires with the project instead of outliving the problem it was meant to solve. `project`
  writes a file that gets committed and shared, which will point a colleague on the other
  partition at the wrong gateway.
- **Adding it does not authenticate it.** The command succeeds and the server lists as
  `Needs authentication`. Authorizing needs the interactive `/mcp` flow in a session, which
  opens a browser. There is no scriptable path.

**Then restart the session.** Tools are bound when a session starts, so a server added mid
session is not usable in that session, even once authenticated. Do not add a server and then
act as though you have its tools: say that the session has to be restarted, and that `start`
is where to come back in.

**Codex, experimental.** Claude Code is the officially supported host; Codex works for
reaching the gateway and is not covered by the same guarantees. Say so rather than presenting
it as equivalent. It requires a CLI with MCP support, so check `codex mcp --help` first,
because everything under that command is experimental and older releases lack it.

```bash
codex mcp add machinemetrics --url <gateway URL for their partition>
codex mcp login machinemetrics
```

`codex mcp login` needs `experimental_use_rmcp_client = true` in `~/.codex/config.toml`. Say so
rather than letting them discover it.

**Cursor, experimental.** Same caveat as Codex. Add the server to `~/.cursor/mcp.json`:

```json
{ "mcpServers": { "machinemetrics": { "type": "http", "url": "<gateway URL>" } } }
```

Cursor's one-click install links have been unreliable, so prefer the config file.

## 7. Check the local environment can host what it needs to

**Ports.** The playground takes the first free port from 4000 upward, and the template's
compose file binds 3000. The check below covers 4000-4999; the four-digit bound is what keeps
it from matching an unrelated ephemeral port such as `:40911`. If something already holds them, the failure is a confusing bind error
rather than a clear message.

**DNS.** `mmdev playground` serves on `development.machinemetrics.com`, which is a public record
pointing at `127.0.0.1`. That is what gives a local session a real origin, so OAuth redirects
and iframe embedding behave the way they will in production.

```bash
dig +short development.machinemetrics.com
```

It must return `127.0.0.1`. A VPN or corporate resolver that intercepts DNS will return nothing
while public resolvers still answer, which is worth checking explicitly:

```bash
dig +short @8.8.8.8 development.machinemetrics.com
```

If the public resolver answers and the system one does not, their resolver is the problem. Do not
skip this: the playground will appear to start and then be unreachable, which reads as a broken
tool.

The usual cause is **DNS rebinding protection**: resolvers drop answers pointing at loopback,
because that is the shape of a rebinding attack. It is not specific to MachineMetrics, and
`localtest.me` fails the same way through a resolver that does it. Corporate resolvers and
VPN split-DNS do it most.

**`dig` ignores `/etc/hosts`.** Once the hosts entry below is in place the name resolves for
every real client while `dig` still reports nothing, so do not read that as an unfixed
problem. The section 8 gate uses the system resolution path instead, which is the one that
reflects what the app will do.

The fix is either a resolver that answers, or a hosts entry mapping
`development.machinemetrics.com` to `127.0.0.1`. Where that entry goes depends on the platform:

- **macOS and Linux:** `/etc/hosts`.
- **Windows with WSL:** add it to the Windows file at
  `C:\Windows\System32\drivers\etc\hosts`, because WSL generates its own `/etc/hosts` from
  Windows on start. Editing the file inside the distribution works until the next restart and
  then silently reverts, unless they set `generateHosts = false` in `/etc/wsl.conf`. Prefer the
  Windows file: it survives, and it fixes the browser too.

## 8. Confirm the whole thing before moving on

Run each command and compare against the expected output. **Do not report this section as
done by listing what you believe is true:** run the commands, paste what came back, and name
any row you could not run.

| Check | Command | Expected |
| :--- | :--- | :--- |
| Not running natively on Windows | `uname -s` | `Darwin` on macOS, `Linux` on Linux or inside WSL. Anything else means native Windows, which is unsupported |
| **Windows only.** That this is WSL 2 | `wsl.exe -l -v` from Windows, or `cat /proc/version` | Version `2`, and `microsoft` in the kernel string |
| **Windows only.** Project on the Linux filesystem | `pwd` | Starts with `/home/`, never `/mnt/c` |
| git | `git --version` | Any version prints |
| Node | `node --version` | `v24.` or newer |
| Docker, if the work needs it | `docker run --rm hello-world` | `Hello from Docker!` |
| **Windows only.** Docker WSL integration | `docker context ls` | A context resolves, no `cannot connect` |
| mmdev present and current | `MMDEV_NO_UPDATE=1 mmdev --version` | `0.53.3` or newer. Without the variable a pre-0.53.3 CLI hangs here |
| Logged in | `mmdev environment list` | Lists environments and marks one active, no auth error |
| Local OAuth client for the **active** environment | `node -p "!!require(process.env.HOME + '/.mmrc/default.json').clientId"` | `true`. The root file mirrors the active environment, so a client under some other environment does not count. Node is used rather than Python, which this contract does not require |
| Gateway answers | Call a `knowledgeBase` tool with any string | A real response, not an error |
| Ports free | see the command below the table | No output |
| DNS | Linux and WSL: `getent hosts development.machinemetrics.com`. macOS: `dscacheutil -q host -a name development.machinemetrics.com` | `127.0.0.1` |

The ports check does not fit a table cell, because escaping a pipe for Markdown changes the
command. Run it as written here:

```bash
lsof -iTCP -sTCP:LISTEN -P | grep -E ':(3000|4[0-9]{3})( |$)'
```

Two rows deserve extra suspicion because both fail while looking fine:

- **`mmdev --version` hanging with no output** is the pre-0.53.3 update prompt, not a slow
  machine. `MMDEV_NO_UPDATE=1` gets past it, `mmdev update` fixes it, and nothing downstream
  works until it is fixed.
- **A gateway that reports connected can still refuse every call.** Only the tool response
  proves the token. Run the call.
- **A `knowledgeBase` call can fail on output validation rather than on auth.** Some documents
  carry a null title, and the client rejects the whole response with
  `value.N.title: Expected string, received null`. The gateway answered and the token is fine.
  Query something else and move on; do not read it as a broken connection and restart setup.

Then hand off to `start`. It works out whether this is a new deployment or an existing one
and names the next step.

## When something fails later that looks environmental

Work back up this list rather than debugging the code. In rough order of likelihood: the update
prompt on an old `mmdev`, a skipped `oauth dev-init`, the wrong environment, no gateway, DNS
interception, and a port already held.
