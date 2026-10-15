import settings from "./robot-config.json";

import type { RobotBrand } from "./robot-types";

export type Brand = RobotBrand;
export type { RobotPose } from "./robot-types";
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
