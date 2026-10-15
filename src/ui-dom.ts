export const HUD = {
  scoreDigits: 6,
  waveDigits: 2,
  bossAnnouncementMs: 1000,
  toastMs: 2500,
  percent: 100,
  lastWaveNameIndex: 4,
};

export const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
export const specialTypes = ["homing", "grenade", "review", "lint"] as const;
