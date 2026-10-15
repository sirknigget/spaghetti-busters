import { randomDebrisSpin } from "#root/src/game/debris/debris-spin.ts";
import { PALETTE } from "#root/src/game/palette.ts";
import * as THREE from "three";
import { debrisRandom } from "#root/src/game/debris/debris-random.ts";
import { CRUMBLE, HALF, FLOOR } from "#root/src/game/debris/debris-settings.ts";
import type {
  RigidDebris,
  DebrisPosition,
  Fleck,
} from "#root/src/game/debris/debris-types.ts";
import type { FleckParticles } from "#root/src/game/debris/impact/debris-flecks.ts";

interface CrumbleSource {
  position: DebrisPosition;
  random: () => number;
  energy: number;
}

/** Secondary chips follow an actual collision impulse. */
export function crumbleCode(
  particles: FleckParticles,
  item: RigidDebris,
  position: DebrisPosition,
) {
  const random = debrisRandom(item.seed);
  const energy = Math.min(
    CRUMBLE.maxEnergy,
    Math.abs(item.lastVelocity.y) * CRUMBLE.energyScale,
  );

  for (let i = 0; i < CRUMBLE.count; i++) {
    particles.add(crumbleFleck(i, { position, random, energy }));
  }
}

function crumbleFleck(i: number, source: CrumbleSource): Fleck {
  const { position, random, energy } = source;
  const kind = i < CRUMBLE.smokeCount ? "smoke" : "shard";
  const size =
    kind === "smoke"
      ? CRUMBLE.smokeSize + random() * CRUMBLE.smokeSizeJitter
      : 1 + random() * CRUMBLE.shardSizeJitter;

  return {
    ...crumbleTrajectory(position, random, energy),
    ...randomDebrisSpin(random, CRUMBLE),
    scale: new THREE.Vector3(size, size * CRUMBLE.heightScale, size * HALF),
    color: new THREE.Color(
      random() < HALF ? PALETTE.debris.dark : PALETTE.debris.light,
    ),
    age: 0,
    life:
      kind === "smoke"
        ? 1 + random()
        : CRUMBLE.life + random() * CRUMBLE.lifeJitter,
    phase: random() * CRUMBLE.rotationSpan,
    kind,
    bounces: 0,
  };
}

function crumbleTrajectory(
  position: DebrisPosition,
  random: () => number,
  energy: number,
) {
  return {
    position: new THREE.Vector3(
      position.x + (random() - HALF) * CRUMBLE.positionJitter,
      Math.max(FLOOR + CRUMBLE.floorOffset, position.y - CRUMBLE.originOffset),
      position.z,
    ),
    velocity: new THREE.Vector3(
      (random() - HALF) * energy,
      CRUMBLE.lift + random() * energy * CRUMBLE.energyLift,
      (random() - HALF) * CRUMBLE.depthSpeed,
    ),
  };
}
