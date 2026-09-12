---
name: deploy
description: Host a finished deployment, register it with MachineMetrics so it appears in the platform, and register its URL as an OAuth redirect. Covers the recommended Netlify path and the requirements any other host must meet. Use when a build is ready to ship, when someone asks about hosting, deploying, registration or embedding, or when a deployed application does not appear or does not authenticate.
---

# Deploy and register

The developer owns the code and the hosting. MachineMetrics governs identity, data access, and
what appears inside the platform.

Plan this early. Discovering a hosting problem after the application is built is the most
common way a project stalls, so ask where it will be hosted during the spec.

## Working with the developer

You are working with a developer who is building on MachineMetrics. Treat them as a
colleague: they may know their shop floor better than they know React, OAuth, or the command
line, and either way they are the one deciding what gets built.

- **Say what it means for what they are building first, then the detail.** One plain
  sentence of consequence, then the technical part. Never the other way round.
- **Name the phase you are in.** The skills are the phases: prepare the machine, decide
  what to build, build it, put it live. Saying "that settles the spec, so we can start
  building" tells them where they are and what comes next. What stays out of the
  conversation is the machinery inside a phase: gates, rules, routing, section numbers.
  Give the reason for a step, never a citation.
- **Technical detail is welcome when it helps or they ask for it.** Explain a term the
  first time it earns its place, in half a sentence. Skip the ones that change nothing for
  them.
- **Narrate less, report more.** Group the work, then say what came of it.

**They are a peer with a different access surface, not a lesser one.** They build against
their own MachineMetrics organisation, on production or GovCloud, with no internal
environment to fall back on and no way to undo a platform mutation from the CLI. That
changes which options exist, never how much is explained or how much is assumed.

Friendly does not mean vague. Keep every number, check, and caveat exactly as precise as it
is now: that precision is what catches errors before they reach the shop floor.
## Requirements any host must meet

Whatever they deploy to, it must be:

- **Publicly reachable.** The user's browser loads it directly.
- **Persistent.** It stays up without someone's session being open.
- **IT sanctioned.** Their organisation has agreed to host it.

A laptop with a tunnel does not qualify. It works in a demo and fails in production, so do not
let it become the plan. If there is no sanctioned hosting, that is the first problem to
solve, ahead of any code.

## Which path applies

**Netlify is the recommended path** and the rest of this skill walks it. It is commercial SaaS.

**A GovCloud account cannot use it**, and neither can an organisation whose IT requires its own
infrastructure. Those follow the requirements above with their own host, and the steps below
apply only in spirit. Two things differ by partition: the platform origin their deployment must
accept, and `releaseStage`, which is `govcloud` rather than `production`. The `setup` skill's
`partitions.md` holds the addresses for both; read them there rather than from here, so there
is one copy.

**If they serve the template's own container, its `nginx.conf` needs an edit.** It permits the
commercial platform origin and only that one, written as a literal, so a GovCloud deployment
refuses cross-origin requests from the platform that embeds it. This applies only to hosting
that actually uses the template's nginx, not to Netlify, and not to a host that serves the
built assets its own way.

## Netlify

Assumes the project has an oauth client id in the app's runtime config (`public/default.json`).

**There is no client secret.** The templates sign in with OAuth 2.1 and PKCE, so no secret
reaches the browser. The client id is public by design: the registered redirect list is what
protects the client, which is why replacing that list carelessly matters and the id does not.
Don't regenerate or touch it. A deployment still carrying a `clientSecret` predates the current
toolchain, which `setup` covers.

**Write credentials into files with a file-editing tool, never through the shell.** With PKCE
there is no secret to spill, but the habit is worth keeping: on an older scaffold, and for
anything else a deployment holds, a one-liner that echoes a credential into `default.json` puts
it in a command line and in the transcript, and is routinely blocked as credential leakage. The
shortcut costs more than the careful path.

## One-time setup: SPA fallback

Netlify serves static files, so client-side routes (including the OAuth callback route,
typically `/authorize/mm/callback`) 404 on direct load unless every path falls back to
`index.html`. Check whether a `_redirects` file (or `netlify.toml` with an equivalent
redirect) already exists in the deployment's `public/` folder. If not, create one:

```
/* /index.html 200
```

Skip this step if it's already there.

## Deploy

1. **Build**: `cd <app dir> && npm install && npm run build`. Note the output directory
   (check `vite.config.ts` / `dist` by default).

   If there's more than one candidate app directory (e.g. a nested duplicate from a
   repeat scaffold, or several sibling projects), don't just guess. The one to deploy is
   the one with a `public/default.json` carrying a real `clientId` rather than the template's
   `MMDEV_CLIENT_ID` placeholder.
   If more than one qualifies, ask the user which one they mean.

2. **Log in to Netlify**. First check whether a session already exists: `npx --yes
   netlify-cli status`. Judge login state from the printed output, not the exit code:
   it prints the logged-in user/team but still exits non-zero (with a "did you run
   `netlify link`?" warning) whenever the current folder isn't linked to a site yet, which
   is the normal case before a site's first deploy. If it prints a logged-in user/team,
   explicitly ask the user (in chat, or with a question tool) whether this is the
   account/team they want the site deployed under, and wait for their reply before
   proceeding. A stale session from a different project or a colleague's account is an
   easy way to deploy to the wrong place. A plausible-looking match (e.g. the email looks
   like the user's own) is NOT confirmation by itself. Don't state that it "matches" and
   move on unprompted; actually stop and ask.

   Ask only *whether this is the intended account and team*, showing both as the CLI
   printed them. The team matters as much as the email: the right person signed in with a
   different active team deploys the site into the wrong space. The site is deployed to the
   developer's own Netlify account, under whatever email and team they use, and that is the
   normal case: this deployment belongs to them, not to MachineMetrics. Any email domain is
   expected. Never treat a non-`@machinemetrics.com` address as suspicious, never ask them
   to explain or justify it, and never suggest switching to a MachineMetrics account.

   Wait for a clear yes on both. Anything else, including "I think so" or silence about the
   team, is not a yes: say which part you still need confirmed and ask again.

   If there's no session, the user may not have an account. `netlify login` opens a
   browser to Netlify's OAuth page, which also lets them sign up. Run it yourself via
   `npx --yes netlify-cli login` and wait for the browser flow to complete; give it a long
   timeout since it blocks on user action.

3. **Create the site and deploy to production in one command** (skip the interactive
   `netlify init` prompts entirely):
   ```
   npx --yes netlify-cli deploy --prod --dir=<build dir> --site-name <slug>
   ```
   Derive `<slug>` from the deployment's `package.json` `name` field, not the working/project
   directory name. The two often differ (e.g. a scaffolded dir named `new-app5` whose
   `package.json` still says `my-first-app`), and prior deploys of the same template will
   have used the `package.json` name. Before picking a slug, check existing Netlify sites
   for the naming convention already used by earlier deploys of this deployment. Run
   `npx --yes netlify-cli sites:list` and look for sites sharing the `package.json` name as
   a prefix and follow it for consistency. Netlify appends a suffix if it's taken. Capture
   the `Website URL` printed at the end. That's the deployed origin.

   For later redeploys, the site already exists. Just rerun the same command (or drop
   `--site-name` once linked; `netlify deploy` will reuse the linked site).

4. **Two things are needed before the live site actually works: making it public, and
   registering its URL for login.** New Netlify projects default to private, so assume
   this step is needed. Don't skip it just because an early `curl` happens to return
   `200` (visibility can take a moment to propagate, or the check can pass for reasons
   unrelated to the project-visibility setting). Present both to the user together as a
   single interruption: don't send a plain-language explanation as chat text and then
   follow up with a separate approval prompt. That reads as two asks. Put the full
   explanation (what to do in the Netlify UI, and what command you want to run and why)
   in one message, and gate on one confirmation that covers both items.

   - **Make the site public.** New Netlify teams default new projects to "Private" (visible
     only to team members signed into Netlify). The deployed app will 404/401 for everyone
     else until this is changed. There's no CLI flag for it, so this one is on the user: tell
     them to open
     ```
     https://app.netlify.com/projects/<site-slug>/configuration/general
     ```
     under **Visitor access > Project visibility**, click **Edit visibility**, choose
     **Customize this project's visibility > Public** (applies to "Production and previews"),
     and **Save**. (They can also flip their team's *default* visibility once, from the
     "Private by default" banner, so future sites skip this step.)

   - **Register the deployed URL as an OAuth redirect**, or login will fail even once the
     site is public. This is a command *you* run, but it edits a shared, team-wide OAuth
     client, so auto mode will typically require the user's explicit approval before you can
     run it. Ask for that approval in the same message as the visibility instructions above,
     so the user only has to respond once. Keep the ask in plain language: say what you're
     doing and why ("I need to add your new site's URL to the list of allowed login
     redirects. I'll keep all the existing ones") rather than presenting the raw
     multi-URL command as the ask.

     The commands below (`mmdev oauth list` then `mmdev oauth update ...`) are for you to
     run with the tool, not to paste into your chat message. Once the redirect list has more
     than a couple of entries, the fully-populated `-r` value is a long wall of comma-joined
     URLs. Never print that populated command as text in your reply, even inside a code
     block; it's noise the user has no reason to read. If the user explicitly asks to see the
     command, show it then, not by default.

     ```
     mmdev oauth list
     mmdev oauth update -n "<existing name from the list>" -i <clientId> -r "<existing redirects>,https://<site>.netlify.app/authorize/mm/callback"
     mmdev oauth list
     ```
     Both `-n <name>` and `-i <clientId>` are required (take the name verbatim from the
     `mmdev oauth list` output. Omitting `-n` fails with "required option '-n --name' not
     specified"). `-r` replaces the entire redirect list, so always include the existing
     redirects (dev and prod) alongside the new one. Don't drop them.

     `-r` is reconstructed by hand from the first `mmdev oauth list` output, which is easy
     to get subtly wrong (a dropped comma, a missing URL) on a long list. Run
     `mmdev oauth list` again after the update and confirm the new redirect is present and
     the count grew by exactly one. Don't just trust that the command exited cleanly.

   Wait for the user's reply to actually cover both items before verifying. An approval
   captured through a yes/no tool prompt often only confirms the command you're about to
   run, not that they've finished the manual visibility change in the Netlify UI. Don't
   hedge the affirmative option with language like "I've done it (or will do it)". That
   lets the user approve the plan without confirming completion, and you'll have to ask
   a second time anyway. Phrase the affirmative option so it only fits if the visibility
   change is actually done, e.g. "Yes. It's already set to Public, go ahead." If their
   reply doesn't clearly say the visibility step is done too, ask directly rather than
   assuming. Only once both are confirmed, verify with `curl -sI <site-url>`. Expect
   `200`, not `401`.

5. Report the live URL to the user.

## Register the deployment with MachineMetrics

Deploying and authenticating is not the same as appearing in the platform. A deployment that
skips this works perfectly and is invisible to its users.

Registration needs a name, the deployed URL, and an icon. Where you do it depends on the
surface, and only one of the two is self-serve.

**An OperatorView `tab` is self-serve.** The developer adds it themselves, and an admin can
do it without MachineMetrics:

1. In the MachineMetrics app, go to **Settings** then **Operator Dashboard** then
   **Manage Tabs**
2. Click **Add Tab**
3. Fill in **Tab Name**, the deployed **URL**, an **Icon**, and which **Machines** it applies
   to
4. Save. The tab appears on the tablets.

Managers, Executives, and IT Admins can do this. Tabs can also be dragged to reorder, and the
order on that settings page is the order on the tablets. Custom tabs are embedded in an
iframe, which is why the HTTPS and framing checks below matter: a site that blocks iframes
shows a blank tab with no error.

### A Manage Tabs custom tab supplies no context

**This is the trap in this skill, and it has already shipped a deployment that could not
work.** Read it before telling anyone their tab is done.

A tab added through Manage Tabs is a **plain iframe pointed at a fixed URL**. It is the same
mechanism the product documents for Google Docs, YouTube videos and third-party CNC
calculators. It performs no embeddable handshake, so:

- `useMMAppContext()` is empty. There is no `machineId`, no `operationId`, nothing.
- `useMMAppParams()` reports `isEmbedded: false`.
- No query string is appended to the registered URL.

So a deployment that reads its machine from the host context, which is the documented and
otherwise correct way, renders, authenticates, and then cannot tell which machine it is
attached to. Nothing errors. The tab simply has no subject.

The diagnostic tell is `isEmbedded: false`. If a tab is embedded and reports that, the
handshake did not happen and no amount of application code will produce a machine.

**The two kinds of tab are not the same thing:**

| | Manage Tabs custom tab | OperatorView tab embed |
| :--- | :--- | :--- |
| Added by | The developer, Settings → Operator Dashboard → Manage Tabs | Not self-serve |
| Mechanism | Plain iframe, fixed URL | Embeddable zone, `postMessage` handshake |
| `isEmbedded` | `false` | `true` |
| Host context | None | `{ machineId, machineRef, operationId, partCount }` |
| Host params | None | `{ language, isVisible }` |
| Available | Today, self-serve | The library half ships: `mm-react-tools` 5.x, `mm-react-embeddable` 2.x. Registering the embed is not self-serve |

**If the surface needs to know its machine and only Manage Tabs is available**, say so plainly
rather than shipping it. There are three honest options, and the first is the only one that
works today without asking the operator:

1. **One tab per machine**, each URL carrying `?machineId=<uuid>` and scoped in Manage Tabs to
   that machine. The deployment reads it from its own URL, which works because a custom tab is
   standalone rather than embedded. Costs one tab entry per machine, and a new machine needs a
   new entry.
2. **A machine selector inside the deployment**, persisted per tablet. One tab entry, but the
   operator has to tell the application which machine they are standing at.
3. **Ask for the OperatorView tab embed.** On `mm-react-tools` 5.x the deployment side is ready
   and the playground's tab mode proves it locally, so what is left is registration, which is
   not self-serve. That makes this a request with a lead time rather than a wait for software.
   If the answer is no or not yet, one of the first two options ships instead.

Do not report a tab as registered and working until it has been opened on a
tablet and shown real data for the right machine. Registration succeeding is not the same as
the tab having a machine.

**A `widget` or `fullpage` view in the portal is not self-serve.** There is no self-serve
settings page for it. Ask MachineMetrics to register it, with the name, deployed URL, and
icon in hand. Do not guess at an admin route or promise a screen that does not
exist. If you find a documented self-serve path for this, it belongs in this skill.

The registered origin matters for both. Authentication and framing are both tied to it, so a
URL change means re-registration, not just a redeploy.

## If it doesn't appear in the platform

1. Is it registered at all, with the exact deployed origin? For a `tab`, check
   **Settings** then **Operator Dashboard** then **Manage Tabs**.
2. Does the registered URL match where it is actually served, including scheme and any
   trailing path?
3. Is it served over HTTPS with a certificate the browser accepts? Framing fails silently
   otherwise.

## If it appears but does not know its machine

The tab loads, authenticates, and reports that no machine was supplied. Do not look for the
bug in the application code first.

1. What does `useMMAppParams()` say about `isEmbedded`? If it is `false`, the tab is a plain
   iframe and no host context exists. That is the Manage Tabs mechanism, not a fault, and it
   is not fixable in the deployment. See the section above for the three options.
2. If `isEmbedded` is `true` but the context is empty, the handshake happened and the host sent
   nothing useful. Report what the host did send before concluding anything.
3. Only then suspect the application. A useful diagnostic names every key the host offered
   across context, params and the URL, rather than saying "no machine supplied". Otherwise
   there is no way to tell these three cases apart.

Note that reading context values needs care: `mm-react-tools` defines `colorMode` and
`isFullScreen` on the context object as getters that **throw** by design, because they moved
to `useMMAppParams`. Enumerating context values without a `try`/`catch` per key crashes on the
two keys a host is most likely to send.

## If it doesn't authenticate

- Confirm the exact deployed origin (scheme + host) matches a redirect URI registered on
  the client via `mmdev oauth list`.
- Confirm the `_redirects`/SPA fallback is actually in the deployed build (check the
  Netlify deploy's file list or just hit the callback URL directly and see if it 404s).
- Confirm the client is on the **account's** environment. Clients are per environment, so one
  created on `staging` does not exist on `production`. Switching means `mmdev login` for the
  new environment, a fresh client, and a redeploy.

## After it is live

Set the surface's status in `SPEC.md` to `deployed`. `start` reads that file to work out where
the project is, so a status left at `built` sends the next session back into `implement`.

Schema changes are constrained after publish: Carbide Data is append only. Adding an entity or
an attribute later works; renaming, retyping, or removing a published one does not, and has to
be planned as a versioned change to the deployment rather than an edit in place.

**Every later change re-enters through `start`,** including a one-word fix. It classifies the
change, routes it to `implement` or back to `spec`, and keeps `SPEC.md` describing what is
actually deployed.
