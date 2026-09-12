---
name: spec
description: Turn a vague request for a shop-floor application into a written specification before any code is written. Use when someone describes an application they want, when requirements are unclear or contradictory, when a new surface is being added to an existing deployment, or when a build is about to start without a spec.
---

# Specify before building

An agent will happily build the wrong application very quickly. This skill exists to make
the expensive decisions explicit while they are still cheap to change.

Do not write application code from this skill. The one exception is a throwaway prototype,
which is a tool for sharpening the spec and is described below.

**This skill runs for a new deployment and for a new surface on an existing one.** When
`SPEC.md` already exists, add the surface to it rather than starting over. Everything already
settled stays settled: only the new surface needs answers.

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
## What the spec must answer

Ask these one at a time. Do not send a questionnaire.

- **Which surface is this?** A `widget`, an OperatorView `tab`, or a `fullpage` view. Settle
  this first: it decides sizing, the host contract, and usually whether storage is needed at
  all. A deployment can have several surfaces, and each gets its own row.
- **Who opens it, and where are they standing?** An operator at a machine and a planner at a
  desk need different things from the same data.
- **What decision does it support?** Not "what data does it show." A screen that does not
  change a decision will not be used twice.
- **What does the user do here?** Read only, or enter data? Data entry means storage.
- **What are the things this is about?** The entities in the shop and how they relate. Read
  [domain-model.md](domain-model.md) and work through it. This is worth doing even when
  nothing is stored: it is where the words get pinned down. It is also independent of the
  backend, so do not design a schema here.
- **Where does the data come from?** MachineMetrics production data, the shop's ERP
  through connectors, data the deployment collects itself, or a combination.
- **Can the thing that registers this surface actually supply what it needs from the host?**
  Answer this for every input that comes from the platform rather than from an API, and answer
  it against the specific registration mechanism, not the platform in general. See below.
- **What makes it correct?** If it shows a number, someone must be able to say whether that
  number is right. Write down how it is computed, then **produce it once from the live API
  before the spec closes**. See below.
- **How will they know it works?** One concrete scenario with real values.

## Check the host can supply what the surface needs

A surface's inputs come from two different places, and only one of them is testable with a
query:

- **Data**, from an API. If it is wrong you find out immediately.
- **Context**, from the host page the surface is embedded in: which machine the operator is
  at, which operation is running, whether the tab is on screen. If this is missing, the
  surface renders perfectly and has no subject.

For every context input, name the **mechanism that will register this surface** and confirm
that mechanism supplies it. Not the platform in general: the specific mechanism. They differ,
and the difference is invisible until the surface is live.

The case that has already cost a shipped deployment: an OperatorView `tab` registered through
**Settings → Operator Dashboard → Manage Tabs** is a plain iframe with a fixed URL. It performs
no embeddable handshake, so `useMMAppContext()` is empty and `isEmbedded` is `false`. A spec
that recorded "machine id from the OperatorView host context" was correct about the platform,
correct about the documented hook, and still unbuildable through the mechanism `deploy` routes
them to. `deploy` covers the two kinds of tab and the options when only Manage Tabs is
available.

So write the mechanism into the data-source table, not just the source:

| What | Source | Read or written |
| :--- | :--- | :--- |
| Machine the operator is at | OperatorView tab embed context, `useMMAppContext().machineId`, **not** supplied by a Manage Tabs custom tab | Read |

If a context input cannot be supplied by the available mechanism, that is a spec problem and
this is where it gets settled: change the surface, change how it is registered, or write down
that it is blocked and on what. Do not carry it into `implement` as an assumption, because
nothing downstream re-checks it. What `implement`'s exit gate can prove depends on how the
surface will be registered: the playground's OperatorView tab mode sends real machine context,
so a tab meant for the embed is verified there, while a Manage Tabs custom tab is a plain
iframe that receives nothing and has to obtain the machine itself, from its own URL or from a
selector it persists. Deciding that here is what keeps the gate meaningful.

## The shop's words are not the API's words

Pinning down terminology is half the job. The other half is knowing what each term is called
in the API, and that mapping is not guessable: the single most expensive lookup in one dry
run was discovering that **a categorized downtime is an Annotation**.

| The shop says | The API calls it | Where |
| :--- | :--- | :--- |
| A categorized downtime, a downtime reason | `AnnotationTP`, via the `annotations` query. `annotationRef` is its id, `annotationType` its category, `description` the operator's comment, `isPlanned` whether it was scheduled | GraphQL |
| The downtime category itself, often a two-level name with the parent and child separated by a pipe | `annotationType.name` | GraphQL |
| A machine | `MachineTP`, via `machines`. `machineId` is the uuid the Production API filters by, `machineRef` the `Int` GraphQL uses | GraphQL |
| A shift | Not in GraphQL at all. A real entity in the Production API, usable as a filter and a `groupBy` | Production API |
| Utilization, OEE, part counts | Metrics, not types | Production API |

**Check the mapping rather than trusting this table.** It is a starting point for the nouns
that have cost time before, not an inventory, and the API gains types. Ask `knowledgeBase`
for the type by name, or have `generateGraphqlQuery` build the query against the live schema.

**If a noun is missing from GraphQL, look in the Production API before concluding it does not
exist.** They do not carry the same things, and an agent reporting that the platform lacks
something has usually checked one of the two.

## Check what the platform already stores, before designing anything

Ask this before the prototype and before `storage-fit`. It is the cheapest question in the
skill and the one that deletes the most work.

**For every number, threshold, or setting the spec wants: does MachineMetrics already hold
it?** If it does, the deployment reads it. It does not store its own copy, and it does not
need a supervisor screen to maintain one.

Things the platform already owns, which builds routinely re-invent:

| The deployment wants | The platform already has |
| :--- | :--- |
| A per-machine utilization target | `utilizationWarningPercent` and `utilizationFailurePercent` on the machine, and Utilization Goal thresholds at System, Machine and Job level, most specific winning |
| Shift boundaries and names | Real shift entities in the Production API, usable as a filter and a `groupBy` |
| Reject reasons, downtime categories | Configured in Settings, hierarchical, already on the tablets |
| Operators | Settings, or the ERP mapping on ERP-integrated accounts |
| Work orders, jobs, parts | Production data, or the shop's ERP through connectors |

In one dry run this single question removed a stored per-machine target, a Carbide Data
schema, a supervisor surface, and a write path with revision-conflict handling. The spec went
from `storage: yes` to `storage: no` on it.

**The column is a read story only.** The GraphQL API has no mutations, so finding that the
platform already owns something means the deployment can read it and stop, never that the
deployment can write to it. Anything the deployment captures still needs its own store, which
is what `storage-fit` decides.

Use the gateway to check rather than assuming. The `knowledgeBase` tool serves the product
and developer documentation, so what a setting is called and where it lives are lookups, not
guesses; https://docs.machinemetrics.com and https://developers.machinemetrics.com are the
fallback if the gateway is unreachable. Then confirm against the live data with the query
tools.

If a value is not in GraphQL, look in the Production API before concluding it does not exist:
they do not carry the same things, and an agent reporting that the platform lacks something
has usually checked only one of them.

## Prototype to sharpen the spec, then throw it away

**Build one by default.** Arguing about a running thing beats arguing about a paragraph, and
this is where a wrong interface is still cheap. A prototype here is a **tool for answering
one question**, not the first draft of the deployment.

Skipping is allowed, but it is a decision, not a default. Skip only when the surface is a
single number with no interaction, or when the person says they do not want one. Either way
**write the outcome into `SPEC.md`** as one of:

```
prototype: built and deleted
prototype: skipped, <reason>
```

A blank or missing line is an unfinished spec. "It seemed obvious" is not a reason: that is
the judgement the prototype exists to test.

Four rules, and they are not optional:

1. **Throwaway from day one, and named so.** Put it somewhere obviously temporary and say in
   the file that it is a prototype.
2. **Mock data, in memory.** No Carbide Data, no gateway, no persistence. That is exactly what
   makes it cheap, and it is why a complete spec does not require a schema to exist yet.
3. **No polish.** No tests, no error handling beyond making it run, no abstractions.
4. **Delete it when the question is answered.** Fold the answer into `SPEC.md`. The prototype
   does not become the deployment: `implement` scaffolds fresh from the template.

Rule 4 is the one that gets skipped. A prototype that grows into the shipped app is how a
deployment demos beautifully and is silently reading fixtures.

## The spec gate

Write the spec to `SPEC.md` at the project root. Later skills read it and add to it, and
`start` reads it to work out where the project is, so it has to be a file rather than
conversation history.

`SPEC.md` must contain both tables, and **no cell in either may be blank**. Two cells are
filled with the literal word `pending` rather than an answer, and they are named below.

A surfaces table:

| Surface | Type | Who opens it | Template | Embedded or standalone | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ... | `widget`, `tab` or `fullpage` | ... | `pending` | `pending` | `specified` |

Status is one of `specified`, `built`, `deployed`, `blocked`. `implement` and `deploy` update
the first three.

**`blocked` means specified and known not to be buildable yet**, with the reason written
beside it. Use it when the spec is settled and something outside the spec stops the build: a
host capability that does not exist, a library version not yet released, an API that exposes
no way to get a value the surface needs. Writing `specified` in that situation sends the next
session into `implement` to build a surface that cannot work, and writing nothing loses the
finding.

Record what would have to change for it to become `specified` again. A `blocked` row with no
stated condition is indistinguishable from an abandoned one.

**Write `pending` in the Template and Embedded columns, never an empty cell.** `implement`
replaces both when it scaffolds, and the interface work reads them from there rather than
asking again. `pending` is a filled cell that says "a later skill owns this". A blank cell
means the spec is unfinished, and `start` routes it back here.

A data-source table:

| What | Source | Read or written |
| :--- | :--- | :--- |
| ... | ... | ... |

An entities table, in the shape [domain-model.md](domain-model.md) describes. A deployment
with no entities worth naming is rare enough to be worth saying out loud rather than
assuming.

And one explicit line, written as `yes` or `no` and never as an open question:

```
storage: no
```

Do not write `SPEC.md` while any cell is empty, and do not write "to be decided" in one.

**"No idea" is not a blocker, it is work to do here.** If the person does not know where a
value comes from, resolve it in this skill: query the gateway, read the documentation through
`knowledgeBase`, and find out. Do not route it to `storage-fit`. That skill answers two
questions only, whether the deployment needs storage and whether its model fits, and it has
no way to discover where an unknown value lives. Sending an unresolved source there returns
with the gap still open and a round wasted.

The exception is the question `storage-fit` does own: "this value exists nowhere, so we would
have to record it ourselves." That is the storage decision, and it belongs there.

Naming a gap does not discharge this gate. A gap written into `SPEC.md` as an open decision
is the single most common cause of a build that renders and then returns 404.

## Produce every number once, from the real API

Do not close the spec on a described computation. Run the query, get the value, and write
both into `SPEC.md` next to the worked example.

This is not gold plating. In one dry run it caught two errors that would otherwise have
shipped:

- A metric assumed to be `timeInCycle / scheduledTime` is actually `timeInCycle / allTime`.
  For one machine that is 0.636 against 0.071: not a rounding difference, a different answer.
- A query window narrow enough to look reasonable returned a virtual `No Shift` with a `null`
  rate, mid-shift. Rendering that as `0%` tells an operator they are catastrophically behind.

Neither would have surfaced in review, because both read correctly on paper.

**Ask for the number, not the rows it came from.** Aggregate in the query, or bound it with a
`limit` and a narrow window. A verification query is answering one question, so it does not
need the underlying events, and a broad one will not fit: in a dry run a single downtime query
returned 151,782 characters, which overflowed the tool result and cost a round to read back
from disk. The instinct is to fetch everything and count it yourself. Do the counting in the
query.

Three habits that come with it:

- **A `null` is a result, not a gap.** Decide now what the surface shows for it. It is rarely
  zero.
- **If a tool tells you something is impossible, check the other API.** A generator reporting
  that no built-in shift object exists was true of GraphQL and false of the Production API.
  An agent's conclusion about the platform is a hypothesis, not a finding.

## Check the fit before the gate closes

**Invoke `storage-fit` now**, with the entities table and the five shape questions from
[domain-model.md](domain-model.md) in hand. Invoke it even when you are confident nothing is
stored: confirming that is its first question and it takes one exchange.

It answers two things and writes the answer into `SPEC.md`: does this deployment need storage
at all, and does its model survive Carbide Data's constraints. It calls no tools and designs
no schema, which is what makes it cheap enough to run inside a conversation.

Do not reason about the constraints from this skill. `storage-fit` owns them, and a model that
only an agent's reading says will fit has not been checked.

And a `prototype:` line, reading either `built and deleted` or `skipped, <reason>`.

Also required before building:

- One worked example with **real values pulled from the live API**, not plausible ones
- What each number shows when the API returns `null`
- Every context input confirmed against the mechanism that will register the surface, with
  that mechanism named in the data-source table
- The prototype deleted, if one was built

## Next

**Invoke `implement`.** It scaffolds, builds the surface, calls `carbide-data` if
`storage: yes`, and wires the runtime.

Two skills, two costs, and that split is deliberate. `storage-fit` runs here and is cheap: it
answers whether storage is needed and whether the model fits, with no tools and no schema.
`carbide-data` runs in `implement` and is the lifecycle. Doing the second one here is
premature: the prototype runs on mock data, so a spec can be finished and agreed before any
schema exists.

What is not allowed is leaving the storage line unanswered, because then `implement` guesses.
