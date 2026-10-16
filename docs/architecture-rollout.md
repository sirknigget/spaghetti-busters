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

| Stage | Constraint                                 | Status                |
| ----- | ------------------------------------------ | --------------------- |
| 1     | Class cohesion (`lcom`)                    | Withdrawn after trial |
| 2     | Module cohesion                            | Pending               |
| 3     | Coupling and hubs                          | Pending               |
| 4     | Dependency instability                     | Pending               |
| 5     | Circular dependencies                      | Pending               |
| 6     | Unused public symbols                      | Pending               |
| 7     | Feature envy, excluding lint configuration | Pending               |

## Validation policy

Every retained constraint must fail locally and in CI on findings. Tune
parameters against actual code, preserve behavior, and rerun all previously
retained constraints after each stage. Run affected behavior tests and the
existing formatting, lint, duplicate, unused-code, dependency, and build checks.
Use browser integration coverage for changed application contracts. Record
material limitations rather than infer quality from an aggregate score.

## 1. Class cohesion: withdraw the blocking metric

Tested archlint 0.17.1's `lcom` with `min_methods: 3`, first at the
built-in `max_lcom: 4`, then at 1. The default reports `Simulation` at
LCOM4 10; the strict trial also reports `DebrisPhysics` at 2. Findings
produce exit status 1 when scanning with high severity; a successful scan
alone is not evidence that a constraint passes.

An actual refactor moved reset state creation and initial spawning from the
runtime system into `Simulation.reset`. All 91 unit tests still passed, but
the facade's score only fell from 10 to 9. The experiment was restored before
this commit: reset scheduling belongs beside the runtime systems, as the
simulation guide describes.

The detector connects methods through direct field access or direct method
calls. Passing `this` to a focused external system does not connect those
methods. Its recommendation would require bringing gameplay logic back into
the facade, splitting the game's single public facade, or introducing shared
field touches solely to satisfy the score. Debris's second component is its
static asynchronous factory, which appropriately has no instance fields.
Increasing the threshold to 10 would merely accommodate the current facade;
no useful universal cutoff emerged from the experiment.

**Impact:** preserving delegated systems is better than blocking this metric.
There is no new LCOM gate, no facade exception, and no weakened existing rule.
The cost is that unrelated responsibilities within future classes will not be
caught by LCOM. Existing complexity, size, and member limits remain useful but
are not equivalent cohesion checks.

**Validation:** 15 test files / 91 tests passed before and after the reset
experiment. Trial findings were inspected in implementation only; tests,
fixtures, and lint code are excluded. Subsequent graph trials use alias
`#root/* -> ./*` (archlint resolves against the repository root even with
`scan src`) and disable automatic tsconfig discovery. The earlier `../*`
experiment could not resolve internal imports and is not used as graph evidence.
