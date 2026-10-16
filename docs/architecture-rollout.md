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

| Stage | Constraint                                 | Status                 |
| ----- | ------------------------------------------ | ---------------------- |
| 1     | Class cohesion (`lcom`)                    | Withdrawn after trial  |
| 2     | Module cohesion                            | Enforced               |
| 3     | Coupling and hubs                          | Enforced               |
| 4     | Dependency instability                     | Enforced               |
| 5     | Circular dependencies                      | Existing gate verified |
| 6     | Unused public symbols                      | Existing gate verified |
| 7     | Feature envy, excluding lint configuration | Withdrawn after trial  |

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

## 2. Module cohesion: retain a focused implementation gate

Retained `module_cohesion` at high severity, `min_exports: 5` and
`max_components: 2`. The complete baseline has 12 reports. Ten are declarative
contracts/settings: domain types, rendering/debris/fracture settings, robot
configuration, and the effect-score type grammar. The per-rule exclusions
`*-types.ts`, `*-settings.ts`, `*-config.ts`, and the existing pure-type
`audio-effect-score.ts` keep these roles together. These exclusions apply only
to cohesion, not other graph constraints. Tests, fixtures, and config files are
excluded globally; the scan target is `src`, so lint tooling cannot enter it.

The two remaining errors were `simulation-shared.ts` (9 export components)
and the mixed fracture helper/barrel (3). The first now has domain owners:
syntax highlighting in blocks, bonus selection in progression, pure math and
settings in common. The two single-consumer predicates are private to damage
and special-projectile updates. The weapon-pattern JSON moved with its shared
settings to preserve the existing acyclic folder graph. Fracture clients now
import solids and contracts directly from their owning modules; the geometry
helper no longer re-exports them. No gameplay formulas or thresholds changed.

**Positive impact:** removes a real catch-all module and an unnecessary barrel
hop, makes ownership clearer, and prevents larger disconnected implementation
modules from returning. **Cost:** three additional source files overall and more
explicit imports. Small modules, pure declarations, and semantic relationships
without shared symbols remain outside the metric's useful coverage.

archlint 0.17.1 has an important parsing defect: its parser enables symbol
collection for the stale ID `scattered_module`, while the real detector ID is
`module_cohesion`. Selecting the rule alone incorrectly reports connected
exports as disconnected. Selecting `lcom` also enables the required collection;
its per-rule exclusion `**/*` suppresses all LCOM reports. This is an explicit
parser workaround, not LCOM enforcement. A connected-five-export policy test
protects this behavior. See the pinned release's
[parser configuration](https://github.com/archlinter/archlint/blob/v0.17.1/crates/archlint/src/parser/types.rs).

`npm run lint:architecture` fails with exit 1 on the two baseline errors and
passes after the refactor. It is included in aggregate lint and an independent
blocking CI job. Native CLI error behavior is tested; no extra runner or custom
architectural detector is needed.

**Validation:** 94 tests passed, including three policy probes for failing
implementation, connected exports, and excluded tests/fixtures/tooling/data
roles. Type-check/build, ESLint, Oxlint, normal/production Knip, and all three
dependency passes passed. Browser rendering/interface checks and duplicate
profiles are being completed as part of rollout validation below.

## 3. Coupling and hubs: separate contracts from the facade

Default probes reported four coupling errors and three hubs after stage 2.
High fan-in to palette/tuning/domain declarations is expected reuse, so the
retained coupling budget is `max_cbo: 30` (incoming plus outgoing internal
file edges), with declarative `*-types`, `*-settings`, and `*-config` roles
excluded from this rule. The hub gate requires at least 8 incoming and 8 outgoing
edges and maximum function complexity 5. Default 5/5 flagged real fracture-solid
and robot algorithms with focused responsibilities. The stricter traffic
requirement targets large shared intermediaries without encouraging splitting
small algorithms or adding complexity to escape the gate.

With these settings, the implementation baseline fails twice on `Simulation`:
one coupling finding and one hub. Systems now depend on `SimulationContext`,
a domain-owned state/command contract. Presentation depends on the smaller
`SimulationView`, which exposes state references and derived values without
commands. This is a shallow view, not deep immutable state. The facade explicitly
implements the context. Spawn option types have one owner, and domain clients
import domain types directly rather than through facade re-exports. Scene
controllers retain the concrete facade. After this refactor both errors pass.

A second tool limitation surfaced in this experiment: ignored tests are still
nodes in archlint 0.17.1's dependency graph and inflate implementation fan-in.
The native scan still reported a facade hub after its only implementation
consumers were the scene controllers. `check.js` now makes a temporary source
snapshot with tests, fixtures, and tool config physically absent, then runs the
native detector and propagates its failure status. Relative tree structure and
aliases are preserved; failures to copy or run fail the job. No diagnostic is
filtered. The same snapshot policy reproduced the two pre-refactor errors,
so the improvement is not merely removal of test edges. The earlier graph
counts in this report are exploratory; the snapshot is the authoritative scope.

**Positive impact:** systems and renderers no longer depend on the facade's
implementation or barrel; the production graph loses 22 edges. Future high
coupling and large simple hubs are blocking errors without making frequently
used constants a problem. **Costs:** one explicit contract file, maintained
method signatures checked by TypeScript, and a small source-snapshot launcher
needed to honor implementation-only scope. Metrics still count type edges
between runtime files and skip pure-type nodes; they are not runtime-only
coupling or a proof of abstraction quality.

**Validation:** all 97 tests passed, including native failure probes for
coupling/hubs and a 31-test-consumer case proving that tests cannot inflate
coupling. Type-check/build and all dependency passes passed; source lint and
normal/production unused checks were rerun. Stage 2's 13 rendering/interface
browser scenarios also passed (controls, touch, restart, holes, fractures,
physical debris, and context recovery); all five duplicate profiles passed.

## 4. Dependency instability: retain the defaults and invert canvas creation

Enabled `sdp_violation` at high severity with the built-in `min_fan_total: 5`
and `instability_diff: 0.3`. On the implementation snapshot after stage 3,
it fails on one edge: shared `code-visual.ts` (instability 0.31) imports surface
canvas creation from `code-surface.ts` (0.62). Stage 3's domain contracts already
removed the facade's earlier instability findings; they are not fixed twice.

`createVisual` now accepts the canvas it needs. The existing mesh composer
creates that canvas with its already-imported surface module, then passes it
to the common visual state factory. This removes the common-to-surface edge
without new modules, wrappers, or configurable exceptions. It preserves lazy
creation for new visuals and reuse of inherited surfaces. The gate now passes.
No threshold adjustment was necessary after this actual refactor.

**Positive impact:** stable visual contracts/state creation no longer depend on
drawing details or loading crack artwork. The existing runtime dependency
passes still protect larger boundaries. **Cost:** one explicit factory parameter
and call-site responsibility. Graph instability measures incoming/outgoing file
edges, not observed frequency of code changes; the detector's prose about
frequent changes must not be mistaken for churn evidence. A gap below 0.3 or a
source with fewer than five total edges is intentionally tolerated.

**Validation:** 98 tests passed, including an injected stable-to-unstable graph
that produces an SDP error. All retained architecture checks, unused analysis,
and dependency passes passed. Rendering integration is rerunning for the
canvas ownership change. The launcher now derives detector selection from the
configuration's rule keys, avoiding a second hand-maintained enforcement list.

## 5. Circular dependencies: keep dependency-cruiser as the sole enforcer

No archlint cycle detector was added. The existing full graph blocks runtime
module cycles as errors; its edge filters exclude erased types and dynamic
imports from that cycle definition. The separate eager runtime graph blocks
folder cycles while avoiding false cycles assembled from erased type imports.
A third graph protects runtime architecture through dynamic imports. These
policies already give more precise coverage than a second mixed-edge cycle
heuristic would add here.

An isolated three-module probe with no file cycle but an A-folder → B-folder →
A-folder path failed `no-runtime-folder-cycles` with two errors (exit 2).
Connecting its last file back to the first failed `no-circular` with one error
(exit 1). The real project passes all three existing graph passes after the
prior refactors, as well as the retained archlint gates. No cycle finding needed
a source fix. No new constraint was applied to tests or lint tooling; existing
checks retain their existing broader integrity scope.

**Positive impact:** proven blocking coverage with no duplicate rules, new
exceptions, or extra CI cost. **Limitation:** type-only and lazy-loading cycles
are not universally forbidden. Directional architecture rules still constrain
those edges where they matter; treating every such cycle as a runtime defect
would add noise. This stage intentionally changes only this report.

## 6. Unused public symbols: retain Knip, avoid overlapping dead-symbol rules

The existing normal and production Knip gates already fail unused public
exports, types, namespace exports, and other unused-code issues with zero
allowance. Entry exports are included. Its `nsExports`/`nsTypes` additions extend
the defaults in Knip 6.41.0; they do not restrict reporting to two issue kinds.
Both real-project passes succeed after the refactors.

A disposable application using the unchanged Knip policy and an unused named
export fails with exit 1. A second probe with Vitest discovery and an export
used only by a test passes normal analysis but fails production analysis with
exit 1. This confirms independent value in retaining both existing CI jobs.
No additional unused-export enforcer was added.

Public instance methods are a remaining gap: Knip 6.41.0's issue kinds do not
include class members. An actual implementation-only archlint `dead_symbols`
trial failed on five supposedly dead commands: `Simulation.spawnBlock`,
`spawnBoss`, `spawnRobot`, `spawnBonus`, and `spawnHazard`. They are all required
by `SimulationContext` and are invoked by gameplay systems through that
contract. The detector looks for method names in direct importers of the
concrete class; it does not follow structural interface consumers. Deleting
these methods would break the domain contract and gameplay. The same detector
also checks the exports already covered by Knip, with no built-in option to
restrict it to public methods alone.

**Positive impact:** existing proven export reachability remains blocking
without duplicate diagnostics or damage to the context abstraction introduced
in stage 3. **Limitation:** unused public instance methods are not generally
enforced. No claim is made that existing unused-private-member rules cover
that gap. A future typed member-reachability analyzer would need to understand
interface calls before it could safely fill it. This stage adds no source or
policy exception and updates only the report.

## 7. Feature envy: withdraw the import-ratio gate after refactoring

An implementation-only `feature_envy` trial at high severity and built-in
`ratio: 3.0` fails with 71 findings. Tests, fixtures, lint code, and lint
configuration are absent from the scan. Thresholds 5, 10, 15, and 20 still
report 58, 22, 4, and 2 modules respectively. At 32 nothing reports: that
would merely accommodate today's largest coordinator rather than establish a
useful general design standard.

An actual refactor moved rotated bounding extents from simulation collision
into common math, gave it a structural rectangle input, and updated its three
consumers. All 98 tests passed. The collision module's ratio fell from 4 to 2
and its error disappeared; 70 reports remained. That improvement came from
removing the imported `Block` and `HALF` names, not from eliminating foreign
object access or improving encapsulation. Bounding extents already had a
reasonable collision owner. The experiment was restored; no behavior or
ownership change from this trial remains.

The pinned detector divides the count of referenced imported symbols, including
types, by referenced internal declarations plus one. Its numerator sums imports
from every source, yet its message names just one “envied” module. The facade's
ratio is 31 and the update scheduler's is 21: delegating work to focused systems
is exactly what makes those import counts high. Independent geometry, audio,
rendering, and debris algorithms also report simply for using their inputs and
settings. The heuristic does not measure a method's access to another object's
data, which is the design question we wanted to enforce.

**Impact:** making these 71 findings blocking would pressure the project toward
merging focused systems, copying types/settings, or adding artificial internal
references. The actual trial and threshold sweep provide no defensible generic
cutoff that separates those cases from poor ownership. The feature-envy rule
was removed after the experiment, leaving all prior gates passing. This keeps
modular composition without claiming that real feature envy is statically
covered. Complexity, cohesion, coupling, and directional boundaries provide
useful complementary checks, but are not equivalent feature-envy detection.

## Retained outcome

Module cohesion, coupling, hub modules, and dependency instability now fail as
errors in the implementation-only architecture job. Existing dependency-cruiser
and Knip jobs remain the sole cycle and unused-export enforcers. LCOM and the
feature-envy heuristic were withdrawn after actual refactor trials; unused
public instance methods remain a documented analyzer gap. There are no issue
baselines, per-finding suppressions, new warning-only gates, or relaxed existing
policies. Guides describe the new domain and canvas ownership contracts.
