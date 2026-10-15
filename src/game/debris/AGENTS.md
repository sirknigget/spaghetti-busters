# Visual debris physics

`DebrisPhysics` owns an independent Rapier world used only for presentation.
Falling pieces never damage gameplay entities or influence scores, targeting,
ammo, collision outcomes, or simulation randomness.

## Implementation map

- `debris-physics.ts`: asynchronous initialization, impact/death entry points,
  updates, diagnostics, reset, and disposal.
- `impact/debris-rigid.ts`: physical bodies, lifecycle, and body snapshots.
- `impact/debris-flecks.ts` and `debris-fleck-renderer.ts`: small particles and
  their rendering; `debris-impact.ts` translates impacts into emitted fragments.
- `collapse/debris-code-collapse.ts`: original-surface slab breakup.
- `collapse/debris-robot-collapse.ts`: breakup of the currently posed robot.
- `collapse/debris-crumble.ts`: secondary crumble from physical fragments.
- `debris-random.ts`, `debris-spin.ts`, and settings files: independent visual
  entropy, spin, and capacity/timing settings.

Retain the original mesh appearance and pose when dismantling a block or robot.
Use the local seeded entropy rather than drawing from `Simulation.random`.
Advance with the effect delta supplied by the renderer so pause does not keep
physics running behind a frozen game.

Preserve particle/body capacity limits and bounded lifetimes. Reset/dispose must
release physics bodies and owned GPU resources without damaging shared model
templates. Initialization failures must leave the renderer able to clean up.

Use `debris-physics.test.ts` for independent physics behavior and
`tests/rendering/physics.spec.ts` / `code-death.spec.ts` for actual visual breakup,
settling, resource disposal, and gameplay independence.
