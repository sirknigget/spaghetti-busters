import { CODE_SLICES } from './code-library';
export { CODE_SLICES } from './code-library';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const CELL_WIDTH = 9;
export const CELL_HEIGHT = 20;

export type Weapon = 'single' | 'double' | 'triple' | 'quad' | 'quint';
export const PRIMARY_AMMO = { double: 30, triple: 24, quad: 16, quint: 12 } as const;
export const SPECIAL_AMMO_CAPS = { homing: 6, grenade: 5, review: 4, lint: 3 } as const;
export type SpecialWeapon = 'homing' | 'grenade' | 'review' | 'lint';
export type Magic = Pickup['type'] | 'ammo';
export type GameEvent = 'shot' | 'hit' | 'split' | 'destroy' | 'pickup' | 'ammo' | 'wave' | 'gameover' | 'missile' | 'grenade' | 'explosion' | 'stun' | 'hazard' | 'recover' | 'robot' | 'generate' | 'exception' | 'review' | 'lint' | 'bonus' | 'absorb';

export interface Cell {
  x: number;
  y: number;
  char: string;
  color: string;
  alive: boolean;
  health: number;
  maxHealth: number;
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
  toughness: number;
  angry: boolean;
  exception: boolean;
  throwTimer: number;
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
  type: Exclude<Weapon, 'single'> | SpecialWeapon;
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
  angry?: boolean;
  exception?: boolean;
}

export interface SpecialProjectile {
  id: number; type: SpecialWeapon; x: number; y: number;
  vx: number; vy: number; life: number; angle: number; fuse?: number;
  targetId?: number;
}
export type RobotBrand = 'openai' | 'anthropic' | 'google' | 'x' | 'moonshot' | 'zai' | 'deepseek' | 'meta';
export interface Robot {
  id: number; x: number; y: number; brand: RobotBrand;
  state: 'running' | 'thinking' | 'leaving'; age: number; stateTime: number; hitFlash: number;
}

export interface Explosion { x: number; y: number; radius: number; life: number; maxLife: number; }
export interface TimeoutHazard {
  id: number; x: number; y: number; vx: number; vy: number;
  durationMs: number; life: number; health: number; age: number;
}

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
  specialWeapon: SpecialWeapon = 'homing';
  specialAmmo: Record<SpecialWeapon, number> = { homing: 3, grenade: 2, review: 1, lint: 1 };
  specials: SpecialProjectile[] = [];
  explosions: Explosion[] = [];
  hazards: TimeoutHazard[] = [];
  stunRemaining = 0;
  freezeRemaining = 0;
  reviewPulse = 0;
  lintPulse = 0;
  robots: Robot[] = [];
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
  private specialCooldown = 0;
  private hazardTimer = 9;
  private robotTimer = 13;
  private bonusTimer = 18;
  private ammoCaches = 0;
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
  get waveTotal() { return Math.min(16, 4 + Math.floor((this.wave - 1) * 1.4)); }
  get isStunned() { return this.stunRemaining > 0; }
  get driftSpeed() { return Math.min(265, 68 + this.wave * 11 + this.wave * this.wave * 1.8); }
  get waveLabel() { return `WAVE ${String(this.wave).padStart(2, '0')}`; }

  reset() {
    this.aimX = 900;
    this.aimY = this.playerY = 360;
    this.blocks = [];
    this.bullets = [];
    this.particles = [];
    this.pickups = [];
    this.specials = [];
    this.explosions = [];
    this.hazards = [];
    this.specialWeapon = 'homing';
    this.specialAmmo = { homing: 3, grenade: 2, review: 1, lint: 1 };
    this.robots = [];
    this.freezeRemaining = this.reviewPulse = this.lintPulse = 0;
    this.robotTimer = 13;
    this.bonusTimer = 18;
    this.stunRemaining = this.specialCooldown = this.ammoCaches = 0;
    this.hazardTimer = 9;
    this.events = [];
    this.score = this.combo = this.ammo = this.elapsed = 0;
    this.shotsFired = this.blocksDestroyed = 0;
    this.wave = 1;
    this.weapon = 'single';
    this.status = 'playing';
    this.nextId = 1;
    this.cooldown = this.comboTimer = this.waveTimer = 0;
    this.triggeredMagics.clear();
    this.pendingBlocks = this.waveTotal - 1;
    this.spawnTimer = 3.2;
    this.spawnBlock({ x: 1050, y: 330, vx: -this.driftSpeed, vy: 22, angle: -0.035 });
  }

  spawnBlock(options: SpawnBlockOptions = {}): Block {
    const id = this.nextId++;
    const base = CODE_SLICES[(this.wave * 7 + id - 8) % CODE_SLICES.length]!;
    const extra = Math.min(5, Math.floor((this.wave - 1) / 2));
    const code = options.code ?? [...base,
      ...Array.from({ length: extra }, (_, i) => [
        'const retry = () => retry(retry as any);',
        'await Promise.resolve(JSON.stringify(this));',
        'if (true !== false) { eval("undefined"); }',
        'queueMicrotask(() => queueMicrotask(retry));',
        '// TODO: ticket closed as cannot reproduce',
      ][i]!)];
    if (!options.code && id > 1) {
      const roll = this.random();
      const keyword = roll < 0.018 ? 'QUINT_SHOT' : roll < 0.05 ? 'QUAD_SHOT'
        : roll < 0.085 ? 'LINT_BOMB' : roll < 0.13 ? 'CODE_REVIEW'
        : roll < 0.18 ? 'RECYCLE_GRENADE' : roll < 0.24 ? 'HOMING_MISSILE' : undefined;
      if (keyword) code.push(`const ${keyword} = proxyFactory(await import("legacy"));`);
    }
    const toughness = Math.min(3, 1 + Math.floor((this.wave - 1) / 3));
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
      for (const [keyword, type] of [['DOUBLE_SHOT', 'double'], ['TRIPLE_SHOT', 'triple'], ['QUAD_SHOT', 'quad'], ['QUINT_SHOT', 'quint'], ['HOMING_MISSILE', 'homing'], ['RECYCLE_GRENADE', 'grenade'], ['CODE_REVIEW', 'review'], ['LINT_BOMB', 'lint'], ['AMMO_CACHE', 'ammo']] as const) {
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
          health: toughness, maxHealth: toughness,
          magic: magic?.type, magicId: magic?.id,
        });
      });
    });
    const block: Block = {
      id, title: ['legacy-service.ts', 'factory-factory.ts', 'utils-final-v9.ts', 'types-of-doom.ts'][(this.wave + id - 2) % 4]!,
      x: options.x ?? GAME_WIDTH + width / 2 + 12,
      y: options.y ?? 235 + this.random() * 270,
      vx: options.vx ?? -(this.driftSpeed + this.random() * 16),
      vy: options.vy ?? (this.random() - 0.5) * Math.min(160, 55 + this.wave * 10),
      angle: options.angle ?? (this.random() - 0.5) * 0.13,
      angularVelocity: (this.random() - 0.5) * 0.045,
      width, height, cells, hits: 0, age: 0, generation: 0, toughness,
      angry: options.exception ? false : options.angry ?? (id > 1 && this.random() < 0.13),
      exception: options.exception ?? false, throwTimer: 2.5 + this.random() * 1.5,
    };
    this.blocks.push(block);
    return block;
  }

  fire(): boolean {
    if (this.status !== 'playing' || this.isStunned || this.cooldown > 0) return false;
    if (this.weapon !== 'single' && this.ammo <= 0) this.weapon = 'single';
    const angle = Math.atan2(this.aimY - this.playerY, Math.max(80, this.aimX - 158));
    const spreads = this.weapon === 'quint' ? [-0.22, -0.11, 0, 0.11, 0.22]
      : this.weapon === 'quad' ? [-0.18, -0.06, 0.06, 0.18]
      : this.weapon === 'triple' ? [-0.15, 0, 0.15] : this.weapon === 'double' ? [-0.065, 0.065] : [0];
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

  selectSpecial(type: SpecialWeapon) {
    if (this.status === 'playing' && !this.isStunned && type in SPECIAL_AMMO_CAPS) this.specialWeapon = type;
  }

  fireSpecial(): boolean {
    const type = this.specialWeapon;
    if (this.status !== 'playing' || this.isStunned || this.specialCooldown > 0 || this.specialAmmo[type] <= 0) return false;
    if (type === 'review' || type === 'lint') {
      this.specialAmmo[type]--;
      this.specialCooldown = 0.8;
      if (type === 'review') {
        this.freezeRemaining = 2;
        this.reviewPulse = 0.65;
        this.events.push('review');
      } else {
        this.lintPulse = 0.8;
        // Snapshot ensures each original block splits exactly once, with no fragment cap.
        for (const block of [...this.blocks]) {
          const extent = this.extents(block);
          if (block.x + extent.x < 0 || block.x - extent.x > GAME_WIDTH) continue;
          const cells = block.cells.filter(cell => cell.alive);
          if (cells.length > 1) this.split(block, cells, 0, 0);
        }
        this.events.push('lint');
      }
      return true;
    }
    const angle = Math.atan2(this.aimY - this.playerY, Math.max(80, this.aimX - 158));
    const speed = 600;
    const fuse = 1.05;
    this.specials.push({ id: this.nextId++, type, x: 172, y: this.playerY,
      vx: type === 'grenade' ? (clamp(this.aimX, 220, 1230) - 172) / fuse : Math.cos(angle) * speed,
      vy: type === 'grenade' ? (clamp(this.aimY, 140, 620) - this.playerY - 0.5 * 255 * fuse * fuse) / fuse : Math.sin(angle) * speed,
      angle, life: type === 'homing' ? 5 : 2.2, fuse: type === 'grenade' ? fuse : undefined });
    this.specialAmmo[type]--;
    this.specialCooldown = type === 'homing' ? 0.6 : 0.85;
    this.events.push(type === 'homing' ? 'missile' : 'grenade');
    return true;
  }

  spawnRobot(options: { x?: number; y?: number; brand?: RobotBrand } = {}): Robot {
    const brands: RobotBrand[] = ['openai', 'anthropic', 'google', 'x', 'moonshot', 'zai', 'deepseek', 'meta'];
    const robot: Robot = { id: this.nextId++, x: options.x ?? 1370,
      y: options.y ?? 440 + this.random() * 130,
      brand: options.brand ?? brands[Math.floor(this.random() * brands.length)]!,
      state: 'running', age: 0, stateTime: 0, hitFlash: 0 };
    this.robots.push(robot);
    this.events.push('robot');
    return robot;
  }

  spawnBonus(type?: Pickup['type'], x = 1000, y = 220 + this.random() * 300): Pickup {
    // Specials dominate bonus drops; four/five-shot primaries remain the rarest prizes.
    const roll = this.random();
    const chosen = type ?? (roll < 0.22 ? 'homing' : roll < 0.43 ? 'grenade'
      : roll < 0.62 ? 'review' : roll < 0.76 ? 'lint' : roll < 0.88 ? 'double'
      : roll < 0.96 ? 'triple' : roll < 0.988 ? 'quad' : 'quint');
    const pickup: Pickup = { id: this.nextId++, x, y, vx: -45 - this.random() * 35,
      vy: (this.random() > 0.5 ? 1 : -1) * 95, type: chosen, life: 15, age: 0 };
    this.pickups.push(pickup);
    this.events.push('bonus');
    return pickup;
  }

  private absorb(robot: Robot) {
    robot.hitFlash = 0.2;
    this.burst(robot.x - 40, robot.y, '#b7c7e9', 8);
    this.events.push('absorb');
  }

  private interceptRobot(ax: number, ay: number, bx: number, by: number): Robot | undefined {
    return [...this.robots].sort((a, b) => a.x - b.x).find(robot =>
      this.segmentRectangle(ax - robot.x, ay - robot.y, bx - robot.x, by - robot.y, 41, 64));
  }

  private updateRobots(dt: number) {
    for (const robot of this.robots) {
      robot.age += dt;
      robot.stateTime += dt;
      robot.hitFlash = Math.max(0, robot.hitFlash - dt);
      if (robot.state === 'running') {
        robot.x = Math.max(700, robot.x - 300 * dt);
        if (robot.x <= 700) { robot.state = 'thinking'; robot.stateTime = 0; }
      } else if (robot.state === 'thinking' && robot.stateTime >= 2) {
        const generated = this.spawnBlock({ x: robot.x + 230, y: clamp(robot.y - 130, 260, 480), vx: -this.driftSpeed * 1.2,
          code: [
            'export async function generatedFactory<T extends any>(input: T) {',
            '  const context = new Proxy(JSON.parse(JSON.stringify(input)), {',
            '    get: (state, key) => Reflect.get(state, key) ?? (() => context)',
            '  }); // AI generated: please do not question the architecture',
            '  return await new Promise(async (resolve, reject) => {',
            '    for (const key of Object.keys(context).sort().reverse()) {',
            '      await Promise.resolve().then(() => Promise.resolve(key));',
            '      if (!!Boolean(context[key] ?? true) !== false) {',
            '        resolve(eval(JSON.stringify(JSON.parse(JSON.stringify(context)))));',
            '      } else { setTimeout(() => generatedFactory(context), 0); }',
            '    } reject(new Error("implementation left as an exercise"));',
            '  }); // TODO: rewrite after the next funding round',
            '}',
          ] });
        generated.toughness = Math.min(4, generated.toughness + 1);
        generated.cells.forEach(cell => { cell.health = cell.maxHealth = generated.toughness; });
        robot.state = 'leaving'; robot.stateTime = 0;
        this.events.push('generate');
      } else if (robot.state === 'leaving') robot.x += 340 * dt;
    }
    this.robots = this.robots.filter(robot => robot.x < 1450);
  }

  private throwException(block: Block) {
    const labels = [
      ['throw new Error("oops");'], ['TypeError: any is not a function'],
      ['UnhandledPromiseRejection'], ['RangeError: stack overflow'],
      ['throw new Error("works locally");'], ['NullPointerException: undefined'],
    ];
    this.spawnBlock({ x: block.x - block.width / 2 - 35, y: clamp(block.y + (this.random() - 0.5) * 130, 160, 590),
      vx: -Math.min(430, this.driftSpeed + 145), vy: (this.random() - 0.5) * 170,
      angle: (this.random() - 0.5) * 0.3, exception: true,
      code: labels[Math.floor(this.random() * labels.length)]! });
    this.events.push('exception');
  }

  spawnHazard(options: { x?: number; y?: number; durationMs?: number; vx?: number; vy?: number } = {}): TimeoutHazard {
    const x = options.x ?? 1420;
    const y = options.y ?? clamp(this.playerY + (this.random() - 0.5) * 160, 155, 610);
    const vx = options.vx ?? -Math.min(650, 350 + this.wave * 25);
    const durationMs = options.durationMs ?? [1200, 1600, 2000, 2400][Math.floor(this.random() * 4)]!;
    const hazard = { id: this.nextId++, x, y, vx,
      vy: options.vy ?? (this.playerY - y) / Math.max(0.1, (x - 100) / -vx),
      durationMs, life: 6, health: 1, age: 0 };
    this.hazards.push(hazard);
    this.events.push('hazard');
    return hazard;
  }

  private updateHazards(dt: number) {
    for (const hazard of this.hazards) {
      if (hazard.life <= 0) continue;
      const oldX = hazard.x, oldY = hazard.y;
      hazard.age += dt;
      hazard.life -= dt;
      hazard.x += hazard.vx * dt;
      hazard.y += hazard.vy * dt;
      if (this.segmentRectangle(oldX - 100, oldY - this.playerY, hazard.x - 100, hazard.y - this.playerY, this.hazardHalfWidth(hazard) + 30, 58)) {
        this.stunRemaining = Math.max(this.stunRemaining, hazard.durationMs / 1000);
        hazard.life = 0;
        this.burst(100, this.playerY, '#ff88bb', 30);
        this.events.push('stun');
      }
      if (hazard.x < -180) hazard.life = 0;
    }
    this.hazards = this.hazards.filter(hazard => hazard.life > 0);
  }

  private updateSpecials(dt: number) {
    for (const explosion of this.explosions) explosion.life -= dt;
    this.explosions = this.explosions.filter(explosion => explosion.life > 0);
    for (const special of this.specials) {
      special.life -= dt;
      if (special.life <= 0) continue;
      const oldX = special.x, oldY = special.y;
      if (special.type === 'homing') {
        // Reacquire every substep: splitting or destroying a target never strands a missile.
        let target: { x: number; y: number; id: number } | undefined;
        let nearest = Infinity;
        for (const block of this.blocks) {
          if (block.x < 150 || block.x > GAME_WIDTH + 150) continue;
          const centerDistance = Math.hypot(block.x - special.x, block.y - special.y);
          const closestPossible = Math.max(0, centerDistance - Math.hypot(block.width, block.height) / 2);
          if (closestPossible * closestPossible > nearest) continue;
          const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
          for (const cell of block.cells) {
            if (!cell.alive) continue;
            const x = block.x + cell.x * cos - cell.y * sin;
            const y = block.y + cell.x * sin + cell.y * cos;
            const distance = (x - special.x) ** 2 + (y - special.y) ** 2;
            if (distance < nearest) { nearest = distance; target = { x, y, id: block.id }; }
          }
        }
        special.targetId = target?.id;
        if (target) {
          const desired = Math.atan2(target.y - special.y, target.x - special.x);
          const delta = Math.atan2(Math.sin(desired - special.angle), Math.cos(desired - special.angle));
          special.angle += clamp(delta, -dt * 7, dt * 7);
        }
        special.vx = Math.cos(special.angle) * 640;
        special.vy = Math.sin(special.angle) * 640;
      } else {
        special.vy += 255 * dt;
        special.angle += dt * 5;
        special.fuse = (special.fuse ?? 0) - dt;
      }
      special.x += special.vx * dt;
      special.y += special.vy * dt;
      if (special.type === 'grenade' && (special.y < 130 || special.y > 635)) {
        special.y = clamp(special.y, 130, 635);
        special.vy *= -0.65;
      }
      const robot = this.interceptRobot(oldX, oldY, special.x, special.y);
      if (robot) { this.absorb(robot); special.life = 0; continue; }
      let collision = false;
      for (const block of this.blocks) {
        if (Math.abs(block.x - special.x) > block.width + 40 || Math.abs(block.y - special.y) > block.height + 100) continue;
        const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
        const ax = (oldX - block.x) * cos + (oldY - block.y) * sin;
        const ay = -(oldX - block.x) * sin + (oldY - block.y) * cos;
        const bx = (special.x - block.x) * cos + (special.y - block.y) * sin;
        const by = -(special.x - block.x) * sin + (special.y - block.y) * cos;
        if (block.cells.some(cell => cell.alive && this.segmentDistance(ax, ay, bx, by, cell.x, cell.y) < 17)) {
          collision = true;
          break;
        }
      }
      if (collision || (special.type === 'grenade' && (special.fuse ?? 0) <= 0)) {
        this.explode(special.x, special.y, special.type === 'grenade' ? 205 : 82, special.type === 'grenade' ? 3 : 2);
        special.life = 0;
      }
    }
    this.specials = this.specials.filter(special => special.life > 0 && special.x > -150 && special.x < 1600 && special.y > 20 && special.y < 760);
  }

  private explode(x: number, y: number, radius: number, power: number) {
    this.explosions.push({ x, y, radius, life: 0.42, maxLife: 0.42 });
    this.events.push('explosion');
    this.burst(x, y, '#8cf5cd', 38);
    for (const hazard of this.hazards) {
      if (Math.hypot(hazard.x - x, hazard.y - y) < radius) hazard.life = 0;
    }
    for (const block of [...this.blocks]) {
      const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
      const localX = (x - block.x) * cos + (y - block.y) * sin;
      const localY = -(x - block.x) * sin + (y - block.y) * cos;
      if (block.cells.some(cell => cell.alive && Math.hypot(cell.x - localX, cell.y - localY) <= radius)) {
        this.damage(block, localX, localY, { vy: (block.y - y) * 2 }, radius, power);
      }
    }
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
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    if (this.stunRemaining > 0) {
      this.stunRemaining = Math.max(0, this.stunRemaining - dt);
      if (this.stunRemaining === 0) this.events.push('recover');
    } else this.playerY += (clamp(this.aimY, 166, 610) - this.playerY) * (1 - Math.exp(-dt * 14));
    const enemyDt = Math.min(dt, Math.max(0, dt - this.freezeRemaining));
    this.freezeRemaining = Math.max(0, this.freezeRemaining - dt);
    this.reviewPulse = Math.max(0, this.reviewPulse - dt);
    this.lintPulse = Math.max(0, this.lintPulse - dt);
    this.robotTimer -= enemyDt;
    this.bonusTimer -= dt;
    if (enemyDt > 0 && this.robotTimer <= 0 && this.robots.length === 0) {
      this.spawnRobot();
      this.robotTimer = Math.max(13, 24 - this.wave * 0.5) + this.random() * 9;
    }
    if (this.bonusTimer <= 0) {
      this.spawnBonus();
      this.bonusTimer = 17 + this.random() * 10;
    }
    this.hazardTimer -= enemyDt;
    if (enemyDt > 0 && this.hazardTimer <= 0) {
      this.spawnHazard();
      this.hazardTimer = Math.max(4.8, 11.5 - this.wave * 0.55) + this.random() * 3;
    }
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.spawnTimer -= enemyDt;
    if (enemyDt > 0 && this.pendingBlocks > 0 && this.spawnTimer <= 0 && this.blocks.length < 48) {
      this.spawnBlock();
      this.pendingBlocks--;
      this.spawnTimer = Math.max(0.95, 3.6 - this.wave * 0.24);
    }
    if (this.blocks.length === 0 && this.pendingBlocks === 0) {
      this.waveTimer += dt;
      if (this.waveTimer > 1.0) {
        this.wave++;
        this.score += 250 * (this.wave - 1);
        this.pendingBlocks = this.waveTotal;
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.events.push('wave');
      }
    } else this.waveTimer = 0;

    for (const block of [...this.blocks]) {
      if (enemyDt <= 0) continue;
      block.age += enemyDt;
      if (block.angry) {
        block.throwTimer -= enemyDt;
        if (block.throwTimer <= 0) { this.throwException(block); block.throwTimer = Math.max(1.2, 3.8 - this.wave * 0.12) + this.random(); }
      }
      block.vx += (-this.driftSpeed - block.vx) * enemyDt * 0.42;
      block.vy *= Math.exp(-enemyDt * 0.12);
      block.angularVelocity *= Math.exp(-enemyDt * 0.2);
      block.x += block.vx * enemyDt;
      block.y += block.vy * enemyDt;
      block.angle += block.angularVelocity * enemyDt;
      if (Math.abs(block.angle) > 0.42) {
        block.angle = clamp(block.angle, -0.42, 0.42);
        block.angularVelocity *= -0.7;
      }
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
    if (enemyDt > 0) this.collideBlocks();
    if (enemyDt > 0) {
      this.updateRobots(enemyDt);
      this.updateHazards(enemyDt);
    }
    this.updateSpecials(dt);

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
      const shield = this.interceptRobot(oldX, oldY, bullet.x, bullet.y);
      if (shield) { this.absorb(shield); hit = true; }
      for (const hazard of this.hazards) {
        if (hit) break;
        if (hazard.life > 0 && this.hitsHazard(oldX, oldY, bullet.x, bullet.y, hazard)) {
          hazard.life = 0;
          this.score += 60;
          this.burst(hazard.x, hazard.y, '#ff8fbd', 18);
          this.events.push('hit');
          hit = true;
          break;
        }
      }
      for (const pickup of this.pickups) {
        if (hit) break;
        if (pickup.life > 0 && pickup.age > 0.18 && this.segmentDistance(oldX, oldY, bullet.x, bullet.y, pickup.x, pickup.y) < 29) {
          if (pickup.type in SPECIAL_AMMO_CAPS) {
            const type = pickup.type as SpecialWeapon;
            this.specialAmmo[type] = Math.min(SPECIAL_AMMO_CAPS[type], this.specialAmmo[type] + (type === 'homing' ? 2 : 1));
          } else {
            const type = pickup.type as Exclude<Weapon, 'single'>;
            this.ammo = Math.min(PRIMARY_AMMO[type] * 2, (this.weapon === type ? this.ammo : 0) + PRIMARY_AMMO[type]);
            this.weapon = type;
          }
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
    this.hazards = this.hazards.filter(hazard => hazard.life > 0);
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

  private damage(block: Block, x: number, y: number, bullet: Pick<Bullet, "vy">, blastRadius?: number, power = 1) {
    const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
    const radius = blastRadius ?? (block.cells.filter(cell => cell.alive).length < 28 ? 43 : 34);
    let removed = 0;
    for (const cell of block.cells) {
      if (!cell.alive || Math.hypot(cell.x - x, cell.y - y) > radius) continue;
      cell.health -= power;
      if (cell.health > 0) continue;
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
          this.ammo = Math.min(this.weapon === 'single' ? 60 : PRIMARY_AMMO[this.weapon] * 2, this.ammo + 8);
          this.ammoCaches++;
          if (this.ammoCaches % 2 === 0) {
            const type: SpecialWeapon = (['homing', 'grenade', 'review', 'lint'] as const)[(this.ammoCaches / 2 - 1) % 4]!;
            this.specialAmmo[type] = Math.min(SPECIAL_AMMO_CAPS[type], this.specialAmmo[type] + 1);
          }
          this.events.push('ammo');
          this.burst(worldX, worldY, '#83f4bd', 16);
        } else {
          this.spawnBonus(cell.magic, worldX, worldY);
        }
      }
    }
    block.hits++;
    block.vx = Math.min(125, block.vx + (blastRadius ? 65 : 28) / Math.sqrt(block.toughness));
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
    } else if (block.hits >= 4 + block.toughness && remaining.length > 38 && this.blocks.length < 48) {
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
        hits: 0, age: 0, generation: block.generation + 1, toughness: block.toughness,
        angry: false, exception: block.exception, throwTimer: 3,
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

  private hazardHalfWidth(hazard: TimeoutHazard) {
    return (`await setTimeout(${hazard.durationMs});`.length * 9 + 28) / 2;
  }

  private hitsHazard(ax: number, ay: number, bx: number, by: number, hazard: TimeoutHazard) {
    const angle = Math.atan2(hazard.vy, -hazard.vx) * -0.12;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const local = (x: number, y: number) => ({ x: (x - hazard.x) * cos + (y - hazard.y) * sin,
      y: -(x - hazard.x) * sin + (y - hazard.y) * cos });
    const a = local(ax, ay), b = local(bx, by);
    return this.segmentRectangle(a.x, a.y, b.x, b.y, this.hazardHalfWidth(hazard) + 4, 24);
  }

  private segmentRectangle(ax: number, ay: number, bx: number, by: number, halfWidth: number, halfHeight: number) {
    let min = 0, max = 1;
    for (const [start, delta, half] of [[ax, bx - ax, halfWidth], [ay, by - ay, halfHeight]]) {
      if (Math.abs(delta!) < 0.000001) { if (Math.abs(start!) > half!) return false; }
      else {
        const t1 = (-half! - start!) / delta!, t2 = (half! - start!) / delta!;
        min = Math.max(min, Math.min(t1, t2));
        max = Math.min(max, Math.max(t1, t2));
        if (min > max) return false;
      }
    }
    return true;
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
