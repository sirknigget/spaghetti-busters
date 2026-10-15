import { HUD } from "./ui-dom";

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

export function menuMarkup(best: number): string {
  return `
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
}
