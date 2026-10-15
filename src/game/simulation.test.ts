import { describe, expect, it } from "vitest";
import {
  Simulation,
  type Block,
  type Cell,
  CODE_SLICES,
  PRIMARY_AMMO,
  SPECIAL_AMMO_CAPS,
  type Pickup,
  type RobotBrand,
  TIMEOUT_METRICS,
  LINT_SMALL_BLOCK_CELLS,
  SPECIAL_BLASTS,
} from "./simulation";

function game() {
  return new Simulation(() => 0.5);
}

/** Place a projectile immediately in front of a chosen moving glyph. */
function hitCell(sim: Simulation, block: Block, cell: Cell) {
  const cos = Math.cos(block.angle),
    sin = Math.sin(block.angle);
  const x = block.x + cell.x * cos - cell.y * sin;
  const y = block.y + cell.x * sin + cell.y * cos;
  sim.bullets.push({
    id: 10000,
    x: x - 4,
    y,
    vx: 1080,
    vy: 0,
    life: 1,
    weapon: "single",
  });
  sim.update(1 / 120);
}

describe("arcade simulation", () => {
  it("begins with a large visible block of syntax highlighted TypeScript", () => {
    const sim = game();
    expect(sim.blocks).toHaveLength(1);
    const block = sim.blocks[0]!;
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
    const block = sim.blocks[0]!;
    const originalCount = block.cells.filter((cell) => cell.alive).length;
    hitCell(sim, block, block.cells[30]!);
    expect(block.cells.filter((cell) => cell.alive).length).toBeLessThan(
      originalCount,
    );
    expect(sim.particles.some((particle) => particle.char)).toBe(true);
    expect(sim.score).toBeGreaterThan(0);
    for (let i = 0; i < 4; i++)
      hitCell(sim, block, block.cells.filter((cell) => cell.alive)[35]!);
    expect(sim.blocks).toHaveLength(2);
    expect(sim.blocks.every((chunk) => chunk.generation === 1)).toBe(true);
    expect(sim.blocks[0]!.vy).not.toBe(sim.blocks[1]!.vy);
    expect(sim.events).toContain("split");
  });

  it("requires shooting a released weapon before granting it and limits special ammo", () => {
    const sim = game();
    sim.blocks = [];
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
    expect(sim.pickups).toHaveLength(1);
    expect(sim.weapon).toBe("single");
    const pickup = sim.pickups[0]!;
    pickup.age = 1;
    pickup.x = 400;
    pickup.y = 360;
    sim.bullets.push({
      id: 10001,
      x: 394,
      y: 360,
      vx: 1080,
      vy: 0,
      life: 1,
      weapon: "single",
    });
    sim.update(1 / 120);
    expect(sim.pickups).toHaveLength(0);
    expect(sim.weapon).toBe("double");
    expect(sim.ammo).toBe(30);
    sim.bullets = [];
    sim.fire();
    expect(sim.bullets).toHaveLength(2);
    expect(sim.ammo).toBe(29);
    sim.ammo = 0;
    sim.update(0.2);
    sim.bullets = [];
    sim.fire();
    expect(sim.weapon).toBe("single");
    expect(sim.bullets).toHaveLength(1);
  });

  it("grants magic ammo once even when several keyword letters are hit", () => {
    const sim = game();
    sim.blocks = [];
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
    expect(sim.ammo).toBe(8);
    const remainingMagic = block.cells.find(
      (cell) => cell.alive && cell.magic === "ammo",
    );
    if (remainingMagic) hitCell(sim, block, remainingMagic);
    expect(sim.ammo).toBe(8);
  });

  it("collects a weapon only once when spread bullets strike it together", () => {
    const sim = game();
    sim.blocks = [];
    sim.pickups.push({
      id: 700,
      x: 500,
      y: 360,
      vx: 0,
      vy: 0,
      life: 10,
      age: 1,
      type: "triple",
    });
    for (let i = 0; i < 3; i++)
      sim.bullets.push({
        id: 800 + i,
        x: 490,
        y: 360 + i,
        vx: 1080,
        vy: 0,
        life: 1,
        weapon: "triple",
      });
    sim.update(1 / 120);
    expect(sim.ammo).toBe(24);
    expect(sim.events.filter((event) => event === "pickup")).toHaveLength(1);
    sim.bullets = [];
    sim.fire();
    expect(sim.bullets).toHaveLength(3);
    expect(new Set(sim.bullets.map((bullet) => bullet.vy)).size).toBe(3);
  });

  it("only loses when an entire chunk crosses the left edge", () => {
    const sim = game();
    const block = sim.blocks[0]!;
    block.x = -10;
    block.vx = -100;
    sim.update(0.02);
    expect(sim.status).toBe("playing");
    block.x = -block.width - 100;
    sim.update(0.02);
    expect(sim.status).toBe("gameover");
    expect(sim.events).toContain("gameover");
    expect(sim.fire()).toBe(false);
  });

  it("bounces moving pieces at the arena boundary and exchanges collision impulses", () => {
    const sim = game();
    sim.blocks = [];
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
    for (let i = 0; i < 250 && sim.wave === 1; i++) {
      sim.blocks = [];
      sim.update(0.05);
    }
    expect(sim.wave).toBe(2);
    expect(sim.events).toContain("wave");
    expect(sim.waveTotal).toBeGreaterThan(4);
    expect(sim.score).toBeGreaterThanOrEqual(250);
  });

  it("allows aimed fire to clear consecutive waves without invulnerable fragments", () => {
    let seed = 19;
    const sim = new Simulation(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    });
    let equipped = 0;
    // Exercise baseline wave solvability; new attackers are covered independently below.
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
    for (
      let tick = 0;
      tick < 60 * 130 && sim.wave < 4 && sim.status === "playing";
      tick++
    ) {
      sim.blocks.forEach((block) => {
        block.angry = false;
      });
      let target: { x: number; y: number } | undefined;
      const hazard = sim.hazards[0];
      const pickup = sim.pickups[0];
      if (hazard) {
        const flight = Math.max(0, (hazard.x - 172) / (1080 - hazard.vx));
        target = { x: hazard.x, y: hazard.y + hazard.vy * flight };
      } else if (pickup) {
        const flight = Math.max(0, (pickup.x - 172) / 1080);
        target = { x: pickup.x, y: pickup.y + pickup.vy * flight };
      } else {
        const block = [...sim.blocks].sort(
          (a, b) => a.x - a.width / 2 - (b.x - b.width / 2),
        )[0];
        if (block) {
          const cos = Math.cos(block.angle),
            sin = Math.sin(block.angle);
          target = block.cells
            .filter((cell) => cell.alive)
            .map((cell) => ({
              x: block.x + cell.x * cos - cell.y * sin,
              y: block.y + cell.x * sin + cell.y * cos,
            }))
            .sort(
              (a, b) =>
                Math.abs(a.y - sim.playerY) - Math.abs(b.y - sim.playerY),
            )[0];
          if (target)
            target.y += block.vy * Math.max(0, (target.x - 172) / 1080);
        }
      }
      if (target) {
        sim.aimX = Math.max(220, target.x);
        sim.aimY = target.y;
        sim.fire();
      }
      sim.update(1 / 60);
      equipped += sim.events
        .splice(0)
        .filter((event) => event === "pickup").length;
    }
    expect(sim.status).toBe("playing");
    expect(sim.wave).toBe(4);
    expect(sim.blocksDestroyed).toBeGreaterThan(25);
    expect(equipped).toBeGreaterThanOrEqual(1);
  });

  it("enforces fire cooldown, clamps movement, and fully resets a completed run", () => {
    const sim = game();
    expect(sim.fire()).toBe(true);
    expect(sim.fire()).toBe(false);
    sim.aimY = -1000;
    for (let i = 0; i < 20; i++) sim.update(0.05);
    expect(sim.playerY).toBeGreaterThanOrEqual(166);
    expect(sim.playerY).toBeLessThan(170);
    expect(sim.fire()).toBe(true);
    sim.status = "gameover";
    sim.score = 9000;
    sim.reset();
    expect(sim.score).toBe(0);
    expect(sim.wave).toBe(1);
    expect(sim.playerY).toBe(360);
    expect(sim.blocks).toHaveLength(1);
    expect(sim.events).toEqual([]);
    expect(sim.status).toBe("playing");
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
    sim.wave = 7;
    const late = sim.spawnBlock({ code: undefined });
    expect(Math.abs(late.vx)).toBeGreaterThan(Math.abs(early.vx) * 2);
    expect(late.height).toBeGreaterThan(early.height);
    expect(late.toughness).toBe(3);
    expect(sim.waveTotal).toBeGreaterThan(count * 2);
    sim.blocks = [late];
    late.x = 800;
    late.y = 360;
    late.vx = late.vy = late.angle = 0;
    const before = late.cells.filter((cell) => cell.alive).length;
    hitCell(sim, late, late.cells[30]!);
    expect(late.cells.filter((cell) => cell.alive).length).toBe(before);
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
    expect(sim.events).toContain("stun");
    expect(sim.hazards).toHaveLength(0);
    const y = sim.playerY;
    sim.aimY = 580;
    expect(sim.fire()).toBe(false);
    expect(sim.fireSpecial()).toBe(false);
    sim.selectSpecial("grenade");
    expect(sim.specialWeapon).toBe("homing");
    sim.update(0.25);
    expect(sim.playerY).toBe(y);
    expect(sim.specialAmmo).toEqual({
      homing: 3,
      grenade: 2,
      review: 1,
      lint: 1,
    });
    for (let i = 0; i < 5; i++) sim.update(0.25);
    expect(sim.isStunned).toBe(false);
    expect(sim.events).toContain("recover");
    expect(sim.playerY).toBeGreaterThan(y);
    expect(sim.fire()).toBe(true);
    expect(sim.fireSpecial()).toBe(true);
  });

  it("allows timeout hazards to be dodged or shot down and spawns them naturally", () => {
    const sim = game();
    sim.spawnHazard({ x: 160, y: 200, vx: -450, vy: 0 });
    sim.update(0.25);
    expect(sim.isStunned).toBe(false);
    const hazard = sim.spawnHazard({ x: 500, y: 360, vx: -400, vy: 0 });
    sim.bullets.push({
      id: 9000,
      x: 470,
      y: 360,
      vx: 1080,
      vy: 0,
      life: 1,
      weapon: "single",
    });
    sim.update(0.02);
    expect(sim.hazards.some((item) => item.id === hazard.id)).toBe(false);
    expect(sim.score).toBeGreaterThanOrEqual(60);
    for (let i = 0; i < 37; i++) sim.update(0.25);
    expect(sim.events).toContain("hazard");
    expect(sim.hazards.some((item) => item.age < 1)).toBe(true);
  });

  it("reacquires homing targets after destruction instead of chasing stale fragments", () => {
    const sim = game();
    sim.blocks = [];
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
    expect(sim.specialAmmo.homing).toBe(2);
    expect(sim.fireSpecial()).toBe(false);
    sim.update(0.025);
    const missile = sim.specials[0]!;
    expect(missile.targetId).toBe(first.id);
    sim.blocks = [second];
    sim.update(0.08);
    expect(missile.targetId).toBe(second.id);
    expect(missile.vy).toBeGreaterThan(0);
    for (let i = 0; i < 30 && sim.specials.length; i++) sim.update(0.05);
    expect(sim.events).toContain("explosion");
  });

  it("homing prioritizes the rotated left edge over distance or center and follows changing urgency", () => {
    const sim = game();
    sim.blocks = [];
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
    sim.specials.push(missile);
    sim.update(1 / 120);
    expect(missile.targetId).toBe(wide.id);
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
    sim.blocks = [close];
    sim.update(1 / 120);
    expect(missile.targetId).toBe(close.id);
  });

  it.each(["homing", "grenade"] as const)(
    "%s blasts clear armored neighbors over a wide finite radius while bosses survive",
    (type) => {
      const sim = game();
      sim.wave = 7;
      sim.blocks = [];
      const blast = SPECIAL_BLASTS[type];
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
      const boss = sim.spawnBoss();
      boss.x = 700;
      boss.y = 360;
      const health = sim.bossHealth!.current;
      sim.specials.push({
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
      expect(sim.explosions[0]!.radius).toBe(blast.radius);
      expect(sim.blocks).not.toContain(a);
      expect(sim.blocks).not.toContain(b);
      expect(far.cells.every((cell) => cell.alive)).toBe(true);
      expect(sim.bossHealth!.current).toBeGreaterThan(0);
      expect(sim.bossHealth!.current).toBeLessThan(health);
    },
  );

  it("detonates recycle grenades across multiple rotated blocks with a finite radius", () => {
    const sim = game();
    sim.blocks = [];
    const code = [
      "const nested = JSON.parse(JSON.stringify(data));",
      'return nested.map((x: any) => eval("x"));',
    ];
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
    const countA = a.cells.filter((cell) => cell.alive).length;
    const countB = b.cells.filter((cell) => cell.alive).length;
    sim.specials.push({
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
    expect(sim.explosions[0]!.radius).toBe(SPECIAL_BLASTS.grenade.radius);
    expect(sim.specials).toHaveLength(0);
  });

  it("caps primary ammunition and grants occasional special refills only once per magic node", () => {
    const sim = game();
    sim.blocks = [];
    sim.ammo = 59;
    for (let i = 0; i < 2; i++) {
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
      sim.blocks = [block];
      hitCell(
        sim,
        block,
        block.cells.find((cell) => cell.magic === "ammo")!,
      );
      const other = block.cells.find(
        (cell) => cell.alive && cell.magic === "ammo",
      );
      if (other) hitCell(sim, block, other);
    }
    expect(sim.ammo).toBe(60);
    expect(sim.specialAmmo).toEqual({
      homing: 4,
      grenade: 2,
      review: 1,
      lint: 1,
    });
    sim.selectSpecial("grenade");
    expect(sim.fireSpecial()).toBe(true);
    expect(sim.specialAmmo.grenade).toBe(1);
  });

  it("matches the timeout text collider at the left glyphs and cleaner leading edge", () => {
    const sim = game();
    sim.spawnHazard({ x: 700, y: 360, vx: -400, vy: 0, durationMs: 1600 });
    // The visible word await starts roughly 100 pixels left of the label center.
    sim.bullets.push({
      id: 9001,
      x: 588,
      y: 360,
      vx: 1080,
      vy: 0,
      life: 1,
      weapon: "single",
    });
    sim.update(1 / 120);
    expect(sim.hazards).toHaveLength(0);
    sim.spawnHazard({ x: 235, y: 360, vx: -400, vy: 0 });
    sim.update(1 / 120);
    expect(sim.isStunned).toBe(true);
  });

  it("lands grenade blasts at the aimed point when no enemy intercepts the arc", () => {
    const sim = game();
    sim.blocks = [];
    sim.aimX = 800;
    sim.aimY = 450;
    sim.selectSpecial("grenade");
    sim.fireSpecial();
    for (let i = 0; i < 130 && !sim.explosions.length; i++) sim.update(1 / 120);
    expect(sim.explosions).toHaveLength(1);
    expect(Math.abs(sim.explosions[0]!.x - 800)).toBeLessThan(8);
    expect(Math.abs(sim.explosions[0]!.y - 450)).toBeLessThan(4);
  });

  it("lets a damaged armored robot survive and finish generating code before leaving", () => {
    const sim = game();
    sim.blocks = [];
    const robot = sim.spawnRobot({ x: 700, y: 400, brand: "anthropic" });
    sim.update(1 / 120);
    expect(robot.state).toBe("thinking");
    const score = sim.score;
    sim.bullets.push({
      id: 9900,
      x: 650,
      y: 400,
      vx: 1080,
      vy: 0,
      life: 1,
      weapon: "single",
    });
    sim.specials.push({
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
    sim.update(0.025);
    expect(sim.bullets).toHaveLength(0);
    expect(sim.specials).toHaveLength(0);
    expect(sim.explosions).toHaveLength(1);
    expect(sim.score).toBe(score);
    expect(robot.health).toBe(9);
    expect(sim.events.filter((event) => event === "robot-hit")).toHaveLength(2);
    expect(sim.robots).toContain(robot);
    expect(robot.hitFlash).toBeGreaterThan(0);
    for (let i = 0; i < 8; i++) sim.update(0.25);
    expect(robot.state).toBe("leaving");
    const generated = sim.blocks.find((block) => block.cells.length > 500)!;
    expect(generated).toBeDefined();
    expect(generated.height).toBeGreaterThan(250);
    expect(sim.events).toContain("generate");
    for (let i = 0; i < 10; i++) sim.update(0.25);
    expect(sim.robots).toHaveLength(0);
    expect(sim.status).toBe("playing");
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
    sim.robots = [];
    for (let i = 0; i < 53; i++) {
      sim.blocks.forEach((block) => {
        block.x = 1000;
      });
      sim.update(0.25);
    }
    expect(sim.robots).toHaveLength(1);
    expect(sim.events).toContain("robot");
  });

  it("has angry blocks throw small exception fragments and disables anger after splitting", () => {
    const sim = game();
    sim.blocks = [];
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
    const exception = sim.blocks.find((block) => block.exception)!;
    expect(exception).toBeDefined();
    expect(exception.angry).toBe(false);
    expect(exception.height).toBeLessThan(angry.height);
    expect(exception.vx).toBeLessThan(-100);
    expect(sim.events).toContain("exception");
    sim.selectSpecial("lint");
    expect(sim.fireSpecial()).toBe(true);
    expect(sim.blocks.every((block) => !block.angry)).toBe(true);
  });

  it("freezes enemy movement and attacks for two seconds while allowing fire and bonus motion", () => {
    const sim = game();
    sim.blocks = [];
    const block = sim.spawnBlock({ x: 1000, y: 350, angry: true });
    block.throwTimer = 0.1;
    const robot = sim.spawnRobot({ x: 900, y: 500 });
    const hazard = sim.spawnHazard({ x: 1000, y: 180, vx: -400, vy: 0 });
    const bonus = sim.spawnBonus("review", 850, 250);
    sim.selectSpecial("review");
    expect(sim.fireSpecial()).toBe(true);
    expect(sim.specialAmmo.review).toBe(0);
    expect(sim.freezeRemaining).toBe(2);
    expect(sim.reviewPulse).toBeGreaterThan(0);
    expect(sim.fire()).toBe(true);
    const original = {
      x: block.x,
      robotX: robot.x,
      hazardX: hazard.x,
      timer: block.throwTimer,
      bonusX: bonus.x,
    };
    for (let i = 0; i < 7; i++) sim.update(0.25);
    expect(block.x).toBe(original.x);
    expect(robot.x).toBe(original.robotX);
    expect(hazard.x).toBe(original.hazardX);
    expect(block.throwTimer).toBe(original.timer);
    expect(bonus.x).not.toBe(original.bonusX);
    expect(sim.freezeRemaining).toBeCloseTo(0.25);
    sim.update(0.25);
    expect(block.x).toBeCloseTo(original.x);
    sim.update(0.12);
    expect(sim.freezeRemaining).toBe(0);
    expect(block.x).toBeLessThan(original.x);
    expect(robot.x).toBeLessThan(original.robotX);
    expect(hazard.x).toBeLessThan(original.hazardX);
    expect(sim.events).toContain("exception");
  });

  it("lint clears small fragments instead of multiplying them and splits only large visible slabs once", () => {
    const sim = game();
    sim.blocks = [];
    for (let i = 0; i < 52; i++)
      sim.spawnBlock({
        x: 500 + i * 5,
        y: 300,
        exception: i % 2 === 0,
        code: ["const nested = (((((x: any) => x)))))();"],
      });
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
    expect(sim.blocks).toHaveLength(3);
    expect(sim.blocks).toContain(offscreen);
    const halves = sim.blocks.filter((block) => block !== offscreen);
    expect(halves.every((block) => block.generation === 1)).toBe(true);
    expect(halves.reduce((count, block) => count + block.cells.length, 0)).toBe(
      largeCount,
    );
    expect(sim.blocksDestroyed).toBe(52);
    expect(sim.specialAmmo.lint).toBe(0);
    expect(sim.lintPulse).toBeGreaterThan(0);
    expect(sim.events).toContain("lint");
    expect(sim.events.filter((event) => event === "destroy")).toHaveLength(52);
  });

  it("lint uses living glyph count at its boundary, clears worn armor and preserves magic rewards once", () => {
    const sim = game();
    sim.wave = 10;
    sim.blocks = [];
    const small = sim.spawnBlock({
      boss: true,
      x: 650,
      code: ["x".repeat(LINT_SMALL_BLOCK_CELLS)],
    });
    const large = sim.spawnBlock({
      x: 700,
      code: ["x".repeat(LINT_SMALL_BLOCK_CELLS + 1)],
    });
    const worn = sim.spawnBlock({
      x: 850,
      code: Array(8).fill(
        "const hugeButMostlyMissing = overcomplicate(input);",
      ),
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
      sim.blocks.some((block) =>
        [small.id, worn.id, magic.id, large.id].includes(block.id),
      ),
    ).toBe(false);
    expect(sim.blocks).toHaveLength(2);
    expect(sim.blocks.reduce((n, block) => n + block.cells.length, 0)).toBe(
      LINT_SMALL_BLOCK_CELLS + 1,
    );
    expect(
      sim.pickups.filter((pickup) => pickup.type === "quint"),
    ).toHaveLength(1);
    expect(sim.blocksDestroyed).toBe(3);
    expect(sim.score).toBeGreaterThan(0);
  });

  it("releases all weapon types from their magic variables, then grants them only on a second hit", () => {
    const keywords: [string, Pickup["type"]][] = [
      ["DOUBLE_SHOT", "double"],
      ["TRIPLE_SHOT", "triple"],
      ["QUAD_SHOT", "quad"],
      ["QUINT_SHOT", "quint"],
      ["HOMING_MISSILE", "homing"],
      ["RECYCLE_GRENADE", "grenade"],
      ["CODE_REVIEW", "review"],
      ["LINT_BOMB", "lint"],
    ];
    for (const [keyword, type] of keywords) {
      const sim = game();
      sim.blocks = [];
      const block = sim.spawnBlock({
        x: 850,
        y: 350,
        angle: 0,
        vx: 0,
        vy: 0,
        code: [
          `const ${keyword} = createOvercomplicatedFactory();`,
          "return JSON.parse(JSON.stringify(everything));",
        ],
      });
      hitCell(
        sim,
        block,
        block.cells.find((cell) => cell.magic === type)!,
      );
      expect(sim.pickups).toHaveLength(1);
      const bonus = sim.pickups[0]!;
      expect(bonus.type).toBe(type);
      expect(sim.weapon).toBe("single");
      bonus.age = 1;
      bonus.x = 500;
      bonus.y = 360;
      bonus.vx = bonus.vy = 0;
      sim.bullets.push({
        id: 9990,
        x: 490,
        y: 360,
        vx: 1080,
        vy: 0,
        life: 1,
        weapon: "single",
      });
      sim.update(1 / 120);
      expect(sim.pickups).toHaveLength(0);
      if (type in PRIMARY_AMMO) {
        expect(sim.weapon).toBe(type);
        expect(sim.ammo).toBe(PRIMARY_AMMO[type as keyof typeof PRIMARY_AMMO]);
      } else {
        const special = type as keyof typeof SPECIAL_AMMO_CAPS;
        expect(sim.specialAmmo[special]).toBeGreaterThan(
          special === "homing" ? 3 : special === "grenade" ? 2 : 1,
        );
        expect(sim.specialAmmo[special]).toBeLessThanOrEqual(
          SPECIAL_AMMO_CAPS[special],
        );
      }
    }
  });

  it("fires four/five distinct pellets and consumes one round per volley with more double/triple ammunition", () => {
    expect(PRIMARY_AMMO.double).toBeGreaterThan(10);
    expect(PRIMARY_AMMO.triple).toBeGreaterThan(6);
    for (const weapon of ["quad", "quint"] as const) {
      const sim = game();
      sim.weapon = weapon;
      sim.ammo = PRIMARY_AMMO[weapon];
      expect(sim.fire()).toBe(true);
      expect(sim.bullets).toHaveLength(weapon === "quad" ? 4 : 5);
      expect(new Set(sim.bullets.map((bullet) => bullet.vy)).size).toBe(
        sim.bullets.length,
      );
      expect(sim.ammo).toBe(PRIMARY_AMMO[weapon] - 1);
    }
  });

  it("makes four/five-shot bonuses and natural magic nodes rarer than ordinary weapons", () => {
    let seed = 154;
    const sim = new Simulation(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    });
    const counts: Record<string, number> = {};
    let quad = 0,
      quint = 0;
    for (let i = 0; i < 1000; i++) {
      const bonus = sim.spawnBonus();
      counts[bonus.type] = (counts[bonus.type] ?? 0) + 1;
      const block = sim.spawnBlock();
      if (block.cells.some((cell) => cell.magic === "quad")) quad++;
      if (block.cells.some((cell) => cell.magic === "quint")) quint++;
      sim.blocks = [];
      sim.pickups = [];
    }
    expect(counts.quad).toBeLessThan(counts.triple!);
    expect(counts.quint).toBeLessThan(counts.quad!);
    expect(quad).toBeGreaterThan(0);
    expect(quint).toBeGreaterThan(0);
    expect(quad).toBeLessThan(60);
    expect(quint).toBeLessThan(quad);
  });

  it("pauses robot thinking and anger timers throughout review, then resumes their attacks", () => {
    const sim = game();
    sim.blocks = [];
    const robot = sim.spawnRobot({ x: 700, y: 480 });
    robot.state = "thinking";
    robot.stateTime = 1.95;
    sim.selectSpecial("review");
    sim.fireSpecial();
    for (let i = 0; i < 8; i++) sim.update(0.25);
    expect(robot.stateTime).toBeCloseTo(1.95);
    expect(sim.events).not.toContain("generate");
    sim.update(0.1);
    expect(sim.events).toContain("generate");
    expect(sim.blocks[0]!.toughness).toBeGreaterThan(1);
  });

  it("spawns shootable bonuses naturally and caps each special inventory when collected repeatedly", () => {
    const sim = game();
    for (let i = 0; i < 73; i++) {
      sim.blocks.forEach((block) => {
        block.x = 1100;
        block.angry = false;
      });
      sim.update(0.25);
    }
    expect(sim.events).toContain("bonus");
    expect(sim.pickups.some((pickup) => pickup.age < 1)).toBe(true);
    sim.blocks = [];
    sim.robots = [];
    sim.hazards = [];
    sim.pickups = [];
    for (const type of ["homing", "grenade", "review", "lint"] as const) {
      sim.specialAmmo[type] = SPECIAL_AMMO_CAPS[type];
      const bonus = sim.spawnBonus(type, 500, 360);
      bonus.age = 1;
      bonus.vx = bonus.vy = 0;
      sim.bullets.push({
        id: 9998,
        x: 490,
        y: 360,
        vx: 1080,
        vy: 0,
        life: 1,
        weapon: "single",
      });
      sim.update(1 / 120);
      expect(sim.specialAmmo[type]).toBe(SPECIAL_AMMO_CAPS[type]);
      expect(sim.pickups).toHaveLength(0);
    }
  });

  it("prevents an overlapping timeout from attacking while frozen", () => {
    const sim = game();
    sim.spawnHazard({ x: 170, y: 360, vx: -400, vy: 0 });
    sim.selectSpecial("review");
    sim.fireSpecial();
    sim.update(0.25);
    expect(sim.isStunned).toBe(false);
    expect(sim.hazards[0]!.x).toBe(170);
    for (let i = 0; i < 8; i++) sim.update(0.25);
    expect(sim.isStunned).toBe(true);
  });

  it("replaces every fifth wave with exactly one factory boss and clears ordinary visitors", () => {
    for (const priorWave of [4, 9]) {
      const sim = game();
      sim.wave = priorWave;
      sim.spawnRobot();
      sim.spawnHazard({ x: 1400, y: 220 });
      for (let i = 0; i < 220 && sim.wave === priorWave; i++) {
        sim.blocks = [];
        sim.update(0.05);
      }
      expect(sim.wave).toBe(priorWave + 1);
      expect(sim.isBossWave).toBe(true);
      expect(sim.waveTotal).toBe(1);
      sim.update(0.02);
      expect(sim.blocks).toHaveLength(1);
      const boss = sim.blocks[0]!;
      expect(boss.boss).toBe(true);
      expect(boss.title).toBe("FactoryFactoryFactory");
      expect(boss.cells.length).toBeGreaterThan(650);
      expect(boss.height).toBe(348);
      expect(boss.width).toBeGreaterThan(600);
      expect(boss.width).toBeLessThan(780);
      expect(boss.toughness).toBe(6 + Math.floor((priorWave + 1) / 5) - 1);
      expect(sim.events.filter((event) => event === "boss")).toHaveLength(1);
      expect(sim.robots).toHaveLength(0);
      expect(sim.hazards).toHaveLength(0);
      for (let i = 0; i < 12; i++) sim.update(0.25);
      expect(sim.blocks).toHaveLength(1);
    }
  });

  it("keeps boss drift slow, glyphs armored and fragmentation harder than ordinary code", () => {
    const sim = game();
    sim.wave = 5;
    sim.blocks = [];
    const boss = sim.spawnBoss();
    const baseline = sim.bossHealth!;
    expect(baseline.current).toBe(baseline.max);
    expect(baseline.max).toBeGreaterThan(4000);
    expect(boss.toughness).toBeGreaterThan(5);
    for (let i = 0; i < 12; i++) {
      hitCell(
        sim,
        boss,
        boss.cells.find((cell) => cell.alive)!,
      );
    }
    expect(sim.blocks.filter((block) => block.boss)).toHaveLength(1);
    expect(sim.bossHealth!.current).toBeLessThan(baseline.current);
    expect(sim.bossHealth!.max).toBe(baseline.max);
    for (let i = 0; i < 12; i++) sim.update(0.25);
    expect(Math.abs(boss.vx)).toBeLessThan(35);
    expect(Math.abs(boss.vx)).toBeLessThan(sim.driftSpeed / 4);
    expect(
      boss.cells
        .filter((cell) => cell.alive)
        .every((cell) => cell.maxHealth === 6),
    ).toBe(true);
  });

  it("lint preserves boss lineage, armor, health baseline and a single shared minion generator", () => {
    const sim = game();
    sim.wave = 5;
    sim.blocks = [];
    const boss = sim.spawnBoss();
    boss.x = 1000;
    const root = boss.bossRoot;
    const health = sim.bossHealth!;
    const count = boss.cells.length;
    sim.selectSpecial("lint");
    expect(sim.fireSpecial()).toBe(true);
    expect(sim.blocks).toHaveLength(2);
    expect(
      sim.blocks.every((block) => block.boss && block.bossRoot === root),
    ).toBe(true);
    expect(sim.blocks.reduce((n, block) => n + block.cells.length, 0)).toBe(
      count,
    );
    expect(
      sim.blocks.every((block) =>
        block.cells.every((cell) => cell.health === 6),
      ),
    ).toBe(true);
    expect(sim.bossHealth).toEqual(health);
    for (let i = 0; i < 17; i++) sim.update(0.25);
    expect(sim.events.filter((event) => event === "boss-spawn")).toHaveLength(
      1,
    );
    expect(sim.blocks.filter((block) => block.bossMinion)).toHaveLength(1);
    expect(
      sim.blocks
        .filter((block) => block.boss)
        .every((block) => Math.abs(block.vx) < 40),
    ).toBe(true);
    expect(sim.bossHealth!.max).toBe(health.max);
    expect(sim.events.filter((event) => event === "boss")).toHaveLength(1);
  });

  it("pauses factory production during review and caps live minions without regular hazards or robots", () => {
    const sim = game();
    sim.wave = 5;
    sim.blocks = [];
    sim.spawnBoss();
    sim.selectSpecial("review");
    sim.fireSpecial();
    for (let i = 0; i < 8; i++) sim.update(0.25);
    expect(sim.events).not.toContain("boss-spawn");
    for (let i = 0; i < 15; i++) sim.update(0.25);
    expect(sim.events).not.toContain("boss-spawn");
    sim.update(0.25);
    sim.update(0.02);
    expect(sim.events.filter((event) => event === "boss-spawn")).toHaveLength(
      1,
    );
    for (let i = 0; i < 155; i++) {
      sim.blocks.forEach((block) => {
        block.x = block.boss ? 1050 : 650;
        block.y = block.boss ? 350 : 560;
      });
      sim.update(0.25);
    }
    expect(sim.status).toBe("playing");
    expect(sim.blocks.filter((block) => block.bossMinion)).toHaveLength(7);
    expect(sim.events.filter((event) => event === "boss-spawn")).toHaveLength(
      7,
    );
    expect(sim.robots).toHaveLength(0);
    expect(sim.hazards).toHaveLength(0);
    expect(sim.events).toContain("bonus");
  });

  it("rewards the factory defeat once, waits for minions and then advances to a regular wave", () => {
    const sim = game();
    sim.wave = 5;
    sim.blocks = [];
    const boss = sim.spawnBoss();
    // Put the factory on its final few damaged glyphs and leave one generated service alive.
    boss.x = 850;
    boss.y = 350;
    boss.angle = 0;
    boss.cells = boss.cells.slice(0, 7).map((cell) => ({ ...cell, health: 1 }));
    const minion = sim.spawnBlock({
      x: 1200,
      y: 550,
      code: ["const leftover = factory(anything);"],
    });
    minion.bossMinion = true;
    minion.bossRoot = boss.bossRoot;
    hitCell(sim, boss, boss.cells[0]!);
    expect(sim.blocks.some((block) => block.boss)).toBe(false);
    expect(sim.bossHealth).toBeUndefined();
    expect(
      sim.events.filter((event) => event === "boss-defeated"),
    ).toHaveLength(1);
    expect(sim.pickups.map((pickup) => pickup.type)).toEqual(["quint", "lint"]);
    const score = sim.score;
    for (let i = 0; i < 6; i++) sim.update(0.25);
    expect(sim.wave).toBe(5);
    expect(sim.score).toBe(score);
    expect(
      sim.events.filter((event) => event === "boss-defeated"),
    ).toHaveLength(1);
    sim.blocks = [];
    for (let i = 0; i < 5; i++) sim.update(0.25);
    expect(sim.wave).toBe(6);
    expect(sim.isBossWave).toBe(false);
    expect(sim.waveTotal).toBeGreaterThan(1);
    expect(sim.blocks.some((block) => !block.boss)).toBe(true);
    expect(
      sim.events.filter((event) => event === "boss-defeated"),
    ).toHaveLength(1);
    sim.reset();
    expect(sim.bossHealth).toBeUndefined();
    expect(sim.events).toEqual([]);
    expect(sim.blocks.every((block) => !block.boss)).toBe(true);
  });

  it("matches the enlarged timeout text width and vertical face for shots and dodging", () => {
    expect(TIMEOUT_METRICS).toEqual({
      fontSize: 20,
      charWidth: 12,
      widthPadding: 36,
      height: 54,
      depth: 30,
    });
    const sim = game();
    sim.spawnHazard({ x: 700, y: 360, vx: -400, vy: 0 });
    sim.bullets.push({
      id: 12001,
      x: 535,
      y: 389,
      vx: 1080,
      vy: 0,
      life: 1,
      weapon: "single",
    });
    sim.update(1 / 120);
    expect(sim.hazards).toHaveLength(0);
    sim.spawnHazard({ x: 280, y: 424, vx: -400, vy: 0 });
    sim.update(1 / 120);
    expect(sim.isStunned).toBe(true);
    const dodge = game();
    dodge.spawnHazard({ x: 280, y: 445, vx: -400, vy: 0 });
    dodge.update(1 / 120);
    expect(dodge.isStunned).toBe(false);
  });

  it("requires exactly fifteen primary bullet impacts to destroy an armored robot and stops generation", () => {
    const sim = game();
    sim.blocks = [];
    const robot = sim.spawnRobot({ x: 700, y: 400 });
    expect(robot.health).toBe(15);
    expect(robot.maxHealth).toBe(15);
    const hit = () => {
      sim.bullets.push({
        id: 19000,
        x: 648,
        y: 400,
        vx: 1080,
        vy: 0,
        life: 1,
        weapon: "single",
      });
      sim.update(1 / 120);
    };
    for (let i = 0; i < 14; i++) hit();
    expect(robot.health).toBe(1);
    expect(sim.robots).toContain(robot);
    expect(sim.events).not.toContain("robot-destroy");
    hit();
    expect(robot.health).toBe(0);
    expect(sim.robots).not.toContain(robot);
    expect(
      sim.events.filter((event) => event === "robot-destroy"),
    ).toHaveLength(1);
    const death = sim.visualEvents.find(
      (event) => event.type === "robot-death",
    );
    expect(death?.type === "robot-death" && death.robot.id).toBe(robot.id);
    expect(
      sim.visualEvents.filter(
        (event) => event.type === "impact" && event.target === "robot",
      ),
    ).toHaveLength(15);
    for (let i = 0; i < 9; i++) sim.update(0.25);
    expect(sim.events).not.toContain("generate");
    expect(sim.blocks).toHaveLength(0);
    sim.reset();
    expect(sim.visualEvents).toHaveLength(0);
    expect(sim.robots).toHaveLength(0);
  });

  it("damages robots once per special blast, including nearby robots in the blast radius", () => {
    for (const type of ["homing", "grenade"] as const) {
      const sim = game();
      sim.blocks = [];
      const direct = sim.spawnRobot({ x: 700, y: 400 });
      const nearby = sim.spawnRobot({ x: 800, y: 400 });
      nearby.state = "thinking";
      const outside = sim.spawnRobot({ x: 1200, y: 400 });
      outside.state = "thinking";
      sim.specials.push({
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
      expect(sim.explosions).toHaveLength(1);
      expect(sim.specials).toHaveLength(0);
      expect(sim.events.filter((event) => event === "robot-hit")).toHaveLength(
        2,
      );
    }
  });

  it("exports immutable split surface ancestry and glyph impacts without coupling rendering to gameplay", () => {
    const sim = game();
    const block = sim.blocks[0]!;
    hitCell(sim, block, block.cells[30]!);
    const impact = sim.visualEvents.find(
      (event) => event.type === "impact" && event.target === "code",
    );
    expect(impact?.type === "impact" && impact.removed!.length).toBeGreaterThan(
      0,
    );
    sim.specialWeapon = "lint";
    sim.fireSpecial();
    const split = sim.visualEvents.find((event) => event.type === "split");
    expect(split?.type).toBe("split");
    if (!split || split.type !== "split")
      throw new Error("Missing split snapshot");
    expect(split.children).toHaveLength(2);
    expect(split.parent.cells.some((cell) => !cell.alive)).toBe(true);
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
    const saved = split.children[0]!.cells[0]!.health;
    sim.blocks[0]!.cells[0]!.health = 0;
    expect(split.children[0]!.cells[0]!.health).toBe(saved);
    const events = sim.visualEvents.splice(0);
    expect(events.length).toBeGreaterThan(0);
    expect(sim.blocks).toHaveLength(2);
  });

  it("exports the final visible slab once when a cannon hit destroys a worn fragment", () => {
    const sim = game();
    sim.blocks = [];
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
    const before = block.cells.map((cell) => ({ ...cell }));
    hitCell(sim, block, block.cells[12]!);
    const deaths = sim.visualEvents.filter(
      (event) => event.type === "code-death",
    );
    expect(deaths).toHaveLength(1);
    const death = deaths[0]!;
    expect(death.block.cells).toEqual(before);
    expect(death.block.fracture).toEqual(block.fracture);
    expect(death.vx).toBe(1080);
    expect(death.radius).toBe(43);
    expect(Number.isFinite(death.x) && Number.isFinite(death.y)).toBe(true);
    const impact = sim.visualEvents.find(
      (event) => event.type === "impact" && event.blockId === block.id,
    );
    if (!impact || impact.type !== "impact")
      throw new Error("Missing final impact");
    expect(impact.removed).toHaveLength(
      before.filter((cell, i) => cell.alive && !block.cells[i]!.alive).length,
    );
    expect(death.seed).toBeGreaterThan(impact.seed);
    block.cells[1]!.char = "?";
    block.fracture.offsetX = 999;
    expect(death.block.cells[1]!.char).toBe("x");
    expect(death.block.fracture!.offsetX).toBe(30);
    expect(sim.blocks).not.toContain(block);
    expect(sim.blocksDestroyed).toBe(1);
    sim.update(0.2);
    expect(
      sim.visualEvents.filter((event) => event.type === "code-death"),
    ).toHaveLength(1);
  });

  it.each(["lint", "grenade"] as const)(
    "preserves a full pre-hit surface for %s kills of normal and boss code",
    (type) => {
      for (const boss of [false, true]) {
        const sim = game();
        sim.blocks = [];
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
        if (type === "lint") {
          sim.selectSpecial("lint");
          expect(sim.fireSpecial()).toBe(true);
        } else {
          sim.specials.push({
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
        expect(block.cells.every((cell) => !cell.alive)).toBe(true);
        const deaths = sim.visualEvents.filter(
          (event) => event.type === "code-death",
        );
        expect(deaths).toHaveLength(1);
        expect(
          deaths[0]!.block.cells.filter((cell) => cell.alive),
        ).toHaveLength(39);
        expect(deaths[0]!.block.boss).toBe(boss);
        expect(deaths[0]!.radius).toBeGreaterThan(100);
        expect(sim.blocks).not.toContain(block);
        expect(sim.blocksDestroyed).toBe(1);
        sim.reset();
        expect(sim.visualEvents).toHaveLength(0);
      }
    },
  );
});
