import { describe, expect, it } from 'vitest';
import { Simulation, type Block, type Cell, CODE_SLICES } from './simulation';

function game() { return new Simulation(() => 0.5); }

/** Place a projectile immediately in front of a chosen moving glyph. */
function hitCell(sim: Simulation, block: Block, cell: Cell) {
  const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
  const x = block.x + cell.x * cos - cell.y * sin;
  const y = block.y + cell.x * sin + cell.y * cos;
  sim.bullets.push({ id: 10000, x: x - 4, y, vx: 1080, vy: 0, life: 1, weapon: 'single' });
  sim.update(1 / 120);
}

describe('arcade simulation', () => {
  it('begins with a large visible block of syntax highlighted TypeScript', () => {
    const sim = game();
    expect(sim.blocks).toHaveLength(1);
    const block = sim.blocks[0]!;
    expect(block.x - block.width / 2).toBeLessThan(1280);
    expect(block.width).toBeGreaterThan(350);
    expect(block.cells.length).toBeGreaterThan(130);
    expect(new Set(block.cells.map(cell => cell.color)).size).toBeGreaterThan(4);
    expect(block.cells.some(cell => cell.magic === 'double')).toBe(true);
  });

  it('chips actual letters, produces letter particles, then splits into moving chunks', () => {
    const sim = game();
    const block = sim.blocks[0]!;
    const originalCount = block.cells.filter(cell => cell.alive).length;
    hitCell(sim, block, block.cells[30]!);
    expect(block.cells.filter(cell => cell.alive).length).toBeLessThan(originalCount);
    expect(sim.particles.some(particle => particle.char)).toBe(true);
    expect(sim.score).toBeGreaterThan(0);
    for (let i = 0; i < 4; i++) hitCell(sim, block, block.cells.filter(cell => cell.alive)[35]!);
    expect(sim.blocks).toHaveLength(2);
    expect(sim.blocks.every(chunk => chunk.generation === 1)).toBe(true);
    expect(sim.blocks[0]!.vy).not.toBe(sim.blocks[1]!.vy);
    expect(sim.events).toContain('split');
  });

  it('requires shooting a released weapon before granting it and limits special ammo', () => {
    const sim = game();
    sim.blocks = [];
    const block = sim.spawnBlock({ x: 700, y: 350, vx: 0, vy: 0, angle: 0,
      code: ['const DOUBLE_SHOT = prepareFactoryFactory();', 'return JSON.parse(JSON.stringify(everything));'] });
    hitCell(sim, block, block.cells.find(cell => cell.magic === 'double')!);
    expect(sim.pickups).toHaveLength(1);
    expect(sim.weapon).toBe('single');
    const pickup = sim.pickups[0]!;
    pickup.age = 1;
    pickup.x = 400;
    pickup.y = 360;
    sim.bullets.push({ id: 10001, x: 394, y: 360, vx: 1080, vy: 0, life: 1, weapon: 'single' });
    sim.update(1 / 120);
    expect(sim.pickups).toHaveLength(0);
    expect(sim.weapon).toBe('double');
    expect(sim.ammo).toBe(10);
    sim.bullets = [];
    sim.fire();
    expect(sim.bullets).toHaveLength(2);
    expect(sim.ammo).toBe(9);
    sim.ammo = 0;
    sim.update(0.2);
    sim.bullets = [];
    sim.fire();
    expect(sim.weapon).toBe('single');
    expect(sim.bullets).toHaveLength(1);
  });

  it('grants magic ammo once even when several keyword letters are hit', () => {
    const sim = game();
    sim.blocks = [];
    const block = sim.spawnBlock({ x: 700, y: 350, vx: 0, vy: 0, angle: 0,
      code: ['const AMMO_CACHE = generateReallyLongThing();', 'return totallyUnnecessaryRecursion(true);'] });
    hitCell(sim, block, block.cells.find(cell => cell.magic === 'ammo')!);
    expect(sim.ammo).toBe(4);
    const remainingMagic = block.cells.find(cell => cell.alive && cell.magic === 'ammo');
    if (remainingMagic) hitCell(sim, block, remainingMagic);
    expect(sim.ammo).toBe(4);
  });

  it('collects a weapon only once when spread bullets strike it together', () => {
    const sim = game();
    sim.blocks = [];
    sim.pickups.push({ id: 700, x: 500, y: 360, vx: 0, vy: 0, life: 10, age: 1, type: 'triple' });
    for (let i = 0; i < 3; i++) sim.bullets.push({ id: 800 + i, x: 490, y: 360 + i, vx: 1080,
      vy: 0, life: 1, weapon: 'triple' });
    sim.update(1 / 120);
    expect(sim.ammo).toBe(6);
    expect(sim.events.filter(event => event === 'pickup')).toHaveLength(1);
    sim.bullets = [];
    sim.fire();
    expect(sim.bullets).toHaveLength(3);
    expect(new Set(sim.bullets.map(bullet => bullet.vy)).size).toBe(3);
  });

  it('only loses when an entire chunk crosses the left edge', () => {
    const sim = game();
    const block = sim.blocks[0]!;
    block.x = -10;
    block.vx = -100;
    sim.update(0.02);
    expect(sim.status).toBe('playing');
    block.x = -block.width - 100;
    sim.update(0.02);
    expect(sim.status).toBe('gameover');
    expect(sim.events).toContain('gameover');
    expect(sim.fire()).toBe(false);
  });

  it('bounces moving pieces at the arena boundary and exchanges collision impulses', () => {
    const sim = game();
    sim.blocks = [];
    const a = sim.spawnBlock({ x: 600, y: 133, vx: 0, vy: -100, angle: 0, code: ['const a = 1;'] });
    sim.update(0.05);
    expect(a.vy).toBeGreaterThan(0);
    a.y = 400;
    a.x = 600;
    a.vx = 100;
    a.age = 1;
    const b = sim.spawnBlock({ x: 700, y: 400, vx: -100, vy: 0, angle: 0, code: ['const b = 2;'] });
    b.age = 1;
    sim.update(0.01);
    expect(a.vx).toBeLessThan(0);
    expect(b.vx).toBeGreaterThan(0);
  });

  it('advances difficulty after all spawned blocks are cleared', () => {
    const sim = game();
    for (let i = 0; i < 250 && sim.wave === 1; i++) {
      sim.blocks = [];
      sim.update(0.05);
    }
    expect(sim.wave).toBe(2);
    expect(sim.events).toContain('wave');
    expect(sim.waveTotal).toBeGreaterThan(4);
    expect(sim.score).toBeGreaterThanOrEqual(250);
  });

  it('allows aimed fire to clear consecutive waves without invulnerable fragments', () => {
    let seed = 19;
    const sim = new Simulation(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    });
    let equipped = 0;
    for (let tick = 0; tick < 60 * 130 && sim.wave < 4 && sim.status === 'playing'; tick++) {
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
        const block = [...sim.blocks].sort((a, b) => (a.x - a.width / 2) - (b.x - b.width / 2))[0];
        if (block) {
          const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
          target = block.cells.filter(cell => cell.alive).map(cell => ({
            x: block.x + cell.x * cos - cell.y * sin,
            y: block.y + cell.x * sin + cell.y * cos,
          })).sort((a, b) => Math.abs(a.y - sim.playerY) - Math.abs(b.y - sim.playerY))[0];
          if (target) target.y += block.vy * Math.max(0, (target.x - 172) / 1080);
        }
      }
      if (target) { sim.aimX = Math.max(220, target.x); sim.aimY = target.y; sim.fire(); }
      sim.update(1 / 60);
      equipped += sim.events.splice(0).filter(event => event === 'pickup').length;
    }
    expect(sim.status).toBe('playing');
    expect(sim.wave).toBe(4);
    expect(sim.blocksDestroyed).toBeGreaterThan(25);
    expect(equipped).toBeGreaterThanOrEqual(1);
  });

  it('enforces fire cooldown, clamps movement, and fully resets a completed run', () => {
    const sim = game();
    expect(sim.fire()).toBe(true);
    expect(sim.fire()).toBe(false);
    sim.aimY = -1000;
    for (let i = 0; i < 20; i++) sim.update(0.05);
    expect(sim.playerY).toBeGreaterThanOrEqual(166);
    expect(sim.playerY).toBeLessThan(170);
    expect(sim.fire()).toBe(true);
    sim.status = 'gameover';
    sim.score = 9000;
    sim.reset();
    expect(sim.score).toBe(0);
    expect(sim.wave).toBe(1);
    expect(sim.playerY).toBe(360);
    expect(sim.blocks).toHaveLength(1);
    expect(sim.events).toEqual([]);
    expect(sim.status).toBe('playing');
  });

  it('offers 32 distinct ridiculous TypeScript blocks with rare power keywords', () => {
    expect(CODE_SLICES.length).toBeGreaterThanOrEqual(24);
    expect(new Set(CODE_SLICES.map(code => code.join('\n'))).size).toBe(CODE_SLICES.length);
    const drops = CODE_SLICES.filter(code => /DOUBLE_SHOT|TRIPLE_SHOT/.test(code.join('')));
    expect(drops.length / CODE_SLICES.length).toBeLessThan(0.25);
    expect(CODE_SLICES.every(code => code.length >= 6)).toBe(true);
  });

  it('increases speed, glyph toughness, card size and enemy count over waves', () => {
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
    late.x = 800; late.y = 360; late.vx = late.vy = late.angle = 0;
    const before = late.cells.filter(cell => cell.alive).length;
    hitCell(sim, late, late.cells[30]!);
    expect(late.cells.filter(cell => cell.alive).length).toBe(before);
    expect(late.cells.some(cell => cell.health < cell.maxHealth)).toBe(true);
    hitCell(sim, late, late.cells[30]!);
    hitCell(sim, late, late.cells[30]!);
    expect(late.cells.filter(cell => cell.alive).length).toBeLessThan(before);
  });

  it('stuns movement and both firing modes for the timeout duration, then recovers', () => {
    const sim = game();
    sim.spawnHazard({ x: 160, y: 360, vx: -400, vy: 0, durationMs: 1200 });
    sim.update(0.1);
    expect(sim.isStunned).toBe(true);
    expect(sim.events).toContain('stun');
    expect(sim.hazards).toHaveLength(0);
    const y = sim.playerY;
    sim.aimY = 580;
    expect(sim.fire()).toBe(false);
    expect(sim.fireSpecial()).toBe(false);
    sim.selectSpecial('grenade');
    expect(sim.specialWeapon).toBe('homing');
    sim.update(0.25);
    expect(sim.playerY).toBe(y);
    expect(sim.specialAmmo).toEqual({ homing: 3, grenade: 2 });
    for (let i = 0; i < 5; i++) sim.update(0.25);
    expect(sim.isStunned).toBe(false);
    expect(sim.events).toContain('recover');
    expect(sim.playerY).toBeGreaterThan(y);
    expect(sim.fire()).toBe(true);
    expect(sim.fireSpecial()).toBe(true);
  });

  it('allows timeout hazards to be dodged or shot down and spawns them naturally', () => {
    const sim = game();
    sim.spawnHazard({ x: 160, y: 200, vx: -450, vy: 0 });
    sim.update(0.25);
    expect(sim.isStunned).toBe(false);
    const hazard = sim.spawnHazard({ x: 500, y: 360, vx: -400, vy: 0 });
    sim.bullets.push({ id: 9000, x: 470, y: 360, vx: 1080, vy: 0, life: 1, weapon: 'single' });
    sim.update(0.02);
    expect(sim.hazards.some(item => item.id === hazard.id)).toBe(false);
    expect(sim.score).toBeGreaterThanOrEqual(60);
    for (let i = 0; i < 37; i++) sim.update(0.25);
    expect(sim.events).toContain('hazard');
    expect(sim.hazards.some(item => item.age < 1)).toBe(true);
  });

  it('reacquires homing targets after destruction instead of chasing stale fragments', () => {
    const sim = game();
    sim.blocks = [];
    const first = sim.spawnBlock({ x: 550, y: 310, vx: 0, vy: 0, angle: 0, code: ['const target = makeOvercomplicatedFactory();'] });
    const second = sim.spawnBlock({ x: 850, y: 520, vx: 0, vy: 0, angle: 0, code: ['const other = makeOvercomplicatedFactory();'] });
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
    expect(sim.events).toContain('explosion');
  });

  it('detonates recycle grenades across multiple rotated blocks with a finite radius', () => {
    const sim = game();
    sim.blocks = [];
    const code = ['const nested = JSON.parse(JSON.stringify(data));', 'return nested.map((x: any) => eval("x"));'];
    const a = sim.spawnBlock({ x: 660, y: 320, vx: 0, vy: 0, angle: 0.35, code });
    const b = sim.spawnBlock({ x: 770, y: 440, vx: 0, vy: 0, angle: -0.3, code });
    const far = sim.spawnBlock({ x: 1200, y: 560, vx: 0, vy: 0, angle: 0.2, code });
    const countA = a.cells.filter(cell => cell.alive).length;
    const countB = b.cells.filter(cell => cell.alive).length;
    sim.specials.push({ id: 999, type: 'grenade', x: 700, y: 360, vx: 0, vy: 0, life: 2, angle: 0, fuse: 0.001 });
    sim.update(1 / 120);
    expect(a.cells.filter(cell => cell.alive).length).toBeLessThan(countA);
    expect(b.cells.filter(cell => cell.alive).length).toBeLessThan(countB);
    expect(far.cells.every(cell => cell.alive)).toBe(true);
    expect(sim.explosions[0]!.radius).toBe(205);
    expect(sim.specials).toHaveLength(0);
  });

  it('caps scarce ammunition and grants occasional special refills only once per magic node', () => {
    const sim = game();
    sim.blocks = [];
    sim.ammo = 17;
    for (let i = 0; i < 2; i++) {
      const block = sim.spawnBlock({ x: 700, y: 350, vx: 0, vy: 0, angle: 0,
        code: ['const AMMO_CACHE = generateReallyLongThing();', 'return totallyUnnecessaryRecursion(true);'] });
      sim.blocks = [block];
      hitCell(sim, block, block.cells.find(cell => cell.magic === 'ammo')!);
      const other = block.cells.find(cell => cell.alive && cell.magic === 'ammo');
      if (other) hitCell(sim, block, other);
    }
    expect(sim.ammo).toBe(18);
    expect(sim.specialAmmo).toEqual({ homing: 4, grenade: 2 });
    sim.selectSpecial('grenade');
    expect(sim.fireSpecial()).toBe(true);
    expect(sim.specialAmmo.grenade).toBe(1);
  });


  it('matches the timeout text collider at the left glyphs and cleaner leading edge', () => {
    const sim = game();
    sim.spawnHazard({ x: 700, y: 360, vx: -400, vy: 0, durationMs: 1600 });
    // The visible word await starts roughly 100 pixels left of the label center.
    sim.bullets.push({ id: 9001, x: 588, y: 360, vx: 1080, vy: 0, life: 1, weapon: 'single' });
    sim.update(1 / 120);
    expect(sim.hazards).toHaveLength(0);
    sim.spawnHazard({ x: 235, y: 360, vx: -400, vy: 0 });
    sim.update(1 / 120);
    expect(sim.isStunned).toBe(true);
  });

  it('lands grenade blasts at the aimed point when no enemy intercepts the arc', () => {
    const sim = game();
    sim.blocks = [];
    sim.aimX = 800; sim.aimY = 450;
    sim.selectSpecial('grenade');
    sim.fireSpecial();
    for (let i = 0; i < 130 && !sim.explosions.length; i++) sim.update(1 / 120);
    expect(sim.explosions).toHaveLength(1);
    expect(Math.abs(sim.explosions[0]!.x - 800)).toBeLessThan(8);
    expect(Math.abs(sim.explosions[0]!.y - 450)).toBeLessThan(4);
  });

});
