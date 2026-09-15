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

## Working with the developer

They decide what gets built, and they may know their shop floor better than they know React or
OAuth. That changes what you explain, never how much you assume.

- **Consequence first, then the detail.** One plain sentence about what it means for what they
  are building, then the technical part.
- **Name the phase, not the machinery.** "That settles the spec, so we can start building"
  tells them where they are. Gates, routing and section numbers stay out. Give the reason for a
  step, never a citation.
- **Narrate less, report more.** Group the work, then say what came of it.

**They are a peer with a different access surface.** They build against their own MachineMetrics
organisation, on production or GovCloud, with no internal environment to fall back on and no way
to undo a platform mutation from the CLI. That changes which options exist.

Friendly does not mean vague. Every number, check and caveat stays exactly as precise as it is:
that precision is what catches errors before they reach the shop floor.

## 1. Establish the platform, and where Claude Code will run

Most developers building on MachineMetrics are on Windows. Some are on macOS or Linux. Everything below branches on this,
so settle it before anything else, and do not assume.

**Read [platforms.md](platforms.md) for the platform they are on.** macOS and Linux are a
paragraph each. Windows is not: WSL is the right answer there, the obvious route is the wrong
one, and getting it wrong costs a rebuild rather than a retry.

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

**Offer the inspect-first form, and expect some organisations to require it.** Piping a remote
script straight into a shell is disallowed outright in some managed environments, and a
developer who asks what it does is asking a reasonable question:

```bash
curl -fsSL https://machinemetrics-public.s3.us-west-2.amazonaws.com/MMDevCli/install_cli.sh -o /tmp/install_cli.sh
less /tmp/install_cli.sh          # read it, then
/bin/bash /tmp/install_cli.sh && exec $SHELL -l
```

Do not treat a request to read the script first as an obstacle. It is the same install.

The `exec $SHELL -l` matters: the installer puts `mmdev` in `~/.mmdev` and edits `PATH`, and
without reloading the shell the next command will not find it.

### Versions, and this is where they are settled

**Everything in these skills assumes the versions below**, and this is where they are required
and upgraded. `start` runs the same checks while detecting state, but only to route here; it
never upgrades anything and never adapts to what it finds. No other skill branches on a version
at all, because instructions that fork on what someone happens to have installed are twice as
long and wrong half the time. If a check comes back short, upgrade before going further rather
than adapting the build to an old toolchain.

| | Required | Check | Upgrade |
| :--- | :--- | :--- | :--- |
| `mmdev` | 1.0.0 | `mmdev --version` | `mmdev update` |
| `@machinemetrics/mm-react-tools` | 5.2.0 | `npm ls @machinemetrics/mm-react-tools` | `npm i @machinemetrics/mm-react-tools@^5.2.0` |
| `@machinemetrics/mm-react-components` | 1.6.1 | `npm ls @machinemetrics/mm-react-components` | `npm i @machinemetrics/mm-react-components@latest` |

The two libraries belong to a project, so check them in the project's `app/` directory. A
machine with no project yet has nothing to check.

**Check the versions again after scaffolding, rather than assuming the template supplied them.**
A template declares a range, and a range resolves to whatever the registry offers at install
time, which can be below what these skills require. `npm ls` after `mmdev create` is the only
thing that says what the project actually has.

**Use the scoped names.** `npm ls mm-react-tools` reports nothing rather than failing, which
reads as "not installed" on a project that has it.

`mmdev update` upgrades in place. **`mmdev` is not distributed through npm or Homebrew**, so
`npm i -g` and `brew install` are both dead ends. At 1.0.0 and newer the update notice is a
single line on stderr that never blocks, and it is suppressed for `--version` and for any
caller whose streams are not a terminal, so `mmdev --version` needs nothing wrapped around it.

**An existing project may be behind, and upgrading it is not just a version bump.** Moving
`mm-react-tools` from 4.x to 5.x moves config loading, provider wiring and every test double, and
drops the client secret: `MMProvider` stops taking `clientSecret`, the auth context stops
exposing `accessToken`, and `public/default.json` keeps only `releaseStage` and `clientId`. A
GovCloud deployment from before 5.1 also carries `releaseStage: "production"` plus a pinned
`urls`, which was the only correct shape then. Upgrade the library, set the stage to `govcloud`,
and delete the override. Say what the upgrade touches before starting it, and run the project's
own test suite afterwards.

The installer is served from commercial infrastructure. If a developer on GovCloud cannot reach
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
the signal to hand the command over rather than to work around it.

If a step truly requires root, hand over the command to run in their own
terminal rather than attempting it from the session.

## 4. Authenticate

```bash
mmdev login
```

**`mmdev oauth dev-init` comes after the environment is settled, in step 5, not here.** It
writes a client for whichever environment is active, so running it first initialises the
client for whatever was left over from last time, and switching afterwards leaves a client the
the environment cannot use, plus a second one on the account that nothing can delete.
Authenticate now, choose the environment, then initialise.

## 5. Confirm which environment, and what has to agree with it

```bash
mmdev environment list
mmdev environment switch <name>    # production or govcloud; the name is required
```

Confirm which environment is active and say it out loud. A session pointed at the wrong
environment produces data that looks plausible and is not theirs.

**Switch to their environment here rather than inheriting whatever was last active.**
That is `production` on Commercial and `govcloud` on GovCloud, and there is nothing to decide:
those are the only two a MachineMetrics account reaches. `staging` and `sandbox` exist inside
MachineMetrics and are not available here.

**Do not ask which environment to target.** Everything built here runs on a real account, so
the answer is always theirs. Asking invites a choice that does not exist and offers an
environment the person cannot deploy to.

This matters most at `deploy`, and it is not a preference. The hosting-and-authentication path
(a public origin, a registered OAuth redirect, the platform API) exists only on their own
environment. A deployment built against `staging` gets as far as being hosted and
publicly reachable and then cannot reach the API at all. A dry run shipped exactly that and
found out only after the site was live.

Two consequences worth saying out loud before switching:

- **Mutations on a real environment are not reversible from the CLI.** `mmdev oauth`
  has `add`, `list` and `update` but **no delete**, so every client created there stays there.
  Name a deployment's client after the deployment and reuse it rather than minting a new one
  per attempt. A registered OperatorView tab is likewise visible to operators on tablets as
  soon as it is saved.
- **An agent will hit approval prompts.** Creating a client, or reading the API, on their
  environment is a real production action, and a sandboxed agent is expected to be
  stopped and asked. Treat a denial as a request for confirmation rather than a failure, and
  do not look for a way around it.

**The invariant.** Once a project exists, four things must name the same environment, and it
must be the one the account actually uses. Not merely agree with each other: **agree on that
one.** Four legs consistently naming `staging` is a configuration that passes every internal
check and cannot reach the
data, which is how a dry run got a deployment live before noticing.

| | Where |
| :--- | :--- |
| The active `mmdev` environment | `mmdev environment list` |
| The OAuth client's environment | Whichever client `public/default.json` names. See the repair table below |
| The deployment's config | `public/default.json`: `releaseStage`, and `urls` only if something set it |
| **The gateway's environment** | Not printed anywhere. Establish it by asking, see `setup` |

Environment **names** map to API and login URLs, and the mapping is not guessable from the
name. The two real ones are in [partitions.md](partitions.md), alongside the note that a deployment sets
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

**Now** initialise the local OAuth client, with that environment active:

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
the same `LOCAL TEST` client. That is fine for local work. A deployment intended for real users
should get its own client instead, which `implement` covers.

**Do not run `mmdev oauth dev-apply` here.** It copies the client into a project's
`public/default.json`, and at setup time there is no project: this skill runs before `start`,
`spec`, and any scaffold. `implement` runs it directly after `mmdev create`, which is the
first moment there is somewhere for it to write.

## 6. Connect the MachineMetrics gateway

The gateway is how a session reaches MachineMetrics: the developer documentation, the GraphQL and
Production APIs, and the Carbide Data tools. Without it a build proceeds on assumption, which is
the one thing these skills exist to prevent.

Three states look alike and have different remedies: absent, present but unauthorized, and
present and authorized on a narrower grant than the build needs. **Read
[gateway.md](gateway.md)** to tell them apart and to give the developer the step for their host.

Say which partition it answered on, not just that it answered. [partitions.md](partitions.md) has the two
reachable ones and what each implies.

## 7. Check the local environment can host what it needs to

**Ports.** The playground takes the first free port in the range 4000-4010, and gives up with
`No available ports found between 4000 and 4010` if all eleven are taken. The template's compose
file binds 3000. The check below covers 4000-4999, deliberately wider than the playground's own
range so it also catches a stray listener just outside it; the four-digit bound is what keeps it
from matching an unrelated ephemeral port such as `:40911`. If something already holds 3000, the
failure is a confusing bind error rather than a clear message.

**DNS.** `mmdev playground` serves on `development.machinemetrics.com`, which is a public record
pointing at `127.0.0.1`. That is what gives a local session a real origin, so OAuth redirects
and iframe embedding behave the way they will in production.

The deployment under development is reached at that hostname too, not at `localhost`. The
`LOCAL TEST` OAuth client registers its redirects there, so a `localhost` origin is refused by
the embedded credential broker. It is the same server either way, so this costs nothing but has
to be the URL that gets handed to anyone.

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
| mmdev present and current | `mmdev --version` | `1.0.0` or newer. It prints and exits: the update notice never blocks |
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

`lsof` is the macOS form and works on most Linux installs; where it is absent, `ss -ltnp` takes
its place. On Windows neither exists: use `netstat -ano | findstr ":3000 :4"` in PowerShell or
`cmd`, which lists the owning process id in the last column. All three answer the same question,
so pick the one the platform has rather than reporting the check as impossible.

Two rows deserve extra suspicion because both fail while looking fine:

- **`mmdev --version` hanging with no output** means an install far enough behind to predate
  the non-blocking update notice. `mmdev update` fixes it, and nothing downstream
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

Work back up this page rather than debugging the code. Each of these reads as a bug in the
deployment and is not one:

| What you see | What it actually is | Settled in |
| :--- | :--- | :--- |
| `mmdev --version` hangs or prints nothing | An install old enough to stop on the interactive update prompt | Versions |
| `Please run 'mmdev oauth dev-init'` | The per-environment client was never created, or was created against a different environment | Authenticate |
| The deployment reads one tenant's data and authenticates against another | The four legs disagree. Nothing prints this; it looks like bad data | Confirm which environment |
| GraphQL answers but the Carbide Data tools are absent | A narrow grant, not a broken plugin. The scope set of a brokered connector is decided server-side | Connect the gateway |
| Tools still absent after authenticating | The registry was bound when the session started. Clear the authentication and authenticate again before restarting anything | Connect the gateway |
| A 400 from the credential broker on a local URL | `localhost` is not an origin the dev client trusts | Check the local environment |
| A bind error on start, with no clear message | Port 3000, or one of 4000-4010, is already held, often by a playground from an earlier session | Check the local environment |
| `sudo: A terminal is required to authenticate` | A session cannot answer a `sudo` prompt. The `mmdev` installer needs no root | Install mmdev |
| `curl: (23)` | A pipe into `sudo`, not a network problem | Install mmdev |

The first column is what the developer reports. The second is what to say back, because in every
row the obvious reading is the wrong one.

## Next

Return to `start`. It reads the project state and names the one skill that comes next, which
depends on what is on disk rather than on what was just installed.

If a check here could not be cleared, say which one and what it blocks before going back. A
machine that is ready except for the gateway can still specify a deployment; one that cannot
reach Carbide Data cannot build a surface that stores anything.
