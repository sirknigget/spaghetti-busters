import crackArtwork from "#root/src/game/code/assets/code-cracks.svg?raw";
import { PALETTE } from "#root/src/game/palette.ts";
import { type Block } from "#root/src/game/simulation/simulation-types.ts";
import {
  HALF,
  DIAMETER,
  HEADER_HEIGHT,
  DECIMAL_PRECISION,
  DAMAGE_ENTROPY,
} from "#root/src/game/code/common/code-settings.ts";
import { type FractureVisual } from "#root/src/game/code/common/code-visual.ts";
import { chippedHole } from "#root/src/game/geometry/fracture/fracture-geometry.ts";

const HEADER_EDGE_THICKNESS = 1.5;
const BOSS_FRAGMENT_WIDTH = 260;
const BOSS_FRAGMENT_FONT_SIZE = 13;
const BOSS_FONT_SIZE = 20;
const ANGRY_TITLE_INSET = 110;
const NORMAL_TITLE_INSET = 66;
const TITLE_X_INSET = 34;
const TITLE_Y_INSET = 13;
const MINIMUM_TITLE_WIDTH = 15;
const BOSS_TITLE_INSET = 86;
const BUTTON_X_INSET = 10;
const BUTTON_SPACING = 9;
const BUTTON_RADIUS = 2.4;
const MAGIC_HALF_WIDTH = 4.5;
const MAGIC_HALF_HEIGHT = 9;
const MAGIC_WIDTH = 9;
const MAGIC_HEIGHT = 18;
const CRACK_HIGHLIGHT_WIDTH = 0.75;
const CRACK_SHADOW_WIDTH = 0.5;

// Canvas typography and window chrome are authored texture artwork in pixel coordinates.
export function createCodeCanvas(block: Block) {
  const { width: w, height: h } = block;
  const top = h * HALF + HEADER_HEIGHT;
  const canvas = document.createElement("canvas");
  const scale = DIAMETER;

  // Pixel coordinates define the syntax-highlighted canvas texture, including window chrome.
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil((h + HEADER_HEIGHT) * scale);

  const context = canvas.getContext("2d")!;

  context.scale(scale, scale);
  context.translate(w * HALF, top);

  const palette = codePalette(block);

  context.fillStyle = palette.body;
  context.fillRect(-w * HALF, -top, w, h + HEADER_HEIGHT);
  context.fillStyle = palette.header;
  context.fillRect(-w * HALF, -top, w, HEADER_HEIGHT);
  context.fillStyle = palette.edge;
  context.fillRect(-w * HALF, -top, w, HEADER_EDGE_THICKNESS);
  drawCodeTitle(context, block);
  drawWindowButtons(context, block);
  drawCodeCells(context, block);

  return canvas;
}

function titleTypography(block: Block) {
  const w = block.width;
  const titleSize =
    w < BOSS_FRAGMENT_WIDTH ? BOSS_FRAGMENT_FONT_SIZE : BOSS_FONT_SIZE;
  const bossTitle =
    w < BOSS_FRAGMENT_WIDTH ? "F³ // FRAGMENT" : "FactoryFactoryFactory";

  return {
    font: block.boss ? `bold ${titleSize}px monospace` : "9px monospace",
    title: block.boss ? bossTitle : block.title,
  };
}

function drawCodeTitle(context: CanvasRenderingContext2D, block: Block) {
  const { width: w, height: h } = block;
  const { font, title } = titleTypography(block);

  context.font = font;
  context.textBaseline = "middle";
  context.fillStyle = block.boss ? PALETTE.boss.title : PALETTE.code.title;

  const titleInset = block.angry ? ANGRY_TITLE_INSET : NORMAL_TITLE_INSET;

  context.fillText(
    title,
    -w * HALF + TITLE_X_INSET,
    -h * HALF - TITLE_Y_INSET,
    Math.max(
      MINIMUM_TITLE_WIDTH,
      w - (block.boss ? BOSS_TITLE_INSET : titleInset),
    ),
  );
}

function drawWindowButtons(context: CanvasRenderingContext2D, block: Block) {
  const { width: w, height: h } = block;

  for (const [i, color] of [
    PALETTE.code.close,
    PALETTE.code.minimize,
    PALETTE.code.maximize,
  ].entries()) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(
      -w * HALF + BUTTON_X_INSET + i * BUTTON_SPACING,
      -h * HALF - TITLE_Y_INSET,
      BUTTON_RADIUS,
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
      context.fillStyle = PALETTE.code.magicHighlight;
      context.fillRect(
        cell.x - MAGIC_HALF_WIDTH,
        cell.y - MAGIC_HALF_HEIGHT,
        MAGIC_WIDTH,
        MAGIC_HEIGHT,
      );
    }

    context.fillStyle = cell.color;
    context.fillText(cell.char, cell.x, cell.y);
  }
}

interface SurfacePalette {
  body: string;
  header: string;
  side: string;
  edge?: string;
  emissive?: string;
}

export function codePalette(block: Block) {
  const palette = surfacePalette(block);

  return {
    body: palette.body,
    header: palette.header,
    edge: palette.edge ?? PALETTE.code.edge,
    side: palette.side,
    emissive: palette.emissive ?? PALETTE.common.black,
  };
}

function surfacePalette(block: Block): SurfacePalette {
  if (block.boss) {
    return PALETTE.boss;
  }

  if (block.angry) {
    return PALETTE.angry;
  }

  return block.exception ? PALETTE.exception : PALETTE.code;
}

// Canvas crack strokes are authored texture artwork in pixel coordinates.
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
    (visual.height * HALF + HEADER_HEIGHT) * scale,
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
  const [highlight, shadow] = getCrackPaths();

  context.save();
  context.translate(x, y);
  context.lineWidth = CRACK_HIGHLIGHT_WIDTH;
  context.strokeStyle = PALETTE.code.scar;
  context.stroke(highlight);
  context.lineWidth = CRACK_SHADOW_WIDTH;
  context.strokeStyle = PALETTE.code.scarShadow;
  context.stroke(shadow);
  context.restore();
}

let crackPaths: Path2D[] | undefined;

function getCrackPaths() {
  if (!crackPaths) {
    const document = new DOMParser().parseFromString(
      crackArtwork,
      "image/svg+xml",
    );

    crackPaths = [...document.querySelectorAll("path")].map(
      (path) => new Path2D(path.getAttribute("d")!),
    );
  }

  return crackPaths;
}

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
