---
name: hello
description: Confirm that MachineMetrics plugins are installed and working, and show where to get help. Use when verifying a new install of the MachineMetrics marketplace.
disable-model-invocation: true
---

# Hello from MachineMetrics

Tell the user their setup is working, then give them the three points below. Keep it
short. Do not run any commands.

Reaching this skill confirms three things at once:

1. The `machinemetrics` marketplace is registered with their agent.
2. A plugin installed from it and loaded successfully.
3. Skills inside our plugins resolve and run.

That is the whole job of this plugin. It is a check, not a feature.

## What to tell them next

They can see everything the marketplace offers, and install more, with:

```
/plugin
```

Our other plugins carry the real functionality. This one only proves the plumbing.

## If they need help

Email support@machinemetrics.com, or open an issue at
https://github.com/machinemetrics/plugins
