import { append, clip } from "./death-clipping-polygons";
import {
  SEAM,
  TRIANGLE_VERTICES,
  type ClipBand,
  type ClipContext,
  type Vertex,
} from "./death-clipping-types";
import { appendSeamWalls } from "./death-clipping-walls";

interface BandRange {
  vertices: Vertex[];
  lo: number;
  hi: number;
  isFront: boolean;
}

function splitBand(context: ClipContext, band: ClipBand) {
  const distance = (v: Vertex) =>
    v[context.perpendicular]! -
    band.slope * v[context.parallel]! -
    band.intercept;
  const ds = band.polygon.map((vertex) => distance(vertex));
  const min = Math.min(...ds);
  const max = Math.max(...ds);

  if (max <= SEAM.epsilon) {
    append(context.outputs[0], band.polygon);

    return;
  }

  if (min >= -SEAM.epsilon) {
    append(context.outputs[1], band.polygon);

    return;
  }

  append(
    context.outputs[0],
    clip(band.polygon, (v) => -distance(v)),
  );
  append(context.outputs[1], clip(band.polygon, distance));
  if (band.isFront) {
    appendSeamWalls(context, band, distance);
  }
}

function processBand(context: ClipContext, range: BandRange, band: number) {
  const low = context.options.parallelLow + band * context.step;
  const high = low + context.step;
  let polygon = range.vertices;

  if (range.lo < low - SEAM.epsilon) {
    polygon = clip(polygon, (v) => v[context.parallel]! - low);
  }

  if (range.hi > high + SEAM.epsilon) {
    polygon = clip(polygon, (v) => high - v[context.parallel]!);
  }

  if (polygon.length < TRIANGLE_VERTICES) {
    return;
  }

  const slope = (context.seam[band + 1]! - context.seam[band]!) / context.step;
  const intercept = context.seam[band]! - slope * low;

  splitBand(context, { polygon, slope, intercept, isFront: range.isFront });
}

export function sweepTriangleBands(
  context: ClipContext,
  vertices: Vertex[],
  isFront: boolean,
) {
  const { parallel, count, step, options } = context;
  const lo = Math.min(...vertices.map((v) => v[parallel]!));
  const hi = Math.max(...vertices.map((v) => v[parallel]!));
  const start = Math.max(
    0,
    Math.min(count - 1, Math.floor((lo - options.parallelLow) / step)),
  );
  const end = Math.max(
    start,
    Math.min(count - 1, Math.floor((hi - options.parallelLow) / step)),
  );

  for (let band = start; band <= end; band++) {
    processBand(context, { vertices, lo, hi, isFront }, band);
  }
}
