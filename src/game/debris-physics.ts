import * as THREE from "three";
import { loadGeometry } from "./model-assets";
import RAPIER from "@dimforge/rapier3d-compat";
import type { Block } from "./simulation";
import {
  cloneOwnedMaterial,
  createCodeMesh,
  createDeathFragments,
  disposeObject,
} from "./code-mesh";

export interface DebrisImpact {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  seed: number;
  target: "code" | "robot";
  removed?: { x: number; y: number; char: string; color: string }[];
}
interface RigidDebris {
  body: RAPIER.RigidBody;
  mesh: THREE.Group;
  age: number;
  life: number;
  kind: "letter" | "shard" | "robot" | "code";
  lastVelocity: THREE.Vector3;
  crumbled: boolean;
  seed: number;
}
interface Fleck {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Quaternion;
  spin: THREE.Vector3;
  scale: THREE.Vector3;
  color: THREE.Color;
  age: number;
  life: number;
  phase: number;
  kind: "shard" | "spark" | "smoke";
  bounces: number;
}
const HALF = 0.5;
const FULL_TURN = 2;
const TAU = Math.PI * FULL_TURN;
const VIEWPORT = { height: 720 };
const FLOOR_CONTACT = {
  halfWidth: 2200,
  halfHeight: 10,
  halfDepth: 500,
  centerX: 640,
  centerZ: -100,
  friction: 0.82,
  restitution: 0.22,
};
const SETTLED = { speed: 0.1, height: 95 };
const ENTROPY = {
  increment: 0x6d2b79f5,
  firstShift: 15,
  secondShift: 7,
  multiplier: 61,
  finalShift: 14,
  normalizer: 4294967296,
};
const IMPACT = {
  heightBias: 0.45,
  maxLetters: 4,

  maxFlecks: 34,
  baseFlecks: 14,
  radiusFlecks: 0.15,
  sparkEnd: 14,
  smokeEnd: 6,
  baseSpeed: 45,
  metalSpeed: 220,
  codeSpeed: 150,
  maxRadius: 17,
  radiusScale: 0.25,
  depth: 23,
  depthJitter: 14,
  inheritX: 0.12,
  inheritY: 0.1,
  lift: 35,
  depthBias: 0.35,
  depthSpeed: 100,
  smokeSize: 14,
  smokeSizeJitter: 12,
  sparkSizeJitter: 1.2,
  shardSize: 1.5,
  shardSizeJitter: 3.2,
  darkShardChance: 0.55,
  smokeLife: 1.3,
  smokeLifeJitter: 1.4,
  sparkLife: 0.35,
  sparkLifeJitter: 0.7,
  shardLife: 5,
  shardLifeJitter: 3,
  rotationSpan: 6,
  spinSpan: 15,
  spinBias: 7.5,
  thicknessBias: 0.3,
  thicknessJitter: 0.7,
  rigidCount: 2,
  rigidSize: 2,
  rigidSizeJitter: 3,
  metalMetalness: 0.7,
  codeMetalness: 0.1,
  rigidPositionJitter: 12,
  rigidDepth: 25,
  rigidDepthJitter: 10,
  rigidSpeedJitter: 180,
  rigidDepthSpeed: 80,
  rigidLife: 6,
  rigidLifeJitter: 2,
};
const LETTER = {
  depth: 33,
  depthJitter: 5,
  halfWidth: 4.6,
  halfHeight: 6,
  halfDepth: 0.9,
  lateralSpeed: 135,
  inheritX: 0.16,
  lift: 30,
  liftJitter: 110,
  inheritY: 0.1,
  depthSpeed: 20,
  depthSpeedJitter: 45,
  life: 8,
  lifeJitter: 3,
};
const COLLAPSE = {
  maxPeeledLetters: 14,
  minimumDistance: 35,
  lift: 45,
  maxImpactSources: 4,

  reuseThreshold: 64,
  kick: 35,
  kickJitter: 65,
  inheritX: 0.45,
  impactX: 0.055,
  inheritY: 0.35,
  liftJitter: 75,
  impactY: 0.035,
  depthBias: 0.4,
  depthSpeed: 90,
  life: 9,
  lifeJitter: 3,
  letterSurfaceOffset: 3,
  seedOffset: 191,
  seedStride: 31,
};
const HULL = {
  directions: 12,
  halfDirections: 6,
};
const ROBOT = {
  colliderScale: 0.46,

  minSize: 0.5,
  lateralSpeed: 60,
  lateralJitter: 120,
  inheritVelocity: 0.25,
  lift: 70,
  liftJitter: 140,
  outwardLift: 50,
  depthBias: 0.25,
  depthSpeed: 120,
  life: 10,
  lifeJitter: 3,
  impactSeedOffset: 119,
};
const BODY = {
  linearDamping: 0.12,
  angularDamping: 0.45,
  density: 0.1,

  frontDepth: 82,
  backDepth: -70,
  spinXY: 9,
  spinZ: 12,
  friction: 0.65,
  frictionJitter: 0.3,
  restitution: 0.22,
  restitutionJitter: 0.22,
  maxSeed: 0xffffffff,
};
const STEP = {
  maxDelta: 0.25,

  interval: 0.008333333333333333,
  cullHeight: -150,
  crumbleAge: 0.12,
  crumbleSpeed: -95,
  crumbleDeceleration: 70,
  fadeRate: 2,
};
const CRUMBLE = {
  maxEnergy: 160,
  energyScale: 0.28,
  count: 12,
  smokeCount: 3,
  smokeSize: 9,
  smokeSizeJitter: 11,
  shardSizeJitter: 2.5,
  positionJitter: 20,
  floorOffset: 2,
  originOffset: 8,
  lift: 20,
  energyLift: 0.65,
  depthSpeed: 80,
  rotationSpan: 6,
  spinSpan: 8,
  heightScale: 0.7,
  life: 4,
  lifeJitter: 2,
};
const FLECK = {
  gravity: 640,
  spinDamping: 0.45,

  curlX: 5.3,
  curlForceX: 22,
  dragX: 2.2,
  buoyancy: 75,
  dragY: 1.4,
  curlZ: 4,
  curlForceZ: 15,
  dragZ: 1.8,
  sparkDrag: 1.5,
  shardDrag: 0.22,
  restitution: 0.23,
  frictionX: 0.57,
  settleBounces: 3,
  settleSpeed: 10,
  settleDamping: 0.8,
};
const DRAW = {
  fadeRate: 2,
  smokeGrowth: 1.8,
  smokeSpin: 0.2,
  smokeFadeIn: 0.15,
  smokeAlpha: 0.3,
  smokeFadeOut: 0.22,
  sparkStretch: 2.7,
};
const FLOOR = 42,
  MAX_BODIES = 92,
  MAX_FLECKS = 640;
/** Local seeded entropy never consumes gameplay randomness. */
export function debrisRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += ENTROPY.increment;
    let n = state;
    n = Math.imul(n ^ (n >>> ENTROPY.firstShift), n | 1);
    n ^= n + Math.imul(n ^ (n >>> ENTROPY.secondShift), n | ENTROPY.multiplier);
    return ((n ^ (n >>> ENTROPY.finalShift)) >>> 0) / ENTROPY.normalizer;
  };
}

/** Render-only collision world: debris can never change an enemy, shot, or player. */
export class DebrisPhysics {
  private readonly world: RAPIER.World;
  private readonly rigid: RigidDebris[] = [];
  private readonly flecks: Fleck[] = [];
  private accumulator = 0;
  private readonly shards: THREE.InstancedMesh;
  private readonly sparks: THREE.InstancedMesh;
  private readonly smoke: THREE.InstancedMesh;
  private readonly smokeAlpha = new THREE.InstancedBufferAttribute(
    new Float32Array(MAX_FLECKS),
    1,
  );
  private readonly transform = new THREE.Object3D();
  private totalImpacts = 0;
  private totalRobotDeaths = 0;
  private totalCodeDeaths = 0;
  private disposed = false;

  static async create(scene: THREE.Scene) {
    await RAPIER.init();
    return new DebrisPhysics(scene);
  }
  private constructor(private readonly scene: THREE.Scene) {
    this.world = new RAPIER.World({ x: 0, y: -640, z: 0 });
    this.world.timestep = STEP.interval;
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        FLOOR_CONTACT.halfWidth,
        FLOOR_CONTACT.halfHeight,
        FLOOR_CONTACT.halfDepth,
      )
        .setTranslation(
          FLOOR_CONTACT.centerX,
          FLOOR - FLOOR_CONTACT.halfHeight,
          FLOOR_CONTACT.centerZ,
        )
        .setFriction(FLOOR_CONTACT.friction)
        .setRestitution(FLOOR_CONTACT.restitution),
    );
    this.shards = new THREE.InstancedMesh(
      loadGeometry("solid-impact-shard"),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.86,
        metalness: 0.12,
      }),
      MAX_FLECKS,
    );
    this.shards.name = "physics-chipped-code-shards";
    this.shards.castShadow = true;
    this.shards.receiveShadow = true;
    this.sparks = new THREE.InstancedMesh(
      loadGeometry("spark-fleck"),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      MAX_FLECKS,
    );
    this.sparks.name = "physics-incandescent-sparks";
    const smokeGeometry = loadGeometry("smoke-quad");
    smokeGeometry.setAttribute("instanceAlpha", this.smokeAlpha);
    const smokeMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: false,
      vertexShader:
        "attribute float instanceAlpha; varying vec2 vUv; varying float vAlpha; void main(){vUv=uv;vAlpha=instanceAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 vUv; varying float vAlpha; void main(){float r=length(vUv-.5)*2.;float a=exp(-r*r*4.)*(1.-smoothstep(.55,1.,r))*vAlpha;gl_FragColor=vec4(.32,.39,.40,a);}",
    });
    this.smoke = new THREE.InstancedMesh(
      smokeGeometry,
      smokeMaterial,
      MAX_FLECKS,
    );
    this.smoke.name = "physics-buoyant-turbulent-smoke";
    for (const mesh of [this.shards, this.sparks, this.smoke]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
    }
  }

  impact(hit: DebrisImpact) {
    if (this.disposed) return;
    this.totalImpacts++;
    const random = debrisRandom(hit.seed),
      metal = hit.target === "robot";
    const count = Math.min(
      IMPACT.maxFlecks,
      IMPACT.baseFlecks + Math.ceil(hit.radius * IMPACT.radiusFlecks),
    );
    for (let i = 0; i < count; i++) {
      const nonSmokeKind = i < IMPACT.sparkEnd ? "spark" : "shard";
      const kind = i < IMPACT.smokeEnd ? "smoke" : nonSmokeKind;
      const angle = random() * TAU,
        speed =
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
      let size;
      if (kind === "smoke")
        size = IMPACT.smokeSize + random() * IMPACT.smokeSizeJitter;
      else if (kind === "spark") size = 1 + random() * IMPACT.sparkSizeJitter;
      else size = IMPACT.shardSize + random() * IMPACT.shardSizeJitter;
      this.addFleck({
        position,
        velocity,
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
      });
    }
    // A few larger physical fragments collide with the floor and one another.
    for (let i = 0; i < IMPACT.rigidCount; i++) {
      const size = IMPACT.rigidSize + random() * IMPACT.rigidSizeJitter,
        mesh = new THREE.Group();
      const fragment = new THREE.Mesh(
        loadGeometry("solid-impact-shard").scale(size, size, size),
        new THREE.MeshStandardMaterial({
          color: metal ? "#9baeb5" : "#345965",
          roughness: 0.75,
          metalness: metal ? IMPACT.metalMetalness : IMPACT.codeMetalness,
        }),
      );
      fragment.castShadow = true;
      mesh.add(fragment);
      mesh.position.set(
        hit.x + (random() - HALF) * IMPACT.rigidPositionJitter,
        VIEWPORT.height -
          hit.y +
          (random() - HALF) * IMPACT.rigidPositionJitter,
        IMPACT.rigidDepth + random() * IMPACT.rigidDepthJitter,
      );
      this.addRigid(
        mesh,
        new THREE.Vector3(size, size, size),
        new THREE.Vector3(
          (random() - HALF) * IMPACT.rigidSpeedJitter +
            hit.vx * IMPACT.inheritX,
          60 + random() * IMPACT.rigidSpeedJitter,
          (random() - HALF) * IMPACT.rigidDepthSpeed,
        ),
        random,
        "shard",
        IMPACT.rigidLife + random() * IMPACT.rigidLifeJitter,
      );
    }
    for (const letter of (hit.removed ?? [])
      .filter((c) => c.char.trim())
      .slice(0, IMPACT.maxLetters))
      this.addLetter(letter, hit, random);
    this.renderParticles();
  }

  private addLetter(
    letter: { x: number; y: number; char: string; color: string },
    hit: DebrisImpact,
    random: () => number,
    position?: THREE.Vector3,
    rotation?: THREE.Quaternion,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 56;
    const c = canvas.getContext("2d")!;
    c.font = "bold 42px monospace";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = letter.color;
    c.fillText(letter.char, canvas.width * HALF, canvas.height * HALF);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const group = new THREE.Group();
    group.name = "fallen-code-letter";
    const face = new THREE.Mesh(
      loadGeometry("fallen-letter"),
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.7,
        alphaTest: 0.12,
      }),
    );
    face.castShadow = true;
    group.add(face);
    group.position.copy(
      position ??
        new THREE.Vector3(
          letter.x,
          VIEWPORT.height - letter.y,
          LETTER.depth + random() * LETTER.depthJitter,
        ),
    );
    if (rotation) group.quaternion.copy(rotation);
    this.addRigid(
      group,
      new THREE.Vector3(LETTER.halfWidth, LETTER.halfHeight, LETTER.halfDepth),
      new THREE.Vector3(
        (random() - HALF) * LETTER.lateralSpeed + hit.vx * LETTER.inheritX,
        LETTER.lift + random() * LETTER.liftJitter - hit.vy * LETTER.inheritY,
        LETTER.depthSpeed + random() * LETTER.depthSpeedJitter,
      ),
      random,
      "letter",
      LETTER.life + random() * LETTER.lifeJitter,
    );
  }

  /** Collapse the very same perforated sheet; this never creates gameplay blocks. */
  dismantleCode(
    mesh: THREE.Group,
    block: Block,
    seed: number,
    hit: DebrisImpact,
  ) {
    if (this.disposed) return;
    this.totalCodeDeaths++;
    const random = debrisRandom(seed),
      live = block.cells.filter((cell) => cell.alive && cell.char.trim());
    const peeled = new Set<Block["cells"][number]>();
    // Stratified entropy scatters loose glyphs across the entire sheet, not its first row.
    const count = Math.min(COLLAPSE.maxPeeledLetters, live.length);
    for (let i = 0; i < count; i++)
      peeled.add(
        live[
          Math.min(
            live.length - 1,
            Math.floor(((i + random()) * live.length) / count),
          )
        ]!,
      );
    // A heavily perforated sheet is already the exact visible surface. Reuse its triangles;
    // resweeping hundreds of old holes here would stall the final-hit frame.
    const reuseSurface =
      block.cells.filter((cell) => !cell.alive).length >
      COLLAPSE.reuseThreshold;
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
    mesh.updateWorldMatrix(true, false);
    mesh.matrixWorld.decompose(shell.position, shell.quaternion, shell.scale);
    const oldReactor = mesh.getObjectByName("factory-boss-reactor"),
      reactor = shell.getObjectByName("factory-boss-reactor");
    if (oldReactor && reactor) reactor.quaternion.copy(oldReactor.quaternion);
    shell.updateMatrixWorld(true);
    const pieces = createDeathFragments(shell, seed),
      origin = shell.position.clone();
    for (const piece of pieces) {
      // The fragment starts in its original assembled pose; Rapier supplies every later pose.
      const solid = piece.getObjectByName("perforated-extruded-code");
      if (!(solid instanceof THREE.Mesh)) continue;
      const geometry = solid.geometry;
      geometry.computeBoundingBox();
      const size = geometry.boundingBox!.getSize(new THREE.Vector3());
      const hull = this.codeHull(geometry);
      piece.applyMatrix4(shell.matrixWorld);
      const outward = piece.position.clone().sub(origin);
      const distance = Math.max(COLLAPSE.minimumDistance, outward.length());
      const kick = COLLAPSE.kick + random() * COLLAPSE.kickJitter;
      const velocity = new THREE.Vector3(
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
      this.addRigid(
        piece,
        size.multiplyScalar(HALF).max(new THREE.Vector3(1, 1, 1)),
        velocity,
        random,
        "code",
        COLLAPSE.life + random() * COLLAPSE.lifeJitter,
        hull,
      );
    }
    for (const cell of peeled) {
      const position = shell.localToWorld(
        new THREE.Vector3(
          cell.x,
          -cell.y,
          Number(shell.userData.solidDepth) * HALF +
            COLLAPSE.letterSurfaceOffset,
        ),
      );
      this.addLetter(
        {
          x: position.x,
          y: VIEWPORT.height - position.y,
          char: cell.char,
          color: cell.color,
        },
        hit,
        random,
        position,
        shell.quaternion,
      );
    }
    // Separate turbulent plumes erupt around the broken sheet instead of one repeated sprite.
    for (
      let i = 0;
      i < Math.min(COLLAPSE.maxImpactSources, pieces.length);
      i++
    ) {
      const p =
        pieces[
          Math.floor(
            (i * pieces.length) /
              Math.min(COLLAPSE.maxImpactSources, pieces.length),
          )
        ]!.position;
      this.impact({
        ...hit,
        x: p.x,
        y: VIEWPORT.height - p.y,
        radius: 32,
        seed: seed + COLLAPSE.seedOffset + i * COLLAPSE.seedStride,
        removed: [],
      });
    }
    if (!reuseSurface) disposeObject(shell);
  }

  /** A small convex contact hull follows each jagged slab's silhouette, including its depth. */
  private codeHull(geometry: THREE.BufferGeometry) {
    const positions = geometry.getAttribute("position"),
      points: number[] = [];
    for (let direction = 0; direction < HULL.directions; direction++) {
      const a = (direction * Math.PI) / HULL.halfDirections,
        dx = Math.cos(a),
        dy = Math.sin(a);
      let best = -Infinity,
        x = 0,
        y = 0,
        z = 0;
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

  /** Clone real robot assemblies, keeping their current pose and independent assets. */
  dismantleRobot(
    mesh: THREE.Group,
    robot: { x: number; y: number; vx?: number; vy?: number },
    seed: number,
  ) {
    if (this.disposed) return;
    this.totalRobotDeaths++;
    const random = debrisRandom(seed);
    mesh.updateWorldMatrix(true, true);
    const excluded = new Set([
      "robot-absorption-shield",
      "robot-armor-flash",
      "robot-status",
      "robot-thinking",
    ]);
    const assemblies = mesh.children.filter(
      (child) =>
        !excluded.has(child.name) &&
        !(child instanceof THREE.Sprite) &&
        child.visible,
    );
    for (const child of assemblies) {
      const clone = child.clone(true);
      clone.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry = object.geometry.clone();
          object.material = Array.isArray(object.material)
            ? object.material.map((material) => cloneOwnedMaterial(material))
            : cloneOwnedMaterial(object.material);
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      child.matrixWorld.decompose(
        clone.position,
        clone.quaternion,
        clone.scale,
      );
      const group = new THREE.Group();
      group.name = `fallen-${child.name || "robot-shell-part"}`;
      group.add(clone);
      group.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(group),
        center = bounds.getCenter(new THREE.Vector3()),
        size = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(center.x) || size.length() < ROBOT.minSize) {
        this.disposeMesh(group);
        continue;
      }
      group.position.copy(center);
      clone.position.sub(center);
      group.updateMatrixWorld(true);
      const outward = center
        .clone()
        .sub(new THREE.Vector3(robot.x, VIEWPORT.height - robot.y, 0))
        .normalize();
      const velocity = new THREE.Vector3(
        outward.x * (ROBOT.lateralSpeed + random() * ROBOT.lateralJitter) +
          (robot.vx ?? 0) * ROBOT.inheritVelocity,
        ROBOT.lift +
          random() * ROBOT.liftJitter +
          outward.y * ROBOT.outwardLift,
        (random() - ROBOT.depthBias) * ROBOT.depthSpeed,
      );
      this.addRigid(
        group,
        size
          .multiplyScalar(ROBOT.colliderScale)
          .max(new THREE.Vector3(1, 1, 1)),
        velocity,
        random,
        "robot",
        ROBOT.life + random() * ROBOT.lifeJitter,
      );
    }
    this.impact({
      x: robot.x,
      y: robot.y,
      vx: robot.vx ?? 0,
      vy: robot.vy ?? 0,
      radius: 80,
      seed: seed + ROBOT.impactSeedOffset,
      target: "robot",
    });
  }

  private addRigid(
    mesh: THREE.Group,
    halfSize: THREE.Vector3,
    velocity: THREE.Vector3,
    random: () => number,
    kind: RigidDebris["kind"],
    life: number,
    hull?: Float32Array,
  ) {
    while (this.rigid.length >= MAX_BODIES) this.removeRigid(0);
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(
          mesh.position.x,
          Math.max(FLOOR + halfSize.y + 1, mesh.position.y),
          kind === "code" || kind === "letter"
            ? mesh.position.z
            : Math.min(
                BODY.frontDepth,
                Math.max(BODY.backDepth, mesh.position.z),
              ),
        )
        .setRotation(mesh.quaternion)
        .setLinvel(velocity.x, velocity.y, velocity.z)
        .setAngvel({
          x: (random() - HALF) * BODY.spinXY,
          y: (random() - HALF) * BODY.spinXY,
          z: (random() - HALF) * BODY.spinZ,
        })
        .setLinearDamping(BODY.linearDamping)
        .setAngularDamping(BODY.angularDamping)
        .setCanSleep(true)
        .setCcdEnabled(true),
    );
    const shape =
      (hull && RAPIER.ColliderDesc.convexHull(hull)) ||
      RAPIER.ColliderDesc.cuboid(halfSize.x, halfSize.y, halfSize.z);
    this.world.createCollider(
      shape
        .setDensity(BODY.density)
        .setFriction(BODY.friction + random() * BODY.frictionJitter)
        .setRestitution(BODY.restitution + random() * BODY.restitutionJitter),
      body,
    );
    this.scene.add(mesh);
    this.rigid.push({
      body,
      mesh,
      age: 0,
      life,
      kind,
      lastVelocity: velocity.clone(),
      crumbled: false,
      seed: Math.floor(random() * BODY.maxSeed),
    });
  }
  private addFleck(fleck: Fleck) {
    if (this.flecks.length >= MAX_FLECKS) this.flecks.shift();
    this.flecks.push(fleck);
  }

  update(dt: number) {
    if (this.disposed || dt <= 0) return;
    this.accumulator += Math.min(dt, STEP.maxDelta);
    while (this.accumulator >= STEP.interval) {
      this.world.step();
      this.stepFlecks(STEP.interval);
      this.accumulator -= STEP.interval;
    }
    for (let i = this.rigid.length - 1; i >= 0; i--) {
      const item = this.rigid[i]!;
      item.age += Math.min(dt, STEP.maxDelta);
      if (item.age > item.life || item.body.translation().y < STEP.cullHeight) {
        this.removeRigid(i);
        continue;
      }
      const p = item.body.translation(),
        q = item.body.rotation(),
        v = item.body.linvel();
      const freshCode =
        item.kind === "code" && !item.crumbled && item.age > STEP.crumbleAge;
      if (
        freshCode &&
        item.lastVelocity.y < STEP.crumbleSpeed &&
        v.y - item.lastVelocity.y > STEP.crumbleDeceleration
      ) {
        item.crumbled = true;
        this.crumble(item, p);
      }
      item.lastVelocity.set(v.x, v.y, v.z);
      item.mesh.position.set(p.x, p.y, p.z);
      item.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      const fade = Math.min(1, (item.life - item.age) * STEP.fadeRate);
      item.mesh.scale.setScalar(Math.max(0, fade));
    }
    this.renderParticles();
  }
  /** Secondary chips are emitted by an actual collision impulse, not an animation timer. */
  private crumble(
    item: RigidDebris,
    position: { x: number; y: number; z: number },
  ) {
    const random = debrisRandom(item.seed),
      energy = Math.min(
        CRUMBLE.maxEnergy,
        Math.abs(item.lastVelocity.y) * CRUMBLE.energyScale,
      );
    for (let i = 0; i < CRUMBLE.count; i++) {
      const kind = i < CRUMBLE.smokeCount ? "smoke" : "shard",
        size =
          kind === "smoke"
            ? CRUMBLE.smokeSize + random() * CRUMBLE.smokeSizeJitter
            : 1 + random() * CRUMBLE.shardSizeJitter;
      this.addFleck({
        position: new THREE.Vector3(
          position.x + (random() - HALF) * CRUMBLE.positionJitter,
          Math.max(
            FLOOR + CRUMBLE.floorOffset,
            position.y - CRUMBLE.originOffset,
          ),
          position.z,
        ),
        velocity: new THREE.Vector3(
          (random() - HALF) * energy,
          CRUMBLE.lift + random() * energy * CRUMBLE.energyLift,
          (random() - HALF) * CRUMBLE.depthSpeed,
        ),
        rotation: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            random() * CRUMBLE.rotationSpan,
            random() * CRUMBLE.rotationSpan,
            random() * CRUMBLE.rotationSpan,
          ),
        ),
        spin: new THREE.Vector3(
          random() * CRUMBLE.spinSpan,
          random() * CRUMBLE.spinSpan,
          random() * CRUMBLE.spinSpan,
        ),
        scale: new THREE.Vector3(size, size * CRUMBLE.heightScale, size * HALF),
        color: new THREE.Color(random() < HALF ? "#345965" : "#9bc1b4"),
        age: 0,
        life:
          kind === "smoke"
            ? 1 + random()
            : CRUMBLE.life + random() * CRUMBLE.lifeJitter,
        phase: random() * CRUMBLE.rotationSpan,
        kind,
        bounces: 0,
      });
    }
  }

  private stepFlecks(dt: number) {
    for (let i = this.flecks.length - 1; i >= 0; i--) {
      const p = this.flecks[i]!;
      p.age += dt;
      if (p.age >= p.life) {
        this.flecks.splice(i, 1);
        continue;
      }
      if (p.kind === "smoke") {
        // Buoyancy, drag and changing curl-like eddies, integrated from velocity.
        p.velocity.x +=
          (Math.sin(p.age * FLECK.curlX + p.phase) * FLECK.curlForceX -
            p.velocity.x * FLECK.dragX) *
          dt;
        p.velocity.y += (FLECK.buoyancy - p.velocity.y * FLECK.dragY) * dt;
        p.velocity.z +=
          (Math.cos(p.age * FLECK.curlZ + p.phase) * FLECK.curlForceZ -
            p.velocity.z * FLECK.dragZ) *
          dt;
      } else {
        p.velocity.y -= FLECK.gravity * dt;
        p.velocity.multiplyScalar(
          Math.exp(
            -(p.kind === "spark" ? FLECK.sparkDrag : FLECK.shardDrag) * dt,
          ),
        );
        if (p.position.y < FLOOR + p.scale.y * HALF && p.velocity.y < 0) {
          p.position.y = FLOOR + p.scale.y * HALF;
          p.velocity.y *= -FLECK.restitution;
          p.velocity.x *= FLECK.frictionX;
          p.velocity.z *= HALF;
          p.spin.multiplyScalar(FLECK.spinDamping);
          p.bounces++;
          this.settleFleck(p);
        }
      }
      p.position.addScaledVector(p.velocity, dt);
      p.rotation.multiply(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(p.spin.x * dt, p.spin.y * dt, p.spin.z * dt),
        ),
      );
    }
  }
  private settleFleck(p: Fleck) {
    if (
      p.bounces > FLECK.settleBounces &&
      Math.abs(p.velocity.y) < FLECK.settleSpeed
    ) {
      p.velocity.y = 0;
      p.velocity.x *= FLECK.settleDamping;
    }
  }
  private renderParticles() {
    const counts = { shard: 0, spark: 0, smoke: 0 };
    for (const p of this.flecks) {
      const meshes = {
        shard: this.shards,
        spark: this.sparks,
        smoke: this.smoke,
      };
      const mesh = meshes[p.kind],
        index = counts[p.kind]++;
      this.transform.position.copy(p.position);
      this.transform.quaternion.copy(p.rotation);
      const fade = Math.min(1, (p.life - p.age) * DRAW.fadeRate);
      this.transform.scale
        .copy(p.scale)
        .multiplyScalar(
          p.kind === "smoke" ? 1 + p.age * DRAW.smokeGrowth : fade,
        );
      if (p.kind === "smoke") {
        this.transform.rotation.set(0, 0, p.phase + p.age * DRAW.smokeSpin);
        this.transform.scale.z = 1;
        this.smokeAlpha.setX(
          index,
          Math.sin(Math.min(1, p.age / DRAW.smokeFadeIn) * Math.PI * HALF) *
            Math.min(DRAW.smokeAlpha, (p.life - p.age) * DRAW.smokeFadeOut),
        );
      }
      if (p.kind === "spark") {
        this.transform.scale.y *= DRAW.sparkStretch;
        this.transform.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          p.velocity.clone().normalize(),
        );
      }
      this.transform.updateMatrix();
      mesh.setMatrixAt(index, this.transform.matrix);
      if (p.kind !== "smoke") mesh.setColorAt(index, p.color);
    }
    this.shards.count = counts.shard;
    this.sparks.count = counts.spark;
    this.smoke.count = counts.smoke;
    for (const mesh of [this.shards, this.sparks, this.smoke]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.smokeAlpha.needsUpdate = true;
  }
  get bodySnapshots() {
    return this.rigid.map((item) => {
      const p = item.body.translation(),
        v = item.body.linvel();
      return {
        kind: item.kind,
        x: p.x,
        y: p.y,
        z: p.z,
        vx: v.x,
        vy: v.y,
        vz: v.z,
        sleeping: item.body.isSleeping(),
      };
    });
  }
  get diagnostics() {
    return {
      rigidBodies: this.rigid.length,
      particles: this.flecks.length,
      settled: this.rigid.filter(
        (item) =>
          item.body.isSleeping() ||
          (Math.abs(item.body.linvel().y) < SETTLED.speed &&
            item.body.translation().y < SETTLED.height),
      ).length,
      letters: this.rigid.filter((item) => item.kind === "letter").length,
      robotParts: this.rigid.filter((item) => item.kind === "robot").length,
      codeParts: this.rigid.filter((item) => item.kind === "code").length,
      codeDeaths: this.totalCodeDeaths,
      crumbled: this.rigid.filter(
        (item) => item.kind === "code" && item.crumbled,
      ).length,
      impacts: this.totalImpacts,
      robotDeaths: this.totalRobotDeaths,
      floorY: FLOOR,
    };
  }
  private removeRigid(index: number) {
    const item = this.rigid[index]!;
    this.world.removeRigidBody(item.body);
    this.disposeMesh(item.mesh);
    this.rigid.splice(index, 1);
  }
  private disposeMesh(mesh: THREE.Object3D) {
    disposeObject(mesh);
  }

  reset() {
    while (this.rigid.length) this.removeRigid(this.rigid.length - 1);
    this.flecks.length = 0;
    this.accumulator = 0;
    this.totalImpacts = this.totalRobotDeaths = this.totalCodeDeaths = 0;
    this.renderParticles();
  }
  dispose() {
    if (this.disposed) return;
    this.reset();
    this.disposed = true;
    for (const mesh of [this.shards, this.sparks, this.smoke])
      this.disposeMesh(mesh);
    this.world.free();
  }
}

function impactColor(
  kind: Fleck["kind"],
  metal: boolean,
  random: () => number,
) {
  if (kind === "spark") return random() < HALF ? "#fff4b5" : "#ffae41";
  if (metal) return random() < HALF ? "#bdcbd0" : "#dba149";
  return random() < IMPACT.darkShardChance ? "#203d49" : "#83c1ad";
}
function impactLife(kind: Fleck["kind"], random: () => number) {
  if (kind === "smoke")
    return IMPACT.smokeLife + random() * IMPACT.smokeLifeJitter;
  if (kind === "spark")
    return IMPACT.sparkLife + random() * IMPACT.sparkLifeJitter;
  return IMPACT.shardLife + random() * IMPACT.shardLifeJitter;
}
