---
name: carbide-data
description: Design, validate, evolve, test, publish, and query Carbide Data schemas with the machinemetrics MCP tools. Use when SPEC.md records storage: yes and a schema has to be built, changed, seeded, published, or queried, or when a Carbide Data tool returns an error that needs interpreting. For the cheaper question of whether a deployment needs storage at all and whether its model fits, use storage-fit during the spec instead.
---

# Carbide Data

Carbide Data is deployment-owned storage for a `project` that needs to record its own data.
It is deliberately narrow. Your most valuable job here is recognising when a design does not
fit, and saying so early. A published field can never be changed, so a mistake caught before
publish is a message and a mistake caught after is a new table.

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

## This skill is the lifecycle, not the fit check

`storage-fit` runs during the spec and answers two cheap questions: does this deployment need
storage at all, and does its model survive the constraints. It owns those constraints and it
calls no tools.

This skill runs from `implement`, after the spec is agreed, and does the work: design,
validate, test, publish, query. It is the expensive half on purpose.

**Prerequisite: `SPEC.md` records `storage: yes` and carries an entities table.** Not
`storage: blocked`, which means `storage-fit` already judged the model unable to fit: there is
no schema to design and the spec has to change first. If either is
missing, stop and go back. A schema built on a model nobody agreed to is the expensive kind of
wrong, and a fit check skipped here surfaces as a locked schema that does not match the
domain.

## The constraints

`storage-fit` carries them in full: flat records, closed schemas, service-owned fields, two
range fields per table, no joins, identifier rules, additive versions only, record limits.
Read that skill when you need the detail rather than restating it here.

They are not style preferences and they are not applied by hand. The tools below enforce
them, which is the point: a schema that only an agent's reading says is valid has not been
validated.

## The tools this skill depends on

The `machinemetrics` MCP server exposes nine Carbide Data tools, one set per lifecycle
phase. See [tools.md](tools.md) for each tool's contract and
[worked-example.md](worked-example.md) for one schema taken from design to query.

| Phase | Tools |
| :--- | :--- |
| Design | `listCarbideSchemas`, `getCarbideSchema`, `validateCarbideSchema`, `diffCarbideSchema` |
| Test | `validateCarbideRecord`, `seedCarbideRecords` |
| Publish | `publishCarbideSchema` |
| Query | `generateCarbideQuery`, `executeCarbideQuery` |

List the server's tools at the start of a data task. If any of these is missing, stop and
tell the person exactly which tools are absent and that Carbide Data work cannot proceed in
this environment until they are. Do not substitute a manual check for a missing tool. The
constraints in this skill exist to explain what the tools enforce and why, not to be applied
by hand in their place. A schema that only an agent's reading says is valid has not been
validated.

Every Carbide Data tool is shown only to callers whose token carries `custom-data:schema`.
When all nine tools are missing there are two possible causes, and one unauthenticated request
tells them apart:

Run the one for the customer's partition, and only that one. Probing the wrong partition
returns a real answer about a gateway the customer does not use, which makes the diagnosis
confidently wrong:

```bash
# Commercial
curl -s https://agent.machinemetrics.com/.well-known/oauth-protected-resource

# GovCloud
curl -s https://agent.machinemetrics-us-gov.com/.well-known/oauth-protected-resource
```

If you do not already know which partition they are on, `setup` records both, and
`claude mcp list` prints the host the session is actually pointed at. `scopes_supported` lists
`custom-data:schema` whether or not the caller holds it, which is what makes this decisive:

- **Absent.** The environment genuinely does not expose these tools. Say so and stop. Nothing
  client-side will change it.
- **Present.** The environment has it and this caller's grant is narrow. That is fixable, and
  "When the tools are down" says how.

**Do not lead with the IT-administrator role.** Holding `itadmin` is necessary to publish, and
it is rarely why the tools are missing. A field run lost most of a session to that assumption
on an account that held `itadmin` throughout. Check it last, not first, and read it rather
than infer it: `listCarbideSchemas` returns `mayPublish`, and only `mayPublish: false` makes
this a role problem.

## When the tools are down

**The tools are the only path for schema work, and that is not an omission.** A schema that
only an agent's reading says is valid **has not been validated**. The tools are what enforce
the constraints, so hand-rolling HTTP calls to design, validate or publish a schema removes
the guarantee this whole skill exists to provide. When the tools are down, schema work waits.

That is a different question from how a **shipped deployment** reaches its own records, which
it does over HTTP because no MCP tool exists inside a running application. `setup` records the
base URL for each partition, and the service documents its own contract at `<base>/docs` and
`<base>/openapi.json`. Read those rather than inferring routes: a dry run inferred one and it
was wrong three ways at once. The status-code probe recorded alongside those URLs confirms a
path without a credential.

And a gateway can look fine while every call fails. A connector reporting connected with an
expired token is the failure mode that has bitten a live demo: the tools appear present and
return errors. So distinguish these before concluding anything:

| What you see | What it means | What to do |
| :--- | :--- | :--- |
| No Carbide Data tools listed at all | Either the environment does not expose them, or this caller's grant is narrow | Probe `scopes_supported` as above. Absent: name the missing tools and stop. Present: widen the grant, below |
| Tools listed, every call fails | Most likely an expired token behind a connected-looking connector | Re-authenticate, then **probe with a real call** before believing it |
| Tools listed, calls succeed | Proceed | |

### When the scope is there but the tools are not

`scopes_supported` said `custom-data:schema` exists here, and the tools are still missing. The
grant is narrow, not the environment. Three things make this harder to fix than it looks, and
none of them are visible from the tool list:

- **An OAuth refresh can never widen scope.** By spec it returns the same scopes or fewer, so
  refreshing an existing grant cannot acquire one it does not already have.
- **The tool registry is fixed when the session starts.** Even a correct new grant shows
  nothing until a full restart, which makes a successful fix look like a failed one.
- **For a claude.ai-managed connector, no CLI re-authentication can widen it.** Claude Code is
  not the OAuth client; claude.ai brokers the flow and the scope set lives in the connector
  config server-side. `/mcp` disconnect and reconnect reports "Authentication successful" and
  changes nothing. `claude mcp logout` then `login` fails the same way, and the URL it prints
  shows why: it carries no `client_id`, no `scope`, and no `redirect_uri`.

So the remedy is to make Claude Code the OAuth client, by registering the gateway directly
instead of going through the connector. `setup` carries the command and its consequences under
its connector fallback. Use `--scope local` here, because this is a diagnostic override rather
than a permanent install.
Then **restart the session**, and confirm with `listCarbideSchemas`: the result carries both
`scopes` and `mayPublish`, which settles the grant and the role in one call.

Only if `mayPublish` is `false` after that is this a role problem.

**Stop honestly rather than proceeding on assumption.** Say which tools are absent, that
Carbide Data work cannot continue in this environment, and what the person needs to fix. Do
not substitute a manual check, and do not design a schema you cannot validate: its shape is
not guessable and a wrong guess surfaces as a 404 long after the code looks finished.

For a non-production environment, the base URL is not recorded anywhere and is not derivable
from the environment name. Ask the Carbide Data owners for it rather than constructing one
from a pattern.

## Start from what exists

Before designing anything, find out what the company already has. Call `listCarbideSchemas`
first and read three things from the result:

- **The schemas.** Each comes back with its `namespace`, `schemaKey`, description, status,
  current version, and range fields. If one already covers the domain, do not propose a
  second: read it with `getCarbideSchema` and go to "Change a published schema".
- **Status.** A schema is `active`, `deprecated`, or `disabled`. Do not design a view on a
  deprecated or disabled schema without raising it with the person first.
- **`mayPublish`.** Reaching this tool already required `custom-data:schema`, so this should
  be `true`. `false` means the scope did not survive onto the credential the platform minted
  for the service: say so now, carry on with design and validation, and expect the publish
  tool to report a grant problem. Absent means the tool could not tell, which is not the same
  as `false`. Learning this at the start beats learning it from a 403 after the schema is
  designed.

`getCarbideSchema` returns one schema as the service stores it: the current version number,
the current JSON Schema including the service-owned `additionalProperties` and `mapsTo`
keywords, and which fields are range-queryable. It is the only source of truth for a diff.
The service keeps no readable version history, so the current version is all there is.

These are the first tools that call the service through a credential the platform mints on
the caller's behalf. If either returns a 401 from the service, the fault is in that
credential path, not in the person's login and not in anything they typed. Say so and stop.
Do not retry with different inputs, and do not fall back to asking for a token. A 403 is a
different thing. On publish it means the person lacks a scope; see "Publish". On any other
tool it is not a scope problem, because read and record routes require none. The error says
where to look.

## Design, then validate

Before proposing a schema, ask what the interface will filter and sort by. Those answers
pick the two range fields. If there are more than two candidates, the view is doing too
much, or the table should be split. Claiming both slots up front is not required: a later
version can add a new optional range field into a free slot. What is permanent is the
decision for every field that already exists.

When the draft exists, call `validateCarbideSchema` with the `namespace`, `schemaKey`, and
the JSON Schema. Read the result as an answer, not as a failure:

- `valid: true` with an empty `violations` list means the service would accept it.
- Every violation is reported in one pass, each with a `path`, a `message`, and a `remedy`.
  Fix every reported path, then validate once more. Do not retry the same draft.
- `warnings` are non-blocking advice, most often that fewer than two range fields are
  claimed. Raise each warning with the person and record the decision. One warning needs
  no action: if the draft came from a published schema, the tool reports that it ignored
  the service-owned `additionalProperties` and `mapsTo` keywords.

The tool is deliberately stricter than the service in two places: it requires at least one
declared field and a declared type on every field, where the service would accept an empty
or untyped declaration. Treat the tool's answer as the standard.

Validate every draft, including small edits. The tool is fast and has no side effects.

## Change a published schema

Never edit a published schema by intuition. "Add a field" and "rename a field" look equally
small and are not remotely equivalent here.

1. Get the current shape from `getCarbideSchema`. Do not work from memory or from the
   deployment's code. The result carries `additionalProperties: false` and `mapsTo` on
   range fields. Pass it through unchanged: both tools ignore those keywords and say so,
   and they never count as a change.
2. Call `diffCarbideSchema` with the current schema and the proposed one.
3. Act on the classification:
   - `NO_CHANGE`: nothing to publish.
   - `ADDITIVE_VERSION`: publishable as a new version. Records written before the version
     report the new fields as absent. Match them with `field[null]`, not `field[exists]`.
   - `BREAKING_NEW_SCHEMA`: the result lists which changes are breaking and why. The remedy
     is a new `schemaKey`. Say plainly that no data moves from the old table to the new one
     and ask how existing records should be handled before anything is published.

## Test the schema with records

A schema that validates and then rejects every realistic record was not caught in time.
Before publishing, write three or more records the way the deployment would actually
produce them and call `validateCarbideRecord`. Before publish, pass the draft `jsonSchema`
inline; after, pass the `namespace` and `schemaKey`. Records are field values only, not
wrapped in `data`. It checks that every field is declared, every required field is present,
every value matches its declared type without coercion, enums hold a permitted value, and
date-times are RFC 3339. Invalid records come back as an answer, not an error.

After publish, `seedCarbideRecords` creates sample records so the query interface can be
exercised and a view can be looked at against real rows. It validates every payload before
writing anything and refuses the whole call if any is invalid, then writes one record at a
time. The writes are not atomic: if one fails part way, the result says `partiallyWritten`
and lists the ids that landed, and seeding again would duplicate them. Pass `externalKeys`
so a retry is safe. It requires an explicit `confirm: true`.

## Publish

Publishing is the irreversible step and the most guarded. `publishCarbideSchema` re-runs
validation, requires an `ADDITIVE_VERSION` diff for an existing `schemaKey`, requires
`confirm: true`, and removes the service-owned `additionalProperties` and `mapsTo` keywords
before posting, since the service rejects them on input.

Every Carbide Data tool is gated at the gateway on `custom-data:schema`, and the service
requires the same scope again on its three schema-write routes. Reading and writing records
needs no scope at the service. If publish answers 403, the scope was on the token at the
gateway and not on the credential the platform minted for the service. That is a grant
problem, not a schema problem. Say so, and do not rewrite the schema in response.

## Query the records

The deployed view reads records over the service's HTTP query interface with the end user's
token. A tool must never produce a query the view could not issue itself. Give
`generateCarbideQuery` the intent as structured filters (`field`, `op`, `value`), a `sort`
and `order`, paging, and whether a total is wanted. It builds the query string and refuses
what the service would reject or silently change: range operators or `sort` on anything but
a range field or a built-in timestamp, filters on undeclared fields, `in` on a
range-queryable date-time field or with more than 100 values, an operator that does not
exist, and `order` without `sort`. A refusal comes back as `usable: false` with reasons.
Read them; do not retry the same intent. Filters all combine with AND on one table. There
is no `OR` across fields, no join, and no aggregate other than the optional exact count.
What the interface cannot express, the deployment computes in its own code from the rows it
fetches. Pass the `query` string to `executeCarbideQuery`, which resolves the schema and
returns the records.

Paging: `limit` defaults to 20 and is clamped to 100; the tool states the clamp rather than
letting anyone believe they got more rows. `offset` starts at 0. Without `sort`, results
come back newest-updated first. `total_count=true` adds an exact `totalCount`.

## Never do these from an agent

- Delete a schema or a record. The service has delete routes: a record delete is soft and
  hides the record from every read, and a schema delete permanently removes every version
  and every record under it. The tools do not expose either. That stays in the admin UI,
  with a person.
- Hold or cache record data anywhere outside the service. The service applies row-level
  tenancy; a copy does not.
- Generate a query for the build session that the deployed view could not run in production.

## If it turns out not to fit here

`storage-fit` should have caught this during the spec. If it surfaces now, stop rather than
contorting the model into flat tables: that produces a deployment that works in the demo and
fails in the second month. Say which part needs the customer's own service, and send the spec
back.

## Next

Return to `implement`. Deciding the schema is not the same as knowing how a deployment reads
and writes it: that contract lives in the installed template and the package's `examples/`,
and `implement` covers it. Do not hand a schema to a build without also settling the client,
the hook, and the auth it uses.
