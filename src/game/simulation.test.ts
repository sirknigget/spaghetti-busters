import { describe, expect, it } from 'vitest';
import { Simulation, type Block, type Cell } from './simulation';

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
    for (let i = 0; i < 2; i++) hitCell(sim, block, block.cells.filter(cell => cell.alive)[35]!);
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
    expect(sim.ammo).toBe(36);
    sim.bullets = [];
    sim.fire();
    expect(sim.bullets).toHaveLength(2);
    expect(sim.ammo).toBe(35);
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
    expect(sim.ammo).toBe(18);
    const remainingMagic = block.cells.find(cell => cell.alive && cell.magic === 'ammo');
    if (remainingMagic) hitCell(sim, block, remainingMagic);
    expect(sim.ammo).toBe(18);
  });

  it('collects a weapon only once when spread bullets strike it together', () => {
    const sim = game();
    sim.blocks = [];
    sim.pickups.push({ id: 700, x: 500, y: 360, vx: 0, vy: 0, life: 10, age: 1, type: 'triple' });
    for (let i = 0; i < 3; i++) sim.bullets.push({ id: 800 + i, x: 490, y: 360 + i, vx: 1080,
      vy: 0, life: 1, weapon: 'triple' });
    sim.update(1 / 120);
    expect(sim.ammo).toBe(28);
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
    expect(sim.waveTotal).toBeGreaterThan(3);
    expect(sim.score).toBeGreaterThanOrEqual(250);
  });

  it('allows aimed fire to clear consecutive waves without invulnerable fragments', () => {
    let seed = 19;
    const sim = new Simulation(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    });
    let equipped = 0;
    for (let tick = 0; tick < 60 * 65 && sim.wave < 4 && sim.status === 'playing'; tick++) {
      let target: { x: number; y: number } | undefined;
      const pickup = sim.pickups[0];
      if (pickup) {
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
    expect(equipped).toBeGreaterThan(3);
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
});
