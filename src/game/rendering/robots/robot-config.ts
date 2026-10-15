import settings from "#root/src/game/rendering/robots/robot-config.json";

import type { RobotBrand } from "#root/src/game/simulation/enemies/simulation-robot-types.ts";

export type Brand = RobotBrand;
export type { RobotPose } from "#root/src/game/simulation/enemies/simulation-robot-types.ts";
export const ROBOT_MOTION = settings.ROBOT_MOTION;
export const LABEL_LAYOUT = settings.LABEL_LAYOUT;
export const names: Record<Brand, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  x: "X",
  moonshot: "Moonshot",
  zai: "Z.ai",
  deepseek: "DeepSeek",
  meta: "Meta",
};
