import * as THREE from "three";
import { loadGeometry } from "./model-assets";
import type { Block } from "./simulation";
import type { FractureVisual } from "./code-visual";
import { HALF, DIAMETER, HEADER_HEIGHT, ATTACHMENT } from "./code-settings";

export function addAngryFace(
  group: THREE.Group,
  block: Block,
  visual: FractureVisual,
) {
  const { width: w, height: h, depth: z } = visual;
  if (block.angry && !visual.fractured) {
    const face = new THREE.Group();
    face.name = "angry-code-face";
    face.position.set(
      w * HALF - ATTACHMENT.faceInset,
      h * HALF + ATTACHMENT.headerCenter,
      z + ATTACHMENT.faceDepth,
    );
    group.add(face);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: "#fff4ba" });
    const browMaterial = new THREE.MeshToonMaterial({ color: "#44122a" });
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
}

export function addIceOutline(group: THREE.Group, visual: FractureVisual) {
  const { width: w, height: h, depth: z } = visual;
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
  addIceCrystals(ice, visual);
  group.add(ice);
}

function addIceCrystals(ice: THREE.Group, visual: FractureVisual) {
  const { width: w, height: h, depth: z } = visual;
  const crystalMaterial = new THREE.MeshToonMaterial({
    color: "#b6eeff",
    emissive: "#2885ac",
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.85,
  });
  for (const x of [-w * HALF, w * HALF]) {
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
  }
}
