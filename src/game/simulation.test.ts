import { expect, it } from "vitest";
import { game, hitCell } from "../../tests/unit/simulation-support";
import { Simulation } from "./simulation";

it("begins with a large visible block of syntax highlighted TypeScript", () => {
  const sim = game();

  expect(sim.world.blocks).toHaveLength(1);

  const block = sim.world.blocks[0]!;

  expect(block.x - block.width / 2).toBeLessThan(1280);
  expect(block.width).toBeGreaterThan(350);
  expect(block.cells.length).toBeGreaterThan(130);
  expect(new Set(block.cells.map((cell) => cell.color)).size).toBeGreaterThan(
    4,
  );
  expect(block.cells.some((cell) => cell.magic === "double")).toBe(true);
});

it("chips actual letters, produces letter particles, then splits into moving chunks", () => {
  const sim = game();
  const block = sim.world.blocks[0]!;
  const originalCount = block.cells.filter((cell) => cell.alive).length;

  hitCell(sim, block, block.cells[30]!);
  expect(block.cells.filter((cell) => cell.alive).length).toBeLessThan(
    originalCount,
  );
  expect(sim.world.particles.some((particle) => particle.char)).toBe(true);
  expect(sim.progress.score).toBeGreaterThan(0);
  for (let i = 0; i < 4; i++) {
    hitCell(sim, block, block.cells.filter((cell) => cell.alive)[35]!);
  }

  expect(sim.world.blocks).toHaveLength(2);
  expect(sim.world.blocks.every((chunk) => chunk.generation === 1)).toBe(true);
  expect(sim.world.blocks[0]!.vy).not.toBe(sim.world.blocks[1]!.vy);
  expect(sim.world.events).toContain("split");
});

it("requires shooting a released weapon before granting it and limits special ammo", () => {
  const sim = game();

  sim.world.blocks = [];

  const block = sim.spawnBlock({
    x: 700,
    y: 350,
    vx: 0,
    vy: 0,
    angle: 0,
    code: [
      "const DOUBLE_SHOT = prepareFactoryFactory();",
      "return JSON.parse(JSON.stringify(everything));",
    ],
  });

  hitCell(
    sim,
    block,
    block.cells.find((cell) => cell.magic === "double")!,
  );
  expect(sim.world.pickups).toHaveLength(1);
  expect(sim.player.weapon).toBe("single");
  verifyDoubleShotCollection(sim);
});

it("grants magic ammo once even when several keyword letters are hit", () => {
  const sim = game();

  sim.world.blocks = [];

  const block = sim.spawnBlock({
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

  hitCell(
    sim,
    block,
    block.cells.find((cell) => cell.magic === "ammo")!,
  );
  expect(sim.player.ammo).toBe(8);

  const remainingMagic = block.cells.find(
    (cell) => cell.alive && cell.magic === "ammo",
  );

  if (remainingMagic) {
    hitCell(sim, block, remainingMagic);
  }

  expect(sim.player.ammo).toBe(8);
});

it("collects a weapon only once when spread bullets strike it together", () => {
  const sim = game();

  sim.world.blocks = [];
  sim.world.pickups.push({
    id: 700,
    x: 500,
    y: 360,
    vx: 0,
    vy: 0,
    life: 10,
    age: 1,
    type: "triple",
  });
  for (let i = 0; i < 3; i++) {
    sim.world.bullets.push({
      id: 800 + i,
      x: 490,
      y: 360 + i,
      vx: 1080,
      vy: 0,
      life: 1,
      weapon: "triple",
    });
  }

  sim.update(1 / 120);
  expect(sim.player.ammo).toBe(24);
  expect(sim.world.events.filter((event) => event === "pickup")).toHaveLength(
    1,
  );
  sim.world.bullets = [];
  sim.fire();
  expect(sim.world.bullets).toHaveLength(3);
  expect(new Set(sim.world.bullets.map((bullet) => bullet.vy)).size).toBe(3);
});

it("only loses when an entire chunk crosses the left edge", () => {
  const sim = game();
  const block = sim.world.blocks[0]!;

  block.x = -10;
  block.vx = -100;
  sim.update(0.02);
  expect(sim.progress.status).toBe("playing");
  block.x = -block.width - 100;
  sim.update(0.02);
  expect(sim.progress.status).toBe("gameover");
  expect(sim.world.events).toContain("gameover");
  expect(sim.fire()).toBe(false);
});

it("bounces moving pieces at the arena boundary and exchanges collision impulses", () => {
  const sim = game();

  sim.world.blocks = [];

  const a = sim.spawnBlock({
    x: 600,
    y: 133,
    vx: 0,
    vy: -100,
    angle: 0,
    code: ["const a = 1;"],
  });

  sim.update(0.05);
  expect(a.vy).toBeGreaterThan(0);
  a.y = 400;
  a.x = 600;
  a.vx = 100;
  a.age = 1;

  const b = sim.spawnBlock({
    x: 700,
    y: 400,
    vx: -100,
    vy: 0,
    angle: 0,
    code: ["const b = 2;"],
  });

  b.age = 1;
  sim.update(0.01);
  expect(a.vx).toBeLessThan(0);
  expect(b.vx).toBeGreaterThan(0);
});

it("advances difficulty after all spawned blocks are cleared", () => {
  const sim = game();

  for (let i = 0; i < 250 && sim.progress.wave === 1; i++) {
    sim.world.blocks = [];
    sim.update(0.05);
  }

  expect(sim.progress.wave).toBe(2);
  expect(sim.world.events).toContain("wave");
  expect(sim.waveTotal).toBeGreaterThan(4);
  expect(sim.progress.score).toBeGreaterThanOrEqual(250);
});

function verifyDoubleShotCollection(sim: Simulation) {
  const pickup = sim.world.pickups[0]!;

  pickup.age = 1;
  pickup.x = 400;
  pickup.y = 360;
  sim.world.bullets.push({
    id: 10001,
    x: 394,
    y: 360,
    vx: 1080,
    vy: 0,
    life: 1,
    weapon: "single",
  });
  sim.update(1 / 120);
  expect(sim.world.pickups).toHaveLength(0);
  expect(sim.player.weapon).toBe("double");
  expect(sim.player.ammo).toBe(30);
  sim.world.bullets = [];
  sim.fire();
  expect(sim.world.bullets).toHaveLength(2);
  expect(sim.player.ammo).toBe(29);
  sim.player.ammo = 0;
  sim.update(0.2);
  sim.world.bullets = [];
  sim.fire();
  expect(sim.player.weapon).toBe("single");
  expect(sim.world.bullets).toHaveLength(1);
}
