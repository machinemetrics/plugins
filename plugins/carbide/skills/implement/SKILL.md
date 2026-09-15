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
## Before starting

`SPEC.md` must exist with all of the following. It lives at the **project root**, which is
not necessarily the current directory: a scaffolded app sits at `<name>/app/`, two levels
below the root, so check the parents too rather than concluding the spec is missing.

- A surfaces table naming at least one surface and its status
- A data-source table with no blank cells, including a `Proven by` entry on every row
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
gets scaffolded over. Repair it by running `mmdev oauth dev-apply` from the **project root**,
which is the directory that contains `app/`, not the `app/public/` directory the find just
reported. `dev-apply` resolves `app/public/default.json` relative to the working directory, so
run from anywhere else it fails with `Error: app/public/default.json not found` even though the
file is plainly there. Say that this is what you are doing.

## 1. Scaffold, only for a new project

**Skip this step entirely if the check above found a `public/default.json`.** The project
exists, and scaffolding over it destroys its OAuth client and its configuration. Pick up at the
surface being added instead.

For a new project, **read [scaffold.md](scaffold.md) before running `mmdev create`**. Choosing
the wrong template costs the machine context and the kiosk sizing, and a name that is not
kebab-case produces a project that cannot start under Docker at all.

Whatever the template, **write it and whether the surface is embedded or standalone into
`SPEC.md`**, replacing the two `pending` cells. A new surface on an existing project skips the
scaffold and still fills them, from what the project already is.

## 2. Reconcile the environment before writing code

Four things have to name the same environment: the active `mmdev` environment, the OAuth client
the project carries, the `releaseStage` in `app/public/default.json`, and the environment the
gateway answers on. A mismatch does not fail loudly. It produces a deployment that authenticates
against one tenant and reads from another.

**Read [environment.md](environment.md) before writing code on a fresh scaffold**, and again
whenever a deployment answers from an environment nobody chose. It has the four legs, how to
read each one, and which repair applies to which mismatch.

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
- **`operationId` is not a platform reference, and it is the one field in that table you
  cannot query with.** It is OperatorView's own job identifier, and its shape depends on which
  flow the company runs: a synthetic `workorder-<workOrderId>-<sequenceNumber>` string on the
  APM and NATS flows, the activity set's `jobId` on the standard flow, and `null` whenever no
  activity is open. Use it to tell one job from the next within a session, or to detect that
  the job changed. Do not store it as a foreign key, and do not expect to look it up.

**To read the job that is actually running, query it.** The open activity set on the machine is
the running job, and its `workOrderOperation` carries the ERP work order when there is one:

```graphql
activitySets(
  where: { machine: { machineRef: { _eq: $ref } }, closedAt: { _is_null: true } }
) {
  activitySetRef
  workOrderOperation {
    workOrderOperationRef
    sequenceNumber
    status
    workOrder { workOrderId partNumber }
  }
}
```

`closedAt: null` is what makes it the current one. **`workOrderOperation` is frequently null**,
because a machine can be running without an ERP job attached, so the job is an optional part of
any record built from this, never a required one.

**The published `useMMAppContext` page does not list these fields, and the table above is the
authority on them.** That page describes the hook in its widget-settings role, as the consumer
of values declared with `useMMAppSetting`, and the machine fields appear nowhere on it. The
same is true of `useMMAppParams`, whose page lists `isConfiguring`, `isEmbedded`, `colorMode`,
`isFullScreen` and `isEditing` and omits `isVisible` and `language`. It is one hook either way:
it returns whatever the host sent, and OperatorView sends the machine.

**An absence on those two pages is not evidence that a field does not exist.** The fields are
set in OperatorView's `CustomTabZone`, which builds `{ operationId, machineId, machineRef,
partCount }` and passes it to `MMEmbeddableZone`, which posts it as `set-context`. To settle the
question rather than infer it, run the playground's OperatorView tab mode and read what
`useMMAppContext()` returns.

**Look the SDK up, do not recall it.** The `knowledgeBase` tool serves the developer
documentation, including every `mm-react-tools` hook, the modal and sidesheet contracts, and
the Production and GraphQL API references. Query it whenever a hook name, an argument, a
return shape or an API field is in question. The fallback, if the gateway is unreachable, is
https://developers.machinemetrics.com.

A hook signature invented from memory is the most expensive kind of wrong here, because it
compiles.

The tab context fields above are the one exception: those pages are incomplete, so a lookup that
comes back empty there confirms nothing. Everywhere else, the served documentation wins over
recall.

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

A surface that lets someone pick a machine, or shows more than its own, reads the list from
GraphQL. **Read [machines.md](machines.md) for the query**: it carries the two identifiers,
which of them each API takes, and the filter that keeps decommissioned equipment out of a list
an operator has to choose from.

### Who the user is

A shop-floor surface has **two identities available, and they answer different questions**: the
operator standing at the machine, and the account the deployment signed in as. On a shared
tablet those are never the same person, and picking the wrong one puts the tablet's name on
every record.

**Ask the operator who they are, pre-filled from the open operator run**, and write that into
`SPEC.md`. It costs one tap and it is the only answer that is current by construction.

**Read [identity.md](identity.md) whenever a surface records who did something**, gates a
control on who someone is, or shows a person's name. It has the query, the two cases where
asking is the wrong shape, and what the browser account is good for.

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

That line covers Linux and macOS, trying `ss` first and falling back to `lsof`. Windows has
neither: there, run `netstat -ano | findstr ":3000 :4"`, which prints the owning process id in
the last column.

A playground from an earlier session, possibly days old and on a different port, is a common
way to spend an hour proving something about the wrong process. The playground takes the first
free port in the range 4000-4010, so do not assume 4000, and read the URL it prints. The matcher
covers 4000-4999, wider than that range on purpose; the four-digit bound is what keeps it from
matching an unrelated ephemeral port such as `:40911`. If all eleven of the playground's ports
are held it does not fall back any higher: it prints `No available ports found between 4000 and
4010` and starts nothing, so a missing playground with that message means ports to free, not a
port to hunt for.

Then run the deployment and the playground together. **The playground is a separate host
page, not a runner.** Starting both is not connecting them:

```bash
npm start          # the deployment, in the project's app/ directory, on port 3000
mmdev playground   # the host page, on the first free port in 4000-4010
```

Open the playground URL it printed, not one you assumed.

**Reach the deployment at `http://development.machinemetrics.com:3000`, never at
`localhost:3000`.** The two are the same server: that hostname is a public record pointing at
`127.0.0.1`, and the dev server binds `0.0.0.0` already, so nothing has to be restarted to use
it. The difference is which origin the OAuth client trusts. The `LOCAL TEST` client registers
its redirects on the `development.machinemetrics.com` hostname, so a `localhost` origin is
refused by the embedded credential broker, which surfaces as a 400 on
`/oauth/embedded/credential` rather than as anything mentioning the hostname.

This applies to every URL handed to a person to open, including the one pasted into the
playground's embed modal. The playground serves itself on the same hostname for the same reason.
A tab URL to paste therefore looks like
`http://development.machinemetrics.com:3000/tab`. The playground supplies the machine over the
handshake, the same way OperatorView does, so nothing about the machine belongs in that URL
either.

**A dev server does not survive the session that started it.** Close the terminal, let the
machine sleep, or end the Claude Code session, and `npm start` goes with it. The surface then
fails in a way that looks like an authentication problem rather than a missing process: the
host frame loads, the deployment does not answer, and the error surfaced is about the session
rather than the socket. It was misread as an auth failure twice in one dry run.

Check the process before you check the credentials:

```bash
lsof -iTCP:3000 -sTCP:LISTEN            # macOS and Linux
netstat -ano | findstr ":3000"          # Windows, in PowerShell or cmd
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

A query-string fallback that reads the machine from the URL is a leftover from a URL tab. If you
meet one in an existing project, remove it: an app tab is handed its machine, so reading it from
the URL is wrong even where it appears to work.

### The exit gate blocks

**This gate blocks. It is not a checklist to report against.** A line that cannot be satisfied
stops the build from being called done, and the remedy is to fix what it caught, not to note it
and continue. There is exactly one way past an unsatisfied line, and it is described after the
list.

Do not treat the build as done until all of these are true:

- The deployment ran in the playground, with real authentication, not in a visual harness
- Every data source in `SPEC.md` was exercised, not just rendered, and no row still reads
  `schema pending`: publishing the schema is what closes those
- **If `storage: yes`:** writes were performed and read back **from storage itself**, with
  `executeCarbideQuery`, not by looking at the screen that displays them
- **If `storage: no`:** every read was served by the real API, and you said out loud that
  there is no write path to exercise
- Every GraphQL query the deployment sends was run once against the live schema, and the
  assertion that it still matches lives in the test suite
- One error path was triggered deliberately
- No mock or fixture data path remains reachable
- Every static `className` in the project resolves in the stylesheet
- For a `tab`, polling and subscriptions are gated on `params.isVisible`
- For an **app tab**, the machine comes from `useMMAppContext()` and no query-string fallback
  remains

[class-audit.md](class-audit.md) has the procedure behind the `className` line.

**[mmdev.md](mmdev.md) is the CLI surface**: every command these steps use, what each one
writes, and the failures worth recognising.

### When a gate line cannot be satisfied

A line that cannot be met is a finding, not a formality. Say which line, what satisfying it
would take, and what shipping without it risks, then let the person decide. **The surface stays
`specified` rather than becoming `built`**, with the unmet line recorded beside it, and `deploy`
reads that status.

**Read [gate-exceptions.md](gate-exceptions.md) before taking that route.** It has what to say,
and the two ways a build passes this gate while still being broken.

## Next

Update the surface's status in `SPEC.md` to `built`, then invoke `deploy`.

If the gate did not pass because the spec turned out to be wrong rather than the code, go back
to `spec` for that surface and say so plainly. That loop is expected and cheap. Working around
a wrong spec in code is neither.
