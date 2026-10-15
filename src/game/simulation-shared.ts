import { TUNING } from "./simulation-tuning";
import {
  type Block,
  type Pickup,
  type SpecialProjectile,
  type Weapon,
} from "./simulation-types";

export const HALF = 0.5;
export const FULL_TURN_RADIANS = Math.PI / HALF;
export const SQUARED = 2;
export const AMMO_CAPACITY_MULTIPLIER = 2;
export const HOMING_AMMO_PER_PICKUP = 2;
export const EXPLOSION_IMPULSE_FACTOR = 2;
// These literal millisecond choices are the hazard's displayed code payloads.
// oxlint-disable-next-line no-magic-numbers
export const HAZARD_DURATIONS_MS = [1200, 1600, 2000, 2400];

export const COLORS = {
  text: "#d6e2f0",
  keyword: "#bd9bff",
  string: "#b7e994",
  number: "#ffbc79",
  comment: "#6889a6",
  punctuation: "#7da6c6",
  magic: "#ffe270",
};
export const clamp = (v: number, low: number, high: number) =>
  Math.max(low, Math.min(high, v));

// Literal angular patterns form the weapon spread palette.
/* oxlint-disable no-magic-numbers */
export const WEAPON_SPREADS: Record<Weapon, number[]> = {
  single: [0],
  double: [-0.065, 0.065],
  triple: [-0.15, 0, 0.15],
  quad: [-0.18, -0.06, 0.06, 0.18],
  quint: [-0.22, -0.11, 0, 0.11, 0.22],
};

/* oxlint-enable no-magic-numbers */

export function bonusKeyword(roll: number): string | undefined {
  if (roll < TUNING.bonus.quintKeywordChance) {
    return "QUINT_SHOT";
  }
  if (roll < TUNING.bonus.quadKeywordChance) {
    return "QUAD_SHOT";
  }
  if (roll < TUNING.bonus.lintKeywordChance) {
    return "LINT_BOMB";
  }
  if (roll < TUNING.bonus.reviewKeywordChance) {
    return "CODE_REVIEW";
  }
  if (roll < TUNING.bonus.grenadeKeywordChance) {
    return "RECYCLE_GRENADE";
  }
  if (roll < TUNING.bonus.homingKeywordChance) {
    return "HOMING_MISSILE";
  }

  return undefined;
}

export function bonusType(roll: number): Pickup["type"] {
  if (roll < TUNING.bonus.homingDropChance) {
    return "homing";
  }
  if (roll < TUNING.bonus.grenadeDropChance) {
    return "grenade";
  }
  if (roll < TUNING.bonus.reviewDropChance) {
    return "review";
  }
  if (roll < TUNING.bonus.lintDropChance) {
    return "lint";
  }
  if (roll < TUNING.bonus.doubleDropChance) {
    return "double";
  }
  if (roll < TUNING.bonus.tripleDropChance) {
    return "triple";
  }
  if (roll < TUNING.bonus.quadDropChance) {
    return "quad";
  }

  return "quint";
}

export const CODE_KEYWORDS = new Set([
  "async",
  "await",
  "function",
  "return",
  "const",
  "let",
  "class",
  "private",
  "new",
  "extends",
  "infer",
  "type",
  "export",
  "default",
  "for",
  "any",
  "true",
  "false",
  "null",
  "undefined",
]);

export function quotedTokenEnd(line: string, start: number): number {
  for (let end = start + 1; end < line.length; end++) {
    if (line[end] === "\\") {
      end++;
    } else if (line[end] === line[start]) {
      return end + 1;
    }
  }

  return start + 1;
}

/** Scan once so malformed code strings cannot trigger regex backtracking. */
export function highlightLine(line: string): string[] {
  const colors = Array.from({ length: line.length }, () => COLORS.text);
  let start = 0;
  while (start < line.length) {
    let end = start + 1;
    let color = COLORS.text;
    if (line.startsWith("//", start)) {
      end = line.length;
      color = COLORS.comment;
    } else if (line[start] === '"' || line[start] === "'") {
      end = quotedTokenEnd(line, start);
      if (end > start + 1) {
        color = COLORS.string;
      }
    } else if (/\w/.test(line[start]!)) {
      while (end < line.length && /\w/.test(line[end]!)) {
        end++;
      }
      const token = line.slice(start, end);
      if (CODE_KEYWORDS.has(token)) {
        color = COLORS.keyword;
      } else if (/^\d+$/.test(token)) {
        color = COLORS.number;
      }
    } else if (/[{}()[\];.,?:=+!<>|]/.test(line[start]!)) {
      color = COLORS.punctuation;
    }
    colors.fill(color, start, end);
    start = end;
  }

  return colors;
}

export function withinProjectileBounds(projectile: SpecialProjectile): boolean {
  return (
    projectile.x > TUNING.bounds.specialMinX &&
    projectile.x < TUNING.bounds.specialMaxX &&
    projectile.y > TUNING.bounds.specialMinY &&
    projectile.y < TUNING.bounds.specialMaxY
  );
}

export function isSpentFragment(block: Block, remaining: number): boolean {
  return (
    !block.boss &&
    block.generation > 1 &&
    remaining < TUNING.damage.fragmentDeathCells
  );
}
