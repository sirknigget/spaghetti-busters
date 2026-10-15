import * as THREE from "three";
import { loadGeometry } from "./model-assets";
import { TIMEOUT_METRICS, type TimeoutHazard } from "./simulation";
import { HALF, HAZARD } from "./world-settings";

function timeoutCanvas(hazard: TimeoutHazard) {
  const text = `await setTimeout(${hazard.durationMs});`;
  const { charWidth, widthPadding, height } = TIMEOUT_METRICS;
  const width = text.length * charWidth + widthPadding;
  const canvas = document.createElement("canvas");
  // Authored canvas typography uses pixel coordinates and supersampling.
  // oxlint-disable eslint/no-magic-numbers
  canvas.width = width * 3;
  canvas.height = height * 3;
  const c = canvas.getContext("2d")!;
  drawTimeoutBackground(c, width, height);
  drawTimeoutText(c, hazard, width);

  return canvas;
}

function drawTimeoutBackground(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  c.scale(3, 3);
  c.fillStyle = "#442336";
  c.fillRect(0, 0, width, height);
  c.strokeStyle = "#ffc58b";
  c.lineWidth = 2.5;
  c.strokeRect(1.25, 1.25, width - 2.5, height - 2.5);
  c.fillStyle = "#9e5670";
  c.fillRect(3, 3, 4, height - 6);
}

function drawTimeoutText(
  c: CanvasRenderingContext2D,
  hazard: TimeoutHazard,
  width: number,
) {
  const { fontSize, charWidth, height } = TIMEOUT_METRICS;
  c.font = `bold ${fontSize}px monospace`;
  c.textBaseline = "middle";
  const text = `await setTimeout(${hazard.durationMs});`;
  let x = (width - text.length * charWidth) / 2;
  for (const [word, color] of [
    ["await ", "#e5baff"],
    ["setTimeout", "#fff7ce"],
    ["(", "#ffcfb0"],
    [String(hazard.durationMs), "#ffbd80"],
    [");", "#ffcfb0"],
  ]) {
    c.fillStyle = color;
    c.fillText(word!, x, height / 2);
    x += word!.length * charWidth;
  }
  // oxlint-enable eslint/no-magic-numbers
}

export function createTimeoutMesh(hazard: TimeoutHazard) {
  const { fontSize, charWidth, widthPadding, height, depth } = TIMEOUT_METRICS;
  const width =
    `await setTimeout(${hazard.durationMs});`.length * charWidth + widthPadding;
  const canvas = timeoutCanvas(hazard);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.MeshToonMaterial({ map: texture });
  const side = new THREE.MeshToonMaterial({ color: "#df7456" });
  const group = new THREE.Group();
  group.name = "timeout-solid";
  group.userData.width = width;
  group.userData.height = height;
  group.userData.fontSize = fontSize;
  const mesh = new THREE.Mesh(
    loadGeometry("hazard-panel").scale(width, height, depth),
    [side, side, side, side, face, side],
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  group.add(timeoutTrail(width));

  return group;
}

function timeoutTrail(width: number) {
  const trail = new THREE.Mesh(
    loadGeometry("hazard-trail"),
    new THREE.MeshBasicMaterial({
      color: "#ff9975",
      transparent: true,
      opacity: 0.32,
    }),
  );
  trail.rotation.z = -Math.PI * HALF;
  trail.position.set(width * HALF + HAZARD.trailOffset, 0, HAZARD.trailDepth);

  return trail;
}
