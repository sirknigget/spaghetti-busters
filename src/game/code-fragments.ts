import type * as THREE from "three";
import type { Block } from "./simulation";
import type { FractureVisual } from "./code-visual";
import { createCodeMesh } from "./code-solid";
import { addRemovedCells } from "./code-surface";
import { fractureMask } from "./fracture-geometry";
import { HALF, HEADER_HEIGHT } from "./code-settings";

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
