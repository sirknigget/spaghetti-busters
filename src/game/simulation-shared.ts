import weaponPatterns from "./weapon-patterns.json";
import { PALETTE } from "./palette";
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
export const HAZARD_DURATIONS_MS = weaponPatterns.HAZARD_DURATIONS_MS;

export const COLORS = {
  text: PALETTE.syntax.text,
  keyword: PALETTE.syntax.keyword,
  string: PALETTE.syntax.string,
  number: PALETTE.syntax.number,
  comment: PALETTE.syntax.comment,
  punctuation: PALETTE.syntax.punctuation,
  magic: PALETTE.particles.magic,
};
export const clamp = (v: number, low: number, high: number) =>
  Math.max(low, Math.min(high, v));

// Literal angular patterns form the weapon spread palette.
export const WEAPON_SPREADS: Record<Weapon, number[]> =
  weaponPatterns.WEAPON_SPREADS;

const BONUS_KEYWORDS: [number, string][] = [
  [TUNING.bonus.quintKeywordChance, "QUINT_SHOT"],
  [TUNING.bonus.quadKeywordChance, "QUAD_SHOT"],
  [TUNING.bonus.lintKeywordChance, "LINT_BOMB"],
  [TUNING.bonus.reviewKeywordChance, "CODE_REVIEW"],
  [TUNING.bonus.grenadeKeywordChance, "RECYCLE_GRENADE"],
  [TUNING.bonus.homingKeywordChance, "HOMING_MISSILE"],
];
const BONUS_TYPES: [number, Pickup["type"]][] = [
  [TUNING.bonus.homingDropChance, "homing"],
  [TUNING.bonus.grenadeDropChance, "grenade"],
  [TUNING.bonus.reviewDropChance, "review"],
  [TUNING.bonus.lintDropChance, "lint"],
  [TUNING.bonus.doubleDropChance, "double"],
  [TUNING.bonus.tripleDropChance, "triple"],
  [TUNING.bonus.quadDropChance, "quad"],
];

export function bonusKeyword(roll: number): string | undefined {
  return BONUS_KEYWORDS.find(([threshold]) => roll < threshold)?.[1];
}

export function bonusType(roll: number): Pickup["type"] {
  return BONUS_TYPES.find(([threshold]) => roll < threshold)?.[1] ?? "quint";
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

function highlightWord(line: string, start: number) {
  let end = start + 1;
  while (end < line.length && /\w/.test(line[end]!)) {
    end++;
  }
  const token = line.slice(start, end);
  let color: string = COLORS.text;
  if (CODE_KEYWORDS.has(token)) {
    color = COLORS.keyword;
  } else if (/^\d+$/.test(token)) {
    color = COLORS.number;
  }

  return { end, color };
}

function highlightQuote(line: string, start: number) {
  const end = quotedTokenEnd(line, start);

  return { end, color: end > start + 1 ? COLORS.string : COLORS.text };
}

function highlightToken(line: string, start: number) {
  if (line.startsWith("//", start)) {
    return { end: line.length, color: COLORS.comment };
  }
  if (line[start] === '"' || line[start] === "'") {
    return highlightQuote(line, start);
  }
  if (/\w/.test(line[start]!)) {
    return highlightWord(line, start);
  }
  if (/[{}()[\];.,?:=+!<>|]/.test(line[start]!)) {
    return { end: start + 1, color: COLORS.punctuation };
  }

  return { end: start + 1, color: COLORS.text };
}

/** Scan once so malformed code strings cannot trigger regex backtracking. */
export function highlightLine(line: string): string[] {
  const colors: string[] = Array.from(
    { length: line.length },
    () => COLORS.text,
  );
  let start = 0;
  while (start < line.length) {
    const { end, color } = highlightToken(line, start);
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
