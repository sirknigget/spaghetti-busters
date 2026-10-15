import * as THREE from "three";
import type {
  Simulation,
  Block,
} from "#root/src/game/simulation/simulation.ts";
import {
  createCodeMesh,
  createFragmentMesh,
  disposeObject,
} from "#root/src/game/code/code-mesh.ts";
import {
  createRobot,
  animateRobot,
} from "#root/src/game/rendering/robots/robot3d.ts";
import type { DebrisPhysics } from "#root/src/game/debris/debris-physics.ts";
import type { WorldCode } from "#root/src/game/rendering/code/world-code.ts";
import { placeCode } from "#root/src/game/rendering/code/world-code-lighting.ts";
import { HEIGHT } from "#root/src/game/rendering/world-settings.ts";

type VisualEvent = Simulation["world"]["visualEvents"][number];
type CodeDeath = Extract<VisualEvent, { type: "code-death" }>;
type RobotDeath = Extract<VisualEvent, { type: "robot-death" }>;
type Split = Extract<VisualEvent, { type: "split" }>;
type Impact = Extract<VisualEvent, { type: "impact" }>;
interface EventTargets {
  code: WorldCode;
  robots: Map<number, THREE.Group>;
  debris: DebrisPhysics;
}

export class WorldVisualEvents {
  private readonly code: WorldCode;
  private readonly robotMeshes: Map<number, THREE.Group>;
  private readonly debris: DebrisPhysics;

  constructor(targets: EventTargets) {
    this.code = targets.code;
    this.robotMeshes = targets.robots;
    this.debris = targets.debris;
  }

  process(sim: Simulation) {
    const events = sim.world.visualEvents.splice(0);
    const dying = new Set(
      events
        .filter((event) => event.type === "code-death")
        .map((event) => event.block.id),
    );

    for (const event of events) {
      this.processEvent(event, dying);
    }
  }

  private processEvent(event: VisualEvent, dying: Set<number>) {
    if (event.type === "impact") {
      this.impact(event, dying);
    } else if (event.type === "code-death") {
      this.codeDeath(event);
    } else if (event.type === "robot-death") {
      this.robotDeath(event);
    } else if (event.type === "split") {
      this.split(event);
    }
  }

  private impact(event: Impact, dying: Set<number>) {
    this.debris.impact(
      event.target === "code" && dying.has(event.blockId!)
        ? { ...event, removed: [] }
        : event,
    );
  }

  private codeDeath(event: CodeDeath) {
    const cached = this.code.blocks.get(event.block.id);
    const mesh = cached ?? createCodeMesh(event.block);

    if (!cached) {
      placeCode(mesh, event.block);
    }

    this.debris.dismantleCode(mesh, {
      block: event.block,
      seed: event.seed,
      hit: { ...event, target: "code" },
    });
    if (!cached) {
      disposeObject(mesh);
    }
  }

  private robotDeath(event: RobotDeath) {
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
  }

  private split(event: Split) {
    const old = this.code.blocks.get(event.parent.id);
    // Rebuild the damaged parent first so fractures retain its new holes and surface.
    const parent = createCodeMesh(event.parent, old);

    if (old) {
      parent.position.copy(old.position);
      parent.quaternion.copy(old.quaternion);
    } else {
      placeCode(parent, event.parent);
    }

    parent.updateMatrixWorld(true);
    for (const child of event.children) {
      const fragment = splitChild(child, parent, event.parent);

      this.code.install(child.id, fragment);
    }

    disposeObject(parent);
  }
}

function splitChild(child: Block, parent: THREE.Group, parentBlock: Block) {
  const fragment = createFragmentMesh(child, parent, parentBlock);
  const offset = child.fracture!;
  const origin = new THREE.Vector3(offset.offsetX, -offset.offsetY, 0)
    .applyQuaternion(parent.quaternion)
    .add(parent.position);

  fragment.position.copy(origin);
  fragment.quaternion.copy(parent.quaternion);
  fragment.userData.splitPose = {
    offset: origin.clone().sub(new THREE.Vector3(child.x, HEIGHT - child.y, 0)),
    quaternion: parent.quaternion.clone(),
    age: 0,
  };

  return fragment;
}
