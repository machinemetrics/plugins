# Connecting the MachineMetrics gateway

Read this when the gateway is absent, answers on the wrong partition, or answers with a
narrower grant than the build needs. It covers telling those three apart, which partition to
ask for, and the install step for each host.

The plugin ships no gateway. The developer installs it and chooses their partition. That is
deliberate: a bundled server would take precedence over a connector they configured, so a
developer on GovCloud would be silently pointed at Commercial.

## Is it already connected, and to which partition?

Do not infer the partition from tool names. The same gateway surfaces under different names
depending on how it was installed, and none of them carry the partition. Read the URL:

```bash
claude mcp list
```

Each row prints `name: url - status`. Find the MachineMetrics entry and match its host against
[partitions.md](partitions.md): `agent.machinemetrics.com` is Commercial and
`agent.machinemetrics-us-gov.com` is GovCloud. On Codex use `codex mcp list`; on Cursor read
`~/.cursor/mcp.json`.

If entries for **both** partitions are present, stop and say so. Queries may go to either one.
They should keep one and remove the other.

**Connected is not the same as usable, and there are four states, not two.** Work out which
one you are in before doing anything, because the remedies are different and three of them
look alike:

| State | How you can tell | Remedy |
| :--- | :--- | :--- |
| **Absent** | No MachineMetrics row in `claude mcp list`, and no MachineMetrics tools in the session | Install it: connector, or the fallback below |
| **Present, not authorized** | The row prints `Needs authentication`, or tools exist and every call fails | Authenticate. **This is the one that gets misread as a broken plugin** |
| **Present and authorized** | A real tool call returns real content, and the tool count matches what the connectors page shows | Proceed |
| **Present, authorized, incomplete** | Calls succeed, but the nine Carbide Data tools are absent and the count is short | The grant is narrow, not broken. `carbide-data` diagnoses it; the fallback below is the remedy |

**Settle a narrow grant with one command**, rather than reasoning about it:

```bash
curl -s <gateway URL for their partition>/.well-known/oauth-protected-resource
```

It lists `scopes_supported`. If `custom-data:schema` is there, the environment offers the scope
and this session's grant is simply narrower than it could be, which is fixable from here. If it
is absent, no amount of re-authenticating will produce those tools and the conversation is with
whoever owns the deployment.

**GraphQL working while the Carbide Data tools are missing has a specific cause.** It is the
signature of a brokered connector whose scope set is decided server-side, where the developer
cannot widen it from the CLI. A directly registered server is the remedy precisely because it
makes Claude Code the OAuth client, so the grant is negotiated in the session rather than
handed down. Both registrations can exist at once; the direct one wins, and the connector goes
quiet rather than announcing it has been shadowed.

The middle state is the expensive one. A gateway can report connected and refuse every call,
because the plugin-level connection and the server's OAuth token are different things and only
the first is visible. It has cost a live demo: every tool present, every call failing.

**Prove the token with a real call.** Any cheap gateway tool, for example a `knowledgeBase`
query with any string. A successful response proves it. Say you are probing, so the call does
not read as a random detour.

A user who has just re-authenticated may still be talking to a session holding a stale token,
and nothing in the server list reveals that. Their word is not evidence; the response is.

## Ask which partition

Do not guess and do not default:

> Are you on MachineMetrics Commercial, or GovCloud?

GovCloud accounts reach the platform at a `machinemetrics-us-gov.com` address and generally
know it, because it is why they are on GovCloud. Everyone else is Commercial.

## Give them the step for their host

**Claude Code, Claude Desktop, or claude.ai.** A connector is the recommended path: it
authenticates once and works across the terminal, the desktop Code tab, and the web app. Hand
them the prefilled link for their partition from [partitions.md](partitions.md). It fills in the
form only; they still review and approve it.

On Team or Enterprise, an Owner can add the connector once for everyone, and
organisation-managed authentication means individual developers never handle it. For a GovCloud
organisation that is also the enforcement point: the Owner adds only the GovCloud connector.

**Fallback, when a connector is not available or is not carrying the right scope.** Three
situations reach this, and the third is the one that gets missed: some organisations block
custom connectors; a developer working only in the terminal may not want one; or a connector
is present and authorized but its grant is too narrow, so part of the tool set never appears.
That last one cannot be fixed from the CLI while the connector owns the flow, which is why
registering directly is the remedy rather than a workaround. Then register the server
directly:

**Choose the scope before running it**, because the flag is the whole decision and the two
cases point opposite ways:

```bash
# No connector available at all, and every project on this machine needs the gateway:
claude mcp add --transport http --scope user  machinemetrics <gateway URL for their partition>

# Working around a connector that exists but carries the wrong scope or partition:
claude mcp add --transport http --scope local machinemetrics <gateway URL for their partition>
```

Do not paste the first form by reflex. `user` shadows a managed connector for every project
on the machine and outlives the problem it was meant to fix, which for someone who later
moves partition means unrelated projects silently talking to the wrong one.

Three things to say when you offer this, because none of them are obvious:

- **It takes precedence over a connector, permanently.** Scope order is local, project, user,
  plugin-provided, then connector, so this entry wins over any connector the developer
  configures later. That is the same shadowing that made bundling a gateway wrong in the first
  place. Prefer the connector when they can have one, and if they later move partitions or
  their organisation rolls out a managed connector, this has to be removed:
  `claude mcp remove machinemetrics --scope user`.
- **Pick the scope by purpose, not by habit.** `user` covers every project on the machine,
  which is what a developer who has no connector at all usually wants. `local` is this project
  only, and is the default if you omit the flag. It is the right choice when you are working
  around a connector that exists but carries the wrong scope, because the override then
  expires with the project instead of outliving the problem it was meant to solve. `project`
  writes a file that gets committed and shared, which will point a colleague on the other
  partition at the wrong gateway.
- **Adding it does not authenticate it.** The command succeeds and the server lists as
  `Needs authentication`. Authorizing needs the interactive `/mcp` flow in a session, which
  opens a browser. There is no scriptable path.

**Then get the session's tools rebound.** Tools are bound when a session starts, so a server
added mid session is not usable straight away, and authenticating it is not enough on its own:
the registry still holds what it had at boot.

**Try clearing the authentication and authenticating again before asking anyone to restart.**
In `/mcp`, clear the server's authentication, then authenticate it again. That cycle has
rebound the registry mid-session and made the tools available without a restart. It is worth a
try every time, because a restart costs whatever the conversation is holding, and this costs
two prompts. If the tools are still absent afterwards, then the session does have to restart,
and `start` is where to come back in.

Either way, do not add a server and then act as though you have its tools. Check that they are
actually present, and say which of the two happened.

**Codex, experimental.** Claude Code is the officially supported host; Codex works for
reaching the gateway and is not covered by the same guarantees. Say so rather than presenting
it as equivalent. It requires a CLI with MCP support, so check `codex mcp --help` first,
because everything under that command is experimental and older releases lack it.

```bash
codex mcp add machinemetrics --url <gateway URL for their partition>
codex mcp login machinemetrics
```

`codex mcp login` needs `experimental_use_rmcp_client = true` in `~/.codex/config.toml`. Say so
rather than letting them discover it.

**Cursor, experimental.** Same caveat as Codex. Add the server to `~/.cursor/mcp.json`:

```json
{ "mcpServers": { "machinemetrics": { "type": "http", "url": "<gateway URL>" } } }
```

Cursor's one-click install links have been unreliable, so prefer the config file.
