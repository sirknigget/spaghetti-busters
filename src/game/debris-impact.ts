import { PALETTE } from "./palette";
import * as THREE from "three";
import { loadGeometry } from "./model-assets";
import { LETTER, IMPACT } from "./debris-impact-settings";
import { HALF, VIEWPORT, TAU } from "./debris-settings";
import {
  type RemovedLetter,
  type DebrisImpact,
  type DebrisEmitter,
  type Fleck,
} from "./debris-types";
import { debrisRandom } from "./debris-random";

const LETTER_TEXTURE_HEIGHT = 56;
const LETTER_TEXTURE_WIDTH = 48;

const LETTER_ROUGHNESS = 0.7;
const LETTER_ALPHA_TEST = 0.12;
const RIGID_LIFT = 60;
const RIGID_ROUGHNESS = 0.75;

interface LetterMotion {
  hit: DebrisImpact;
  random: () => number;
  position?: THREE.Vector3;
  rotation?: THREE.Quaternion;
}

export function addLetter(
  context: DebrisEmitter,
  letter: RemovedLetter,
  motion: LetterMotion,
) {
  const { hit, random, position, rotation } = motion;
  const group = createLetter(letter);

  group.position.copy(
    position ??
      new THREE.Vector3(
        letter.x,
        VIEWPORT.height - letter.y,
        LETTER.depth + random() * LETTER.depthJitter,
      ),
  );
  if (rotation) {
    group.quaternion.copy(rotation);
  }

  context.rigid.add({
    mesh: group,
    halfSize: new THREE.Vector3(
      LETTER.halfWidth,
      LETTER.halfHeight,
      LETTER.halfDepth,
    ),
    velocity: new THREE.Vector3(
      (random() - HALF) * LETTER.lateralSpeed + hit.vx * LETTER.inheritX,
      LETTER.lift + random() * LETTER.liftJitter - hit.vy * LETTER.inheritY,
      LETTER.depthSpeed + random() * LETTER.depthSpeedJitter,
    ),
    random,
    kind: "letter",
    life: LETTER.life + random() * LETTER.lifeJitter,
  });
}

function createLetter(letter: RemovedLetter) {
  const texture = letterTexture(letter);
  const group = new THREE.Group();

  group.name = "fallen-code-letter";

  const face = new THREE.Mesh(
    loadGeometry("fallen-letter"),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: LETTER_ROUGHNESS,
      alphaTest: LETTER_ALPHA_TEST,
    }),
  );

  face.castShadow = true;
  group.add(face);

  return group;
}

function letterTexture(letter: RemovedLetter) {
  const canvas = document.createElement("canvas");

  canvas.width = LETTER_TEXTURE_WIDTH;
  canvas.height = LETTER_TEXTURE_HEIGHT;

  const c = canvas.getContext("2d")!;

  c.font = "bold 42px monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = letter.color;
  c.fillText(letter.char, canvas.width * HALF, canvas.height * HALF);

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

interface ImpactAppearance {
  random: () => number;
  metal: boolean;
  kind: Fleck["kind"];
}
interface ImpactShard {
  hit: DebrisImpact;
  random: () => number;
  metal: boolean;
}

function impactKind(index: number): Fleck["kind"] {
  const nonSmokeKind = index < IMPACT.sparkEnd ? "spark" : "shard";

  return index < IMPACT.smokeEnd ? "smoke" : nonSmokeKind;
}

export function emitImpact(context: DebrisEmitter, hit: DebrisImpact) {
  const random = debrisRandom(hit.seed);
  const metal = hit.target === "robot";
  const count = Math.min(
    IMPACT.maxFlecks,
    IMPACT.baseFlecks + Math.ceil(hit.radius * IMPACT.radiusFlecks),
  );

  for (let i = 0; i < count; i++) {
    const kind = impactKind(i);

    context.particles.add(impactFleck(hit, { random, metal, kind }));
  }

  for (let i = 0; i < IMPACT.rigidCount; i++) {
    addImpactRigid(context, { hit, random, metal });
  }

  for (const letter of (hit.removed ?? [])
    .filter((c) => c.char.trim())
    .slice(0, IMPACT.maxLetters)) {
    addLetter(context, letter, { hit, random });
  }

  context.particles.render();
}

function impactFleck(hit: DebrisImpact, appearance: ImpactAppearance): Fleck {
  const { random, metal, kind } = appearance;
  const { position, velocity } = impactTrajectory(hit, random, metal);
  let size;

  if (kind === "smoke") {
    size = IMPACT.smokeSize + random() * IMPACT.smokeSizeJitter;
  } else if (kind === "spark") {
    size = 1 + random() * IMPACT.sparkSizeJitter;
  } else {
    size = IMPACT.shardSize + random() * IMPACT.shardSizeJitter;
  }

  return {
    position,
    velocity,
    ...impactSpin(random),
    scale: new THREE.Vector3(
      size,
      size * (IMPACT.heightBias + random()),
      size * (IMPACT.thicknessBias + random() * IMPACT.thicknessJitter),
    ),
    color: new THREE.Color(impactColor(kind, metal, random)),
    age: 0,
    life: impactLife(kind, random),
    phase: random() * TAU,
    kind,
    bounces: 0,
  };
}

function impactTrajectory(
  hit: DebrisImpact,
  random: () => number,
  metal: boolean,
) {
  const angle = random() * TAU;
  const speed =
    IMPACT.baseSpeed +
    random() * (metal ? IMPACT.metalSpeed : IMPACT.codeSpeed);
  const radius =
    Math.sqrt(random()) *
    Math.min(IMPACT.maxRadius, hit.radius * IMPACT.radiusScale);
  const position = new THREE.Vector3(
    hit.x + Math.cos(angle) * radius,
    VIEWPORT.height - hit.y + Math.sin(angle) * radius,
    IMPACT.depth + random() * IMPACT.depthJitter,
  );
  const velocity = new THREE.Vector3(
    Math.cos(angle) * speed + hit.vx * IMPACT.inheritX,
    Math.sin(angle) * speed - hit.vy * IMPACT.inheritY + IMPACT.lift,
    (random() - IMPACT.depthBias) * IMPACT.depthSpeed,
  );

  return { position, velocity };
}

function impactSpin(random: () => number) {
  return {
    rotation: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        random() * IMPACT.rotationSpan,
        random() * IMPACT.rotationSpan,
        random() * IMPACT.rotationSpan,
      ),
    ),
    spin: new THREE.Vector3(
      random() * IMPACT.spinSpan - IMPACT.spinBias,
      random() * IMPACT.spinSpan - IMPACT.spinBias,
      random() * IMPACT.spinSpan - IMPACT.spinBias,
    ),
  };
}

function addImpactRigid(context: DebrisEmitter, source: ImpactShard) {
  const { hit, random, metal } = source;
  const size = IMPACT.rigidSize + random() * IMPACT.rigidSizeJitter;
  const mesh = new THREE.Group();

  addImpactShard(mesh, size, metal);
  mesh.position.set(
    hit.x + (random() - HALF) * IMPACT.rigidPositionJitter,
    VIEWPORT.height - hit.y + (random() - HALF) * IMPACT.rigidPositionJitter,
    IMPACT.rigidDepth + random() * IMPACT.rigidDepthJitter,
  );
  context.rigid.add({
    mesh,
    halfSize: new THREE.Vector3(size, size, size),
    velocity: new THREE.Vector3(
      (random() - HALF) * IMPACT.rigidSpeedJitter + hit.vx * IMPACT.inheritX,
      RIGID_LIFT + random() * IMPACT.rigidSpeedJitter,
      (random() - HALF) * IMPACT.rigidDepthSpeed,
    ),
    random,
    kind: "shard",
    life: IMPACT.rigidLife + random() * IMPACT.rigidLifeJitter,
  });
}

function addImpactShard(mesh: THREE.Group, size: number, metal: boolean) {
  const fragment = new THREE.Mesh(
    loadGeometry("solid-impact-shard").scale(size, size, size),
    new THREE.MeshStandardMaterial({
      color: metal ? PALETTE.debris.metal : PALETTE.debris.dark,
      roughness: RIGID_ROUGHNESS,
      metalness: metal ? IMPACT.metalMetalness : IMPACT.codeMetalness,
    }),
  );

  fragment.castShadow = true;
  mesh.add(fragment);
}

function impactColor(
  kind: Fleck["kind"],
  metal: boolean,
  random: () => number,
) {
  if (kind === "spark") {
    return random() < HALF ? PALETTE.debris.spark : PALETTE.debris.sparkOrange;
  }

  if (metal) {
    return random() < HALF
      ? PALETTE.debris.metalLight
      : PALETTE.debris.metalGold;
  }

  return random() < IMPACT.darkShardChance
    ? PALETTE.debris.ink
    : PALETTE.debris.mint;
}

function impactLife(kind: Fleck["kind"], random: () => number) {
  if (kind === "smoke") {
    return IMPACT.smokeLife + random() * IMPACT.smokeLifeJitter;
  }

  if (kind === "spark") {
    return IMPACT.sparkLife + random() * IMPACT.sparkLifeJitter;
  }

  return IMPACT.shardLife + random() * IMPACT.shardLifeJitter;
}
