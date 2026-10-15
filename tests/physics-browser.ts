import { damage } from "../src/game/simulation-damage";

export function inspectInitialFracture() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
  const canvas = prepareFracturedSurface(r, s, w);

  s.selectSpecial("lint");
  s.fireSpecial();
  r.draw();

  const halves = s.world.blocks.map((b: any) => w.blocks.get(b.id));
  const a = halves.map((mesh: any) => mesh.userData.fractureVisual);
  const child = s.world.blocks[0];
  const cell = child.cells.find((c: any) => c.alive);

  damage(s, {
    block: child,
    x: cell.x,
    y: cell.y,
    bullet: { vx: 1080, vy: 0 },
  });
  r.draw();

  const rebuilt = w.blocks.get(child.id).userData.fractureVisual;

  r.update(0.2);

  return {
    count: halves.length,
    inherited: a.every((v: any) => v.canvas === canvas),
    clipped: a.every((v: any) => v.regions.length === 2 && v.holes.size > 0),
    offsets: a.map((v: any) => v.offset),
    afterDamage: rebuilt.canvas === canvas && rebuilt.regions.length === 2,
    names: halves.map((m: any) => m.children[0].name),
  };
}

function prepareFracturedSurface(r: any, s: any, w: any) {
  r.setPaused(true);
  s.world.blocks = [];
  s.runtime.pendingBlocks = 0;

  const parent = s.spawnBlock({
    x: 870,
    y: 340,
    vx: 0,
    vy: 0,
    angle: 0,
    code: Array(9).fill(
      "const originalSurface = factoryFactory(JSON.parse(JSON.stringify(input)));",
    ),
  });

  r.draw();

  const dead = parent.cells.find(
    (c: any) => Math.abs(c.x) < 20 && Math.abs(c.y) < 30,
  );

  dead.alive = false;
  parent.hits++;
  r.draw();

  const canvas = w.blocks.get(parent.id).userData.fractureVisual.canvas;

  return canvas;
}

export function inspectRobotDismantling() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;

  r.setPaused(true);
  s.world.blocks = [];
  s.runtime.pendingBlocks = 0;
  s.world.robots = [];

  const robot = s.spawnRobot({ brand: "anthropic", x: 630, y: 360 });

  robot.state = "thinking";
  robot.stateTime = -10;
  r.draw();
  wearRobotArmor(s, robot, r);

  const before = { health: robot.health, alive: s.world.robots.length };

  hitRobot({ simulation: s, scene: r }, robot, 20015);

  return {
    before,
    alive: s.world.robots.length,
    effects: w.debris.diagnostics,
    head: !!w.scene.getObjectByName("fallen-robot-head"),
    arm: !!w.scene.getObjectByName("fallen-robot-arm-1"),
  };
}

function wearRobotArmor(s: any, robot: any, r: any) {
  for (let i = 0; i < 14; i++) {
    hitRobot({ simulation: s, scene: r }, robot, 20000 + i);
  }
}

function hitRobot(
  context: { simulation: any; scene: any },
  robot: any,
  id: number,
) {
  context.simulation.world.bullets.push({
    id,
    x: robot.x - 55,
    y: robot.y,
    vx: 1080,
    vy: 0,
    life: 1,
    weapon: "single",
  });
  context.simulation.update(1 / 120);
  context.scene.draw();
}

export function inspectHit() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;
  const block = prepareHitBlock(s, r);

  const cell = block.cells.find(
    (c: any) => Math.abs(c.x) < 20 && Math.abs(c.y) < 30,
  );

  damage(s, {
    block: block,
    x: cell.x,
    y: cell.y,
    bullet: { vx: 1080, vy: 0 },
  });
  r.update(0.12);

  const mesh = w.blocks.get(block.id);
  const v = mesh.userData.fractureVisual;
  const holes = [...v.holes.values()] as any[];

  return {
    effects: w.debris.diagnostics,
    holes: holes.length,
    ragged: holes.some(
      (p: any) => new Set(p.map((q: any) => q.x.toFixed(2))).size > 4,
    ),
    smoke: w.scene.getObjectByName("physics-buoyant-turbulent-smoke").count,
    sparks: w.scene.getObjectByName("physics-incandescent-sparks").count,
  };
}

function prepareHitBlock(s: any, r: any) {
  r.setPaused(true);
  s.world.blocks = [];
  s.runtime.pendingBlocks = 0;

  const block = s.spawnBlock({
    x: 850,
    y: 320,
    vx: 0,
    vy: 0,
    angle: 0,
    code: Array(7).fill(
      "const tangled = factoryFactory(JSON.parse(JSON.stringify(input)));",
    ),
  });

  r.draw();

  return block;
}
