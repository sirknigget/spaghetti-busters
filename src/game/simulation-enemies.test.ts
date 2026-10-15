import { expect, it } from "vitest";
import { game } from "../../tests/unit/simulation-support";
import {
  LINT_SMALL_BLOCK_CELLS,
  Robot,
  Simulation,
  type RobotBrand,
} from "./simulation";

it("lets a damaged armored robot survive and finish generating code before leaving", () => {
  const sim = game();

  sim.world.blocks = [];

  const robot = sim.spawnRobot({ x: 700, y: 400, brand: "anthropic" });

  sim.update(1 / 120);
  expect(robot.state).toBe("thinking");

  const score = sim.progress.score;

  launchRobotAttacks(sim);
  sim.update(0.025);
  expect(sim.world.bullets).toHaveLength(0);
  expect(sim.world.specials).toHaveLength(0);
  expect(sim.world.explosions).toHaveLength(1);
  expect(sim.progress.score).toBe(score);
  expect(robot.health).toBe(9);
  expect(
    sim.world.events.filter((event) => event === "robot-hit"),
  ).toHaveLength(2);
  expect(sim.world.robots).toContain(robot);
  expect(robot.hitFlash).toBeGreaterThan(0);
  verifyRobotGeneration(sim, robot);
});

it("supports every robot brand and naturally schedules an occasional visitor", () => {
  const sim = game();
  const brands: RobotBrand[] = [
    "openai",
    "anthropic",
    "google",
    "x",
    "moonshot",
    "zai",
    "deepseek",
    "meta",
  ];

  brands.forEach((brand) =>
    expect(sim.spawnRobot({ brand }).brand).toBe(brand),
  );
  sim.world.robots = [];
  for (let i = 0; i < 53; i++) {
    sim.world.blocks.forEach((block) => {
      block.x = 1000;
    });
    sim.update(0.25);
  }

  expect(sim.world.robots).toHaveLength(1);
  expect(sim.world.events).toContain("robot");
});

it("has angry blocks throw small exception fragments and disables anger after splitting", () => {
  const sim = game();

  sim.world.blocks = [];

  const angry = sim.spawnBlock({
    x: 1000,
    y: 350,
    vx: 0,
    vy: 0,
    angle: 0,
    angry: true,
  });

  angry.throwTimer = 0.01;
  sim.update(0.025);

  const exception = sim.world.blocks.find((block) => block.exception)!;

  expect(exception).toBeDefined();
  expect(exception.angry).toBe(false);
  expect(exception.height).toBeLessThan(angry.height);
  expect(exception.vx).toBeLessThan(-100);
  expect(sim.world.events).toContain("exception");
  sim.selectSpecial("lint");
  expect(sim.fireSpecial()).toBe(true);
  expect(sim.world.blocks.every((block) => !block.angry)).toBe(true);
});

it("freezes enemy movement and attacks for two seconds while allowing fire and bonus motion", () => {
  const sim = game();
  const { block, robot, hazard, bonus } = reviewTargets(sim);

  sim.selectSpecial("review");
  expect(sim.fireSpecial()).toBe(true);
  expect(sim.player.specialAmmo.review).toBe(0);
  expect(sim.player.freezeRemaining).toBe(2);
  expect(sim.player.reviewPulse).toBeGreaterThan(0);
  expect(sim.fire()).toBe(true);

  const original = {
    x: block.x,
    robotX: robot.x,
    hazardX: hazard.x,
    timer: block.throwTimer,
    bonusX: bonus.x,
  };

  for (let i = 0; i < 7; i++) {
    sim.update(0.25);
  }

  expect(block.x).toBe(original.x);
  expect(robot.x).toBe(original.robotX);
  expect(hazard.x).toBe(original.hazardX);
  expect(block.throwTimer).toBe(original.timer);
  expect(bonus.x).not.toBe(original.bonusX);
  expect(sim.player.freezeRemaining).toBeCloseTo(0.25);
  sim.update(0.25);
  expect(block.x).toBeCloseTo(original.x);
  sim.update(0.12);
  expect(sim.player.freezeRemaining).toBe(0);
  expect(block.x).toBeLessThan(original.x);
  expect(robot.x).toBeLessThan(original.robotX);
  expect(hazard.x).toBeLessThan(original.hazardX);
  expect(sim.world.events).toContain("exception");
});

it("lint clears small fragments instead of multiplying them and splits only large visible slabs once", () => {
  const sim = game();

  sim.world.blocks = [];
  spawnLintFragments(sim);

  const large = sim.spawnBlock({
    x: 900,
    y: 450,
    code: Array(8).fill(
      "return factoryFactory(JSON.parse(JSON.stringify(input)));",
    ),
  });
  const largeCount = large.cells.length;
  const offscreen = sim.spawnBlock({ x: 2200, y: 350 });

  sim.selectSpecial("lint");
  expect(sim.fireSpecial()).toBe(true);
  expect(sim.world.blocks).toHaveLength(3);
  expect(sim.world.blocks).toContain(offscreen);

  const halves = sim.world.blocks.filter((block) => block !== offscreen);

  expect(halves.every((block) => block.generation === 1)).toBe(true);
  expect(halves.reduce((count, block) => count + block.cells.length, 0)).toBe(
    largeCount,
  );
  expect(sim.progress.blocksDestroyed).toBe(52);
  expect(sim.player.specialAmmo.lint).toBe(0);
  expect(sim.player.lintPulse).toBeGreaterThan(0);
  expect(sim.world.events).toContain("lint");
  expect(sim.world.events.filter((event) => event === "destroy")).toHaveLength(
    52,
  );
});

it("lint uses living glyph count at its boundary, clears worn armor and preserves magic rewards once", () => {
  const { sim, small, large } = createWornLintTargets();
  const worn = sim.spawnBlock({
    x: 850,
    code: Array(8).fill("const hugeButMostlyMissing = overcomplicate(input);"),
  });

  worn.cells.forEach((cell, i) => {
    cell.alive = i < 10;
  });

  const magic = sim.spawnBlock({
    x: 600,
    code: ["const QUINT_SHOT = factory();"],
  });

  sim.selectSpecial("lint");
  sim.fireSpecial();
  expect(
    sim.world.blocks.some((block) =>
      [small.id, worn.id, magic.id, large.id].includes(block.id),
    ),
  ).toBe(false);
  expect(sim.world.blocks).toHaveLength(2);
  expect(sim.world.blocks.reduce((n, block) => n + block.cells.length, 0)).toBe(
    LINT_SMALL_BLOCK_CELLS + 1,
  );
  expect(
    sim.world.pickups.filter((pickup) => pickup.type === "quint"),
  ).toHaveLength(1);
  expect(sim.progress.blocksDestroyed).toBe(3);
  expect(sim.progress.score).toBeGreaterThan(0);
});

function createWornLintTargets() {
  const sim = game();

  sim.progress.wave = 10;
  sim.world.blocks = [];

  const small = sim.spawnBlock({
    boss: true,
    x: 650,
    code: ["x".repeat(LINT_SMALL_BLOCK_CELLS)],
  });
  const large = sim.spawnBlock({
    x: 700,
    code: ["x".repeat(LINT_SMALL_BLOCK_CELLS + 1)],
  });

  return { sim, small, large };
}

function verifyRobotGeneration(sim: Simulation, robot: Robot) {
  for (let i = 0; i < 8; i++) {
    sim.update(0.25);
  }

  expect(robot.state).toBe("leaving");

  const generated = sim.world.blocks.find((block) => block.cells.length > 500)!;

  expect(generated).toBeDefined();
  expect(generated.height).toBeGreaterThan(250);
  expect(sim.world.events).toContain("generate");
  for (let i = 0; i < 10; i++) {
    sim.update(0.25);
  }

  expect(sim.world.robots).toHaveLength(0);
  expect(sim.progress.status).toBe("playing");
}

function launchRobotAttacks(sim: Simulation) {
  sim.world.bullets.push({
    id: 9900,
    x: 650,
    y: 400,
    vx: 1080,
    vy: 0,
    life: 1,
    weapon: "single",
  });
  sim.world.specials.push({
    id: 9901,
    type: "grenade",
    x: 652,
    y: 400,
    vx: 1000,
    vy: 0,
    life: 1,
    angle: 0,
    fuse: 1,
  });
}

function reviewTargets(sim: Simulation) {
  sim.world.blocks = [];

  const block = sim.spawnBlock({ x: 1000, y: 350, angry: true });

  block.throwTimer = 0.1;

  const robot = sim.spawnRobot({ x: 900, y: 500 });
  const hazard = sim.spawnHazard({ x: 1000, y: 180, vx: -400, vy: 0 });
  const bonus = sim.spawnBonus("review", 850, 250);

  return { block, robot, hazard, bonus };
}

function spawnLintFragments(sim: Simulation) {
  for (let i = 0; i < 52; i++) {
    sim.spawnBlock({
      x: 500 + i * 5,
      y: 300,
      exception: i % 2 === 0,
      code: ["const nested = (((((x: any) => x)))))();"],
    });
  }
}
