export function inspectHomingPriority() {
  const { simulation: s, scene: r } = (window as any).__spaghetti;

  r.setPaused(true);
  s.world.blocks = [];
  s.runtime.pendingBlocks = 0;

  const { urgent, near, large } = placeHomingPriorityTargets(s);

  s.world.specials.push({
    id: 9901,
    type: "homing",
    x: 730,
    y: 580,
    vx: 640,
    vy: 0,
    angle: 0,
    life: 5,
  });
  r.update(1 / 120);

  return {
    target: s.world.specials[0].targetId,
    urgent: urgent.id,
    near: near.id,
    large: large.id,
  };
}

function placeHomingPriorityTargets(s: any) {
  const urgent = s.spawnBlock({
    x: 390,
    y: 535,
    vx: -80,
    vy: 0,
    angle: 0.12,
    exception: true,
    code: ['throw new Error("urgent");'],
  });
  const large = s.spawnBlock({
    x: 930,
    y: 310,
    vx: -80,
    vy: 0,
    angle: -0.04,
    code: Array(7).fill(
      "const redundant = factoryFactory(JSON.parse(JSON.stringify(input)));",
    ),
  });
  const near = s.spawnBlock({
    x: 820,
    y: 540,
    vx: -80,
    vy: 0,
    code: ["const close = 1;"],
  });

  return { urgent, near, large };
}

export function inspectGrenadeBlast() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;

  s.world.blocks = [];
  s.world.particles = [];
  s.progress.wave = 7;
  placeBlastRadiusTargets(s);
  s.world.specials.push({
    id: 9902,
    type: "grenade",
    x: 700,
    y: 360,
    vx: 0,
    vy: 0,
    angle: 0,
    life: 2,
    fuse: 0.001,
  });
  r.update(0.08);

  return {
    radius: s.world.explosions[0].radius,
    alive: s.world.blocks.length,
    visibleBlast: w.explosions.explosionMeshes.some(
      (mesh: any) => mesh.visible && mesh.scale.x > 100,
    ),
  };
}

function placeBlastRadiusTargets(s: any) {
  for (const [x, y] of [
    [690, 350],
    [910, 390],
  ]) {
    s.spawnBlock({
      x,
      y,
      vx: 0,
      vy: 0,
      angle: 0.12,
      code: ['const armored = eval("oops");'],
    });
  }

  s.spawnBlock({
    x: 1250,
    y: 560,
    vx: 0,
    vy: 0,
    angle: 0,
    code: ["const outside = true;"],
  });
}
