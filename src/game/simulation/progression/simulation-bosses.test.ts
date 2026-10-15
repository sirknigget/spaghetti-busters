import { expect, it } from "vitest";
import { game, hitCell } from "#root/tests/unit/simulation-support.ts";
import {
  Robot,
  Simulation,
  TIMEOUT_METRICS,
} from "#root/src/game/simulation/simulation.ts";

it("keeps boss drift slow, glyphs armored and fragmentation harder than ordinary code", () => {
  const sim = game();

  sim.progress.wave = 5;
  sim.world.blocks = [];

  const boss = sim.spawnBoss();
  const baseline = sim.bossHealth!;

  expect(baseline.current).toBe(baseline.max);
  expect(baseline.max).toBeGreaterThan(4000);
  expect(boss.toughness).toBeGreaterThan(5);
  for (let i = 0; i < 12; i++) {
    hitCell(
      sim,
      boss,
      boss.cells.find((cell) => cell.alive)!,
    );
  }

  expect(sim.world.blocks.filter((block) => block.boss)).toHaveLength(1);
  expect(sim.bossHealth!.current).toBeLessThan(baseline.current);
  expect(sim.bossHealth!.max).toBe(baseline.max);
  for (let i = 0; i < 12; i++) {
    sim.update(0.25);
  }

  expect(Math.abs(boss.vx)).toBeLessThan(35);
  expect(Math.abs(boss.vx)).toBeLessThan(sim.driftSpeed / 4);
  expect(
    boss.cells
      .filter((cell) => cell.alive)
      .every((cell) => cell.maxHealth === 6),
  ).toBe(true);
});

it("lint preserves boss lineage, armor, health baseline and a single shared minion generator", () => {
  const sim = game();

  sim.progress.wave = 5;
  sim.world.blocks = [];

  const boss = sim.spawnBoss();

  boss.x = 1000;

  const root = boss.bossRoot;
  const health = sim.bossHealth!;
  const count = boss.cells.length;

  sim.selectSpecial("lint");
  expect(sim.fireSpecial()).toBe(true);
  expect(sim.world.blocks).toHaveLength(2);
  expect(
    sim.world.blocks.every((block) => block.boss && block.bossRoot === root),
  ).toBe(true);
  expect(sim.world.blocks.reduce((n, block) => n + block.cells.length, 0)).toBe(
    count,
  );
  expect(
    sim.world.blocks.every((block) =>
      block.cells.every((cell) => cell.health === 6),
    ),
  ).toBe(true);
  expect(sim.bossHealth).toEqual(health);
  verifySplitBossProduction(sim, health.max);
});

function verifySplitBossProduction(sim: Simulation, maxHealth: number) {
  for (let i = 0; i < 17; i++) {
    sim.update(0.25);
  }

  expect(
    sim.world.events.filter((event) => event === "boss-spawn"),
  ).toHaveLength(1);
  expect(sim.world.blocks.filter((block) => block.bossMinion)).toHaveLength(1);
  expect(
    sim.world.blocks
      .filter((block) => block.boss)
      .every((block) => Math.abs(block.vx) < 40),
  ).toBe(true);
  expect(sim.bossHealth!.max).toBe(maxHealth);
  expect(sim.world.events.filter((event) => event === "boss")).toHaveLength(1);
}

it("pauses factory production during review and caps live minions without regular hazards or robots", () => {
  const sim = game();

  sim.progress.wave = 5;
  sim.world.blocks = [];
  sim.spawnBoss();
  sim.selectSpecial("review");
  sim.fireSpecial();
  for (let i = 0; i < 8; i++) {
    sim.update(0.25);
  }

  expect(sim.world.events).not.toContain("boss-spawn");
  for (let i = 0; i < 15; i++) {
    sim.update(0.25);
  }

  expect(sim.world.events).not.toContain("boss-spawn");
  sim.update(0.25);
  sim.update(0.02);
  expect(
    sim.world.events.filter((event) => event === "boss-spawn"),
  ).toHaveLength(1);
  for (let i = 0; i < 155; i++) {
    sim.world.blocks.forEach((block) => {
      block.x = block.boss ? 1050 : 650;
      block.y = block.boss ? 350 : 560;
    });
    sim.update(0.25);
  }

  expect(sim.progress.status).toBe("playing");
  expect(sim.world.blocks.filter((block) => block.bossMinion)).toHaveLength(7);
  expect(
    sim.world.events.filter((event) => event === "boss-spawn"),
  ).toHaveLength(7);
  expect(sim.world.robots).toHaveLength(0);
  expect(sim.world.hazards).toHaveLength(0);
  expect(sim.world.events).toContain("bonus");
});

it("rewards the factory defeat once, waits for minions and then advances to a regular wave", () => {
  const sim = game();

  sim.progress.wave = 5;
  sim.world.blocks = [];

  const boss = sim.spawnBoss();

  // Put the factory on its final few damaged glyphs and leave one generated service alive.
  boss.x = 850;
  boss.y = 350;
  boss.angle = 0;
  boss.cells = boss.cells.slice(0, 7).map((cell) => ({ ...cell, health: 1 }));

  const minion = sim.spawnBlock({
    x: 1200,
    y: 550,
    code: ["const leftover = factory(anything);"],
  });

  minion.bossMinion = true;
  minion.bossRoot = boss.bossRoot;
  hitCell(sim, boss, boss.cells[0]!);
  expect(sim.world.blocks.some((block) => block.boss)).toBe(false);
  expect(sim.bossHealth).toBeUndefined();
  expect(
    sim.world.events.filter((event) => event === "boss-defeated"),
  ).toHaveLength(1);
  expect(sim.world.pickups.map((pickup) => pickup.type)).toEqual([
    "quint",
    "lint",
  ]);
  verifyBossRewardProgression(sim);
});

it("matches the enlarged timeout text width and vertical face for shots and dodging", () => {
  expect(TIMEOUT_METRICS).toEqual({
    fontSize: 20,
    charWidth: 12,
    widthPadding: 36,
    height: 54,
    depth: 30,
  });

  const sim = game();

  sim.spawnHazard({ x: 700, y: 360, vx: -400, vy: 0 });
  sim.world.bullets.push({
    id: 12001,
    x: 535,
    y: 389,
    vx: 1080,
    vy: 0,
    life: 1,
    weapon: "single",
  });
  sim.update(1 / 120);
  expect(sim.world.hazards).toHaveLength(0);
  sim.spawnHazard({ x: 280, y: 424, vx: -400, vy: 0 });
  sim.update(1 / 120);
  expect(sim.isStunned).toBe(true);

  const dodge = game();

  dodge.spawnHazard({ x: 280, y: 445, vx: -400, vy: 0 });
  dodge.update(1 / 120);
  expect(dodge.isStunned).toBe(false);
});

it("requires exactly fifteen primary bullet impacts to destroy an armored robot and stops generation", () => {
  const sim = game();

  sim.world.blocks = [];

  const robot = sim.spawnRobot({ x: 700, y: 400 });

  expect(robot.health).toBe(15);
  expect(robot.maxHealth).toBe(15);

  const hit = robotHitProcedure(sim);

  for (let i = 0; i < 14; i++) {
    hit();
  }

  expect(robot.health).toBe(1);
  expect(sim.world.robots).toContain(robot);
  expect(sim.world.events).not.toContain("robot-destroy");
  hit();
  expect(robot.health).toBe(0);
  expect(sim.world.robots).not.toContain(robot);
  expect(
    sim.world.events.filter((event) => event === "robot-destroy"),
  ).toHaveLength(1);

  verifyRobotDeathEffects(sim, robot);
  for (let i = 0; i < 9; i++) {
    sim.update(0.25);
  }

  expect(sim.world.events).not.toContain("generate");
  expect(sim.world.blocks).toHaveLength(0);
  sim.reset();
  expect(sim.world.visualEvents).toHaveLength(0);
  expect(sim.world.robots).toHaveLength(0);
});

function verifyRobotDeathEffects(sim: Simulation, robot: Robot) {
  const death = sim.world.visualEvents.find(
    (event) => event.type === "robot-death",
  );

  expect(death?.type === "robot-death" && death.robot.id).toBe(robot.id);
  expect(
    sim.world.visualEvents.filter(
      (event) => event.type === "impact" && event.target === "robot",
    ),
  ).toHaveLength(15);
}

function robotHitProcedure(sim: Simulation) {
  return () => {
    sim.world.bullets.push({
      id: 19000,
      x: 648,
      y: 400,
      vx: 1080,
      vy: 0,
      life: 1,
      weapon: "single",
    });
    sim.update(1 / 120);
  };
}

function verifyBossRewardProgression(sim: Simulation) {
  const score = sim.progress.score;

  for (let i = 0; i < 6; i++) {
    sim.update(0.25);
  }

  expect(sim.progress.wave).toBe(5);
  expect(sim.progress.score).toBe(score);
  expect(
    sim.world.events.filter((event) => event === "boss-defeated"),
  ).toHaveLength(1);
  sim.world.blocks = [];
  for (let i = 0; i < 5; i++) {
    sim.update(0.25);
  }

  expect(sim.progress.wave).toBe(6);
  expect(sim.isBossWave).toBe(false);
  expect(sim.waveTotal).toBeGreaterThan(1);
  expect(sim.world.blocks.some((block) => !block.boss)).toBe(true);
  expect(
    sim.world.events.filter((event) => event === "boss-defeated"),
  ).toHaveLength(1);
  sim.reset();
  expect(sim.bossHealth).toBeUndefined();
  expect(sim.world.events).toEqual([]);
  expect(sim.world.blocks.every((block) => !block.boss)).toBe(true);
}
