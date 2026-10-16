# Code surfaces

This directory constructs the visible 3D code slabs. Authored spaghetti text is
stored in `src/game/content/code-library.ts`; damage and surviving cells belong
to simulation. Keep those responsibilities separate from mesh generation.

## Surface pipeline

- `code-mesh.ts` exposes slab/fragment creation and the shared disposal helper.
- `code-solid.ts` builds intact surfaces; `code-fragments.ts` creates surviving
  fragments. `code-surface.ts` and `code-attachments.ts` handle surface details.
- `common/` holds visual contracts and settings used across builders.
- `boss/` adds factory armor and clips it with the damaged surface.
- `death/` derives cuts and complementary parts from the original dying block.
- `assets/code-cracks.svg` stores authored crack paths. Geometry algorithms live
  in the sibling `geometry` subsystem.

Preserve syntax highlighting, glyph alignment, texture coordinates, previous
holes, and original code identity through damage, splits, and death. A split
must expose matching irregular boundaries of the same slab. Death pieces must
retain its perforated surface rather than becoming unrelated replacement boxes.

Keep stable seeded contours across frames and both sides of each cut. Avoid
sharing disposable geometry or materials in ways that let one fragment invalidate
another. Coordinate original-mesh handoff with rendering effects and debris
before destroying the source resources.

Check `death/code-death-fragments.test.ts`, geometry unit tests, and the browser
code-death/physics scenarios for changes to fracture or disintegration. Confirm
the rendered letters, holes, depth, and falling fragments remain recognizable.

`code-solid.ts` composes canvas creation with the common visual state factory.
The common factory accepts its canvas so it does not depend on surface drawing
or artwork loading.
