import { expect, it } from "vitest";
import { game, hitCell } from "#root/tests/unit/simulation-support.ts";
import {
  Block,
  SPECIAL_BLASTS,
} from "#root/src/game/simulation/simulation-types.ts";
import { Simulation } from "#root/src/game/simulation/simulation.ts";

it("homing prioritizes the rotated left edge over distance or center and follows changing urgency", () => {
  const sim = game();

  sim.world.blocks = [];

  const close = sim.spawnBlock({
    x: 510,
    y: 230,
    angle: 0,
    code: ["const x=1;"],
  });
  const wide = sim.spawnBlock({
    x: 620,
    y: 560,
    angle: 0.35,
    code: ["const distantButUrgent = factoryFactory(input);"],
  });
  const missile = {
    id: 991,
    type: "homing" as const,
    x: 400,
    y: 200,
    vx: 640,
    vy: 0,
    angle: 0,
    life: 5,
    targetId: undefined as number | undefined,
  };

  sim.world.specials.push(missile);
  sim.update(1 / 120);
  expect(missile.targetId).toBe(wide.id);
  verifyHomingRetargeting(sim, missile, { wide, close });
});

it.each(["homing", "grenade"] as const)(
  "%s blasts clear armored neighbors over a wide finite radius while bosses survive",
  (type) => {
    const sim = game();

    sim.progress.wave = 7;
    sim.world.blocks = [];

    const blast = SPECIAL_BLASTS[type];
    const { a, b, far } = placeBlastTargets(sim, blast);
    const boss = sim.spawnBoss();

    boss.x = 700;
    boss.y = 360;

    const health = sim.bossHealth!.current;

    sim.world.specials.push({
      id: 992,
      type,
      x: 700,
      y: 360,
      vx: 0,
      vy: 0,
      angle: 0,
      life: 2,
      fuse: 0.001,
    });
    sim.update(1 / 120);
    expect(sim.world.explosions[0]!.radius).toBe(blast.radius);
    expect(sim.world.blocks).not.toContain(a);
    expect(sim.world.blocks).not.toContain(b);
    expect(far.cells.every((cell) => cell.alive)).toBe(true);
    expect(sim.bossHealth!.current).toBeGreaterThan(0);
    expect(sim.bossHealth!.current).toBeLessThan(health);
  },
);

it("detonates recycle grenades across multiple rotated blocks with a finite radius", () => {
  const sim = game();

  sim.world.blocks = [];

  const code = [
    "const nested = JSON.parse(JSON.stringify(data));",
    'return nested.map((x: any) => eval("x"));',
  ];
  const { a, b, far } = placeGrenadeTargets(sim, code);
  const countA = a.cells.filter((cell) => cell.alive).length;
  const countB = b.cells.filter((cell) => cell.alive).length;

  sim.world.specials.push({
    id: 999,
    type: "grenade",
    x: 700,
    y: 360,
    vx: 0,
    vy: 0,
    life: 2,
    angle: 0,
    fuse: 0.001,
  });
  sim.update(1 / 120);
  expect(a.cells.filter((cell) => cell.alive).length).toBeLessThan(countA);
  expect(b.cells.filter((cell) => cell.alive).length).toBeLessThan(countB);
  expect(far.cells.every((cell) => cell.alive)).toBe(true);
  expect(sim.world.explosions[0]!.radius).toBe(SPECIAL_BLASTS.grenade.radius);
  expect(sim.world.specials).toHaveLength(0);
});

it("caps primary ammunition and grants occasional special refills only once per magic node", () => {
  const sim = game();

  sim.world.blocks = [];
  sim.player.ammo = 59;
  for (let i = 0; i < 2; i++) {
    const block = spawnAmmoBlock(sim);

    sim.world.blocks = [block];
    hitCell(
      sim,
      block,
      block.cells.find((cell) => cell.magic === "ammo")!,
    );

    const other = block.cells.find(
      (cell) => cell.alive && cell.magic === "ammo",
    );

    if (other) {
      hitCell(sim, block, other);
    }
  }

  expect(sim.player.ammo).toBe(60);
  expect(sim.player.specialAmmo).toEqual({
    homing: 4,
    grenade: 2,
    review: 1,
    lint: 1,
  });
  sim.selectSpecial("grenade");
  expect(sim.fireSpecial()).toBe(true);
  expect(sim.player.specialAmmo.grenade).toBe(1);
});

function spawnAmmoBlock(sim: Simulation) {
  return sim.spawnBlock({
    x: 700,
    y: 350,
    vx: 0,
    vy: 0,
    angle: 0,
    code: [
      "const AMMO_CACHE = generateReallyLongThing();",
      "return totallyUnnecessaryRecursion(true);",
    ],
  });
}

it("matches the timeout text collider at the left glyphs and cleaner leading edge", () => {
  const sim = game();

  sim.spawnHazard({ x: 700, y: 360, vx: -400, vy: 0, durationMs: 1600 });
  // The visible word await starts roughly 100 pixels left of the label center.
  sim.world.bullets.push({
    id: 9001,
    x: 588,
    y: 360,
    vx: 1080,
    vy: 0,
    life: 1,
    weapon: "single",
  });
  sim.update(1 / 120);
  expect(sim.world.hazards).toHaveLength(0);
  sim.spawnHazard({ x: 235, y: 360, vx: -400, vy: 0 });
  sim.update(1 / 120);
  expect(sim.isStunned).toBe(true);
});

it("lands grenade blasts at the aimed point when no enemy intercepts the arc", () => {
  const sim = game();

  sim.world.blocks = [];
  sim.player.aimX = 800;
  sim.player.aimY = 450;
  sim.selectSpecial("grenade");
  sim.fireSpecial();
  for (let i = 0; i < 130 && !sim.world.explosions.length; i++) {
    sim.update(1 / 120);
  }

  expect(sim.world.explosions).toHaveLength(1);
  expect(Math.abs(sim.world.explosions[0]!.x - 800)).toBeLessThan(8);
  expect(Math.abs(sim.world.explosions[0]!.y - 450)).toBeLessThan(4);
});

function placeBlastTargets(
  sim: Simulation,
  blast: (typeof SPECIAL_BLASTS)[keyof typeof SPECIAL_BLASTS],
) {
  const a = sim.spawnBlock({
    x: 700,
    y: 360,
    angle: 0.3,
    code: ["const a=1;"],
  });
  const b = sim.spawnBlock({
    x: 700 + blast.radius - 80,
    y: 390,
    angle: -0.3,
    code: ["const b=2;"],
  });
  const far = sim.spawnBlock({
    x: 1250,
    y: 550,
    angle: 0.2,
    code: ["const far=3;"],
  });

  return { a, b, far };
}

function placeGrenadeTargets(sim: Simulation, code: string[]) {
  const a = sim.spawnBlock({
    x: 660,
    y: 320,
    vx: 0,
    vy: 0,
    angle: 0.35,
    code,
  });
  const b = sim.spawnBlock({
    x: 770,
    y: 440,
    vx: 0,
    vy: 0,
    angle: -0.3,
    code,
  });
  const far = sim.spawnBlock({
    x: 1200,
    y: 560,
    vx: 0,
    vy: 0,
    angle: 0.2,
    code,
  });

  return { a, b, far };
}

function verifyHomingRetargeting(
  sim: Simulation,
  missile: {
    id: number;
    type: "homing";
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    life: number;
    targetId: number | undefined;
  },
  { wide, close }: { wide: Block; close: Block },
) {
  const urgent = sim.spawnBlock({
    x: 100,
    y: 530,
    angle: -0.2,
    code: ["const escaping=1;"],
  });

  sim.update(1 / 120);
  expect(missile.targetId).toBe(urgent.id);
  urgent.x = 1200;
  sim.update(1 / 120);
  expect(missile.targetId).toBe(wide.id);
  sim.world.blocks = [close];
  sim.update(1 / 120);
  expect(missile.targetId).toBe(close.id);
}
