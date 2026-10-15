import * as THREE from "three";
import { loadGeometry } from "./model-assets";
import type { Block } from "./simulation";
import { clipDeathSolid } from "./death-clipping";
import {
  chippedHole,
  fractureMask,
  fractureNoise,
  perforatedGeometry,
  type Polygon,
} from "./fracture-geometry";

const HALF = 0.5;
const DIAMETER = 2;
const TRIANGLE_VERTICES = 3;
const HEADER_HEIGHT = 26;
const DECIMAL_PRECISION = 3;
const DEATH_FRACTURE = {
  minimumPieces: 8,
  countSeed: 100,
  countJitter: 7,
  maximumCuts: 30,
  minimumSpan: 25,
  axisBias: 0.8,
  axisSeed: 200,
  axisJitter: 0.4,
  minimumFraction: 0.38,
  fractionSeed: 300,
  fractionJitter: 0.24,
  seedStride: 7919,
  boundsPadding: 2,
};
const DAMAGE_ENTROPY = { xMultiplier: 7919, yMultiplier: 193 };
const SLAB = {
  bossDepth: 32,
  baseDepth: 14,
  maximumExtraDepth: 8,
  generationDepth: 2,
};
const ATTACHMENT = {
  faceInset: 29,
  headerCenter: 13,
  faceDepth: 3,
  eyeSpacing: 9,
  eyeSquash: 0.8,
  browHeight: 5,
  browTilt: 0.35,
  outlineMargin: 5,
  crystalDepth: 3,
  crystalX: 0.7,
  crystalY: 1.4,
  crystalZ: 0.8,
};
const ARMOR = {
  depthPadding: 5,
  maxRail: 8,
  railWidthRatio: 0.045,
  railHeightRatio: 0.07,
  maxPlate: 22,
  plateWidthRatio: 0.1,
  plateHeightRatio: 0.16,
  plateDepth: 8,
  boltDepth: 6,
  stripeStart: 35,
  stripeEnd: 10,
  stripeSpacing: 38,
  stripeHeight: 8,
  stripeThickness: 3,
  stripeDepth: 4,
  reactorMinimumWidth: 100,
  reactorInset: 32,
  reactorDepth: 7,
  coreTilt: 0.5,
  finCount: 3,
  finRadius: 8,
  finDepth: 2,
};

interface FractureVisual {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  depth: number;
  offset: { x: number; y: number };
  regions: Polygon[];
  holes: Map<string, Polygon>;
  scars: Set<string>;
  fractured: boolean;
}

/** A child uses the parent's surface and the complementary side of one seeded broken cut. */
export function createFragmentMesh(
  block: Block,
  parent: THREE.Group,
  parentBlock: Block,
): THREE.Group {
  // SAFETY: createCodeMesh stores only FractureVisual values under this private key.
  const inherited = parent.userData.fractureVisual as
    FractureVisual | undefined;
  if (!inherited || !block.fracture) return createCodeMesh(block);
  const f = block.fracture,
    axis = f.axis;
  const bounds = {
    left: -inherited.width * HALF - 1,
    right: inherited.width * HALF + 1,
    bottom: -inherited.height * HALF - 1,
    top: inherited.height * HALF + HEADER_HEIGHT + 1,
  };
  const cut =
    axis === "x" ? inherited.offset.x + f.cut : inherited.offset.y - f.cut;
  const region = fractureMask(
    axis,
    cut,
    axis === "x" ? f.side : -f.side,
    f.seed,
    bounds,
  );
  const parentVisual: FractureVisual = {
    ...inherited,
    holes: new Map(inherited.holes),
  };
  addRemovedCells(parentVisual, parentBlock);
  const visual: FractureVisual = {
    ...parentVisual,
    offset: {
      x: inherited.offset.x + f.offsetX,
      y: inherited.offset.y - f.offsetY,
    },
    regions: [...inherited.regions, region],
    holes: new Map(parentVisual.holes),
    fractured: true,
  };
  return createCodeMesh(block, undefined, visual);
}

/** Visual-only death fragments. Geometry is centered on each fragment's bounds and position is
 * that center in SOURCE LOCAL coordinates (identity rotation/scale). Apply source.matrixWorld
 * to the group before adding it to the scene. The source is untouched. All GPU resources are
 * independently owned; only the original canvas pixels are shared. */
export function createDeathFragments(
  source: THREE.Group,
  seed: number,
): THREE.Group[] {
  // SAFETY: source is a code mesh created by createCodeMesh, which owns this key.
  const visual = source.userData.fractureVisual as FractureVisual | undefined;
  const solid = source.getObjectByName("perforated-extruded-code");
  if (
    !visual ||
    !(solid instanceof THREE.Mesh) ||
    solid.geometry.getAttribute("position").count === 0
  )
    return [];
  const rootBounds = {
    left: -visual.width * HALF - DEATH_FRACTURE.boundsPadding,
    right: visual.width * HALF + DEATH_FRACTURE.boundsPadding,
    bottom: -visual.height * HALF - DEATH_FRACTURE.boundsPadding,
    top: visual.height * HALF + HEADER_HEIGHT + DEATH_FRACTURE.boundsPadding,
  };
  const leaves = [
    { regions: visual.regions, geometry: solid.geometry.clone() },
  ];
  const desired =
    DEATH_FRACTURE.minimumPieces +
    Math.floor(
      fractureNoise(seed, DEATH_FRACTURE.countSeed) *
        DEATH_FRACTURE.countJitter,
    );
  // Keep the bounded fracture search ordered: either exhaustion or a degenerate cut stops it.
  // oxlint-disable sonarjs/too-many-break-or-continue-in-loop
  for (
    let cutIndex = 0;
    leaves.length < desired && cutIndex < DEATH_FRACTURE.maximumCuts;
    cutIndex++
  ) {
    // Always break the largest surviving piece, so a tiny edge chip cannot monopolize cuts.
    let selected = -1,
      largest = 0;
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i]!;
      leaf.geometry.computeBoundingBox();
      const size = leaf.geometry.boundingBox!.getSize(new THREE.Vector3());
      const area = size.x * size.y;
      if (
        area > largest &&
        Math.max(size.x, size.y) > DEATH_FRACTURE.minimumSpan
      ) {
        selected = i;
        largest = area;
      }
    }
    if (selected < 0) break;
    const leaf = leaves[selected]!,
      box = leaf.geometry.boundingBox!,
      size = box.getSize(new THREE.Vector3());
    const axis =
      size.x >
      size.y *
        (DEATH_FRACTURE.axisBias +
          fractureNoise(seed, cutIndex + DEATH_FRACTURE.axisSeed) *
            DEATH_FRACTURE.axisJitter)
        ? "x"
        : "y";
    const fraction =
      DEATH_FRACTURE.minimumFraction +
      fractureNoise(seed, cutIndex + DEATH_FRACTURE.fractionSeed) *
        DEATH_FRACTURE.fractionJitter;
    const cut =
      axis === "x"
        ? box.min.x + size.x * fraction + visual.offset.x
        : box.min.y + size.y * fraction + visual.offset.y;
    const cutSeed = seed + cutIndex * DEATH_FRACTURE.seedStride;
    const geometries = clipDeathSolid(
      leaf.geometry,
      axis,
      cut - (axis === "x" ? visual.offset.x : visual.offset.y),
      cutSeed,
      axis === "x"
        ? rootBounds.bottom - visual.offset.y
        : rootBounds.left - visual.offset.x,
      axis === "x"
        ? rootBounds.top - visual.offset.y
        : rootBounds.right - visual.offset.x,
    );
    const halves = [-1, 1].map((side, index) => ({
      regions: [
        ...leaf.regions,
        fractureMask(axis, cut, side, cutSeed, rootBounds),
      ],
      geometry: geometries[index]!,
    }));
    if (
      halves.some((half) => half.geometry.getAttribute("position").count === 0)
    ) {
      for (const half of halves) {
        half.geometry.dispose();
      }
      break;
    }
    leaf.geometry.dispose();
    leaves.splice(selected, 1, ...halves);
  }
  // oxlint-enable sonarjs/too-many-break-or-continue-in-loop
  return leaves.map((leaf, index) => {
    const group = new THREE.Group();
    group.name = `code-death-fragment-${index}`;
    leaf.geometry.computeBoundingBox();
    const center = leaf.geometry.boundingBox!.getCenter(new THREE.Vector3());
    leaf.geometry.translate(-center.x, -center.y, -center.z);
    group.position.copy(center);
    const materials = (
      Array.isArray(solid.material) ? solid.material : [solid.material]
    ).map((material) => cloneOwnedMaterial(material));
    const mesh = new THREE.Mesh(leaf.geometry, materials);
    mesh.name = "perforated-extruded-code";
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    const fragmentVisual: FractureVisual = {
      ...visual,
      offset: { x: visual.offset.x + center.x, y: visual.offset.y + center.y },
      regions: leaf.regions,
      holes: new Map(visual.holes),
      fractured: true,
    };
    if (source.userData.boss) {
      // Root housing is clipped by the same contours, retaining each original bolt/core once.
      createBossArmor(group, visual.width, visual.height, visual.depth);
      clipBossArmor(group, fragmentVisual, visual.depth);
      const originalReactor = source.getObjectByName("factory-boss-reactor"),
        reactor = group.getObjectByName("factory-boss-reactor");
      if (originalReactor && reactor)
        reactor.quaternion.copy(originalReactor.quaternion);
    }
    const face = source.getObjectByName("angry-code-face");
    if (
      face &&
      insideRegions(
        {
          x: face.position.x + visual.offset.x,
          y: face.position.y + visual.offset.y,
        },
        leaf.regions,
      )
    ) {
      const copy = face.clone(true);
      copy.position.sub(center);
      copy.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const part = object;
        if (part.geometry) part.geometry = part.geometry.clone();
        if (part.material)
          part.material = Array.isArray(part.material)
            ? part.material.map(cloneOwnedMaterial)
            : cloneOwnedMaterial(part.material);
      });
      group.add(copy);
    }
    group.userData.fractureVisual = fragmentVisual;
    group.userData.sourceCanvas = visual.canvas;
    group.userData.deathFragmentRootOffset = { ...fragmentVisual.offset };
    group.userData.solidDepth = visual.depth * DIAMETER;
    group.userData.fragmentArea = frontArea(leaf.geometry);
    return group;
  });
}

export function cloneOwnedMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  for (const [key, value] of Object.entries(source)) {
    if (!(value instanceof THREE.Texture)) continue;
    const texture = value.clone();
    texture.needsUpdate = true;
    Object.assign(material, { [key]: texture });
  }
  return material;
}

function frontArea(geometry: THREE.BufferGeometry) {
  const p = geometry.getAttribute("position");
  let area = 0;
  for (let i = 0; i < (geometry.groups[0]?.count ?? 0); i += TRIANGLE_VERTICES)
    area +=
      Math.abs(
        (p.getX(i + 1) - p.getX(i)) * (p.getY(i + DIAMETER) - p.getY(i)) -
          (p.getY(i + 1) - p.getY(i)) * (p.getX(i + DIAMETER) - p.getX(i)),
      ) * HALF;
  return area;
}

// Canvas crack strokes are authored texture artwork in pixel coordinates.
// oxlint-disable eslint/no-magic-numbers
function addDamageScars(visual: FractureVisual, block: Block) {
  const context = visual.canvas.getContext("2d")!;
  context.save();
  const scale = visual.canvas.width / visual.width;
  context.setTransform(
    scale,
    0,
    0,
    scale,
    visual.width * scale * HALF,
    (visual.height * HALF + 26) * scale,
  );
  for (const cell of block.cells)
    if (cell.alive && cell.health < cell.maxHealth) {
      const x = cell.x + visual.offset.x,
        y = cell.y - visual.offset.y,
        key = `${x}:${y}:${cell.health}`;
      if (visual.scars.has(key)) continue;
      visual.scars.add(key);
      // Cracks accumulate in the original sheet's coordinates, including on surviving armor.
      context.lineWidth = 0.75;
      context.strokeStyle = "#ffb471";
      context.beginPath();
      context.moveTo(x - 4, y - 8);
      context.lineTo(x + 2, y - 3);
      context.lineTo(x - 2, y + 1);
      context.lineTo(x + 3, y + 7);
      context.moveTo(x - 2, y + 1);
      context.lineTo(x - 7, y + 3);
      context.stroke();
      context.lineWidth = 0.5;
      context.strokeStyle = "#050c13";
      context.beginPath();
      context.moveTo(x - 3, y - 7);
      context.lineTo(x + 3, y - 3);
      context.lineTo(x - 1, y + 1);
      context.lineTo(x + 4, y + 7);
      context.stroke();
    }
  context.restore();
}

// oxlint-enable eslint/no-magic-numbers
function addRemovedCells(visual: FractureVisual, block: Block) {
  for (const cell of block.cells)
    if (!cell.alive) {
      const x = cell.x + visual.offset.x,
        y = -cell.y + visual.offset.y,
        key = `${x.toFixed(DECIMAL_PRECISION)}:${y.toFixed(DECIMAL_PRECISION)}`;
      if (!visual.holes.has(key))
        visual.holes.set(
          key,
          chippedHole(
            x,
            y,
            Math.round(
              x * DAMAGE_ENTROPY.xMultiplier +
                y * DAMAGE_ENTROPY.yMultiplier +
                visual.width,
            ),
          ),
        );
    }
}

/** A real, perforated solid: removed code cells remove both faces and expose the cut edges. */
export function createCodeMesh(
  block: Block,
  previous?: THREE.Group,
  inherited?: FractureVisual,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `code-solid-${block.id}`;
  const w = block.width,
    h = block.height,
    top = h * HALF + HEADER_HEIGHT,
    bottom = -h * HALF;
  // SAFETY: previous is a mesh from this factory, which owns the fractureVisual key.
  const prior =
    inherited ??
    (previous?.userData.fractureVisual as FractureVisual | undefined);
  const canvas = prior?.canvas ?? document.createElement("canvas");
  const scale = 2;
  // Pixel coordinates define the syntax-highlighted canvas texture, including window chrome.
  // oxlint-disable eslint/no-magic-numbers
  if (!prior) {
    canvas.width = Math.ceil(w * scale);
    canvas.height = Math.ceil((h + 26) * scale);
    const context = canvas.getContext("2d")!;
    context.scale(scale, scale);
    context.translate(w * HALF, top);
    const palette = codePalette(block);
    context.fillStyle = palette.body;
    context.fillRect(-w * HALF, -top, w, h + 26);
    context.fillStyle = palette.header;
    context.fillRect(-w * HALF, -top, w, 26);
    context.fillStyle = palette.edge;
    context.fillRect(-w * HALF, -top, w, 1.5);
    const titleSize = w < 260 ? 13 : 20;
    context.font = block.boss
      ? `bold ${titleSize}px monospace`
      : "9px monospace";
    context.textBaseline = "middle";
    const bossTitle = w < 260 ? "F³ // FRAGMENT" : "FactoryFactoryFactory";
    const title = block.boss ? bossTitle : block.title;
    context.fillStyle = block.boss ? "#fff0be" : "#e4efe1";
    const titleInset = block.angry ? 110 : 66;
    context.fillText(
      title,
      -w * HALF + 34,
      -h * HALF - 13,
      Math.max(15, w - (block.boss ? 86 : titleInset)),
    );
    for (const [i, color] of ["#ff8b69", "#ffd96a", "#aee5a3"].entries()) {
      context.fillStyle = color;
      context.beginPath();
      context.arc(
        -w * HALF + 10 + i * 9,
        -h * HALF - 13,
        2.4,
        0,
        Math.PI * DIAMETER,
      );
      context.fill();
    }
    context.font = "14px monospace";
    context.textAlign = "center";
    for (const cell of block.cells) {
      if (!cell.alive) continue;
      if (cell.magic) {
        context.fillStyle = "#ffe75b2b";
        context.fillRect(cell.x - 4.5, cell.y - 9, 9, 18);
      }
      context.fillStyle = cell.color;
      context.fillText(cell.char, cell.x, cell.y);
    }
  }
  // oxlint-enable eslint/no-magic-numbers
  const visual: FractureVisual = prior
    ? { ...prior, holes: new Map(prior.holes) }
    : {
        canvas,
        width: w,
        height: h,
        depth: block.boss
          ? SLAB.bossDepth
          : SLAB.baseDepth +
            Math.min(
              SLAB.maximumExtraDepth,
              block.generation * SLAB.generationDepth,
            ),
        offset: { x: 0, y: 0 },
        regions: [
          [
            { x: -w * HALF, y: bottom },
            { x: w * HALF, y: bottom },
            { x: w * HALF, y: top },
            { x: -w * HALF, y: top },
          ],
        ],
        holes: new Map(),
        scars: new Set(),
        fractured: false,
      };
  addRemovedCells(visual, block);
  addDamageScars(visual, block);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const front = new THREE.MeshToonMaterial({ map: texture, color: "#ffffff" });
  const side = new THREE.MeshToonMaterial({
    color: codePalette(block).side,
    emissive: codePalette(block).emissive,
    emissiveIntensity: 0.3,
  });
  const z = visual.depth;
  const dead = block.cells.filter((cell) => !cell.alive);
  const geometry = perforatedGeometry(
    visual.regions,
    [...visual.holes.values()],
    z,
    visual.offset,
    { width: visual.width, height: visual.height },
  );
  const mesh = new THREE.Mesh(geometry, [front, side]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = "perforated-extruded-code";
  group.add(mesh);
  if (block.boss) {
    createBossArmor(group, visual.width, visual.height, z);
    if (visual.fractured) clipBossArmor(group, visual, z);
  }
  if (block.angry && !visual.fractured) {
    const face = new THREE.Group();
    face.name = "angry-code-face";
    face.position.set(
      w * HALF - ATTACHMENT.faceInset,
      h * HALF + ATTACHMENT.headerCenter,
      z + ATTACHMENT.faceDepth,
    );
    group.add(face);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: "#fff4ba" }),
      browMaterial = new THREE.MeshToonMaterial({ color: "#44122a" });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(loadGeometry("angry-eye"), eyeMaterial);
      eye.scale.set(1, ATTACHMENT.eyeSquash, HALF);
      eye.position.set(side * ATTACHMENT.eyeSpacing, -1, 0);
      face.add(eye);
      const brow = new THREE.Mesh(loadGeometry("angry-brow"), browMaterial);
      brow.position.set(side * ATTACHMENT.eyeSpacing, ATTACHMENT.browHeight, 1);
      brow.rotation.z = side * ATTACHMENT.browTilt;
      face.add(brow);
    }
  }
  const ice = new THREE.Group();
  ice.name = "frozen-code-outline";
  ice.visible = false;
  const outlineGeometry = loadGeometry("armor-box").scale(
    w + ATTACHMENT.outlineMargin,
    h + HEADER_HEIGHT + ATTACHMENT.outlineMargin,
    z * DIAMETER + ATTACHMENT.outlineMargin,
  );
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(outlineGeometry),
    new THREE.LineBasicMaterial({
      color: "#9eeaff",
      transparent: true,
      opacity: 0.8,
    }),
  );
  outlineGeometry.dispose();
  outline.position.y = ATTACHMENT.headerCenter;
  ice.add(outline);
  const crystalMaterial = new THREE.MeshToonMaterial({
    color: "#b6eeff",
    emissive: "#2885ac",
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.85,
  });
  for (const x of [-w * HALF, w * HALF])
    for (const y of [-h * HALF, h * HALF + HEADER_HEIGHT]) {
      const crystal = new THREE.Mesh(
        loadGeometry("ice-crystal"),
        crystalMaterial,
      );
      crystal.position.set(x, y, z + ATTACHMENT.crystalDepth);
      crystal.scale.set(
        ATTACHMENT.crystalX,
        ATTACHMENT.crystalY,
        ATTACHMENT.crystalZ,
      );
      ice.add(crystal);
    }
  group.add(ice);
  group.userData.fractureVisual = visual;
  group.userData.fractured = visual.fractured;
  group.userData.hits = block.hits;
  group.userData.cellCount = block.cells.length;
  group.userData.solidDepth = z * DIAMETER;
  group.userData.removedCells = dead.length;
  group.userData.angry = block.angry;
  group.userData.exception = block.exception;
  group.userData.boss = block.boss;
  group.userData.bossTitle = block.boss ? "FactoryFactoryFactory" : undefined;
  return group;
}

function insideRegions(point: { x: number; y: number }, regions: Polygon[]) {
  return regions.every((polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i]!,
        b = polygon[j]!;
      if (
        a.y > point.y !== b.y > point.y &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
      )
        inside = !inside;
    }
    return inside;
  });
}

/** Cut the original housing at the same physical seam as the code, retaining its old bolts/core. */
function clipBossArmor(group: THREE.Group, visual: FractureVisual, z: number) {
  const armor = group.getObjectByName("factory-boss-reinforced-frame")!;
  const removed: THREE.Object3D[] = [];
  for (const child of armor.children) {
    // SAFETY: createBossArmor sets this private dimension record only on its box pieces.
    const dimensions = child.userData.armorDimensions as
      { width: number; height: number; depth: number } | undefined;
    if (dimensions && child instanceof THREE.Mesh) {
      const mesh = child;
      const { width, height, depth } = dimensions;
      const { x, y } = mesh.position;
      const rectangle = [
        { x: x - width * HALF, y: y - height * HALF },
        { x: x + width * HALF, y: y - height * HALF },
        { x: x + width * HALF, y: y + height * HALF },
        { x: x - width * HALF, y: y + height * HALF },
      ];
      mesh.geometry.dispose();
      mesh.geometry = perforatedGeometry(
        [...visual.regions, rectangle],
        [],
        depth * HALF,
        visual.offset,
        { width: visual.width, height: visual.height },
      );
      mesh.position.x = mesh.position.y = 0;
    } else if (insideRegions(child.position, visual.regions)) {
      child.position.x -= visual.offset.x;
      child.position.y -= visual.offset.y;
    } else {
      // Geometry/materials may be shared by other retained bolts; dispose centrally once.
      removed.push(child);
    }
  }
  for (const child of removed) child.removeFromParent();
  const liveGeometries = new Set<THREE.BufferGeometry>(),
    liveMaterials = new Set<THREE.Material>();
  armor.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const mesh = object;
    if (mesh.geometry) liveGeometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material])
      if (material) liveMaterials.add(material);
  });
  const deadGeometries = new Set<THREE.BufferGeometry>(),
    deadMaterials = new Set<THREE.Material>();
  for (const object of removed) {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.LineSegments))
        return;
      const mesh = child;
      if (mesh.geometry && !liveGeometries.has(mesh.geometry))
        deadGeometries.add(mesh.geometry);
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material])
        if (material && !liveMaterials.has(material))
          deadMaterials.add(material);
    });
  }
  for (const geometry of deadGeometries) {
    geometry.dispose();
  }
  for (const material of deadMaterials) {
    material.dispose();
  }
  armor.userData.originalDepth = z * DIAMETER;
}

/** A thick industrial housing stays outside the readable code, inside the collider's XY bounds. */
function createBossArmor(group: THREE.Group, w: number, h: number, z: number) {
  const armor = new THREE.Group();
  armor.name = "factory-boss-reinforced-frame";
  group.add(armor);
  const orange = new THREE.MeshStandardMaterial({
    color: "#e85b2b",
    metalness: 0.62,
    roughness: 0.35,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#542c30",
    metalness: 0.7,
    roughness: 0.4,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: "#ffc26a",
    metalness: 0.65,
    roughness: 0.27,
  });
  const add = (
    x: number,
    y: number,
    sx: number,
    sy: number,
    material: THREE.Material,
    depth = z * DIAMETER + ARMOR.depthPadding,
  ) => {
    const mesh = new THREE.Mesh(
      loadGeometry("armor-box").scale(sx, sy, depth),
      material,
    );
    mesh.position.set(x, y, 0);
    mesh.userData.armorDimensions = { width: sx, height: sy, depth };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    armor.add(mesh);
    return mesh;
  };
  const rail = Math.min(
    ARMOR.maxRail,
    w * ARMOR.railWidthRatio,
    h * ARMOR.railHeightRatio,
  );
  add(
    -w * HALF + rail * HALF,
    ATTACHMENT.headerCenter,
    rail,
    h + HEADER_HEIGHT,
    orange,
  );
  add(
    w * HALF - rail * HALF,
    ATTACHMENT.headerCenter,
    rail,
    h + HEADER_HEIGHT,
    orange,
  );
  add(0, -h * HALF + rail * HALF, w, rail, orange);
  add(0, h * HALF + HEADER_HEIGHT - rail * HALF, w, rail, orange);
  const plate = Math.min(
    ARMOR.maxPlate,
    w * ARMOR.plateWidthRatio,
    h * ARMOR.plateHeightRatio,
  );

  for (const x of [-w * HALF + plate * HALF, w * HALF - plate * HALF])
    for (const y of [
      -h * HALF + plate * HALF,
      h * HALF + HEADER_HEIGHT - plate * HALF,
    ]) {
      add(x, y, plate, plate, dark, z * DIAMETER + ARMOR.plateDepth);
      const bolt = new THREE.Mesh(loadGeometry("armor-bolt"), gold);
      bolt.rotation.x = Math.PI * HALF;
      bolt.position.set(x, y, z + ARMOR.boltDepth);
      bolt.castShadow = true;
      armor.add(bolt);
    }
  for (
    let y = -h * HALF + ARMOR.stripeStart;
    y < h * HALF - ARMOR.stripeEnd;
    y += ARMOR.stripeSpacing
  ) {
    for (const x of [-w * HALF + rail * HALF, w * HALF - rail * HALF]) {
      const stripe = add(
        x,
        y,
        rail,
        ARMOR.stripeHeight,
        gold,
        ARMOR.stripeThickness,
      );
      stripe.position.z = z + ARMOR.stripeDepth;
    }
  }
  if (w > ARMOR.reactorMinimumWidth) {
    const reactor = new THREE.Group();
    reactor.name = "factory-boss-reactor";
    reactor.position.set(
      w * HALF - ARMOR.reactorInset,
      h * HALF + ATTACHMENT.headerCenter,
      z + ARMOR.reactorDepth,
    );
    armor.add(reactor);
    const ring = new THREE.Mesh(loadGeometry("armor-reactor-ring"), gold);
    ring.castShadow = true;
    reactor.add(ring);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: "#ffd48b",
      emissive: "#ff6d21",
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.2,
    });
    const core = new THREE.Mesh(
      loadGeometry("armor-reactor-core"),
      coreMaterial,
    );
    core.name = "factory-boss-core";
    core.rotation.x = ARMOR.coreTilt;
    reactor.add(core);
    for (let i = 0; i < ARMOR.finCount; i++) {
      const fin = new THREE.Mesh(loadGeometry("armor-reactor-fin"), gold);
      const a = (i * Math.PI * DIAMETER) / ARMOR.finCount;
      fin.position.set(
        Math.cos(a) * ARMOR.finRadius,
        Math.sin(a) * ARMOR.finRadius,
        ARMOR.finDepth,
      );
      fin.rotation.z = a - Math.PI * HALF;
      reactor.add(fin);
    }
  }
}

export function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments)
      geometries.add(child.geometry);
    if (!(
      child instanceof THREE.Mesh ||
      child instanceof THREE.LineSegments ||
      child instanceof THREE.Sprite
    ))
      return;
    const mesh = child;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      materials.add(material);
      for (const texture of materialTextures(material)) textures.add(texture);
    }
  });
  for (const g of geometries) {
    g.dispose();
  }
  for (const m of materials) {
    m.dispose();
  }
  for (const t of textures) {
    t.dispose();
  }
  object.removeFromParent();
}

function codePalette(block: Block) {
  if (block.boss)
    return {
      body: "#2f202a",
      header: "#8b3329",
      edge: "#ffae59",
      side: "#bd492e",
      emissive: "#7c2314",
    };
  if (block.angry)
    return {
      body: "#421b2a",
      header: "#a23646",
      edge: "#ff9e8c",
      side: "#e95860",
      emissive: "#6a0f22",
    };
  if (block.exception)
    return {
      body: "#382335",
      header: "#73506a",
      edge: "#8ebebf",
      side: "#9d6387",
      emissive: "#000000",
    };
  return {
    body: "#122d40",
    header: "#35556b",
    edge: "#8ebebf",
    side: "#547e92",
    emissive: "#000000",
  };
}

function materialTextures(material: THREE.Material): THREE.Texture[] {
  return Object.values(material).filter(
    (value): value is THREE.Texture => value instanceof THREE.Texture,
  );
}
