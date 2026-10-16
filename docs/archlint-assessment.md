# Archlint: additional coverage for this project

Assessed on 2026-10-16 using `@archlinter/cli` 0.17.1 against the working tree
based on `c7e63a8`. This compares actual configured checks, detector
implementations, and exploratory scan results. Findings are candidates for
review, not confirmed defects.

## Recommendation

Archlint adds cohesion, cross-file coupling, dependency cycles, unused public
symbols, and Git-history-based design signals. Its complexity, nesting, file
size, parameter-count, and clone checks mostly duplicate existing enforcement.

The most relevant additions for the discussion about deep modules are `lcom`
and `module_cohesion`. Both should initially be advisory: the current findings
include legitimate facades, settings files, and related type declarations.
Feature envy is particularly noisy on this codebase and should not become a
default blocking rule.

## Method and setup requirements

Two scans enabled all detectors and disabled caching. The first used no custom
configuration; the second supplied only this alias mapping in a temporary file:

```yaml
aliases:
  "#root/*": "./*"
```

Both analyzed 168 files under archlint's default discovery and exclusions. That
scope is not identical to the existing lint and test scopes. No dependency,
script, or analyzer configuration was added to the project.

The alias mapping is necessary in this version despite the existing
`package.json#imports` definition. Without it, archlint reported `#root` as an
external dependency, found no cycles, and produced 53 unused-symbol findings.
With it, the unused-symbol count fell to 3 and the graph analyses found more
relationships. This is resolver setup, not an architectural layer definition.

The second scan produced 104 reports. Its raw score is not used as an assessment
of the architecture: the total is dominated by heuristics requiring review.

## Coverage that the project does not currently have

| Detector                            | Additional measurement                                                        | Trial result                               | Assessment                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `lcom`                              | LCOM4 groups methods through shared fields or calls between methods           | 1 class: `Simulation`, score 10            | Useful new measurement, but delegation through helper functions is not followed deeply enough to establish responsibility boundaries |
| `module_cohesion`                   | Groups exports through shared referenced symbols or references to one another | 12 files                                   | Worth an advisory trial; most findings concern settings, constants, or types rather than unrelated implementations                   |
| `feature_envy`                      | Ratio of referenced imported symbols to referenced internal declarations      | 64 files                                   | New heuristic, but too noisy for a gate; even `eslint.config.ts` is flagged for composing imported rules                             |
| `high_coupling`                     | Sum of incoming and outgoing file dependencies                                | 4 files                                    | Useful graph visibility; popularity alone does not make shared constants or facades defective                                        |
| `hub_module`                        | High incoming/outgoing connectivity with low function complexity              | 4 files                                    | Can identify connector modules hidden by low per-function complexity; legitimate facades also match                                  |
| `sdp_violation`                     | Dependencies directed toward components with higher graph instability         | 9 reports                                  | Advisory review signal; does not measure actual source-code stability or churn                                                       |
| `cyclic_dependency`                 | Strongly connected file groups                                                | 3 clusters containing 24 files             | New coverage, but sampled clusters include type-only return edges; do not interpret the count as runtime initialization cycles       |
| `dead_symbols`                      | Unused exports and public methods across files                                | 3 symbols                                  | Adds cross-file usage checks beyond local unused-variable rules; Knip remains an alternative with different discovery behavior       |
| `orphan_types`                      | Exported types without recognized consumers                                   | 1 report overlapping a dead-symbol finding | Useful cleanup coverage, but avoid double-counting it                                                                                |
| `dead_code`                         | Files without recognized import consumers                                     | 1 file: `lint/project-plugin.js`           | The sample is loaded by Oxlint configuration, so this requires tooling-entry discovery configuration                                 |
| `vendor_coupling`, `hub_dependency` | How widely a third-party package is referenced                                | One report each about Three.js             | Visibility rather than an automatic problem: Three.js is the renderer's foundation                                                   |

Other built-ins add potential coverage without producing findings in this scan:

- `god_module`: combines fan-in, fan-out, and churn thresholds. The implementation
  does not semantically identify responsibilities and does not apply a file-size
  threshold in this detector.
- `unstable_interface`: combines file churn and dependent counts. It does not
  specifically track changes to public signatures.
- `shotgun_surgery`: analyzes Git co-changes. Repository-wide mechanical changes
  and moves need consideration before interpreting the signal.
- `test_leakage`: production imports of test files, using file conventions.
- `scattered_config`: repeated environment-variable access across files; it does
  not generally analyze how game settings JSON files are organized.
- `barrel_file`: excessive re-exports rather than duplicate implementations.
- `abstractness` and `package_cycles`: additional structural metrics, best used
  only when the measured boundaries are meaningful.
- `side_effect_import`: bare imports, with common stylesheets and setup imports
  excluded by built-in conventions.

Most of these architectural extras are disabled by default. A plain default scan
does not provide the same coverage as this exploratory all-detector run.

## Concrete examples and limitations

`src/game/simulation/simulation.ts` contains a facade that delegates work to
system functions, often passing `this`. Its LCOM score of 10 does not establish
that those operations are unrelated. Splitting a facade solely to reduce the
score could make the interface harder for callers to use.

The module-cohesion reports include `simulation-types.ts`,
`audio-effect-score.ts`, several settings files, and `fracture-geometry.ts`.
Shared conceptual purpose is not equivalent to shared symbol references.
The metric also considers exports, so mixed re-exports and types affect results.

High-coupling findings were:

| File                                       | Incoming + outgoing dependencies |
| ------------------------------------------ | -------------------------------: |
| `src/game/simulation/simulation.ts`        |                               60 |
| `src/game/palette.ts`                      |                               22 |
| `src/game/simulation/simulation-tuning.ts` |                               22 |
| `src/game/simulation/simulation-shared.ts` |                               21 |

These measurements reveal centrality not covered by file-size or function-size
limits. They do not prove a shared palette or tuning module should be split.

The three unused-symbol candidates were `SequenceScore`, `GAME_HEIGHT`, and
`loadMesh`. `loadMesh` is referenced by unit tests; the dead-symbol detector
normally excludes test consumers. That is a production-usage distinction to
review, not proof the function is unreferenced everywhere.

A sampled cycle between `code-surface.ts` and `code-visual.ts` includes an
inline type-only import of `FractureVisual` in one direction and a runtime
function import in the other. The simulation cluster similarly includes
`import type { Simulation }` return edges. Runtime cycle enforcement needs
separate verification of type-edge handling.

## Existing checks that make other detectors redundant

| Archlint detector       | Existing project enforcement                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cognitive_complexity`  | Anti-slop cognitive complexity threshold 8                                                                                                                |
| `cyclomatic_complexity` | Anti-slop cyclomatic complexity threshold 6                                                                                                               |
| `large_file`            | ESLint maximum 300 physical lines per file                                                                                                                |
| `long_params`           | ESLint maximum 3 parameters, including additional TypeScript signature checks                                                                             |
| `deep_nesting`          | SonarJS nested-control-flow and nested-function checks, plus complexity limits                                                                            |
| `code_clone`            | Five jscpd profiles plus SonarJS duplicate-function/branch checks                                                                                         |
| `shared_mutable_state`  | Oxlint `import/no-mutable-exports`; archlint's detector checks exported mutable bindings rather than arbitrary mutation of exported objects               |
| `primitive_obsession`   | Its default check is more than 3 primitive parameters; the existing maximum of 3 total parameters already covers this condition for applicable signatures |

The current project also limits class/interface/object-type members and folder
sizes. Those checks constrain size and organization, but do not measure cohesion
or cross-file graph structure.

## Suggested adoption

1. Keep the existing complexity, size, parameter, and duplication tools as the
   primary checks for those properties.
2. Trial `lcom` and `module_cohesion` as a separate advisory report. Review
   delegated facades, pure type declarations, settings, and mixed re-export files
   before treating a result as a design defect.
3. Add coupling/hub/instability reports for architectural review. Do not force
   wrappers around Three.js or split shared constants solely to satisfy them.
4. Choose one primary analyzer for unused public symbols and one for runtime
   cycles. Validate discovery and type-only edges before enforcing them.
5. Consider Git-based churn/co-change checks after accounting for the recent
   file moves and import-policy changes.
6. Use baseline comparisons only after reviewing the first findings. A baseline
   avoids legacy noise but does not make an unreliable heuristic precise.

## Sources

- [Archlint 0.17.1 source](https://github.com/archlinter/archlint/tree/v0.17.1)
- [LCOM implementation](https://github.com/archlinter/archlint/blob/v0.17.1/crates/archlint/src/detectors/metrics/lcom.rs)
- [Module-cohesion implementation](https://github.com/archlinter/archlint/blob/v0.17.1/crates/archlint/src/detectors/design/scattered_module.rs)
- [Feature-envy implementation](https://github.com/archlinter/archlint/blob/v0.17.1/crates/archlint/src/detectors/design/feature_envy.rs)
- [Primitive-obsession implementation](https://github.com/archlinter/archlint/blob/v0.17.1/crates/archlint/src/detectors/design/primitive_obsession.rs)
- [Shared-mutable-state implementation](https://github.com/archlinter/archlint/blob/v0.17.1/crates/archlint/src/detectors/design/shared_mutable_state.rs)
- [God-module implementation](https://github.com/archlinter/archlint/blob/v0.17.1/crates/archlint/src/detectors/design/god_module.rs)

Local comparison inputs: `package.json`, `.oxlintrc.json`, `eslint.config.ts`,
`lint/limits.ts`, `lint/import-policy.ts`, and `.jscpd.json`. Raw trial reports and
the alias-only configuration were written outside the repository under `/tmp`.
