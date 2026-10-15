import { damage } from "../src/game/simulation-damage";
import { explode } from "../src/game/simulation-explode";

export function inspectCodeDisintegration() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
  const { block, original, canvas, oldHoleKeys } = prepareWornSurface(r, s, w);

  destroyWornBlock(s, block);
  r.draw();

  const fragments = w.scene.children.filter((mesh: any) =>
    mesh.name.startsWith("code-death-fragment-"),
  );
  const result = {
    effects: w.debris.diagnostics,
    originalRemoved: original.parent === null && !w.blocks.has(block.id),
    originalCanvas: fragments.every(
      (mesh: any) => mesh.userData.sourceCanvas === canvas,
    ),
    oldHoles: fragments.every((mesh: any) =>
      oldHoleKeys.every((key) => mesh.userData.fractureVisual.holes.has(key)),
    ),
    geometryCount: new Set(
      fragments.map((mesh: any) => mesh.children[0].geometry.uuid),
    ).size,
    areas: fragments.map((mesh: any) => mesh.userData.fragmentArea),
    smoke: w.scene.getObjectByName("physics-buoyant-turbulent-smoke").count,
    sparks: w.scene.getObjectByName("physics-incandescent-sparks").count,
    cleared: !s.world.blocks.some((b: any) => b.id === block.id),
  };

  for (let i = 0; i < 30; i++) {
    w.debris.update(1 / 120);
  }

  r.draw();

  return result;
}

function destroyWornBlock(s: any, block: any) {
  damage(s, {
    block: block,
    x: 0,
    y: 0,
    bullet: { vx: 1080, vy: 0 },
    blastRadius: 1000,
    power: 100,
  });
}

function prepareWornSurface(r: any, s: any, w: any) {
  r.setPaused(true);
  s.world.blocks = [];
  s.runtime.pendingBlocks = 0;
  s.world.robots = [];

  const block = s.spawnBlock({
    x: 790,
    y: 285,
    vx: 0,
    vy: 0,
    angle: 0.12,
    code: Array(7).fill(
      "const tangled = factoryFactory(JSON.parse(JSON.stringify(input)));",
    ),
  });
  const oldHole = block.cells.find(
    (c: any) => Math.abs(c.x) < 20 && Math.abs(c.y) < 30,
  );

  oldHole.alive = false;
  block.hits++;
  r.draw();

  const original = w.blocks.get(block.id);
  const canvas = original.userData.fractureVisual.canvas;
  const oldHoleKeys = [...original.userData.fractureVisual.holes.keys()];

  return { block, original, canvas, oldHoleKeys };
}

export function inspectSpecialCodeDeaths() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;

  return ["explosion", "lint", "uncached-boss"].map((mode) => {
    const block = prepareSpecialDeathBlock(r, s, mode);
    const wasCached = w.blocks.has(block.id);

    if (mode === "lint") {
      s.selectSpecial("lint");
      s.fireSpecial();
    } else {
      explode(s, { x: block.x, y: block.y, radius: 300, power: 5 });
    }

    r.draw();

    const parts = w.scene.children.filter((mesh: any) =>
      mesh.name.startsWith("code-death-fragment-"),
    );

    return {
      mode,
      wasCached,
      cleared: !s.world.blocks.some((b: any) => b.id === block.id),
      allGlyphsRemoved: block.cells.every((cell: any) => !cell.alive),
      effects: w.debris.diagnostics,
      surface: parts.every(
        (mesh: any) =>
          !!mesh.userData.sourceCanvas && mesh.userData.fragmentArea > 0,
      ),
      holes: parts.every(
        (mesh: any) => mesh.userData.fractureVisual.holes.size > 0,
      ),
      glError: w.renderer.getContext().getError(),
    };
  });
}

function prepareSpecialDeathBlock(r: any, s: any, mode: string) {
  r.reset();
  r.setPaused(true);
  s.world.blocks = [];
  s.runtime.pendingBlocks = 0;

  const block = s.spawnBlock({
    boss: mode === "uncached-boss",
    x: 800,
    y: 320,
    vx: 0,
    vy: 0,
    angle: 0,
    code: [
      "const unnecessarilyNested = factoryFactory();",
      "return JSON.parse(JSON.stringify(input));",
    ],
  });

  block.cells.forEach((cell: any) => (cell.health = 1));
  block.cells[0].alive = false;
  if (mode !== "uncached-boss") {
    r.draw();
  }

  return block;
}

export function inspectSettled() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
  const gameplay = () =>
    JSON.stringify({
      blocks: s.world.blocks,
      robots: s.world.robots,
      score: s.progress.score,
      ammo: s.player.ammo,
      elapsed: s.progress.elapsed,
    });
  const before = gameplay();
  const bodies = w.debris.bodySnapshots;

  r.draw();
  r.draw();

  const pauseSafe =
    JSON.stringify(bodies) === JSON.stringify(w.debris.bodySnapshots);
  const start = bodies.filter((body: any) => body.kind === "code");

  for (let i = 0; i < 600; i++) {
    w.debris.update(1 / 120);
  }

  r.draw();

  return {
    unchanged: gameplay() === before,
    pauseSafe,
    start,
    end: w.debris.bodySnapshots.filter((body: any) => body.kind === "code"),
    effects: w.debris.diagnostics,
    glError: w.renderer.getContext().getError(),
  };
}
