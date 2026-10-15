# Project guide

Spaghetti Busters is a browser arcade game built with TypeScript, Vite, imperative
Three.js, Web Audio, and native DOM UI. Gameplay uses 2D coordinates; meshes,
lighting, rotation, and visual debris are rendered in 3D. Rapier runs a separate
visual physics world. There is no React or Phaser layer.

## Start here

- `index.html` loads `src/main.ts`, which owns the prelude, menus, audio, HUD
  callbacks, and lazy loading of the game scene.
- `src/game/scene/scene.ts` preloads models and creates the renderer and controller.
- `src/game/scene/play-scene.ts` connects input, simulation updates, events, HUD,
  and rendering. Input and lifecycle handling live beside it.
- `src/game/simulation/simulation.ts` is the headless gameplay facade.
- `src/game/rendering/world3d.ts` coordinates the visible world.

## Project map and scoped guides

Read the linked guide before changing its subsystem. These guides supplement this
file with local contracts and verification advice.

| Location               | Responsibility                                                                  | Detailed guide                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/`                 | Application orchestration, native menus/dialogs, HUD, CSS, UI settings          | This file                                                                                                    |
| `src/game/scene/`      | Pointer/keyboard input, frame loop, pause and graphics recovery                 | This file                                                                                                    |
| `src/game/simulation/` | Damage, motion, weapons, enemies, pickups, waves, bosses                        | [Simulation](src/game/simulation/AGENTS.md)                                                                  |
| `src/game/rendering/`  | Three.js world, entity meshes, lighting, visual event dispatch                  | [Rendering](src/game/rendering/AGENTS.md)                                                                    |
| `src/game/code/`       | Visible code slabs, glyphs, holes, fracture surfaces, boss armor                | [Code surfaces](src/game/code/AGENTS.md)                                                                     |
| `src/game/geometry/`   | Perforated solids, interval sweeps, triangle clipping                           | [Geometry](src/game/geometry/AGENTS.md)                                                                      |
| `src/game/debris/`     | Rapier bodies, falling letters, impact flecks, physical breakup                 | [Debris](src/game/debris/AGENTS.md)                                                                          |
| `src/game/audio/`      | Synth voices, effects, music scores, transport and mixing                       | [Audio](src/game/audio/AGENTS.md)                                                                            |
| `src/game/graphics/`   | Shared GLB loading, glyph textures, GPU resource helpers                        | [Model workflow](docs/models/README.md)                                                                      |
| `src/game/content/`    | Authored TypeScript spaghetti samples shown in the game                         | This file                                                                                                    |
| `tests/`               | Browser scenarios and shared browser/unit fixtures                              | [Tests](tests/AGENTS.md)                                                                                     |
| `lint/`                | Lint policy modules, custom Oxlint plugin, policy tests, graph passes           | [Lint tooling](lint/AGENTS.md)                                                                               |
| `public/`              | Locally shipped models, images, brand marks, audio, fonts                       | [Model workflow](docs/models/README.md), asset credits in `README.md`                                        |
| `.github/`             | Parallel CI matrix and shared dependency setup                                  | `.github/workflows/ci.yml`                                                                                   |
| `docs/`                | Dependency policy assessment, duplicate calibration, model editing, screenshots | [Dependency enforcement](docs/dependency-enforcement.md), [Duplicate detection](docs/duplicate-detection.md) |

## Dependency policy

Respect the enforced dependency rules. Modify them only with the user's explicit
approval. Their authoritative configuration is `.dependency-cruiser.json`,
`lint/dependencies/runtime.json`, `lint/dependencies/architecture.json`, and
`knip.json`; the dependency assessment linked above explains the checks.

## Existing code policies

Preserve the enforced policies when adding or reorganizing code:

- Use project-root `#root/...` imports with explicit file extensions. Package and
  Node built-in imports keep their normal specifiers. Browser-evaluated imports
  use `/src/...` or `/tests/...`; paths must remain statically discoverable.
- Limits: 300 physical lines per JS/TS file, 40 per function, 3 parameters, and
  30 direct class/interface/object-type members. Blank lines and comments count.
  Cognitive complexity is capped at 8 and cyclomatic complexity at 6.
- Each folder under `src` and `tests`, including those roots, has at most 10
  direct files and 10 direct subfolders. All file types count, including these
  guides; symlinks count as files.
- Keep braces, separate declarations, one statement per line, and required blank
  lines after blocks, before returns, and around declaration groups. Apply
  ESLint spacing fixes before Prettier; do not compress code to evade limits.
- Runtime numeric literals other than `0`, `1`, and `-1` need named constants or
  declarative JSON settings. Test fixtures have numeric exemptions.
- Put literal colors in `src/game/palette.ts`; CSS tokens belong in
  `src/palette.css`. Keep authored model geometry in GLB and crack paths in SVG.
- All five duplicate-detection profiles must report zero findings. Do not add
  accepted-duplicate baselines or weaken checks to accommodate a change.

## Development and validation

Use Node `^22.13.0 || >=24` (CI uses Node 22). Installation of the pinned Git
anti-slop dependency also needs `pnpm@10.33.0` available:

```sh
npm install --global pnpm@10.33.0
npm ci
npm run dev
```

The dev server binds all interfaces on port **3000**, with a strict port check.
`npm run preview` serves a completed production build on the same port.

| Purpose                             | Command                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Apply / verify formatting           | `npm run format` / `npm run format:check`                                                                       |
| All blocking lint policies          | `npm run lint`                                                                                                  |
| Individual source checks            | `npm run lint:oxlint`, `npm run lint:eslint`, `npm run lint:css`                                                |
| Duplication and reachability        | `npm run lint:duplicates`, `npm run lint:unused`, `npm run lint:unused:production`, `npm run lint:dependencies` |
| Type-check and bundle               | `npm run build`                                                                                                 |
| Unit tests                          | `npm test`                                                                                                      |
| Install browser / run browser tests | `npx playwright install --with-deps chromium` / `npm run test:e2e`                                              |

Run checks appropriate to the change; gameplay and visual changes need the
relevant unit/browser coverage. Documentation changes still need formatting,
folder-limit, and duplicate checks. CI runs the full suite in parallel, with two
browser shards. Ensure every required check passes before calling a PR ready.

## Assets and delivery

`public/assets/models/arcade-models.glb` is the editable model library; preserve
node names, anchors, material metadata, and independent instance resources as
described in the model guide. Preserve bundled asset licenses and credits.
String-loaded assets need explicit inspection before removal; import analysis
alone cannot establish that they are unused.

Keep changes on a `codex/` branch and open a PR against protected `main` with a
clear, concise title and relevant validation. Keep unrelated user changes intact.
Update this map and affected scoped guides when moving modules or changing their
contracts.
