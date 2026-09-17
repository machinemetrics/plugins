---
name: storage-fit
description: Decide whether a deployment needs its own storage, and whether its domain model fits Carbide Data before anyone commits to it. Use during the spec when an entities table exists and the storage question is open, when someone asks whether a design can be stored, when a model involves nesting, joins, or many sortable fields, or when deciding between Carbide Data and their own backend. This is the cheap check that runs before any schema work.
---

# Does it need storage, and does it fit?

One exchange, during the spec. This skill answers two questions and writes the answer into
`SPEC.md`. It does **not** design a schema, call any tool, or write code.

It exists because the answer is cheap now and expensive later. Carbide Data is append only
and a published field can never be changed, so a model that does not fit is a sentence during
the spec and a new table after publish.

## Working with the developer

They decide what gets built, and they may know their shop floor better than they know React or
OAuth. That changes what you explain, never how much you assume.

- **Consequence first, then the detail.** One plain sentence about what it means for what they
  are building, then the technical part.
- **Name the phase, not the machinery.** "That settles the spec, so we can start building"
  tells them where they are. Gates, routing and section numbers stay out. Give the reason for a
  step, never a citation.

**Report what needs action, not what you did.** A developer who would have been happy with
"all good, let's start" should get roughly that. What earns a line:

- A check that failed, or that changed something. Everything that passed is one sentence:
  "prerequisites, DNS and ports all check out." A table of green rows is the report working for
  you rather than for them.
- One question at a time. Where two are open, ask the one blocking the next step and hold the
  other until it matters.
- Name the call, do not justify it. "Checking the gateway" orients them in three words.
  "Probing the gateway with a cheap docs query, so this call is a check and not a detour" is the
  skill's own reasoning read aloud, and they cannot see the skill that would make it land.

Length is the symptom worth watching. A handoff that runs past a screen is usually reporting
the work rather than the result.

**They are a peer with a different access surface.** They build against their own MachineMetrics
organisation, on production or GovCloud, with no internal environment to fall back on and no way
to undo a platform mutation from the CLI. That changes which options exist.

Friendly does not mean vague. Every number, check and caveat stays exactly as precise as it is:
that precision is what catches errors before they reach the shop floor. It governs the
numbers you do give, not how many of them you give.
## 1. Does it need storage at all?

Many deployments only read MachineMetrics production data and record nothing of their own. If
nothing is recorded by the deployment itself, say so, write `storage: no` in `SPEC.md`, and
stop. Do not create tables and do not go further down this page.

**If setup already established that this account cannot hold the `custom-data:schema` scope,
that settles it before the model does.** Nothing that stores its own records is buildable from
the account, however well the model would have fitted, so write `storage: blocked` with that as
the reason and return to `spec`. Do not re-run the grant check to confirm: setup ran it once and
a second attempt reaches the same wall more slowly. The rest of this page is about whether a
model fits, which is a different question and not the one in the way.

**Reading is not evidence either way, and where it reads from is a separate question.** The
MCP tools are how *this session* reaches the platform while designing. A *shipped* deployment
has no MCP tools: it reads the platform over the GraphQL API, and reaches its own records, if
it has any, over the Carbide Data HTTP interface `setup` records per partition. Do not
conclude `storage: no` because the tools answered a question here, and do not design a runtime
read path around them.

**Storage means the deployment keeps something.** Data it captures and must still have later:
a logged changeover, a note against a machine, an acknowledgement. If the deployment would be
wrong after a refresh without it, it is stored.

**Transient interface state is not storage.** A machine picker, a filter, a date range, a
selected tab, a sort order: these live in the component and vanish on reload, and treating
them as storage sends an ordinary read-only view down the Carbide Data path for nothing. The
test is whether anyone would notice the value was gone tomorrow.

**That is a property of the API, not a preference.** The MachineMetrics GraphQL API exposes no
mutations at all:

```graphql
{ __schema { mutationType { name } } }
```

returns `{"mutationType": null}`. Nothing a deployment captures can be written back to the
platform, so every captured field needs a store of its own. There is no design that avoids
this by writing into MachineMetrics instead, and it is worth saying out loud when someone
proposes one.

## 1b. Should something that already exists own this?

Between "does it need storage" and "does it fit" sits a question neither answers, and it is
theirs to answer rather than yours to probe:

> Does a system you already run own this today? Your ERP, a maintenance system, a spreadsheet
> somebody maintains? If it does, should this application read from it instead of keeping its
> own copy?

A deployment that records what the shop already records somewhere else creates a second
source of truth, and the two disagree within weeks.

**Ask it. Do not go looking.** Do not probe ERP tables to decide: on many tenants they are
present and empty, and a design built on what a schema *could* hold rather than on what the
shop *actually* uses is exactly the stale specific this skill exists to avoid. The developer
knows whether their ERP is real. The schema does not.

**That rule is about the shop's own systems, not about MachineMetrics.** Whether MachineMetrics
already holds this is a question to answer by querying the account, and `spec` says so and owns
it. The two do not conflict: you cannot see inside their ERP, and you can see inside the
platform, so ask about the first and check the second. If the platform turns out to own the
whole request, that is `spec`'s "build nothing" outcome rather than anything this skill decides.

If the answer is yes and the data is reachable, that is a `spec` change rather than a storage
decision, so send it back. If it is yes but unreachable, record that in `SPEC.md` and carry
on: a deliberate second copy is a different thing from an accidental one.

## 2. Does the model fit?

Read the entities table in `SPEC.md` and the five shape questions the spec asked. Check them
against the constraints below. If there is no entities table, the spec is not finished: send
it back rather than inventing one.

The five questions map onto the constraints directly:

| Question from the spec | What it decides |
| :--- | :--- |
| Is anything nested? | Flat records: no nested objects, no arrays of objects |
| Does anything need a join? | No joins. Relationships are a convention in the deployment's own code |
| What has to be sorted or range-filtered? | Two range fields per table, and no more |
| What has to be corrected after the fact? | Versions add optional fields and nothing else |
| How long does it live? | Records follow the latest version, and schema deletes are permanent |

## The constraints, in full

These are not style preferences. Working around them produces a deployment that breaks.

- **Flat records.** The root declares `"type": "object"` literally and a `properties` map.
  Every field is a scalar (string, number, integer, boolean, null), a union of scalars such
  as `["string", "null"]`, or an array of scalars. No nested objects, no arrays of objects,
  no nested arrays.
- **Closed schemas.** Every field is declared. A record carrying an undeclared field is
  rejected on write. The service closes the schema itself, so do not declare
  `additionalProperties`. It also rejects `$ref`, `$defs`, `allOf`, `anyOf`, `oneOf`, `not`,
  `if`, `then`, `else`, `contains`, `prefixItems`, `additionalItems`, `patternProperties`,
  `unevaluatedProperties`, and `unevaluatedItems` anywhere in the schema. Ordinary
  constraints such as `enum`, `const`, `pattern`, `minimum`, `maximum`, `minLength`,
  `maxLength`, `minItems`, and `uniqueItems` are allowed and enforced on every write. They
  are part of the field's definition, so widening an `enum` later is a new schema, not a
  version. Among formats only `date-time` is enforced.
- **Service-owned fields on every record.** A record is returned as `id`, `externalKey`,
  `schemaVersion`, `revision`, `createdAt`, `updatedAt`, and `data`. The deployment's own
  fields live under `data`. In query parameters the timestamps are spelled `created_at` and
  `updated_at`. A schema may not declare `created_at`, `updated_at`, `createdAt`, or
  `updatedAt` as fields, in any letter case. Avoid field names `id`, `limit`, `offset`,
  `sort`, `order`, and `total_count`: they collide with the record envelope or with query
  parameters and cannot be filtered by plain equality.
- **Two range fields per table.** A field marked `"queryable": "range"` is lifted to a real
  indexed column. At most two per schema, each a single non-union type: `number`, `integer`,
  or `string` with `"format": "date-time"`. Only these fields, plus the built-in
  `created_at` and `updated_at`, can be sorted on or range-filtered, and only they compare
  date-times as instants. Every other field is matched by equality, `[in]`, `[exists]`, or
  `[null]`; a date-time field that is not range-queryable compares its literal RFC 3339
  spelling. On an array field, equality and `[in]` match individual elements; `[exists]`
  and `[null]` test the field itself. Repeating a parameter ANDs the two conditions. Numeric
  range columns are double precision, so integers above 2^53 lose precision in range
  filters and sorts. The service assigns the physical column itself, recorded as `mapsTo`
  on the field, and closes the root with `additionalProperties: false`. Both come back on
  every read of a published schema. Never write either one yourself: the service rejects
  them on input.
- **No joins.** Relationships between tables are a convention in the deployment's own code,
  using shared key fields. The service does not enforce them and cannot filter one table by
  a property of another.
- **Identifiers.** `namespace` and `schemaKey` use ASCII letters, digits, `-`, and `_`, at
  most 64 characters. `namespace` becomes a URL path segment and may not be `docs`,
  `schemas`, `health`, `readyz`, or `whoami`, in any letter case.
- **Versions add optional fields and nothing else.** A new version of a schema may add new
  optional fields. It may not remove a field, change any existing field's definition, or
  change the `required` list. Renaming, retyping, or making a field required is a new schema
  with a new `schemaKey`, and there is no record migration path between schemas. A new
  optional field may claim a free range slot; an existing field can never become
  range-queryable or stop being one.
- **Records follow the latest version.** Records are not pinned to the version they were
  written under. An update validates the whole record against the latest version and
  restamps it. Records written before a field existed report it as absent: match them with
  `field[null]`, not `field[exists]`.
- **Schema description.** At most 500 characters, set when the schema is created, and not
  editable afterwards.
- **Record limits.** A record payload is a JSON object. `externalKey` is an optional
  business key of at most 255 characters, unique per schema among live records: a duplicate
  is a 409. An update replaces `externalKey`, so omitting it clears it. Date-time values are
  RFC 3339. Updates and deletes must carry the record's current `revision`; a stale one is a
  409. Write bodies accept only `externalKey` and `data`. Record deletes are soft and hidden
  from every read; schema deletes are permanent.

## When it does not fit, say so

If the domain needs joins, nested structures, or filtering one table by a property of
another, Carbide Data is the wrong home for it. The deployment should build its own backend
and use Carbide Data for the parts that do fit, or not at all.

Name this early. Contorting a domain model into flat tables produces a deployment that works
in the demo and fails in the second month. It is better to say "this part needs your own
service" during the spec than after publish, when the schema is locked.

## The trap worth stopping on: enums are permanent

**A constraint is part of a field's definition, so widening an `enum` later is a new schema,
not a version.** There is no migration path between schemas, so an `enum` on a field whose
purpose is to be configurable by the shop is a decision nobody can undo.

It fails silently and late. Nothing breaks at publish, nothing breaks in testing, nothing
breaks for a year. It breaks the day someone adds a fifth escalation target and finds the
field will not take it.

Ask this directly, for every field with a fixed list of values:

> Will this list ever change? Who decides, and would they expect to change it themselves?

If the shop would expect to edit the list, the field is a plain `string` with the allowed
values enforced in the interface, not an `enum` in the schema.

**The test is whether the set is invariant, not who defines it.** A deployment-owned list is
fine as an `enum` when it cannot sensibly grow: the worked example in `carbide-data` puts
`["completed", "abandoned"]` on an outcome field, and a changeover is one or the other
forever. Platform-defined values qualify for the same reason, not because the platform owns
them.

In one dry run three fields whose entire purpose was to be shop-configurable were about to be
given enums. Asking this question is what stopped it.

## 3. Write the verdict

Three outcomes, and say which one plainly:

| Verdict | Write in `SPEC.md` | Then |
| :--- | :--- | :--- |
| Nothing to store | `storage: no` | Return to `spec`. `implement` skips storage entirely |
| Fits | `storage: yes` | Return to `spec`. `implement` invokes `carbide-data` for the lifecycle |
| Does not fit | `storage: blocked`, and which part needs their own service | Return to `spec`. The spec has to change before anyone builds |

**`blocked` is a third value, not a flavour of `yes`.** `yes` is the marker `start` and
`implement` read as "go and build the schema", so writing it for a model this section has
just refused would send the next step straight into `carbide-data` to design something that
cannot exist. A `blocked` spec is unfinished: `start` routes it back to `spec`, and
`implement` refuses to start.

Do not hedge. "Probably fits" is the answer that costs a table later.

## Next

Return to `spec` so the gate can close.

Do not design a schema, validate anything, or call a Carbide Data tool from this skill. That
is the `carbide-data` skill, and `implement` invokes it once the spec is agreed. Splitting the
two is deliberate: this check has to be cheap enough to run during a conversation, and the
lifecycle is not.
