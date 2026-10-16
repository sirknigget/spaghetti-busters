import {
  COLORS,
  highlightLine,
} from "#root/src/game/simulation/blocks/simulation-highlight.ts";
import { HALF } from "#root/src/game/simulation/common/simulation-math.ts";
import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import {
  type Cell,
  type Magic,
  CELL_HEIGHT,
  CELL_WIDTH,
} from "#root/src/game/simulation/simulation-types.ts";

const MAGIC_KEYWORDS = [
  ["DOUBLE_SHOT", "double"],
  ["TRIPLE_SHOT", "triple"],
  ["QUAD_SHOT", "quad"],
  ["QUINT_SHOT", "quint"],
  ["HOMING_MISSILE", "homing"],
  ["RECYCLE_GRENADE", "grenade"],
  ["CODE_REVIEW", "review"],
  ["LINT_BOMB", "lint"],
  ["AMMO_CACHE", "ammo"],
] as const;

export interface CellLayout {
  id: number;
  width: number;
  height: number;
  toughness: number;
}

interface MagicRange {
  start: number;
  end: number;
  type: Magic;
  id: string;
}

function lineMagics(line: string, id: number, row: number): MagicRange[] {
  const ranges: MagicRange[] = [];

  for (const [keyword, type] of MAGIC_KEYWORDS) {
    const start = line.indexOf(keyword);

    if (start >= 0) {
      ranges.push({
        start,
        end: start + keyword.length,
        type,
        id: `${id}:${row}:${start}`,
      });
    }
  }

  return ranges;
}

function rowCells(layout: CellLayout, row: number, line: string): Cell[] {
  const colorAt = highlightLine(line);
  const magics = lineMagics(line, layout.id, row);
  const cells: Cell[] = [];

  for (const [column, char] of Array.from(line).entries()) {
    if (char === " ") {
      continue;
    }

    const magic = magics.find(
      (item) => column >= item.start && column < item.end,
    );

    cells.push({
      x: column * CELL_WIDTH - layout.width * HALF + TUNING.block.textOffsetX,
      y: row * CELL_HEIGHT - layout.height * HALF + TUNING.block.textOffsetY,
      char,
      color: magic ? COLORS.magic : colorAt[column]!,
      alive: true,
      health: layout.toughness,
      maxHealth: layout.toughness,
      magic: magic?.type,
      magicId: magic?.id,
    });
  }

  return cells;
}

export function blockCells(layout: CellLayout, code: string[]): Cell[] {
  return code.flatMap((line, row) => rowCells(layout, row, line));
}
