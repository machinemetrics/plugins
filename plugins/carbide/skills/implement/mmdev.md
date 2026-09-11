# mmdev CLI reference

The command line tool for MachineMetrics development. Prefer it over hand-rolled setup: it
produces the project shape the platform expects.

## Contents

- Commands
- Templates
- OAuth clients: the local one is shared
- The environment invariant
- The playground
- Failures worth recognising

## Commands

| Command | What it does |
| :--- | :--- |
| `mmdev login` | Authenticates with the MachineMetrics API |
| `mmdev logout` | Clears the stored access token |
| `mmdev update` | Upgrades an existing install in place |
| `mmdev create <name> -t <template>` | Creates a project from a template. **Use a kebab-case name** |
| `mmdev oauth dev-init` | Creates a development OAuth client |
| `mmdev oauth dev-apply` | Applies that client to the project |
| `mmdev configure` | Switches between sets of configuration files and secrets |
| `mmdev environment list` | Lists environments and marks the active one |
| `mmdev environment switch` | Switches the active environment |
| `mmdev playground` | Launches the embedded app playground |

Run `mmdev <command> --help` for current options rather than guessing at flags. The CLI is
under active development and gains commands.

`mmdev` installs to `~/.mmdev` and adds itself to the shell profile. **It is not distributed
through npm or Homebrew**, so do not reach for `npm i -g` or `brew install`. `mmdev update`
upgrades an existing install in place.

Releases before 0.53.3 stop on an interactive update prompt on every invocation, including
`--version`, which no agent can answer. If `mmdev` appears to hang and produces nothing, that
is why. Run `MMDEV_NO_UPDATE=1 mmdev --version` to get past it, then `mmdev update`.

## Templates

`carbide-app`, `carbide-tab` and `carbide` all exist in `mmdev` 0.54.0 and later. On an older
CLI only `carbide` does, so run `mmdev create --help` rather than trusting any written list.

Which template a surface takes, and recording that choice in `SPEC.md`, is a build decision
rather than a CLI fact: the `implement` skill carries the mapping.

**Read `mmdev create --help` for the list that exists in the installed CLI.** Template names
appear in documentation before they ship. Before 0.54.0 an unknown template prints `Template
not found` and **exits 0**, so the failure is easy to miss in a longer script; from 0.54.0 it
exits non-zero. Checking that the project directory exists is correct on either.

When a named template is unavailable, fall back to the general Carbide template rather than
copying another project.

## OAuth clients: the local one is shared

| Command | Scope |
| :--- | :--- |
| `mmdev oauth dev-init` | **Per environment.** Writes a `LOCAL TEST` client under `~/.mmrc`, which is a directory holding one per environment. Reuses the existing one for that environment |
| `mmdev oauth dev-apply` | Copies that client into the current project's `public/default.json` |
| `mmdev oauth dev-reset` | Clears the local client from `~/.mmrc` |
| `mmdev oauth add -n <name> -r <redirect>` | Creates a **new named client** and prints its id and secret |
| `mmdev oauth list` | Lists clients |
| `mmdev oauth update -i <id> -n <name> -r <redirects>` | Updates one. **`-r` replaces the whole redirect list** |

So the usual local path shares one client across every project on the machine. **The order is
fixed**, and it is not the order it looks like it should be:

```bash
mmdev login             # authenticates against the selected environment
mmdev oauth dev-init    # has to run BEFORE create, not after; per ACTIVE environment
mmdev create <kebab-case-name> -t carbide-app
mmdev oauth dev-apply   # only possible now: it needs a project to write into
```

`mmdev create` with `login` or `dev-init` missing prints `Please run 'mmdev oauth dev-init'
before creating a project` and creates nothing. The message names only the second command even
when the first is what is missing. Before 0.54.0 it also **exits 0**; from 0.54.0 it exits
non-zero. Check that the directory exists rather than trusting the exit code.

For a deployment customers will use, create its own client with `mmdev oauth add` rather than
shipping `LOCAL TEST`.

The client id and secret are served publicly from the deployed site at `/default.json`. In the
current flow the registered redirect list is the control, not the secret, which is why `-r`
replacing the entire list matters. The library is moving to OAuth 2.1 with PKCE, after which
neither value is needed in the browser. Always include the existing redirects, and
re-run `mmdev oauth list` afterwards to confirm the count grew by exactly one.

## The environment invariant

The active `mmdev` environment, the OAuth client's environment, and the deployment's
`public/default.json` (`urls` and `releaseStage`) must all name the same environment.

A fresh scaffold does not guarantee agreement.

| Leg | Read it with | Fix it with |
| :--- | :--- | :--- |
| Active `mmdev` environment | `mmdev environment list` | `mmdev environment switch <env>` |
| OAuth client's environment | `mmdev oauth list` | See the two cases below. **Not `dev-apply` on a deployed project** |
| Deployment config | `cat public/default.json` | Set `releaseStage`. **Remove `urls`, do not edit it** |

**`urls` is a trap.** `mm-react-tools` resolves per-stage defaults from `releaseStage`, so a
correct deployment usually has no `urls` at all. Pasting an environment's API address in to
fix a mismatch pins the deployment to that endpoint and survives every later stage change:
on GovCloud that means a deployment silently talking to Commercial. Set the stage and delete
any `urls` override that is already there.

**`mmdev oauth dev-apply` is only safe on a scaffold you are still building.** It copies the
machine's shared `LOCAL TEST` client into `public/default.json`, overwriting whatever is
there. On a deployment that already has its own client that destroys the customer's client id
and its registered redirect list, and the app keeps working locally while being broken for
everyone else.

| Project | Repair |
| :--- | :--- |
| New, or local-only, still carrying `LOCAL TEST` | After switching, `mmdev oauth dev-init` then `mmdev oauth dev-apply`. `dev-init` is per environment, and the client that `dev-apply` copies belongs to whichever environment was active when `dev-init` last ran |
| Has its own client, or is deployed anywhere | `mmdev oauth list`, pick the client that belongs to this deployment in the target environment, and write its id and secret in by hand. If none exists for that environment, `mmdev oauth add` a new one with the deployment's real redirect |

`public/default.json` is usually the stale leg: it is written once at scaffold time and never
again. Switch `mmdev` to the environment you want, repair the client by the table above, then
set `releaseStage` to match. A mismatch surfaces later as an authentication failure that looks
like anything except configuration.

## The playground

`mmdev playground` runs the deployment inside the embedded host context, which is how users
will actually see it. A view that looks correct standalone can still be wrong when embedded:
sizing, theme, sidesheets, confirms, toasts, and authentication all behave differently.

Three things to know:

- **It is a host page, not a runner.** Run `npm start` for the deployment as well, then in the
  playground pick the embed type and paste the deployment URL into the modal. Two processes
  running is not the same as the two being connected.
- **It takes the first free port from 4000 upward and prints the URL.** Do not assume 4000.
  Open the URL it printed.
- **Check for an existing playground first.** One from an earlier session, on another port,
  is a common way to verify the wrong process.

A visual or screenshot harness is not a substitute. Those alias the host tools to a test
double, so they prove layout and nothing about embedding.

## Failures worth recognising

| Symptom | Cause |
| :--- | :--- |
| `docker compose up` fails, `repository name must be lowercase` | A non-kebab-case project name became the compose service key (mmdev-cli#101) |
| Hangs with no output | Pre-0.53.3 update prompt. `MMDEV_NO_UPDATE=1`, then `mmdev update` |
| `Template not found`, exit 0 | Template not in the installed CLI |
| Auth fails after a clean build | Environment invariant broken |
| Playground shows stale behaviour | An older playground on another port |
| Playground loads but shows nothing | Embed type and deployment URL never entered in the modal |
| Sudden "not authenticated", or a blank surface that worked a minute ago | **The dev server died.** Check it is still listening before touching auth |
| 401 or token errors from the gateway | Not logged in, expired token, or wrong environment |
