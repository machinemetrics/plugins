# Worked example: changeover logging

Read this before designing a first schema. It carries one domain end to end, from what the
shop says to a published schema and the queries over it, including the changes that are
possible afterwards and the ones that are not.

A shop wants to record how long tool changeovers actually take, so a planner can see which
operations are worst. MachineMetrics knows when a machine stopped. It does not know that the
stop was a changeover, or who did it. That is data the deployment collects itself, so it
needs Carbide Data.

Every number in this example can be checked by hand against the three records below. That
is the point of it.

## The question that picks the range fields

What will the planner's screen filter and sort by? Longer than N minutes, within a date
range, and sorted by duration. That answer spends both range slots: `setupMinutes` and
`startedAt`. `machineRef` is not lifted, so it can be matched by equality but never sorted
on or range-filtered. If the planner later asks to sort by machine, the answer is no, and
it stays no: an existing field can never gain the range marker.

## The schema

`namespace: workflow`, `schemaKey: setup_event`.

```json
{
  "type": "object",
  "properties": {
    "machineRef":    { "type": "string" },
    "operationRef":  { "type": "string" },
    "operatorName":  { "type": "string" },
    "outcome":       { "type": "string", "enum": ["completed", "abandoned"] },
    "notes":         { "type": "string" },
    "delayReasons":  { "type": "array", "items": { "type": "string" } },
    "setupMinutes":  { "type": "number", "queryable": "range" },
    "startedAt":     { "type": "string", "format": "date-time", "queryable": "range" }
  },
  "required": ["machineRef", "operationRef", "setupMinutes", "startedAt", "outcome"]
}
```

`validateCarbideSchema` returns `valid: true` with no warnings: both slots are claimed, the
root declares `"type": "object"`, every field is a scalar or an array of scalars, and
nothing reserved is used.

Points worth noticing:

- `outcome` carries an `enum`. That is allowed and enforced on every write. It is also
  frozen with the field: adding a third outcome later is a new schema, not a version.
- `delayReasons` is an array of strings. Equality and `[in]` match its elements, so
  `delayReasons=tooling` finds records whose array contains `tooling`. `[exists]` and
  `[null]` test the field, not the elements. An array can never be range-queryable.
- After publish, the schema comes back with `additionalProperties: false` at the root and
  `mapsTo` on the two range fields. Those are the service's. Pass the copy through to the
  tools unchanged; never add them to a draft yourself.

## Three records

| `machineRef` | `operationRef` | `operatorName` | `setupMinutes` | `startedAt` | `outcome` |
| :--- | :--- | :--- | ---: | :--- | :--- |
| `m-4417` | `OP-3120` | R. Alvarez | 62.5 | 2026-07-08T13:42:00Z | completed |
| `m-4417` | `OP-3120` | R. Alvarez | 48.0 | 2026-07-15T06:11:00Z | completed |
| `m-2203` | `OP-8891` | T. Nguyen | 21.0 | 2026-07-15T14:05:00Z | completed |

A fourth payload carrying `machineNumber` instead of `machineRef` is rejected before any
write: the schema is closed, and `machineRef` is required. `validateCarbideRecord` reports
both problems.

## The query

"Completed changeovers over 45 minutes in July 2026, longest first, first page of 25, with
a total." `generateCarbideQuery` produces this:

```
setupMinutes[gt]=45
&startedAt[gte]=2026-07-01T00:00:00Z
&startedAt[lt]=2026-08-01T00:00:00Z
&outcome=completed
&sort=setupMinutes&order=desc
&limit=25&offset=0
&total_count=true
```

Two of the three rows match. 62.5 and 48.0 are both above 45, both `startedAt` values fall
inside July, and both outcomes are `completed`. The 21.0 row is excluded by the duration
filter alone. Sorted descending by `setupMinutes`, the response is the 62.5 row then the
48.0 row, with `totalCount: 2`.

`setupMinutes[gt]=45` compares a number because the field is a number-typed range field.
`startedAt` compares instants because it is a range field with `format: date-time`.
`outcome=completed` is plain equality on an un-lifted field, which is fine.

## What gets refused, and why that is the example working

| Attempt | Result | Why |
| :--- | :--- | :--- |
| `sort=operatorName` | Refused | Not range-queryable, and both slots are taken. It cannot be lifted later either, because it already exists. |
| `startedAt[between]=...` | Refused | No such operator. Use the `[gte]` and `[lt]` pair above. |
| `startedAt[in]=...` | Refused | `[in]` is not available on a range-queryable date-time field. Use a window. |
| `limit=500` | Clamped to 100 | The service clamps silently; the tool says so instead of implying 500 rows. |
| `delayReasons=tooling` | Emitted | Element matching on an array field is supported. |
| A nested `"operator": { "type": "object", ... }` field | Refused by validation | Records are flat. Use `operatorName` and `operatorId` as separate fields. |

## Changing the schema later

Each row is a `diffCarbideSchema` result against the published `setup_event`.

| Proposed change | Classification | What to do |
| :--- | :--- | :--- |
| Add `"priority": { "type": "string" }` as optional | `ADDITIVE_VERSION` | Publish as a version. Records from before it match `priority[null]`, not `priority[exists]`. |
| Add `priority` as required | `BREAKING_NEW_SCHEMA` | Existing records lack it. New `schemaKey`. |
| Add `"plannedMinutes": { "type": "number", "queryable": "range" }` as optional | `BREAKING_NEW_SCHEMA` | Both range slots are already held. Had the schema claimed only one, this would be additive and would take the free slot. |
| Add `"abandoned_reason"` to `outcome`'s `enum` | `BREAKING_NEW_SCHEMA` | Any edit to an existing field's definition is breaking. |
| Rename `operatorName` to `operator` | `BREAKING_NEW_SCHEMA` | Reported as a removal plus an addition. No data moves between them. |
| Remove `notes` | `BREAKING_NEW_SCHEMA` | Fields cannot be removed. |

For every breaking row the honest next question is what happens to the three records
already written. There is no migration path between schemas, so the deployment either
carries them across in its own code or leaves them in the old table. Ask before publishing.
