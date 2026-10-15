# Editable 3D models

`public/assets/models/arcade-models.glb` is the canonical model source and the
browser delivery asset. It is a glTF 2.0 binary file that opens directly in
Blender and other standard glTF editors. The former TypeScript primitive and
polygon authoring definitions have been removed.

The library contains 39 named model templates. Its units follow the original
arcade scene: one model unit maps to one playfield unit, +Y points up, and +Z
faces the camera. Character and weapon roots retain their aiming pivots. The
city retains its world-space origin and GPU-instanced windows. Lighting and
shadows are dynamic; the asset has no baked lighting or external textures.
Runtime collision shapes stay separate from these display models.

The templates include the specialist, cannon, robot, six weapon/pickup variants,
projectile, city, reticle, status/effect rings, timeout panel/trail, boss armor,
angry eyes, ice crystals, and debris shapes. Each template root has an `assetId`
extra used by the loader. Node `assetNodeName` extras retain renderer names even
when glTF tools make duplicate names unique. In particular, preserve
`robot-leg--1`, `robot-leg-1`, `robot-arm--1`, `robot-arm-1`, `robot-head`,
`robot-antenna`, `robot-armor-flash`, `robot-thinking`, `robot-brand-mark`, and
`robot-status-anchor`. The shared `robot-shell` material receives hit lighting.

Robot brand marks and status labels remain dynamic. The GLB contains their
planes and label anchor; the game applies bundled SVG marks and generated
status textures. The label anchor's extras store the canvas dimensions. Mesh
extras also retain shadow flags, material depth settings, and face-material
slots, which are outside glTF's core scene contract. Preserve these extras when
editing. Loaded instances clone geometry and materials, so cleanup, damage
lighting, and robot breakup cannot mutate another instance or the template.

The original export was optimized with glTF Transform's `weld`, `dedup`, and
`prune({ keepLeaves: true, keepAttributes: true })` transforms, reducing the
library from 1,522,564 bytes to 538,244 bytes. Leaf anchors, original UVs, node
hierarchy, and triangle order are retained. No lossy simplification or geometry
compression is used: the library is small enough to avoid a decoder dependency
and retain precise authored surfaces. Its only extensions are
`EXT_mesh_gpu_instancing` and `KHR_materials_unlit`, both supported by Three.js.

After editing, validate the replacement with the Khronos glTF Validator. For
example, install `gltf-validator` in a temporary tool folder and run its API:

```js
import fs from "node:fs/promises";
import validator from "gltf-validator";

const bytes = await fs.readFile("public/assets/models/arcade-models.glb");
const report = await validator.validateBytes(new Uint8Array(bytes));
console.log(report.issues);
if (report.issues.numErrors || report.issues.numWarnings) process.exitCode = 1;
```

The shipped asset reports zero errors and zero warnings. The validator reports
informational unused UVs (needed by runtime textures) and notes that its schema
does not validate `EXT_mesh_gpu_instancing`. Runtime inspection verifies all 39
asset IDs, robot joint names, mesh/group contracts, and instanced city windows.
After replacing the file, run the browser suite to verify animation, breakup,
resource disposal, context recovery, mobile HUDs, and actual WebGL rendering.
