export type RobotBrand =
  | "openai"
  | "anthropic"
  | "google"
  | "x"
  | "moonshot"
  | "zai"
  | "deepseek"
  | "meta";

export interface RobotPose {
  brand: RobotBrand;
  state: "running" | "thinking" | "leaving";
  age: number;
  stateTime: number;
  hitFlash: number;
  health: number;
  maxHealth: number;
}
