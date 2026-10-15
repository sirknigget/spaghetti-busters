export { default as HUD } from "./ui-settings.json";

export const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
export const specialTypes = ["homing", "grenade", "review", "lint"] as const;
