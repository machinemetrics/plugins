# Platform setup

Read the section for the platform they are on, and only that one. Windows carries almost all
of the detail, because it is the one where the obvious route is the wrong route.

## Windows

**On Windows, everything happens inside WSL 2.** Install WSL 2, install Claude Code inside the
distribution, and run every command from a shell in there. There is one supported Windows
arrangement and this is it.

Two other setups look reasonable and do not work. Recognise them quickly, because someone
will arrive in one of them:

- **The desktop app's WSL session.** Picking a distribution in the Code tab's environment picker
  is the obvious Windows move, and plugins and connectors are both unavailable in those
  sessions, so this plugin cannot load at all. Move them to a shell inside the distribution.
- **Claude Code natively on Windows.** Plugins work there, but `mmdev` does not exist: the
  installer publishes macOS arm64, macOS x64 and Linux x64 only. Developing natively on Windows
  is out of scope, so do not offer it and do not try to work around it.

```powershell
wsl --install
```

Run that in an administrator PowerShell, reboot, and create the Linux user it asks for. Ubuntu
is the default distribution and is fine. WSL 1 is not supported.

Then, inside the distribution:

- **Keep the project in the Linux filesystem**, for example `/home/you/project`. A project under
  `/mnt/c/...` goes through a network filesystem: it is slow and it breaks file watching, which
  presents as a broken dev server rather than a filesystem choice.
- **Docker Desktop** must be installed on Windows with the WSL 2 backend, and integration
  enabled for the distribution, or `docker` will not exist inside it.
- **Set git line endings** so Linux tooling sees LF: `git config --global core.autocrlf false`.
- **Editor**: VS Code with the WSL extension connects to the distribution, so files open in the
  same place the toolchain runs.

If the device is managed by their IT, WSL sessions may be blocked by policy. That is an
administrator question rather than something to work around.

**The plugin does not come with them.** This is the step that gets missed, and it is invisible
until it blocks everything: Claude Code inside the distribution has its own `~/.claude`, so
the marketplace and the plugin are not there. Someone who installed the plugin on Windows,
read this page, and moved into WSL now has a session where `/carbide:start` does not exist.
Say so before they make the move, not after. Re-add the marketplace and install the plugin
inside the distribution, then come back to this skill in that session.

Two things make that harder on a box created minutes ago, and both look like plugin failures:

- **A GitHub source needs credentials the new user does not have yet.** A fresh distribution
  has no `known_hosts` and no git credentials, so a marketplace backed by a private GitHub
  repository fails on the host key before it ever reaches authentication. Accept the host key
  and set up access first, or add a directory-backed marketplace pointing at a copy already on
  disk.
- **Node has to be installed, and the obvious way is the wrong one.** A new distribution has
  no Node at all, and a native Windows install does not carry over. Use `nvm`: `apt` needs
  `sudo`, which cannot work from inside a Claude Code session (see "Install mmdev"), and it
  ships a Node too old for this toolchain anyway.

## macOS

Apple silicon and Intel are both supported directly. Nothing platform specific beyond the
prerequisites below.

## Linux

x64 is supported directly. On arm64 there is no published `mmdev` binary, so check before
promising it.
