import sceneData from "#root/src/game/scene/scene-settings.json";

export const INPUT = sceneData.INPUT;
export const MUZZLE_EVENTS = new Set([
  "shot",
  "missile",
  "grenade",
  "review",
  "lint",
]);
