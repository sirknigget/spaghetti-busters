import * as THREE from "three";
import { instantiateModel, loadGeometry } from "./model-assets";
import {
  Simulation,
  TIMEOUT_METRICS,
  type Block,
  type Particle,
  type TimeoutHazard,
} from "./simulation";
import { createCodeMesh, createFragmentMesh, disposeObject } from "./code-mesh";
import { DebrisPhysics } from "./debris-physics";
import {
  createEnvironment,
  createSpecialist,
  createCannon,
  createBullet,
  createSpecial,
  createPickup,
} from "./models3d";
import { createRobot, animateRobot } from "./robot3d";

const HALF = 0.5;
const VIEW = {
  halfWidth: 640,
  halfHeight: 360,
  distance: 1400,
  far: 4000,
  degrees: 180,
  diameter: 2,
  aspectWidth: 16,
  aspectHeight: 9,
  maxPixelRatio: 2,
  fogNear: 1750,
  fogFar: 3300,
};
const LIGHT = {
  muzzleRange: 450,
  explosionRange: 700,
  decay: 2,
  ambient: 2.4,
  sun: 3.1,
  sunX: 150,
  sunY: 1000,
  sunZ: 750,
  targetX: 680,
  targetY: 300,
  targetZ: -80,
  shadowSize: 2048,
  rim: 1.15,
  rimX: 1400,
  rimY: 400,
  rimZ: 300,
  initialMuzzleX: 175,
  initialMuzzleY: 360,
  initialMuzzleZ: 90,
};
const MARKER = {
  startY: 114,
  endY: 612,
  spacing: 15,
  x: 23,
};
const LABEL = {
  width: 256,
  height: 64,
  worldWidth: 128,
  worldHeight: 32,
  y: 130,
};
const TUMBLE = {
  bossFragment: 0.13,
  boss: 0.065,
  fragment: 0.45,
  root: 0.18,
  idPhase: 0.81,
  fragmentSpeed: 1.65,
  rootSpeed: 0.65,
  yFrequency: 0.83,
  rattleFrequency: 47,
  rattleAmplitude: 2,
  rattleYFrequency: 39,
  rattleYScale: 0.45,
  blendRate: 12,
  blendCutoff: 0.005,
  reactorSpeed: 2,
  coreBase: 0.6,
  coreFrequency: 5,
  coreAmplitude: 0.4,
  frozenGlow: 0.42,
  normalGlow: 0.3,
};
const PICKUP = {
  xFrequency: 2,
  xAmplitude: 0.28,
  yFrequency: 2.6,
  yAmplitude: 0.5,
  zFrequency: 3,
  zAmplitude: 0.13,
};
const SPECIAL = {
  grenadeX: 4,
  grenadeY: 3,
  tiltX: 0.12,
  tiltY: 0.24,
};
const HAZARD = {
  xFrequency: 8,
  xAmplitude: 0.045,
  yFrequency: 6,
  yAmplitude: 0.055,
  bank: 0.12,
  trailOffset: 50,
  trailDepth: -3,
};
const PULSE = {
  reviewDuration: 0.65,
  lintDuration: 0.8,
  minimumRadius: 30,
  radiusGrowth: 1100,
  ringSpacing: 24,
  opacity: 0.85,
  beamCutoff: 0.35,
  beamX: 170,
  beamZ: 35,
  beamTargetZ: 40,
  beamAlpha: 0.7,
  beamFade: 3,
};
const PARTICLE = {
  maximum: 100,
  zFrequency: 3,
  zAmplitude: 35,
  zBase: 20,
  spinX: 3,
  spinY: 4,
  fade: 2,
};
const EXPLOSION = {
  radiusBase: 0.35,
  radiusGrowth: 0.65,
  z: 25,
  rotationX: 0.3,
  rotationY: 0.5,
  impactThreshold: 2,
  impactLight: 18000,
  light: 120000,
  lightZ: 90,
};
const PLAYER = {
  minimumAimDistance: 80,
  aimOrigin: 158,
  x: 82,
  swayFrequency: 1.5,
  swayAmplitude: 0.08,
  cannonX: 103,
  recoil: 4,
  cannonZ: 24,
  cannonTilt: -0.1,
  muzzleRadius: 88,
  muzzleZ: 70,
  muzzleLight: 95000,
  stunX: 86,
  stunZ: 45,
  stunRings: 3,
  stunSpeed: 2,
};
const CAMERA_SHAKE = {
  maximum: 3,
  amplitude: 0.35,
  frequencyX: 145,
  frequencyY: 133,
};
const RENDER_TIMING = {
  maxDelta: 0.25,
};
const DANGER = {
  threshold: 240,
};
const WIDTH = 1280;
const HEIGHT = 720;
type Entity = { id: number; x: number; y: number };
export class WorldRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(
    (VIEW.diameter *
      Math.atan(VIEW.halfHeight / VIEW.distance) *
      VIEW.degrees) /
      Math.PI,
    VIEW.aspectWidth / VIEW.aspectHeight,
    1,
    VIEW.far,
  );
  readonly blocks = new Map<number, THREE.Group>();
  readonly robotMeshes = new Map<number, THREE.Group>();
  debris!: DebrisPhysics;
  private lastEffectsTime = 0;
  private readonly specialist = createSpecialist();
  private readonly cannon = createCannon();
  private readonly bulletMeshes = new Map<number, THREE.Group>();
  private readonly pickupMeshes = new Map<number, THREE.Group>();
  private readonly specialMeshes = new Map<number, THREE.Group>();
  private readonly hazardMeshes = new Map<number, THREE.Group>();
  private readonly particleMeshes = new Map<Particle, THREE.Mesh>();
  private readonly letterTextures = new Map<string, THREE.CanvasTexture>();
  private readonly explosionMeshes: THREE.Mesh[] = [];
  private readonly muzzleLight = new THREE.PointLight(
    "#ffdc85",
    0,
    LIGHT.muzzleRange,
    LIGHT.decay,
  );
  private readonly explosionLight = new THREE.PointLight(
    "#ffc777",
    0,
    LIGHT.explosionRange,
    LIGHT.decay,
  );
  private readonly reticle = instantiateModel("reticle");
  private readonly stun = instantiateModel("stun-rings");
  private readonly reviewEffect = instantiateModel("review-effect");
  private readonly lintEffect = instantiateModel("lint-effect");
  private readonly reviewBeam = new THREE.Mesh(
    loadGeometry("review-beam"),
    new THREE.MeshBasicMaterial({
      color: "#c0f3ff",
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  private readonly stunLabel: THREE.Sprite;
  private readonly dangerMaterial = new THREE.MeshBasicMaterial({
    color: "#8faf76",
  });
  private readonly reducedMotion = matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, VIEW.maxPixelRatio),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.setAttribute(
      "aria-label",
      "3D arcade playfield. Move to aim, left click or Space to shoot. Right click launches special weapons. Select with 1 for homing, 2 for grenades, 3 for code review, or 4 for lint bombs.",
    );
    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.renderer.domElement.dispatchEvent(new Event("game-context-lost"));
    });
    parent.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color("#b8d3c2");
    this.scene.fog = new THREE.Fog("#c2d9c8", VIEW.fogNear, VIEW.fogFar);
    this.camera.position.set(VIEW.halfWidth, VIEW.halfHeight, VIEW.distance);
    this.camera.lookAt(VIEW.halfWidth, VIEW.halfHeight, 0);
    this.scene.add(
      new THREE.HemisphereLight("#e4f7ff", "#586d55", LIGHT.ambient),
    );
    const sunlight = new THREE.DirectionalLight("#fff0c1", LIGHT.sun);
    sunlight.position.set(LIGHT.sunX, LIGHT.sunY, LIGHT.sunZ);
    sunlight.target.position.set(LIGHT.targetX, LIGHT.targetY, LIGHT.targetZ);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(LIGHT.shadowSize, LIGHT.shadowSize);
    sunlight.shadow.camera.left = -1000;
    sunlight.shadow.camera.right = 1000;
    sunlight.shadow.camera.top = 750;
    sunlight.shadow.camera.bottom = -750;
    sunlight.shadow.camera.near = 10;
    sunlight.shadow.camera.far = 2500;
    sunlight.shadow.normalBias = 0.8;
    sunlight.shadow.bias = -0.0002;
    this.scene.add(sunlight, sunlight.target);
    const rim = new THREE.DirectionalLight("#93cfff", LIGHT.rim);
    rim.position.set(LIGHT.rimX, LIGHT.rimY, LIGHT.rimZ);
    this.scene.add(rim);
    this.scene.add(
      createEnvironment(),
      this.specialist,
      this.cannon,
      this.muzzleLight,
      this.explosionLight,
    );
    this.muzzleLight.position.set(
      LIGHT.initialMuzzleX,
      LIGHT.initialMuzzleY,
      LIGHT.initialMuzzleZ,
    );
    for (let y = MARKER.startY; y < MARKER.endY; y += MARKER.spacing) {
      const marker = new THREE.Mesh(
        loadGeometry("danger-marker"),
        this.dangerMaterial,
      );
      marker.position.set(MARKER.x, HEIGHT - y, 0);
      this.scene.add(marker);
    }
    this.reticle.renderOrder = 100;
    this.reticle.traverse((child) => (child.renderOrder = 100));
    this.scene.add(this.reticle);
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    this.stunLabel = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelTexture, depthTest: false }),
    );
    this.stunLabel.scale.set(LABEL.worldWidth, LABEL.worldHeight, 1);
    this.stunLabel.position.set(0, LABEL.y, 0);
    this.stun.add(this.stunLabel);
    this.scene.add(this.stun);
    for (const effect of [this.reviewEffect, this.lintEffect]) {
      effect.visible = false;
      this.scene.add(effect);
    }
    this.reviewEffect.name = "code-review-freeze-wave";
    this.lintEffect.name = "lint-bomb-screen-wave";
    this.reviewBeam.name = "code-review-freeze-beam";
    this.reviewBeam.visible = false;
    this.scene.add(this.reviewBeam);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
  }

  resize() {
    const available = this.parent.getBoundingClientRect();
    const width = Math.max(
      1,
      Math.min(
        available.width || WIDTH,
        ((available.height || HEIGHT) * VIEW.aspectWidth) / VIEW.aspectHeight,
      ),
    );
    this.renderer.setSize(
      width,
      (width * VIEW.aspectHeight) / VIEW.aspectWidth,
    );
    this.renderer.domElement.style.margin = "auto";
  }

  async initialize() {
    this.debris = await DebrisPhysics.create(this.scene);
  }

  private codeTumble(block: Block) {
    if (block.boss) {
      return block.generation > 0 ? TUMBLE.bossFragment : TUMBLE.boss;
    }

    return block.generation > 0 ? TUMBLE.fragment : TUMBLE.root;
  }

  private placeCode(mesh: THREE.Group, block: Block) {
    const tumble = this.codeTumble(block);
    const phase =
      block.id * TUMBLE.idPhase +
      block.age *
        (block.generation > 0 ? TUMBLE.fragmentSpeed : TUMBLE.rootSpeed);
    mesh.position.set(block.x, HEIGHT - block.y, 0);
    mesh.rotation.set(
      Math.sin(phase) * tumble,
      Math.cos(phase * TUMBLE.yFrequency) * tumble,
      -block.angle,
      "ZYX",
    );
  }

  private visualEvents(sim: Simulation) {
    const events = sim.visualEvents.splice(0);
    const dying = new Set(
      events
        .filter((event) => event.type === "code-death")
        .map((event) => event.block.id),
    );
    for (const event of events) {
      if (event.type === "impact") {
        this.debris.impact(
          event.target === "code" && dying.has(event.blockId!)
            ? { ...event, removed: [] }
            : event,
        );
      } else if (event.type === "code-death") {
        const cached = this.blocks.get(event.block.id);
        const mesh = cached ?? createCodeMesh(event.block);
        if (!cached) {
          this.placeCode(mesh, event.block);
        }
        this.debris.dismantleCode(mesh, event.block, event.seed, {
          ...event,
          target: "code",
        });
        if (!cached) {
          disposeObject(mesh);
        }
      } else if (event.type === "robot-death") {
        let robot = this.robotMeshes.get(event.robot.id);
        if (!robot) {
          robot = createRobot(event.robot.brand);
          robot.position.set(event.robot.x, HEIGHT - event.robot.y, 0);
          animateRobot(robot, event.robot, false);
        }
        this.debris.dismantleRobot(robot, event.robot, event.seed);
        if (!this.robotMeshes.has(event.robot.id)) {
          disposeObject(robot);
        }
      } else if (event.type === "split") {
        const old = this.blocks.get(event.parent.id);
        // Rebuild the damaged parent first so fractures retain its new holes and surface.
        const parent = createCodeMesh(event.parent, old);
        if (old) {
          parent.position.copy(old.position);
          parent.quaternion.copy(old.quaternion);
        } else {
          this.placeCode(parent, event.parent);
        }
        parent.updateMatrixWorld(true);
        for (const child of event.children) {
          const fragment = createFragmentMesh(child, parent, event.parent);
          const offset = child.fracture!;
          const origin = new THREE.Vector3(offset.offsetX, -offset.offsetY, 0)
            .applyQuaternion(parent.quaternion)
            .add(parent.position);
          fragment.position.copy(origin);
          fragment.quaternion.copy(parent.quaternion);
          fragment.userData.splitPose = {
            offset: origin
              .clone()
              .sub(new THREE.Vector3(child.x, HEIGHT - child.y, 0)),
            quaternion: parent.quaternion.clone(),
            age: 0,
          };
          this.installBlock(child.id, fragment);
        }
        disposeObject(parent);
      }
    }
  }

  private installBlock(id: number, fragment: THREE.Group) {
    const stale = this.blocks.get(id);
    if (stale) {
      disposeObject(stale);
    }
    this.blocks.set(id, fragment);
    this.scene.add(fragment);
  }

  private needsCodeRefresh(mesh: THREE.Group, block: Block) {
    const damaged =
      mesh.userData.hits !== block.hits ||
      mesh.userData.cellCount !== block.cells.length;
    const dispositionChanged =
      mesh.userData.angry !== block.angry ||
      mesh.userData.exception !== block.exception;

    return damaged || dispositionChanged || mesh.userData.boss !== block.boss;
  }

  private lightCode(mesh: THREE.Group, block: Block, frozen: boolean) {
    const solid = mesh.getObjectByName("perforated-extruded-code");
    if (!(solid instanceof THREE.Mesh) || !Array.isArray(solid.material)) {
      return;
    }
    for (const [index, material] of solid.material.entries()) {
      if (!(material instanceof THREE.MeshToonMaterial)) {
        continue;
      }
      let color = "#000000";
      if (block.angry && index === 1) {
        color = "#6a0f22";
      }
      if (block.boss && index === 1) {
        color = "#7c2314";
      }
      if (frozen) {
        color = "#286b97";
      }
      material.emissive.set(color);
      material.emissiveIntensity = frozen
        ? TUMBLE.frozenGlow
        : TUMBLE.normalGlow;
    }
  }

  private sync<T extends Entity>(
    entities: T[],
    cache: Map<number, THREE.Group>,
    create: (entity: T) => THREE.Group,
    update: (mesh: THREE.Group, entity: T) => void,
  ) {
    const alive = new Set(entities.map((e) => e.id));
    for (const [id, mesh] of cache) {
      if (!alive.has(id)) {
        disposeObject(mesh);
        cache.delete(id);
      }
    }
    for (const entity of entities) {
      let mesh = cache.get(entity.id);
      if (!mesh) {
        mesh = create(entity);
        cache.set(entity.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(entity.x, HEIGHT - entity.y, 0);
      update(mesh, entity);
    }
  }

  private hazard(hazard: TimeoutHazard) {
    const text = `await setTimeout(${hazard.durationMs});`;
    const { fontSize, charWidth, widthPadding, height, depth } =
      TIMEOUT_METRICS;
    const width = text.length * charWidth + widthPadding;
    const canvas = document.createElement("canvas");
    // Authored canvas typography uses pixel coordinates and supersampling.
    // oxlint-disable eslint/no-magic-numbers
    canvas.width = width * 3;
    canvas.height = height * 3;
    const c = canvas.getContext("2d")!;
    c.scale(3, 3);
    c.fillStyle = "#442336";
    c.fillRect(0, 0, width, height);
    c.strokeStyle = "#ffc58b";
    c.lineWidth = 2.5;
    c.strokeRect(1.25, 1.25, width - 2.5, height - 2.5);
    c.fillStyle = "#9e5670";
    c.fillRect(3, 3, 4, height - 6);
    c.font = `bold ${fontSize}px monospace`;
    c.textBaseline = "middle";
    let x = (width - text.length * charWidth) / 2;
    for (const [word, color] of [
      ["await ", "#e5baff"],
      ["setTimeout", "#fff7ce"],
      ["(", "#ffcfb0"],
      [String(hazard.durationMs), "#ffbd80"],
      [");", "#ffcfb0"],
    ]) {
      c.fillStyle = color;
      c.fillText(word!, x, height / 2);
      x += word!.length * charWidth;
    }
    // oxlint-enable eslint/no-magic-numbers
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.MeshToonMaterial({ map: texture });
    const side = new THREE.MeshToonMaterial({ color: "#df7456" });
    const group = new THREE.Group();
    group.name = "timeout-solid";
    group.userData.width = width;
    group.userData.height = height;
    group.userData.fontSize = fontSize;
    const mesh = new THREE.Mesh(
      loadGeometry("hazard-panel").scale(width, height, depth),
      [side, side, side, side, face, side],
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const trail = new THREE.Mesh(
      loadGeometry("hazard-trail"),
      new THREE.MeshBasicMaterial({
        color: "#ff9975",
        transparent: true,
        opacity: 0.32,
      }),
    );
    trail.rotation.z = -Math.PI * HALF;
    trail.position.set(width * HALF + HAZARD.trailOffset, 0, HAZARD.trailDepth);
    group.add(trail);

    return group;
  }

  private particle(particle: Particle) {
    if (particle.char) {
      const key = `${particle.char}:${particle.color}`;
      let texture = this.letterTextures.get(key);
      if (!texture) {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 40;
        const c = canvas.getContext("2d")!;
        c.font = "bold 27px monospace";
        c.fillStyle = particle.color;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(particle.char, canvas.width * HALF, canvas.height * HALF);
        texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        this.letterTextures.set(key, texture);
      }

      return new THREE.Mesh(
        loadGeometry("particle-letter"),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
    }
    const mesh = new THREE.Mesh(
      loadGeometry("particle-chip"),
      new THREE.MeshToonMaterial({ color: particle.color, transparent: true }),
    );
    mesh.castShadow = true;

    return mesh;
  }

  render(sim: Simulation, muzzle: number, impact: number) {
    const t = sim.elapsed;
    const effectsDt = Math.max(
      0,
      Math.min(RENDER_TIMING.maxDelta, t - this.lastEffectsTime),
    );
    this.lastEffectsTime = t;
    this.visualEvents(sim);
    this.debris.update(effectsDt);
    const alive = new Set(sim.blocks.map((b) => b.id));
    for (const [id, mesh] of this.blocks) {
      if (!alive.has(id)) {
        disposeObject(mesh);
        this.blocks.delete(id);
      }
    }
    for (const block of sim.blocks) {
      let mesh = this.blocks.get(block.id);
      if (mesh && this.needsCodeRefresh(mesh, block)) {
        const replacement = createCodeMesh(block, mesh);
        replacement.userData.splitPose = mesh.userData.splitPose;
        disposeObject(mesh);
        mesh = replacement;
        this.blocks.set(block.id, mesh);
        this.scene.add(mesh);
      }
      if (!mesh) {
        mesh = createCodeMesh(block);
        this.blocks.set(block.id, mesh);
        this.scene.add(mesh);
      }
      const tumble = this.codeTumble(block);
      const phase =
        block.id * TUMBLE.idPhase +
        block.age *
          (block.generation > 0 ? TUMBLE.fragmentSpeed : TUMBLE.rootSpeed);
      const rattle =
        block.angry && sim.freezeRemaining <= 0 && !this.reducedMotion
          ? Math.sin(block.age * TUMBLE.rattleFrequency) *
            TUMBLE.rattleAmplitude
          : 0;
      mesh.position.set(
        block.x + rattle,
        HEIGHT -
          block.y +
          Math.cos(block.age * TUMBLE.rattleYFrequency) *
            Math.abs(rattle) *
            TUMBLE.rattleYScale,
        0,
      );
      mesh.rotation.set(
        Math.sin(phase) * tumble,
        Math.cos(phase * TUMBLE.yFrequency) * tumble,
        -block.angle,
        "ZYX",
      );
      const splitPose = mesh.userData.splitPose;
      if (splitPose) {
        splitPose.age += effectsDt;
        const blend = Math.exp(-splitPose.age * TUMBLE.blendRate);
        mesh.position.addScaledVector(splitPose.offset, blend);
        mesh.quaternion.slerp(splitPose.quaternion, blend);
        if (blend < TUMBLE.blendCutoff) {
          delete mesh.userData.splitPose;
        }
      }
      mesh.userData.frozen = sim.freezeRemaining > 0;
      mesh.getObjectByName("frozen-code-outline")!.visible =
        sim.freezeRemaining > 0;
      this.lightCode(mesh, block, sim.freezeRemaining > 0);
      const reactor = mesh.getObjectByName("factory-boss-reactor");
      if (reactor) {
        reactor.rotation.z = block.age * TUMBLE.reactorSpeed;
      }
      const core = mesh.getObjectByName("factory-boss-core");
      if (
        core instanceof THREE.Mesh &&
        core.material instanceof THREE.MeshStandardMaterial
      ) {
        core.material.emissiveIntensity =
          TUMBLE.coreBase +
          Math.sin(block.age * TUMBLE.coreFrequency) * TUMBLE.coreAmplitude;
      }
    }
    this.sync(
      sim.robots,
      this.robotMeshes,
      (r) => createRobot(r.brand),
      (mesh, r) => animateRobot(mesh, r, sim.freezeRemaining > 0),
    );
    this.sync(
      sim.bullets,
      this.bulletMeshes,
      () => createBullet(),
      (mesh, b) => {
        mesh.rotation.z = -Math.atan2(b.vy, b.vx);
      },
    );
    this.sync(
      sim.pickups,
      this.pickupMeshes,
      (p) => createPickup(p.type),
      (mesh, p) => {
        mesh.rotation.set(
          Math.sin(p.age * PICKUP.xFrequency) * PICKUP.xAmplitude,
          Math.sin(p.age * PICKUP.yFrequency) * PICKUP.yAmplitude,
          Math.sin(p.age * PICKUP.zFrequency) * PICKUP.zAmplitude,
        );
      },
    );
    this.sync(
      sim.specials,
      this.specialMeshes,
      (p) => createSpecial(p.type),
      (mesh, p) => {
        mesh.rotation.set(
          p.type === "grenade" ? t * SPECIAL.grenadeX : SPECIAL.tiltX,
          p.type === "grenade" ? t * SPECIAL.grenadeY : SPECIAL.tiltY,
          -p.angle,
        );
      },
    );
    this.sync(
      sim.hazards,
      this.hazardMeshes,
      (h) => this.hazard(h),
      (mesh, h) => {
        mesh.rotation.set(
          Math.sin(h.age * HAZARD.xFrequency) * HAZARD.xAmplitude,
          Math.sin(h.age * HAZARD.yFrequency) * HAZARD.yAmplitude,
          Math.atan2(h.vy, -h.vx) * HAZARD.bank,
        );
      },
    );
    for (const [effect, remaining, duration] of [
      [this.reviewEffect, sim.reviewPulse, PULSE.reviewDuration],
      [this.lintEffect, sim.lintPulse, PULSE.lintDuration],
    ] as const) {
      effect.visible = remaining > 0;
      if (remaining <= 0) {
        continue;
      }
      {
        const progress = 1 - remaining / duration;
        for (const [index, child] of effect.children.entries()) {
          if (
            !(child instanceof THREE.Mesh) ||
            !(child.material instanceof THREE.MeshBasicMaterial)
          ) {
            continue;
          }
          const ring = child;
          ring.scale.setScalar(
            PULSE.minimumRadius +
              progress * PULSE.radiusGrowth -
              index * PULSE.ringSpacing,
          );
          ring.material.opacity = (1 - progress) * PULSE.opacity;
        }
      }
    }
    this.reviewBeam.visible = sim.reviewPulse > PULSE.beamCutoff;
    if (this.reviewBeam.visible) {
      const a = new THREE.Vector3(
        PULSE.beamX,
        HEIGHT - sim.playerY,
        PULSE.beamZ,
      );
      const b = new THREE.Vector3(
        sim.aimX,
        HEIGHT - sim.aimY,
        PULSE.beamTargetZ,
      );
      const direction = b.clone().sub(a);
      this.reviewBeam.position.copy(a.add(b).multiplyScalar(HALF));
      this.reviewBeam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      );
      this.reviewBeam.scale.y = direction.length();
      this.reviewBeam.material.opacity = Math.min(
        PULSE.beamAlpha,
        (sim.reviewPulse - PULSE.beamCutoff) * PULSE.beamFade,
      );
    }
    // Detached letters now belong to the independent 3D debris world.
    const particles = sim.particles
      .filter((p) => !p.char)
      .slice(-PARTICLE.maximum);
    const livingParticles = new Set(particles);
    for (const [particle, mesh] of this.particleMeshes) {
      if (!livingParticles.has(particle)) {
        mesh.geometry.dispose();
        if (!Array.isArray(mesh.material)) {
          mesh.material.dispose();
        }
        mesh.removeFromParent();
        this.particleMeshes.delete(particle);
      }
    }
    for (const particle of particles) {
      let mesh = this.particleMeshes.get(particle);
      if (!mesh) {
        mesh = this.particle(particle);
        this.particleMeshes.set(particle, mesh);
        this.scene.add(mesh);
      }
      const age = particle.maxLife - particle.life;
      mesh.position.set(
        particle.x,
        HEIGHT - particle.y,
        Math.sin(age * PARTICLE.zFrequency) * PARTICLE.zAmplitude +
          PARTICLE.zBase,
      );
      mesh.rotation.set(
        age * PARTICLE.spinX,
        age * PARTICLE.spinY,
        particle.angle,
      );
      if (!Array.isArray(mesh.material)) {
        mesh.material.opacity = Math.min(
          1,
          (particle.life / particle.maxLife) * PARTICLE.fade,
        );
      }
    }
    while (this.explosionMeshes.length < sim.explosions.length) {
      const mesh = new THREE.Mesh(
        loadGeometry("explosion-ring"),
        new THREE.MeshBasicMaterial({
          color: "#ffe8a4",
          transparent: true,
          depthWrite: false,
        }),
      );
      this.explosionMeshes.push(mesh);
      this.scene.add(mesh);
    }
    for (const [i, mesh] of this.explosionMeshes.entries()) {
      const explosion = sim.explosions[i];
      mesh.visible = !!explosion;
      if (!explosion) {
        continue;
      }
      const progress = 1 - explosion.life / explosion.maxLife;
      const radius =
        explosion.radius *
        (EXPLOSION.radiusBase + progress * EXPLOSION.radiusGrowth);
      mesh.position.set(explosion.x, HEIGHT - explosion.y, EXPLOSION.z);
      mesh.rotation.set(
        progress * EXPLOSION.rotationX,
        progress * EXPLOSION.rotationY,
        0,
      );
      mesh.scale.setScalar(radius);
      if (!Array.isArray(mesh.material)) {
        mesh.material.opacity = 1 - progress;
      }
    }
    const angle = -Math.atan2(
      sim.aimY - sim.playerY,
      Math.max(PLAYER.minimumAimDistance, sim.aimX - PLAYER.aimOrigin),
    );
    this.specialist.position.set(PLAYER.x, HEIGHT - sim.playerY, 0);
    this.specialist.rotation.y =
      Math.sin(t * PLAYER.swayFrequency) * PLAYER.swayAmplitude;
    this.cannon.position.set(
      PLAYER.cannonX - (muzzle > 0 ? PLAYER.recoil : 0),
      HEIGHT - sim.playerY,
      PLAYER.cannonZ,
    );
    this.cannon.rotation.set(0, PLAYER.cannonTilt, angle);
    this.muzzleLight.position.set(
      PLAYER.cannonX + Math.cos(angle) * PLAYER.muzzleRadius,
      HEIGHT - sim.playerY + Math.sin(angle) * PLAYER.muzzleRadius,
      PLAYER.muzzleZ,
    );
    this.muzzleLight.intensity = muzzle > 0 ? PLAYER.muzzleLight : 0;
    const flash = this.cannon.getObjectByName("muzzle-flash");
    if (flash) {
      flash.visible = muzzle > 0;
    }
    const blast = sim.explosions[0];
    const impactIntensity =
      impact > EXPLOSION.impactThreshold ? EXPLOSION.impactLight : 0;
    this.explosionLight.intensity = blast
      ? (EXPLOSION.light * blast.life) / blast.maxLife
      : impactIntensity;
    if (blast) {
      this.explosionLight.position.set(
        blast.x,
        HEIGHT - blast.y,
        EXPLOSION.lightZ,
      );
    }
    this.reticle.position.set(sim.aimX, HEIGHT - sim.aimY, 0);
    this.stun.visible = sim.isStunned;
    this.stun.position.set(PLAYER.stunX, HEIGHT - sim.playerY, PLAYER.stunZ);
    if (sim.isStunned) {
      for (let i = 0; i < PLAYER.stunRings; i++) {
        this.stun.children[i]!.rotation.z =
          t * (i % VIEW.diameter ? -PLAYER.stunSpeed : PLAYER.stunSpeed);
      }
      // SAFETY: the constructor creates this sprite texture from a label canvas.
      const canvas = this.stunLabel.material.map!.image as HTMLCanvasElement;
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, LABEL.width, LABEL.height);
      c.fillStyle = "#56286e";
      c.fillRect(0, 0, LABEL.width, LABEL.height);
      c.fillStyle = "#ffe0ff";
      c.font = "bold 25px monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(
        `AWAIT ${sim.stunRemaining.toFixed(1)}s`,
        LABEL.width * HALF,
        LABEL.height * HALF,
      );
      this.stunLabel.material.map!.needsUpdate = true;
    }
    this.dangerMaterial.color.set(
      sim.blocks.some((b) => b.x < DANGER.threshold) ? "#de6a47" : "#8faf76",
    );
    const shake = this.reducedMotion
      ? 0
      : Math.min(impact, CAMERA_SHAKE.maximum) * CAMERA_SHAKE.amplitude;
    this.camera.position.set(
      VIEW.halfWidth + Math.sin(t * CAMERA_SHAKE.frequencyX) * shake,
      VIEW.halfHeight + Math.cos(t * CAMERA_SHAKE.frequencyY) * shake,
      VIEW.distance,
    );
    this.renderer.render(this.scene, this.camera);
  }

  reset() {
    this.debris?.reset();
    this.lastEffectsTime = 0;
    for (const cache of [
      this.blocks,
      this.robotMeshes,
      this.bulletMeshes,
      this.pickupMeshes,
      this.specialMeshes,
      this.hazardMeshes,
    ]) {
      for (const entry of cache.values()) {
        disposeObject(entry);
      }
      cache.clear();
    }
    for (const mesh of this.particleMeshes.values()) {
      mesh.geometry.dispose();
      if (!Array.isArray(mesh.material)) {
        mesh.material.dispose();
      }
      mesh.removeFromParent();
    }
    this.particleMeshes.clear();
    for (const mesh of this.explosionMeshes) {
      mesh.visible = false;
    }
    this.muzzleLight.intensity = this.explosionLight.intensity = 0;
    this.reviewEffect.visible =
      this.lintEffect.visible =
      this.reviewBeam.visible =
        false;
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.reset();
    this.debris?.dispose();
    for (const texture of this.letterTextures.values()) {
      texture.dispose();
    }
    this.letterTextures.clear();
    disposeObject(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
