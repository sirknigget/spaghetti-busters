# Duplicate detection

Run `npm run lint:duplicates` or run one of its five profile scripts individually.
The pinned jscpd 5.4.1 engine checks exact (Type 1), renamed/value-normalized
(Type 2), near-miss (Type 3), and semantic (Type 4) clones. All profiles use
`.jscpd.json` for scope and whitespace/comment-insensitive tokenization (`weak`).
The upstream `strict` mode preserves formatting; it does not mean higher detection
sensitivity.

## Settings and manual evaluation

Calibrated against `bc6bcbb` (merged PR #6) and the initial integration, before
cleanup, then rerun after the shared implementations replaced the duplicates.
A reported pair is useful when it identifies an implementation or contract that
can sensibly be shared while preserving caller-specific behavior. Similar-looking
independent assertions, different lifecycle behavior, configuration values, and
different geometry calculations count as false positives. Ambiguous cases count
against a candidate setting.

The **less-than-3% false-positive guideline is a manual evaluation criterion**.
There is no computed false-positive rate or 3% gate in the project. In particular,
jscpd's `threshold` option measures duplicated lines, which is a different metric
and is intentionally unset.

| Profile script suffix | Minimum tokens / lines | Other detection settings                                            | Reviewed pairs | False positives identified |
| --------------------- | ---------------------- | ------------------------------------------------------------------- | -------------: | -------------------------: |
| `exact`               | 53 / 9                 | Exact tokens after comment/spacing removal                          |              9 |                          0 |
| `identifiers`         | 53 / 16                | Normalize identifiers; preserve literal values and annotations      |              1 |                          0 |
| `renamed`             | 204 / 1                | Normalize identifiers, literals, and annotations                    |              3 |                          0 |
| `similar`             | 19 / 5                 | AST similarity 0.75, minimum 1 node; gap merging up to 12 lines     |             27 |                          0 |
| `semantic`            | 36 / 1                 | CodeRankEmbed, similarity 0.84 within/across languages, scope `all` |              5 |                          0 |

These are the most sensitive useful configurations found in the tested parameter
neighborhoods, not proof of a unique global optimum. Gap limits from 12 through 300 produced the same 27 near-miss findings; 12
retains them without bridging larger unmatched spans. Minimum size, similarity,
normalization, and gap size have competing effects; there is no single strictness
slider. Every selected native configuration was rerun and its actual results read.
Filtering one permissive report is insufficient: changing seed sizes can expose
different matches, and earlier passes suppress some later matches.

The table records **nonempty findings before their cleanup**, not the final scan.
The identifier row was recalibrated after the initial shared helpers were
extracted: lowering its token minimum from 110 to 53 exposed one remaining
palette projection, which was also consolidated. The final code must
produce **zero findings in every profile**. An empty final report is a cleanup
result; precision was evaluated using the nonempty findings before refactoring.

Initial calibration produced **57 overlapping reports** with the 110-token
identifier setting. The tightened identifier setting was evaluated at a later
cleanup stage, so the table rows are not counts from one simultaneous scan.
Reported pairs are not independent examples.
Repeated audio pairs and repeated CI setup are also reviewed as shared families,
rather than using overlapping pairs to dilute false positives. No false-positive
family was accepted. This is an observed judgment on this repository, not a
statistical guarantee for future code or other repositories. Small samples,
subjective abstraction boundaries, and tuning on the same corpus limit certainty.

## More sensitive settings that were rejected

Manual review included 94 permissive exact pairs, 110 broadly normalized pairs,
124 near-miss pairs, and the semantic candidates, followed by native reruns.
After cleanup, the neighboring smaller exact/full-normalization/semantic settings
still report false positives. Identifier sensitivity was tightened using its
remaining nonempty true-positive finding before the final palette extraction.
Representative native boundaries on the calibration tree:

| Change from selected profile                         | False positives / reports | Example reason for rejection                                    |
| ---------------------------------------------------- | ------------------------- | --------------------------------------------------------------- |
| Exact 52 tokens / 9 lines                            | 1 / 10                    | Independent test inputs share generic spawn-fixture scaffolding |
| Exact 53 tokens / 8 lines                            | 1 / 11                    | Different geometry checks share a coordinate-reading prefix     |
| Identifiers 52 tokens / 16 lines after extraction    | 1 / 2                     | Adjacent World3D resource getters                               |
| Identifiers 53 tokens / 15 lines after extraction    | 1 / 2                     | Browser module wrappers inspect different scenarios             |
| Full normalization 203 tokens / 16 lines             | 1 / 4                     | Authored spaghetti-code strings are game content                |
| Near-miss AST similarity 0.74 at 19 tokens / 5 lines | 1 / 28                    | A noise envelope and tone envelope have different behavior      |
| Near-miss 18 tokens / 5 lines at similarity 0.75     | 2 / 29                    | Responsive styles and different clipping semantics              |
| Semantic 36 tokens / 1 line at similarity 0.83       | At least 1                | Different browser test state queries                            |
| Semantic 35 tokens / 5 lines at similarity 0.84      | At least 1                | Different disposal lifecycles                                   |

Literal-only normalization was also tried: 100 tokens / 16 lines produced
40 false positives out of 40 reports, largely configuration/content values.
The full-normalization profile still covers literal changes at its larger size.
No empty report was used as evidence of precision.

## What the accepted findings mean

- CI jobs repeat the dependency/setup sequence; a shared setup action could own
  that sequence while the jobs stay parallel.
- Audio effects repeat uniform note scheduling, tone/noise layers, and envelope
  wiring. A shared primitive would accept score data; different melodies and
  deliberate orchestration remain caller-owned.
- Point-in-polygon and glyph-texture implementations repeat algorithms; random
  spin generation repeats an operation with different tuning inputs. Code placement
  repeats the same tumble calculation and rotation, with live rattle left separate.
- Robot brand/pose declarations repeat the same domain model; code color variants
  share one palette projection. Mesh resource
  cloning and disposal of mesh maps repeat ownership-aware operations.
- Browser startup, world snapshots, robot-shot fixtures, and response-error
  recording repeat helpers. Pause/mute scenarios remain separate; their shared
  transport-suspended postcondition can share a query/assertion helper, with
  pause-only gain assertions left explicit.

Reports contain exact paths, ranges, kinds, and source fragments for each pair;
read `.quality-results/jscpd/*.json`, or download CI's `duplicate-reports` artifact.
The duplicated implementations are extracted into shared helpers in this PR;
callers retain their different score data, tuning, actions, and assertions.

## Scope and enforcement

Scan the repository, including runtime code, tests, lint/build configuration,
CSS, JSON, YAML, and documentation supported by jscpd. Exclude dependencies,
build/test/coverage output, lockfiles, reports/cache,
and `public/` static assets (models, artwork, fonts, sounds and licenses).
Repeated asset/license data is not an executable implementation to extract.
No runtime source or test directory is excluded for producing inconvenient matches.

The engine inherently leaves test files out of its AST near-miss pass. Exact,
renamed, gap, and semantic scans still inspect tests. Semantic comparison currently
works between files, not within one file. Unsupported languages, short snippets,
and code that escapes the heuristics remain blind spots; these settings do not
promise detection of every possible duplicate.

CI and local lint **fail on any duplicate** through jscpd's native `exitCode: 1`,
and fail on an empty scan through `failOnEmpty`. There are no baselines, tolerated
duplicate percentages, or source-level suppression markers. Fix reported shared
implementations; review suspected false positives using the same definition above.
Any future sensitivity change needs an evaluation of actual reported source spans.

## Semantic model and CI

The semantic profile downloads a checksum-verified local CodeRankEmbed model on
first use (approximately 548 MB, MIT license). It runs on the CPU without a hosted
embedding API. jscpd 5.4.1 pins the model revision
`3c4b60807d71f79b43f3c4363786d9493691f8b1`; changing the engine/model requires
recalibration. Initial embedding takes several minutes; subsequent runs reuse
embeddings. Set `JSCPD_CACHE_DIR` to relocate the normal user cache.

The **Duplicate detection** matrix job runs in parallel with the existing
checks, caches the model/embeddings per engine, model and runner platform, and
uploads JSON reports even on failure. The parallel jobs share one composite
setup action; their names and independent execution remain unchanged. Semantic scores can vary slightly with
platform floating-point behavior; review borderline changes when upgrading tools.
The current function corpus is TypeScript; cross-language semantic precision has
not been measured. Its enabled cross-language cutoff is conservative, not a claim
of calibrated accuracy for languages absent from this project.

Upstream references: [options and clone types](https://github.com/kucherenko/jscpd/blob/v5.4.1/docs/rust.md),
[CLI and configuration](https://github.com/kucherenko/jscpd/blob/v5.4.1/rust/crates/cpd/src/cli.rs),
[pinned local model](https://github.com/kucherenko/jscpd/blob/v5.4.1/rust/crates/cpd-semantic/src/embed/models.rs).
