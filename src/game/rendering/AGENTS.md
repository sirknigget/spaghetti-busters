# World rendering

`WorldRenderer` in `world3d.ts` coordinates Three.js presentation. The scene layer
owns gameplay updates and calls it to draw. Import simulation implementations only
as erased types; runtime access is limited to the shared domain constants/data
allowed by the root architecture policy.

## Rendering map

- `display/world-display.ts` owns the scene, camera, renderer, resizing, and
  environment. Its neighbors render the player, timeout hazards, and entities.
- `code/world-code.ts` synchronizes block meshes; `world-code-lighting.ts` handles
  their lighting. Surface construction lives in the sibling `code` subsystem.
- `robots/robot3d.ts` builds and poses robots, including brand/status displays.
- `models/models3d.ts` composes character and weapon models. Reusable model
  loading and GPU helpers belong in `src/game/graphics/`.
- `effects/` dispatches visual events and updates particles, pulses, explosions,
  and debris handoff. `world-entity-cache.ts` tracks entity mesh lifetimes.
- `world-settings.{ts,json}` contains presentation settings.

## Frame and resource ownership

`WorldRenderer.render()` processes visual events before synchronizing visible
entities and drawing. `WorldVisualEvents.process()` intentionally drains
`sim.world.visualEvents`; other gameplay state and outcomes must remain untouched.
Effect time comes from simulation elapsed time so pause/reset behavior stays
consistent. Do not introduce a competing animation loop in an entity renderer.

Keep reset, disposal, and graphics-context recovery working together. Dispose
removed mesh geometry/materials/textures using the shared resource helpers, while
preserving resources still used by templates or sibling instances. Code and robot
death effects need their original, currently posed meshes before cleanup.

For changes to camera, lighting, text readability, or meshes, inspect the actual
WebGL output and relevant `tests/rendering/` scenarios. Model edits also follow
[the model workflow](../../../docs/models/README.md). Gameplay must stay the same
when visual detail, entropy, or rendering frame rate changes.
