# Dependency checks: implementation and assessment

This records the adoption of Knip **6.41.0** and dependency-cruiser **18.6.0**
after the folder reorganization and the move of lint tests to `lint/tests`.
The [original assessment](dependency-analysis.md) predates that layout.
Both tools are pinned, use their supplied analyses, and run in parallel CI jobs.
There are no accepted-findings baselines or custom graph analyzers.

## Results and code changes

After resolving discovery issues, the starting reports contained:

| Analysis                                      | Before cleanup | Enforced result |
| --------------------------------------------- | -------------: | --------------: |
| Knip unused value exports, normal run         |             49 |               0 |
| Knip unused type exports, normal run          |             11 |               0 |
| Additional value exports unused in production |              4 |               0 |
| Eager runtime file cycles                     |              0 |               0 |
| Runtime folder-cycle edges                    |             26 |               0 |
| Other enabled blocking findings               |              0 |               0 |

Folder counts describe reported dependency edges, not 26 independent cycles.
Knip findings describe unnecessary exported APIs, not 60 removable functions.
Most declarations remain in place as private implementation details. The unused
`GAME_HEIGHT` constant and `SequenceScore` alias were removed. Other numeric
constants remain local where their modules still use them.

Three exports existed only as test-facing re-exports: `CODE_SLICES`,
`debrisRandom`, and `createDeathFragments`. Tests now import their actual
implementation modules. The fourth production-only finding was `loadMesh`,
a convenience wrapper used only by the model test. That wrapper was removed;
the test now exercises the production `loadGeometry` API for the same 20 mesh
shapes, alongside the existing 19 group-model and resource-ownership checks.

The folder-cycle gate exposed shared responsibilities stored with callers:

- Shared model loading, glyph textures, and GPU-resource helpers moved from
  `rendering` to `graphics`, so code construction and debris do not depend on
  the world renderer to access those primitives.
- Authored code samples moved from rendering-oriented `code` to `content`.
- Shared code settings and surface helpers moved into `code/common`.
- Simulation collision helpers moved into `simulation/collision`; particle
  emission moved into `simulation/effects`, separate from the runtime coordinator.

These moves preserve existing bodies and calculations. No artificial layer
matrix, dependency injection framework, callbacks, or barrels were introduced
to make the graph pass. Folder/file limits still apply. The production output
was byte-for-byte identical to the previous build after cleanup; all 91 unit
tests passed. Browser verification also runs in CI.

## Blocking checks

| Rule or analysis                          | Effect here                                                  | Policy and benefit                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Knip `files`                              | No genuinely unused files after discovery was corrected      | Error; identifies unreachable modules, including disconnected groups.                                                                           |
| Knip `exports`, `types`                   | 49 value and 11 type export findings                         | Error; keep module APIs limited to actual consumers.                                                                                            |
| Knip `--production`                       | Four additional unused exports                               | Separate error gate; tests cannot silently preserve unnecessary production APIs.                                                                |
| Knip `includeEntryExports`                | Enabled for this private application                         | Check application entry exports while retaining recognized framework contracts.                                                                 |
| Knip `dependencies`, `devDependencies`    | No unused declared packages after command wiring             | Error; package imports, scripts, and tool configurations establish usage.                                                                       |
| Knip `unlisted`, `binaries`, `unresolved` | Vite browser URLs needed path mapping; no remaining findings | Error; includes script binaries and plugin/config references, beyond import edges.                                                              |
| Knip `duplicates`                         | No duplicate-export findings                                 | Error; redundant exports, distinct from jscpd implementation duplication.                                                                       |
| Knip `enumMembers`, `namespaceMembers`    | No findings                                                  | Keep defaults; currently no unused exported members to remove.                                                                                  |
| Knip `nsExports`, `nsTypes`               | No additional findings                                       | Enabled alongside defaults; own modules currently do not escape as opaque namespace objects. Reassess if dynamic namespace usage is introduced. |
| dependency-cruiser `no-non-package-json`  | No undeclared imported packages                              | Error from the recommended preset; rejects reliance on undeclared/transitive packages.                                                          |
| dependency-cruiser `not-to-unresolvable`  | Correct export-map resolution removed false package findings | Error from the preset; verify every scanned import resolves, including type dependencies.                                                       |
| dependency-cruiser `no-circular`          | No eager runtime file cycles                                 | Error; evaluate every edge in a cycle, ignoring cycles broken by erased types or deferred dynamic imports.                                      |
| dependency-cruiser `not-to-dev-dep`       | No production runtime imports of dev packages                | Error; tests/tooling and erased type-only dependencies remain valid.                                                                            |
| dependency-cruiser `not-to-spec`          | No production imports of test/lint modules                   | Error; production consumers cannot import tests, lint tooling, or test-named files. Test-to-test imports remain valid.                          |
| dependency-cruiser folder `circular`      | 26 runtime cycle edges removed                               | Error across source folders at every depth; meaningful after reorganization.                                                                    |

Knip retains the normal default issue types; adding `nsExports`/`nsTypes` is
additive in this pinned version. Its normal run covers tests and tooling;
production mode checks application code rooted at `src/main.ts` and follows
its lazy scene import. `src/**/*.test.ts` files are not production roots.

The limited overlap on import resolution/package declarations is deliberate:
Knip discovers script binaries and plugin configuration references, while
dependency-cruiser validates graph edges and package dependency classifications.
Knip cycle checking is not enabled, and dependency-cruiser's orphan rule is
disabled: there is one primary cycle gate and one reachability analyzer.

## Discovery and project-specific configuration

The configurations are small declarations of the actual runtime and tooling:

- `knip.json` marks `src/main.ts` and source project files as production inputs.
  Test runners and lint/tool plugins supply normal-run entry contracts.
- Knip `paths` maps `/src/*` and `/tests/*` to disk. These are Vite URLs inside
  Playwright's browser-evaluated callbacks. Without mapping, the initial scan
  falsely reported eight unresolved URL imports and seven unused helper files.
  The mappings resolve real files; they do not suppress missing-path findings.
- Native `#root/*` package imports work in both tools. dependency-cruiser also
  resolves the browser-root URLs without an extra alias.
- dependency-cruiser reads `tsconfig.lint.json`, package export maps and
  `import`/`node`/`default` conditions. This is necessary for Three.js addon
  imports and modern tooling package exports. CSS and JSON imports resolve;
  package contents are recorded but not recursively scanned.
- Only project-root generated output and reports are excluded; package-owned
  `dist` directories remain visible. Excluding every `dist` path would hide
  real npm dependencies. The full dependency pass scans
  `src`, `tests`, `lint`, and root TypeScript configuration modules.
- The full pass includes and classifies TypeScript pre-compilation dependencies
  for resolution and package checks. Its cycle rule tests the whole cycle.
- A second source-only graph, `lint/dependencies/runtime.json`, excludes test
  files and erases type imports before folder analysis. Folder rules in this
  tool version cannot filter cycle edges with `viaOnly`; setting that option
  on a full type/test folder graph would give misleading runtime results.
  Deferred `import()` edges are excluded from this eager-cycle graph.
  The full pass and Knip still resolve and analyze their target modules.

Normal reachability and production reachability intentionally differ. An
unused production module cannot be hidden by marking every source file as an
entry, or by allowing a test to serve as its production consumer.

Public assets loaded via strings, `import.meta.env.BASE_URL`, DOM markup, and
GLB model names require runtime/build validation. Neither tool proves that a
model, music file, image, or WASM resource is unused. No assets were deleted
based on these scans. These tools also do not validate the semantics of
browser-evaluated callbacks or invent architectural boundaries.

## Disabled, irrelevant, and deferred policies

| Analysis                                     | Current observation                                                     | Treatment / required wiring                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Module `moreUnstable`                        | Initial trial produced 14 findings                                      | Disabled; the warning-only configuration, command, and CI artifact were removed.                                                 |
| Folder `moreUnstable`                        | Initial trial produced 27 findings, including aggregate parent folders  | Disabled; folder aggregation makes the metric especially sensitive to organization.                                              |
| `no-duplicate-dep-types`                     | No warnings                                                             | Disabled; a declaration in multiple dependency sections can be intentional.                                                      |
| `no-deprecated-core`, `not-to-deprecated`    | No warnings                                                             | Disabled with the other advisory-only checks; these migration signals are not a vulnerability audit.                             |
| dependency-cruiser `no-orphans`              | Narrower than Knip reachability                                         | Disabled to avoid duplicate/noisy unused-module enforcement.                                                                     |
| `optional-deps-used`, `peer-deps-used`       | This application declares neither section                               | Not enabled; imported optional/peer dependencies can be intentional.                                                             |
| Dependent-count conditions                   | No agreed size or fan-in budget                                         | Not enabled; thresholds need evidence and a module-specific responsibility policy.                                               |
| `ancestor`                                   | Legitimate imports of shared parent-level values                        | Not enabled; directory position does not establish a forbidden dependency. Root-based imports remain enforced separately.        |
| Import module-system/dynamic classifications | Native ESM, lazy scene loading, and browser-test imports are legitimate | Used to classify cycles, not to prohibit lazy loading or namespace imports globally.                                             |
| `license` / `licenseNot`                     | No supplied licensing policy                                            | Not enabled; needs explicit allowed/disallowed license patterns and review of metadata quality.                                  |
| `reachable`, `required`                      | No specified transitive boundary or mandatory dependency                | Can protect specific transitive boundaries below; no mandatory-dependency requirement exists. Knip owns unused-module detection. |
| Path capture groups / layer / feature rules  | Shared helpers and orchestration have real cross-folder consumers       | Useful for the focused boundaries below; a global layer matrix is unnecessary.                                                   |
| Knip catalog checks                          | No workspace catalogs                                                   | Default checks have no current effect; relevant only if catalogs are adopted.                                                    |
| Knip `--strict`                              | Single package; no workspace isolation problem                          | Not enabled. Production mode already runs; stricter peer/type-dependency policies need a packaging requirement.                  |
| Knip `cycles` / `cycles.dynamicImports`      | dependency-cruiser owns eager runtime cycles                            | Not enabled; duplicate cycle gates add little, and lazy edges need different interpretation.                                     |
| Knip `ignoreExportsUsedInFile`               | Locally used helpers do not need to be exported                         | Not enabled; it would hide unnecessary exported APIs.                                                                            |

Instability is a graph ratio, not measured volatility or defect risk. For
example, the audio facade depends on its effect dispatcher (instability about
0.857 versus 0.875), and the code-mesh facade depends on its actual mesh
builders (about 0.429 versus 0.750–0.800). These are ordinary composition
relationships. Making every warning fatal would pressure developers to inline
helpers, add artificial abstractions, or merge distinct modules solely to alter
fan-in/fan-out. That would be counterproductive here. The initial counts are retained here
as assessment evidence. These checks no longer run locally or in CI; there
is no advisory report command or artifact.

Other potentially destructive interpretations are deleting assets/tests from
an unconfigured unused-file report, treating every test/type/lazy cycle as an
eager runtime cycle, banning imports of ancestor folders, enforcing arbitrary
consumer counts, and running automatic file deletion without review. None of
those policies is enabled. Runtime folder-cycle enforcement became useful
because it exposed misplaced shared code; it was not used to force unrelated
subsystems into one folder.

## Useful project-specific boundaries to consider next

Cycle freedom alone does not enforce dependency direction: a new renderer import
in simulation can break isolation without introducing a cycle. The reorganized
folders now make several focused policies practical. A dry run of built-in
path and dependency-type conditions against the current source graph found:

| Proposed boundary                                                                                       | Current findings | Benefit / prerequisite                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simulation cannot import presentation or visual-physics implementations, Three.js, or Rapier at runtime | 0                | Preserve renderer-independent simulation and headless tests. Include audio, scene, code rendering, graphics, debris, and browser UI entry modules among forbidden targets; preserve legitimate shared data/type imports.                                |
| `geometry`, `graphics`, and `content` cannot import higher-level gameplay or presentation modules       | 0                | Keep reusable primitives from acquiring simulation, world-renderer, code-surface, debris, scene, audio, or UI responsibilities. Three.js remains valid in geometry/graphics; content can stay dependency-free.                                          |
| `rendering`, `code`, and `debris` cannot import simulation implementations at runtime                   | 1                | Keep visual code from loading gameplay systems. `rendering/display/world-timeout.ts` imports `TIMEOUT_METRICS` through `simulation/simulation.ts`; it could import directly from `simulation-types.ts`. Permit shared data/constants and type imports.  |
| Simulation contracts cannot be owned by the renderer                                                    | 1                | `simulation/simulation-types.ts` imports/re-exports `RobotPose`/`RobotBrand` from `rendering/robots/robot-types.ts`. Move those data-only contracts into simulation or a shared contracts module, then forbid the dependency including type-only edges. |
| Audio cannot import gameplay, rendering, scene, or UI modules                                           | 0                | Preserve the existing event-driven audio boundary. The application coordinates sound and gameplay; the sound engine does not need access to game state.                                                                                                 |

The first two are the strongest regression guards; the next two expose small,
concrete ownership/import cleanups. Audio isolation is useful but lower priority
because the subsystem already has no imports outside its own folder.
These are recommendations, not newly enabled rules in the warning-removal change.
No game sources were modified for these candidate policies.

All can use dependency-cruiser's supplied path/dependency-type conditions.
For stronger indirect restrictions, `reachable` can also reject forbidden
subsystems reached through intermediate helpers. Runtime reachability needs
an erased-type graph that still includes dynamic imports: lazy loading does not
make a forbidden architectural dependency valid. The existing folder-cycle
pass deliberately excludes dynamic edges, so it cannot be reused unchanged
for that stronger policy. Colocated tests need separate scope, as in the
existing production checks.

An import restriction does not prove deterministic behavior or prevent a
renderer from mutating a simulation object passed to it. Those guarantees
would require seeded-random/global-API lint policies or readonly render-state
contracts, respectively. Mandatory barrels, arbitrary fan-in budgets, or moving
code purely to improve instability ratios would add constraints without the
same architectural justification.

## Running and enforcing the checks

- `npm run lint:unused`: normal Knip gate, including namespace-export analysis.
- `npm run lint:unused:production`: independent production-only Knip gate.
- `npm run lint:dependencies`: full import-integrity/module-cycle check followed
  by the eager-runtime folder-cycle check. The default `err` reporter returns
  nonzero on errors, so violations actually fail local lint and CI.

The three blocking commands are also part of `npm run lint`. GitHub Actions
runs them in independent parallel jobs alongside the existing checks.
Only blocking dependency policies run; the warning-only configuration and
`dependency-metrics` artifact have been removed. The inherited deprecation and
duplicate-dependency-section warnings are explicitly disabled as well.

All enabled blocking analyses must pass with zero errors. There are no issue
allowances or baselines. The original report's external documentation links
remain the references for the supplied rule conditions and Knip modes.
