import settings from "./robot-config.json";

export type Brand =
  | "openai"
  | "anthropic"
  | "google"
  | "x"
  | "moonshot"
  | "zai"
  | "deepseek"
  | "meta";
export interface RobotPose {
  brand: Brand;
  state: "running" | "thinking" | "leaving";
  age: number;
  stateTime: number;
  hitFlash: number;
  health: number;
  maxHealth: number;
}
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
