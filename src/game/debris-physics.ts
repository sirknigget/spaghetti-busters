import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { Block } from "./simulation";
import {
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
const FLOOR = 42,
  MAX_BODIES = 92,
  MAX_FLECKS = 640;
/** Local seeded entropy never consumes gameplay randomness. */
export function debrisRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
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
    this.world.timestep = 1 / 120;
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(2200, 10, 500)
        .setTranslation(640, FLOOR - 10, -100)
        .setFriction(0.82)
        .setRestitution(0.22),
    );
    this.shards = new THREE.InstancedMesh(
      new THREE.TetrahedronGeometry(1),
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
      new THREE.SphereGeometry(1, 5, 4),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      MAX_FLECKS,
    );
    this.sparks.name = "physics-incandescent-sparks";
    const smokeGeometry = new THREE.PlaneGeometry(1, 1);
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
    const count = Math.min(34, 14 + Math.ceil(hit.radius * 0.15));
    for (let i = 0; i < count; i++) {
      const kind = i < 6 ? "smoke" : i < 14 ? "spark" : "shard";
      const angle = random() * Math.PI * 2,
        speed = 45 + random() * (metal ? 220 : 150);
      const radius = Math.sqrt(random()) * Math.min(17, hit.radius * 0.25);
      const position = new THREE.Vector3(
        hit.x + Math.cos(angle) * radius,
        720 - hit.y + Math.sin(angle) * radius,
        23 + random() * 14,
      );
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed + hit.vx * 0.12,
        Math.sin(angle) * speed - hit.vy * 0.1 + 35,
        (random() - 0.35) * 100,
      );
      const size =
        kind === "smoke"
          ? 14 + random() * 12
          : kind === "spark"
            ? 1 + random() * 1.2
            : 1.5 + random() * 3.2;
      this.addFleck({
        position,
        velocity,
        rotation: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(random() * 6, random() * 6, random() * 6),
        ),
        spin: new THREE.Vector3(
          random() * 15 - 7.5,
          random() * 15 - 7.5,
          random() * 15 - 7.5,
        ),
        scale: new THREE.Vector3(
          size,
          size * (0.45 + random()),
          size * (0.3 + random() * 0.7),
        ),
        color: new THREE.Color(
          kind === "spark"
            ? random() < 0.5
              ? "#fff4b5"
              : "#ffae41"
            : metal
              ? random() < 0.5
                ? "#bdcbd0"
                : "#dba149"
              : random() < 0.55
                ? "#203d49"
                : "#83c1ad",
        ),
        age: 0,
        life:
          kind === "smoke"
            ? 1.3 + random() * 1.4
            : kind === "spark"
              ? 0.35 + random() * 0.7
              : 5 + random() * 3,
        phase: random() * Math.PI * 2,
        kind,
        bounces: 0,
      });
    }
    // A few larger physical fragments collide with the floor and one another.
    for (let i = 0; i < 2; i++) {
      const size = 2 + random() * 3,
        mesh = new THREE.Group();
      const fragment = new THREE.Mesh(
        new THREE.TetrahedronGeometry(size),
        new THREE.MeshStandardMaterial({
          color: metal ? "#9baeb5" : "#345965",
          roughness: 0.75,
          metalness: metal ? 0.7 : 0.1,
        }),
      );
      fragment.castShadow = true;
      mesh.add(fragment);
      mesh.position.set(
        hit.x + (random() - 0.5) * 12,
        720 - hit.y + (random() - 0.5) * 12,
        25 + random() * 10,
      );
      this.addRigid(
        mesh,
        new THREE.Vector3(size, size, size),
        new THREE.Vector3(
          (random() - 0.5) * 180 + hit.vx * 0.12,
          60 + random() * 180,
          (random() - 0.5) * 80,
        ),
        random,
        "shard",
        6 + random() * 2,
      );
    }
    for (const letter of (hit.removed ?? [])
      .filter((c) => c.char.trim())
      .slice(0, 4))
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
    c.fillText(letter.char, 24, 28);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const group = new THREE.Group();
    group.name = "fallen-code-letter";
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 14),
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
        new THREE.Vector3(letter.x, 720 - letter.y, 33 + random() * 5),
    );
    if (rotation) group.quaternion.copy(rotation);
    this.addRigid(
      group,
      new THREE.Vector3(4.6, 6, 0.9),
      new THREE.Vector3(
        (random() - 0.5) * 135 + hit.vx * 0.16,
        30 + random() * 110 - hit.vy * 0.1,
        20 + random() * 45,
      ),
      random,
      "letter",
      8 + random() * 3,
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
    const count = Math.min(14, live.length);
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
    const reuseSurface = block.cells.filter((cell) => !cell.alive).length > 64;
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
      const geometry = (
        piece.getObjectByName("perforated-extruded-code") as THREE.Mesh
      ).geometry;
      geometry.computeBoundingBox();
      const size = geometry.boundingBox!.getSize(new THREE.Vector3());
      const hull = this.codeHull(geometry);
      piece.applyMatrix4(shell.matrixWorld);
      const outward = piece.position.clone().sub(origin);
      const distance = Math.max(35, outward.length());
      const kick = 35 + random() * 65;
      const velocity = new THREE.Vector3(
        block.vx * 0.45 + (outward.x / distance) * kick + hit.vx * 0.055,
        -block.vy * 0.35 +
          (outward.y / distance) * kick +
          45 +
          random() * 75 -
          hit.vy * 0.035,
        (random() - 0.4) * 90,
      );
      this.addRigid(
        piece,
        size.multiplyScalar(0.5).max(new THREE.Vector3(1, 1, 1)),
        velocity,
        random,
        "code",
        9 + random() * 3,
        hull,
      );
    }
    for (const cell of peeled) {
      const position = shell.localToWorld(
        new THREE.Vector3(
          cell.x,
          -cell.y,
          (shell.userData.solidDepth as number) / 2 + 3,
        ),
      );
      this.addLetter(
        {
          x: position.x,
          y: 720 - position.y,
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
    for (let i = 0; i < Math.min(4, pieces.length); i++) {
      const p =
        pieces[Math.floor((i * pieces.length) / Math.min(4, pieces.length))]!
          .position;
      this.impact({
        ...hit,
        x: p.x,
        y: 720 - p.y,
        radius: 32,
        seed: seed + 191 + i * 31,
        removed: [],
      });
    }
    if (!reuseSurface) disposeObject(shell);
  }

  /** A small convex contact hull follows each jagged slab's silhouette, including its depth. */
  private codeHull(geometry: THREE.BufferGeometry) {
    const positions = geometry.getAttribute("position"),
      points: number[] = [];
    for (let direction = 0; direction < 12; direction++) {
      const a = (direction * Math.PI) / 6,
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
    for (const child of mesh.children) {
      if (
        excluded.has(child.name) ||
        child instanceof THREE.Sprite ||
        !child.visible
      )
        continue;
      const clone = child.clone(true);
      clone.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry = object.geometry.clone();
          const cloneMaterial = (material: THREE.Material) => {
            const copy = material.clone();
            for (const key of Object.keys(copy)) {
              const value = (copy as unknown as Record<string, unknown>)[key];
              if (value instanceof THREE.Texture) {
                const texture = value.clone();
                texture.needsUpdate = true;
                (copy as unknown as Record<string, unknown>)[key] = texture;
              }
            }
            return copy;
          };
          object.material = Array.isArray(object.material)
            ? object.material.map(cloneMaterial)
            : cloneMaterial(object.material);
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
      if (!Number.isFinite(center.x) || size.length() < 0.5) {
        this.disposeMesh(group);
        continue;
      }
      group.position.copy(center);
      clone.position.sub(center);
      group.updateMatrixWorld(true);
      const outward = center
        .clone()
        .sub(new THREE.Vector3(robot.x, 720 - robot.y, 0))
        .normalize();
      const velocity = new THREE.Vector3(
        outward.x * (60 + random() * 120) + (robot.vx ?? 0) * 0.25,
        70 + random() * 140 + outward.y * 50,
        (random() - 0.25) * 120,
      );
      this.addRigid(
        group,
        size.multiplyScalar(0.46).max(new THREE.Vector3(1, 1, 1)),
        velocity,
        random,
        "robot",
        10 + random() * 3,
      );
    }
    this.impact({
      x: robot.x,
      y: robot.y,
      vx: robot.vx ?? 0,
      vy: robot.vy ?? 0,
      radius: 80,
      seed: seed + 119,
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
            : Math.min(82, Math.max(-70, mesh.position.z)),
        )
        .setRotation(mesh.quaternion)
        .setLinvel(velocity.x, velocity.y, velocity.z)
        .setAngvel({
          x: (random() - 0.5) * 9,
          y: (random() - 0.5) * 9,
          z: (random() - 0.5) * 12,
        })
        .setLinearDamping(0.12)
        .setAngularDamping(0.45)
        .setCanSleep(true)
        .setCcdEnabled(true),
    );
    const shape =
      (hull && RAPIER.ColliderDesc.convexHull(hull)) ||
      RAPIER.ColliderDesc.cuboid(halfSize.x, halfSize.y, halfSize.z);
    this.world.createCollider(
      shape
        .setDensity(0.1)
        .setFriction(0.65 + random() * 0.3)
        .setRestitution(0.22 + random() * 0.22),
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
      seed: Math.floor(random() * 0xffffffff),
    });
  }
  private addFleck(fleck: Fleck) {
    if (this.flecks.length >= MAX_FLECKS) this.flecks.shift();
    this.flecks.push(fleck);
  }

  update(dt: number) {
    if (this.disposed || dt <= 0) return;
    this.accumulator += Math.min(dt, 0.25);
    while (this.accumulator >= 1 / 120) {
      this.world.step();
      this.stepFlecks(1 / 120);
      this.accumulator -= 1 / 120;
    }
    for (let i = this.rigid.length - 1; i >= 0; i--) {
      const item = this.rigid[i]!;
      item.age += Math.min(dt, 0.25);
      if (item.age > item.life || item.body.translation().y < -150) {
        this.removeRigid(i);
        continue;
      }
      const p = item.body.translation(),
        q = item.body.rotation(),
        v = item.body.linvel();
      if (
        item.kind === "code" &&
        !item.crumbled &&
        item.age > 0.12 &&
        item.lastVelocity.y < -95 &&
        v.y - item.lastVelocity.y > 70
      ) {
        item.crumbled = true;
        this.crumble(item, p);
      }
      item.lastVelocity.set(v.x, v.y, v.z);
      item.mesh.position.set(p.x, p.y, p.z);
      item.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      const fade = Math.min(1, (item.life - item.age) * 2);
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
      energy = Math.min(160, Math.abs(item.lastVelocity.y) * 0.28);
    for (let i = 0; i < 12; i++) {
      const kind = i < 3 ? "smoke" : "shard",
        size = kind === "smoke" ? 9 + random() * 11 : 1 + random() * 2.5;
      this.addFleck({
        position: new THREE.Vector3(
          position.x + (random() - 0.5) * 20,
          Math.max(FLOOR + 2, position.y - 8),
          position.z,
        ),
        velocity: new THREE.Vector3(
          (random() - 0.5) * energy,
          20 + random() * energy * 0.65,
          (random() - 0.5) * 80,
        ),
        rotation: new THREE.Quaternion().setFromEuler(
          new THREE.Euler(random() * 6, random() * 6, random() * 6),
        ),
        spin: new THREE.Vector3(random() * 8, random() * 8, random() * 8),
        scale: new THREE.Vector3(size, size * 0.7, size * 0.5),
        color: new THREE.Color(random() < 0.5 ? "#345965" : "#9bc1b4"),
        age: 0,
        life: kind === "smoke" ? 1 + random() : 4 + random() * 2,
        phase: random() * 6,
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
          (Math.sin(p.age * 5.3 + p.phase) * 22 - p.velocity.x * 2.2) * dt;
        p.velocity.y += (75 - p.velocity.y * 1.4) * dt;
        p.velocity.z +=
          (Math.cos(p.age * 4 + p.phase) * 15 - p.velocity.z * 1.8) * dt;
      } else {
        p.velocity.y -= 640 * dt;
        p.velocity.multiplyScalar(
          Math.exp(-(p.kind === "spark" ? 1.5 : 0.22) * dt),
        );
        if (p.position.y < FLOOR + p.scale.y * 0.5 && p.velocity.y < 0) {
          p.position.y = FLOOR + p.scale.y * 0.5;
          p.velocity.y *= -0.23;
          p.velocity.x *= 0.57;
          p.velocity.z *= 0.5;
          p.spin.multiplyScalar(0.45);
          p.bounces++;
          if (p.bounces > 3 && Math.abs(p.velocity.y) < 10) {
            p.velocity.y = 0;
            p.velocity.x *= 0.8;
          }
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
  private renderParticles() {
    const counts = { shard: 0, spark: 0, smoke: 0 };
    for (const p of this.flecks) {
      const mesh =
          p.kind === "shard"
            ? this.shards
            : p.kind === "spark"
              ? this.sparks
              : this.smoke,
        index = counts[p.kind]++;
      this.transform.position.copy(p.position);
      this.transform.quaternion.copy(p.rotation);
      const fade = Math.min(1, (p.life - p.age) * 2);
      this.transform.scale
        .copy(p.scale)
        .multiplyScalar(p.kind === "smoke" ? 1 + p.age * 1.8 : fade);
      if (p.kind === "smoke") {
        this.transform.rotation.set(0, 0, p.phase + p.age * 0.2);
        this.transform.scale.z = 1;
        this.smokeAlpha.setX(
          index,
          Math.sin((Math.min(1, p.age / 0.15) * Math.PI) / 2) *
            Math.min(0.3, (p.life - p.age) * 0.22),
        );
      }
      if (p.kind === "spark") {
        this.transform.scale.y *= 2.7;
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
          (Math.abs(item.body.linvel().y) < 0.1 &&
            item.body.translation().y < 95),
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
    const geometry = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    mesh.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometry.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          materials.add(material);
          for (const value of Object.values(material))
            if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    });
    geometry.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    mesh.removeFromParent();
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
