import { CODE_SLICES } from "#root/src/game/content/code-library.ts";
import { expect, it } from "vitest";
import { game, hitCell } from "#root/tests/unit/simulation-support.ts";
import { Simulation } from "#root/src/game/simulation/simulation.ts";

it("allows aimed fire to clear consecutive waves without invulnerable fragments", () => {
  const sim = solvabilityGame();
  let equipped = 0;

  for (
    let tick = 0;
    tick < 60 * 130 &&
    sim.progress.wave < 4 &&
    sim.progress.status === "playing";
    tick++
  ) {
    equipped += advanceSolvabilityTick(sim);
  }

  expect(sim.progress.status).toBe("playing");
  expect(sim.progress.wave).toBe(4);
  expect(sim.progress.blocksDestroyed).toBeGreaterThan(25);
  expect(equipped).toBeGreaterThanOrEqual(1);
});

function solvabilityGame() {
  let seed = 19;
  const sim = new Simulation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

    return seed / 4294967296;
  });

  // Exercise baseline solvability; attackers have independent coverage.
  sim.spawnRobot = () => ({
    id: -1,
    x: 1500,
    y: 500,
    brand: "openai",
    state: "leaving",
    age: 0,
    stateTime: 0,
    hitFlash: 0,
    health: 15,
    maxHealth: 15,
  });

  return sim;
}

function advanceSolvabilityTick(sim: Simulation) {
  sim.world.blocks.forEach((block) => {
    block.angry = false;
  });

  const target = predictedTarget(sim);

  if (target) {
    sim.player.aimX = Math.max(220, target.x);
    sim.player.aimY = target.y;
    sim.fire();
  }

  sim.update(1 / 60);

  return sim.world.events.splice(0).filter((event) => event === "pickup")
    .length;
}

function predictedTarget(sim: Simulation) {
  const hazard = sim.world.hazards[0];
  const pickup = sim.world.pickups[0];

  if (hazard) {
    const flight = Math.max(0, (hazard.x - 172) / (1080 - hazard.vx));

    return { x: hazard.x, y: hazard.y + hazard.vy * flight };
  }

  if (pickup) {
    const flight = Math.max(0, (pickup.x - 172) / 1080);

    return { x: pickup.x, y: pickup.y + pickup.vy * flight };
  }

  return predictedBlockTarget(sim);
}

function predictedBlockTarget(sim: Simulation) {
  const block = [...sim.world.blocks].sort(
    (a, b) => a.x - a.width / 2 - (b.x - b.width / 2),
  )[0];

  if (!block) {
    return undefined;
  }

  const cos = Math.cos(block.angle);
  const sin = Math.sin(block.angle);
  const target = block.cells
    .filter((cell) => cell.alive)
    .map((cell) => ({
      x: block.x + cell.x * cos - cell.y * sin,
      y: block.y + cell.x * sin + cell.y * cos,
    }))
    .sort(
      (a, b) =>
        Math.abs(a.y - sim.player.playerY) - Math.abs(b.y - sim.player.playerY),
    )[0];

  if (target) {
    target.y += block.vy * Math.max(0, (target.x - 172) / 1080);
  }

  return target;
}

it("enforces fire cooldown, clamps movement, and fully resets a completed run", () => {
  const sim = game();

  expect(sim.fire()).toBe(true);
  expect(sim.fire()).toBe(false);
  sim.player.aimY = -1000;
  for (let i = 0; i < 20; i++) {
    sim.update(0.05);
  }

  expect(sim.player.playerY).toBeGreaterThanOrEqual(166);
  expect(sim.player.playerY).toBeLessThan(170);
  expect(sim.fire()).toBe(true);
  sim.progress.status = "gameover";
  sim.progress.score = 9000;
  sim.reset();
  expect(sim.progress.score).toBe(0);
  expect(sim.progress.wave).toBe(1);
  expect(sim.player.playerY).toBe(360);
  expect(sim.world.blocks).toHaveLength(1);
  expect(sim.world.events).toEqual([]);
  expect(sim.progress.status).toBe("playing");
});

it("offers 32 distinct ridiculous TypeScript blocks with rare power keywords", () => {
  expect(CODE_SLICES.length).toBeGreaterThanOrEqual(24);
  expect(new Set(CODE_SLICES.map((code) => code.join("\n"))).size).toBe(
    CODE_SLICES.length,
  );

  const drops = CODE_SLICES.filter((code) =>
    /DOUBLE_SHOT|TRIPLE_SHOT/.test(code.join("")),
  );

  expect(drops.length / CODE_SLICES.length).toBeLessThan(0.25);
  expect(CODE_SLICES.every((code) => code.length >= 6)).toBe(true);
});

it("increases speed, glyph toughness, card size and enemy count over waves", () => {
  const sim = game();
  const early = sim.spawnBlock();
  const count = sim.waveTotal;

  sim.progress.wave = 7;

  const late = sim.spawnBlock({ code: undefined });

  expect(Math.abs(late.vx)).toBeGreaterThan(Math.abs(early.vx) * 2);
  expect(late.height).toBeGreaterThan(early.height);
  expect(late.toughness).toBe(3);
  expect(sim.waveTotal).toBeGreaterThan(count * 2);
  sim.world.blocks = [late];
  late.x = 800;
  late.y = 360;
  late.vx = late.vy = late.angle = 0;

  const before = late.cells.filter((cell) => cell.alive).length;

  hitCell(sim, late, late.cells[30]!);
  expect(late.cells.filter((cell) => cell.alive)).toHaveLength(before);
  expect(late.cells.some((cell) => cell.health < cell.maxHealth)).toBe(true);
  hitCell(sim, late, late.cells[30]!);
  hitCell(sim, late, late.cells[30]!);
  expect(late.cells.filter((cell) => cell.alive).length).toBeLessThan(before);
});

it("stuns movement and both firing modes for the timeout duration, then recovers", () => {
  const sim = game();

  sim.spawnHazard({ x: 160, y: 360, vx: -400, vy: 0, durationMs: 1200 });
  sim.update(0.1);
  expect(sim.isStunned).toBe(true);
  expect(sim.world.events).toContain("stun");
  expect(sim.world.hazards).toHaveLength(0);

  const y = sim.player.playerY;

  sim.player.aimY = 580;
  expect(sim.fire()).toBe(false);
  expect(sim.fireSpecial()).toBe(false);
  sim.selectSpecial("grenade");
  expect(sim.player.specialWeapon).toBe("homing");
  sim.update(0.25);
  expect(sim.player.playerY).toBe(y);
  expect(sim.player.specialAmmo).toEqual({
    homing: 3,
    grenade: 2,
    review: 1,
    lint: 1,
  });
  for (let i = 0; i < 5; i++) {
    sim.update(0.25);
  }

  expect(sim.isStunned).toBe(false);
  expect(sim.world.events).toContain("recover");
  expect(sim.player.playerY).toBeGreaterThan(y);
  expect(sim.fire()).toBe(true);
  expect(sim.fireSpecial()).toBe(true);
});

it("allows timeout hazards to be dodged or shot down and spawns them naturally", () => {
  const sim = game();

  sim.spawnHazard({ x: 160, y: 200, vx: -450, vy: 0 });
  sim.update(0.25);
  expect(sim.isStunned).toBe(false);

  const hazard = sim.spawnHazard({ x: 500, y: 360, vx: -400, vy: 0 });

  sim.world.bullets.push({
    id: 9000,
    x: 470,
    y: 360,
    vx: 1080,
    vy: 0,
    life: 1,
    weapon: "single",
  });
  sim.update(0.02);
  expect(sim.world.hazards.some((item) => item.id === hazard.id)).toBe(false);
  expect(sim.progress.score).toBeGreaterThanOrEqual(60);
  for (let i = 0; i < 37; i++) {
    sim.update(0.25);
  }

  expect(sim.world.events).toContain("hazard");
  expect(sim.world.hazards.some((item) => item.age < 1)).toBe(true);
});

it("reacquires homing targets after destruction instead of chasing stale fragments", () => {
  const sim = game();

  sim.world.blocks = [];

  const first = sim.spawnBlock({
    x: 550,
    y: 310,
    vx: 0,
    vy: 0,
    angle: 0,
    code: ["const target = makeOvercomplicatedFactory();"],
  });
  const second = sim.spawnBlock({
    x: 850,
    y: 520,
    vx: 0,
    vy: 0,
    angle: 0,
    code: ["const other = makeOvercomplicatedFactory();"],
  });

  expect(sim.fireSpecial()).toBe(true);
  expect(sim.player.specialAmmo.homing).toBe(2);
  expect(sim.fireSpecial()).toBe(false);
  sim.update(0.025);

  const missile = sim.world.specials[0]!;

  expect(missile.targetId).toBe(first.id);
  sim.world.blocks = [second];
  sim.update(0.08);
  expect(missile.targetId).toBe(second.id);
  expect(missile.vy).toBeGreaterThan(0);
  for (let i = 0; i < 30 && sim.world.specials.length; i++) {
    sim.update(0.05);
  }

  expect(sim.world.events).toContain("explosion");
});
