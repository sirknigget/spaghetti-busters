# TypeScript dependency and architecture analysis

Report date: 2026-10-16.

Implementation results for the reorganized project are recorded in
[Dependency checks: implementation and assessment](dependency-enforcement.md).
The repository context below describes the earlier layout.

## Recommendation

Use **Knip** for unused code, exports, and packages, and
**dependency-cruiser** for dependency integrity and architectural graph analysis.
Start with their existing analyses and standard configuration. Avoid introducing
layer classifications or a matrix of permitted imports until the project has a
concrete architectural requirement that needs them.

The strongest additions for this repository are:

1. Unused files, exports, exported types, and dependencies through Knip.
2. Undeclared dependencies and unresolved imports, with bundler-aware resolution.
3. Runtime circular dependencies through dependency-cruiser.
4. Production-only unused-code analysis through Knip, alongside its normal run.
5. Advisory instability analysis through dependency-cruiser, evaluated for noise.

This is a tool assessment and proposed policy, not an analysis result for the
repository. Neither tool was installed or run for this report, and no findings
counts or clean baseline are claimed. The package versions checked during the
research were dependency-cruiser 18.6.0 and Knip 6.41.0; verify compatibility and
current documentation when implementing.

## What “built-in” means

Knip supplies issue types that mostly run by default, plus options and modes that
extend their coverage. It automatically recognizes many frameworks and tools.

Dependency-cruiser supplies built-in graph analyses and matching conditions. Its
initializer generates standard rules, but most additional policies need a small
declarative rule. For example, enabling `moreUnstable` uses an existing analysis;
it does not require implementing an analyzer or naming architectural layers.

There are three different configuration costs:

| Cost                          | Examples                                                           |
| ----------------------------- | ------------------------------------------------------------------ |
| Enable an existing analysis   | Runtime cycles, instability, stricter namespace-export analysis    |
| Supply a parameter or scope   | A dependent-count threshold, source paths, production entry points |
| Describe architectural intent | Layer direction, feature isolation, public entry points            |

The first two can provide useful results without a custom architecture model.
Even these tools need correct file discovery and resolution: “built-in” does not
guarantee accurate results for every layout without adjustments.

## Repository context

The repository is a private, single-package TypeScript application using Vite,
Three.js, and Rapier. Its browser entry is `src/main.ts`, referenced by
`index.html`. Unit tests live under `src` as `*.test.ts`; browser tests live in
`tests`. Most game implementation lives directly in `src/game`.

Existing checks include TypeScript compilation, type-aware Oxlint, ESLint,
Stylelint, and several duplicate-detection profiles. Oxlint already enables
import checks including self-imports, duplicate imports, absolute paths, and
mutable exports. Neither Knip nor dependency-cruiser is currently declared in
`package.json`.

The biggest additional value is analysis across files and entry points. Adding
another general import-lint plugin should follow an overlap review. Workspace
isolation checks and monorepo manifest tools have little immediate relevance.

## Dependency-cruiser: starter rules

The initializer supplies these standard policies. The identifiers below are
generated rule names, not separate plugin implementations.

| Generated rule                             | Detects                                                                             | Suggested treatment                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `no-circular`                              | Circular import relationships                                                       | Start with warnings; use runtime-only semantics for the proposed eventual error gate |
| `no-non-package-json`                      | Imported npm packages missing from dependency declarations                          | Error after resolution and scope are verified                                        |
| `not-to-unresolvable`                      | Imports that cannot be resolved                                                     | Error after Vite asset and special-import handling are verified                      |
| `not-to-dev-dep`                           | Runtime source relying on development-only packages                                 | Error after source, test, and tooling scopes are verified                            |
| `not-to-spec`                              | Imports of conventionally named test files                                          | Error for production consumers; review legitimate test-to-test imports               |
| `no-duplicate-dep-types`                   | Imported packages appearing in multiple dependency sections                         | Warning; review intent                                                               |
| `no-orphans`                               | Modules with no incoming or outgoing dependencies                                   | Advisory; Knip is the preferred unused-file analyzer                                 |
| `no-deprecated-core` / `not-to-deprecated` | Certain deprecated Node modules or packages marked deprecated in available metadata | Advisory migration signal                                                            |
| `optional-deps-used` / `peer-deps-used`    | Imports of optional or peer dependencies                                            | Review only; these declarations can be intentional                                   |

The generated paths depend on initialization choices. Production-versus-test
checks are not independent of the repository layout. An orphan is also narrower
than an unused module: an unreachable group of files that imports internally
does not necessarily contain any orphans.

## Dependency-cruiser: additional configurable analyses

| Analysis or condition                                                         | Useful finding                                                                                                                  | Configuration cost                                        | Recommendation here                                                                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Folder cycles: `scope: "folder"`, `circular`                                  | Folders mutually depend on each other even without a file-level cycle                                                           | Enable folder scope; select meaningful paths if necessary | Revisit when there are multiple meaningful subsystem folders; most game files currently share one directory |
| Stable Dependencies Principle: `moreUnstable`                                 | A module depends on another with higher calculated instability                                                                  | Enable condition; optionally select folder scope          | Trial as an advisory report                                                                                 |
| Dependent counts: `numberOfDependentsMoreThan` / `numberOfDependentsLessThan` | Widely depended-on modules, or abstractions with very few consumers                                                             | Choose thresholds and optional scopes                     | Investigate manually before choosing thresholds; do not gate initially                                      |
| Selective cycles: `via` / `viaOnly`                                           | Runtime-only cycles, cycles touching selected modules, or cycles escaping an area                                               | Select dependency types or paths                          | Use runtime-only filtering; defer path-based exceptions until justified                                     |
| Ancestor imports: `ancestor`                                                  | Imports targeting modules in ancestor directories                                                                               | Enable condition                                          | Do not enable globally: directory position alone does not define valid dependency direction                 |
| Import classification: `dependencyTypes`, `dynamic`, related conditions       | Dependencies introduced through selected module systems, dynamic imports, or runtime imports where only types should be allowed | Choose categories; sometimes paths                        | Keep valid lazy imports; use restrictions only for a concrete requirement                                   |
| License matching: `license` / `licenseNot`                                    | Imported packages with matching or nonmatching declared license strings                                                         | Supply license patterns                                   | Optional if an explicit license policy exists; not a general architecture check                             |
| Reachability: `reachable`                                                     | Unreachable subtrees, or forbidden indirect dependencies through intermediate modules                                           | Define roots or source/target paths                       | Prefer Knip for unused code; reserve reachability for a specific transitive boundary                        |
| Required dependencies: `required`                                             | Selected modules fail to import a required module, directly or transitively                                                     | Define applicable modules and required targets            | Defer; no general requirement has been established                                                          |
| Path matching and captured groups                                             | Feature isolation, layer direction, or restrictions on internal-module imports                                                  | Describe folder conventions and allowed relationships     | Defer until the architecture warrants these policies                                                        |

Instability is the ratio of outgoing dependencies to the sum of incoming and
outgoing dependencies. It measures graph structure, not observed code churn or
defect risk. Highly depended-on utilities and entry-point orchestration can both
be legitimate. Dependent-count checks measure incoming consumers, not a general
maximum on outgoing imports or proof of a module having too many responsibilities.

Runtime cycle filtering should evaluate the whole cycle. A type-only edge can
break a cycle at runtime even if other edges are runtime imports. The documented
pattern uses `viaOnly` with `dependencyTypesNot: ["type-only"]`. TypeScript
pre-compilation dependency options also affect whether type relationships are
included and classified.

## Knip: default checks

| Issue types                       | Useful finding                                                            | Suggested treatment                                        |
| --------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `files`                           | Files unreachable from recognized entry points                            | Review discovery first; then error                         |
| `exports`, `types`                | Exported values, classes, interfaces, aliases, or enums without consumers | Review public and framework contracts first; then error    |
| `enumMembers`, `namespaceMembers` | Unused individual exported members                                        | Review dynamic access; then error where reliable           |
| `dependencies`                    | Unused runtime and development dependencies                               | Review scripts and tooling discovery; then error           |
| `unlisted`, `binaries`            | Imported packages or script binaries missing from declarations            | Error after scope is verified                              |
| `unresolved`                      | Unresolved import specifiers                                              | Error after bundler conventions are handled                |
| `duplicates`                      | The same declaration exported multiple ways                               | Review and remove redundant API exposure                   |
| `catalog`, `catalogReferences`    | Unused package-catalog entries or references to missing entries           | No immediate relevance: no workspace catalog is configured |

Duplicate exports do not mean duplicate implementations; the existing duplicate
detectors cover a different problem. Knip also reports referenced optional peer
dependencies, which warrant review rather than an assumption of incorrect use.

Framework and tooling plugins activate automatically and add recognized entry
files. This is important for Vite, Vitest, Playwright, and configuration files.
Unusual entry points, computed dynamic imports, and runtime asset loading can
still need configuration. Unused-file results are only meaningful after entry
discovery is correct.

## Knip: additional options and modes

| Option or mode                    | Additional coverage                                                                                                                         | Recommendation here                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `--production`                    | Code that only tests, stories, or development tooling keep reachable                                                                        | Run alongside the normal analysis; confirm production roots                                                     |
| `--strict`                        | Production analysis plus stricter workspace dependency isolation, required peer-dependency checks, and production type-dependency treatment | Optional later; workspace isolation has little value for the current single package                             |
| `includeEntryExports: true`       | Unused exports from entry source files that are normally preserved for external consumers                                                   | Recommended for this private application after checking entry contracts                                         |
| Include `nsExports` and `nsTypes` | Individual unused exports hidden by conservative handling of namespace objects                                                              | Trial as advisory; passing an entire namespace to a consumer can make results uncertain                         |
| Include `cycles`                  | Runtime circular imports; excluded from the default report                                                                                  | Optional alternative or cross-check; use dependency-cruiser as the primary cycle gate if both tools are adopted |
| `cycles.dynamicImports: true`     | Cycles that also traverse dynamic-import edges                                                                                              | Off initially: lazy loading is legitimate and these edges defer evaluation                                      |

Knip cycles are warnings by default even when included. Set `rules.cycles` to
`"error"` explicitly if Knip becomes the chosen CI cycle gate. Avoid two tools
blocking on the same cycles without a clear benefit.

Production mode uses production entry/project patterns supplied by plugins or
marked with a trailing `!` in configuration. It can therefore require a small
entry-point definition. For this project, verify that Vite discovers
`src/main.ts` and that the lazy renderer import is followed. No custom layer model
is necessary.

`includeEntryExports` does not indiscriminately check every plugin-discovered
route or configuration export. Knip preserves framework contracts. Similarly,
`ignoreExportsUsedInFile` relaxes unused-export reporting; it is not an additional
strictness option. Keep the normal ability to identify declarations that should
remain local rather than exported.

## Proposed adoption sequence

1. **Establish file discovery and resolution.** Pin tool versions, use the project
   TypeScript configuration, inspect discovered entry points, and account for
   Vite imports, JSON, CSS, lazy modules, and public assets. Exclude generated
   output such as `dist`, reports, and coverage. Preserve test and configuration
   coverage in Knip's normal run.
2. **Review the first reports.** Classify actual unused code and dependency
   defects separately from discovery limitations. Do not delete code or assets
   solely because an initial static report calls them unused.
3. **Enable the reliable gates.** After cleanup and configuration validation,
   enforce unused code/packages, undeclared dependencies, unresolved imports,
   production use of dev dependencies, and runtime cycles. Scope test-import
   restrictions to production consumers.
4. **Add a separate production report.** Catch code whose only consumers are
   tests. Promote it to a gate once production discovery is reliable.
5. **Trial architectural metrics separately.** Inspect instability and optional
   namespace-export findings. Keep them outside the blocking lint path until
   their usefulness is established; the existing ESLint command rejects warnings.
6. **Add architecture-specific rules only for an observed need.** Define a
   transitive boundary or public-module contract when a concrete violation would
   otherwise recur. Do not invent layers solely to configure a tool.

No numerical dependent-count limit is recommended without examining the actual
graph. Folder-level checks should follow meaningful directory structure, rather
than require reorganizing files merely to obtain metrics.

## Other tools considered

| Tool                                          | Assessment against the preference for useful built-ins                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| eslint-plugin-import-x                        | Useful editor feedback and additional import policies, but many checks require explicit enabling; review overlap with existing Oxlint before adoption    |
| Steiger with the Feature-Sliced Design plugin | Strong supplied architectural opinions if adopting Feature-Sliced Design; does not match the current structure, and the project describes itself as beta |
| Sherif                                        | Useful zero-config monorepo manifest checks; little immediate value for this single package                                                              |
| eslint-plugin-boundaries                      | Useful enforcement engine, but requires file classification and architectural policies                                                                   |
| Nx module boundaries                          | Useful in an Nx workspace with project tags and dependency constraints; disproportionate setup here                                                      |
| Madge                                         | Useful graph and cycle inspection; dependency-cruiser supplies broader validation                                                                        |

Neither recommended tool infers the intended architecture, proves good separation
of responsibilities, or replaces runtime tests. Their main shared limitation is
that dynamic behavior and nonstandard discovery can obscure actual usage.

## Sources

- [dependency-cruiser overview and initialization](https://github.com/sverweij/dependency-cruiser)
- [dependency-cruiser generated starter rules](https://github.com/sverweij/dependency-cruiser/blob/main/src/cli/init-config/config-template.mjs)
- [dependency-cruiser rule conditions and examples](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
- [dependency-cruiser options, including TypeScript pre-compilation dependencies](https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md)
- [Knip issue types](https://knip.dev/reference/issue-types)
- [Knip configuration and automatic plugins](https://knip.dev/overview/configuration)
- [Knip configuration reference](https://knip.dev/reference/configuration)
- [Knip production and strict modes](https://knip.dev/features/production-mode)
- [Knip namespace-import analysis](https://knip.dev/guides/namespace-imports)
- [Knip rules and filters](https://knip.dev/features/rules-and-filters)
- [eslint-plugin-import-x](https://github.com/un-ts/eslint-plugin-import-x)
- [Steiger](https://github.com/feature-sliced/steiger)
- [Sherif](https://github.com/QuiiBz/sherif)
- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries)
- [Nx module boundaries](https://nx.dev/technologies/eslint/eslint-plugin/recipes/enforce-module-boundaries)
- [Madge](https://github.com/pahen/madge)
