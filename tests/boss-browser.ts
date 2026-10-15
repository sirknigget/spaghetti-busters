import { damage } from "../src/game/simulation-damage";

export function inspectBossEntry() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;

  r.setPaused(true);
  s.world.blocks = [];
  s.runtime.pendingBlocks = 0;
  s.progress.wave = 4;
  s.runtime.waveTimer = 0.99;

  const headline = document.querySelector("#boss-announcement")!;

  (window as any).__bossTiming = [];
  new MutationObserver(() =>
    (window as any).__bossTiming.push({
      hidden: (headline as HTMLElement).hidden,
      time: performance.now(),
    }),
  ).observe(headline, { attributes: true, attributeFilter: ["hidden"] });
  r.update(0.09); // Clear wave 4 and enter wave 5 through normal progression.

  const boss = s.world.blocks.find((b: any) => b.boss);

  boss.x = 905;
  boss.y = 366;
  r.draw();

  const mesh = w.blocks.get(boss.id);

  return {
    wave: s.progress.wave,
    total: s.waveTotal,
    count: s.world.blocks.length,
    health: s.bossHealth,
    depth: mesh.userData.solidDepth,
    title: mesh.userData.bossTitle,
    reactor: !!mesh.getObjectByName("factory-boss-reactor"),
    armor: boss.toughness,
  };
}

export function inspectBossBattle() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
  const boss = s.world.blocks.find((b: any) => b.boss);

  damageBoss(s, boss);

  const health = s.bossHealth;

  s.runtime.bossSpawnTimer = 0.01;
  r.update(0.09);

  const generated = s.world.blocks.find((b: any) => b.bossMinion);
  const hazard = s.spawnHazard({
    x: 430,
    y: 530,
    durationMs: 1800,
    vx: -400,
    vy: 0,
  });

  r.draw();

  const timeout = w.scene.getObjectByName("timeout-solid");

  return {
    health,
    generated: !!generated,
    generatedSolid: w.blocks.get(generated.id).userData.solidDepth,
    timeout: timeout.userData,
    width: hazard.durationMs.toString().length,
  };
}

function damageBoss(s: any, boss: any) {
  const cell = boss.cells.find(
    (c: any) => c.alive && Math.abs(c.x) < 30 && Math.abs(c.y) < 30,
  );

  damage(s, {
    block: boss,
    x: cell.x,
    y: cell.y,
    bullet: { vy: 0 },
    blastRadius: 75,
    power: 3,
  });
}
