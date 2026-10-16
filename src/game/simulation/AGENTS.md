# Simulation

This subsystem owns gameplay state and outcomes without browser or renderer
dependencies. `Simulation` accepts an injectable random function; tests supply
seeded randomness, while the default is `Math.random`. Route gameplay randomness
through `sim.random()` so deterministic fixtures remain reproducible.

## Where changes belong

| Path                                                    | Ownership                                                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `simulation.ts`                                         | Public facade implementing `SimulationContext` and delegating to focused systems   |
| `simulation-state.ts`                                   | World, player, progress, and runtime state groups                                  |
| `simulation-types.ts`                                   | Domain contracts and presentation-safe shared constants                            |
| `simulation-tuning.{ts,json}`, `simulation-values.json` | Tuning access and declarative values                                               |
| `common/`                                               | Pure math, settings, weapon spread data, and simulation context/view contracts     |
| `runtime/`                                              | Reset, bounded substeps, update order, event tests                                 |
| `blocks/`                                               | Creation, syntax highlighting, code cells, damage, impulses, splitting, explosions |
| `collision/`                                            | 2D collision calculations                                                          |
| `weapons/`                                              | Primary/special fire, targeting, projectiles, patterns                             |
| `enemies/`                                              | Robots, timeout hazards, domain-owned robot pose/brand types                       |
| `progression/`                                          | Wave progression, factory bosses, bonus rolls, pickups and ammo                    |
| `effects/`                                              | Gameplay particle updates and visual-event payload creation                        |

## Contracts to preserve

- `runtime/simulation-step.ts` bounds frame time and substeps it. Keep player and
  projectile time distinct from `enemyDt`, which accounts for enemy freezing.
- Block iteration uses a snapshot so newly thrown exceptions wait for a later
  step. Preserve this scheduling when changing spawning or mutation order.
- Damage and splitting retain surviving code cells, coordinates, holes, and
  fracture ancestry. Boss fragments share factory-generation behavior without
  multiplying its production.
- Emit gameplay events for the application and visual payloads for presentation;
  do not construct meshes or rigid bodies here. Visual entropy must not consume
  the gameplay random sequence.
- Motion, hit detection, loss boundaries, scoring, and ammunition remain owned
  here, regardless of what the 3D debris appears to hit.

Use colocated `*.test.ts` coverage for changed gameplay contracts and
`tests/unit/simulation-support.ts` for reusable setup. Browser scenarios in
`tests/gameplay/` cover integration.

Systems depend on `common/simulation-context.ts`, not the concrete facade.
Presentation uses its smaller `SimulationView`; only scene controllers construct
or control `Simulation`. Import domain types directly from `simulation-types.ts`.
