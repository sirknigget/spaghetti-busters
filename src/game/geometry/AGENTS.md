# Geometry foundations

This subsystem provides shared geometry algorithms with explicit geometry inputs
and Three.js geometry outputs.

## Algorithm map

| Area              | Main entry points and responsibilities                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `fracture/`       | `fracture-geometry.ts` exposes stable entropy, chipped holes, masks, and perforated solids; `fracture-solid.ts` builds the solid               |
| `fracture/sweep/` | Interval subtraction and strip generation for visible surfaces                                                                                 |
| `clipping/`       | `death-clipping.ts` clips an existing perforated mesh into complementary pieces; neighboring modules build bands, polygons, walls, and outputs |

Keep generated contours deterministic for identical seeds and inputs. Both
fragments must share their jagged seam, preserve the source UVs and existing hole
walls, and avoid overlapping or missing surface area. Distant triangles are
preserved by the death clipper; do not discard historical damage during a cut.
Maintain front/side material-group boundaries and valid normals when modifying
buffer construction.

Runtime fracture calculations live here; authored models are in the project's
GLB assets. Algorithm tolerances/settings are in the local JSON configuration.

Run the colocated fracture/clipping tests for geometry changes. Use the code
death tests and `tests/rendering/` integration coverage when changing surface
ownership, UVs, or the seam representation consumed by presentation.
