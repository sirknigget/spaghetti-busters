import { $, HUD, specialTypes } from "#root/src/ui-dom.ts";
import type { SimulationView } from "#root/src/game/simulation/common/simulation-context.ts";

export function updateHud(s: SimulationView) {
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

function updateBossHealth(s: SimulationView) {
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

function updateSpecialWeapons(s: SimulationView) {
  for (const type of specialTypes) {
    $(`#${type}-ammo`).textContent = String(s.player.specialAmmo[type]);

    const slot = $(`#select-${type}`);

    slot.classList.toggle("selected", s.player.specialWeapon === type);
    slot.classList.toggle("empty", s.player.specialAmmo[type] === 0);
    slot.setAttribute("aria-pressed", String(s.player.specialWeapon === type));
  }
}

function updateStatus(s: SimulationView) {
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

export function showRunResults(score: number, wave: number, best: number) {
  $("#menu-best").textContent = String(best).padStart(HUD.scoreDigits, "0");
  $("#overlay-eyebrow").textContent = "THE TECH DEBT GOT THROUGH";
  $("#overlay-title").innerHTML = "BUILD<br>FAILED.";
  $("#overlay-description").textContent =
    "A little spaghetti escaped. A fresh run awaits.";
  $("#results").innerHTML =
    `<div><span>CLEANUP SCORE</span><b>${String(score).padStart(HUD.scoreDigits, "0")}</b></div><div><span>WAVE REACHED</span><b>${String(wave).padStart(HUD.waveDigits, "0")}</b></div>`;
  $("#results").hidden = false;
  $("#resume").hidden = true;
  $("#game-overlay").hidden = false;
  $("#restart").focus();
}
