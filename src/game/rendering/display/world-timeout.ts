import { PALETTE } from "#root/src/game/palette.ts";
import * as THREE from "three";
import { loadGeometry } from "#root/src/game/graphics/model-assets.ts";
import {
  TIMEOUT_METRICS,
  type TimeoutHazard,
} from "#root/src/game/simulation/simulation.ts";
import { HALF, HAZARD } from "#root/src/game/rendering/world-settings.ts";

const CANVAS_SCALE = 3;
const FRAME_WIDTH = 2.5;
const FRAME_INSET = 1.25;
const STRIPE_INSET = 3;
const STRIPE_WIDTH = 4;
const STRIPE_VERTICAL_INSET = 6;

const TRAIL_OPACITY = 0.32;

function timeoutCanvas(hazard: TimeoutHazard) {
  const text = `await setTimeout(${hazard.durationMs});`;
  const { charWidth, widthPadding, height } = TIMEOUT_METRICS;
  const width = text.length * charWidth + widthPadding;
  const canvas = document.createElement("canvas");

  // Authored canvas typography uses pixel coordinates and supersampling.
  canvas.width = width * CANVAS_SCALE;
  canvas.height = height * CANVAS_SCALE;

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
  c.scale(CANVAS_SCALE, CANVAS_SCALE);
  c.fillStyle = PALETTE.timeout.panel;
  c.fillRect(0, 0, width, height);
  c.strokeStyle = PALETTE.timeout.border;
  c.lineWidth = FRAME_WIDTH;
  c.strokeRect(
    FRAME_INSET,
    FRAME_INSET,
    width - FRAME_WIDTH,
    height - FRAME_WIDTH,
  );
  c.fillStyle = PALETTE.timeout.bar;
  c.fillRect(
    STRIPE_INSET,
    STRIPE_INSET,
    STRIPE_WIDTH,
    height - STRIPE_VERTICAL_INSET,
  );
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
  let x = (width - text.length * charWidth) * HALF;

  for (const [word, color] of [
    ["await ", PALETTE.timeout.keyword],
    ["setTimeout", PALETTE.timeout.identifier],
    ["(", PALETTE.timeout.punctuation],
    [String(hazard.durationMs), PALETTE.timeout.number],
    [");", PALETTE.timeout.punctuation],
  ]) {
    c.fillStyle = color;
    c.fillText(word!, x, height * HALF);
    x += word!.length * charWidth;
  }
}

export function createTimeoutMesh(hazard: TimeoutHazard) {
  const { fontSize, charWidth, widthPadding, height, depth } = TIMEOUT_METRICS;
  const width =
    `await setTimeout(${hazard.durationMs});`.length * charWidth + widthPadding;
  const canvas = timeoutCanvas(hazard);
  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;

  const face = new THREE.MeshToonMaterial({ map: texture });
  const side = new THREE.MeshToonMaterial({ color: PALETTE.timeout.side });
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
      color: PALETTE.timeout.trail,
      transparent: true,
      opacity: TRAIL_OPACITY,
    }),
  );

  trail.rotation.z = -Math.PI * HALF;
  trail.position.set(width * HALF + HAZARD.trailOffset, 0, HAZARD.trailDepth);

  return trail;
}
