# Reconciling the environment

Read this on a fresh scaffold, and whenever a deployment answers from the wrong environment
or an OAuth client belongs to a different one. It covers the four legs that have to name the
same environment and what to do when one of them does not.

Three things must name **the account's** environment, and a fresh scaffold does not guarantee
it. Agreeing with each other is not the test: three legs consistently naming `staging` is a
configuration that builds, passes its tests, deploys, and then cannot reach the API, because
the data lives only on that account's environment: `production` on Commercial, `govcloud` on
GovCloud. Check the name, not only the consistency.

| | Where |
| :--- | :--- |
| The active `mmdev` environment | `mmdev environment list` |
| The OAuth client's environment | Whichever client `public/default.json` names. See the repair table below |
| The deployment's config | `public/default.json`: `releaseStage`, and `urls` only if something set it |
| **The gateway's environment** | Not printed anywhere. Run `{ companies { name } }` and see whose data comes back; see `setup` |

**There are four legs, not three.** The gateway's is the one nobody prints and everybody
assumes, and a mismatch there sends every symptom towards the code instead. `setup` covers
how to establish it. Do not try to settle it with machine or shift ids: in some tenants those
are **identical** across staging and production, so matching ids prove nothing. A company name
differs, which is why the query above is the one that answers it.

If they disagree, the correct one is the account's own environment: `production`, or
`govcloud` on GovCloud. Make the others match it. Do not ask which to target, because there is
no other option. Each leg has its own remedy, so name the leg before reaching for
a command:

| Leg | Read it with | Fix it with |
| :--- | :--- | :--- |
| Active `mmdev` environment | `mmdev environment list` | `mmdev environment switch <env>` |
| OAuth client's environment | `mmdev oauth list` | See the two cases below. **Not `dev-apply` on a deployed project** |
| Deployment config | `cat public/default.json` | Set `releaseStage`. **Remove `urls`, do not edit it** |

**`urls` is a trap.** `mm-react-tools` resolves per-stage defaults from `releaseStage`, so a
correct deployment has no `urls` at all. Pasting an environment's API address in to fix a
mismatch pins the deployment to that endpoint and survives every later stage change: on
GovCloud that means a deployment silently talking to Commercial. Set the stage and delete any
`urls` override that is already there.

**On `mm-react-tools` 5.1 the stage carries the partition.** The stages are `production`,
`govcloud`, `staging` and `development`, and each resolves the login, app, API, GraphQL, NATS
and Carbide Data hosts together, readable at runtime as `useMMAuth().urls`. A GovCloud
deployment is `releaseStage: "govcloud"` and needs no `urls` at all.

A GovCloud deployment carrying `releaseStage: "production"` plus a pinned `urls` predates this
and is a repair rather than a mismatch to leave alone: `setup` covers it. Keeping both leaves a
pin that outlives the next host change, and a host forgotten from the override talks to
Commercial in the meantime. See `setup`'s `partitions.md` for the addresses.

**`mmdev oauth dev-apply` is only safe on a scaffold you are still building.** It copies the
machine's shared `LOCAL TEST` client into `public/default.json`, overwriting whatever is
there. On a deployment that already has its own client that destroys the deployment's client id
and its registered redirect list, and the app keeps working locally while being broken for
everyone else.

| Project | Repair |
| :--- | :--- |
| New, or local-only, still carrying `LOCAL TEST` | After switching, `mmdev oauth dev-init` then `mmdev oauth dev-apply`. `dev-init` is per environment, and the client that `dev-apply` copies belongs to whichever environment was active when `dev-init` last ran |
| Has its own client, or is deployed anywhere | `mmdev oauth list`, pick the client that belongs to this deployment in the target environment, and write its id in by hand. If none exists for that environment, `mmdev oauth add` a new one with the deployment's real redirect |

**`public/default.json` is usually the wrong leg**, and it is wrong the moment it is created
rather than by drifting. The template writes `releaseStage: "production"` regardless of the
active environment, so a scaffold on `staging` produces a production stage against a staging
client. Prefer switching `mmdev` to the environment you actually want, repairing the client
by the table above, and setting `releaseStage` to match, rather than switching `mmdev`
backwards to agree with a stale file.

That file may also omit `urls` entirely even though the template's own type marks it required.
That is not a fault: `mm-react-tools` merges built-in per-stage defaults underneath, keyed off
`releaseStage`. Set the stage and let the library resolve the URLs. Do not paste an `apiUrl` in
to fix a mismatch.

Do not skip this because a build succeeds. A mismatch here produces authentication failures
much later that look like anything but a configuration problem.

**Changing the environment later means a new OAuth client, not just a config edit.** Clients
are per environment, so a client created on `staging` does not exist on `production`. Switching
requires `mmdev login` for the new environment, a fresh client, and a redeploy, and because
`mmdev oauth` has no delete, the old client stays behind. That cost is the reason to get the
environment right in `setup` rather than here.
