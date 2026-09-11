# Security

## Reporting a vulnerability

Email **support@machinemetrics.com**. Please do not open a public issue, and please do not
post details anywhere public until we have replied.

Include what you found, how to reproduce it, and the plugin and version affected. The version
is in the plugin's entry in this marketplace, and `claude plugin details <name>` prints it.

We will confirm receipt and tell you what we intend to do. If the issue affects a released
plugin, the fix arrives as a new release here.

## What these plugins do and do not do

The plugins in this marketplace are **skills**: instructions your coding agent reads. They
contain no executable code of ours, and they ship no MCP server, so nothing here runs on your
machine or connects anywhere on its own.

What they do is tell your agent to run commands and call MachineMetrics APIs on your behalf,
using credentials you supply. Read what a plugin adds before installing it:

```
claude plugin details <name>@machinemetrics
```

Your agent's own permission prompts remain the control over what actually executes.
