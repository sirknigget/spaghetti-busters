import "./style.css";
import { AudioEngine } from "./game/audio";
import type { GameController } from "./game/scene";

const HUD = {
  scoreDigits: 6,
  waveDigits: 2,
  bossAnnouncementMs: 1000,
  toastMs: 2500,
  percent: 100,
  lastWaveNameIndex: 4,
};

const bolt =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 2-9 12h6l-1 8 9-13h-6l1-7Z" fill="currentColor" stroke="currentColor" stroke-linejoin="round"/></svg>';
const audioIcon =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const recycleIcon =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M9 3h6l1 3H8l1-3ZM6 6l1 15h10l1-15M10 10v7m4-7v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const reviewIcon =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h10v18H4V6h3V3Zm0 0v4h10M8 12l2 2 4-4M8 18h5m5-8 3 3-3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const lintIcon =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 5 2-2 2 2-2 3m-3-1a8 8 0 1 0 5 5m-4-9 3-2m1 8 3-1M5 13l4 3 5-6M20 3l2-1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const specialTypes = ["homing", "grenade", "review", "lint"] as const;
let best = 0;
try {
  best = Number(localStorage.getItem("spaghetti-best")) || 0;
} catch {
  /* Private browsing remains playable. */
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <section id="prelude" class="prelude-screen" aria-label="Enter Spaghetti Busters"><button id="enter" class="entry-button" autofocus>Click to play</button></section>
  <main id="menu" class="menu-screen" hidden>
    <div class="photo-backdrop"></div><div class="menu-grain"></div>
    <header class="site-header">
      <a class="brand" href="/" aria-label="Spaghetti Busters home"><span class="brand-symbol">{${bolt}}</span><span>SPAGHETTI<br>BUSTERS<span class="brand-dot">®</span></span></a>
      <div class="header-right"><span class="edition" id="opening-audio-status">♫ OPENING THEME · SOUND ON</span><button class="sound-button" data-sound aria-label="Turn sound off">${audioIcon}<span>SOUND ON</span></button></div>
    </header>
    <div class="hero-art" aria-hidden="true"></div>
    <div class="orbit-label" aria-hidden="true"><span class="live-dot"></span> TECH DEBT DETECTED <span>↙</span></div>
    <section class="hero-copy">
      <div class="eyebrow"><span class="tiny-star">✳</span> LESS MESS. MORE MAYHEM.</div>
      <h1><span>SPAGHETTI</span><span class="title-second">BUSTERS<span class="title-period">.</span></span></h1>
      <div class="tagline">Clean code. <span>Dirty work.</span></div>
      <p class="hero-description">The codebase is out of control.<br>You're the specialist. Bring a bigger cannon.</p>
      <div class="menu-actions"><button id="start" class="primary-button"><span>LET’S BUST SOME CODE</span><span class="button-arrow">↗</span></button><button id="help" class="help-button" aria-label="Help: how to play">HOW TO PLAY <span>?</span></button></div>
      <div class="hero-meta"><span><i class="live-dot"></i> INFINITE BAD CODE. ONE GOOD DEVELOPER.</span><span>BEST <b id="menu-best">${String(best).padStart(HUD.scoreDigits, "0")}</b></span></div>
    </section>
    <div class="art-caption" aria-hidden="true"><span>MEET YOUR CODE QUALITY SPECIALIST</span><span>WHITE SUIT. ZERO MERCY. ↗</span></div>
    <footer class="menu-footer"><span class="footer-pill">THE MISSION</span><span>BLAST THE BLOAT.</span><i>✳</i><span>BREAK THE BLOCKS.</span><i>✳</i><span>SHIP CLEAN.</span><span class="footer-version">v2.0 <span> / </span> BUILT TO BREAK THINGS</span></footer>
  </main>
  <section id="game-screen" class="game-screen" hidden aria-label="Spaghetti Busters game">
    <div id="game-canvas"></div>
    <div class="orientation-hint"><span>↻</span><div>MORE ROOM FOR MAYHEM<small>Rotate your phone to landscape.</small></div></div>
    <header class="game-hud"><div class="hud-brand">{${bolt}}<span>SPAGHETTI<br>BUSTERS</span></div><div class="score-group"><span class="hud-label">CLEANUP SCORE</span><strong id="score">000000</strong><span id="combo" class="combo">READY TO REFACTOR</span></div><div class="wave-group"><span class="hud-label">CURRENT WAVE</span><strong id="wave">01 <small>/ THE LEGACY BEGINS</small></strong></div><div class="hud-actions"><button data-sound class="icon-button" aria-label="Turn sound off">${audioIcon}</button><button id="pause" class="icon-button" aria-label="Pause game"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg></button></div></header>
    <div id="boss-health" class="boss-health" hidden><div class="boss-health-label"><span>FactoryFactoryFactory</span><span id="boss-health-value"></span></div><div id="boss-health-meter" class="boss-health-meter" role="progressbar" aria-label="FactoryFactoryFactory health" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span id="boss-health-fill"></span></div></div>
    <div id="boss-announcement" class="boss-announcement" role="status" hidden><div class="boss-announcement-card"><h2>Boss fight - <strong>FactoryFactoryFactory</strong> is pushed to main!</h2></div></div>
    <div class="weapon-hud"><div class="weapon-icon">${bolt}</div><div><span class="hud-label">ACTIVE WEAPON</span><strong id="weapon">SINGLE SHOT</strong><span id="ammo">∞ UNLIMITED AMMO</span></div></div>
    <div class="special-hud" aria-label="Special weapons"><div class="special-caption">RIGHT CLICK TO LAUNCH <span> / </span> <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> TO SELECT</div><div class="special-slots"><button id="select-homing" class="special-slot selected" aria-label="Select backspace homing missiles" aria-pressed="true"><kbd>1</kbd><span class="backspace-icon">⌫</span><span class="special-name">BACKSPACE<small>HOMING MISSILE</small></span><b id="homing-ammo">3</b></button><button id="select-grenade" class="special-slot" aria-label="Select recycle bin grenades" aria-pressed="false"><kbd>2</kbd>${recycleIcon}<span class="special-name">RECYCLE BIN<small>AREA GRENADE</small></span><b id="grenade-ammo">2</b></button><button id="select-review" class="special-slot" aria-label="Select code review freeze gun" aria-pressed="false"><kbd>3</kbd>${reviewIcon}<span class="special-name">CODE REVIEW<small>FREEZE · 2 SECONDS</small></span><b id="review-ammo">1</b></button><button id="select-lint" class="special-slot" aria-label="Select lint bomb" aria-pressed="false"><kbd>4</kbd>${lintIcon}<span class="special-name">LINT BOMB<small>SPLIT BIG · CLEAR SMALL</small></span><b id="lint-ammo">1</b></button><button id="fire-special" aria-label="Fire selected special weapon">${bolt}<span>FIRE</span></button></div></div>
    <div class="game-instruction">MOVE TO AIM <span>·</span> LEFT CLICK TO FIRE <span>·</span> <kbd>P</kbd> PAUSE</div>
    <div class="now-playing">♫ <span id="track-name">PRISM CIRCUIT</span></div>
    <div id="toast" class="game-toast" role="status"></div>
    <div id="game-overlay" class="game-overlay" hidden><div class="overlay-card"><span class="eyebrow" id="overlay-eyebrow">TAKE A BREATHER</span><h2 id="overlay-title">REFACTOR<br>PAUSED.</h2><p id="overlay-description">The spaghetti can wait. For a moment.</p><div id="results" hidden></div><button id="resume" class="primary-button">BACK TO BUSTING <span>↗</span></button><button id="restart" class="secondary-button">START A FRESH RUN ↻</button><button id="quit" class="text-button">BACK TO MAIN MENU</button></div></div>
  </section>
  <dialog id="help-dialog"><button id="close-help" class="close-button" aria-label="Close help">×</button><span class="eyebrow">A QUICK FIELD GUIDE</span><h2>MAKE A MESS.<br>CLEAN THE CODE.</h2><p class="help-intro">Keep every last chunk from escaping through the left edge. Each wave brings more, bigger, tougher code.</p><div class="help-steps"><div><span>01</span><p><b>POINT. HOLD. OBLITERATE.</b>Move your mouse to aim and hold left click to fire. On touchscreens, drag and hold. <kbd>↑</kbd> <kbd>↓</kbd> + <kbd>SPACE</kbd> work too.</p></div><div><span>02</span><p><b>BRING OUT THE HEAVY REFACTORING.</b>Press <kbd>1</kbd> for backspace missiles that home on the leftmost code, <kbd>2</kbd> for recycle-bin grenades with a large blast radius, <kbd>3</kbd> for the code review gun, or <kbd>4</kbd> for the lint bomb. <b class="inline-emphasis">Right click</b> fires the selected special. On touchscreens, choose a slot and tap FIRE. Review freezes all enemies for 2 seconds; lint splits big blocks in half and destroys small ones. All four drop as bonuses.</p></div><div><span>03</span><p><b>MAKE EVERY UPGRADE COUNT.</b>Hit <code>DOUBLE_SHOT</code> or <code>TRIPLE_SHOT</code> variables, then shoot the floating weapon to equip it. Rarer <code>QUAD_SHOT</code> and <code>QUINT_SHOT</code> guns fire 4 or 5 shots. Hit <code>AMMO_CACHE</code> to reload. Special-weapon variables release bonus ammo too.</p></div><div><span>04</span><p><b>DON’T BLOCK THE EVENT LOOP.</b>Fast red <code>await setTimeout(…);</code> hazards hunt the specialist. Shoot them down or dodge vertically. A collision freezes movement and every weapon for the shown duration.</p></div><div><span>05</span><p><b>THE MACHINES KEEP SHIPPING.</b>Heavily armored AI robots take 15 cannon hits to destroy. They run to the middle, think, and generate huge code blocks. Destroy them before they ship. Red, rattling angry code throws smaller exception blocks: clean up the parent and every exception. Every 5 levels, face <code>FactoryFactoryFactory</code>: a boss that keeps manufacturing more bad code.</p></div></div><div class="help-bottom"><span>Split the blocks. Finish every fragment.</span><button id="help-play" class="primary-button">GOT IT. LET’S GO ↗</button></div></dialog>
`;

const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
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

async function start() {
  if (starting) {
    return;
  }
  starting = true;
  clearBossAnnouncement();
  bossAnnounced = false;
  $("#boss-health").hidden = true;
  $<HTMLDialogElement>("#help-dialog").close();
  $("#start").setAttribute("disabled", "");
  $("#start span").textContent = "LOADING THE CANNON…";
  audio.enterGame();
  try {
    const { createGame } = await import("./game/scene");
    controller ??= await createGame("game-canvas", {
      onState: (s) => {
        $("#score").textContent = String(s.score).padStart(
          HUD.scoreDigits,
          "0",
        );
        if (!s.isBossWave) {
          bossAnnounced = false;
        }
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
        const waveNames = [
          "THE LEGACY BEGINS",
          "CALLBACK CATASTROPHE",
          "DEPENDENCY HELL",
          "ENTERPRISE EDITION",
          "PRODUCTION IS ON FIRE",
        ];
        $("#wave").innerHTML =
          `${String(s.wave).padStart(HUD.waveDigits, "0")} <small>/ ${s.isBossWave ? "FACTORYFACTORYFACTORY" : waveNames[Math.min(s.wave - 1, HUD.lastWaveNameIndex)]}</small>`;
        $("#combo").textContent =
          s.combo > 1
            ? `${s.combo}× COMBO · KEEP IT CLEAN`
            : "READY TO REFACTOR";
        $("#weapon").textContent = `${s.weapon.toUpperCase()} SHOT`;
        $("#ammo").textContent =
          s.weapon === "single"
            ? "∞ UNLIMITED AMMO"
            : `${s.ammo} ROUNDS REMAINING`;
        for (const type of specialTypes) {
          $(`#${type}-ammo`).textContent = String(s.specialAmmo[type]);
          const slot = $(`#select-${type}`);
          slot.classList.toggle("selected", s.specialWeapon === type);
          slot.classList.toggle("empty", s.specialAmmo[type] === 0);
          slot.setAttribute("aria-pressed", String(s.specialWeapon === type));
        }
        $("#game-screen").classList.toggle("stunned", s.isStunned);
        $("#game-screen").classList.toggle("reviewing", s.freezeRemaining > 0);
        if (s.freezeRemaining > 0) {
          $("#combo").textContent =
            `ENEMIES FROZEN · ${s.freezeRemaining.toFixed(1)}s`;
        }
        if (s.isStunned) {
          $("#combo").textContent =
            `EVENT LOOP BLOCKED · ${s.stunRemaining.toFixed(1)}s`;
        }
        $<HTMLButtonElement>("#fire-special").disabled =
          s.isStunned || s.specialAmmo[s.specialWeapon] === 0;
        audio.setWave(s.wave);
        $("#track-name").textContent = audio.trackName.toUpperCase();
      },
      onEvent: (event) => {
        if (event === "boss" && bossAnnounced) {
          return;
        }
        if (event === "boss") {
          announceBoss();
        }
        if (event === "boss-defeated") {
          clearBossAnnouncement();
          $("#boss-health").hidden = true;
          showToast("FACTORY SHUT DOWN // BUILD APPROVED");
        }
        if (event !== "gameover") {
          audio.play(event === "shoot" ? "shot" : event);
        }
        if (event === "wave") {
          showToast("NEW WAVE // MORE CODE. LESS MERCY.");
        }
        if (event === "pickup") {
          showToast("BONUS COLLECTED // LET IT RIP!");
        }
        if (event === "ammo") {
          showToast("AMMO LOADED // BACK TO WORK");
        }
        if (event === "hazard") {
          showToast("TIMEOUT INCOMING // SHOOT IT OR DODGE!");
        }
        if (event === "stun") {
          showToast("EVENT LOOP BLOCKED // CLEANER PARALYZED");
        }
        if (event === "recover") {
          showToast("BACK ONLINE // KEEP CLEANING");
        }
        if (event === "robot") {
          showToast("AI AGENT INCOMING // ARMORED · 15 HITS TO DESTROY");
        }
        if (event === "robot-destroy") {
          showToast("AI AGENT DISMANTLED // ARMOR BREACHED");
        }
        if (event === "generate") {
          showToast("GENERATION COMPLETE // MORE TECH DEBT");
        }
        if (event === "review") {
          showToast("CODE REVIEW // ALL ENEMIES FROZEN FOR 2s");
        }
        if (event === "lint") {
          showToast("LINT BOMB // BIG BLOCKS SPLIT · SMALL BLOCKS CLEARED");
        }
        if (event === "bonus") {
          showToast("BONUS INCOMING // SHOOT TO COLLECT");
        }
      },
      onGameOver: (score, wave) => endRun(score, wave),
    });
    $("#menu").hidden = true;
    $("#game-screen").hidden = false;
    $("#game-overlay").hidden = true;
    controller.reset();
    controller.setPaused(false);
    paused = finished = false;
    audio.resume();
    showToast("DON’T LET THE SPAGHETTI ESCAPE.");
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
    $("#opening-audio-status").textContent = audio.enabled
      ? "♫ OPENING THEME · SOUND ON"
      : "SOUND OFF";
    for (const b of document.querySelectorAll("[data-sound]")) {
      b.setAttribute(
        "aria-label",
        audio.enabled ? "Turn sound off" : "Turn sound on",
      );
      b.classList.toggle("muted", !audio.enabled);
      const label = b.querySelector("span");
      if (label) {
        label.textContent = audio.enabled ? "SOUND ON" : "SOUND OFF";
      }
    }
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
