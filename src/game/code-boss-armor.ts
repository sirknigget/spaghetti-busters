import { PALETTE } from "./palette";
import * as THREE from "three";
import { loadGeometry } from "./model-assets";
import { type FractureVisual } from "./code-visual";
import {
  HALF,
  DIAMETER,
  HEADER_HEIGHT,
  ATTACHMENT,
  ARMOR,
} from "./code-settings";

const FRAME_METALNESS = 0.62;
const FRAME_ROUGHNESS = 0.35;
const PLATE_METALNESS = 0.7;
const PLATE_ROUGHNESS = 0.4;
const BOLT_METALNESS = 0.65;
const BOLT_ROUGHNESS = 0.27;
const CORE_EMISSIVE_INTENSITY = 0.8;
const CORE_METALNESS = 0.3;
const CORE_ROUGHNESS = 0.2;

interface ArmorLayout {
  armor: THREE.Group;
  w: number;
  h: number;
  z: number;
  orange: THREE.Material;
  dark: THREE.Material;
  gold: THREE.Material;
}
interface ArmorBox {
  x: number;
  y: number;
  width: number;
  height: number;
  material: THREE.Material;
  depth?: number;
}

export function createBossArmor(group: THREE.Group, visual: FractureVisual) {
  const armor = new THREE.Group();

  armor.name = "factory-boss-reinforced-frame";
  group.add(armor);

  const layout = createLayout(armor, visual);
  const rail = addRails(layout);

  addPlates(layout);
  addStripes(layout, rail);
  addReactor(armor, visual, layout.gold);
}

function createLayout(armor: THREE.Group, visual: FractureVisual): ArmorLayout {
  const orange = new THREE.MeshStandardMaterial({
    color: PALETTE.boss.armor,
    metalness: FRAME_METALNESS,
    roughness: FRAME_ROUGHNESS,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: PALETTE.boss.armorDark,
    metalness: PLATE_METALNESS,
    roughness: PLATE_ROUGHNESS,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: PALETTE.boss.gold,
    metalness: BOLT_METALNESS,
    roughness: BOLT_ROUGHNESS,
  });

  return {
    armor,
    w: visual.width,
    h: visual.height,
    z: visual.depth,
    orange,
    dark,
    gold,
  };
}

function addArmorBox(layout: ArmorLayout, box: ArmorBox) {
  const { armor, z } = layout;
  const {
    x,
    y,
    width,
    height,
    material,
    depth = z * DIAMETER + ARMOR.depthPadding,
  } = box;
  const mesh = new THREE.Mesh(
    loadGeometry("armor-box").scale(width, height, depth),
    material,
  );

  mesh.position.set(x, y, 0);
  mesh.userData.armorDimensions = { width, height, depth };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  armor.add(mesh);

  return mesh;
}

function addRails(layout: ArmorLayout) {
  const { w, h, orange } = layout;
  const rail = Math.min(
    ARMOR.maxRail,
    w * ARMOR.railWidthRatio,
    h * ARMOR.railHeightRatio,
  );

  for (const x of [-w * HALF + rail * HALF, w * HALF - rail * HALF]) {
    addArmorBox(layout, {
      x,
      y: ATTACHMENT.headerCenter,
      width: rail,
      height: h + HEADER_HEIGHT,
      material: orange,
    });
  }

  for (const y of [
    -h * HALF + rail * HALF,
    h * HALF + HEADER_HEIGHT - rail * HALF,
  ]) {
    addArmorBox(layout, { x: 0, y, width: w, height: rail, material: orange });
  }

  return rail;
}

function addPlates(layout: ArmorLayout) {
  const { armor, w, h, z, dark, gold } = layout;
  const plate = Math.min(
    ARMOR.maxPlate,
    w * ARMOR.plateWidthRatio,
    h * ARMOR.plateHeightRatio,
  );

  for (const x of [-w * HALF + plate * HALF, w * HALF - plate * HALF]) {
    for (const y of [
      -h * HALF + plate * HALF,
      h * HALF + HEADER_HEIGHT - plate * HALF,
    ]) {
      addArmorBox(layout, {
        x,
        y,
        width: plate,
        height: plate,
        material: dark,
        depth: z * DIAMETER + ARMOR.plateDepth,
      });

      const bolt = new THREE.Mesh(loadGeometry("armor-bolt"), gold);

      bolt.rotation.x = Math.PI * HALF;
      bolt.position.set(x, y, z + ARMOR.boltDepth);
      bolt.castShadow = true;
      armor.add(bolt);
    }
  }
}

function addStripes(layout: ArmorLayout, rail: number) {
  const { w, h, z, gold } = layout;

  for (
    let y = -h * HALF + ARMOR.stripeStart;
    y < h * HALF - ARMOR.stripeEnd;
    y += ARMOR.stripeSpacing
  ) {
    for (const x of [-w * HALF + rail * HALF, w * HALF - rail * HALF]) {
      const stripe = addArmorBox(layout, {
        x,
        y,
        width: rail,
        height: ARMOR.stripeHeight,
        material: gold,
        depth: ARMOR.stripeThickness,
      });

      stripe.position.z = z + ARMOR.stripeDepth;
    }
  }
}

export function addReactor(
  armor: THREE.Group,
  visual: FractureVisual,
  gold: THREE.Material,
) {
  const { width: w, height: h, depth: z } = visual;

  if (w <= ARMOR.reactorMinimumWidth) {
    return;
  }

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
  reactor.add(createCore());
  addFins(reactor, gold);
}

function createCore() {
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.boss.core,
    emissive: PALETTE.boss.coreEmissive,
    emissiveIntensity: CORE_EMISSIVE_INTENSITY,
    metalness: CORE_METALNESS,
    roughness: CORE_ROUGHNESS,
  });
  const core = new THREE.Mesh(loadGeometry("armor-reactor-core"), coreMaterial);

  core.name = "factory-boss-core";
  core.rotation.x = ARMOR.coreTilt;

  return core;
}

function addFins(reactor: THREE.Group, gold: THREE.Material) {
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
