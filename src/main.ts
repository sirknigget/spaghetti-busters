import "#root/src/style.css";
import { AudioEngine } from "#root/src/game/audio/audio.ts";
import type { GameController } from "#root/src/game/scene/scene.ts";

import { HUD, $, specialTypes } from "#root/src/ui-dom.ts";
import { menuMarkup } from "#root/src/menu-markup.ts";
import { eventMessages } from "#root/src/ui-event-messages.ts";
import { updateHud, showRunResults } from "#root/src/ui-hud.ts";
import { updateSoundControls } from "#root/src/ui-sound.ts";

let best = 0;

try {
  best = Number(localStorage.getItem("spaghetti-best")) || 0;
} catch {
  /* Private browsing remains playable. */
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = menuMarkup(best);

const audio = new AudioEngine();
let controller: GameController | undefined;
let starting = false;
let paused = false;
let finished = false;
let menuSoundUnlocked = false;
let toastTimeout: ReturnType<typeof setTimeout>;
let bossAnnouncementTimer: ReturnType<typeof setTimeout> | undefined;
let bossAnnouncementRemaining = 0;
let bossAnnounced = false;

function clearBossAnnouncement() {
  clearTimeout(bossAnnouncementTimer);
  bossAnnouncementTimer = undefined;
  bossAnnouncementRemaining = 0;
  $("#boss-announcement").hidden = true;
}

function announceBoss() {
  if (bossAnnounced) {
    return;
  }

  bossAnnounced = true;
  clearBossAnnouncement();
  clearTimeout(toastTimeout);
  $("#toast").classList.remove("visible");
  $("#boss-announcement").hidden = false;
  bossAnnouncementRemaining = HUD.bossAnnouncementMs;
  bossAnnouncementTimer = setTimeout(
    clearBossAnnouncement,
    HUD.bossAnnouncementMs,
  );
}

$("#enter").addEventListener("click", () => {
  audio.enterMenu();
  menuSoundUnlocked = true;
  $("#prelude").hidden = true;
  $("#menu").hidden = false;
  $("#opening-audio-status").textContent = "♫ OPENING THEME · SOUND ON";
  $("#start").focus();
});
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "#menu button, #help-dialog button",
)) {
  button.addEventListener("pointerenter", () => {
    if (menuSoundUnlocked) {
      audio.play("menu-hover");
    }
  });
  button.addEventListener("click", () => {
    if (menuSoundUnlocked) {
      audio.play("menu-click");
    }
  });
}

function showToast(message: string) {
  if (bossAnnouncementRemaining > 0) {
    return;
  }

  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(
    () => $("#toast").classList.remove("visible"),
    HUD.toastMs,
  );
}

function handleBossEvent(event: string) {
  if (event === "boss") {
    announceBoss();
  }

  if (event === "boss-defeated") {
    clearBossAnnouncement();
    $("#boss-health").hidden = true;
    showToast("FACTORY SHUT DOWN // BUILD APPROVED");
  }
}

function handleEvent(event: string) {
  if (event === "boss" && bossAnnounced) {
    return;
  }

  handleBossEvent(event);
  if (event !== "gameover") {
    audio.play(event === "shoot" ? "shot" : event);
  }

  const message = eventMessages.get(event);

  if (message) {
    showToast(message);
  }
}

function prepareStart() {
  starting = true;
  clearBossAnnouncement();
  bossAnnounced = false;
  $("#boss-health").hidden = true;
  $<HTMLDialogElement>("#help-dialog").close();
  $("#start").setAttribute("disabled", "");
  $("#start span").textContent = "LOADING THE CANNON…";
  audio.enterGame();
}

function beginRun() {
  $("#menu").hidden = true;
  $("#game-screen").hidden = false;
  $("#game-overlay").hidden = true;
  controller!.reset();
  controller!.setPaused(false);
  paused = finished = false;
  audio.resume();
  showToast("DON’T LET THE SPAGHETTI ESCAPE.");
}

async function start() {
  if (starting) {
    return;
  }

  prepareStart();
  try {
    const { createGame } = await import("#root/src/game/scene/scene.ts");

    controller ??= await createGame("game-canvas", {
      onState: (s) => {
        if (!s.isBossWave) {
          bossAnnounced = false;
        }

        updateHud(s);
        audio.setWave(s.progress.wave);
        $("#track-name").textContent = audio.trackName.toUpperCase();
      },
      onEvent: handleEvent,
      onGameOver: endRun,
    });
    beginRun();
  } catch (error) {
    console.error(error);
    $("#start span").textContent = "RETRY START ↗";
    $("#opening-audio-status").textContent =
      "3D COULD NOT START · CHECK WEBGL SUPPORT";
    audio.enterMenu();
  } finally {
    starting = false;
    $("#start").removeAttribute("disabled");
  }
}

function setPause(value: boolean) {
  if (!controller || finished || $("#game-screen").hidden) {
    return;
  }

  paused = value;
  controller.setPaused(value);
  $("#game-overlay").hidden = !value;
  $("#overlay-eyebrow").textContent = "TAKE A BREATHER";
  $("#overlay-title").innerHTML = "REFACTOR<br>PAUSED.";
  $("#overlay-description").textContent =
    "The spaghetti can wait. For a moment.";
  $("#results").hidden = true;
  $("#resume").hidden = false;
  if (value) {
    audio.pause();
    $("#resume").focus();
  } else {
    audio.resume();
  }
}

function endRun(score: number, wave: number) {
  clearBossAnnouncement();
  $("#boss-health").hidden = true;
  finished = true;
  controller?.setPaused(true);
  audio.finish();
  if (score > best) {
    best = score;
    try {
      localStorage.setItem("spaghetti-best", String(best));
    } catch {}
  }

  showRunResults(score, wave, best);
}

$("#start").addEventListener("click", () => {
  void start();
});
$("#help-play").addEventListener("click", () => {
  void start();
});
$("#help").addEventListener("click", () =>
  $<HTMLDialogElement>("#help-dialog").showModal(),
);
$("#close-help").addEventListener("click", () =>
  $<HTMLDialogElement>("#help-dialog").close(),
);
$<HTMLDialogElement>("#help-dialog").addEventListener("click", (e) => {
  if (e.target === $<HTMLDialogElement>("#help-dialog")) {
    $<HTMLDialogElement>("#help-dialog").close();
  }
});
$("#pause").addEventListener("click", () => setPause(!paused));
$("#resume").addEventListener("click", () => setPause(false));
$("#restart").addEventListener("click", () => {
  void start();
});
for (const type of specialTypes) {
  $(`#select-${type}`).addEventListener("click", () =>
    controller?.selectSpecial(type),
  );
}

$("#fire-special").addEventListener("click", () => controller?.fireSpecial());
$("#quit").addEventListener("click", () => {
  clearBossAnnouncement();
  $("#boss-health").hidden = true;
  controller?.setPaused(true);
  $("#game-screen").hidden = true;
  $("#menu").hidden = false;
  audio.enterMenu();
  $("#start span").textContent = "LET’S BUST SOME CODE";
  $("#start").focus();
});
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-sound]",
)) {
  button.addEventListener("click", () => {
    audio.setEnabled(!audio.enabled);
    updateSoundControls(audio.enabled);
  });
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Escape" || e.code === "KeyP") {
    if ($<HTMLDialogElement>("#help-dialog").open) {
      return;
    }

    e.preventDefault();
    setPause(!paused);
  }
});
$("#game-canvas").addEventListener("game-context-lost", () => {
  setPause(true);
  $("#overlay-description").textContent =
    "Graphics paused while the 3D view reconnects.";
  $<HTMLButtonElement>("#resume").disabled = true;
});
$("#game-canvas").addEventListener("game-context-restored", () => {
  $("#overlay-description").textContent =
    "The 3D view is ready. Back to busting.";
  $<HTMLButtonElement>("#resume").disabled = false;
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audio.pause();
    setPause(true);
  } else if (!$("#menu").hidden && menuSoundUnlocked) {
    audio.enterMenu();
  }
});
