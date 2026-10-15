import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDeathFragments, disposeObject } from "./code-mesh";
import {
  chippedHole,
  perforatedGeometry,
  type Polygon,
} from "./fracture-geometry";

const area = (geometry: THREE.BufferGeometry) => {
  const p = geometry.getAttribute("position");
  let result = 0;
  for (let i = 0; i < geometry.groups[0]!.count; i += 3)
    result +=
      Math.abs(
        (p.getX(i + 1) - p.getX(i)) * (p.getY(i + 2) - p.getY(i)) -
          (p.getY(i + 1) - p.getY(i)) * (p.getX(i + 2) - p.getX(i)),
      ) / 2;
  return result;
};
function slab() {
  const canvas = { width: 800, height: 452 } as HTMLCanvasElement;
  const regions: Polygon[] = [
    [
      { x: -200, y: -100 },
      { x: 200, y: -100 },
      { x: 200, y: 126 },
      { x: -200, y: 126 },
    ],
  ];
  const holes = new Map([["hole", chippedHole(17, 14, 37)]]);
  const geometry = perforatedGeometry(
    regions,
    [...holes.values()],
    16,
    { x: 23, y: -12 },
    { width: 400, height: 200 },
  );
  const texture = new THREE.CanvasTexture(canvas);
  const source = new THREE.Group(),
    mesh = new THREE.Mesh(geometry, [
      new THREE.MeshToonMaterial({ map: texture }),
      new THREE.MeshToonMaterial(),
    ]);
  mesh.name = "perforated-extruded-code";
  source.add(mesh);
  source.userData.fractureVisual = {
    canvas,
    width: 400,
    height: 200,
    depth: 16,
    offset: { x: 23, y: -12 },
    regions,
    holes,
    scars: new Set(),
    fractured: true,
  };
  return { source, mesh, canvas };
}

describe("code slab death partitioning", () => {
  it("partitions the actual surface into complementary centered pieces retaining holes and original UVs", () => {
    const { source, mesh, canvas } = slab(),
      originalArea = area(mesh.geometry);
    const pieces = createDeathFragments(source, 941);
    expect(pieces.length).toBeGreaterThanOrEqual(8);
    expect(pieces.length).toBeLessThanOrEqual(16);
    expect(
      pieces.reduce((sum, piece) => sum + piece.userData.fragmentArea, 0),
    ).toBeCloseTo(originalArea, 1);
    for (const piece of pieces) {
      const part = piece.getObjectByName(
        "perforated-extruded-code",
      ) as THREE.Mesh;
      const p = part.geometry.getAttribute("position"),
        uv = part.geometry.getAttribute("uv");
      part.geometry.computeBoundingBox();
      expect(
        part.geometry.boundingBox!.getCenter(new THREE.Vector3()).length(),
      ).toBeLessThan(0.001);
      expect(piece.userData.sourceCanvas).toBe(canvas);
      expect(piece.userData.fractureVisual.holes.size).toBe(1);
      for (let i = 0; i < p.count; i++) {
        expect(uv.getX(i)).toBeCloseTo(
          (p.getX(i) + piece.position.x + 23 + 200) / 400,
          5,
        );
        expect(uv.getY(i)).toBeCloseTo(
          (p.getY(i) + piece.position.y - 12 + 100) / 226,
          5,
        );
      }
    }
    expect(area(mesh.geometry)).toBe(originalArea);
    pieces.forEach(disposeObject);
    disposeObject(source);
  });

  it("owns independent resources, preserves assembled world pose, and varies fracture entropy", () => {
    const { source, mesh } = slab();
    source.position.set(420, 370, 2);
    source.rotation.set(0.2, -0.3, 0.6);
    source.updateWorldMatrix(true, false);
    const pieces = createDeathFragments(source, 11),
      different = createDeathFragments(source, 12);
    expect(pieces.map((piece) => piece.position.toArray())).not.toEqual(
      different.map((piece) => piece.position.toArray()),
    );
    const maps = new Set<THREE.Texture>();
    for (const piece of pieces) {
      const part = piece.getObjectByName(
        "perforated-extruded-code",
      ) as THREE.Mesh;
      const material = (part.material as THREE.MeshToonMaterial[])[0]!;
      expect(part.geometry).not.toBe(mesh.geometry);
      expect(material).not.toBe((mesh.material as THREE.Material[])[0]);
      expect(material.map).not.toBe(
        (mesh.material as THREE.MeshToonMaterial[])[0]!.map,
      );
      maps.add(material.map!);
      const expected = source.localToWorld(piece.position.clone());
      piece.applyMatrix4(source.matrixWorld);
      expect(piece.position.distanceTo(expected)).toBeLessThan(0.001);
    }
    expect(maps.size).toBe(pieces.length);
    pieces.forEach(disposeObject);
    different.forEach(disposeObject);
    disposeObject(source);
  });
});

it.each([
  {
    label: "densely overlapping chips",
    spacingX: 15,
    spacingY: 8,
    height: 200,
  },
  { label: "TypeScript glyph grid", spacingX: 9, spacingY: 20, height: 500 },
])(
  "partitions 650 holes in $label without resweeping contours",
  ({ spacingX, spacingY, height }) => {
    const { source, mesh } = slab();
    const visual = source.userData.fractureVisual;
    visual.height = height;
    visual.regions = [
      [
        { x: -200, y: -height / 2 },
        { x: 200, y: -height / 2 },
        { x: 200, y: height / 2 + 26 },
        { x: -200, y: height / 2 + 26 },
      ],
    ];
    visual.holes = new Map(
      Array.from({ length: 650 }, (_, i) => [
        `${i}`,
        chippedHole(
          -194 + (i % 26) * spacingX,
          -height / 2 + 6 + Math.floor(i / 26) * spacingY,
          i,
        ),
      ]),
    );
    mesh.geometry.dispose();
    mesh.geometry = perforatedGeometry(
      visual.regions,
      [...visual.holes.values()],
      16,
      visual.offset,
      { width: 400, height },
    );
    const pieces = createDeathFragments(source, 13);
    expect(pieces.length).toBeGreaterThan(1);
    expect(
      pieces.reduce((sum, piece) => sum + piece.userData.fragmentArea, 0),
    ).toBeCloseTo(area(mesh.geometry), 0);
    // Bound resulting geometry rather than making this regression test depend on machine speed.
    expect(
      pieces.reduce(
        (sum, piece) =>
          sum +
          (piece.children[0] as THREE.Mesh).geometry.getAttribute("position")
            .count,
        0,
      ),
    ).toBeLessThan(250000);
    pieces.forEach(disposeObject);
    disposeObject(source);
  },
  20000,
);
