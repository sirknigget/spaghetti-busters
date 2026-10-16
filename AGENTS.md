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

| Location               | Responsibility                                                                  | Detailed guide                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/`                 | Application orchestration, native menus/dialogs, HUD, CSS, UI settings          | This file                                                                                                                                                          |
| `src/game/scene/`      | Pointer/keyboard input, frame loop, pause and graphics recovery                 | This file                                                                                                                                                          |
| `src/game/simulation/` | Damage, motion, weapons, enemies, pickups, waves, bosses                        | [Simulation](src/game/simulation/AGENTS.md)                                                                                                                        |
| `src/game/rendering/`  | Three.js world, entity meshes, lighting, visual event dispatch                  | [Rendering](src/game/rendering/AGENTS.md)                                                                                                                          |
| `src/game/code/`       | Visible code slabs, glyphs, holes, fracture surfaces, boss armor                | [Code surfaces](src/game/code/AGENTS.md)                                                                                                                           |
| `src/game/geometry/`   | Perforated solids, interval sweeps, triangle clipping                           | [Geometry](src/game/geometry/AGENTS.md)                                                                                                                            |
| `src/game/debris/`     | Rapier bodies, falling letters, impact flecks, physical breakup                 | [Debris](src/game/debris/AGENTS.md)                                                                                                                                |
| `src/game/audio/`      | Synth voices, effects, music scores, transport and mixing                       | [Audio](src/game/audio/AGENTS.md)                                                                                                                                  |
| `src/game/graphics/`   | Shared GLB loading, glyph textures, GPU resource helpers                        | [Model workflow](docs/models/README.md)                                                                                                                            |
| `src/game/content/`    | Authored TypeScript spaghetti samples shown in the game                         | This file                                                                                                                                                          |
| `tests/`               | Browser scenarios and shared browser/unit fixtures                              | [Tests](tests/AGENTS.md)                                                                                                                                           |
| `lint/`                | Lint policy modules, custom Oxlint plugin, policy tests, graph passes           | [Lint tooling](lint/AGENTS.md)                                                                                                                                     |
| `public/`              | Locally shipped models, images, brand marks, audio, fonts                       | [Model workflow](docs/models/README.md), asset credits in `README.md`                                                                                              |
| `.github/`             | Parallel CI matrix, shared dependency setup, and Vercel production deployment   | `.github/workflows/ci.yml`, [Deployment setup](docs/vercel-deployment.md)                                                                                          |
| `docs/`                | Dependency policy assessment, duplicate calibration, model editing, screenshots | [Dependency enforcement](docs/dependency-enforcement.md), [Duplicate detection](docs/duplicate-detection.md), [Architecture rollout](docs/architecture-rollout.md) |

## Enforced policies

Respect the project's statically enforced policies. Modify or bypass them only
with the user's explicit approval. The [lint tooling guide](lint/AGENTS.md) maps
their configuration; use those files as the source of truth.

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
| Implementation architecture metrics | `npm run lint:architecture`                                                                                     |
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
