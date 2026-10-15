export function inspectShielding() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;

  r.setPaused(true);
  s.world.blocks = [];

  const robot = s.spawnRobot({ brand: "openai", x: 500, y: 360 });

  robot.state = "thinking";
  robot.stateTime = 0;

  const block = spawnShieldedBlock(s);

  s.player.aimY = 360;
  s.player.aimX = 900;
  s.fire();
  for (let i = 0; i < 4; i++) {
    s.update(0.1);
  }

  r.draw();

  return {
    robots: s.world.robots.length,
    hitFlash: robot.hitFlash,
    hits: block.hits,
    damaged: s.world.events.includes("robot-hit"),
    health: robot.health,
    model: !!w.scene.getObjectByName("ai-code-robot-openai"),
  };
}

function spawnShieldedBlock(s: any) {
  return s.spawnBlock({
    x: 850,
    y: 360,
    vx: 0,
    vy: 0,
    angle: 0,
    code: [
      "const shielded = JSON.parse(JSON.stringify(data));",
      'return shielded.map((x: any) => eval("x"));',
    ],
  });
}

export function inspectState() {
  const { simulation: s, scene: r, world: w } = (window as any).__spaghetti;

  r.setPaused(true);
  s.world.blocks = [];

  const angry = s.spawnBlock({ x: 900, y: 320, vx: -50, vy: 5, angry: true });

  angry.throwTimer = 0.01;
  s.update(0.05);
  r.draw();

  const exception = s.world.blocks.find((b: any) => b.exception);
  const before = s.world.blocks.map((b: any) => [b.id, b.x, b.y, b.age]);

  s.selectSpecial("review");
  s.fireSpecial();
  for (let i = 0; i < 4; i++) {
    s.update(0.25);
  }

  r.draw();

  const after = s.world.blocks.map((b: any) => [b.id, b.x, b.y, b.age]);

  return {
    angry: w.blocks.get(angry.id).userData.angry,
    exception: !!exception,
    exceptionSolid: exception
      ? w.blocks.get(exception.id).userData.solidDepth
      : 0,
    before,
    after,
    freeze: s.player.freezeRemaining,
  };
}
