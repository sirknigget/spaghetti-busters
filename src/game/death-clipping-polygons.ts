import {
  COMPONENT,
  SEAM,
  type ClipOutput,
  type Vertex,
} from "./death-clipping-types";

function crossesSeam(da: number, db: number) {
  return (
    (da > SEAM.epsilon && db < -SEAM.epsilon) ||
    (da < -SEAM.epsilon && db > SEAM.epsilon)
  );
}

export const clip = (
  polygon: Vertex[],
  distance: (v: Vertex) => number,
): Vertex[] => {
  const out: Vertex[] = [];

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const da = distance(a);
    const db = distance(b);
    const inside = da >= -SEAM.epsilon;

    if (inside) {
      out.push(a);
    }

    if (crossesSeam(da, db)) {
      const t = da / (da - db);

      out.push(a.map((v, k) => v + (b[k]! - v) * t));
    }
  }

  return out;
};

export function append(output: ClipOutput, polygon: Vertex[]) {
  for (let i = 1; i < polygon.length - 1; i++) {
    const a = polygon[0]!;
    const b = polygon[i]!;
    const c = polygon[i + 1]!;
    const abx = b[COMPONENT.x]! - a[COMPONENT.x]!;
    const aby = b[COMPONENT.y]! - a[COMPONENT.y]!;
    const abz = b[COMPONENT.z]! - a[COMPONENT.z]!;
    const acx = c[COMPONENT.x]! - a[COMPONENT.x]!;
    const acy = c[COMPONENT.y]! - a[COMPONENT.y]!;
    const acz = c[COMPONENT.z]! - a[COMPONENT.z]!;
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;

    if (cx * cx + cy * cy + cz * cz < SEAM.areaEpsilon) {
      continue;
    }

    for (const v of [a, b, c]) {
      output.p.push(v[COMPONENT.x]!, v[COMPONENT.y]!, v[COMPONENT.z]!);
      output.n.push(v[COMPONENT.nx]!, v[COMPONENT.ny]!, v[COMPONENT.nz]!);
      output.uv.push(v[COMPONENT.u]!, v[COMPONENT.v]!);
    }
  }
}
