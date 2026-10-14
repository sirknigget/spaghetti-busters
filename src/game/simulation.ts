export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const CELL_WIDTH = 9;
export const CELL_HEIGHT = 20;

export type Weapon = 'single' | 'double' | 'triple';
export type Magic = 'double' | 'triple' | 'ammo';
export type GameEvent = 'shot' | 'hit' | 'split' | 'destroy' | 'pickup' | 'ammo' | 'wave' | 'gameover';

export interface Cell {
  x: number;
  y: number;
  char: string;
  color: string;
  alive: boolean;
  magic?: Magic;
  magicId?: string;
}

export interface Block {
  id: number;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  width: number;
  height: number;
  cells: Cell[];
  hits: number;
  age: number;
  generation: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  weapon: Weapon;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  char?: string;
  color: string;
  angle: number;
}

export interface Pickup {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'double' | 'triple';
  life: number;
  age: number;
}

export interface SpawnBlockOptions {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  angle?: number;
  code?: string[];
}

const CODE_SLICES = [
  [
    'async function resolveEverything(data: any) {',
    '  const DOUBLE_SHOT = data.data ?? data;',
    '  return await Promise.all(data.map(async x =>',
    '    JSON.parse(JSON.stringify(x)).map((y: any) =>',
    '      y === y ? eval("y") : resolveEverything(y))',
    '  )).then(x => x.flat(Infinity));',
    '} // TODO: rewrite before production',
  ],
  [
    'class AbstractFactoryFactoryFactory {',
    '  private TRIPLE_SHOT: any = undefined;',
    '  getValue(value: any): any {',
    '    return !!value ? this.getValue(!!value)',
    '      : new Proxy(value || {}, {',
    '        get: (_, key) => this.getValue(key)',
    '      }); // it works on my machine',
    '  }',
    '}',
  ],
  [
    'const AMMO_CACHE = [null, undefined, NaN];',
    'function doTheThingButActually(v: any): any {',
    '  for (let i = 0; i < 999999; i++) {',
    '    v = v ? (v === true ? !!v : v) : !v;',
    '    setTimeout(() => doTheThingButActually(v), 0);',
    '  } return JSON.parse(JSON.stringify(v));',
    '} // complexity is a feature',
  ],
  [
    'type Recursive<T> = T extends Promise<infer U>',
    '  ? Recursive<Recursive<U>> : any;',
    'const DOUBLE_SHOT = new Map<any, any>();',
    'const AMMO_CACHE = [...Array(42)].reduce(',
    '  (acc: any, _: any) => ({ ...acc, ...acc }), {}',
    '); // O(please do not ask)',
    'export default (() => () => () => null)()()();',
  ],
];

const COLORS = {
  text: '#d6e2f0', keyword: '#bd9bff', string: '#b7e994',
  number: '#ffbc79', comment: '#6889a6', punctuation: '#7da6c6', magic: '#ffe270',
};
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));

/** A deterministic, renderer-independent arcade simulation. Time is in seconds. */
export class Simulation {
  aimX = 900;
  aimY = 360;
  playerY = 360;
  blocks: Block[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  pickups: Pickup[] = [];
  events: GameEvent[] = [];
  score = 0;
  wave = 1;
  combo = 0;
  weapon: Weapon = 'single';
  ammo = 0;
  status: 'playing' | 'gameover' = 'playing';
  elapsed = 0;
  shotsFired = 0;
  blocksDestroyed = 0;
  private nextId = 1;
  private cooldown = 0;
  private spawnTimer = 0;
  private pendingBlocks = 0;
  private comboTimer = 0;
  private waveTimer = 0;
  private triggeredMagics = new Set<string>();

  constructor(private readonly random: () => number = Math.random) {
    this.reset();
  }

  get waveRemaining() { return this.blocks.length + this.pendingBlocks; }
  get waveTotal() { return this.wave === 1 ? 3 : Math.min(8, 2 + this.wave); }
  get waveLabel() { return `WAVE ${String(this.wave).padStart(2, '0')}`; }

  reset() {
    this.aimX = 900;
    this.aimY = this.playerY = 360;
    this.blocks = [];
    this.bullets = [];
    this.particles = [];
    this.pickups = [];
    this.events = [];
    this.score = this.combo = this.ammo = this.elapsed = 0;
    this.shotsFired = this.blocksDestroyed = 0;
    this.wave = 1;
    this.weapon = 'single';
    this.status = 'playing';
    this.nextId = 1;
    this.cooldown = this.comboTimer = this.waveTimer = 0;
    this.triggeredMagics.clear();
    this.pendingBlocks = 2;
    this.spawnTimer = 4.4;
    this.spawnBlock({ x: 1050, y: 330, vx: -43, vy: 12, angle: -0.035 });
  }

  spawnBlock(options: SpawnBlockOptions = {}): Block {
    const id = this.nextId++;
    const code = options.code ?? CODE_SLICES[(this.wave + id - 2) % CODE_SLICES.length]!;
    const width = Math.max(...code.map(line => line.length)) * CELL_WIDTH + 28;
    const height = code.length * CELL_HEIGHT + 28;
    const cells: Cell[] = [];
    code.forEach((line, row) => {
      const colorAt = Array<string>(line.length).fill(COLORS.text);
      const tokenPattern = /\/\/.*$|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\b(?:async|await|function|return|const|let|class|private|new|extends|infer|type|export|default|for|any|true|false|null|undefined)\b|\b\d+\b|[{}()[\];.,?:=+!<>|]/g;
      for (const match of line.matchAll(tokenPattern)) {
        const token = match[0];
        const color = token.startsWith('//') ? COLORS.comment
          : /^["']/.test(token) ? COLORS.string
          : /^\d/.test(token) ? COLORS.number
          : /^[a-z]/i.test(token) ? COLORS.keyword : COLORS.punctuation;
        for (let i = match.index!; i < match.index! + token.length; i++) colorAt[i] = color;
      }
      const magics: { start: number; end: number; type: Magic; id: string }[] = [];
      for (const [keyword, type] of [['DOUBLE_SHOT', 'double'], ['TRIPLE_SHOT', 'triple'], ['AMMO_CACHE', 'ammo']] as const) {
        const start = line.indexOf(keyword);
        if (start >= 0) magics.push({ start, end: start + keyword.length, type, id: `${id}:${row}:${start}` });
      }
      [...line].forEach((char, column) => {
        if (char === ' ') return;
        const magic = magics.find(item => column >= item.start && column < item.end);
        cells.push({
          x: column * CELL_WIDTH - width / 2 + 18,
          y: row * CELL_HEIGHT - height / 2 + 22,
          char, color: magic ? COLORS.magic : colorAt[column]!, alive: true,
          magic: magic?.type, magicId: magic?.id,
        });
      });
    });
    const block: Block = {
      id, title: ['legacy-service.ts', 'factory-factory.ts', 'utils-final-v9.ts', 'types-of-doom.ts'][(this.wave + id - 2) % 4]!,
      x: options.x ?? GAME_WIDTH + width / 2 + 12,
      y: options.y ?? 235 + this.random() * 270,
      vx: options.vx ?? -(42 + this.wave * 7 + this.random() * 12),
      vy: options.vy ?? (this.random() - 0.5) * (40 + this.wave * 5),
      angle: options.angle ?? (this.random() - 0.5) * 0.13,
      angularVelocity: (this.random() - 0.5) * 0.045,
      width, height, cells, hits: 0, age: 0, generation: 0,
    };
    this.blocks.push(block);
    return block;
  }

  fire(): boolean {
    if (this.status !== 'playing' || this.cooldown > 0) return false;
    if (this.weapon !== 'single' && this.ammo <= 0) this.weapon = 'single';
    const angle = Math.atan2(this.aimY - this.playerY, Math.max(80, this.aimX - 158));
    const spreads = this.weapon === 'triple' ? [-0.15, 0, 0.15] : this.weapon === 'double' ? [-0.065, 0.065] : [0];
    for (const spread of spreads) {
      const direction = angle + spread;
      this.bullets.push({ id: this.nextId++, x: 172, y: this.playerY, vx: Math.cos(direction) * 1080,
        vy: Math.sin(direction) * 1080, life: 1.5, weapon: this.weapon });
    }
    if (this.weapon !== 'single') this.ammo--;
    this.cooldown = 0.135;
    this.shotsFired++;
    this.events.push('shot');
    return true;
  }

  update(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0 || this.status !== 'playing') return;
    // Fixed-size substeps prevent tunneling and unstable impulses on slow devices.
    let remaining = Math.min(dt, 0.25);
    while (remaining > 0 && this.status === 'playing') {
      const step = Math.min(remaining, 1 / 120);
      this.step(step);
      remaining -= step;
    }
  }

  private step(dt: number) {
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.playerY += (clamp(this.aimY, 166, 610) - this.playerY) * (1 - Math.exp(-dt * 14));
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.spawnTimer -= dt;
    if (this.pendingBlocks > 0 && this.spawnTimer <= 0) {
      this.spawnBlock();
      this.pendingBlocks--;
      this.spawnTimer = Math.max(1.65, 4.8 - this.wave * 0.25);
    }
    if (this.blocks.length === 0 && this.pendingBlocks === 0) {
      this.waveTimer += dt;
      if (this.waveTimer > 1.0) {
        this.wave++;
        this.score += 250 * (this.wave - 1);
        this.pendingBlocks = Math.min(8, 2 + this.wave);
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.events.push('wave');
      }
    } else this.waveTimer = 0;

    for (const block of this.blocks) {
      block.age += dt;
      block.vx += (-(42 + this.wave * 7) - block.vx) * dt * 0.18;
      block.vy *= Math.exp(-dt * 0.12);
      block.angularVelocity *= Math.exp(-dt * 0.2);
      block.x += block.vx * dt;
      block.y += block.vy * dt;
      block.angle += block.angularVelocity * dt;
      const extent = this.extents(block);
      if (block.y - extent.y < 112) {
        block.y = 112 + extent.y;
        block.vy = Math.abs(block.vy) * 0.86 + 6;
        block.angularVelocity *= -0.7;
      }
      if (block.y + extent.y > 650) {
        block.y = 650 - extent.y;
        block.vy = -Math.abs(block.vy) * 0.86 - 6;
        block.angularVelocity *= -0.7;
      }
      // Spawned blocks enter naturally; only objects already moving right bounce here.
      if (block.vx > 0 && block.x + extent.x > GAME_WIDTH - 10) {
        block.x = GAME_WIDTH - 10 - extent.x;
        block.vx = -block.vx * 0.76;
      }
      if (block.x + extent.x < 0) {
        this.status = 'gameover';
        this.events.push('gameover');
        return;
      }
    }
    this.collideBlocks();

    for (const pickup of this.pickups) {
      pickup.age += dt;
      pickup.life -= dt;
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      if (pickup.y < 140 || pickup.y > 620) {
        pickup.y = clamp(pickup.y, 140, 620);
        pickup.vy *= -1;
      }
      if (pickup.x > 1235) { pickup.x = 1235; pickup.vx = -Math.abs(pickup.vx); }
      if (pickup.x < 260) { pickup.x = 260; pickup.vx = Math.abs(pickup.vx); }
    }
    this.pickups = this.pickups.filter(pickup => pickup.life > 0);

    for (const bullet of this.bullets) {
      bullet.life -= dt;
      const oldX = bullet.x;
      const oldY = bullet.y;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      let hit = false;
      for (const pickup of this.pickups) {
        if (pickup.life > 0 && pickup.age > 0.18 && this.segmentDistance(oldX, oldY, bullet.x, bullet.y, pickup.x, pickup.y) < 29) {
          this.weapon = pickup.type;
          this.ammo = Math.min(99, this.ammo + (pickup.type === 'triple' ? 28 : 36));
          pickup.life = 0;
          this.score += 100;
          this.burst(pickup.x, pickup.y, '#ffe270', 20);
          this.events.push('pickup');
          hit = true;
          break;
        }
      }
      if (!hit) {
        // Ascending distance ensures the frontmost block absorbs each projectile.
        const candidates = [...this.blocks].sort((a, b) => a.x - b.x);
        for (const block of candidates) {
          const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
          const ax = (oldX - block.x) * cos + (oldY - block.y) * sin;
          const ay = -(oldX - block.x) * sin + (oldY - block.y) * cos;
          const bx = (bullet.x - block.x) * cos + (bullet.y - block.y) * sin;
          const by = -(bullet.x - block.x) * sin + (bullet.y - block.y) * cos;
          if (Math.max(ax, bx) < -block.width / 2 - 10 || Math.min(ax, bx) > block.width / 2 + 10
            || Math.max(ay, by) < -block.height / 2 - 12 || Math.min(ay, by) > block.height / 2 + 12) continue;
          const cell = block.cells.find(item => item.alive
            && this.segmentDistance(ax, ay, bx, by, item.x, item.y) < 13);
          if (cell) {
            this.damage(block, cell.x, cell.y, bullet);
            hit = true;
            break;
          }
        }
      }
      if (hit) bullet.life = 0;
    }
    this.bullets = this.bullets.filter(bullet => bullet.life > 0 && bullet.x < 1340 && bullet.y > 70 && bullet.y < 710);
    this.pickups = this.pickups.filter(pickup => pickup.life > 0);
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 230 * dt;
      particle.vx *= Math.exp(-dt * 0.6);
      particle.angle += dt * particle.vx * 0.015;
    }
    this.particles = this.particles.filter(particle => particle.life > 0).slice(-700);
  }

  private damage(block: Block, x: number, y: number, bullet: Bullet) {
    const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
    const radius = block.cells.filter(cell => cell.alive).length < 35 ? 65 : 43;
    let removed = 0;
    for (const cell of block.cells) {
      if (!cell.alive || Math.hypot(cell.x - x, cell.y - y) > radius) continue;
      cell.alive = false;
      removed++;
      const worldX = block.x + cell.x * cos - cell.y * sin;
      const worldY = block.y + cell.x * sin + cell.y * cos;
      const life = 0.45 + this.random() * 0.65;
      this.particles.push({ x: worldX, y: worldY, vx: 50 + this.random() * 230,
        vy: (this.random() - 0.5) * 320 - 65, life, maxLife: life,
        char: cell.char, color: cell.color, angle: (this.random() - 0.5) * 0.7 });
      if (cell.magic && cell.magicId && !this.triggeredMagics.has(cell.magicId)) {
        this.triggeredMagics.add(cell.magicId);
        if (cell.magic === 'ammo') {
          this.ammo = Math.min(99, this.ammo + 18);
          this.events.push('ammo');
          this.burst(worldX, worldY, '#83f4bd', 16);
        } else {
          this.pickups.push({ id: this.nextId++, x: worldX, y: worldY,
            vx: -35 - this.random() * 35, vy: (this.random() > 0.5 ? 1 : -1) * 95,
            type: cell.magic, life: 18, age: 0 });
        }
      }
    }
    block.hits++;
    block.vx = Math.min(165, block.vx + 65);
    block.vy += bullet.vy * 0.035 + (y / Math.max(block.height, 1)) * 35;
    block.angularVelocity += clamp(y * 0.0013, -0.16, 0.16);
    this.combo = Math.min(99, this.combo + 1);
    this.comboTimer = 2.4;
    this.score += removed * (2 + Math.min(6, Math.floor(this.combo / 5)));
    this.events.push('hit');
    const remaining = block.cells.filter(cell => cell.alive);
    if (remaining.length < 18 || (block.generation > 1 && remaining.length < 32)) {
      this.blocks = this.blocks.filter(item => item.id !== block.id);
      this.score += 75 + block.generation * 25;
      this.blocksDestroyed++;
      this.burst(block.x, block.y, '#79e7ff', 15);
      this.events.push('destroy');
    } else if (block.hits >= 3 && remaining.length > 38) {
      this.split(block, remaining, x, y);
    }
  }

  private split(block: Block, cells: Cell[], hitX: number, hitY: number) {
    const horizontal = block.height > block.width * 0.6;
    const sorted = [...cells].sort((a, b) => horizontal ? a.y - b.y : a.x - b.x);
    const middle = Math.floor(sorted.length / 2);
    const halves = [sorted.slice(0, middle), sorted.slice(middle)];
    const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
    this.blocks = this.blocks.filter(item => item.id !== block.id);
    halves.forEach((half, index) => {
      const minX = Math.min(...half.map(cell => cell.x));
      const maxX = Math.max(...half.map(cell => cell.x));
      const minY = Math.min(...half.map(cell => cell.y));
      const maxY = Math.max(...half.map(cell => cell.y));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const sign = index === 0 ? -1 : 1;
      const width = maxX - minX + 30, height = maxY - minY + 34;
      this.blocks.push({
        id: this.nextId++, title: block.title, x: block.x + centerX * cos - centerY * sin,
        y: block.y + centerX * sin + centerY * cos,
        vx: block.vx + sign * 27,
        vy: block.vy + sign * 85 + (centerY - hitY) * 0.1,
        angle: block.angle + sign * 0.025,
        angularVelocity: block.angularVelocity + sign * (0.12 + Math.abs(hitX) * 0.0006),
        width, height, cells: half.map(cell => ({ ...cell, x: cell.x - centerX, y: cell.y - centerY })),
        hits: 0, age: 0, generation: block.generation + 1,
      });
    });
    this.score += 50;
    this.events.push('split');
  }

  private collideBlocks() {
    for (let i = 0; i < this.blocks.length; i++) {
      const a = this.blocks[i]!;
      if (a.age < 0.35) continue;
      const ae = this.extents(a);
      for (let j = i + 1; j < this.blocks.length; j++) {
        const b = this.blocks[j]!;
        if (b.age < 0.35 || a.x > GAME_WIDTH + ae.x || b.x > GAME_WIDTH + b.width / 2) continue;
        const be = this.extents(b);
        const overlapX = ae.x + be.x - Math.abs(b.x - a.x);
        const overlapY = ae.y + be.y - Math.abs(b.y - a.y);
        if (overlapX <= 0 || overlapY <= 0) continue;
        const nx = overlapX < overlapY ? (b.x >= a.x ? 1 : -1) : 0;
        const ny = nx === 0 ? (b.y >= a.y ? 1 : -1) : 0;
        const overlap = Math.min(overlapX, overlapY);
        const massA = Math.max(20, a.cells.length), massB = Math.max(20, b.cells.length);
        const inverseA = 1 / massA, inverseB = 1 / massB;
        const separation = Math.max(0, overlap - 0.5) * 0.55 / (inverseA + inverseB);
        a.x -= nx * separation * inverseA; a.y -= ny * separation * inverseA;
        b.x += nx * separation * inverseB; b.y += ny * separation * inverseB;
        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relative < 0) {
          const impulse = -1.72 * relative / (inverseA + inverseB);
          a.vx -= impulse * nx * inverseA; a.vy -= impulse * ny * inverseA;
          b.vx += impulse * nx * inverseB; b.vy += impulse * ny * inverseB;
          a.angularVelocity -= relative * 0.0008;
          b.angularVelocity += relative * 0.0008;
        }
      }
    }
  }

  private extents(block: Block) {
    const cos = Math.abs(Math.cos(block.angle)), sin = Math.abs(Math.sin(block.angle));
    return { x: cos * block.width / 2 + sin * block.height / 2,
      y: sin * block.width / 2 + cos * block.height / 2 };
  }

  private segmentDistance(ax: number, ay: number, bx: number, by: number, px: number, py: number) {
    const dx = bx - ax, dy = by - ay;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / length, 0, 1);
    return Math.hypot(ax + dx * t - px, ay + dy * t - py);
  }

  private burst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2;
      const speed = 60 + this.random() * 180;
      const life = 0.3 + this.random() * 0.45;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life, maxLife: life, color, angle });
    }
  }
}
