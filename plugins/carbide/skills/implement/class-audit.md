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

Vite's `import.meta.glob` and `?raw` imports are the straightforward way to read both
stylesheets, and the template's `tsconfig.json` includes `vite/client`, so they are available
without adding anything.

**Do not turn on `css: true` globally to make this work.** The library stylesheet is over
200 KB, and a global setting makes Vitest transform it on every test file that imports a
component, which starves the worker pool: unrelated bootstrap tests start failing on the 5 s
timeout, which looks like a bug in the code under test rather than a config change. Leave `css` off, which is
the template's default, and have the checker read the stylesheets as text with the `?raw`
imports described above. Raw imports are not affected by the `css` setting, so the checker
gets its content and no other test pays for it. Confirm by running the full suite, not the
checker alone: the symptom of getting this wrong shows up in the other tests.
