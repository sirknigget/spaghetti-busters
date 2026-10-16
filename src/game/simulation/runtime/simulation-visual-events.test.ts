import { expect, it } from "vitest";
import { game, hitCell } from "#root/tests/unit/simulation-support.ts";
import {
  Block,
  Cell,
  SPECIAL_BLASTS,
} from "#root/src/game/simulation/simulation-types.ts";
import { Simulation } from "#root/src/game/simulation/simulation.ts";

it("damages robots once per special blast, including nearby robots in the blast radius", () => {
  for (const type of ["homing", "grenade"] as const) {
    const sim = game();

    sim.world.blocks = [];

    const direct = sim.spawnRobot({ x: 700, y: 400 });
    const nearby = sim.spawnRobot({ x: 800, y: 400 });

    nearby.state = "thinking";

    const outside = sim.spawnRobot({ x: 1200, y: 400 });

    outside.state = "thinking";
    sim.world.specials.push({
      id: 19100,
      type,
      x: 648,
      y: 400,
      vx: 640,
      vy: 0,
      life: 1,
      angle: 0,
      fuse: 1,
    });
    sim.update(1 / 120);

    const power = SPECIAL_BLASTS[type].power;

    expect(direct.health).toBe(15 - power);
    expect(nearby.health).toBe(15 - power);
    expect(outside.health).toBe(15);
    expect(sim.world.explosions).toHaveLength(1);
    expect(sim.world.specials).toHaveLength(0);
    expect(
      sim.world.events.filter((event) => event === "robot-hit"),
    ).toHaveLength(2);
  }
});

it("exports immutable split surface ancestry and glyph impacts without coupling rendering to gameplay", () => {
  const sim = game();
  const block = sim.world.blocks[0]!;

  hitCell(sim, block, block.cells[30]!);

  const impact = sim.world.visualEvents.find(
    (event) => event.type === "impact" && event.target === "code",
  );

  expect(impact?.type === "impact" && impact.removed!.length).toBeGreaterThan(
    0,
  );
  sim.player.specialWeapon = "lint";
  sim.fireSpecial();

  const split = sim.world.visualEvents.find((event) => event.type === "split");

  expect(split?.type).toBe("split");
  if (!split || split.type !== "split") {
    throw new Error("Missing split snapshot");
  }

  expect(split.children).toHaveLength(2);
  expect(split.parent.cells.some((cell) => !cell.alive)).toBe(true);
  verifySplitAncestry(split, block);

  const saved = split.children[0]!.cells[0]!.health;

  sim.world.blocks[0]!.cells[0]!.health = 0;
  expect(split.children[0]!.cells[0]!.health).toBe(saved);

  const events = sim.world.visualEvents.splice(0);

  expect(events.length).toBeGreaterThan(0);
  expect(sim.world.blocks).toHaveLength(2);
});

it("exports the final visible slab once when a cannon hit destroys a worn fragment", () => {
  const sim = game();

  sim.world.blocks = [];

  const block = wornFragment(sim);
  const before = block.cells.map((cell) => ({ ...cell }));

  hitCell(sim, block, block.cells[12]!);

  const deaths = sim.world.visualEvents.filter(
    (event) => event.type === "code-death",
  );

  expect(deaths).toHaveLength(1);

  const death = deaths[0]!;

  expect(death.block.cells).toEqual(before);
  expect(death.block.fracture).toEqual(block.fracture);
  expect(death.vx).toBe(1080);
  expect(death.radius).toBe(43);
  expect(Number.isFinite(death.x) && Number.isFinite(death.y)).toBe(true);
  verifyFinalImpactSnapshot(sim, block, { before, death });
});

function wornFragment(sim: Simulation) {
  const block = sim.spawnBlock({
    x: 700,
    y: 350,
    vx: 0,
    vy: 0,
    angle: 0,
    code: ["x".repeat(24)],
  });

  block.generation = 2;
  block.cells[0]!.alive = false;
  block.fracture = {
    parentId: 100,
    offsetX: 30,
    offsetY: -10,
    axis: "x",
    cut: 8,
    side: 1,
    seed: 9,
  };

  return block;
}

it.each(["lint", "grenade"] as const)(
  "preserves a full pre-hit surface for %s kills of normal and boss code",
  (type) => {
    for (const boss of [false, true]) {
      const sim = game();

      sim.world.blocks = [];

      const block = sim.spawnBlock({
        boss,
        x: 700,
        y: 350,
        vx: 0,
        vy: 0,
        angle: 0,
        code: ["x".repeat(40)],
      });

      block.cells.forEach((cell) => {
        cell.health = 1;
      });
      block.cells[0]!.alive = false;
      destroyWithSpecial(type, sim);
      expect(block.cells.every((cell) => !cell.alive)).toBe(true);

      const deaths = sim.world.visualEvents.filter(
        (event) => event.type === "code-death",
      );

      expect(deaths).toHaveLength(1);
      expect(deaths[0]!.block.cells.filter((cell) => cell.alive)).toHaveLength(
        39,
      );
      expect(deaths[0]!.block.boss).toBe(boss);
      expect(deaths[0]!.radius).toBeGreaterThan(100);
      expect(sim.world.blocks).not.toContain(block);
      expect(sim.progress.blocksDestroyed).toBe(1);
      sim.reset();
      expect(sim.world.visualEvents).toHaveLength(0);
    }
  },
);

function destroyWithSpecial(type: string, sim: Simulation) {
  if (type === "lint") {
    sim.selectSpecial("lint");
    expect(sim.fireSpecial()).toBe(true);
  } else {
    sim.world.specials.push({
      id: 19200,
      type: "grenade",
      x: 700,
      y: 350,
      vx: 0,
      vy: 0,
      life: 1,
      angle: 0,
      fuse: 0,
    });
    sim.update(1 / 120);
  }
}

type DeathSnapshot = Extract<
  Simulation["world"]["visualEvents"][number],
  { type: "code-death" }
>;

function verifyFinalImpactSnapshot(
  sim: Simulation,
  block: Block,
  { before, death }: { before: Cell[]; death: DeathSnapshot },
) {
  const impact = sim.world.visualEvents.find(
    (event) => event.type === "impact" && event.blockId === block.id,
  );

  if (!impact || impact.type !== "impact") {
    throw new Error("Missing final impact");
  }

  expect(impact.removed).toHaveLength(
    before.filter((cell, i) => cell.alive && !block.cells[i]!.alive).length,
  );
  expect(death.seed).toBeGreaterThan(impact.seed);
  block.cells[1]!.char = "?";
  block.fracture!.offsetX = 999;
  expect(death.block.cells[1]!.char).toBe("x");
  expect(death.block.fracture!.offsetX).toBe(30);
  expect(sim.world.blocks).not.toContain(block);
  expect(sim.progress.blocksDestroyed).toBe(1);
  sim.update(0.2);
  expect(
    sim.world.visualEvents.filter((event) => event.type === "code-death"),
  ).toHaveLength(1);
}

function verifySplitAncestry(
  split: { type: "split"; parent: Block; children: Block[]; seed: number },
  block: Block,
) {
  for (const child of split.children) {
    const ancestry = child.fracture!;

    expect(ancestry.parentId).toBe(block.id);
    expect(ancestry.seed).toBe(split.seed);
    for (const cell of child.cells) {
      expect(
        split.parent.cells.some(
          (parentCell) =>
            parentCell.alive &&
            parentCell.char === cell.char &&
            Math.abs(parentCell.x - (cell.x + ancestry.offsetX)) < 0.001 &&
            Math.abs(parentCell.y - (cell.y + ancestry.offsetY)) < 0.001,
        ),
      ).toBe(true);
    }
  }
}
