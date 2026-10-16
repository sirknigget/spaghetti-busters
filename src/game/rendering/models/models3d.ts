import type * as THREE from "three";
import { instantiateModel } from "#root/src/game/graphics/model-assets.ts";

type SpecialType = "homing" | "grenade" | "review" | "lint";
type PickupType = "double" | "triple" | "quad" | "quint" | SpecialType;

/** Authored glTF geometry, with an independent set of resources per instance. */
export function createSpecialist(): THREE.Group {
  return instantiateModel("specialist");
}

export function createCannon(): THREE.Group {
  return instantiateModel("cannon");
}

export function createSpecial(type: SpecialType): THREE.Group {
  return instantiateModel(type);
}

export function createPickup(type: PickupType): THREE.Group {
  if (type === "review" || type === "lint") {
    return instantiateModel(type);
  }

  return instantiateModel(`pickup-${type}`);
}

export function createBullet(): THREE.Group {
  return instantiateModel("bullet");
}

export function createEnvironment(): THREE.Group {
  return instantiateModel("environment");
}
