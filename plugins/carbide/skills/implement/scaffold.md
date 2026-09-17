# Scaffolding a new project

Read this before running `mmdev create`. It covers which template to pick, the naming rule
that decides whether the project builds at all, the two commands that have to run first, and
what the resulting tree contains.

Pick the template from the surface type `SPEC.md` settled on:

| Surface type | Template | What it wires |
| :--- | :--- | :--- |
| `fullpage` | `carbide-app` | Gallery app: host navigation, sidesheet routes, modals |
| `tab` | `carbide-tab` | OperatorView tab: machine context, kiosk sizing, no navigation |
| `widget`, or unsure | `carbide` | Base deployment, least wiring to unpick |

**Run `mmdev create --help` and use what it lists.** It should print `carbide`, `carbide-app`,
`carbide-tab`, `generic-erp-connector`, `sql-server-connector` and `module`. This table has been
wrong in both directions before, so read the CLI rather than trusting it. Scaffolding a `tab`
from `carbide` means the machine context and the kiosk sizing are yours to wire by hand: say
that out loud rather than discovering it at the embed step.

**What a scaffold contains.** The Carbide templates sign in with OAuth 2.1 and PKCE, so
`app/public/default.json` holds a `releaseStage` and a `clientId` and no secret. `carbide-app`
ships no `Item` demo and its index route renders Home. There is no `REGISTRATION.md` in any
template: read the scaffold's own `README.md` and `AGENTS.md`, which every template does ship at
its root, rather than sending anyone to a file by name that you have not seen on disk.

**Check the library versions the scaffold actually installed.** A template declares a range
and ships a lockfile, and the two can disagree with the floor `setup` requires: the range can
admit the floor while the lock pins a release below it, so `package.json` looks satisfied and
the installed tree is not. That has happened, and it presented as a build that did not match
this guidance. `npm ls @machinemetrics/mm-react-tools` in `app/` after `mmdev create` is the
only thing that says what is there. If it is below the floor in `setup`'s prerequisite table,
install the library at that floor so the lock moves; do not proceed on the assumption that the
template did.

**No template ships `app/public/mm-app-manifest.json`, and it is not the way to get machine
context. Do not add one.** An app tab carries the registered view's `appId`;
OperatorView resolves it and marks the tab `isEmbed: true`, and an `isEmbed` tab goes straight to
the embedded zone with the full machine context, without probing for anything. The manifest fetch
belongs to the older path, where a tab was added by pasting a URL and the host had to guess
whether the page could hold up its end. `deploy` covers how a view gets registered.

**`app/src/utils/request.ts` ships with `carbide-app` only.** It is the authenticated request
helper and takes a bearer for the calls you add. The `carbide` and `carbide-tab` templates carry
`app/src/utils/config.ts` and no request helper at all, so on those two the authenticated call is
yours to write. Check which files are actually there before referring to one.

A tab that writes therefore needs its own authenticated call. `useMMAuth().request` is that call
and needs no helper of its own, so a tab scaffold reaches Carbide Data the same way a full page
does. `carbide-data` covers the request and response shapes.

**Two commands must have run first, in this order, and neither is optional:**

```bash
mmdev login             # authenticates against the selected environment
mmdev oauth dev-init    # once per environment: writes a LOCAL TEST client under ~/.mmrc
```

`dev-init` has to precede `mmdev create`, which is a CLI constraint and not negotiable. It
writes a client for the environment that is active **right now**, so if section 2 later moves
the project to a different environment, this client is the wrong one and the repair table there
covers it. `setup` step 5 normally leaves the right client in place already, in which case both
commands are no-ops.

**Check that the project directory exists, not just the exit code.** An unknown template and a
missing prerequisite both exit non-zero, so the code is trustworthy, but the directory check
costs nothing and catches a scaffold that reported success and produced nothing. The
prerequisite message names only `dev-init` even when `mmdev login` is what is missing.

**Use a kebab-case name**, matching `^[a-z0-9]+(-[a-z0-9]+)*$`: lower case, digits, single
hyphens, nothing else.

```bash
mmdev create shift-utilization -t carbide-app
```

**`-o --out-path` decides where the project lands.** Without it, `mmdev create <name>` creates
`<name>/` under the working directory and puts the app at `<name>/app/`. With it, the project
goes to the path you give instead, and the name is still used for the package and the compose
service:

```bash
mmdev create shift-utilization -t carbide-app -o /path/to/projects/shift-utilization
```

Reach for it only when the person has asked for a specific location that is not a subdirectory
of where the session is standing. `start` already confirmed the project root, so the plain form
is normally right, and changing the directory the session works in is the simpler way to honour
a location they named. Quote the path if it contains spaces, which is common on Windows and on
macOS. If the destination already exists, `mmdev create` prompts before overwriting it, so a
non-interactive session must not point it at a directory that has anything in it.

`mmdev create <name>` reads as an invitation to write `ShiftUtilization`. Do not. The name
becomes the project directory *and* the compose service key, Docker repository names must be
lowercase, and the result fails at `docker compose up` with `invalid reference format:
repository name must be lowercase`. Nothing builds.

If the person asks for "Shift Utilization", scaffold `shift-utilization` and say that you did.
The human-readable title belongs in `SPEC.md` and in the platform registration. **On an
existing project already named in CamelCase**, lowercase the compose service key in
`docker-compose.yml` rather than renaming the directory: renaming breaks the OAuth redirect
and the deploy.

**Never copy an existing project to get started.** Copying carries over another project's
config and its OAuth client, and the copy is not a clean starting point.

**Write the template name and whether the surface is embedded or standalone into `SPEC.md`**,
replacing the `pending` in those two cells of the surfaces table. The interface work reads
them from there instead of asking again, and `start` needs them to route a later change.

**A new surface on an existing project skips this whole step, so fill those cells anyway.**
Nothing else writes them, and `start` reads `pending` as "a later skill owns this" rather than
as a gap, so an unfilled pair survives the build and leaves `SPEC.md` without the contract the
next session needs. Read the values off the project: the template from its README or the shape
of `app/src`, embedded or standalone from whether the surface renders inside the platform or
on its own origin. Say which you recorded and where you read them.

Then give the project its client. `dev-init` ran above; `dev-apply` is the half that needs a
project to write into, which is why it is only possible now:

Run it from the project root, the directory holding `app/`. It resolves
`app/public/default.json` relative to the working directory and reports that path as missing
from anywhere else:

```bash
mmdev oauth dev-apply   # from <project-root>, writes app/public/default.json
```

**`dev-init` is shared, and it is per environment.** `~/.mmrc` is a directory holding a client
per environment, so one exists for each environment you have run it in, and every project
scaffolded against a given environment carries that same `LOCAL TEST` client, with its
redirect list growing one entry per deployment. Fine while the work is local.

This is also why the OAuth leg of the environment invariant can drift on its own: `dev-apply`
copies whichever client belongs to the environment that was active when it ran.

**A deployment intended for real users needs its own client**, with a real name and its own
redirect:

```bash
mmdev oauth add -n "<deployment name>" -r "https://<host>/authorize/mm/callback"
```

That prints a `CLIENT_ID` and a `CLIENT_SECRET`. **Only the id goes into
`public/default.json`.** The CLI still prints the secret because the platform still mints one,
not because a PKCE deployment has anywhere to put it: discard it. `mmdev oauth list` shows what
exists; `mmdev oauth dev-reset` clears the local client from `~/.mmrc`.

Note the client id is served publicly from the deployed site at `/default.json`. That is by
design: the registered redirect list is the control, not the id, which is why replacing that
list carelessly matters. Keep a deployment's redirect list tight.

**There is no client secret.** The Carbide templates sign in with OAuth 2.1 and PKCE:
`MMProvider` takes no `clientSecret`, the auth context exposes no `accessToken`, `dev-init`
stores only a client id, and `dev-apply` strips a `clientSecret` that an older scaffold still
carries. If you find one in `public/default.json`, the project predates the current toolchain
and `setup` covers upgrading it.

**No client secret is not the same as no credentials.** The browser still holds bearer tokens:
the library keeps a credential store and hands one out per call. They are short-lived rather
than harmless, so do not log them, do not put them in a URL, and do not persist them anywhere
the bundle can read back.
