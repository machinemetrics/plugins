# Carbide Data tools

The `machinemetrics` MCP server exposes these tools for working with Carbide Data schemas
and records. They exist at build time only. The deployed view reads and writes records over
the service's HTTP interface, using the library's authenticated `request` helper, and does not
call these tools. `SKILL.md` covers that path.

Every tool reads the caller's company from the connection. None takes a company as input.
List the server's tools before relying on any of them. If one is missing, Carbide Data work
cannot proceed in this environment: say which tools are absent and stop.

Two layers of authorization apply, and they use the same scope name for different checks.
The gateway exposes every Carbide Data tool only to a token carrying `custom-data:schema`,
which only an IT administrator can hold and which the connecting client must have requested.
A caller without it sees none of these tools. Separately, every tool except the three pure
ones (`validateCarbideSchema`, `diffCarbideSchema`, and `validateCarbideRecord` with an
inline draft) calls the service through a credential the platform mints for the caller, and
the service applies its own authorization to that credential. The table below describes the
service's responses, which come back as errors with one of these meanings:

| Service response | Error code | Meaning |
| :--- | :--- | :--- |
| 401 | `AUTH_REQUIRED` | The minted credential path failed. Not the caller's login, not the input. Report it and stop. |
| 403 on `publishCarbideSchema` | `AUTH_REQUIRED` | The service requires `custom-data:schema` on its schema-write routes and the minted credential lacks it. The gateway shows publish only to tokens carrying the scope, so reaching this means the scope was lost between the gateway and the service. Not a schema problem. |
| 403 on any other tool | `AUTH_REQUIRED` | The service requires no scope on its read and record routes, so a missing service grant cannot explain it. Look at the company the credential resolves to, and at any gateway policy in front of the service. |
| 404 | `NOT_FOUND` | No schema under that `namespace` and `schemaKey`. List the schemas to see what exists. |
| 5xx | `API_ERROR` | The service was reached and failed. Not a problem with the request. |
| Other 4xx | `API_ERROR` | The service rejected the request; the status is reported. A 409 on a record write is a duplicate `externalKey`. |
| No tenant on the request | `AUTH_REQUIRED` | No credential could be minted. The company comes from the verified credential, never from tool arguments. |

### `validateCarbideSchema`

Checks a draft schema against what the service will accept, before publish. Pure: no
network, no side effects.

**Input**

| Field | Meaning |
| :--- | :--- |
| `namespace` | Logical grouping, such as `workflow` or `erp`. Becomes a URL path segment. |
| `schemaKey` | Table name within the namespace, such as `setup_event`. |
| `jsonSchema` | The draft JSON Schema. Root declares `"type": "object"` and a `properties` map. A schema read from the service carries `additionalProperties: false` and `mapsTo`; both are ignored and reported in `warnings`. Do not add either yourself. |

**Output**

| Field | Meaning |
| :--- | :--- |
| `valid` | `true` when the schema passes every check. |
| `violations` | Blocking problems. Each has `path` (`#` is the root), `message`, and `remedy`. Empty when valid. |
| `warnings` | Non-blocking advice. Present even when valid. Includes a note when service-owned keywords were ignored. |

**What it checks**

- Root is an object schema with at least one declared property. A type union at the root
  is rejected.
- None of `$ref`, `$defs`, `additionalProperties`, `additionalItems`, `allOf`, `anyOf`,
  `oneOf`, `not`, `if`, `then`, `else`, `contains`, `prefixItems`, `patternProperties`,
  `unevaluatedProperties`, or `unevaluatedItems` appears anywhere. One exception: a root
  `additionalProperties: false`, the exact form the service writes on read, is ignored and
  reported as a warning. Any other value, or the keyword anywhere below the root, is a
  violation.
- Every field declares a scalar type, a union of scalar types such as `["string", "null"]`,
  or is an array whose `items` declares a scalar type. No object fields, no arrays of
  objects, no nested arrays, no array without `items`, no open `items: {}` or `items: true`.
- At most two fields carry `"queryable": "range"`, each a single non-union `number`,
  `integer`, or `date-time` string. `queryable` takes only the value `range`. A `mapsTo`
  is ignored when it is the service's own (`range1` or `range2` on a range field) and a
  violation otherwise.
- `namespace` and `schemaKey` are non-empty, at most 64 characters, ASCII letters, digits,
  `-` and `_` only. `namespace` is not a reserved path segment, in any letter case.
- No field named `created_at`, `updated_at`, `createdAt`, or `updatedAt`, in any letter
  case.
- `required` is an array and every entry names a declared field.
- Warning: fewer than two range fields claimed. A free slot can still be claimed later by a
  new optional field, but no existing field can ever become range-queryable.

**Where it is stricter than the service.** The service accepts an empty `properties` map,
a field with no declared type, and any value of `queryable` other than `range` (which it
ignores). It discards any supplied `mapsTo` rather than rejecting it, where the tool only
ignores the exact form the service writes. The tool refuses all of these so a draft says
what it means. Treat the tool's answer as the standard.

**Reading the result.** A schema with violations returns successfully with `valid: false`.
That is the tool answering the question, not failing. Every violation is reported in one
pass. Fix each `path`, then validate once more.

### `diffCarbideSchema`

Classifies a proposed change to a published schema. Pure: both schemas are passed inline.

**Input**

| Field | Meaning |
| :--- | :--- |
| `currentJsonSchema` | The published schema as it stands, exactly as read from the service. Its `additionalProperties: false` and `mapsTo` keywords are ignored and never count as a change. |
| `proposedJsonSchema` | The schema you want to move to. |

**Output**

| Field | Meaning |
| :--- | :--- |
| `classification` | `NO_CHANGE`, `ADDITIVE_VERSION`, or `BREAKING_NEW_SCHEMA`. |
| `changes` | One entry per change, with `field` when field-scoped, `message`, and `breaking`. |
| `remedy` | What to do next, always populated. |

**What is breaking.** Removing a field, adding a required field, changing any part of an
existing field's definition (including adding or removing its range marker), changing the
`required` list in either direction, claiming more range slots than remain, or changing any
root-level keyword such as `type`. A rename appears as a removal plus an addition, because
no data moves between them. Only adding new optional fields is additive, and a new optional
field may claim a free range slot.

**Where it is stricter than the service.** The service compares only `properties` and
`required` between versions and ignores root-level annotations such as a `description` or
`title` inside the JSON Schema. The tool reports any root keyword change as breaking. That
is a conservative refusal, not a service rule: if only an annotation changed, say so.

### `listCarbideSchemas`

Lists the company's schemas and reports whether this session may publish. Read-only. Start
here rather than proposing a schema that already exists.

**Input**

| Field | Meaning |
| :--- | :--- |
| `limit` | Optional. Page size, 1 through 100. |
| `offset` | Optional. Rows to skip, 0 or more. |

**Output**

| Field | Meaning |
| :--- | :--- |
| `schemas` | One entry per schema: `id`, `namespace`, `schemaKey`, `description`, `status` (`active`, `deprecated`, or `disabled`), `currentVersion`, and `rangeFields`. Here `rangeFields` is a list of field names only; `getCarbideSchema` returns each with its `mapsTo` column. |
| `mayPublish` | `true` when the service reports the caller holding `custom-data:schema`. `false` when it reports the caller does not. Absent when it could not be determined, which is not the same as `false`. |
| `scopes` | The effective scopes the service sees for this caller, read from its `whoami` endpoint. |
| `note` | Present when something needs saying, such as `mayPublish` being unknown. |
| `limit`, `offset` | The page returned. |

The `id` is what the record routes are keyed by. `mayPublish` is asked of the service, not
of the connection, so it reflects what the minted credential actually carries.

### `getCarbideSchema`

Fetches one schema exactly as the service stores it. Read-only. This is the source of truth
for `diffCarbideSchema`'s `currentJsonSchema`.

**Input**

| Field | Meaning |
| :--- | :--- |
| `namespace` | The schema's namespace. |
| `schemaKey` | The schema's key within the namespace. |

**Output**

| Field | Meaning |
| :--- | :--- |
| `id` | The schema id. Record routes are keyed by it. |
| `namespace`, `schemaKey`, `description`, `status` | As listed. |
| `currentVersion` | The latest version. Record updates validate against it. The service keeps no readable history of earlier versions. |
| `jsonSchema` | The current JSON Schema verbatim, including `additionalProperties: false` at the root and `mapsTo` on each range field. Pass it to `diffCarbideSchema` unchanged; that tool strips the service-owned keywords itself. |
| `rangeFields` | Each range-queryable field with `mapsTo`, the physical column the service assigned. |

### `validateCarbideRecord`

Dry-runs record payloads against a schema and reports field-level problems. Writes nothing.
With an inline draft it is pure and needs no credential.

**Input**

| Field | Meaning |
| :--- | :--- |
| `jsonSchema` | Optional. A draft schema to validate against. Takes precedence over `namespace` and `schemaKey`. |
| `namespace`, `schemaKey` | Optional. Together, validate against the published schema instead. One of the two forms is required. |
| `records` | One or more record payloads, as field values. Do not wrap them in `data`. |

**Output**

| Field | Meaning |
| :--- | :--- |
| `allValid` | `true` when every record passes. |
| `records` | One report per record: `index` in the array you sent, `valid`, and `violations`, each with `field`, `message`, and `remedy`. |

**What it checks**

- The record is a JSON object.
- Every field is declared in the schema. One undeclared field rejects the whole record at
  write time, because schemas are closed.
- Every required field is present and not `null`.
- `null` appears only where the field's type permits it.
- Arrays are arrays, and every element matches the declared item type.
- Scalar values match the declared type. Values are not coerced: `"62.5"` is a string, not
  a number.
- An `enum` field holds one of its permitted values.
- A `date-time` field is an RFC 3339 timestamp. A bare date is not.

Invalid records return `allValid: false`, not an error. That is the tool answering the
question.

### `seedCarbideRecords`

Writes sample records under a published schema so the query interface and a view can be
exercised against real rows. Requires only a valid token.

**Input**

| Field | Meaning |
| :--- | :--- |
| `namespace`, `schemaKey` | The published schema. |
| `records` | 1 to 100 record payloads, as field values. |
| `externalKeys` | Optional. One `externalKey` per record, matched by position. Makes a seed re-runnable, since a duplicate key is refused rather than written twice. |
| `confirm` | Must be `true`. This writes to real account data. |

**Output**

| Field | Meaning |
| :--- | :--- |
| `created` | One entry per written record: `index`, `id`, `revision`, `schemaVersion`. |
| `partiallyWritten` | `true` when a write failed after earlier records had landed. |
| `note` | Present on a partial write: where it stopped, how many landed, and that seeding again would duplicate them. |

Every payload is validated before anything is written. If any fails, the call returns an
error, nothing is written, and the message names the failing records; run
`validateCarbideRecord` for the full report. Records are then written one request at a
time, because the service has no batch route. A failure part way, such as a duplicate
`externalKey`, stops the batch and returns success with `partiallyWritten: true` and the
ids that landed. There is no rollback. Use `externalKeys` so a retry does not duplicate.

### `publishCarbideSchema`

Creates a schema or adds an additive version. The irreversible step, and the most guarded.
Requires the `custom-data:schema` scope.

**Input**

| Field | Meaning |
| :--- | :--- |
| `namespace`, `schemaKey` | The schema to create, or the existing one to version. |
| `jsonSchema` | The schema to publish. Safe to pass one read back from `getCarbideSchema`: the service-owned keywords are removed before sending. |
| `description` | Optional. Used only when creating. A description change alone is not a version. |
| `confirm` | Must be `true`. A published shape cannot be reshaped. |

**Output**

| Field | Meaning |
| :--- | :--- |
| `published` | `true` when something was written. |
| `action` | `created`, `versioned`, or `unchanged`. |
| `namespace`, `schemaKey`, `id`, `currentVersion` | The schema as it now stands. |
| `warnings` | Non-blocking advice from validation, such as an unclaimed range slot. |

**What it enforces**

- Validation is re-run. A prior `validateCarbideSchema` call is not trusted, since the draft
  may have changed. An invalid draft returns an error and nothing is published.
- For an existing `schemaKey`, the change is classified. `BREAKING_NEW_SCHEMA` returns an
  error with the new-`schemaKey` remedy and nothing is published. `NO_CHANGE` returns
  success with `action: unchanged`. Only `ADDITIVE_VERSION` posts a version.
- A missing schema is an answer, not a failure: it means create.
- The service-owned `additionalProperties` and `mapsTo` keywords are stripped before
  posting, because the service rejects them on input even though it writes them on read.

Callers whose token lacks `custom-data:schema` see no Carbide Data tool at all, so a 403
from the service here is rare and means the scope did not survive onto the minted
credential. The error says so and names the scope. Nothing about the schema needs changing.

### `generateCarbideQuery`

Builds a records query for a published schema from a structured intent, refusing anything
the interface cannot express. Reads the schema, so it needs a credential.

**Input**

| Field | Meaning |
| :--- | :--- |
| `namespace`, `schemaKey` | The published schema. |
| `filters` | Optional. Each has `field` (a declared field, or `created_at` or `updated_at`), `op` (`gt`, `gte`, `lt`, `lte`, `eq`, `in`, `exists`, `null`), and either `value` for `eq` and the range operators or `values` for `in`. |
| `sort` | Optional. A range-queryable field, or `created_at` or `updated_at`. |
| `order` | Optional. `asc` or `desc`. Requires `sort`. |
| `limit`, `offset` | Optional. Clamped to 1 through 100 and to 0 or more. |
| `totalCount` | Optional. Ask for an exact total. Costs a second query, so off by default. |

**Output**

| Field | Meaning |
| :--- | :--- |
| `query` | The query string, without a leading `?`. Empty when anything was refused. |
| `usable` | `true` when `query` can be run. |
| `errors` | Why the intent cannot be expressed, each with its remedy. |
| `notes` | What was adjusted, such as a clamped `limit`. |

**What it refuses**

- A filter or sort on a field the schema does not declare.
- A range operator on a field that is not range-queryable, other than `created_at` and
  `updated_at`. A range operator or `eq` with no `value`.
- `in` on a range-queryable date-time field, `in` with no values, or `in` with more than
  100 values.
- An operator that does not exist. There is no `between`; use a `gte` and `lt` pair.
- `order` without `sort`.

**What it adjusts, and says so in `notes`.** A `limit` outside 1 through 100 is clamped. A
negative `offset` becomes 0. A `limit` that is omitted is not sent, and the service then
defaults to 20.

The interface is a flat list of filters on one table, all combined with AND. The only
disjunction is within a single field, through `in` or an array field's element matching.
The only aggregate is the optional exact count. There is no `OR` across fields, no join,
and no sum, average, or grouping. An intent that needs one of those gets `usable: false`
with an explanation, and the deployment computes it in its own code from the rows it
fetches.

Equality and `in` on an array field match individual elements, so `tags=urgent` matches a
record whose `tags` contains `urgent`. `exists` and `null` test the field, not its elements.
Equality on a date-time field compares instants only when the field is range-queryable;
otherwise it compares the literal RFC 3339 spelling.

**That makes equality filters silently miss across sources.** The GraphQL API returns
`2026-09-10T21:24:51.791+00:00`. JavaScript's `new Date().toISOString()` produces
`2026-09-10T21:24:51.791Z`. Same instant, both valid RFC 3339, and on a field that is not
range-queryable they are two different strings, so a filter written with one never matches a
record written with the other. Nothing errors: the query returns no rows.

The rule that falls out is worth stating on its own: **store a timestamp verbatim, exactly as
the source API returned it.** Do not round-trip it through `Date`, do not normalise it to
`Z`, and do not reformat it before storing. Reformat on the way out instead.

A field that genuinely needs comparing as an instant rather than as text is what the two
range slots are for.

A refusal returns success with `usable: false`. Read the errors; do not retry the same
intent.

### `executeCarbideQuery`

Runs a query string against a published schema and returns the matching records. Resolves
the schema id itself.

**Input**

| Field | Meaning |
| :--- | :--- |
| `namespace`, `schemaKey` | The published schema. |
| `query` | The `query` string from `generateCarbideQuery`, without a leading `?`. Empty for an unfiltered first page. |

**Output**

| Field | Meaning |
| :--- | :--- |
| `items` | The matching records, each with `id`, `externalKey`, `schemaVersion`, `revision`, `createdAt`, `updatedAt`, and the deployment's fields under `data`. |
| `limit`, `offset` | The page returned. |
| `totalCount` | Present only when the query asked for it. |

Without `sort`, records come back newest-updated first. Run the string from
`generateCarbideQuery` rather than one written by hand: a hand-written query the service
cannot express either errors or silently matches nothing.

## Not exposed as tools, by design

- Deleting a schema or a record. The service has both routes; record deletion is soft and
  hides the record from every read, and schema deletion requires `custom-data:schema` and
  permanently removes every version and every record under it. No agent tool
  wraps them.
- Deployment registration, OAuth, and hosting. See the `deploy` and `mmdev` skills.
