---
name: carbide-data
description: Design, validate, evolve, test, publish, and query Carbide Data schemas with the machinemetrics MCP tools. Use when SPEC.md records storage: yes and a schema has to be built, changed, seeded, published, or queried, or when a Carbide Data tool returns an error that needs interpreting. For the cheaper question of whether a deployment needs storage at all and whether its model fits, use storage-fit during the spec instead.
---

# Carbide Data

Carbide Data is deployment-owned storage for a `project` that needs to record its own data.
It is deliberately narrow. Your most valuable job here is recognising when a design does not
fit, and saying so early. A published field can never be changed, so a mistake caught before
publish is a message and a mistake caught after is a new table.

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

Run the one for the account's partition, and only that one. Probing the wrong partition
returns a real answer about a gateway the account does not use, which makes the diagnosis
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

For a non-production environment, the base URL is not derivable from the environment name. A
deployment reads it off the library rather than being told it, which the runtime section below
covers. Where there is no resolved value to read, ask the Carbide Data owners rather than
constructing one from a pattern.

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

**Close the spec's row when this succeeds.** A data-source row that writes to this table reads
`schema pending` until now. Replace it with the published `schemaKey` and version, so the row
records a table that exists rather than one that was intended.

Publishing is the irreversible step and the most guarded. `publishCarbideSchema` re-runs
validation, requires an `ADDITIVE_VERSION` diff for an existing `schemaKey`, requires
`confirm: true`, and removes the service-owned `additionalProperties` and `mapsTo` keywords
before posting, since the service rejects them on input.

Every Carbide Data tool is gated at the gateway on `custom-data:schema`, and the service
requires the same scope again on its three schema-write routes. Reading and writing records
needs no scope at the service. If publish answers 403, the scope was on the token at the
gateway and not on the credential the platform minted for the service. That is a grant
problem, not a schema problem. Say so, and do not rewrite the schema in response.

## Reading and writing from the deployed code

**Use the library's `request` helper.** It carries the API credential, mints a fresh one when
the held one is close to expiry, and replays an idempotent call once on a 401 before treating
the refusal as real:

```tsx
const { request, urls } = useMMAuth();
const page = await request(`${urls.customDataUrl}/<namespace>/<schemaKey>?${query}`);
```

If a call has to be built by hand, take the credential from the store and read it per use rather
than holding it:

```tsx
const credential = useCredential('api');   // in render, re-renders on refresh
const { getCredential } = useMMAuth();     // getCredential('api') inside a callback

const page = await fetch(`${urls.customDataUrl}/<namespace>/<schemaKey>?${query}`, {
  headers: { Authorization: `Bearer ${credential}` },
});
```

**Use the `'api'` purpose.** The store holds `'api' | 'graphql' | 'nats'`, and `'api'` is the
platform's user token: a short-lived JWT the login server signs and publishes keys for, carrying
the signed-in user and their `companyId`. Carbide Data verifies exactly that. **Pick by
destination**: Hasura takes `'graphql'`, and Carbide Data, the other MachineMetrics services and
the deployment's own server all take `'api'`.

The service reads the bearer and takes one of two paths: a token beginning `st-` is introspected
as a service token, and anything else is verified as a JWT against those published keys, with
`companyId` read from its claims. There is no third path, and a bearer that is neither is refused
without reaching any of the storage logic.

**Never hold the credential.** It is short-lived and the library replaces it before it expires,
so a copy taken at mount is the previous one by the time anything uses it. The store's own
contract says it: read per use, never cache. In render that is `useCredential('api')`, which
re-renders the component when the value changes; in a callback it is `getCredential('api')`,
called inside the call rather than captured around it.

Passing the credential as a value is the same mistake wearing a different hat. A helper that
takes `token: string` freezes whatever was current when the caller read it. One that takes
`getToken: () => string | null` cannot.

**`isAuthenticated` is the gate, and it is enough.** It turns true once a usable credential is
held, not when the sign-in is known, so a call made after it can carry one. A surface that shows
a spinner until then is showing the truth rather than being cautious.

Keep the request function's identity independent of the credential, so a mount-time fetch does
not fire again on every rotation. The library's own links are built that way: they wait up to
fifteen seconds for a credential to land rather than sending a bearer that is not there, and give
up with a `credential_timeout` network error instead of a confusing rejection from the service.

**What a 401 means depends on the method.** On an idempotent request the library mints a fresh
credential and replays once, and a second refusal signs the user out. On anything else it throws
`UNAUTHORIZED` and leaves the session alone.

That asymmetry is worth designing around. A refusal that is not about freshness, a scope or a
tenancy problem, will end the session on a read, and a surface that polls every few seconds will
reach that verdict quickly and land the operator back at login with nothing explaining why.
Surface a second refusal where someone can see it rather than letting a poll keep asking.

**A refusal to issue a credential at all is a different failure, and it names itself.** When the
mint is refused the library raises a `CredentialError` carrying the server's own code, such as
`jwt_bearer_not_allowed`, and the same error appears as `authError`. It stops retrying for that
sign-in, because repeating a refusal only produces the refusal again. Show the code: it says
which side refused and why, which no amount of retrying will. Transient failures, a network drop
or a 5xx, are the ones that retry, after a short backoff.

**`GET /whoami` answers what the service thinks the caller holds.** It returns `companyId` and
the `scopes` the service parsed from the same token, so a scope check asks the service rather
than decoding a token in the browser and hoping the two agree. Ask once a credential is held,
and treat "not yet known" as its own state rather than as a denial: a check that runs early and
caches the refusal hides the scope for the life of the component.

**Take the base URL from the library, not from a constant.** `mm-react-tools` resolves
`customDataUrl` per release stage and exposes it as `useMMAuth().urls.customDataUrl`, so a
GovCloud deployment reaches the GovCloud service by setting `releaseStage: "govcloud"` and
nothing else. A hardcoded host is a deployment that talks to Commercial from GovCloud and looks
fine doing it. The `development` stage has no `customDataUrl`, which is the shape to expect
rather than a fault to work around.

**If a deployment signs in and bounces straight back to login, look for a read that keeps being
refused.** A refusal the library cannot fix by minting again ends the session on the second
attempt, the route guard redirects to login, and the sign-in mints a credential that is refused
the same way. It is a loop rather than a failure, and its cause is nowhere near the symptom: do
not start on redirect URIs, client ids or scopes.

**Start with what the service says about the caller**, since the refusal is about authority
rather than freshness. `GET /whoami` names the company and the scopes the service parsed, which
separates a wrong tenant from a missing scope in one call. A poll is the usual accomplice: it
reaches the second refusal within seconds of sign-in, so the loop looks instant and nothing in
the log names the read that caused it.

## Query the records

The deployed view reads records over the service's HTTP query interface with the JWT above. A tool must never produce a query the view could not issue itself. Give
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

**The collection response puts the rows under `items`.** The deployment's own HTTP read gets
the same envelope the tool does:

```json
{ "items": [ { "id": "...", "revision": 1, "data": { } } ], "limit": 100, "offset": 0, "totalCount": 3 }
```

Decode that, and nothing else. A decoder written to accept a bare array, or `records`, or
`data`, decodes every real response to zero rows: writes land, storage holds them, and both
screens stay empty, which reads as a broken write and sends the search to the wrong half of
the system. Tests do not catch it, because a hand-written fake returns whatever shape its
author assumed and then agrees with them. **Make the fake return this envelope.**

Build that fixture by hand, in the real shape. Do not paste a live response into the project:
the rows belong to whoever wrote them, and a fixture outlives the session it was captured in.
Verify against the real service at the exit gate, where the response is read and not kept.

### Writing and changing a record

The MCP tools do not expose record writes, so this is the deployment's own HTTP call. Address
records by namespace and schema key, the way the rest of the toolchain addresses schemas:

```
POST /<namespace>/<schemaKey>              body: { data }
PUT  /<namespace>/<schemaKey>/<recordId>   body: { data, revision }
```

**A change carries the revision the record had when it was read**, and a write whose revision is
behind is refused with 409 rather than applied. So a read that only wanted to display a row still
has to keep the `revision` beside it if anything might later change that row.

**Treat the 409 as a fact about the world, not an error.** Two people acted on one record and the
service arbitrated. Re-read, and tell the person what happened in those terms: someone else got
there first. Do not retry a 409 automatically, which would silently overwrite the other person's
work; that is the whole point of the check.

**That is also the mechanism for a claim.** A surface where one person takes a piece of work
needs no lock of its own: write the claim with the revision that was read, and the second
claimant's write is refused by construction. What the design owes is the sentence the loser sees.

There is a newer `/schemas/<schemaId>/records` form. Prefer the namespace paths above anyway,
because every Carbide tool addresses schemas that way and the alternative means carrying a
schema uuid through the deployment for no gain.

## Never do these from an agent

- Delete a schema or a record. The service has delete routes: a record delete is soft and
  hides the record from every read, and a schema delete permanently removes every version
  and every record under it. The tools do not expose either. That stays in the admin UI,
  with a person.
- Hold or cache record data anywhere outside the service. The service applies row-level
  tenancy; a copy does not.
- Generate a query for the build session that the deployed view could not run in production.
- Hold the credential. The library replaces it before it expires, so a copy taken at mount is
  the previous one by the time anything uses it, and the refusal that follows reads as a
  permission problem when it is a stale copy.
- Retry a 409 automatically. Two people acted on one record and the service arbitrated; a retry
  overwrites the one who got there first, which is the thing the check exists to prevent.
- Let a polling surface keep asking after a refusal the library cannot fix by minting again.
  It reaches the sign-out verdict within seconds and lands the operator at login with nothing
  on screen explaining why.

## If it turns out not to fit here

`storage-fit` should have caught this during the spec. If it surfaces now, stop rather than
contorting the model into flat tables: that produces a deployment that works in the demo and
fails in the second month. Say which part needs their own service, and send the spec
back.

## Next

Return to `implement`. Deciding the schema is not the same as knowing how a deployment reads
and writes it: that contract lives in the installed template and the package's `examples/`,
and `implement` covers it. Do not hand a schema to a build without also settling the client,
the hook, and the auth it uses.
