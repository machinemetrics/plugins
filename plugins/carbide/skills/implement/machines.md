# Listing machines

Read this when a surface lets someone pick a machine, or shows more than the one it is
attached to. It has the query, the two identifiers and which API takes which, and the filter
that keeps retired equipment out of an operator's list.

A machine list is the most common first query and the easiest to get subtly wrong. The
canonical shape, from the GraphQL reference:

```graphql
query Machines($where: MachineTP_bool_exp) {
  machines(where: $where, order_by: { name: asc }) {
    machineId
    machineRef
    name
    make
    model
    decommissionedAt
  }
}
```

Three things to get right:

- **Ask for the fields you need and no more.** `machines` exposes activity sets, annotations,
  current alarms, current states, operator runs, rejects and more as nested collections.
  Selecting them by reflex turns a machine picker into an expensive query.
- **`machineRef` is an `Int`, `machineId` is a uuid string.** They are not interchangeable and
  the Production API filters by `machineId`. A schema field storing a ref should be a number.
- **Filter out decommissioned machines.** `decommissionedAt` is non-null on retired machines,
  and they otherwise appear in the list. An operator picking a machine that no longer exists
  is a support call.

Prefer `generateGraphqlQuery` over writing this from memory: it is generated against the live
schema, and the snippet above is a starting point, not a guarantee for a given tenant.

**If the gateway is unreachable**, say which verification you are giving up. A read-only view
can proceed and verify query shapes at runtime. Anything that reads or writes Carbide Data
cannot proceed on assumption.
