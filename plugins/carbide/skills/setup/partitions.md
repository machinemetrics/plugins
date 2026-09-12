# Partitions

MachineMetrics runs in two separate partitions. They are different deployments on different
infrastructure, with no routing between them. An account belongs to exactly one.

Every value below differs by partition. Read the row for the account's partition and never mix
them.

| | Commercial | GovCloud |
| :--- | :--- | :--- |
| Gateway (MCP) | `https://agent.machinemetrics.com/mcp` | `https://agent.machinemetrics-us-gov.com/mcp` |
| Platform origin | `https://app.machinemetrics.com` | the account's GovCloud platform origin |
| Carbide Data (HTTP) | `https://custom-data-service.svc.machinemetrics.com` | `https://custom-data-service.svc.machinemetrics-us-gov.com` |
| Connector link | see below | see below |

## Prefilled connector links

These open the add-connector form with the name and URL filled in. They do not bypass review:
the developer still confirms before anything is added.

**Commercial, personal:**

```
https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=MachineMetrics&connectorUrl=https%3A%2F%2Fagent.machinemetrics.com%2Fmcp
```

**Commercial, organisation-wide (Owner only):**

```
https://claude.ai/admin-settings/connectors?modal=add-custom-connector&connectorName=MachineMetrics&connectorUrl=https%3A%2F%2Fagent.machinemetrics.com%2Fmcp
```

**GovCloud, personal:**

```
https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=MachineMetrics%20GovCloud&connectorUrl=https%3A%2F%2Fagent.machinemetrics-us-gov.com%2Fmcp
```

**GovCloud, organisation-wide (Owner only):**

```
https://claude.ai/admin-settings/connectors?modal=add-custom-connector&connectorName=MachineMetrics%20GovCloud&connectorUrl=https%3A%2F%2Fagent.machinemetrics-us-gov.com%2Fmcp
```

## Carbide Data base URLs

The row above is the HTTP interface a **shipped deployment** uses to read and write its own
records. It is not how an agent designs a schema: `carbide-data` does that through the MCP
tools, which enforce constraints that a hand-written request does not.

The service documents itself. Point a browser or a fetch at these rather than asking anyone
to describe the contract:

- `<base>/docs` carries every route, the concurrency model, the range-field rules, and worked
  `curl` examples.
- `<base>/openapi.json` is the machine-readable form of the same thing.

**GovCloud is in flight.** The GovCloud URL above is the address the service will have; as of
11 September 2026 it is being deployed and may not answer yet. Do not report it as broken
without checking, and do not silently fall back to the commercial host, which is the whole
failure this plugin exists to prevent. Check with the probe below: a partition that is not
live yet fails to resolve or refuses the connection, which looks nothing like the 401 a live
service returns.

**A shipped deployment should not hardcode either row.** The library resolves this host from
`releaseStage` like every other one, and the app reads it off the auth hook's `urls`. Use that
instead of pasting a base URL in, so a deployment that moves partitions moves with it. The
table stays here because probes and `curl` checks need a literal address.

The accessor is `useMMAuth().urls.customDataUrl`. That is a snapshot of an SDK shape rather
than the contract: check the current `knowledgeBase` page, or
https://developers.machinemetrics.com, before relying on the exact spelling.

**Do not construct a host by analogy from a name.** The `development` stage has no
`customDataUrl` at all, and the `staging` one is on an unrelated domain. If a build needs
Carbide Data on an internal environment, read the stage's value from the library or ask the
Carbide Data owners rather than guessing.

### Confirming a route without a credential

A wrong path and a missing token look alike in a browser and are not. The status code
separates them, with no credential involved:

`<base>` is the row above for the account's partition. Substitute it; do not run this
against Commercial to check a GovCloud deployment, which answers about a service that account
does not use:

```bash
curl -s -o /dev/null -w '%{http_code}\n' <base>/<namespace>/<schemaKey>
```

- **401** means the path is right and it wants a token. This is the answer you want.
- **400 or 404** means the path is wrong. Stop and reread `<base>/docs`.

Do not construct a route from the shape of the MCP tools. A dry run inferred one and it was
wrong in three independent ways at once: `/ns/key/records` instead of `/ns/key` for list and
create, `PATCH` instead of `PUT` for update, which is a full replace, and an `If-Match` header
instead of the revision in the request body. The service named the first one exactly, in a
message that only makes sense once you know what it is telling you: `Cannot parse record_id
with value records: UUID parsing failed`.

## Environments, which are a different axis

Partition is where an account lives. **Environment** is which `mmdev` deployment the CLI
talks to. Two are reachable from here and the rest are MachineMetrics-internal. A URL is not
derivable from a name: the two below do not even share a domain.

| `mmdev` environment | `apiUrl` | `loginUrl` |
| :--- | :--- | :--- |
| `production` | `https://api.machinemetrics.com` | `https://login.machinemetrics.com` |
| `govcloud` | `https://api.machinemetrics-us-gov.com` | `https://login.machinemetrics-us-gov.com` |

**These two are the only reachable environments.** `mmdev` also knows internal ones, used by
MachineMetrics staff. If `mmdev environment list` shows a name that is not in this table, it
is one of those: nothing outside MachineMetrics reaches it, and building against it will produce a
deployment nobody outside MachineMetrics can use.

Source of truth for every name: `src/utils/environment.js` in `mmdev-cli`. That file is what
`mmdev environment switch` writes and every `mmdev oauth` command reads, so it is the actual
answer rather than a copy of one. Read it there rather than asking for the URL.

**Do not derive a URL from the environment name.** The two rows above already disagree on
shape: GovCloud is a different domain, not a prefixed one, so pattern-matching a name into a
host produces `api-govcloud.machinemetrics.com`, which does not exist. Read the row or read
the source file.

**`govcloud` is the one value on both axes.** A GovCloud account is on the GovCloud partition
*and* the `govcloud` environment, and the two have to agree. A Commercial account builds
against `production`. Never target an internal environment: it passes every
local check and the result is a deployment nobody outside MachineMetrics can reach.

The deployment itself does not use these directly. `public/default.json` names a
`releaseStage` (`production`, `govcloud`, `staging`, `development`) and `mm-react-tools` merges
its own per-stage defaults underneath, which is why that file can omit `urls` and still work.
Do not paste an `apiUrl` from this table into a deployment to "fix" a mismatch: set the stage
and let the library resolve it.

**A GovCloud deployment's `releaseStage` is `govcloud`.** The stage is a fourth value alongside
`production`, `staging` and `development`, and it resolves the whole GovCloud host set: login,
app, API, GraphQL, NATS and Carbide Data. The name is therefore the same on both axes, and
`releaseStage` matching the account's environment is the rule with no GovCloud exception under
it.

An older GovCloud deployment carries `releaseStage: "production"` plus a `urls` override, which
was the only correct shape before the stage existed. Treat that as a repair rather than a
mismatch to leave alone, and see the version section in `SKILL.md`: it silently talks to
Commercial for every host the override forgets to pin.

## Values that are not yet partition aware

Recorded here so they are not forgotten, and because a GovCloud account will hit them.

- **The `mmdev` installer** is served from commercial S3 (`us-west-2`). Whether a GovCloud
  developer can reach it is unconfirmed. If they cannot, installing the CLI is a different
  procedure, not a different URL.
- **The project template's `nginx.conf`** hardcodes `app.machinemetrics.com` as its permitted
  CORS origin, so a GovCloud deployment would reject its own platform origin. The developer has
  to change it. Flag it during `deploy`.

Neither is fixed in this plugin. Both need a change in the tool that owns them.
