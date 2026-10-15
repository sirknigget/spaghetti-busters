export const HALF = 0.5;
export const FULL_TURN = 2;
export const TAU = Math.PI * FULL_TURN;
export const VIEWPORT = { height: 720 };
export const FLOOR_CONTACT = {
  halfWidth: 2200,
  halfHeight: 10,
  halfDepth: 500,
  centerX: 640,
  centerZ: -100,
  friction: 0.82,
  restitution: 0.22,
};
export const SETTLED = { speed: 0.1, height: 95 };
export const ENTROPY = {
  increment: 0x6d2b79f5,
  firstShift: 15,
  secondShift: 7,
  multiplier: 61,
  finalShift: 14,
  normalizer: 4294967296,
};
export const STEP = {
  maxDelta: 0.25,

  interval: 0.008333333333333333,
  cullHeight: -150,
  crumbleAge: 0.12,
  crumbleSpeed: -95,
  crumbleDeceleration: 70,
  fadeRate: 2,
};
export const CRUMBLE = {
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
export const FLECK = {
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
export const DRAW = {
  fadeRate: 2,
  smokeGrowth: 1.8,
  smokeSpin: 0.2,
  smokeFadeIn: 0.15,
  smokeAlpha: 0.3,
  smokeFadeOut: 0.22,
  sparkStretch: 2.7,
};
export const FLOOR = 42;
export const MAX_BODIES = 92;
export const MAX_FLECKS = 640;
