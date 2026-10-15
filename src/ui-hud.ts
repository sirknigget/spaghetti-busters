import { $, HUD, specialTypes } from "./ui-dom";
import type { Simulation } from "./game/simulation";

export function updateHud(s: Simulation) {
  $("#score").textContent = String(s.progress.score).padStart(
    HUD.scoreDigits,
    "0",
  );

  updateBossHealth(s);
  const waveNames = [
    "THE LEGACY BEGINS",
    "CALLBACK CATASTROPHE",
    "DEPENDENCY HELL",
    "ENTERPRISE EDITION",
    "PRODUCTION IS ON FIRE",
  ];
  $("#wave").innerHTML =
    `${String(s.progress.wave).padStart(HUD.waveDigits, "0")} <small>/ ${s.isBossWave ? "FACTORYFACTORYFACTORY" : waveNames[Math.min(s.progress.wave - 1, HUD.lastWaveNameIndex)]}</small>`;
  $("#combo").textContent =
    s.progress.combo > 1
      ? `${s.progress.combo}× COMBO · KEEP IT CLEAN`
      : "READY TO REFACTOR";
  $("#weapon").textContent = `${s.player.weapon.toUpperCase()} SHOT`;
  $("#ammo").textContent =
    s.player.weapon === "single"
      ? "∞ UNLIMITED AMMO"
      : `${s.player.ammo} ROUNDS REMAINING`;
  updateSpecialWeapons(s);
  updateStatus(s);
}

function updateBossHealth(s: Simulation) {
  const bossHealth = s.bossHealth;
  $("#boss-health").hidden = !bossHealth || bossHealth.current <= 0;
  if (bossHealth) {
    const healthPercent = Math.max(
      0,
      Math.min(
        HUD.percent,
        (bossHealth.current / Math.max(1, bossHealth.max)) * HUD.percent,
      ),
    );
    $("#boss-health-value").textContent =
      `${Math.ceil(bossHealth.current)} / ${Math.ceil(bossHealth.max)}`;
    $("#boss-health-fill").style.width = `${healthPercent}%`;
    $("#boss-health-meter").setAttribute(
      "aria-valuenow",
      String(Math.round(healthPercent)),
    );
  }
}

function updateSpecialWeapons(s: Simulation) {
  for (const type of specialTypes) {
    $(`#${type}-ammo`).textContent = String(s.player.specialAmmo[type]);
    const slot = $(`#select-${type}`);
    slot.classList.toggle("selected", s.player.specialWeapon === type);
    slot.classList.toggle("empty", s.player.specialAmmo[type] === 0);
    slot.setAttribute("aria-pressed", String(s.player.specialWeapon === type));
  }
}

function updateStatus(s: Simulation) {
  $("#game-screen").classList.toggle("stunned", s.isStunned);
  $("#game-screen").classList.toggle("reviewing", s.player.freezeRemaining > 0);
  if (s.player.freezeRemaining > 0) {
    $("#combo").textContent =
      `ENEMIES FROZEN · ${s.player.freezeRemaining.toFixed(1)}s`;
  }
  if (s.isStunned) {
    $("#combo").textContent =
      `EVENT LOOP BLOCKED · ${s.player.stunRemaining.toFixed(1)}s`;
  }
  $<HTMLButtonElement>("#fire-special").disabled =
    s.isStunned || s.player.specialAmmo[s.player.specialWeapon] === 0;
}
