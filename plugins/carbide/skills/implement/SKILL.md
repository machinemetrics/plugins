---
name: implement
description: Build what the spec describes: scaffold the project, build the interface, design the storage if the spec calls for it, and wire the runtime so the result actually runs. Use after SPEC.md exists with a complete data-source table, when writing application code, scaffolding from a template, building or changing a screen, wiring a component to Carbide Data or a GraphQL query, adding a surface to an existing deployment, or checking that a deployment works in the playground.
---

# Implement the spec

This skill coordinates the build. It does not hand over a menu: it sequences the work
itself and calls into the two references it needs.

| It calls | For |
| :--- | :--- |
| `components/SKILL.md` in this directory | Layout, theming, composition against the library |
| `carbide-data` | Schema design, publish, and query, only when `SPEC.md` says `storage: yes` |

## Working with the developer

You are working with a developer who is building on MachineMetrics. Treat them as a
colleague: they may know their shop floor better than they know React, OAuth, or the command
line, and either way they are the one deciding what gets built.

- **Say what it means for what they are building first, then the detail.** One plain
  sentence of consequence, then the technical part. Never the other way round.
- **Name the phase you are in.** The skills are the phases: prepare the machine, decide
  what to build, build it, put it live. Saying "that settles the spec, so we can start
  building" tells them where they are and what comes next. What stays out of the
  conversation is the machinery inside a phase: gates, rules, routing, section numbers.
  Give the reason for a step, never a citation.
- **Technical detail is welcome when it helps or they ask for it.** Explain a term the
  first time it earns its place, in half a sentence. Skip the ones that change nothing for
  them.
- **Narrate less, report more.** Group the work, then say what came of it.

**They are a peer with a different access surface, not a lesser one.** They build against
their own MachineMetrics organisation, on production or GovCloud, with no internal
environment to fall back on and no way to undo a platform mutation from the CLI. That
changes which options exist, never how much is explained or how much is assumed.

Friendly does not mean vague. Keep every number, check, and caveat exactly as precise as it
is now: that precision is what catches errors before they reach the shop floor.
## Before starting

`SPEC.md` must exist with all of the following. It lives at the **project root**, which is
not necessarily the current directory: a scaffolded app sits at `<name>/app/`, two levels
below the root, so check the parents too rather than concluding the spec is missing.

- A surfaces table naming at least one surface and its status
- A data-source table with no blank cells
- **An entities table.** The spec gate requires it and `carbide-data` treats it as a
  prerequisite, so a spec without one is unfinished even when `storage: no` means the storage
  step never runs. A deployment with no named entities is usually a spec that skipped the
  domain model rather than one that genuinely has none
- The surface's status is not `blocked`. That status means the spec is settled and something
  outside it stops the build, with the condition written in the row. Go back to `spec` and
  check whether the condition has cleared
- The storage decision written as `yes` or `no`. **`storage: blocked` is not buildable**:
  `storage-fit` judged the model unable to fit Carbide Data, and the spec has to change
  before anyone writes code

If any of that is missing, stop and go back to `spec`. Building before the spec is settled is
how a deployment ends up with an interface and no storage.

**This skill runs on existing projects too.** Before scaffolding anything, check whether the
project is already there:

```bash
find . -maxdepth 4 -name default.json -path '*/public/*' -not -path '*/node_modules/*'
```

**Do not check the current directory for `package.json`.** `mmdev create <name>` scaffolds
into a subdirectory named after the project **and puts the app one level below that**, so an
existing project is at `<name>/app/public/default.json`: two levels below where `SPEC.md`
lives. The find runs to depth 4 for that reason. A root-level check, or a depth-3 find,
reports "no project" on a working deployment, and the next line of this skill then scaffolds
a second one beside it. That is where the nested duplicate `deploy` warns about comes from.

**The file existing is what proves the project exists, not what is in it.** If the find
returns a `public/default.json` at all, the project exists: **skip step 1 entirely** and pick
up at the surface being added or changed. Scaffolding over a working project destroys its
OAuth client and its config. If it returns more than one, name them and ask which is the
deployment rather than picking.

An empty or missing `clientId` in that file is **broken configuration, not a missing project**,
and the difference matters because the two remedies are opposites. `mmdev oauth dev-apply`
runs after `mmdev create`, so every scaffold passes through a state where the file exists and
the client is not in it yet. Treating that state as "no project" is how a working deployment
gets scaffolded over. Repair it by running `mmdev oauth dev-apply` in that directory, and say
that is what you are doing.

## 1. Scaffold, only for a new project

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
`public/default.json` holds a `releaseStage` and a `clientId` and no secret. `carbide-app` ships
no `Item` demo, its index route renders Home, and the host-sidesheet pattern lives in the
scaffold's `REGISTRATION.md`. `utils/request.ts` is the authenticated request helper and takes a
bearer for the calls you add. There is no `public/mm-app-manifest.json`: nothing in the platform
reads it.

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

`mmdev create <name>` reads as an invitation to write `ShiftUtilization`. Do not. The name
becomes the project directory *and* the compose service key, Docker repository names must be
lowercase, and the result fails at `docker compose up` with `invalid reference format:
repository name must be lowercase`. Nothing builds. Tracked as mmdev-cli#101.

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

```bash
mmdev oauth dev-apply   # copies that client into this project's public/default.json
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

## 2. Reconcile the environment before writing code

Three things must name **the account's** environment, and a fresh scaffold does not guarantee
it. Agreeing with each other is not the test: three legs consistently naming `staging` is a
configuration that builds, passes its tests, deploys, and then cannot reach the API, because
the data lives only on that account's environment: `production` on Commercial, `govcloud` on
GovCloud. Check the name, not only the consistency.

| | Where |
| :--- | :--- |
| The active `mmdev` environment | `mmdev environment list` |
| The OAuth client's environment | Whichever client `public/default.json` names. See the repair table below |
| The deployment's config | `public/default.json`: `releaseStage`, and `urls` only if something set it |
| **The gateway's environment** | Not printed anywhere. Establish it by asking, see `setup` |

**There are four legs, not three.** The gateway's is the one nobody prints and everybody
assumes, and a mismatch there sends every symptom towards the code instead. `setup` covers
how to establish it.

If they disagree, the correct one is the account's own environment: `production`, or
`govcloud` on GovCloud. Make the others match it. Do not ask which to target, because there is
no other option. Each leg has its own remedy, so name the leg before reaching for
a command:

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
deployment is `releaseStage: "govcloud"` and needs no `urls` at all.

A GovCloud deployment carrying `releaseStage: "production"` plus a pinned `urls` predates this
and is a repair rather than a mismatch to leave alone: `setup` covers it. Keeping both leaves a
pin that outlives the next host change, and a host forgotten from the override talks to
Commercial in the meantime. See `setup`'s `partitions.md` for the addresses.

**`mmdev oauth dev-apply` is only safe on a scaffold you are still building.** It copies the
machine's shared `LOCAL TEST` client into `public/default.json`, overwriting whatever is
there. On a deployment that already has its own client that destroys the deployment's client id
and its registered redirect list, and the app keeps working locally while being broken for
everyone else.

| Project | Repair |
| :--- | :--- |
| New, or local-only, still carrying `LOCAL TEST` | After switching, `mmdev oauth dev-init` then `mmdev oauth dev-apply`. `dev-init` is per environment, and the client that `dev-apply` copies belongs to whichever environment was active when `dev-init` last ran |
| Has its own client, or is deployed anywhere | `mmdev oauth list`, pick the client that belongs to this deployment in the target environment, and write its id in by hand. If none exists for that environment, `mmdev oauth add` a new one with the deployment's real redirect |

**`public/default.json` is usually the wrong leg**, and it is wrong the moment it is created
rather than by drifting. The template writes `releaseStage: "production"` regardless of the
active environment, so a scaffold on `staging` produces a production stage against a staging
client. Prefer switching `mmdev` to the environment you actually want, repairing the client
by the table above, and setting `releaseStage` to match, rather than switching `mmdev`
backwards to agree with a stale file.

That file may also omit `urls` entirely even though the template's own type marks it required.
That is not a fault: `mm-react-tools` merges built-in per-stage defaults underneath, keyed off
`releaseStage`. Set the stage and let the library resolve the URLs. Do not paste an `apiUrl` in
to fix a mismatch.

Do not skip this because a build succeeds. A mismatch here produces authentication failures
much later that look like anything but a configuration problem.

**Changing the environment later means a new OAuth client, not just a config edit.** Clients
are per environment, so a client created on `staging` does not exist on `production`. Switching
requires `mmdev login` for the new environment, a fresh client, and a redeploy, and because
`mmdev oauth` has no delete, the old client stays behind. That cost is the reason to get the
environment right in `setup` rather than here.

## 3. Build the interface

Read [components/SKILL.md](components/SKILL.md) and follow it. It is generated from the pinned
component package, so it is the current rules rather than a summary of them. The developer does
not invoke it: this skill does.

Build the surface the spec names. A `widget`, an OperatorView `tab`, and a `fullpage` view
differ in sizing, host contract, and what the user can do, so build for the one in `SPEC.md`
rather than a generic screen.

**For an OperatorView `tab`, read the machine from context. Do not pass it in the URL.**

```tsx
import { useMMAppContext } from '@machinemetrics/mm-react-tools';

const { machineId, machineRef, operationId, partCount } = useMMAppContext();
```

The host sends `context` and `params`, and the library forwards them:

| | Fields |
| :--- | :--- |
| `context` | `machineId`, `machineRef`, `operationId`, `partCount` |
| `params` | `language`, `isVisible` |

Two consequences that change the design:

- **`machineId` is the uuid the Production API filters by**, and `machineRef` arrives beside
  it for the GraphQL layer. So no ref-to-id lookup is ever needed. Writing a
  `machines(where: {machineRef: {_eq: $ref}})` translation adds a second data source and a
  GraphQL dependency for nothing.
- **`isVisible` tells the tab whether it is on screen.** OperatorView keeps a tab mounted
  while hidden, so a polling tab that ignores this burns requests on a tablet all shift.
  Gate every poll and every subscription on it.

The published `useMMAppContext` page describes the hook in its widget-settings role, as the
consumer of values declared with `useMMAppSetting`, and does not list the tab context fields.
That is a documentation gap, not a different hook: the same hook returns what the host sent.
So treat the table above as a snapshot and check the current page before relying on it.

**Look the SDK up, do not recall it.** The `knowledgeBase` tool serves the developer
documentation, including every `mm-react-tools` hook, the modal and sidesheet contracts, and
the Production and GraphQL API references. Query it whenever a hook name, an argument, a
return shape or an API field is in question. The fallback, if the gateway is unreachable, is
https://developers.machinemetrics.com.

A hook signature invented from memory is the most expensive kind of wrong here, because it
compiles.

**`useProductionQuery` takes the query as a JSON string, not an object.** The underlying
`request` expects an already-serialized body and hands it to `fetch` untouched, so passing an
object sends the literal `[object Object]`:

```tsx
const query = { startDay, endDay, data: [{ metric: 'utilization' }] };

// right
useProductionQuery(JSON.stringify(query), 5000);
// wrong: compiles, type-checks, and sends "[object Object]"
useProductionQuery(query, 5000);
```

Look the real query shape up rather than copying the one above: it is here to show where
`JSON.stringify` goes, not what to ask for.

The failure surfaces as `Cannot POST /reports/production`, a 404 that reads like a wrong URL
that sends you looking at `releaseStage` and `urls`, which are innocent. If a Production API
call 404s, check the body's type before touching any host configuration. Pin the string
contract in a test so it cannot regress silently.

The template is the reference for the embedding contract, not this file. Read what it ships
before inventing a pattern:

- `examples/` inside the installed `@machinemetrics/mm-react-components` package, which
  carries working patterns for the common shapes
- The template's own route and host-integration modules, which carry the embedding contract

Extend what the template provides rather than rewriting it. The host contract for sidesheets,
modal save, and error propagation is easy to reimplement subtly wrong.

## 4. Settle storage, only if the spec says storage

If `SPEC.md` records `storage: no`, skip this step and say that you are skipping it.

Otherwise **invoke `carbide-data` now**, before writing any code that reads or writes records.
Its schema is not guessable, and a wrong guess surfaces as a 404 long after the code looks
finished. Get the shape from the schema tools rather than assuming.

`spec` already ran `storage-fit` against the entities table, so the model is known to survive
the constraints before you get here. What happens now is the lifecycle: design, validate,
test, publish, query. If the entities table is missing or `storage-fit` never ran, go back to
`spec` rather than designing a schema from the interface.

The schema is append only. Adding an entity or an attribute later is supported; renaming,
retyping, or removing a published one is not. That makes the first publish worth slowing down
for, and it is why a surface added months later is usually cheap.

**`serverUrl` in `public/default.json` is not the Carbide Data path.** It addresses the
deployment's own backend, and `utils/request.ts` in the scaffold is the client for that
backend. Neither reaches the records `carbide-data` just published. The scaffold reads as
though it does, which is the trap: a deployment that has just been told its data lives in
Carbide Data finds a configured server URL and a request helper sitting there, and wires the
write path to the wrong service. A shipped surface does reach Carbide Data over HTTP,
because no MCP tool exists inside a running application, but it does so at the Carbide Data
base URL for the account's partition, not at `serverUrl`.

**Read that base URL from the library, not from the table.** The stage resolves it alongside
every other host, so the deployment takes it off the auth hook's `urls` and follows its
`releaseStage` automatically. The partition table in `setup`'s
`partitions.md` is for probes and `curl` checks; hardcoding a literal from it pins the
deployment to one partition and is the same trap as pasting an `apiUrl`.

## 5. Wire the runtime, and hold it to a standard

This is the glue between the interface and its data, and it is where the spec becomes real.
Three properties, all checkable:

- **Accurate.** Every number on screen must be traceable to the computation written in
  `SPEC.md`. If they disagree, one of them is wrong and it is not always the code.
- **Secure.** Client configuration comes from `public/default.json`, hosts come from what the
  library resolves for the stage, and runtime credentials come from the auth hook and are read
  per use. Never invent a second source for any of the three, and never write a bearer token
  into `public/default.json`: that file is served publicly. Never widen a redirect list to make
  something work. Authorization is the platform's, not the deployment's:
  do not reimplement it, and do not trust a value the client sent about who the user is.
- **Performant.** Fetch on the surface's terms. A widget refreshing every second inside an
  OperatorView is a different cost to a fullpage view a planner opens twice a day.

### Listing machines

A machine list is the most common first query and the easiest to get subtly wrong. The
canonical shape, from the GraphQL reference:

```graphql
query Machines($where: MachineTP_bool_exp) {
  machines(where: $where, order_by: { name: asc }) {
    machineId
    machineRef
    name
    make
    model
    decommissionedAt
  }
}
```

Three things to get right:

- **Ask for the fields you need and no more.** `machines` exposes activity sets, annotations,
  current alarms, current states, operator runs, rejects and more as nested collections.
  Selecting them by reflex turns a machine picker into an expensive query.
- **`machineRef` is an `Int`, `machineId` is a uuid string.** They are not interchangeable and
  the Production API filters by `machineId`. A schema field storing a ref should be a number.
- **Filter out decommissioned machines.** `decommissionedAt` is non-null on retired machines,
  and they otherwise appear in the list. An operator picking a machine that no longer exists
  is a support call.

Prefer `generateGraphqlQuery` over writing this from memory: it is generated against the live
schema, and the snippet above is a starting point, not a guarantee for a given tenant.

**If the gateway is unreachable**, say which verification you are giving up. A read-only view
can proceed and verify query shapes at runtime. Anything that reads or writes Carbide Data
cannot proceed on assumption.

See [mmdev.md](mmdev.md) for the CLI surface.

## 6. The exit gate

The gate out of this skill is **a working deployment running locally against the real remote
store**, not a rendering. Two things are commonly mistaken for it:

**A visual or screenshot harness is not an embedding preview.** Those harnesses substitute a
double for the host tools, so they prove layout and nothing about sidesheets, confirms, toasts,
or auth. Passing a component audit does **not** discharge this gate.

**The throwaway prototype from `spec` is not this either.** That one ran on mock data in memory
and was deleted. If any mock or fixture data path is still reachable in the project, remove it
before claiming this gate.

Before starting a playground, check whether one is already running:

```bash
ss -ltnp 2>/dev/null | grep -E ':(3000|4[0-9]{3})( |$)' || lsof -iTCP -sTCP:LISTEN -P | grep -E ':(3000|4[0-9]{3})( |$)'
```

A playground from an earlier session, possibly days old and on a different port, is a common
way to spend an hour proving something about the wrong process. The playground takes the first
free port from 4000 upward, so do not assume 4000. The matcher covers 4000-4999; the four-digit
bound is what keeps it from matching an unrelated ephemeral port such as `:40911`. If every port
in that band were taken the check would miss the playground, which in practice means something
else is very wrong.

Then run the deployment and the playground together. **The playground is a separate host
page, not a runner.** Starting both is not connecting them:

```bash
npm start          # the deployment, in the project's app/ directory, on port 3000
mmdev playground   # the host page, on the first free port from 4000 up
```

Open the playground URL it printed, not one you assumed.

**A dev server does not survive the session that started it.** Close the terminal, let the
machine sleep, or end the Claude Code session, and `npm start` goes with it. The surface then
fails in a way that looks like an authentication problem rather than a missing process: the
host frame loads, the deployment does not answer, and the error surfaced is about the session
rather than the socket. It was misread as an auth failure twice in one dry run.

Check the process before you check the credentials:

```bash
lsof -iTCP:3000 -sTCP:LISTEN
```

Nothing listening means restart `npm start`, not re-authenticate. Re-running `mmdev login` on
a dead server wastes the round and leaves you believing auth is fragile. Then, in the page: **pick the embed
type matching the surface, and paste the deployment URL into the modal.** Until that is done
the playground is showing you an empty host and nothing about the deployment.

**For a `tab`, the playground runs the real thing.** It is an authenticated
MachineMetrics host: it signs in with PKCE, brokers the embedded credential, and has an
OperatorView tab mode that sends real machine context, so the machine half of a tab's contract
is verifiable locally. Pick tab mode, paste the deployment URL, and check that
`useMMAppContext()` returns a machine rather than nothing.

It also serves `/default.json` for the active environment, and `MMDEV_PLAYGROUND_ENV` pins the
dev server to one environment without changing which one is active. Use that rather than
switching `mmdev` back and forth, which changes the answer for every other project on the
machine.

A query-string fallback that reads the machine from the URL is a leftover from when the
playground could not send context. If you meet one in an existing project, remove it: an app
that reads its machine from the URL is wrong even when it works, because an OperatorView tab
embed never puts it there.

### Check every utility class actually exists

A utility class the stylesheet does not define is not an error and not a warning. It silently
does nothing, and the page renders wrong. This has reached a live screen: collapsed columns
and a headline number that never got large, with nothing in any log.

`components/SKILL.md` covers the mechanism and how to verify a single class. What the gate
needs is the repeatable version: **extract every static `className` token in `src/` and fail
on any that neither the library stylesheet nor the app's own CSS defines.** Write it as a test
so it runs again on every change:

```
src/__tests__/utilityClasses.test.ts
```

**Check both sources.** A small scoped plain-CSS rule in the app is the recommended fallback
for values the precompiled stylesheet lacks, so a checker that consults only
`mm-react-components.css` rejects the escape hatch the component rules tell you to use. Let a
token pass if either side defines it.

Vite's `import.meta.glob` and `?raw` imports are the straightforward way to read both
stylesheets, and the template's `tsconfig.json` includes `vite/client`, so they are available
without adding anything.

**Do not turn on `css: true` globally to make this work.** The library stylesheet is over
200 KB, and a global setting makes Vitest transform it on every test file that imports a
component, which starves the worker pool: unrelated bootstrap tests start failing on the 5 s
timeout, which looks like a bug in the code under test rather than a config change. Leave `css` off, which is
the template's default, and have the checker read the stylesheets as text with the `?raw`
imports described above. Raw imports are not affected by the `css` setting, so the checker
gets its content and no other test pays for it. Confirm by running the full suite, not the
checker alone: the symptom of getting this wrong shows up in the other tests.

Do not treat the build as done until all of these are true:

- The deployment ran in the playground, with real authentication, not in a visual harness
- Every data source in `SPEC.md` was exercised, not just rendered
- **If `storage: yes`:** writes were performed and read back **from storage itself**, with
  `executeCarbideQuery`, not by looking at the screen that displays them
- **If `storage: no`:** every read was served by the real API, and you said out loud that
  there is no write path to exercise
- One error path was triggered deliberately
- No mock or fixture data path remains reachable
- Every static `className` in the project resolves in the stylesheet
- For a `tab`, polling and subscriptions are gated on `params.isVisible`
- For a `tab` registered as an **OperatorView tab embed**, the machine comes from
  `useMMAppContext()` and no query-string fallback remains

**A screen that looks right is not evidence.** Query the rows back on every state the surface
can write. Two failures in one field run were invisible on screen and obvious in the rows. A
list rendered nothing because the reader decoded the wrong envelope while the writes were
landing perfectly. A "claimed and closed" flow had never written the close at all, because the
button that sends it renders only for the person who claimed the record, and the check
compared a different identity field than the one written. Both looked like success.

That last one is a shape worth naming: **write one identity, compare another**. If a record
stores who did something and the interface gates on it, the value written and the value
compared must come from the same expression, and a test has to cover the gate rather than the
write.

**For a `tab` registered as an OperatorView tab embed, check the machine context in the
playground's tab mode.** It sends real context, so this is a line the gate covers rather than a
caveat it has to make. Confirm `useMMAppContext()` returns a machine, and that no query-string
fallback is left behind. A Manage Tabs custom tab is the other case entirely, and the paragraph
after this one is the one that applies to it.

How the tab will be registered still decides what the context is worth, and `spec` should have
settled it:

- **An OperatorView tab embed** supplies `{ machineId, machineRef, operationId, partCount }`.
  This is the case the playground now reproduces.
- **A Manage Tabs custom tab** supplies nothing at all: it is a plain iframe. The deployment
  obtains the machine itself, from its own URL or from a selector it persists per tablet, and
  the bullet above does not apply: there a query string is the mechanism rather than a leftover.
  `deploy` covers both, including that the URL route needs one tab entry per machine.

Either way, do not report a `tab` as working on the strength of the playground alone.

## Next

Update the surface's status in `SPEC.md` to `built`, then invoke `deploy`.

If the gate did not pass because the spec turned out to be wrong rather than the code, go back
to `spec` for that surface and say so plainly. That loop is expected and cheap. Working around
a wrong spec in code is neither.
