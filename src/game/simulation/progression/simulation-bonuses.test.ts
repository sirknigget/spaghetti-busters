import { expect, it } from "vitest";
import { game, hitCell } from "#root/tests/unit/simulation-support.ts";
import {
  PRIMARY_AMMO,
  Simulation,
  SPECIAL_AMMO_CAPS,
  type Pickup,
} from "#root/src/game/simulation/simulation.ts";

const keywords: [string, Pickup["type"]][] = [
  ["DOUBLE_SHOT", "double"],
  ["TRIPLE_SHOT", "triple"],
  ["QUAD_SHOT", "quad"],
  ["QUINT_SHOT", "quint"],
  ["HOMING_MISSILE", "homing"],
  ["RECYCLE_GRENADE", "grenade"],
  ["CODE_REVIEW", "review"],
  ["LINT_BOMB", "lint"],
];

it("releases all weapon types from their magic variables, then grants them only on a second hit", () => {
  for (const [keyword, type] of keywords) {
    const sim = game();

    sim.world.blocks = [];

    const block = sim.spawnBlock({
      x: 850,
      y: 350,
      angle: 0,
      vx: 0,
      vy: 0,
      code: [
        `const ${keyword} = createOvercomplicatedFactory();`,
        "return JSON.parse(JSON.stringify(everything));",
      ],
    });

    hitCell(
      sim,
      block,
      block.cells.find((cell) => cell.magic === type)!,
    );
    expect(sim.world.pickups).toHaveLength(1);

    const bonus = sim.world.pickups[0]!;

    expect(bonus.type).toBe(type);
    expect(sim.player.weapon).toBe("single");
    verifyCollectedWeapon(bonus, sim, type);
  }
});

it("fires four/five distinct pellets and consumes one round per volley with more double/triple ammunition", () => {
  expect(PRIMARY_AMMO.double).toBeGreaterThan(10);
  expect(PRIMARY_AMMO.triple).toBeGreaterThan(6);
  for (const weapon of ["quad", "quint"] as const) {
    const sim = game();

    sim.player.weapon = weapon;
    sim.player.ammo = PRIMARY_AMMO[weapon];
    expect(sim.fire()).toBe(true);
    expect(sim.world.bullets).toHaveLength(weapon === "quad" ? 4 : 5);
    expect(new Set(sim.world.bullets.map((bullet) => bullet.vy)).size).toBe(
      sim.world.bullets.length,
    );
    expect(sim.player.ammo).toBe(PRIMARY_AMMO[weapon] - 1);
  }
});

it("makes four/five-shot bonuses and natural magic nodes rarer than ordinary weapons", () => {
  let seed = 154;
  const sim = new Simulation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

    return seed / 4294967296;
  });
  const counts: Record<string, number> = {};
  let quad = 0;
  let quint = 0;

  for (let i = 0; i < 1000; i++) {
    const bonus = sim.spawnBonus();

    counts[bonus.type] = (counts[bonus.type] ?? 0) + 1;

    const block = sim.spawnBlock();

    if (block.cells.some((cell) => cell.magic === "quad")) {
      quad++;
    }

    if (block.cells.some((cell) => cell.magic === "quint")) {
      quint++;
    }

    sim.world.blocks = [];
    sim.world.pickups = [];
  }

  expect(counts.quad).toBeLessThan(counts.triple!);
  expect(counts.quint).toBeLessThan(counts.quad!);
  expect(quad).toBeGreaterThan(0);
  expect(quint).toBeGreaterThan(0);
  expect(quad).toBeLessThan(60);
  expect(quint).toBeLessThan(quad);
});

it("pauses robot thinking and anger timers throughout review, then resumes their attacks", () => {
  const sim = game();

  sim.world.blocks = [];

  const robot = sim.spawnRobot({ x: 700, y: 480 });

  robot.state = "thinking";
  robot.stateTime = 1.95;
  sim.selectSpecial("review");
  sim.fireSpecial();
  for (let i = 0; i < 8; i++) {
    sim.update(0.25);
  }

  expect(robot.stateTime).toBeCloseTo(1.95);
  expect(sim.world.events).not.toContain("generate");
  sim.update(0.1);
  expect(sim.world.events).toContain("generate");
  expect(sim.world.blocks[0]!.toughness).toBeGreaterThan(1);
});

it("spawns shootable bonuses naturally and caps each special inventory when collected repeatedly", () => {
  const sim = game();

  for (let i = 0; i < 73; i++) {
    sim.world.blocks.forEach((block) => {
      block.x = 1100;
      block.angry = false;
    });
    sim.update(0.25);
  }

  expect(sim.world.events).toContain("bonus");
  expect(sim.world.pickups.some((pickup) => pickup.age < 1)).toBe(true);
  sim.world.blocks = [];
  sim.world.robots = [];
  sim.world.hazards = [];
  sim.world.pickups = [];
  for (const type of ["homing", "grenade", "review", "lint"] as const) {
    sim.player.specialAmmo[type] = SPECIAL_AMMO_CAPS[type];

    const bonus = sim.spawnBonus(type, 500, 360);

    bonus.age = 1;
    bonus.vx = bonus.vy = 0;
    sim.world.bullets.push({
      id: 9998,
      x: 490,
      y: 360,
      vx: 1080,
      vy: 0,
      life: 1,
      weapon: "single",
    });
    sim.update(1 / 120);
    expect(sim.player.specialAmmo[type]).toBe(SPECIAL_AMMO_CAPS[type]);
    expect(sim.world.pickups).toHaveLength(0);
  }
});

it("prevents an overlapping timeout from attacking while frozen", () => {
  const sim = game();

  sim.spawnHazard({ x: 170, y: 360, vx: -400, vy: 0 });
  sim.selectSpecial("review");
  sim.fireSpecial();
  sim.update(0.25);
  expect(sim.isStunned).toBe(false);
  expect(sim.world.hazards[0]!.x).toBe(170);
  for (let i = 0; i < 8; i++) {
    sim.update(0.25);
  }

  expect(sim.isStunned).toBe(true);
});

it("replaces every fifth wave with exactly one factory boss and clears ordinary visitors", () => {
  for (const priorWave of [4, 9]) {
    const sim = game();

    sim.progress.wave = priorWave;
    sim.spawnRobot();
    sim.spawnHazard({ x: 1400, y: 220 });
    for (let i = 0; i < 220 && sim.progress.wave === priorWave; i++) {
      sim.world.blocks = [];
      sim.update(0.05);
    }

    expect(sim.progress.wave).toBe(priorWave + 1);
    expect(sim.isBossWave).toBe(true);
    expect(sim.waveTotal).toBe(1);
    sim.update(0.02);
    expect(sim.world.blocks).toHaveLength(1);

    const boss = sim.world.blocks[0]!;

    expect(boss.boss).toBe(true);
    expect(boss.title).toBe("FactoryFactoryFactory");
    expect(boss.cells.length).toBeGreaterThan(650);
    expect(boss.height).toBe(348);
    expect(boss.width).toBeGreaterThan(600);
    expect(boss.width).toBeLessThan(780);
    expect(boss.toughness).toBe(6 + Math.floor((priorWave + 1) / 5) - 1);
    expect(sim.world.events.filter((event) => event === "boss")).toHaveLength(
      1,
    );
    expect(sim.world.robots).toHaveLength(0);
    expect(sim.world.hazards).toHaveLength(0);
    for (let i = 0; i < 12; i++) {
      sim.update(0.25);
    }

    expect(sim.world.blocks).toHaveLength(1);
  }
});

function verifyCollectedWeapon(bonus: Pickup, sim: Simulation, type: string) {
  bonus.age = 1;
  bonus.x = 500;
  bonus.y = 360;
  bonus.vx = bonus.vy = 0;
  sim.world.bullets.push({
    id: 9990,
    x: 490,
    y: 360,
    vx: 1080,
    vy: 0,
    life: 1,
    weapon: "single",
  });
  sim.update(1 / 120);
  expect(sim.world.pickups).toHaveLength(0);
  if (type in PRIMARY_AMMO) {
    expect(sim.player.weapon).toBe(type);
    expect(sim.player.ammo).toBe(
      PRIMARY_AMMO[type as keyof typeof PRIMARY_AMMO],
    );
  } else {
    const special = type as keyof typeof SPECIAL_AMMO_CAPS;

    expect(sim.player.specialAmmo[special]).toBeGreaterThan(
      special === "homing" ? 3 : special === "grenade" ? 2 : 1,
    );
    expect(sim.player.specialAmmo[special]).toBeLessThanOrEqual(
      SPECIAL_AMMO_CAPS[special],
    );
  }
}
