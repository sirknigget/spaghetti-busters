export const HALF = 0.5;
export const VIEW = {
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
export const LIGHT = {
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
export const MARKER = {
  startY: 114,
  endY: 612,
  spacing: 15,
  x: 23,
};
export const LABEL = {
  width: 256,
  height: 64,
  worldWidth: 128,
  worldHeight: 32,
  y: 130,
};
export const TUMBLE = {
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
export const PICKUP = {
  xFrequency: 2,
  xAmplitude: 0.28,
  yFrequency: 2.6,
  yAmplitude: 0.5,
  zFrequency: 3,
  zAmplitude: 0.13,
};
export const SPECIAL = {
  grenadeX: 4,
  grenadeY: 3,
  tiltX: 0.12,
  tiltY: 0.24,
};
export const HAZARD = {
  xFrequency: 8,
  xAmplitude: 0.045,
  yFrequency: 6,
  yAmplitude: 0.055,
  bank: 0.12,
  trailOffset: 50,
  trailDepth: -3,
};
export const PULSE = {
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
export const PARTICLE = {
  maximum: 100,
  zFrequency: 3,
  zAmplitude: 35,
  zBase: 20,
  spinX: 3,
  spinY: 4,
  fade: 2,
};
export const EXPLOSION = {
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
export const PLAYER = {
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
export const CAMERA_SHAKE = {
  maximum: 3,
  amplitude: 0.35,
  frequencyX: 145,
  frequencyY: 133,
};
export const RENDER_TIMING = {
  maxDelta: 0.25,
};
export const DANGER = {
  threshold: 240,
};
export const WIDTH = 1280;
export const HEIGHT = 720;
