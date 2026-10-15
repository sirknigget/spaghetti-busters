import * as THREE from "three";
import { HULL, COLLAPSE } from "./debris-impact-settings";
import { type Block } from "./simulation";
import { createCodeMesh } from "./code-solid";
import { createDeathFragments } from "./code-death-fragments";
import { disposeObject } from "./graphics-resources";
import { debrisRandom } from "./debris-random";
import { addLetter } from "./debris-impact";
import { HALF, VIEWPORT } from "./debris-settings";
import { type DebrisImpact, type DebrisEmitter } from "./debris-types";

export function codeHull(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute("position");
  const points: number[] = [];
  for (let direction = 0; direction < HULL.directions; direction++) {
    const a = (direction * Math.PI) / HULL.halfDirections;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = -Infinity;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < positions.count; i++) {
      const score = positions.getX(i) * dx + positions.getY(i) * dy;
      if (score > best) {
        best = score;
        x = positions.getX(i);
        y = positions.getY(i);
        z = Math.abs(positions.getZ(i));
      }
    }
    points.push(x, y, z, x, y, -z);
  }

  return new Float32Array(points);
}

export interface CodeCollapse {
  block: Block;
  seed: number;
  hit: DebrisImpact;
}
interface CollapseSource {
  block: Block;
  hit: DebrisImpact;
  shell: THREE.Group;
  random: () => number;
}

export function collapseCode(
  context: DebrisEmitter,
  mesh: THREE.Group,
  death: CodeCollapse,
) {
  const { block, seed, hit } = death;
  const random = debrisRandom(seed);
  const peeled = peelLetters(block, random);
  const { shell, reuseSurface } = collapseShell(mesh, block, peeled);
  const pieces = createDeathFragments(shell, seed);
  const source = { block, hit, shell, random };
  for (const piece of pieces) {
    addCodePiece(context, piece, source);
  }
  dropLetters(context, peeled, source);
  collapsePlumes(context, pieces, death);
  if (!reuseSurface) {
    disposeObject(shell);
  }
}

function peelLetters(block: Block, random: () => number) {
  const live = block.cells.filter((cell) => cell.alive && cell.char.trim());
  const peeled = new Set<Block["cells"][number]>();
  // Stratified entropy scatters loose glyphs across the entire sheet, not its first row.
  const count = Math.min(COLLAPSE.maxPeeledLetters, live.length);
  for (let i = 0; i < count; i++) {
    peeled.add(
      live[
        Math.min(
          live.length - 1,
          Math.floor(((i + random()) * live.length) / count),
        )
      ]!,
    );
  }

  return peeled;
}

function collapseShell(
  mesh: THREE.Group,
  block: Block,
  peeled: Set<Block["cells"][number]>,
) {
  const reuseSurface =
    block.cells.filter((cell) => !cell.alive).length > COLLAPSE.reuseThreshold;
  const shell = reuseSurface
    ? mesh
    : createCodeMesh(
        {
          ...block,
          cells: block.cells.map((cell) =>
            peeled.has(cell) ? { ...cell, alive: false } : cell,
          ),
        },
        mesh,
      );
  copyShellPose(mesh, shell);

  return { shell, reuseSurface };
}

function copyShellPose(mesh: THREE.Group, shell: THREE.Group) {
  mesh.updateWorldMatrix(true, false);
  mesh.matrixWorld.decompose(shell.position, shell.quaternion, shell.scale);
  const oldReactor = mesh.getObjectByName("factory-boss-reactor");
  const reactor = shell.getObjectByName("factory-boss-reactor");
  if (oldReactor && reactor) {
    reactor.quaternion.copy(oldReactor.quaternion);
  }
  shell.updateMatrixWorld(true);
}

function addCodePiece(
  context: DebrisEmitter,
  piece: THREE.Group,
  source: CollapseSource,
) {
  const { shell, random } = source;
  // The fragment starts in its original assembled pose; Rapier supplies every later pose.
  const solid = piece.getObjectByName("perforated-extruded-code");
  if (!(solid instanceof THREE.Mesh)) {
    return;
  }
  const geometry = solid.geometry;
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  const hull = codeHull(geometry);
  piece.applyMatrix4(shell.matrixWorld);
  const velocity = collapseVelocity(piece, source);
  context.rigid.add({
    mesh: piece,
    halfSize: size.multiplyScalar(HALF).max(new THREE.Vector3(1, 1, 1)),
    velocity,
    random,
    kind: "code",
    life: COLLAPSE.life + random() * COLLAPSE.lifeJitter,
    hull,
  });
}

function collapseVelocity(piece: THREE.Group, source: CollapseSource) {
  const { block, shell, hit, random } = source;
  const outward = piece.position.clone().sub(shell.position);
  const distance = Math.max(COLLAPSE.minimumDistance, outward.length());
  const kick = COLLAPSE.kick + random() * COLLAPSE.kickJitter;

  return new THREE.Vector3(
    block.vx * COLLAPSE.inheritX +
      (outward.x / distance) * kick +
      hit.vx * COLLAPSE.impactX,
    -block.vy * COLLAPSE.inheritY +
      (outward.y / distance) * kick +
      COLLAPSE.lift +
      random() * COLLAPSE.liftJitter -
      hit.vy * COLLAPSE.impactY,
    (random() - COLLAPSE.depthBias) * COLLAPSE.depthSpeed,
  );
}

function dropLetters(
  context: DebrisEmitter,
  peeled: Set<Block["cells"][number]>,
  source: CollapseSource,
) {
  const { shell, hit, random } = source;
  for (const cell of peeled) {
    const position = shell.localToWorld(
      new THREE.Vector3(
        cell.x,
        -cell.y,
        Number(shell.userData.solidDepth) * HALF + COLLAPSE.letterSurfaceOffset,
      ),
    );
    addLetter(
      context,
      {
        x: position.x,
        y: VIEWPORT.height - position.y,
        char: cell.char,
        color: cell.color,
      },
      { hit, random, position, rotation: shell.quaternion },
    );
  }
}

function collapsePlumes(
  context: DebrisEmitter,
  pieces: THREE.Group[],
  death: CodeCollapse,
) {
  const { hit, seed } = death;
  // Separate turbulent plumes erupt around the broken sheet instead of one repeated sprite.
  for (let i = 0; i < Math.min(COLLAPSE.maxImpactSources, pieces.length); i++) {
    const p =
      pieces[
        Math.floor(
          (i * pieces.length) /
            Math.min(COLLAPSE.maxImpactSources, pieces.length),
        )
      ]!.position;
    context.impact({
      ...hit,
      x: p.x,
      y: VIEWPORT.height - p.y,
      radius: 32,
      seed: seed + COLLAPSE.seedOffset + i * COLLAPSE.seedStride,
      removed: [],
    });
  }
}
