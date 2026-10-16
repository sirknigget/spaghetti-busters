import {
  CHIP,
  FRACTURE,
} from "#root/src/game/geometry/fracture/fracture-config.ts";
import type {
  Polygon,
  MaskOptions,
} from "#root/src/game/geometry/fracture/fracture-types.ts";

/** Stable entropy: geometry never flickers as the simulation advances. */
export function fractureNoise(seed: number, index: number) {
  let v = seed ^ Math.imul(index + 1, FRACTURE.hashMultiplier);

  v = Math.imul(v ^ (v >>> FRACTURE.hashShift), FRACTURE.hashMultiplier);
  v = Math.imul(v ^ (v >>> FRACTURE.hashShift), FRACTURE.hashMultiplier);

  return ((v ^ (v >>> FRACTURE.hashShift)) >>> 0) / FRACTURE.maxHash;
}

export function chippedHole(x: number, y: number, seed: number): Polygon {
  const points: Polygon = [];

  for (let i = 0; i < CHIP.vertices; i++) {
    const angle = (i * CHIP.revolution) / CHIP.vertices;
    const spread = CHIP.minSpread + fractureNoise(seed, i) * CHIP.spreadRange;

    points.push({
      x:
        x +
        Math.cos(angle) *
          (CHIP.baseRadiusX +
            fractureNoise(seed, CHIP.radiusXSeed) * CHIP.radiusXRange) *
          spread,
      y:
        y +
        Math.sin(angle) *
          (CHIP.baseRadiusY +
            fractureNoise(seed, CHIP.radiusYSeed) * CHIP.radiusYRange) *
          spread,
    });
  }

  return points;
}

export function fractureMask(
  axis: "x" | "y",
  cut: number,
  options: MaskOptions,
): Polygon {
  const { side, seed, bounds } = options;
  const vertical = axis === "x";
  const low = vertical ? bounds.bottom : bounds.left;
  const high = vertical ? bounds.top : bounds.right;
  const along = fractureContour(cut, { low, high, seed, vertical });

  if (vertical) {
    return side < 0
      ? [{ x: bounds.left, y: low }, ...along, { x: bounds.left, y: high }]
      : [
          { x: bounds.right, y: low },
          { x: bounds.right, y: high },
          ...along.reverse(),
        ];
  }

  return side < 0
    ? [
        { x: low, y: bounds.bottom },
        { x: high, y: bounds.bottom },
        ...along.reverse(),
      ]
    : [{ x: low, y: bounds.top }, ...along, { x: high, y: bounds.top }];
}

interface ContourOptions {
  low: number;
  high: number;
  seed: number;
  vertical: boolean;
}

function fractureContour(cut: number, options: ContourOptions): Polygon {
  const { low, high, seed, vertical } = options;
  const along: Polygon = [];
  const count = Math.max(
    FRACTURE.minSegments,
    Math.ceil((high - low) / FRACTURE.segmentLength),
  );

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const parallel = low + (high - low) * t;
    const broken =
      cut +
      (i === 0 || i === count
        ? 0
        : (fractureNoise(seed, i) - FRACTURE.noiseCenter) *
          FRACTURE.noiseAmplitude);

    along.push(
      vertical ? { x: broken, y: parallel } : { x: parallel, y: broken },
    );
  }

  return along;
}
