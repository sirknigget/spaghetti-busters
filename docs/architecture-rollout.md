# Architecture enforcement rollout

Base: latest `main`, `f74366e`, synced on 2026-10-16. Earlier exploratory
archlint results in `archlint-assessment.md` describe an older tree; they are
not the baseline for this rollout.

## Scope and method

Apply the constraints below in order, with a separate pushed commit for each
completed stage. Only application implementation under `src` is subject to the
new constraints. Colocated tests, test fixtures, lint tooling, and configuration
are excluded. Existing independent checks retain their scopes.

Each stage records its initial findings, threshold experiments, attempted
refactors, validation, and positive and negative effects here. An unsuccessful
constraint may be withdrawn after an actual run and refactor attempt, with the
reason retained in this report. Findings are not accepted merely because a
heuristic assigns them a smell name.

Latest main already enforces runtime cycles, architecture boundaries, and
unused public exports. Later stages will assess their remaining gaps before
adding overlapping tools. No existing enforcement will be weakened to satisfy
a new metric.

## Ordered stages

| Stage | Constraint                                 | Status  |
| ----- | ------------------------------------------ | ------- |
| 1     | Class cohesion (`lcom`)                    | Pending |
| 2     | Module cohesion                            | Pending |
| 3     | Coupling and hubs                          | Pending |
| 4     | Dependency instability                     | Pending |
| 5     | Circular dependencies                      | Pending |
| 6     | Unused public symbols                      | Pending |
| 7     | Feature envy, excluding lint configuration | Pending |

## Validation policy

Every retained constraint must fail locally and in CI on findings. Tune
parameters against actual code, preserve behavior, and rerun all previously
retained constraints after each stage. Run affected behavior tests and the
existing formatting, lint, duplicate, unused-code, dependency, and build checks.
Use browser integration coverage for changed application contracts. Record
material limitations rather than infer quality from an aggregate score.
