# The SPEC.md skeleton

Copy this into `SPEC.md` and fill it. The gate checks the shape as much as the content, and the
part most often lost when a spec is written from memory is the fourth column of the data-source
table: a row without it has not been proven and the spec is unfinished.

Everything between the markers is the file. Delete a section only in the one case named at the
end.

---

```markdown
# <Deployment name>

<One paragraph: who stands where, and what they get out of it. Written so someone who was not
in the conversation can tell whether the thing was built.>

storage: yes | no | blocked
prototype: built and deleted | skipped, <reason>

## Surfaces

| Surface | Type | Who opens it | Template | Embedded or standalone | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| <name> | widget \| tab \| fullpage | <the person, where they are standing> | pending | pending | specified |

## Data sources

| What | Source | Read or written | Proven by |
| :--- | :--- | :--- | :--- |
| <the value, in the shop's words> | <the exact query, route, or hook> | Read \| Written | <the call that returned it, with a real value> |

## Entities

| Entity | What it is | Key fields | Lifetime |
| :--- | :--- | :--- | :--- |
| <name> | <one sentence> | <fields> | <created when, closed when, pruned by what> |

## Worked example

<One real case end to end, with values from this account: a real machine name and ref, a real
job if there is one. The null case too: what the surface shows when the usual value is absent.>

## Decisions

<Anything settled in conversation that the tables do not carry, and what it cost to settle.
Which identity a record carries and why. What was deliberately left out.>
```

---

## Filling it

**`storage`** is `yes`, `no`, or `blocked`, and nothing else. `blocked` means the model does not
fit Carbide Data, which is a spec problem rather than a build problem.

**Template and Embedded** are the literal word `pending`. `implement` replaces both when it
scaffolds. A blank cell is an unfinished spec; `pending` is a filled one that says a later skill
owns the answer.

**Status** starts at `specified`. `implement` moves it to `built` only when the exit gate
passes, and `deploy` moves it to `deployed`.

**Proven by** carries the call that returned the value and what came back, not the word "yes".
`user input` is the entry for a value the person types, and needs no proof.

A row that writes to a table this spec creates reads `schema pending`, and its inputs are proven
where they come from, with the type that came back. A field holding a reference to something the
platform owns takes that thing's type, and the only way to know it is to read one.

## The one case that drops a section

A spec that concludes nothing should be built has **no surfaces table and no entities table**.
It keeps the outcome paragraph, `storage: no`, and a table of what was asked for against what
already does it, with the evidence. `spec` describes that outcome; this skeleton is for the
case where something gets built.
