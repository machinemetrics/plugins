# mmdev CLI reference

Read this when a command's exact form matters, or when one fails in a way that does not say
why. It covers every command these skills use, what each writes, and the failures worth
recognising.

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
| `mmdev create <name> -t <template>` | Creates a project from a template. **Use a kebab-case name.** `-o --out-path <path>` overrides where it lands, which otherwise defaults to `<name>` under the working directory |
| `mmdev oauth dev-init` | Creates a development OAuth client |
| `mmdev oauth dev-apply` | Applies that client to the project, run from the project root |
| `mmdev configure` | Switches between sets of configuration files and secrets |
| `mmdev environment list` | Lists environments and marks the active one |
| `mmdev environment switch <name>` | Switches the active environment. The name is a required argument |
| `mmdev playground` | Launches the embedded app playground |

Run `mmdev <command> --help` for current options rather than guessing at flags. The CLI is
under active development and gains commands.

`mmdev` installs to `~/.mmdev` and adds itself to the shell profile. **It is not distributed
through npm or Homebrew**, so do not reach for `npm i -g` or `brew install`. `mmdev update`
upgrades an existing install in place.

`setup` owns the version check: these skills assume `mmdev` 1.0.3 and the current libraries,
and nothing here branches on an older one.

## Templates

Which template a surface takes, and recording that choice in `SPEC.md`, is a build decision
rather than a CLI fact: the `implement` skill carries the mapping.

**Read `mmdev create --help` for the list that exists in the installed CLI.** Template names
appear in documentation before they ship. An unknown template prints `Template not found` and
exits non-zero; checking that the project directory exists catches it either way.

When a named template is unavailable, fall back to the general Carbide template rather than
copying another project.

## OAuth clients: the local one is shared

| Command | Scope |
| :--- | :--- |
| `mmdev oauth dev-init` | **Per environment.** Writes a `LOCAL TEST` client under `~/.mmrc`, which is a directory holding one per environment. Reuses the existing one for that environment |
| `mmdev oauth dev-apply` | Copies that client into `app/public/default.json`. **Run it from the project root**, the directory holding `app/`: the path is resolved relative to the working directory, so anywhere else it reports `app/public/default.json` as missing |
| `mmdev oauth dev-reset` | Clears the local client from `~/.mmrc` |
| `mmdev oauth add -n <name> -r <redirect>` | Creates a **new named client** and prints its id. It prints a secret too; a PKCE deployment does not use it |
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
when the first is what is missing. Check that the directory exists rather than trusting the
exit code alone.

For a deployment intended for real users, create its own client with `mmdev oauth add` rather than
shipping `LOCAL TEST`.

The client id is served publicly from the deployed site at `/default.json`. The registered
redirect list is the control, not the id, which is why `-r` replacing the entire list matters.
From `mmdev` 1.0.0 there is no secret at all: the templates use OAuth 2.1 with PKCE on
`mm-react-tools` 5.x, `dev-init` stores only a client id, and `dev-apply` strips a `clientSecret`
an older scaffold still carries. Always include the existing redirects, and re-run
`mmdev oauth list` afterwards to confirm the count grew by exactly one.

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
correct deployment has no `urls` at all. Pasting an environment's API address in to fix a
mismatch pins the deployment to that endpoint and survives every later stage change: on
GovCloud that means a deployment silently talking to Commercial. Set the stage and delete any
`urls` override that is already there.

**On `mm-react-tools` 5.1 the stage carries the partition.** The stages are `production`,
`govcloud`, `staging` and `development`, and each resolves the login, app, API, GraphQL, NATS
and Carbide Data hosts together, readable at runtime as `useMMAuth().urls`. A GovCloud
deployment is `releaseStage: "govcloud"` and needs no `urls`.

An older GovCloud deployment carries `production` plus a pinned `urls` instead. That is a
repair, and `setup` covers it.

**`mmdev oauth dev-apply` is only safe on a scaffold you are still building.** It copies the
machine's shared `LOCAL TEST` client into `public/default.json`, overwriting whatever is
there. On a deployment that already has its own client that destroys the deployment's client id
and its registered redirect list, and the app keeps working locally while being broken for
everyone else.

| Project | Repair |
| :--- | :--- |
| New, or local-only, still carrying `LOCAL TEST` | After switching, `mmdev oauth dev-init` then `mmdev oauth dev-apply`. `dev-init` is per environment, and the client that `dev-apply` copies belongs to whichever environment was active when `dev-init` last ran |
| Has its own client, or is deployed anywhere | `mmdev oauth list`, pick the client that belongs to this deployment in the target environment, and write its id in by hand. If none exists for that environment, `mmdev oauth add` a new one with the deployment's real redirect |

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
- **It takes the first free port in the range 4000-4010 and prints the URL.** Do not assume
  4000. Open the URL it printed. If all eleven are taken it prints `No available ports found
  between 4000 and 4010` and starts nothing rather than trying a higher port.
- **Check for an existing playground first.** One from an earlier session, on another port,
  is a common way to verify the wrong process.

A visual or screenshot harness is not a substitute. Those alias the host tools to a test
double, so they prove layout and nothing about embedding.

## Failures worth recognising

| Symptom | Cause |
| :--- | :--- |
| `docker compose up` fails, `repository name must be lowercase` | A non-kebab-case project name became the compose service key |
| Hangs with no output | An install behind 1.0.0, stopping on the old interactive update prompt. `mmdev update`. From 1.0.0 the notice is one stderr line that never blocks |
| Returns immediately, printing nothing | An incomplete binary. Re-run the installer once; from 1.0.3 it verifies before activating. Not the same as a hang, and `mmdev update` will not fix it |
| `command not found` | The shell was not reloaded (`exec $SHELL -l`), or the platform has no published binary. Linux arm64 has none |
| `Template not found` | Template not in the installed CLI |
| Auth fails after a clean build | Environment invariant broken |
| Playground shows stale behaviour | An older playground on another port |
| Playground loads but shows nothing | Embed type and deployment URL never entered in the modal |
| Sudden "not authenticated", or a blank surface that worked a minute ago | **The dev server died.** Check it is still listening before touching auth |
| 401 or token errors from the gateway | Not logged in, expired token, or wrong environment |
