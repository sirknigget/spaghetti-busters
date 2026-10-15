import { disposeObjectMap } from "./graphics-resources";
import * as THREE from "three";
import type { Simulation, Block } from "./simulation";
import { createCodeMesh, disposeObject } from "./code-mesh";
import { placeCode, lightCode, needsCodeRefresh } from "./world-code-lighting";
import { TUMBLE } from "./world-settings";

interface CodeMotion {
  frozen: boolean;
  reducedMotion: boolean;
  effectsDt: number;
}

export class WorldCode {
  readonly blocks = new Map<number, THREE.Group>();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly reducedMotion: boolean,
  ) {}

  update(sim: Simulation, effectsDt: number) {
    const alive = new Set(sim.world.blocks.map((b) => b.id));

    for (const [id, mesh] of this.blocks) {
      if (!alive.has(id)) {
        disposeObject(mesh);
        this.blocks.delete(id);
      }
    }

    for (const block of sim.world.blocks) {
      const mesh = this.refresh(block);

      animateCode(mesh, block, {
        frozen: sim.player.freezeRemaining > 0,
        reducedMotion: this.reducedMotion,
        effectsDt,
      });
      mesh.userData.frozen = sim.player.freezeRemaining > 0;
      mesh.getObjectByName("frozen-code-outline")!.visible =
        sim.player.freezeRemaining > 0;
      lightCode(mesh, block, sim.player.freezeRemaining > 0);
      animateReactor(mesh, block);
    }
  }

  private refresh(block: Block) {
    let mesh = this.blocks.get(block.id);

    if (mesh && needsCodeRefresh(mesh, block)) {
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

    return mesh;
  }

  install(id: number, fragment: THREE.Group) {
    const stale = this.blocks.get(id);

    if (stale) {
      disposeObject(stale);
    }

    this.blocks.set(id, fragment);
    this.scene.add(fragment);
  }

  reset() {
    disposeObjectMap(this.blocks);
  }
}

function animateCode(mesh: THREE.Group, block: Block, motion: CodeMotion) {
  const { frozen, reducedMotion, effectsDt } = motion;
  const rattle =
    block.angry && !frozen && !reducedMotion
      ? Math.sin(block.age * TUMBLE.rattleFrequency) * TUMBLE.rattleAmplitude
      : 0;

  placeCode(mesh, block);
  mesh.position.x += rattle;
  mesh.position.y +=
    Math.cos(block.age * TUMBLE.rattleYFrequency) *
    Math.abs(rattle) *
    TUMBLE.rattleYScale;
  blendSplitPose(mesh, effectsDt);
}

function blendSplitPose(mesh: THREE.Group, effectsDt: number) {
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
}

function animateReactor(mesh: THREE.Group, block: Block) {
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
