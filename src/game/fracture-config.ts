import settings from "./fracture-config.json";

export const VECTOR_COMPONENTS = 3;
export const UV_COMPONENTS = 2;
export const PAIR_SIZE = 2;
export const HALF_DIVISOR = 2;
export const COORDINATE = settings.COORDINATE;
export const QUAD = settings.QUAD;
export const TRIANGLE_FAN = [
  QUAD.first,
  QUAD.second,
  QUAD.third,
  QUAD.first,
  QUAD.third,
  QUAD.fourth,
];
export const FRACTURE = settings.FRACTURE;
export const CHIP = { ...settings.CHIP, revolution: Math.PI * PAIR_SIZE };
