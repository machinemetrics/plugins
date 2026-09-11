# Composition recipes

Surface-level composition recipes; read the one matching what you're building.

Every recipe assumes MachineMetrics density: `text-sm` body, flex + `gap-*` spacing, `p-4`/`p-6`
padding, `h-8` toolbar controls, and a `mt-6 flex justify-end gap-2` footer with an outline
Cancel first. Read [house-style.md](house-style.md) for those rules, the semantic token
families, the embedded-host overlay rule, and the no-Tailwind-build caveat before styling
anything here.

## Recipe: sidesheet form

- Read `node_modules/@machinemetrics/mm-react-components/examples/sheet-form.tsx` and match
  its structure: title-only `SheetHeader`, a scrolling body stacking bordered `bg-card`
  sections with small `text-primary` headings, `gap-2` from label to control, a compact
  two-row `Textarea`, and a sticky `SheetFooter` with Cancel plus exactly one primary action.
- Compose each property from the exported `Field` family, `Field orientation="vertical"`,
  `FieldLabel`, `FieldDescription`, `FieldError` (plus `FieldContent` for a switch's label
  and description beside the control). Never hand-roll a `div` + `Label` + a raw
  `<p role="alert">`: `FieldError` already is the `role="alert"` element.
- Visible options beat a `Select` for two or three stable choices: use the example's
  `SheetFormChoiceGroup`, a real `RadioGroup` styled as segmented buttons.
- One conceptual control per property. Two ways to supply the same value toggle inline,
  never side by side, and create and edit differ only in the title and the action's label.
- Validate on the save ATTEMPT and pass a per-field message to each `FieldError`, clearing a
  field's message when that field is edited. A disabled primary action with no `FieldError` is
  not validation UX; the surface that owns the save owns the error state.
- Open-ended lists (machines, operators, parts) arrive by prop or data hook, never a module
  constant. Only two or three genuinely fixed choices belong in an inline options array.
- Gate by capability, not by shape: hide a whole section a principal may not see, and leave
  a merely-immutable control rendered but disabled, naming the capability with a `Badge` in
  the section's heading row.
- Embedded (host sidesheet) routes: `launchModal` needs an ABSOLUTE URL; the host renders
  the sheet chrome and Save, so register the save handler with mm-react-tools'
  `useMMAppModalSave` (throwing keeps the sheet open and surfaces in the host's toast) and
  never render your own `SheetFooter` on an embedded route.
- Ship a host-toast shim as part of the surface: embedded goes through a guarded
  `useMMAppCommands().toast`, standalone through the library `toast`, behind one call
  signature (knowledge-client's `useToast.ts` shape). See the embedded-host rule in
  [house-style.md](house-style.md); do not inline a second copy of it per component.

### Addendum: `launchModal` needs a route behind it

`launchModal` only navigates, the app must OWN the route it points at, or the host opens a
404 in its sidesheet.

- Add an app route that renders the bare fields form and nothing else.
- One convention, everywhere: `?view=<form-name>&id=<id>`. The route reads the entity id from
  the `id` param and loads it; a missing `id` is the create case.
- Both params are UNTRUSTED URL input. Match `view` against a fixed allowlist of known form
  names and render the fallback on a miss, never `forms[view]` or a dynamic import off the
  param. Treat `id` as an opaque string the SERVER authorizes on load; a client that fetches
  whatever `id` it is handed is an access-control bug, not a routing convenience.
- The ROUTE branches on `useMMAppParams().isEmbedded`, not the form component: embedded →
  bare fields plus `useMMAppModalSave`; standalone → the same fields inside the local `Sheet`.
- Build the target from `globalThis.location.origin` plus that route, so the URL the host
  loads in its fresh iframe is absolute.

### Addendum: embedded routes own no sheet frame

The host owns the frame; the app owns the fields. Render the bare fields (`SheetFormFields`) into the host sidesheet, no `Sheet`, `SheetContent`, or `SheetFooter` at all, and register the save handler with `useMMAppModalSave`. That is the `DocumentDetailsSheet` pattern in job-docs and knowledge; Carbide's `Sheet` is standalone-only. Full-screen variants go through the host's `launchModal` plus the same `useMMAppModalSave`. Everything else about this rule, how to detect the mode, the full command surface, and verifying the mm-react-tools 4.x names, is in the embedded-host rule in [house-style.md](house-style.md), which is the single copy.

## Recipe: data-table page

- Read `node_modules/@machinemetrics/mm-react-components/examples/data-table-page.tsx` and match it: a `HeroMetricCard` stat row, then `ResponsiveTable` with `toolbarOptions`, `emptyState`, `manualPagination`, and a `tableId` so column order and visibility persist.
- Build columns with `createColumnRegistry` over `createTextColumn`/`createColumnDescriptor`, then `resolveColumnOrder(registry).map((id) => registry[id]?.columnDef)`. A hand-written `ColumnDef[]` has nowhere to put what makes the table work: widths off `TABLE_TOKENS` (never a magic number), `align`, `mobileRole` (drives the responsive card view, exactly one `title`), `hideable`, and `defaults.filter`, which is what generates the toolbar's filters menu.
- KEEP the registry and pass it as `columnRegistry` to `useTableController`, `ResponsiveTable` AND `FileGrid`. `mobileRole` and the filter CONFIG live on the descriptor, never on `columnDef.meta`, and a `controller` does not carry the registry with it, pass columns alone and the filters menu comes out empty and the mobile cards lose their title/badge roles, silently.
- `manualPagination` delegates PAGING only. `useTableController` always installs the sorted and filtered row models and has no `manualSorting`/`manualFiltering`, so toolbar search, facets and sort act on the loaded page; it also owns its page index with no way to seed it. Register `onPaginationChange` on the CONTROLLER, not on `ResponsiveTable`, the table's callback reads the previous render's page index. `onRowClick` belongs on the controller too: `ResponsiveTable` reads it off the controller and silently drops the prop. Server-side sort/filter or a deep link to page N means driving the query yourself.
- Sortable header: `Button variant="ghost" className="h-8 -ml-3 px-3"` plus an `ArrowUp`/`ArrowDown` at `ml-2 h-4 w-4 text-muted-foreground`, rendered only in the sorted direction.
- Row actions: a trailing `DropdownMenu` column fixed to `TABLE_TOKENS.actionsColumnWidth` on width/min/max, right-aligned, unsortable, unhideable. Build the items first and render nothing when empty; gate by permission AND row state; `stopPropagation` on the trigger AND on `DropdownMenuContent`, or opening the menu, and activating any item, also fires `onRowClick`: the content's DOM is portalled to the document root, but the portal subtree is still a React descendant of the cell, so React re-dispatches item clicks up to the `<tr>`. Fire each item from `onSelect`, not `onClick`, so keyboard activation works, Radix turns that keypress into a click, so `onSelect` is not a substitute for the guard.
- Table and card/grid presentations share ONE `useTableController` (`ResponsiveTable controller={…}`, `FileGrid table={controller.table}`, `toolbarOptions` on both), so switching views resets nothing.
- DIVERGENCE, selection: use Carbide's built-in batch toolbar (`batchActions`); shipped apps replace it (job-docs `ErpSelectionBar.tsx` + `disableBatchToolbar`) only because the built-in offers just Delete. Diverge only when your bulk actions truly will not fit `batchActions`.
- DIVERGENCE, empty state: `emptyState` renders only under `forceEmptyState`. Use `showEmptyState = !loading && items.length === 0` (knowledge-client `KnowledgeHubTable.tsx`, its `showEmptyState` const) so a zero-match FILTER falls through to the built-in "No results." instead of claiming no data.

## Recipe: standalone page shell

Read and match `node_modules/@machinemetrics/mm-react-components/examples/page-shell.tsx`. One `PageHeader` owns the `h1`, the action cluster, and the tab strip; below it a toolbar row of `h-8` controls, then the active tab's content region. Zero states use the `Empty` family. Uploads are a styled `Button` driving a hidden `<input type="file">` through a ref, the package exports no file-input component (`Dropzone` is the drag surface, not a button).

The action cluster is **derived, not declared**: 1 action = one primary button; 2 = outline + primary; 3+ = an "Actions" dropdown plus the first still inline as primary. There is no prop that names the overflow menu.

**PRESCRIPTIVE, not shipped.** No flagship MachineMetrics app uses `PageHeader` today, `knowledge-client` `src/components/Nav.tsx` hand-rolls the header and even imitates `PageHeader`'s internal `data-page-header` attributes. Prescribe `PageHeader` for every new page. Never copy the hand-rolled header, and never emit `data-page-header` attributes yourself; they are library internals.

**KNOWN LIMITATIONS (current release).** `TabConfig.badge`, `ActionConfig.icon`, and `ActionConfig.menuItems` (and therefore `MenuItemConfig`) are declared in the public types but never read by the renderer, setting them is a silent no-op. There is no subtitle prop. Tab counts require app-side composition: `PageHeader variant="default"` for the title and actions, plus your own `Tabs`/`TabsList`/`TabsTrigger` strip whose triggers each carry a `Badge` child (the second section of the example). Delete that workaround once the library renders `TabConfig.badge`.

## Recipe: empty and loading states

Never ship a bare sentence or a spinner-in-a-div for either state.

**Empty.** Compose `Empty` / `EmptyHeader` / `EmptyMedia` / `EmptyTitle` / `EmptyDescription` (and `EmptyContent` for a call to action). `EmptyMedia variant="icon"` is the tokenized icon badge, do not hand-build a rounded muted square. A page-level use ships in `examples/page-shell.tsx` (`node_modules/@machinemetrics/mm-react-components/examples/`); the live preview is `src/preview/EmptyPreview.tsx` in the library repo, which is not part of the published package.

**Loading.** Use `Skeleton` shaped like the content it replaces, same rough box count, same widths, so the layout does not jump on arrival. Live preview (library repo, not published): `src/preview/SkeletonPreview.tsx`. Do not fade a skeleton into a spinner; pick one per region.

Choose by cause: nothing exists yet → `Empty` with the create/upload action; a filter matched nothing → `Empty` whose description names the filter and offers to clear it; data is in flight → `Skeleton`; the request failed → an error surface, never `Empty`.

**Upload over live content is app-side composition.** When a page accepts dropped files, keep the real content rendered and overlay a drop affordance on top of it (`knowledge-client` `src/components/KnowledgeHubDragOverlay.tsx`). Do not swap the content region out for `Dropzone`'s empty state on drag, the user loses their place, and `DropzoneEmptyState` is for a dedicated upload surface, not for a populated list.

## Recipe: dialogs and toasts (STANDALONE apps only)

**Check first.** If `@machinemetrics/mm-react-tools` is installed, the app is embedded and you use **none** of this: the dashboard host owns all overlay chrome, its `confirm()`, `launchModal`, its sidesheet, and its toast API (`knowledge-client` `src/hooks/useToast.ts`, its `useToast` hook, is the shim that forwards to it). See the embedded-host rule.

**Confirmation.** There is no `ConfirmDialog` export. Compose `AlertDialog` / `AlertDialogTrigger` / `AlertDialogContent` / `AlertDialogHeader` / `AlertDialogTitle` / `AlertDialogDescription` / `AlertDialogFooter` / `AlertDialogCancel` / `AlertDialogAction` for a decision the user must make, and `Dialog` for anything they can dismiss and come back to.

**Footer idiom.** `mt-6 flex justify-end gap-2`, Cancel first as `variant="outline"`, then exactly one confirming action. Never two primaries.

**Destructive confirm.** Lead the content with the icon badge, one shape and size for every confirm, tint the only variable; see [house-style.md](house-style.md), then name the object in the title, state the irreversible consequence in the description, and label the action with the verb ("Delete document"), never "OK". `variant="destructive"` on the action; never rely on the red alone.

**Toasts.** Mount `<Toaster />` exactly once at the app root and call `toast` from anywhere, never a second `Toaster` per route or per dialog. House configuration (`knowledge-client` `src/index.tsx`, its `<Toaster />` mount): `richColors`, `closeButton`, `position="bottom-center"`. Toasts report what happened; they never ask a question, that is a dialog.
