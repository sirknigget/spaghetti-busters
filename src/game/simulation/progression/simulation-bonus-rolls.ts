import { TUNING } from "#root/src/game/simulation/simulation-tuning.ts";
import type { Pickup } from "#root/src/game/simulation/simulation-types.ts";

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
