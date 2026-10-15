# Lint and architecture tooling

Keep policy implementation and its tests here, separate from game code. Prefer
existing built-in rules; avoid enforcing the same policy twice across linters.
Every enforced policy must run as a blocking CI check.

## Policy map

| Location                                    | Responsibility                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `eslint.config.ts`                          | ESLint composition, scope overrides, built-in color restrictions                       |
| `.oxlintrc.json`                            | Type-aware Oxlint, anti-slop, built-in import restrictions, custom plugin registration |
| `.stylelintrc.json`                         | CSS policy and palette exceptions                                                      |
| `limits.ts`, `spacing.ts`                   | ESLint size/signature/member limits and readable statement spacing                     |
| `numeric-policy.ts`, `import-policy.ts`     | Numeric constants and import forms needing ESLint coverage                             |
| `project-plugin.js`, `folder-limits.js`     | Oxlint plugin and complete `src`/`tests` folder scan                                   |
| `tests/`                                    | Lint behavior tests, including limits and spacing                                      |
| `.jscpd.json`, `package.json` scripts       | Five blocking duplicate profiles                                                       |
| `knip.json`                                 | Normal/production entry discovery, export and dependency reachability                  |
| `.dependency-cruiser.json`, `dependencies/` | Typed integrity graph, eager folder graph, runtime architecture graph                  |

Paths above without a local match refer to repository-root configuration.

## Working on policies

Preserve the root guide's current thresholds. Do not bypass findings through
blanket ignores, duplicate baselines, artificial entry points, or relaxed limits.
Duplicate sensitivity is manually calibrated against genuinely different code;
the user's false-positive guideline is not a programmatic percentage gate. See
[the calibration record](../docs/duplicate-detection.md).

The folder plugin scans both complete trees once per invocation, including
non-code-only folders and Markdown files. Symlinks are counted as files rather
than traversed. Keep the scan rooted at the project, independent of the first
file Oxlint happens to visit.

Preserve the distinction between typed import checks, eager runtime folder
cycles, and runtime architecture reachability that includes dynamic imports.
Knip's production pass must retain independent value from its normal pass.
Document changes to wiring or boundaries in
[the dependency assessment](../docs/dependency-enforcement.md).

For policy edits, run the affected linter, policy tests where relevant, and
formatting. Run all duplicate profiles for refactors or new documentation. Keep
the independent jobs in `.github/workflows/ci.yml` parallel. Cold semantic scans
download the pinned embedding model and take longer than ordinary syntax lint;
the CI cache is configured in that workflow.
