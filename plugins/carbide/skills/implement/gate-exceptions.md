# When a gate line cannot be satisfied

Read this when a line in the exit gate cannot be met. It covers what to tell the person, what
the surface's status becomes, and the two failures that look like success: a screen that reads
correctly over rows that were never written, and a test that agrees with its own query.

A line that cannot be met is a finding, and it has to reach the person as one. Say which line,
what it would take to satisfy it, and what shipping without it risks. Then let them decide.

Two things make that an honest decision rather than a formality. **The surface's status in
`SPEC.md` does not become `built`**, because `built` means the gate passed; leave it
`specified` and record the unmet line beside it. And **the deployment carries the unmet line
forward**: `deploy` reads the status, and a surface that never passed its storage round-trip is
not a surface anyone should be told is working.

The storage round-trip is the line most often reached for an exception, usually because
authentication has not been made to work locally. It is also the line that most reliably catches
a broken deployment, since a write path that has never been exercised against the real service
has not been tested at all. Fix the authentication. **The credential is the first thing to
check**, and `carbide-data` names which one the service takes.

**A screen that looks right is not evidence.** Query the rows back on every state the surface
can write. Two failures in one field run were invisible on screen and obvious in the rows. A
list rendered nothing because the reader decoded the wrong envelope while the writes were
landing perfectly. A "claimed and closed" flow had never written the close at all, because the
button that sends it renders only for the person who claimed the record, and the check
compared a different identity field than the one written. Both looked like success.

**A passing component test says nothing about a query's shape.** `MockedProvider` matches
whatever document it is handed, so a test built around a query agrees with whatever that query
says, including its mistakes. Two of them survive this happily: a filter whose argument type is
wrong, because selecting a field never goes through the comparison type that filtering does, and
a filter on a field that lives on a related type rather than the one being filtered. Both pass
every mock and fail on the first real call.

So run each query once through `executeGraphqlQuery`, then keep a test that asserts the shape
against the schema rather than against a mock, so the next change fails locally instead of on a
tablet.

That last one is a shape worth naming: **write one identity, compare another**. If a record
stores who did something and the interface gates on it, the value written and the value
compared must come from the same expression, and a test has to cover the gate rather than the
write.

**For an app tab, check the machine context in the playground's tab mode.** It sends real context, so this is a line the gate covers rather than a
caveat it has to make. Confirm `useMMAppContext()` returns a machine, and that no query-string
fallback is left behind. A Manage Tabs custom tab is the other case entirely, and the paragraph
after this one is the one that applies to it.

How the tab will be registered still decides what the context is worth, and `spec` should have
settled it:

- **An app tab** supplies `{ machineId, machineRef, operationId, partCount }`.
  This is the case the playground now reproduces.
- **A Manage Tabs custom tab** supplies nothing at all: it is a plain iframe. The deployment
  obtains the machine itself, from its own URL or from a selector it persists per tablet, and
  the bullet above does not apply: there a query string is the mechanism rather than a leftover.
  `deploy` covers both, including that the URL route needs one tab entry per machine.

Either way, do not report a `tab` as working on the strength of the playground alone.
