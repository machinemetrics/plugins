#!/usr/bin/env node
// Checks the three host catalogs against the plugins actually in the tree.
//
// `claude plugin validate` covers the Claude catalog's shape. Nothing checks
// that the Cursor and Codex catalogs agree with it, or that a catalog entry
// matches the plugin manifest it points at. Those are the ways a generated
// release can go wrong here, so they are what this checks.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const CATALOGS = [
  { path: '.claude-plugin/marketplace.json', manifest: '.claude-plugin/plugin.json' },
  { path: '.cursor-plugin/marketplace.json', manifest: '.cursor-plugin/plugin.json' },
  { path: '.agents/plugins/marketplace.json', manifest: '.codex-plugin/plugin.json' },
];

const errors = [];
const read = async (path) => JSON.parse(await readFile(path, 'utf8'));

const onDisk = await readdir('plugins', { withFileTypes: true })
  .then((entries) => entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name))
  .catch(() => []);

for (const { path, manifest } of CATALOGS) {
  const catalog = await read(path).catch((error) => {
    errors.push(`${path}: ${error.message}`);
    return null;
  });
  if (!catalog) continue;

  const listed = (catalog.plugins ?? []).map((plugin) => plugin.name);
  for (const name of listed) {
    if (!onDisk.includes(name)) errors.push(`${path} lists "${name}", which is not in plugins/`);
  }
  for (const name of onDisk) {
    if (!listed.includes(name)) errors.push(`${path} does not list "${name}", which is in plugins/`);
  }

  // A catalog entry and the manifest it points at must agree on version. They
  // are written by the same release and drift silently when one is hand-edited.
  for (const entry of catalog.plugins ?? []) {
    if (!onDisk.includes(entry.name)) continue;
    const manifestPath = join('plugins', entry.name, manifest);
    const plugin = await read(manifestPath).catch(() => null);
    if (!plugin) {
      errors.push(`${manifestPath} is missing or unreadable, but ${path} lists "${entry.name}"`);
      continue;
    }
    if (entry.version && plugin.version !== entry.version) {
      errors.push(`${path} says "${entry.name}" is ${entry.version}, ${manifestPath} says ${plugin.version}`);
    }
  }
}

if (errors.length) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`Catalogs agree with plugins/ (${onDisk.length} plugin(s)).\n`);
