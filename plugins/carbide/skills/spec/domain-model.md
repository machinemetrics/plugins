# Domain model

The entities in the shop the deployment is for, and the relationships between them. This is a
specification activity, not a database activity: it is worth doing whether or not the
deployment ever stores anything, because it is where the words get pinned down.

**Do not design a schema here.** No field types, no tables, no JSON. A schema is the
consequence of a domain model, not a substitute for it, and designing one before the model
is settled locks in the first guess.

## Contents

- Find the entities
- Sharpen the words
- Stress it with scenarios
- Write it into SPEC.md
- The five shape questions
- When it is time to call `carbide-data`

## Find the entities

Ask what the person cares about, in their words. A shop talks about jobs, setups,
changeovers, tools, operators, scrap, and downtime reasons long before it talks about rows.

For each candidate, ask two things:

- **Does it have an identity that persists?** A changeover that gets logged, corrected, and
  reported on is an entity. A calculated OEE percentage is not: it is derived.
- **Who creates it, and when?** An entity nobody creates is usually a view of something else.

Most applications have between one and four entities. If the list is longer than that, some
of them are attributes of the others.

## Sharpen the words

The value here is in refusing vague terms. When someone uses one, propose a precise
replacement and get agreement:

- **Overloaded words.** "Job" can mean the work order, the operation on one machine, or the
  run. Those are three different things with three different lifetimes. Pick one meaning for
  the word and name the others separately.
- **Words that mean different things to different roles.** "Setup" to a planner is a
  scheduled block; to an operator it is the physical activity happening now.
- **Words the platform already owns.** MachineMetrics already defines machine, part, job, and
  operator. If the shop's meaning differs from the platform's, say so out loud and pick a
  different word for theirs. A silent redefinition surfaces much later as data that does not
  line up with the rest of the app.

Write the agreed meanings down as you go. A term settled in conversation and not written down
gets re-litigated in the next session.

## Stress it with scenarios

Invent concrete cases that probe the boundaries, and use real values rather than placeholders:

- What happens when the same thing is recorded twice?
- What happens when it is corrected after the fact?
- What happens across a shift change, or across midnight?
- What happens when the thing it refers to (a machine, a job) is deleted or renamed?

A model that survives four awkward scenarios is usually right. One that has not been tested
against any is usually a list of nouns.

## Write it into SPEC.md

Add an entities table. Every cell filled:

| Entity | What it is, in one line | Who creates it | Related to |
| :--- | :--- | :--- | :--- |
| ... | ... | ... | ... |

The relationships column is prose, not foreign keys. "One per changeover" is the right level
of detail here.

## The five shape questions

These decide whether the model fits Carbide Data, and they are worth answering **before**
anyone commits to storing anything. Do not answer them from memory of the constraints: get
each answer from the developer, then hand all five to `storage-fit`.

1. **Is anything nested?** An entity that naturally contains a list of other entities, rather
   than a list of values.
2. **Does anything need a join?** A view that filters one entity by a property of another.
3. **What has to be sorted or range-filtered?** Timestamps, quantities, durations. Count them.
4. **What has to be corrected after the fact?** Fields that will change definition, not just
   value.
5. **How long does it live?** A month of shift logs and three years of maintenance history are
   different problems.

## When it is time to call `storage-fit`

Once the entities table is written and the five questions are answered, **invoke
`storage-fit`**, including when you are confident nothing is stored. Confirming that is its
first question and it takes one exchange, and the spec gate cannot close without the
`storage:` line that only it writes. It owns the constraints, so it is also the only thing
that can say whether this model survives contact with the service.

That check is one exchange, and it is much cheaper here than after publish: a published field
can never be changed, and a model that does not fit needs their own service instead.
Getting that answer during the spec is the point of asking now.

Do not restate the constraints in `SPEC.md` or reason about them here. A model that only an
agent's reading says will fit has not been checked.
