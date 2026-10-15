export const VECTOR_COMPONENTS = 3;
export const UV_COMPONENTS = 2;
export const PAIR_SIZE = 2;
export const HALF_DIVISOR = 2;
export const COORDINATE = { x: 0, y: 1, z: 2 };
export const QUAD = { first: 0, second: 1, third: 2, fourth: 3 };
export const TRIANGLE_FAN = [
  QUAD.first,
  QUAD.second,
  QUAD.third,
  QUAD.first,
  QUAD.third,
  QUAD.fourth,
];
export const FRACTURE = {
  edgeEpsilon: 0.0001,
  gapEpsilon: 0.001,
  crossingEpsilon: 0.000001,
  hashMultiplier: 0x45d9f3b,
  hashShift: 16,
  maxHash: 4294967295,
  minSegments: 3,
  segmentLength: 15,
  noiseCenter: 0.5,
  noiseAmplitude: 12,
  textureHeaderHeight: 26,
};
export const CHIP = {
  vertices: 10,
  revolution: Math.PI * PAIR_SIZE,
  minSpread: 0.76,
  spreadRange: 0.36,
  baseRadiusX: 5.7,
  radiusXSeed: 20,
  radiusXRange: 1.3,
  baseRadiusY: 9.8,
  radiusYSeed: 21,
  radiusYRange: 1.4,
};
