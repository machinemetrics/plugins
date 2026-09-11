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

### Say what the phases are, once

On a first contact, before the first handoff, lay out the path in four lines so the customer
knows where they are and what is coming. Not on a return visit, and not again later.

> 1. **Prepare the machine** so it can talk to MachineMetrics. Once per computer.
> 2. **Decide what to build**, in enough detail to be worth building. The most valuable
>    hour of the project.
> 3. **Build it**, against your real data.
> 4. **Put it live** and register it so it appears inside MachineMetrics.

Say which one is next and why. Two of them have a smaller question inside: whether the
deployment needs to record anything of its own, settled while deciding what to build, and
the design of those records, settled while building. Mention those when they arrive, not
here.

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
| `SPEC.md` with an empty cell, or no surfaces table | The spec is not finished |
| No `storage:` line, or it reads anything but `yes`, `no` or `blocked` | The spec is not finished. `storage-fit` never returned a verdict |
| `storage: blocked` | The model does not fit Carbide Data. Back to `spec`: this is not buildable as specified |
| A cell reading `pending` | Not a gap. `implement` fills those two when it scaffolds |
| `SPEC.md` complete, no `public/default.json` anywhere below | Specified, not scaffolded |
| A `public/default.json` exists | A project exists, at that directory. The file is the proof, not its contents |
| That file has an empty or missing `clientId` | Still a project, with broken configuration. `implement`, to repair the client by its environment table. Never scaffold over it, and never assume `dev-apply` is the fix: on a deployed project it overwrites the customer's client |
| A surface in `SPEC.md` at status `built` | Code exists for it, not yet shipped |
| A surface at status `deployed` | It is live |
| A surface at status `blocked` | Specified, and something outside the spec stops the build. The row says what |

Say what you found. Do not report a state you did not read off disk.

## 2. Check the machine, once

`setup` is machine scoped, not project scoped. It runs once per machine and again when
something breaks underneath, so do not re-run it for every project.

Three things are worth confirming here, because all three fail silently:

**Is `mmdev` present?**

```bash
MMDEV_NO_UPDATE=1 mmdev --version
```

The environment variable is not optional here. Releases before 0.53.3 stop on an interactive
update prompt on **every** invocation including `--version`, which no agent can answer, so
the bare command hangs on exactly the machines this check exists to catch. If it still hangs
or prints nothing, treat that as a failure and hand off to `setup`.

**Does the gateway actually answer?** Probe it: call any cheap gateway tool, for example a
`knowledgeBase` query with any string. Say out loud that you are probing, so the call does not
read as a random detour.

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
MMDEV_NO_UPDATE=1 mmdev environment list
```

Report the active environment by name every time, alongside the two checks above. This is
cheap and it is not bookkeeping: the environment is inherited from whatever was last active on
the machine, which may be another project or another day's work, and nothing about a wrong one
looks wrong until `deploy`.

A customer works on their own environment: `production` on Commercial, `govcloud` on GovCloud.
`staging` and `sandbox` are MachineMetrics-internal and a customer cannot reach them. So if the
active environment is `staging` or `sandbox` and this is a customer's deployment, say so and
hand off to `setup` to switch, rather than building on it. A session that starts on the wrong
environment produces a deployment that is hosted, publicly reachable and unable to reach the
API, which is only discovered once it is live.

**Do not ask which is happening.** This plugin builds applications for customers, so the
environment is always theirs. MachineMetrics staff rehearsing the workflow on `staging` know
to switch and do not need to be offered the choice, and offering it to a customer proposes an
environment they cannot deploy to.

If any check fails, hand off to `setup`. **If `setup` installs or authorizes a gateway, the
session has to restart** before its tools exist, so expect to be re-entered here rather than
continuing in that session.

**The gateway is also the documentation.** `knowledgeBase` serves the MachineMetrics developer
and support documentation, so hook signatures, API shapes, platform settings and product
behaviour are all lookups rather than recall. Prefer it over what you remember, in every
skill. If the gateway is unavailable, the same content is at
https://developers.machinemetrics.com and https://docs.machinemetrics.com.

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

| State | Next |
| :--- | :--- |
| Machine not ready | `setup` |
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
| `app` | The MachineMetrics product itself, at app.machinemetrics.com |
| `deployment` | The code the customer hosts, on its own origin, with an OAuth client |
| `view` | What a user opens. A `widget`, an OperatorView `tab`, or a `fullpage` |
| `surface` | A single `view` inside a deployment. A deployment can have several |
| `project` | A set of Carbide Data tables with a name, an icon, and a deployment URL |

Avoid the bare word "app" for what the customer is building. Say `deployment` or `surface`.
