---
name: start
description: The entry point for every Carbide application, new or existing. Use when someone asks to create, build, begin, change, extend, or add a surface to a Carbide app, project, or deployment, when they ask how to get started, when they want to modify something already deployed, or when they do not know which step comes next. This skill works out what state the project is in and names the one skill to run next.
---

# Start here

You are guiding someone through building an application that runs inside MachineMetrics.
They own the code and the hosting. MachineMetrics governs identity, data access, and what
appears inside the platform.

**This skill does not build anything and does not recite the whole process.** It works out
where the project already is and hands off to exactly one skill. It is also the way back in:
every later change re-enters here, which is what keeps `SPEC.md` honest.

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
## 1. Detect, do not ask

Read the project state before asking the person anything. They often do not know, and the
files do.

```bash
ls SPEC.md ../SPEC.md ../../SPEC.md 2>/dev/null
find . -maxdepth 4 -name default.json -path '*/public/*' -not -path '*/node_modules/*' 2>/dev/null
```

**Look for both of these in more than the current directory.** `mmdev create <name>` scaffolds
into a subdirectory **and puts the app one level below that**, so a scaffolded project looks
like `<name>/app/public/default.json`: two levels below where `SPEC.md` lives, not one. That
is why the find runs to depth 4. At depth 3 it returns nothing on a perfectly good project.

Which directory you are standing in depends on where the person ran Claude Code:

- **Started at the project root**, the common case: `SPEC.md` is here and the app is two
  levels down. Checking only here for `package.json` reports "not scaffolded" for a working
  project, and the next step then scaffolds a second one on top of it.
- **Started inside the scaffolded app**, which happens as soon as someone opens the directory
  they have been editing: `SPEC.md` is one level up. Checking only here reports "nothing is
  specified" for a fully specified project, and the next step sends them back to `spec` to
  re-answer questions they already answered.

Both misreads come from assuming the two live together. **Say which directory you found each
one in**, and treat the directory holding `SPEC.md` as the project root for everything that
follows.

The app directory is the one holding `public/default.json`, whatever that file contains. If
the find returns more than one, do not guess: name them and ask which is the deployment. If
`SPEC.md` turns up in more than one place, ask as well rather than taking the nearest.

| Signal | Means |
| :--- | :--- |
| No `SPEC.md` | Nothing is specified yet |
| `SPEC.md` with no surfaces table, saying the platform already does this | **Finished, and the answer was to build nothing.** Not a gap. There is nothing to implement and nothing to route: say what it concluded and stop |
| `SPEC.md` with an empty cell, or a surfaces table with a missing column | The spec is not finished |
| No `storage:` line, or it reads anything but `yes`, `no` or `blocked` | The spec is not finished. `storage-fit` never returned a verdict |
| `storage: blocked` | The model does not fit Carbide Data. Back to `spec`: this is not buildable as specified |
| A cell reading `pending` | Not a gap. `implement` fills those two when it scaffolds |
| `SPEC.md` complete, no `public/default.json` anywhere below | Specified, not scaffolded |
| A `public/default.json` exists | A project exists, at that directory. The file is the proof, not its contents |
| That file has an empty or missing `clientId` | Still a project, with broken configuration. `implement`, to repair the client by its environment table. Never scaffold over it, and never assume `dev-apply` is the fix: on a deployed project it overwrites the deployment's own client |
| A surface in `SPEC.md` at status `built` | Code exists for it, not yet shipped |
| A surface at status `deployed` | It is live |
| A surface at status `blocked` | Specified, and something outside the spec stops the build. The row says what |

Say what you found. Do not report a state you did not read off disk.

### If nothing was found, confirm where the project should live

The two lookups above end in one of two states, and only one of them raises a question.

**Something was found.** The directory holding `SPEC.md` is the project root, and the directory
holding `public/default.json` is the app. Those files answer the question; asking anyway
contradicts this section's own heading. Name both directories and go to section 2.

**Neither was found.** The session is about to create a project, and the directory it is
standing in is a guess: it is wherever the person happened to start Claude Code, which is
often not where they keep their code. Nothing has been written yet, so this is the last cheap
moment to get it right. Ask, once.

**Ask in the first reply, whatever else that reply carries.** A request usually arrives with the
app attached to it, and the design question pulls harder than the directory does. An answer that
weighs surfaces, tabs or a prototype and never names the directory has skipped this gate rather
than deferred it, because everything written from here on, `SPEC.md` first, lands in whichever
directory is current at the moment it is written. The question costs one sentence. Answer the
design question in the same reply when there is something worth saying, and do not trade the
directory for it.

Report the absolute path of the working directory exactly as the operating system gives it.
`/home/dana/code` and `C:\Users\dana\code` are both normal, and neither form is the canonical
one. Never write a `~` in the question or in a command: some shells the session drives do not
expand it, and a literal `~` directory is a real and confusing failure mode. Then say what will
be created where, in the person's own terms:

- `SPEC.md` at the root of this directory
- the scaffold at `<this directory>/<project-name>/app/`, because `mmdev create <name>` makes
  its own subdirectory and puts the app one level below that

Two conditions are worth naming in the same message, because both are cheap to notice and
expensive to discover later. Neither blocks anything; they inform the answer:

| Condition | How to check | Why it matters |
| :--- | :--- | :--- |
| The path is the person's home directory | Compare the reported path to the home directory | A project scaffolded loose in a home directory is easy to lose and awkward to put under version control later |
| The directory is inside a git repository for something else | `git rev-parse --show-toplevel` | The Carbide project would be nested inside that repository and picked up by its tooling. The same command works on every platform |

Also mention, when the person proposes a directory of their own, that `mmdev` runs the
deployment through Docker Compose, so the path has to be one Docker can bind-mount. On Windows
that means a location Docker Desktop shares; on macOS, a path inside Docker Desktop's
file-sharing list. Do not try to detect this. Say it, and let them choose.

If they name a different directory, make it the working directory before going on, creating it
first if it does not exist. What matters is that the working directory is the one they chose,
not how it got there: `mkdir -p` is not available everywhere, so create the directory by
whatever means the platform provides. Then say which directory is now the project root.
Everything that follows (`spec`, `implement`, `deploy`) reads the working directory, so this
is the only place the answer needs to be recorded.

If they confirm the current directory, say so in half a sentence and move on.

### Look for an earlier attempt at the same thing

An application that reaches a second attempt has usually left evidence of the first, and that
evidence is worth more than it looks: a previous build's notes record the things that are only
learned by hitting them. Check for it before any building starts, whether or not a project was
found above.

```bash
ls -d *-bak *.bak *-old *-attempt* 2>/dev/null
mmdev oauth list
```

Four places hold it:

| Where | What it tells you |
| :--- | :--- |
| A backup or abandoned copy of the project beside the current one | The most valuable of the four. Read its `SPEC.md`, its `AGENTS.md`, and the comments in whatever it built: a note explaining why something is done an odd way is usually a trap someone already paid for |
| `mmdev oauth list` | A client named after this application means an earlier attempt got as far as registering one. Clients cannot be deleted, so reuse the existing one rather than adding a near-duplicate |
| `listCarbideSchemas` | A schema for this domain is already published and cannot be unpublished. Read it before designing another: either it is the table to build on, or the new design has to use a different `schemaKey` |
| The hosting account | A site already serving this application means a registered OAuth redirect points at that exact hostname, which constrains the name the next deployment can take |

**Read what you find before deciding what to do with it.** A previous attempt's conclusions are
evidence about the platform, not a verdict on the design: adopt the findings, and take the
design decisions again. Say which of the four you found, and what each one changes.

**Do not reuse an earlier attempt's code by copying it.** Copying carries its configuration and
its OAuth client into a project that should start clean. Read it, then build.

## 2. Check the machine, once

`setup` is machine scoped, not project scoped. It runs once per machine and again when
something breaks underneath, so do not re-run it for every project.

Three things are worth confirming here, because all three fail silently:

**Is `mmdev` present?**

```bash
mmdev --version
```

**These skills assume `mmdev` 1.0.0.** Anything older, and anything that hangs or prints
nothing, is a machine that is not ready: hand off to `setup`, which owns the version check and
the upgrade. At 1.0.0 and newer this prints and exits: the update notice is one line on stderr
that never blocks, and it is suppressed for `--version` and for any caller whose streams are
not a terminal, which covers every command a session like this one runs.

If a project already exists, check its libraries too, in the project's `app/` directory:

```bash
npm ls @machinemetrics/mm-react-tools @machinemetrics/mm-react-components
```

Either package below the version `setup` requires routes there as well, `mm-react-tools` below
5.2.0 or `mm-react-components` below 1.6.1. Use the scoped names: the unscoped ones report
nothing rather than failing, which reads as "not installed" on a project that has them.

**Does the gateway actually answer?** Probe it: call any cheap gateway tool, for example a
`knowledgeBase` query with any string. Say out loud that you are probing, so the call does not
read as a random detour.

**Then check that the Carbide Data tools are there too, whatever the spec turns out to need.**
A gateway that answers a `knowledgeBase` or GraphQL call proves the connection, not the grant:
the Carbide Data tools ride a separate scope and can be absent from a session whose other tools
work perfectly. `listCarbideSchemas` is the cheap check, and its answer is also useful later.

Do this now rather than when storage design starts. Widening a grant is interactive, takes a
browser, and may need the session's tool registry rebound, so it is a different thing to hit in
the first two minutes than an hour into a spec that is nearly closed.

Report which of four states you are in, not just pass or fail. The two middle ones look like a
broken plugin and are not:

| State | What you see | Next |
| :--- | :--- | :--- |
| Absent | No MachineMetrics tools in the session | `setup`, to install it |
| Present, not authorized | Tools exist, the call fails, or `claude mcp list` says `Needs authentication` | `setup`, to authenticate. Nothing is wrong with the plugin |
| Present, authorized, incomplete | The call returns real content, but the Carbide Data tools are absent | Only matters once `SPEC.md` says `storage: yes`. Then `carbide-data` to diagnose the grant, and `setup` for the remedy. Otherwise note it and carry on |
| Present and authorized | The call returns real content and the Carbide Data tools are listed | Continue |

The middle state is invisible in `/plugin`, because the plugin-level connection and the
server's OAuth token are different things and only the first is shown there. A user who has
just re-authenticated may still be in a session holding a stale token. Their word is not
evidence; the response is.

**Which environment is `mmdev` pointed at?**

```bash
mmdev environment list
```

Report the active environment by name every time, alongside the two checks above. This is
cheap and it is not bookkeeping: the environment is inherited from whatever was last active on
the machine, which may be another project or another day's work, and nothing about a wrong one
looks wrong until `deploy`.

A deployment runs on its own account's environment: `production` on Commercial, `govcloud` on
GovCloud. `staging` and `sandbox` are MachineMetrics-internal and are not reachable from here.
So if the active environment is `staging` or `sandbox`, say so and
hand off to `setup` to switch, rather than building on it. A session that starts on the wrong
environment produces a deployment that is hosted, publicly reachable and unable to reach the
API, which is only discovered once it is live.

**Do not ask which is happening.** Everything built here runs on a real account, so the
environment is always theirs. MachineMetrics staff rehearsing the workflow on `staging` know
to switch and do not need to be offered the choice, and offering it here proposes an
environment they cannot deploy to.

If any check fails, hand off to `setup`. **A gateway authorized mid-session does not bring its
tools with it**: the registry was bound when the session started. `setup` has the cycle that
rebinds it without a restart, and says when a restart is the only thing left. Either way, come
back here once the tools are actually present rather than assuming they arrived.

**The gateway is also the documentation.** `knowledgeBase` serves both documentation sites, so
hook signatures, API shapes, platform settings and product behaviour are all lookups rather than
recall. Prefer it over what you remember, in every skill. If the gateway is unavailable, the same
content is at https://developers.machinemetrics.com and https://docs.machinemetrics.com.

**Narrow the search with `category` and `section`.** They mirror the path of the page they came
from, so a result from
`developers.machinemetrics.com/docs/build-apps/mm-react-tools/hooks/useMMAppContext` carries
`category: "build-apps"` and `section: "mm-react-tools"`. Passing them back filters the next
search to that corner of the docs.

| Looking for | Try |
| :--- | :--- |
| A hook, an API shape, anything about building | `category: "build-apps"`, and `section: "mm-react-tools"` for the library |
| How the product behaves for the people using it | `category: "product-guides"` or `"getting-started"`, on the user docs, which carry no section |
| The GraphQL schema | `category: "schema"` |
| Something the shop wrote themselves | `category: "document"`, which is their own uploads rather than ours |

Every result carries its `source_url`, so quote the page rather than paraphrasing it, and say
which one answered. Widen by dropping the filters before concluding a thing is undocumented: an
empty result under a wrong `section` looks identical to a gap in the docs.

**Say which environment the gateway is on, not just that it answered.** Nothing prints it,
and it is assumed to match the active `mmdev` environment without anyone checking. When the
two disagree, every symptom points at the code instead. If you cannot establish it, say that
rather than assuming they agree.

**If the gateway cannot be fixed right now**, that is not automatically a stop. Say which
verification you are giving up:

- A read-only view **can** proceed, verifying query shapes at runtime instead.
- Anything touching Carbide Data schemas **cannot**. The schema is not guessable, and a wrong
  guess appears as a 404 long after the code looks finished.

Do not improvise a third option.

## 3. Route to one skill

First match wins. Name the skill, say why, and invoke it. Do not list the others.

**When the route is `spec`, say the cheapest thing first.** Requests shaped like "let the
operator record X at the machine, then show me where X happens" are often a MachineMetrics
feature already, scrap and downtime reasons most of all. Nothing in the table below catches
that, because it is a question about the request rather than about the project's state. So when
you hand off to `spec`, name it as the first thing `spec` will check, and do not start designing
a surface on the way there.

| State | Next |
| :--- | :--- |
| Machine not ready | `setup` |
| `mmdev`, or an existing project's libraries, behind the versions these skills assume | `setup`, to upgrade first. Building against an old toolchain produces a deployment that has to be repaired later |
| `SPEC.md` concluded that nothing should be built | Nothing. Say what it concluded and what is left for them to configure. A request to build one anyway is a new request, and re-enters here |
| No `SPEC.md`, or the spec is not finished | `spec` |
| `SPEC.md` says `storage: yes` and the Carbide Data tools are absent | `carbide-data`, to diagnose the grant before any surface work |
| Any surface at `blocked` | `spec`, for that surface. Check whether the blocker has cleared before anything else |
| Spec finished, no project on disk | `implement` |
| Any surface at `specified` | `implement`, for that surface |
| Any surface at `built` | `deploy`, for that surface |
| Every surface at `deployed`, and the person wants a change | See below |
| Every surface at `deployed`, and no change asked for | Nothing to do. Say so |

The Carbide Data row sits above the surface rows deliberately. It is the one machine-state
problem that does not stop the session outright, so it would otherwise lose to the first
surface row and the diagnosis promised above would never run. It is gated on `storage: yes`
because a read-only deployment never needs those tools, and sending one to `carbide-data`
only earns a bounce back.

Statuses are read **per surface**, not for the deployment as a whole. A live deployment
gaining a second surface has one row at `deployed` and one at `specified` or `built` at the
same time, which is normal.

**Between surfaces, pick by status and not by the order they appear in `SPEC.md`.** The order
is `blocked`, then `specified`, then `built`, which is the order of the rows above. A
deployment whose first-listed surface is `built` while a second is `specified` goes to
`implement` for the second one, not to `deploy` for the first.

The `blocked` row sits above the no-project row for the same reason. A spec whose only surface
is blocked is finished and has nothing on disk, so it matches the no-project row too, and with
first match wins the lower row would never be reached: the session would scaffold a build that
is known not to work.

**A `blocked` surface goes to `spec`, not to `implement`.** Its row names the condition that
would clear it, so check that first: if the condition has been met, `spec` moves it to
`specified` and the build proceeds. If it has not, say so and stop rather than building
something known not to work. Do not route a blocked surface into `implement` on the grounds
that the spec looks complete, because it is complete: that is what `blocked` records.

## 4. Changes to something already deployed

This is the common case after the first release, and it is why this skill is the only door.
Classify the change before routing it, and say which class you chose:

| Class | Examples | Next |
| :--- | :--- | :--- |
| **Simple** | Wording, a colour, a column order, a threshold already in `SPEC.md` | `implement`, then `deploy` |
| **Substantive** | A new surface, a new entity or attribute, a changed computation, a different user | `spec` for that surface, then `implement` |

When in doubt, treat it as substantive. The cost of a spec round on a simple change is one
exchange. The cost of skipping one on a substantive change is a `SPEC.md` that no longer
describes the deployment, after which this detector reads stale state and routes wrongly.

Either way, **update `SPEC.md` as part of the change**, not afterwards.

## Vocabulary

Use these words precisely. They are not interchangeable, and the product UI uses them.

| Term | Meaning |
| :--- | :--- |
| `developer` | The person you are working with. They own the code and the hosting |
| `operator` | Who uses the finished deployment, usually at a machine on the floor |
| `app` | The MachineMetrics product itself, at app.machinemetrics.com |
| `deployment` | The code the developer hosts, on its own origin, with an OAuth client |
| `view` | What a user opens. A `widget`, an OperatorView `tab`, or a `fullpage` |
| `surface` | A single `view` inside a deployment. A deployment can have several |
| `project` | A set of Carbide Data tables with a name, an icon, and a deployment URL |

Avoid the bare word "app" for what is being built. Say `deployment` or `surface`.

## Next

**Invoke the one skill the routing table named, and nothing else.** Do not begin the work here:
this skill decides where a project is, and the skill it names decides what happens to it.

Come back here after each phase. That is what keeps `SPEC.md` describing the thing that is
running, and it is why a one-word change re-enters here rather than going straight to
`implement`.
