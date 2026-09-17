# Checking every utility class exists

Read this when the exit gate's className line has to be satisfied. It covers both stylesheet
sources, the Vitest setting that makes the check silently pass, and the escaping that makes it
report classes as missing when they are not.

A utility class the stylesheet does not define is not an error and not a warning. It silently
does nothing, and the page renders wrong. This has reached a live screen: collapsed columns
and a headline number that never got large, with nothing in any log.

`components/SKILL.md` covers the mechanism and how to verify a single class. What the gate
needs is the repeatable version: **extract every static `className` token in `src/` and fail
on any that neither the library stylesheet nor the app's own CSS defines.** Write it as a test
so it runs again on every change:

```
src/__tests__/utilityClasses.test.ts
```

**Check both sources.** A small scoped plain-CSS rule in the app is the recommended fallback
for values the precompiled stylesheet lacks, so a checker that consults only
`mm-react-components.css` rejects the escape hatch the component rules tell you to use. Let a
token pass if either side defines it.

**Read the library stylesheet from the filesystem, not through `?raw`.** Under Vitest a `?raw`
import of a file inside `node_modules` resolves to an empty string, so a checker built on it
passes with nothing to check against, and the audit is vacuous. Resolve the package and read its
`mm-react-components.css` with `readFileSync` (`createRequire(import.meta.url)` gives you
`require.resolve` in an ES module test). That read needs Node's types, and the template's
`tsconfig.json` carries an explicit `types` array that leaves them out, so add `"node"` to it,
and `@types/node` as a dev dependency if it is not already one, or the test fails to typecheck.
`?raw` and `import.meta.glob` still work for the app's own CSS under `src/`, which is the other
source the checker consults.

**Do not turn on `css: true` globally to make this work.** The library stylesheet is over
200 KB, and a global setting makes Vitest transform it on every test file that imports a
component, which starves the worker pool: unrelated bootstrap tests start failing on the 5 s
timeout, which looks like a bug in the code under test rather than a config change. Leave `css` off, which is
the template's default, and have the checker read the stylesheets as text as described above.
Neither a filesystem read nor a `?raw` import is affected by the `css` setting, so the checker
gets its content and no other test pays for it. Confirm by running the full suite, not the
checker alone: the symptom of getting this wrong shows up in the other tests.
