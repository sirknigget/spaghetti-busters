import { type Block } from "./simulation";
import {
  HALF,
  DIAMETER,
  HEADER_HEIGHT,
  DECIMAL_PRECISION,
  DAMAGE_ENTROPY,
} from "./code-settings";
import { type FractureVisual } from "./code-visual";
import { chippedHole } from "./fracture-geometry";

// Canvas typography and window chrome are authored texture artwork in pixel coordinates.
// oxlint-disable eslint/no-magic-numbers
export function createCodeCanvas(block: Block) {
  const { width: w, height: h } = block;
  const top = h * HALF + HEADER_HEIGHT;
  const canvas = document.createElement("canvas");
  const scale = 2;
  // Pixel coordinates define the syntax-highlighted canvas texture, including window chrome.
  // oxlint-disable eslint/no-magic-numbers
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
  drawCodeTitle(context, block);
  drawWindowButtons(context, block);
  drawCodeCells(context, block);

  return canvas;
}

function drawCodeTitle(context: CanvasRenderingContext2D, block: Block) {
  const { width: w, height: h } = block;
  const titleSize = w < 260 ? 13 : 20;
  context.font = block.boss ? `bold ${titleSize}px monospace` : "9px monospace";
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
}

function drawWindowButtons(context: CanvasRenderingContext2D, block: Block) {
  const { width: w, height: h } = block;
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
}

function drawCodeCells(context: CanvasRenderingContext2D, block: Block) {
  context.font = "14px monospace";
  context.textAlign = "center";
  for (const cell of block.cells) {
    if (!cell.alive) {
      continue;
    }
    if (cell.magic) {
      context.fillStyle = "#ffe75b2b";
      context.fillRect(cell.x - 4.5, cell.y - 9, 9, 18);
    }
    context.fillStyle = cell.color;
    context.fillText(cell.char, cell.x, cell.y);
  }
}
// oxlint-enable eslint/no-magic-numbers

export function codePalette(block: Block) {
  if (block.boss) {
    return {
      body: "#2f202a",
      header: "#8b3329",
      edge: "#ffae59",
      side: "#bd492e",
      emissive: "#7c2314",
    };
  }
  if (block.angry) {
    return {
      body: "#421b2a",
      header: "#a23646",
      edge: "#ff9e8c",
      side: "#e95860",
      emissive: "#6a0f22",
    };
  }
  if (block.exception) {
    return {
      body: "#382335",
      header: "#73506a",
      edge: "#8ebebf",
      side: "#9d6387",
      emissive: "#000000",
    };
  }

  return {
    body: "#122d40",
    header: "#35556b",
    edge: "#8ebebf",
    side: "#547e92",
    emissive: "#000000",
  };
}

// Canvas crack strokes are authored texture artwork in pixel coordinates.
// oxlint-disable eslint/no-magic-numbers
export function addDamageScars(visual: FractureVisual, block: Block) {
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
  for (const cell of block.cells) {
    if (cell.alive && cell.health < cell.maxHealth) {
      const x = cell.x + visual.offset.x;
      const y = cell.y - visual.offset.y;
      const key = `${x}:${y}:${cell.health}`;
      if (visual.scars.has(key)) {
        continue;
      }
      visual.scars.add(key);
      drawCrack(context, x, y);
    }
  }
  context.restore();
}

function drawCrack(context: CanvasRenderingContext2D, x: number, y: number) {
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
// oxlint-enable eslint/no-magic-numbers

export function addRemovedCells(visual: FractureVisual, block: Block) {
  for (const cell of block.cells) {
    if (!cell.alive) {
      const x = cell.x + visual.offset.x;
      const y = -cell.y + visual.offset.y;
      const key = `${x.toFixed(DECIMAL_PRECISION)}:${y.toFixed(DECIMAL_PRECISION)}`;
      if (!visual.holes.has(key)) {
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
  }
}
