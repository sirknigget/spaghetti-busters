import type * as THREE from "three";
import type { Block } from "#root/src/game/simulation/simulation.ts";
import type { FractureVisual } from "#root/src/game/code/code-visual.ts";
import { createCodeMesh } from "#root/src/game/code/code-solid.ts";
import { addRemovedCells } from "#root/src/game/code/code-surface.ts";
import { fractureMask } from "#root/src/game/geometry/fracture/fracture-geometry.ts";
import { HALF, HEADER_HEIGHT } from "#root/src/game/code/code-settings.ts";

export function createFragmentMesh(
  block: Block,
  parent: THREE.Group,
  parentBlock: Block,
): THREE.Group {
  // SAFETY: createCodeMesh stores only FractureVisual values under this private key.
  const inherited = parent.userData.fractureVisual as
    FractureVisual | undefined;

  if (!inherited || !block.fracture) {
    return createCodeMesh(block);
  }

  const f = block.fracture;
  const region = childRegion(inherited, f);
  const parentVisual: FractureVisual = {
    ...inherited,
    holes: new Map(inherited.holes),
  };

  addRemovedCells(parentVisual, parentBlock);

  const visual: FractureVisual = {
    ...parentVisual,
    offset: {
      x: inherited.offset.x + f.offsetX,
      y: inherited.offset.y - f.offsetY,
    },
    regions: [...inherited.regions, region],
    holes: new Map(parentVisual.holes),
    fractured: true,
  };

  return createCodeMesh(block, undefined, visual);
}

function childRegion(
  inherited: FractureVisual,
  f: NonNullable<Block["fracture"]>,
) {
  const axis = f.axis;
  const bounds = {
    left: -inherited.width * HALF - 1,
    right: inherited.width * HALF + 1,
    bottom: -inherited.height * HALF - 1,
    top: inherited.height * HALF + HEADER_HEIGHT + 1,
  };
  const cut =
    axis === "x" ? inherited.offset.x + f.cut : inherited.offset.y - f.cut;

  return fractureMask(axis, cut, {
    side: axis === "x" ? f.side : -f.side,
    seed: f.seed,
    bounds,
  });
}
