import type { Simulation } from "./simulation";
import { segmentRectangle } from "./simulation-collision";
import { visual } from "./simulation-particles";
import { clamp } from "./simulation-shared";
import { TUNING } from "./simulation-tuning";
import { type Robot, type RobotBrand } from "./simulation-types";

const ROBOT_HEALTH = 15;
const ROBOT_HIT_FLASH_SECONDS = 0.2;
const ROBOT_IMPACT_RADIUS = 19;

export function spawnRobot(
  sim: Simulation,
  options: {
    x?: number;
    y?: number;
    brand?: RobotBrand;
  } = {},
): Robot {
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
  const robot: Robot = {
    id: sim.runtime.nextId++,
    x: options.x ?? TUNING.robot.entryX,
    y:
      options.y ??
      TUNING.robot.spawnMinY + sim.random() * TUNING.robot.spawnYRange,
    brand: options.brand ?? brands[Math.floor(sim.random() * brands.length)]!,
    state: "running",
    age: 0,
    stateTime: 0,
    hitFlash: 0,
    health: ROBOT_HEALTH,
    maxHealth: ROBOT_HEALTH,
  };
  sim.world.robots.push(robot);
  sim.world.events.push("robot");

  return robot;
}

interface DamageRobotOptions {
  robot: Robot;
  power: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}
export function damageRobot(
  sim: Simulation,
  { robot, power, x, y, vx, vy }: DamageRobotOptions,
) {
  if (robot.health <= 0) {
    return;
  }
  robot.health = Math.max(0, robot.health - power);
  robot.hitFlash = ROBOT_HIT_FLASH_SECONDS;
  visual(sim, {
    type: "impact",
    target: "robot",
    robotId: robot.id,
    x,
    y,
    vx,
    vy,
    radius: ROBOT_IMPACT_RADIUS,
    seed: ++sim.runtime.visualSeed,
  });
  sim.world.events.push("robot-hit");
  if (robot.health === 0) {
    sim.world.robots = sim.world.robots.filter((item) => item.id !== robot.id);
    visual(sim, {
      type: "robot-death",
      robot: { ...robot },
      seed: ++sim.runtime.visualSeed,
    });
    sim.world.events.push("robot-destroy");
    sim.progress.score += TUNING.robot.destructionReward;
  }
}

interface RobotContactOptions {
  robot: Robot;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}
export function robotContact({ robot, ax, ay, bx, by }: RobotContactOptions) {
  // Segment clipping gives the surface contact rather than the robot's center.
  let t = 0;
  for (const [start, delta, half] of [
    [ax - robot.x, bx - ax, TUNING.robot.halfWidth],
    [ay - robot.y, by - ay, TUNING.robot.halfHeight],
  ]) {
    if (Math.abs(delta!) > TUNING.collision.parallelEpsilon) {
      t = Math.max(
        t,
        Math.min((-half! - start!) / delta!, (half! - start!) / delta!),
      );
    }
  }

  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
}

interface InterceptRobotOptions {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}
export function interceptRobot(
  sim: Simulation,
  { ax, ay, bx, by }: InterceptRobotOptions,
): Robot | undefined {
  return [...sim.world.robots]
    .sort((a, b) => a.x - b.x)
    .find((robot) =>
      segmentRectangle({
        ax: ax - robot.x,
        ay: ay - robot.y,
        bx: bx - robot.x,
        by: by - robot.y,
        halfWidth: TUNING.robot.halfWidth,
        halfHeight: TUNING.robot.halfHeight,
      }),
    );
}

const GENERATED_CODE = [
  "export async function generatedFactory<T extends any>(input: T) {",
  "  const context = new Proxy(JSON.parse(JSON.stringify(input)), {",
  "    get: (state, key) => Reflect.get(state, key) ?? (() => context)",
  "  }); // AI generated: please do not question the architecture",
  "  return await new Promise(async (resolve, reject) => {",
  "    for (const key of Object.keys(context).sort().reverse()) {",
  "      await Promise.resolve().then(() => Promise.resolve(key));",
  "      if (!!Boolean(context[key] ?? true) !== false) {",
  "        resolve(eval(JSON.stringify(JSON.parse(JSON.stringify(context)))));",
  "      } else { setTimeout(() => generatedFactory(context), 0); }",
  '    } reject(new Error("implementation left as an exercise"));',
  "  }); // TODO: rewrite after the next funding round",
  "}",
];

function advanceRunningRobot(robot: Robot, dt: number) {
  robot.x = Math.max(
    TUNING.robot.thinkingX,
    robot.x - TUNING.robot.runSpeed * dt,
  );
  if (robot.x <= TUNING.robot.thinkingX) {
    robot.state = "thinking";
    robot.stateTime = 0;
  }
}

function advanceRobotState(sim: Simulation, robot: Robot, dt: number) {
  if (robot.state === "running") {
    advanceRunningRobot(robot, dt);
  } else if (
    robot.state === "thinking" &&
    robot.stateTime >= TUNING.robot.thinkDuration
  ) {
    generateRobotCode(sim, robot);
  } else if (robot.state === "leaving") {
    robot.x += TUNING.robot.exitSpeed * dt;
  }
}

export function updateRobots(sim: Simulation, dt: number) {
  for (const robot of sim.world.robots) {
    robot.age += dt;
    robot.stateTime += dt;
    robot.hitFlash = Math.max(0, robot.hitFlash - dt);
    advanceRobotState(sim, robot, dt);
  }
  sim.world.robots = sim.world.robots.filter(
    (robot) => robot.x < TUNING.robot.exitX,
  );
}

function generateRobotCode(sim: Simulation, robot: Robot) {
  const generated = sim.spawnBlock({
    x: robot.x + TUNING.robot.generatedOffsetX,
    y: clamp(
      robot.y - TUNING.robot.generatedOffsetY,
      TUNING.robot.generatedMinY,
      TUNING.robot.generatedMaxY,
    ),
    vx: -sim.driftSpeed * TUNING.robot.generatedSpeedFactor,
    code: [...GENERATED_CODE],
  });
  generated.toughness = Math.min(
    TUNING.robot.generatedToughnessCap,
    generated.toughness + 1,
  );
  for (const cell of generated.cells) {
    cell.health = cell.maxHealth = generated.toughness;
  }
  robot.state = "leaving";
  robot.stateTime = 0;
  sim.world.events.push("generate");
}
