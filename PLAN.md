# TypeScript migration plan

## Objective and scope

Convert all seven maintained JavaScript files to strict TypeScript: the five
browser modules in `src/`, `scripts/validate-data.ts`, and `vite.config.ts`.
Keep the directory's behavior, public URLs, and JSON records intact. HTML, CSS,
SVG assets, workflow YAML, and the three JSON datasets retain their formats.
Generated files in `dist/` and dependency code are outside the migration scope.

The migration and structural cleanup are implemented in the working tree. The
checklist records completed infrastructure work and the remaining follow-up for
removing temporary UI compatibility boundaries.

## Current setup

- Vite serves three entry pages: `index.html`, `students.html`, and `submit.html`.
- `src/data.ts` fetches faculty, students, and awards as JSON, normalizes fields,
  and links records by name.
- `src/common.ts` provides search, suggestions, commands, keyboard controls,
  and shared rendering helpers.
- `src/main.ts`, `src/students.ts`, and `src/submit.ts` implement the page UIs.
- The data validator checks JSON properties and roster conventions but is not
  currently part of the build command.
- `.nvmrc` specifies Node 24; the deployment workflow currently specifies Node 20.
- Vite injects three string build constants: `__BUILD_COMMIT__`,
  `__BUILD_TIMESTAMP__`, and `__BUILD_LABEL__`.

## 1. Establish the baseline

- [ ] Run the existing validator and production build before changing code.
- [ ] Record dataset counts and preserve a field-for-field baseline of the JSON
  files. Do not change data or maintenance timestamps for a code-only migration.
- [ ] Smoke-test all three pages, faculty awards, and student insights,
  search/filter URLs, and submission form prefilling.
- [ ] Record any existing failures separately from migration regressions.

## 2. Add TypeScript tooling

- [x] Add TypeScript and Node type definitions as development dependencies.
- [x] Add separate browser and tooling TypeScript configurations, with a shared
  strict baseline. Browser configuration includes DOM libraries and Vite client
  types; tooling configuration includes Node types and covers the validator and
  Vite configuration. Include tests in the appropriate configuration.
- [x] Use `strict`, `noEmit`, and `noUncheckedIndexedAccess`. Choose module and
  import resolution settings appropriate to Vite in the browser and the selected
  Node runner for scripts. Document one consistent import-extension convention.
- [x] Use a TypeScript runner such as `tsx` for the validator and TypeScript
  tests, so execution does not depend on implicit Node type stripping.
- [x] Add `src/vite-env.d.ts` for Vite client types, CSS imports, and the build
  constants declared by `vite.config.ts`.
- [x] Add `typecheck` and `validate:data` npm scripts. During staged conversion,
  temporary JavaScript interop is allowed, but remove it at completion.
- [x] Align CI with `.nvmrc` using the workflow's Node version-file setting.

## 3. Define and validate data contracts

- [ ] Add shared raw record types for faculty, students, and awards, preserving
  the existing human-readable JSON keys and string values, including blanks.
- [ ] Add separate normalized UI types for faculty, students, awards, award
  categories, and advisee summaries. Type maps, arrays, nullable links, and UI
  state such as randomized sort indices explicitly.
- [x] Convert the validator to `scripts/validate-data.ts`. Treat parsed JSON as
  `unknown`; check arrays, object entries, required and unexpected properties,
  and property value types before trimming or reading values.
- [ ] Share runtime record validation between tooling and browser loading where
  practical, in a module with no DOM or Node dependencies. Keep roster policy
  checks in the CLI validator and avoid bringing filesystem code into the browser.
- [ ] Preserve useful failures for malformed JSON, null entries, wrong value
  types, and missing keys. Report filenames and record indexes or names, rather
  than misleading CSV-style line numbers.
- [x] Convert `src/data.ts` to typed data contracts with explicit loader return types.
  Validate network JSON before normalizing it; a type assertion alone does not
  validate fetched data.

## 4. Convert shared UI and page modules

- [ ] Type `src/common.ts` first. Make search controllers
  generic over their record type; type keyword accessors, suggestion sources,
  callbacks, command handlers, and query results.
- [ ] Introduce narrow DOM helpers or guards for required elements. Use the
  appropriate input, select, form, button, and textarea types. Handle optional
  elements and narrow event targets before accessing element-specific properties.
- [ ] Type `src/main.ts` and `src/students.ts`. Type filters, sort modes, view state, and aggregations;
  guard empty arrays and missing insight data exposed by strict checks.
- [ ] Type `src/submit.ts`. Use a discriminated faculty vs.
  student list configuration so each formatter receives its correct record type.
  Narrow submit events and submitter buttons safely.
- [ ] Preserve search aliases, URL restoration, keyboard behavior, HTML escaping,
  safe links, email URLs, and GitHub issue generation. Do not send submissions
  during tests.
- [ ] Avoid blanket `any`, `@ts-ignore`, unchecked JSON casts, and widespread
  non-null assertions. Resolve the underlying uncertainty or document a narrow
  boundary assertion supported by a runtime check.

## 5. Integrate build and deployment

- [x] Keep `vite.config.ts`, retaining the `/people/` base,
  three HTML inputs, commit lookup, and build metadata.
- [x] Update HTML module entry paths and internal imports for renamed files.
- [x] Make `npm run build` run type checking and data validation before
  `vite build`; Vite transpilation alone is not a type check.
- [ ] Keep GitHub Pages deployment gated on the full build and focused tests.
- [ ] Update README commands and maintenance references to the TypeScript
  validator, runtime requirement, and development workflow.
- [x] Remove superseded JavaScript files and temporary migration configuration.

## 6. Verify and complete

- [ ] Add focused tests for malformed JSON and record types, normalization and
  faculty/advisor/award joins, keyword parsing, and submission formatting where
  conversion touches those boundaries. Avoid tests that merely repeat interfaces.
- [ ] Run a clean dependency install, type checks for browser and tooling, data
  validation, focused tests, and the production build.
- [ ] Confirm the JSON files are byte-for-byte unchanged from the baseline.
- [ ] Preview the production build and repeat the baseline browser checks,
  including form autocomplete and browser back/forward navigation.
  Check for console errors and failed assets under `/people/`.
- [ ] Confirm no maintained `.js` modules or stale entry paths remain, excluding
  generated output and dependencies.
- [ ] Review the diff, then commit and push the migration when implementation is
  requested. Verify the deployment result. Preserve a revertable commit boundary.

## Completion criteria

All maintained executable code is TypeScript, strict checks cover browser and
tooling code, runtime JSON validation catches malformed records safely, the build
enforces both type and data checks, and the existing directory workflows pass
without changes to roster content.
