import type * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
import { type RigidBodies } from "#root/src/game/debris/impact/debris-rigid.ts";
import { type FleckParticles } from "#root/src/game/debris/impact/debris-flecks.ts";

export interface RemovedLetter {
  x: number;
  y: number;
  char: string;
  color: string;
}
export interface DebrisImpact {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  seed: number;
  target: "code" | "robot";
  removed?: RemovedLetter[];
}
export interface RigidDebris {
  body: RAPIER.RigidBody;
  mesh: THREE.Group;
  age: number;
  life: number;
  kind: "letter" | "shard" | "robot" | "code";
  lastVelocity: THREE.Vector3;
  crumbled: boolean;
  seed: number;
}
export interface Fleck {
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

export interface RigidSpawn {
  mesh: THREE.Group;
  halfSize: THREE.Vector3;
  velocity: THREE.Vector3;
  random: () => number;
  kind: RigidDebris["kind"];
  life: number;
  hull?: Float32Array;
}
export interface DebrisPosition {
  x: number;
  y: number;
  z: number;
}

export interface DebrisEmitter {
  rigid: RigidBodies;
  particles: FleckParticles;
  impact: (hit: DebrisImpact) => void;
}
