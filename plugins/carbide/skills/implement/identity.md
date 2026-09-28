# Who the user is

Read this when a surface records who did something, gates a control on who someone is, or
shows a person's name. It covers the two identities a shop-floor surface can reach, the three
ways to know the operator, and what each one costs.

A shop-floor surface has **two different identities available, and they answer different
questions.** Which one a feature needs is a design decision, and it has to be made explicitly.

**The operator at the machine** is the person standing at the tablet. A shared tablet runs one
browser session for everyone who uses it, so this is never the browser's identity.

**The signed-in browser user** is the account the deployment authenticated as. On a tablet that
is the shop rather than a person. On a phone or a desktop, where one person owns the session, it
is the right identity and the simpler one.

#### Ask the person, and pre-fill the answer from the open run

**Ask.** Present the company's operators and have them pick, the way the tablet's own sign-in
does. The answer is current by construction, which nothing else here can promise, and the cost
is one tap. Where an open operator run exists, pre-select the name it carries: the common case
then costs a confirmation rather than a choice, and the uncommon one is caught.

That is the default because most shop-floor records carry responsibility. A request someone will
act on, an entry attributed to a name, anything another person relies on: all of them are worth
one tap. **Two escape hatches, each for a case where asking is the wrong shape:**

**Read the open run and do not ask** when the record carries no responsibility: a read-only
view that greets someone by name, a filter that defaults to their machines. Getting it wrong
shows the wrong name rather than misattributing an action. Operator Login (Settings, Company,
Operator Insight) has
operators sign in on the tablet by picking their name, optionally with a PIN, and that session
is an operator run. A run with `endAt: null` is someone signed in:

```graphql
machines(where: { machineRef: { _eq: $ref } }) {
  operatorRuns(order_by: { startAt: desc }, limit: 1) {
    operatorRunRef
    startAt
    endAt
    operator { operatorRef name }
  }
}
```

Those are the field names. `OperatorRunTP` has no `id` and no `operatorRunId`, and `MachineTP`
has no `currentOperator`, so an open run is the only way to ask this of the schema. It reads
under the `reporting` scope the deployment already holds. Querying every open run at once,
`operatorRuns(where: { endAt: { _is_null: true } })`, is the shape to use when a surface covers
the whole shop rather than one machine. Subscribe rather than poll if the surface has to react
when someone signs in or out.

**Take it from the host** when the host supplies it. An embedded surface can be handed the
operator alongside the machine context: nothing is queried and nothing drifts. It is the best
answer where it exists and no answer at all where it does not, so it is a hatch rather than a
plan.

Whichever it is, **write it into `SPEC.md`**. It decides what the records mean afterwards, and
the next session cannot tell from the code whether a name was confirmed or assumed.

#### An open run is not proof that someone is there

Sign-out depends on the operator remembering, or on the shift ending, so runs stay open for
weeks and months. Operator Login is also optional, so a machine may have no runs at all.

**There is no established freshness threshold, so do not invent one and do not present a run as
a fact.** MachineMetrics' own product handles this by asking rather than by timing out: the
tablet prompts when a run looks unattended, and confirms at sign-out. Do the same. Show the name
the run carries and let the person confirm or change it, which costs one tap when the run is
right and prevents a misattributed record when it is not. If a surface must decide without
asking, say in `SPEC.md` what it assumes and what happens when the assumption is wrong.

**Two people can be attached to one machine.** A surface that lets someone claim work needs to
say what happens when another operator already holds it, rather than discovering it as a
duplicate.

#### The browser user

**Read it from `/accounts/current`.** One route, named here so that nobody chooses between
candidates. It is served by the current accounts API, needs the `reporting` scope, and is the
route MachineMetrics' own services call to establish who is making a request. It is not in the
published REST reference. What follows was confirmed against the production partition in
September 2026, so treat it as a snapshot, and confirm it on GovCloud before depending on it
there.

Name that route and only that route when you describe the mechanism. Offering it alongside
alternatives, as "this or that", reads as trying whichever answers, and it is.

**Do not use the `/accounts-legacy/` routes.** They return the same account from the legacy
accounts API, and new code does not start on a legacy API. The `/operator-view/`-prefixed
variants are the host application's own path, gated on the OperatorView product permission
rather than on a scope, and are not a deployment's either.

If `/accounts/current` does not answer on the running deployment, that is a finding to report,
not a cue to try the others.

**A caller authenticated with an API key is not a person.** For that caller the route returns
the id `user-from-api-key` rather than an account. A deployment signs in as a user, so it should
never see it, and a surface that stores that value has recorded a key rather than someone.

The response is the current account: `id`, `displayName`, `email`, `role`, `isRoot` and
`companyId`, with the company nested under `company`. **Store the `id` rather than the display
name or the email**, since a name is not stable and an email is not an identifier the platform
promises.

**Read the fields the surface uses and keep nothing else.** The response carries far more than
any surface needs, including the person's phone number and notification settings. Logging it,
caching it or passing it whole into state copies personal data into places nobody meant it to
reach.

**Reach it with the library's `request` helper**, which carries the API credential and handles
minting and expiry. It is the same call the deployment makes to Carbide Data and to any other
MachineMetrics service, so there is nothing special to arrange for this route.

**A phone is not automatically one person.** Where a shop hands the same phone around, the
browser user is the phone rather than the person, and the same reasoning that rules it out on a
tablet applies. Ask in that case.

Across MachineMetrics' own applications this identity is used for entitlement questions, whether
this account may administer something, rather than as the author of shop-floor work. That is the
distinction to keep.

**Do not probe for a route that might exist.** Trying a handful of plausible user endpoints
produces a tidy failure that looks like a permission problem and is not. If neither identity
source above answers the question, that is a finding for the person, not a search.

#### Write one identity and compare the same one

When a record stores who did something and the interface gates on it, the value written and the
value compared must come from the same expression. Storing a readable name and comparing a
sign-in reference is the shape that produces a control which never appears for anyone, and a
test has to cover the gate rather than the write.
