import { CODE_SLICES } from "./code-library";

export { CODE_SLICES } from "./code-library";

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const CELL_WIDTH = 9;
export const CELL_HEIGHT = 20;
export const TIMEOUT_METRICS = {
  fontSize: 20,
  charWidth: 12,
  widthPadding: 36,
  height: 54,
  depth: 30,
} as const;

export type Weapon = "single" | "double" | "triple" | "quad" | "quint";
export const PRIMARY_AMMO = {
  double: 30,
  triple: 24,
  quad: 16,
  quint: 12,
} as const;
export const SPECIAL_AMMO_CAPS = {
  homing: 6,
  grenade: 5,
  review: 4,
  lint: 3,
} as const;
export const LINT_SMALL_BLOCK_CELLS = 160;
export const SPECIAL_BLASTS = {
  homing: { radius: 180, power: 4 },
  grenade: { radius: 300, power: 5 },
} as const;
export type SpecialWeapon = "homing" | "grenade" | "review" | "lint";
export type Magic = Pickup["type"] | "ammo";
export type GameEvent =
  | "shot"
  | "hit"
  | "split"
  | "destroy"
  | "pickup"
  | "ammo"
  | "wave"
  | "gameover"
  | "missile"
  | "grenade"
  | "explosion"
  | "stun"
  | "hazard"
  | "recover"
  | "robot"
  | "generate"
  | "exception"
  | "review"
  | "lint"
  | "bonus"
  | "absorb"
  | "boss"
  | "boss-spawn"
  | "boss-defeated"
  | "robot-hit"
  | "robot-destroy";

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
  boss: boolean;
  bossRoot?: number;
  bossMinion?: boolean;
  /** Render-only ancestry: child local coordinates plus offsets recover the parent surface. */
  fracture?: {
    parentId: number;
    offsetX: number;
    offsetY: number;
    axis: "x" | "y";
    cut: number;
    side: -1 | 1;
    seed: number;
  };
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
  type: Exclude<Weapon, "single"> | SpecialWeapon;
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
  boss?: boolean;
}

export interface SpecialProjectile {
  id: number;
  type: "homing" | "grenade";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  angle: number;
  fuse?: number;
  targetId?: number;
}
export type RobotBrand =
  | "openai"
  | "anthropic"
  | "google"
  | "x"
  | "moonshot"
  | "zai"
  | "deepseek"
  | "meta";
export interface Robot {
  id: number;
  x: number;
  y: number;
  brand: RobotBrand;
  state: "running" | "thinking" | "leaving";
  age: number;
  stateTime: number;
  hitFlash: number;
  health: number;
  maxHealth: number;
}

export type VisualEvent =
  | {
      type: "impact";
      target: "code" | "robot";
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      seed: number;
      blockId?: number;
      robotId?: number;
      removed?: { x: number; y: number; char: string; color: string }[];
    }
  | { type: "split"; parent: Block; children: Block[]; seed: number }
  | {
      type: "code-death";
      block: Block;
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      seed: number;
    }
  | { type: "robot-death"; robot: Robot; seed: number };

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}
export interface TimeoutHazard {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  durationMs: number;
  life: number;
  health: number;
  age: number;
}

const TUNING = {
  bonus: {
    quintKeywordChance: 0.018,
    quadKeywordChance: 0.05,
    lintKeywordChance: 0.085,
    reviewKeywordChance: 0.13,
    grenadeKeywordChance: 0.18,
    homingKeywordChance: 0.24,
    homingDropChance: 0.22,
    grenadeDropChance: 0.43,
    reviewDropChance: 0.62,
    lintDropChance: 0.76,
    doubleDropChance: 0.88,
    tripleDropChance: 0.96,
    quadDropChance: 0.988,
    spawnMinY: 220,
    spawnYRange: 300,
    driftSpeed: -45,
    speedRange: 35,
    verticalSpeed: 95,
    minimumY: 140,
    maximumY: 620,
    collectionDelay: 0.18,
    hitRadius: 29,
  },
  wave: {
    bossInterval: 5,
    bossSpeedCap: 30,
    bossBaseSpeed: 20,
    bossSpeedPerTier: 2.5,
    blockCountCap: 16,
    initialBlockCount: 4,
    blocksPerLevel: 1.4,
    speedCap: 265,
    baseSpeed: 68,
    speedPerLevel: 11,
    speedAcceleration: 1.8,
    labelDigits: 2,
    codeSequenceStride: 7,
    codeSequenceOffset: 8,
    extraLineCap: 5,
    toughnessCap: 3,
    toughnessInterval: 3,
  },
  block: {
    bossBaseToughness: 6,
    padding: 28,
    textOffsetX: 18,
    textOffsetY: 22,
    angryChance: 0.13,
    titleOffset: 2,
    titleCount: 4,
    entryMargin: 12,
    spawnMinY: 235,
    spawnYRange: 270,
    speedRange: 16,
    verticalSpeedCap: 160,
    verticalBaseSpeed: 55,
    verticalSpeedPerLevel: 10,
    initialAngleRange: 0.13,
    initialSpinRange: 0.045,
    initialThrowDelay: 2.5,
    throwDelayRange: 1.5,
  },
  boss: {
    baseReward: 2000,
    rewardPerTier: 500,
    primaryRewardX: 850,
    primaryRewardY: 320,
    specialRewardX: 930,
    specialRewardY: 440,
    minionCap: 7,
    minionPatterns: 3,
    minionGap: 70,
    minionMinX: 400,
    minionMaxX: 1120,
    minionYRange: 260,
    minionMinY: 180,
    minionMaxY: 580,
    minionSpeedCap: 230,
    minionVerticalSpeed: 80,
    minionAngleRange: 0.1,
    minSpawnDelay: 3.2,
    baseSpawnDelay: 4.6,
    spawnAcceleration: 0.2,
  },
  weapon: {
    minimumAimDistance: 80,
    aimOriginX: 158,
    bulletSpeed: 1080,
    grenadeMinX: 220,
    grenadeMaxX: 1230,
    muzzleX: 172,
    grenadeMinY: 140,
    grenadeMaxY: 620,
    ballisticHalf: 0.5,
    gravity: 255,
    homingLife: 5,
    grenadeLife: 2.2,
    homingCooldown: 0.6,
    grenadeCooldown: 0.85,
    homingTurnSpeed: 7,
    homingSpeed: 640,
    grenadeSpinSpeed: 5,
    grenadeFloorMin: 130,
    grenadeFloorMax: 635,
    specialBroadphaseX: 40,
    specialBroadphaseY: 100,
    specialHitRadius: 17,
    bulletBroadphaseX: 10,
    bulletBroadphaseY: 12,
    bulletHitRadius: 13,
  },
  robot: {
    entryX: 1370,
    spawnMinY: 440,
    spawnYRange: 130,
    halfWidth: 51,
    halfHeight: 79,
    thinkingX: 700,
    runSpeed: 300,
    thinkDuration: 2,
    generatedOffsetX: 230,
    generatedOffsetY: 130,
    generatedMinY: 260,
    generatedMaxY: 480,
    generatedSpeedFactor: 1.2,
    generatedToughnessCap: 4,
    exitSpeed: 340,
    exitX: 1450,
    destructionReward: 250,
  },
  exception: {
    spawnOffsetX: 35,
    spawnYRange: 130,
    spawnMinY: 160,
    spawnMaxY: 590,
    speedCap: 430,
    speedBonus: 145,
    verticalSpeedRange: 170,
    angleRange: 0.3,
  },
  hazard: {
    spawnX: 1420,
    spawnYRange: 160,
    spawnMinY: 155,
    spawnMaxY: 610,
    speedCap: 650,
    baseSpeed: 350,
    speedPerWave: 25,
    durationChoices: 4,
    minimumFlightTime: 0.1,
    playerX: 100,
    playerHitPaddingX: 30,
    playerHalfHeight: 65,
    millisecondsPerSecond: 1000,
    exitX: -180,
    angleFactor: -0.12,
    hitPadding: 4,
  },
  timing: {
    maxFrameDelta: 0.25,
    simulationHz: 120,
    playerMinY: 166,
    playerMaxY: 610,
    playerAimResponse: 14,
    minRobotDelay: 13,
    robotDelayPerWave: 0.5,
    robotDelayRange: 9,
    baseBonusDelay: 17,
    bonusDelayRange: 10,
    minHazardDelay: 4.8,
    hazardDelayPerWave: 0.55,
    hazardDelayRange: 3,
    baseHazardDelay: 11.5,
    minBlockDelay: 0.95,
    baseBlockDelay: 3.6,
    blockDelayPerWave: 0.24,
    waveReward: 250,
    minExceptionDelay: 1.2,
    baseExceptionDelay: 3.8,
    exceptionDelayPerWave: 0.12,
  },
  motion: {
    horizontalResponse: 0.42,
    bossSpeedLimitFactor: 1.5,
    bossForwardSpeedCap: 22,
    bossMinVerticalSpeed: -38,
    bossMaxVerticalSpeed: 38,
    verticalDamping: 0.12,
    spinDamping: 0.2,
    maxAngle: 0.42,
    minAngle: -0.42,
    topBoundary: 112,
    bounceRestitution: 0.86,
    bounceKick: 6,
    bottomBoundary: 650,
    rightBoundaryPadding: 10,
    horizontalRestitution: 0.76,
    pickupMaxX: 1235,
    pickupMinX: 260,
  },
  damage: {
    smallBlockCells: 28,
    smallBlockRadius: 43,
    radius: 34,
    bossSpeedCap: 22,
    speedCap: 125,
    blastImpulse: 65,
    shotImpulse: 28,
    bossImpulseFactor: 0.18,
    verticalImpulseFactor: 0.035,
    impactTorque: 35,
    spinImpulseFactor: 0.0013,
    minSpinImpulse: -0.16,
    maxSpinImpulse: 0.16,
    comboCap: 99,
    pointsPerGlyph: 2,
    comboMultiplierCap: 6,
    glyphsPerComboTier: 5,
    bossDeathCells: 8,
    deathCells: 18,
    fragmentDeathCells: 32,
    destructionReward: 75,
    fragmentReward: 25,
    bossBaseSplitHits: 14,
    bossSplitHitsPerArmor: 2,
    baseSplitHits: 4,
    splitMinCells: 38,
    ammoPerCache: 8,
    cachesPerSpecial: 2,
    specialTypes: 4,
  },
  split: {
    horizontalAspectRatio: 0.6,
    widthPadding: 30,
    heightPadding: 34,
    bossHorizontalKick: 6,
    horizontalKick: 27,
    bossVerticalKick: 24,
    verticalKick: 85,
    impactVerticalFactor: 0.1,
    angleKick: 0.025,
    spinKick: 0.12,
    impactSpinFactor: 0.0006,
  },
  collision: {
    minimumAge: 0.35,
    minimumMass: 20,
    penetrationSlop: 0.5,
    positionCorrection: 0.55,
    impulseFactor: -1.72,
    spinTransfer: 0.0008,
    parallelEpsilon: 0.000001,
  },
  particles: {
    gravity: 230,
    horizontalDamping: 0.6,
    spinFactor: 0.015,
    capacity: -700,
    glyphBaseLife: 0.45,
    glyphLifeRange: 0.65,
    glyphBaseSpeed: 50,
    glyphSpeedRange: 230,
    glyphVerticalSpeed: 320,
    glyphVerticalLift: 65,
    glyphAngleRange: 0.7,
    burstSpeedRange: 180,
    burstBaseLife: 0.3,
    burstLifeRange: 0.45,
    hazardBurstCount: 18,
    pickupBurstCount: 20,
    destroyBurstCount: 15,
    ammoBurstCount: 16,
    explosionBurstCount: 38,
    stunBurstCount: 30,
  },
  bounds: {
    specialMinX: -150,
    specialMaxX: 1600,
    specialMinY: 20,
    specialMaxY: 760,
    blockCap: 48,
    visualEventCap: 240,
    bulletMaxX: 1340,
    bulletMinY: 70,
    bulletMaxY: 710,
  },
} as const;

const HALF = 0.5;
const FULL_TURN_RADIANS = Math.PI / HALF;
const SQUARED = 2;
const AMMO_CAPACITY_MULTIPLIER = 2;
const HOMING_AMMO_PER_PICKUP = 2;
const EXPLOSION_IMPULSE_FACTOR = 2;
// These literal millisecond choices are the hazard's displayed code payloads.
// oxlint-disable-next-line no-magic-numbers
const HAZARD_DURATIONS_MS = [1200, 1600, 2000, 2400];

const COLORS = {
  text: "#d6e2f0",
  keyword: "#bd9bff",
  string: "#b7e994",
  number: "#ffbc79",
  comment: "#6889a6",
  punctuation: "#7da6c6",
  magic: "#ffe270",
};
const clamp = (v: number, low: number, high: number) =>
  Math.max(low, Math.min(high, v));

// Literal angular patterns form the weapon spread palette.
/* oxlint-disable no-magic-numbers */
const WEAPON_SPREADS: Record<Weapon, number[]> = {
  single: [0],
  double: [-0.065, 0.065],
  triple: [-0.15, 0, 0.15],
  quad: [-0.18, -0.06, 0.06, 0.18],
  quint: [-0.22, -0.11, 0, 0.11, 0.22],
};

/* oxlint-enable no-magic-numbers */

function bonusKeyword(roll: number): string | undefined {
  if (roll < TUNING.bonus.quintKeywordChance) {
    return "QUINT_SHOT";
  }
  if (roll < TUNING.bonus.quadKeywordChance) {
    return "QUAD_SHOT";
  }
  if (roll < TUNING.bonus.lintKeywordChance) {
    return "LINT_BOMB";
  }
  if (roll < TUNING.bonus.reviewKeywordChance) {
    return "CODE_REVIEW";
  }
  if (roll < TUNING.bonus.grenadeKeywordChance) {
    return "RECYCLE_GRENADE";
  }
  if (roll < TUNING.bonus.homingKeywordChance) {
    return "HOMING_MISSILE";
  }

  return undefined;
}

function bonusType(roll: number): Pickup["type"] {
  if (roll < TUNING.bonus.homingDropChance) {
    return "homing";
  }
  if (roll < TUNING.bonus.grenadeDropChance) {
    return "grenade";
  }
  if (roll < TUNING.bonus.reviewDropChance) {
    return "review";
  }
  if (roll < TUNING.bonus.lintDropChance) {
    return "lint";
  }
  if (roll < TUNING.bonus.doubleDropChance) {
    return "double";
  }
  if (roll < TUNING.bonus.tripleDropChance) {
    return "triple";
  }
  if (roll < TUNING.bonus.quadDropChance) {
    return "quad";
  }

  return "quint";
}

const CODE_KEYWORDS = new Set([
  "async",
  "await",
  "function",
  "return",
  "const",
  "let",
  "class",
  "private",
  "new",
  "extends",
  "infer",
  "type",
  "export",
  "default",
  "for",
  "any",
  "true",
  "false",
  "null",
  "undefined",
]);

function quotedTokenEnd(line: string, start: number): number {
  for (let end = start + 1; end < line.length; end++) {
    if (line[end] === "\\") {
      end++;
    } else if (line[end] === line[start]) {
      return end + 1;
    }
  }

  return start + 1;
}

/** Scan once so malformed code strings cannot trigger regex backtracking. */
function highlightLine(line: string): string[] {
  const colors = Array.from({ length: line.length }, () => COLORS.text);
  let start = 0;
  while (start < line.length) {
    let end = start + 1;
    let color = COLORS.text;
    if (line.startsWith("//", start)) {
      end = line.length;
      color = COLORS.comment;
    } else if (line[start] === '"' || line[start] === "'") {
      end = quotedTokenEnd(line, start);
      if (end > start + 1) {
        color = COLORS.string;
      }
    } else if (/\w/.test(line[start]!)) {
      while (end < line.length && /\w/.test(line[end]!)) {
        end++;
      }
      const token = line.slice(start, end);
      if (CODE_KEYWORDS.has(token)) {
        color = COLORS.keyword;
      } else if (/^\d+$/.test(token)) {
        color = COLORS.number;
      }
    } else if (/[{}()[\];.,?:=+!<>|]/.test(line[start]!)) {
      color = COLORS.punctuation;
    }
    colors.fill(color, start, end);
    start = end;
  }

  return colors;
}

function withinProjectileBounds(projectile: SpecialProjectile): boolean {
  return (
    projectile.x > TUNING.bounds.specialMinX &&
    projectile.x < TUNING.bounds.specialMaxX &&
    projectile.y > TUNING.bounds.specialMinY &&
    projectile.y < TUNING.bounds.specialMaxY
  );
}

function isSpentFragment(block: Block, remaining: number): boolean {
  return (
    !block.boss &&
    block.generation > 1 &&
    remaining < TUNING.damage.fragmentDeathCells
  );
}

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
  /** Consumed by the renderer; never read by gameplay or the gameplay RNG. */
  visualEvents: VisualEvent[] = [];
  private visualSeed = 0;
  specialWeapon: SpecialWeapon = "homing";
  specialAmmo: Record<SpecialWeapon, number> = {
    homing: 3,
    grenade: 2,
    review: 1,
    lint: 1,
  };
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
  weapon: Weapon = "single";
  ammo = 0;
  status: "playing" | "gameover" = "playing";
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
  private readonly triggeredMagics = new Set<string>();
  private activeBossRoot?: number;
  private bossMaxHealth = 0;
  private bossSpawnTimer = 4;
  private bossRewarded = false;

  constructor(private readonly random: () => number = Math.random) {
    this.reset();
  }

  get waveRemaining() {
    return this.blocks.length + this.pendingBlocks;
  }

  get isBossWave() {
    return this.wave % TUNING.wave.bossInterval === 0;
  }

  get bossHealth(): { current: number; max: number } | undefined {
    if (this.activeBossRoot === undefined || this.bossRewarded) {
      return undefined;
    }
    const fragments = this.blocks.filter(
      (block) => block.boss && block.bossRoot === this.activeBossRoot,
    );
    if (fragments.length === 0) {
      return undefined;
    }
    const current = fragments.reduce(
      (health, block) =>
        health +
        block.cells.reduce(
          (sum, cell) => sum + (cell.alive ? Math.max(0, cell.health) : 0),
          0,
        ),
      0,
    );

    return { current, max: this.bossMaxHealth };
  }

  private get bossDriftSpeed() {
    return Math.min(
      TUNING.wave.bossSpeedCap,
      TUNING.wave.bossBaseSpeed +
        Math.floor(this.wave / TUNING.wave.bossInterval) *
          TUNING.wave.bossSpeedPerTier,
    );
  }

  get waveTotal() {
    return this.isBossWave
      ? 1
      : Math.min(
          TUNING.wave.blockCountCap,
          TUNING.wave.initialBlockCount +
            Math.floor((this.wave - 1) * TUNING.wave.blocksPerLevel),
        );
  }

  get isStunned() {
    return this.stunRemaining > 0;
  }

  get driftSpeed() {
    return Math.min(
      TUNING.wave.speedCap,
      TUNING.wave.baseSpeed +
        this.wave * TUNING.wave.speedPerLevel +
        this.wave * this.wave * TUNING.wave.speedAcceleration,
    );
  }

  get waveLabel() {
    return `WAVE ${String(this.wave).padStart(TUNING.wave.labelDigits, "0")}`;
  }

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
    this.specialWeapon = "homing";
    this.specialAmmo = { homing: 3, grenade: 2, review: 1, lint: 1 };
    this.robots = [];
    this.freezeRemaining = this.reviewPulse = this.lintPulse = 0;
    this.robotTimer = 13;
    this.bonusTimer = 18;
    this.stunRemaining = this.specialCooldown = this.ammoCaches = 0;
    this.hazardTimer = 9;
    this.events = [];
    this.visualEvents = [];
    this.visualSeed = 0;
    this.score = this.combo = this.ammo = this.elapsed = 0;
    this.shotsFired = this.blocksDestroyed = 0;
    this.wave = 1;
    this.weapon = "single";
    this.status = "playing";
    this.nextId = 1;
    this.cooldown = this.comboTimer = this.waveTimer = 0;
    this.triggeredMagics.clear();
    this.activeBossRoot = undefined;
    this.bossMaxHealth = 0;
    this.bossSpawnTimer = 4;
    this.bossRewarded = false;
    this.pendingBlocks = this.waveTotal - 1;
    this.spawnTimer = 3.2;
    this.spawnBlock({
      x: 1050,
      y: 330,
      vx: -this.driftSpeed,
      vy: 22,
      angle: -0.035,
    });
  }

  spawnBlock(options: SpawnBlockOptions = {}): Block {
    const id = this.nextId++;
    const base =
      CODE_SLICES[
        (this.wave * TUNING.wave.codeSequenceStride +
          id -
          TUNING.wave.codeSequenceOffset) %
          CODE_SLICES.length
      ]!;
    const extra = Math.min(
      TUNING.wave.extraLineCap,
      Math.floor((this.wave - 1) * HALF),
    );
    const code = options.code ?? [
      ...base,
      ...Array.from(
        { length: extra },
        (_, i) =>
          [
            "const retry = () => retry(retry as any);",
            "await Promise.resolve(JSON.stringify(this));",
            'if (true !== false) { eval("undefined"); }',
            "queueMicrotask(() => queueMicrotask(retry));",
            "// TODO: ticket closed as cannot reproduce",
          ][i]!,
      ),
    ];
    if (!options.code && id > 1) {
      const roll = this.random();
      const keyword = bonusKeyword(roll);
      if (keyword) {
        code.push(`const ${keyword} = proxyFactory(await import("legacy"));`);
      }
    }
    const toughness = options.boss
      ? TUNING.block.bossBaseToughness +
        Math.max(0, Math.floor(this.wave / TUNING.wave.bossInterval) - 1)
      : Math.min(
          TUNING.wave.toughnessCap,
          1 + Math.floor((this.wave - 1) / TUNING.wave.toughnessInterval),
        );
    const width =
      Math.max(...code.map((line) => line.length)) * CELL_WIDTH +
      TUNING.block.padding;
    const height = code.length * CELL_HEIGHT + TUNING.block.padding;
    const cells: Cell[] = [];
    for (const [row, line] of code.entries()) {
      const colorAt = highlightLine(line);
      const magics: { start: number; end: number; type: Magic; id: string }[] =
        [];
      for (const [keyword, type] of [
        ["DOUBLE_SHOT", "double"],
        ["TRIPLE_SHOT", "triple"],
        ["QUAD_SHOT", "quad"],
        ["QUINT_SHOT", "quint"],
        ["HOMING_MISSILE", "homing"],
        ["RECYCLE_GRENADE", "grenade"],
        ["CODE_REVIEW", "review"],
        ["LINT_BOMB", "lint"],
        ["AMMO_CACHE", "ammo"],
      ] as const) {
        const start = line.indexOf(keyword);
        if (start >= 0) {
          magics.push({
            start,
            end: start + keyword.length,
            type,
            id: `${id}:${row}:${start}`,
          });
        }
      }
      for (const [column, char] of Array.from(line).entries()) {
        if (char === " ") {
          continue;
        }
        const magic = magics.find(
          (item) => column >= item.start && column < item.end,
        );
        cells.push({
          x: column * CELL_WIDTH - width * HALF + TUNING.block.textOffsetX,
          y: row * CELL_HEIGHT - height * HALF + TUNING.block.textOffsetY,
          char,
          color: magic ? COLORS.magic : colorAt[column]!,
          alive: true,
          health: toughness,
          maxHealth: toughness,
          magic: magic?.type,
          magicId: magic?.id,
        });
      }
    }
    const block: Block = {
      id,
      title: [
        "legacy-service.ts",
        "factory-factory.ts",
        "utils-final-v9.ts",
        "types-of-doom.ts",
      ][(this.wave + id - TUNING.block.titleOffset) % TUNING.block.titleCount]!,
      x: options.x ?? GAME_WIDTH + width * HALF + TUNING.block.entryMargin,
      y:
        options.y ??
        TUNING.block.spawnMinY + this.random() * TUNING.block.spawnYRange,
      vx:
        options.vx ??
        -(options.boss
          ? this.bossDriftSpeed
          : this.driftSpeed + this.random() * TUNING.block.speedRange),
      vy:
        options.vy ??
        (this.random() - HALF) *
          Math.min(
            TUNING.block.verticalSpeedCap,
            TUNING.block.verticalBaseSpeed +
              this.wave * TUNING.block.verticalSpeedPerLevel,
          ),
      angle:
        options.angle ??
        (this.random() - HALF) * TUNING.block.initialAngleRange,
      angularVelocity: (this.random() - HALF) * TUNING.block.initialSpinRange,
      width,
      height,
      cells,
      hits: 0,
      age: 0,
      generation: 0,
      toughness,
      angry: this.blockIsAngry(options, id),
      exception: options.exception ?? false,
      throwTimer:
        TUNING.block.initialThrowDelay +
        this.random() * TUNING.block.throwDelayRange,
      boss: options.boss ?? false,
      bossRoot: options.boss ? id : undefined,
    };
    this.blocks.push(block);

    return block;
  }

  private blockIsAngry(options: SpawnBlockOptions, id: number): boolean {
    const canBeAngry = !options.exception && !options.boss;

    return (
      canBeAngry &&
      (options.angry ?? (id > 1 && this.random() < TUNING.block.angryChance))
    );
  }

  spawnBoss(): Block {
    const existing = this.blocks.find(
      (block) => block.boss && block.bossRoot === this.activeBossRoot,
    );
    if (existing) {
      return existing;
    }
    const boss = this.spawnBlock({
      boss: true,
      x: 1300,
      y: 370,
      vx: -this.bossDriftSpeed,
      vy: 8,
      angle: -0.015,
      code: [
        "export class FactoryFactoryFactory<T extends Record<string, any>> {",
        "  private factories = new WeakMap<object, Promise<FactoryFactory<T>>>();",
        "  async createFactoryFactoryFactory(input: T): Promise<any> {",
        "    const recursive = new Proxy(JSON.parse(JSON.stringify(input)), {",
        "      get: (target, key) => Reflect.get(target, key) ?? recursive",
        "    }); // architecture approved by the architecture factory",
        "    const factory = await Promise.resolve().then(async () => {",
        "      return new Promise(async (resolveFactory, rejectFactory) => {",
        "        for (const key of Object.keys(recursive).sort().reverse()) {",
        "          const clone = JSON.parse(JSON.stringify(recursive[key]));",
        "          await Promise.resolve().then(() => Promise.resolve(clone));",
        "          resolveFactory(() => () => () => eval(JSON.stringify(clone)));",
        '        } rejectFactory(new Error("FactoryFactoryFactoryFactory"));',
        "      }); // TODO: inject a factory factory to test this factory",
        "    }); return factory instanceof Promise ? await factory : factory;",
        "  } } // generated 4,096 more services; complexity is a feature",
      ],
    });
    boss.title = "FactoryFactoryFactory";
    boss.angularVelocity = 0.008;
    this.pendingBlocks = 0;
    this.activeBossRoot = boss.id;
    this.bossMaxHealth = boss.cells.reduce(
      (health, cell) => health + cell.maxHealth,
      0,
    );
    this.bossSpawnTimer = 4;
    this.bossRewarded = false;
    this.robots = [];
    this.hazards = [];
    this.events.push("boss");

    return boss;
  }

  private updateBoss(dt: number) {
    if (this.activeBossRoot === undefined || this.bossRewarded) {
      return;
    }
    const fragments = this.blocks.filter(
      (block) => block.boss && block.bossRoot === this.activeBossRoot,
    );
    if (fragments.length === 0) {
      this.bossRewarded = true;
      this.score +=
        TUNING.boss.baseReward +
        Math.floor(this.wave / TUNING.wave.bossInterval) *
          TUNING.boss.rewardPerTier;
      this.spawnBonus(
        "quint",
        TUNING.boss.primaryRewardX,
        TUNING.boss.primaryRewardY,
      );
      this.spawnBonus(
        "lint",
        TUNING.boss.specialRewardX,
        TUNING.boss.specialRewardY,
      );
      this.events.push("boss-defeated");

      return;
    }
    this.bossSpawnTimer -= dt;
    if (dt <= 0 || this.bossSpawnTimer > 0) {
      return;
    }
    const minions = this.blocks.filter(
      (block) => block.bossMinion && block.bossRoot === this.activeBossRoot,
    );
    // One timer for the original factory: fragmentation cannot multiply production.
    if (minions.length >= TUNING.boss.minionCap) {
      this.bossSpawnTimer = 1;

      return;
    }
    const source = fragments.reduce(
      (largest, block) =>
        block.cells.length > largest.cells.length ? block : largest,
      fragments[0]!,
    );
    const code = [
      [
        "const service = factory(factory(input));",
        'return service.map((x: any) => eval("x"));',
        "// TODO: extract another microservice",
      ],
      [
        "async function minionFactory(x: any) {",
        "  return await Promise.resolve(() => x);",
        "} // generated without any tests",
      ],
      [
        "const dependency = new Proxy({}, {});",
        "export default () => () => dependency;",
        "// infinite scalability, finite uptime",
      ],
    ][Math.floor(this.random() * TUNING.boss.minionPatterns)]!;
    const minion = this.spawnBlock({
      x: clamp(
        source.x - source.width * HALF - TUNING.boss.minionGap,
        TUNING.boss.minionMinX,
        TUNING.boss.minionMaxX,
      ),
      y: clamp(
        source.y + (this.random() - HALF) * TUNING.boss.minionYRange,
        TUNING.boss.minionMinY,
        TUNING.boss.minionMaxY,
      ),
      vx: -Math.min(TUNING.boss.minionSpeedCap, this.driftSpeed),
      vy: (this.random() - HALF) * TUNING.boss.minionVerticalSpeed,
      angle: (this.random() - HALF) * TUNING.boss.minionAngleRange,
      angry: false,
      code,
    });
    minion.title = "factory-generated.ts";
    minion.bossMinion = true;
    minion.bossRoot = this.activeBossRoot;
    this.bossSpawnTimer = Math.max(
      TUNING.boss.minSpawnDelay,
      TUNING.boss.baseSpawnDelay -
        Math.floor(this.wave / TUNING.wave.bossInterval) *
          TUNING.boss.spawnAcceleration,
    );
    this.events.push("boss-spawn");
  }

  fire(): boolean {
    if (this.status !== "playing" || this.isStunned || this.cooldown > 0) {
      return false;
    }
    if (this.weapon !== "single" && this.ammo <= 0) {
      this.weapon = "single";
    }
    const angle = Math.atan2(
      this.aimY - this.playerY,
      Math.max(
        TUNING.weapon.minimumAimDistance,
        this.aimX - TUNING.weapon.aimOriginX,
      ),
    );
    const spreads = WEAPON_SPREADS[this.weapon];
    for (const spread of spreads) {
      const direction = angle + spread;
      this.bullets.push({
        id: this.nextId++,
        x: 172,
        y: this.playerY,
        vx: Math.cos(direction) * TUNING.weapon.bulletSpeed,
        vy: Math.sin(direction) * TUNING.weapon.bulletSpeed,
        life: 1.5,
        weapon: this.weapon,
      });
    }
    if (this.weapon !== "single") {
      this.ammo--;
    }
    this.cooldown = 0.135;
    this.shotsFired++;
    this.events.push("shot");

    return true;
  }

  selectSpecial(type: SpecialWeapon) {
    if (
      this.status === "playing" &&
      !this.isStunned &&
      type in SPECIAL_AMMO_CAPS
    ) {
      this.specialWeapon = type;
    }
  }

  fireSpecial(): boolean {
    const type = this.specialWeapon;
    if (
      this.status !== "playing" ||
      this.isStunned ||
      this.specialCooldown > 0 ||
      this.specialAmmo[type] <= 0
    ) {
      return false;
    }
    if (type === "review" || type === "lint") {
      this.specialAmmo[type]--;
      this.specialCooldown = 0.8;
      if (type === "review") {
        this.freezeRemaining = 2;
        this.reviewPulse = 0.65;
        this.events.push("review");
      } else {
        this.lintPulse = 0.8;
        this.lintBlocks();
        this.events.push("lint");
      }

      return true;
    }
    const angle = Math.atan2(
      this.aimY - this.playerY,
      Math.max(
        TUNING.weapon.minimumAimDistance,
        this.aimX - TUNING.weapon.aimOriginX,
      ),
    );
    const speed = 600;
    const fuse = 1.05;
    this.specials.push({
      id: this.nextId++,
      type,
      x: 172,
      y: this.playerY,
      vx:
        type === "grenade"
          ? (clamp(
              this.aimX,
              TUNING.weapon.grenadeMinX,
              TUNING.weapon.grenadeMaxX,
            ) -
              TUNING.weapon.muzzleX) /
            fuse
          : Math.cos(angle) * speed,
      vy:
        type === "grenade"
          ? (clamp(
              this.aimY,
              TUNING.weapon.grenadeMinY,
              TUNING.weapon.grenadeMaxY,
            ) -
              this.playerY -
              TUNING.weapon.ballisticHalf *
                TUNING.weapon.gravity *
                fuse *
                fuse) /
            fuse
          : Math.sin(angle) * speed,
      angle,
      life:
        type === "homing"
          ? TUNING.weapon.homingLife
          : TUNING.weapon.grenadeLife,
      fuse: type === "grenade" ? fuse : undefined,
    });
    this.specialAmmo[type]--;
    this.specialCooldown =
      type === "homing"
        ? TUNING.weapon.homingCooldown
        : TUNING.weapon.grenadeCooldown;
    this.events.push(type === "homing" ? "missile" : "grenade");

    return true;
  }

  private lintBlocks() {
    // Each original block is handled once; new halves wait for the next bomb.
    for (const block of this.blocks) {
      const extent = this.extents(block);
      if (block.x + extent.x < 0 || block.x - extent.x > GAME_WIDTH) {
        continue;
      }
      const cells = block.cells.filter((cell) => cell.alive);
      if (cells.length > LINT_SMALL_BLOCK_CELLS) {
        this.split(block, cells, 0, 0);
      } else {
        // Remaining letters define size, so chipped slabs and armored fragments clear too.
        this.damage(
          block,
          0,
          0,
          { vy: 0 },
          Math.hypot(block.width, block.height),
          Math.max(1, ...cells.map((cell) => cell.health)),
        );
      }
    }
  }

  spawnRobot(
    options: { x?: number; y?: number; brand?: RobotBrand } = {},
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
      id: this.nextId++,
      x: options.x ?? TUNING.robot.entryX,
      y:
        options.y ??
        TUNING.robot.spawnMinY + this.random() * TUNING.robot.spawnYRange,
      brand:
        options.brand ?? brands[Math.floor(this.random() * brands.length)]!,
      state: "running",
      age: 0,
      stateTime: 0,
      hitFlash: 0,
      health: 15,
      maxHealth: 15,
    };
    this.robots.push(robot);
    this.events.push("robot");

    return robot;
  }

  spawnBonus(
    type?: Pickup["type"],
    x = 1000,
    y = TUNING.bonus.spawnMinY + this.random() * TUNING.bonus.spawnYRange,
  ): Pickup {
    // Specials dominate bonus drops; four/five-shot primaries remain the rarest prizes.
    const roll = this.random();
    const chosen = type ?? bonusType(roll);
    const pickup: Pickup = {
      id: this.nextId++,
      x,
      y,
      vx: TUNING.bonus.driftSpeed - this.random() * TUNING.bonus.speedRange,
      vy: (this.random() > HALF ? 1 : -1) * TUNING.bonus.verticalSpeed,
      type: chosen,
      life: 15,
      age: 0,
    };
    this.pickups.push(pickup);
    this.events.push("bonus");

    return pickup;
  }

  private visual(event: VisualEvent) {
    this.visualEvents.push(event);
    if (this.visualEvents.length > TUNING.bounds.visualEventCap) {
      this.visualEvents.splice(
        0,
        this.visualEvents.length - TUNING.bounds.visualEventCap,
      );
    }
  }

  private snapshot(block: Block): Block {
    return {
      ...block,
      cells: block.cells.map((cell) => ({ ...cell })),
      fracture: block.fracture && { ...block.fracture },
    };
  }

  private damageRobot(
    robot: Robot,
    power: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ) {
    if (robot.health <= 0) {
      return;
    }
    robot.health = Math.max(0, robot.health - power);
    robot.hitFlash = 0.2;
    this.visual({
      type: "impact",
      target: "robot",
      robotId: robot.id,
      x,
      y,
      vx,
      vy,
      radius: 19,
      seed: ++this.visualSeed,
    });
    this.events.push("robot-hit");
    if (robot.health === 0) {
      this.robots = this.robots.filter((item) => item.id !== robot.id);
      this.visual({
        type: "robot-death",
        robot: { ...robot },
        seed: ++this.visualSeed,
      });
      this.events.push("robot-destroy");
      this.score += TUNING.robot.destructionReward;
    }
  }

  private robotContact(
    robot: Robot,
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ) {
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

  private interceptRobot(
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ): Robot | undefined {
    return [...this.robots]
      .sort((a, b) => a.x - b.x)
      .find((robot) =>
        this.segmentRectangle(
          ax - robot.x,
          ay - robot.y,
          bx - robot.x,
          by - robot.y,
          TUNING.robot.halfWidth,
          TUNING.robot.halfHeight,
        ),
      );
  }

  private updateRobots(dt: number) {
    for (const robot of this.robots) {
      robot.age += dt;
      robot.stateTime += dt;
      robot.hitFlash = Math.max(0, robot.hitFlash - dt);
      if (robot.state === "running") {
        robot.x = Math.max(
          TUNING.robot.thinkingX,
          robot.x - TUNING.robot.runSpeed * dt,
        );
        if (robot.x <= TUNING.robot.thinkingX) {
          robot.state = "thinking";
          robot.stateTime = 0;
        }
      } else if (
        robot.state === "thinking" &&
        robot.stateTime >= TUNING.robot.thinkDuration
      ) {
        const generated = this.spawnBlock({
          x: robot.x + TUNING.robot.generatedOffsetX,
          y: clamp(
            robot.y - TUNING.robot.generatedOffsetY,
            TUNING.robot.generatedMinY,
            TUNING.robot.generatedMaxY,
          ),
          vx: -this.driftSpeed * TUNING.robot.generatedSpeedFactor,
          code: [
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
          ],
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
        this.events.push("generate");
      } else if (robot.state === "leaving") {
        robot.x += TUNING.robot.exitSpeed * dt;
      }
    }
    this.robots = this.robots.filter((robot) => robot.x < TUNING.robot.exitX);
  }

  private throwException(block: Block) {
    const labels = [
      ['throw new Error("oops");'],
      ["TypeError: any is not a function"],
      ["UnhandledPromiseRejection"],
      ["RangeError: stack overflow"],
      ['throw new Error("works locally");'],
      ["NullPointerException: undefined"],
    ];
    this.spawnBlock({
      x: block.x - block.width * HALF - TUNING.exception.spawnOffsetX,
      y: clamp(
        block.y + (this.random() - HALF) * TUNING.exception.spawnYRange,
        TUNING.exception.spawnMinY,
        TUNING.exception.spawnMaxY,
      ),
      vx: -Math.min(
        TUNING.exception.speedCap,
        this.driftSpeed + TUNING.exception.speedBonus,
      ),
      vy: (this.random() - HALF) * TUNING.exception.verticalSpeedRange,
      angle: (this.random() - HALF) * TUNING.exception.angleRange,
      exception: true,
      code: labels[Math.floor(this.random() * labels.length)]!,
    });
    this.events.push("exception");
  }

  spawnHazard(
    options: {
      x?: number;
      y?: number;
      durationMs?: number;
      vx?: number;
      vy?: number;
    } = {},
  ): TimeoutHazard {
    const x = options.x ?? TUNING.hazard.spawnX;
    const y =
      options.y ??
      clamp(
        this.playerY + (this.random() - HALF) * TUNING.hazard.spawnYRange,
        TUNING.hazard.spawnMinY,
        TUNING.hazard.spawnMaxY,
      );
    const vx =
      options.vx ??
      -Math.min(
        TUNING.hazard.speedCap,
        TUNING.hazard.baseSpeed + this.wave * TUNING.hazard.speedPerWave,
      );
    const durationMs =
      options.durationMs ??
      HAZARD_DURATIONS_MS[
        Math.floor(this.random() * TUNING.hazard.durationChoices)
      ]!;
    const hazard = {
      id: this.nextId++,
      x,
      y,
      vx,
      vy:
        options.vy ??
        (this.playerY - y) /
          Math.max(
            TUNING.hazard.minimumFlightTime,
            (x - TUNING.hazard.playerX) / -vx,
          ),
      durationMs,
      life: 6,
      health: 1,
      age: 0,
    };
    this.hazards.push(hazard);
    this.events.push("hazard");

    return hazard;
  }

  private updateHazards(dt: number) {
    for (const hazard of this.hazards) {
      if (hazard.life <= 0) {
        continue;
      }
      const oldX = hazard.x;
      const oldY = hazard.y;
      hazard.age += dt;
      hazard.life -= dt;
      hazard.x += hazard.vx * dt;
      hazard.y += hazard.vy * dt;
      if (
        this.segmentRectangle(
          oldX - TUNING.hazard.playerX,
          oldY - this.playerY,
          hazard.x - TUNING.hazard.playerX,
          hazard.y - this.playerY,
          this.hazardHalfWidth(hazard) + TUNING.hazard.playerHitPaddingX,
          TUNING.hazard.playerHalfHeight,
        )
      ) {
        this.stunRemaining = Math.max(
          this.stunRemaining,
          hazard.durationMs / TUNING.hazard.millisecondsPerSecond,
        );
        hazard.life = 0;
        this.burst(
          TUNING.hazard.playerX,
          this.playerY,
          "#ff88bb",
          TUNING.particles.stunBurstCount,
        );
        this.events.push("stun");
      }
      if (hazard.x < TUNING.hazard.exitX) {
        hazard.life = 0;
      }
    }
    this.hazards = this.hazards.filter((hazard) => hazard.life > 0);
  }

  private updateSpecials(dt: number) {
    for (const explosion of this.explosions) {
      explosion.life -= dt;
    }
    this.explosions = this.explosions.filter((explosion) => explosion.life > 0);
    for (const special of this.specials) {
      this.updateSpecial(special, dt);
    }
    this.specials = this.specials.filter(
      (special) => special.life > 0 && withinProjectileBounds(special),
    );
  }

  private updateSpecial(special: SpecialProjectile, dt: number) {
    special.life -= dt;
    if (special.life <= 0) {
      return;
    }
    const oldX = special.x;
    const oldY = special.y;
    if (special.type === "homing") {
      this.steerHoming(special, dt);
    } else {
      special.vy += TUNING.weapon.gravity * dt;
      special.angle += dt * TUNING.weapon.grenadeSpinSpeed;
      special.fuse = (special.fuse ?? 0) - dt;
    }
    special.x += special.vx * dt;
    special.y += special.vy * dt;
    if (
      special.type === "grenade" &&
      (special.y < TUNING.weapon.grenadeFloorMin ||
        special.y > TUNING.weapon.grenadeFloorMax)
    ) {
      special.y = clamp(
        special.y,
        TUNING.weapon.grenadeFloorMin,
        TUNING.weapon.grenadeFloorMax,
      );
      special.vy *= -0.65;
    }
    const robot = this.interceptRobot(oldX, oldY, special.x, special.y);
    if (robot) {
      const contact = this.robotContact(
        robot,
        oldX,
        oldY,
        special.x,
        special.y,
      );
      const blast = SPECIAL_BLASTS[special.type];
      this.explode(contact.x, contact.y, blast.radius, blast.power);
      special.life = 0;

      return;
    }
    const collision = this.blocks.some((block) =>
      this.specialHitsBlock(block, special, oldX, oldY),
    );
    if (collision || (special.type === "grenade" && (special.fuse ?? 0) <= 0)) {
      const blast = SPECIAL_BLASTS[special.type];
      this.explode(special.x, special.y, blast.radius, blast.power);
      special.life = 0;
    }
  }

  private steerHoming(special: SpecialProjectile, dt: number) {
    // Reacquire the most urgent slab each substep, including chunks passing the player.
    let targetBlock: Block | undefined;
    let leftEdge = Infinity;
    for (const block of this.blocks) {
      const extent = this.extents(block);
      const edge = block.x - extent.x;
      if (
        block.x + extent.x < 0 ||
        edge > GAME_WIDTH ||
        !block.cells.some((cell) => cell.alive)
      ) {
        continue;
      }
      if (edge < leftEdge) {
        leftEdge = edge;
        targetBlock = block;
      }
    }
    let target: { x: number; y: number; id: number } | undefined;
    let nearest = Infinity;
    if (targetBlock) {
      const block = targetBlock;
      const cos = Math.cos(block.angle);
      const sin = Math.sin(block.angle);
      for (const cell of block.cells) {
        if (!cell.alive) {
          continue;
        }
        const x = block.x + cell.x * cos - cell.y * sin;
        const y = block.y + cell.x * sin + cell.y * cos;
        const distance =
          (x - special.x) ** SQUARED + (y - special.y) ** SQUARED;
        if (distance < nearest) {
          nearest = distance;
          target = { x, y, id: block.id };
        }
      }
    }
    special.targetId = target?.id;
    if (target) {
      const desired = Math.atan2(target.y - special.y, target.x - special.x);
      const delta = Math.atan2(
        Math.sin(desired - special.angle),
        Math.cos(desired - special.angle),
      );
      special.angle += clamp(
        delta,
        -dt * TUNING.weapon.homingTurnSpeed,
        dt * TUNING.weapon.homingTurnSpeed,
      );
    }
    special.vx = Math.cos(special.angle) * TUNING.weapon.homingSpeed;
    special.vy = Math.sin(special.angle) * TUNING.weapon.homingSpeed;
  }

  private specialHitsBlock(
    block: Block,
    special: SpecialProjectile,
    oldX: number,
    oldY: number,
  ): boolean {
    if (
      Math.abs(block.x - special.x) >
        block.width + TUNING.weapon.specialBroadphaseX ||
      Math.abs(block.y - special.y) >
        block.height + TUNING.weapon.specialBroadphaseY
    ) {
      return false;
    }
    const cos = Math.cos(block.angle);
    const sin = Math.sin(block.angle);
    const ax = (oldX - block.x) * cos + (oldY - block.y) * sin;
    const ay = -(oldX - block.x) * sin + (oldY - block.y) * cos;
    const bx = (special.x - block.x) * cos + (special.y - block.y) * sin;
    const by = -(special.x - block.x) * sin + (special.y - block.y) * cos;
    if (
      block.cells.some(
        (cell) =>
          cell.alive &&
          this.segmentDistance(ax, ay, bx, by, cell.x, cell.y) <
            TUNING.weapon.specialHitRadius,
      )
    ) {
      return true;
    }

    return false;
  }

  private explode(x: number, y: number, radius: number, power: number) {
    this.explosions.push({ x, y, radius, life: 0.42, maxLife: 0.42 });
    this.events.push("explosion");
    this.burst(x, y, "#8cf5cd", TUNING.particles.explosionBurstCount);
    for (const hazard of this.hazards) {
      if (Math.hypot(hazard.x - x, hazard.y - y) < radius) {
        hazard.life = 0;
      }
    }
    for (const robot of this.robots) {
      const nearX = clamp(
        x,
        robot.x - TUNING.robot.halfWidth,
        robot.x + TUNING.robot.halfWidth,
      );
      const nearY = clamp(
        y,
        robot.y - TUNING.robot.halfHeight,
        robot.y + TUNING.robot.halfHeight,
      );
      if (Math.hypot(nearX - x, nearY - y) <= radius) {
        this.damageRobot(
          robot,
          power,
          nearX,
          nearY,
          (robot.x - x) * EXPLOSION_IMPULSE_FACTOR,
          (robot.y - y) * EXPLOSION_IMPULSE_FACTOR,
        );
      }
    }
    for (const block of this.blocks) {
      const cos = Math.cos(block.angle);
      const sin = Math.sin(block.angle);
      const localX = (x - block.x) * cos + (y - block.y) * sin;
      const localY = -(x - block.x) * sin + (y - block.y) * cos;
      if (
        block.cells.some(
          (cell) =>
            cell.alive &&
            Math.hypot(cell.x - localX, cell.y - localY) <= radius,
        )
      ) {
        this.damage(
          block,
          localX,
          localY,
          { vy: (block.y - y) * EXPLOSION_IMPULSE_FACTOR },
          radius,
          power,
        );
      }
    }
  }

  update(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0 || this.status !== "playing") {
      return;
    }
    // Fixed-size substeps prevent tunneling and unstable impulses on slow devices.
    let remaining = Math.min(dt, TUNING.timing.maxFrameDelta);
    while (remaining > 0 && this.status === "playing") {
      const step = Math.min(remaining, 1 / TUNING.timing.simulationHz);
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
      if (this.stunRemaining === 0) {
        this.events.push("recover");
      }
    } else {
      this.playerY +=
        (clamp(this.aimY, TUNING.timing.playerMinY, TUNING.timing.playerMaxY) -
          this.playerY) *
        (1 - Math.exp(-dt * TUNING.timing.playerAimResponse));
    }
    const enemyDt = Math.min(dt, Math.max(0, dt - this.freezeRemaining));
    this.freezeRemaining = Math.max(0, this.freezeRemaining - dt);
    this.reviewPulse = Math.max(0, this.reviewPulse - dt);
    this.lintPulse = Math.max(0, this.lintPulse - dt);
    this.robotTimer -= enemyDt;
    this.bonusTimer -= dt;
    if (
      !this.isBossWave &&
      enemyDt > 0 &&
      this.robotTimer <= 0 &&
      this.robots.length === 0
    ) {
      this.spawnRobot();
      this.robotTimer =
        Math.max(
          TUNING.timing.minRobotDelay,
          24 - this.wave * TUNING.timing.robotDelayPerWave,
        ) +
        this.random() * TUNING.timing.robotDelayRange;
    }
    if (this.bonusTimer <= 0) {
      this.spawnBonus();
      this.bonusTimer =
        TUNING.timing.baseBonusDelay +
        this.random() * TUNING.timing.bonusDelayRange;
    }
    this.hazardTimer -= enemyDt;
    if (!this.isBossWave && enemyDt > 0 && this.hazardTimer <= 0) {
      this.spawnHazard();
      this.hazardTimer =
        Math.max(
          TUNING.timing.minHazardDelay,
          TUNING.timing.baseHazardDelay -
            this.wave * TUNING.timing.hazardDelayPerWave,
        ) +
        this.random() * TUNING.timing.hazardDelayRange;
    }
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) {
      this.combo = 0;
    }
    this.spawnTimer -= enemyDt;
    if (
      enemyDt > 0 &&
      this.pendingBlocks > 0 &&
      this.spawnTimer <= 0 &&
      this.blocks.length < TUNING.bounds.blockCap
    ) {
      if (this.isBossWave) {
        this.spawnBoss();
      } else {
        this.spawnBlock();
        this.pendingBlocks--;
      }
      this.spawnTimer = Math.max(
        TUNING.timing.minBlockDelay,
        TUNING.timing.baseBlockDelay -
          this.wave * TUNING.timing.blockDelayPerWave,
      );
    }
    if (this.blocks.length === 0 && this.pendingBlocks === 0) {
      this.waveTimer += dt;
      if (this.waveTimer > 1.0) {
        this.wave++;
        this.activeBossRoot = undefined;
        this.bossMaxHealth = 0;
        this.bossRewarded = false;
        this.bossSpawnTimer = 4;
        if (this.isBossWave) {
          this.robots = [];
          this.hazards = [];
        }
        this.score += TUNING.timing.waveReward * (this.wave - 1);
        this.pendingBlocks = this.waveTotal;
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.events.push("wave");
      }
    } else {
      this.waveTimer = 0;
    }

    // Newly thrown exceptions must wait until the next simulation step.
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const block of [...this.blocks]) {
      if (enemyDt <= 0) {
        continue;
      }
      block.age += enemyDt;
      if (block.angry) {
        block.throwTimer -= enemyDt;
        if (block.throwTimer <= 0) {
          this.throwException(block);
          block.throwTimer =
            Math.max(
              TUNING.timing.minExceptionDelay,
              TUNING.timing.baseExceptionDelay -
                this.wave * TUNING.timing.exceptionDelayPerWave,
            ) + this.random();
        }
      }
      block.vx +=
        (-(block.boss ? this.bossDriftSpeed : this.driftSpeed) - block.vx) *
        enemyDt *
        TUNING.motion.horizontalResponse;
      if (block.boss) {
        block.vx = clamp(
          block.vx,
          -this.bossDriftSpeed * TUNING.motion.bossSpeedLimitFactor,
          TUNING.motion.bossForwardSpeedCap,
        );
        block.vy = clamp(
          block.vy,
          TUNING.motion.bossMinVerticalSpeed,
          TUNING.motion.bossMaxVerticalSpeed,
        );
      }
      block.vy *= Math.exp(-enemyDt * TUNING.motion.verticalDamping);
      block.angularVelocity *= Math.exp(-enemyDt * TUNING.motion.spinDamping);
      block.x += block.vx * enemyDt;
      block.y += block.vy * enemyDt;
      block.angle += block.angularVelocity * enemyDt;
      if (Math.abs(block.angle) > TUNING.motion.maxAngle) {
        block.angle = clamp(
          block.angle,
          TUNING.motion.minAngle,
          TUNING.motion.maxAngle,
        );
        block.angularVelocity *= -0.7;
      }
      const extent = this.extents(block);
      if (block.y - extent.y < TUNING.motion.topBoundary) {
        block.y = TUNING.motion.topBoundary + extent.y;
        block.vy =
          Math.abs(block.vy) * TUNING.motion.bounceRestitution +
          TUNING.motion.bounceKick;
        block.angularVelocity *= -0.7;
      }
      if (block.y + extent.y > TUNING.motion.bottomBoundary) {
        block.y = TUNING.motion.bottomBoundary - extent.y;
        block.vy =
          -Math.abs(block.vy) * TUNING.motion.bounceRestitution -
          TUNING.motion.bounceKick;
        block.angularVelocity *= -0.7;
      }
      // Spawned blocks enter naturally; only objects already moving right bounce here.
      if (
        block.vx > 0 &&
        block.x + extent.x > GAME_WIDTH - TUNING.motion.rightBoundaryPadding
      ) {
        block.x = GAME_WIDTH - TUNING.motion.rightBoundaryPadding - extent.x;
        block.vx = -block.vx * TUNING.motion.horizontalRestitution;
      }
      if (block.x + extent.x < 0) {
        this.status = "gameover";
        this.events.push("gameover");

        return;
      }
    }
    if (enemyDt > 0) {
      this.collideBlocks();
    }
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
      if (
        pickup.y < TUNING.bonus.minimumY ||
        pickup.y > TUNING.bonus.maximumY
      ) {
        pickup.y = clamp(
          pickup.y,
          TUNING.bonus.minimumY,
          TUNING.bonus.maximumY,
        );
        pickup.vy *= -1;
      }
      if (pickup.x > TUNING.motion.pickupMaxX) {
        pickup.x = 1235;
        pickup.vx = -Math.abs(pickup.vx);
      }
      if (pickup.x < TUNING.motion.pickupMinX) {
        pickup.x = 260;
        pickup.vx = Math.abs(pickup.vx);
      }
    }
    this.pickups = this.pickups.filter((pickup) => pickup.life > 0);

    for (const bullet of this.bullets) {
      this.updateBullet(bullet, dt);
    }
    this.updateBoss(enemyDt);
    this.bullets = this.bullets.filter(
      (bullet) =>
        bullet.life > 0 &&
        bullet.x < TUNING.bounds.bulletMaxX &&
        bullet.y > TUNING.bounds.bulletMinY &&
        bullet.y < TUNING.bounds.bulletMaxY,
    );
    this.pickups = this.pickups.filter((pickup) => pickup.life > 0);
    this.hazards = this.hazards.filter((hazard) => hazard.life > 0);
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += TUNING.particles.gravity * dt;
      particle.vx *= Math.exp(-dt * TUNING.particles.horizontalDamping);
      particle.angle += dt * particle.vx * TUNING.particles.spinFactor;
    }
    this.particles = this.particles
      .filter((particle) => particle.life > 0)
      .slice(TUNING.particles.capacity);
  }

  private updateBullet(bullet: Bullet, dt: number) {
    bullet.life -= dt;
    const oldX = bullet.x;
    const oldY = bullet.y;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    let hit = false;
    const robot = this.interceptRobot(oldX, oldY, bullet.x, bullet.y);
    if (robot) {
      const contact = this.robotContact(robot, oldX, oldY, bullet.x, bullet.y);
      this.damageRobot(robot, 1, contact.x, contact.y, bullet.vx, bullet.vy);
      hit = true;
    }
    const hazard =
      !hit &&
      this.hazards.find(
        (candidate) =>
          candidate.life > 0 &&
          this.hitsHazard(oldX, oldY, bullet.x, bullet.y, candidate),
      );
    if (hazard) {
      hazard.life = 0;
      this.score += 60;
      this.burst(
        hazard.x,
        hazard.y,
        "#ff8fbd",
        TUNING.particles.hazardBurstCount,
      );
      this.events.push("hit");
      hit = true;
    }
    const pickup =
      !hit &&
      this.pickups.find(
        (candidate) =>
          candidate.life > 0 &&
          candidate.age > TUNING.bonus.collectionDelay &&
          this.segmentDistance(
            oldX,
            oldY,
            bullet.x,
            bullet.y,
            candidate.x,
            candidate.y,
          ) < TUNING.bonus.hitRadius,
      );
    if (pickup) {
      this.collectPickup(pickup);
      hit = true;
    }
    if (!hit) {
      // Ascending distance ensures the frontmost block absorbs each projectile.
      const candidates = [...this.blocks].sort((a, b) => a.x - b.x);
      // Broad-phase rejection and first-hit termination are distinct collision-loop exits.
      // oxlint-disable-next-line sonarjs/too-many-break-or-continue-in-loop
      for (const block of candidates) {
        const cos = Math.cos(block.angle);
        const sin = Math.sin(block.angle);
        const ax = (oldX - block.x) * cos + (oldY - block.y) * sin;
        const ay = -(oldX - block.x) * sin + (oldY - block.y) * cos;
        const bx = (bullet.x - block.x) * cos + (bullet.y - block.y) * sin;
        const by = -(bullet.x - block.x) * sin + (bullet.y - block.y) * cos;
        if (
          Math.max(ax, bx) <
            -block.width * HALF - TUNING.weapon.bulletBroadphaseX ||
          Math.min(ax, bx) >
            block.width * HALF + TUNING.weapon.bulletBroadphaseX ||
          Math.max(ay, by) <
            -block.height * HALF - TUNING.weapon.bulletBroadphaseY ||
          Math.min(ay, by) >
            block.height * HALF + TUNING.weapon.bulletBroadphaseY
        ) {
          continue;
        }
        const cell = block.cells.find(
          (item) =>
            item.alive &&
            this.segmentDistance(ax, ay, bx, by, item.x, item.y) <
              TUNING.weapon.bulletHitRadius,
        );
        if (cell) {
          this.damage(block, cell.x, cell.y, bullet);
          hit = true;
          break;
        }
      }
    }
    if (hit) {
      bullet.life = 0;
    }
  }

  private collectPickup(pickup: Pickup) {
    if (pickup.type in SPECIAL_AMMO_CAPS) {
      // SAFETY: Every key in SPECIAL_AMMO_CAPS is a SpecialWeapon.
      const type = pickup.type as SpecialWeapon;
      this.specialAmmo[type] = Math.min(
        SPECIAL_AMMO_CAPS[type],
        this.specialAmmo[type] +
          (type === "homing" ? HOMING_AMMO_PER_PICKUP : 1),
      );
    } else {
      // SAFETY: Pickup types outside SPECIAL_AMMO_CAPS are the four upgraded primary weapons.
      const type = pickup.type as Exclude<Weapon, "single">;
      this.ammo = Math.min(
        PRIMARY_AMMO[type] * AMMO_CAPACITY_MULTIPLIER,
        (this.weapon === type ? this.ammo : 0) + PRIMARY_AMMO[type],
      );
      this.weapon = type;
    }
    pickup.life = 0;
    this.score += 100;
    this.burst(
      pickup.x,
      pickup.y,
      "#ffe270",
      TUNING.particles.pickupBurstCount,
    );
    this.events.push("pickup");
  }

  private damage(
    block: Block,
    x: number,
    y: number,
    bullet: Pick<Bullet, "vy"> & Partial<Pick<Bullet, "vx">>,
    blastRadius?: number,
    power = 1,
  ) {
    // Keep the last visible surface, including old holes, even when this hit clears every glyph.
    const surfaceBeforeHit = this.snapshot(block);
    const cos = Math.cos(block.angle);
    const sin = Math.sin(block.angle);
    const radius =
      blastRadius ??
      (block.cells.filter((cell) => cell.alive).length <
      TUNING.damage.smallBlockCells
        ? TUNING.damage.smallBlockRadius
        : TUNING.damage.radius);
    let removed = 0;
    const removedGlyphs: {
      x: number;
      y: number;
      char: string;
      color: string;
    }[] = [];
    // Skip absent glyphs and surviving armor before emitting destruction effects.
    // oxlint-disable-next-line sonarjs/too-many-break-or-continue-in-loop
    for (const cell of block.cells) {
      if (!cell.alive || Math.hypot(cell.x - x, cell.y - y) > radius) {
        continue;
      }
      cell.health -= power;
      if (cell.health > 0) {
        continue;
      }
      cell.alive = false;
      removed++;
      const worldX = block.x + cell.x * cos - cell.y * sin;
      const worldY = block.y + cell.x * sin + cell.y * cos;
      removedGlyphs.push({
        x: worldX,
        y: worldY,
        char: cell.char,
        color: cell.color,
      });
      const life =
        TUNING.particles.glyphBaseLife +
        this.random() * TUNING.particles.glyphLifeRange;
      this.particles.push({
        x: worldX,
        y: worldY,
        vx:
          TUNING.particles.glyphBaseSpeed +
          this.random() * TUNING.particles.glyphSpeedRange,
        vy:
          (this.random() - HALF) * TUNING.particles.glyphVerticalSpeed -
          TUNING.particles.glyphVerticalLift,
        life,
        maxLife: life,
        char: cell.char,
        color: cell.color,
        angle: (this.random() - HALF) * TUNING.particles.glyphAngleRange,
      });
      this.triggerMagic(cell, worldX, worldY);
    }
    block.hits++;
    block.vx = Math.min(
      block.boss ? TUNING.damage.bossSpeedCap : TUNING.damage.speedCap,
      block.vx +
        ((blastRadius
          ? TUNING.damage.blastImpulse
          : TUNING.damage.shotImpulse) /
          Math.sqrt(block.toughness)) *
          (block.boss ? TUNING.damage.bossImpulseFactor : 1),
    );
    block.vy +=
      bullet.vy * TUNING.damage.verticalImpulseFactor +
      (y / Math.max(block.height, 1)) * TUNING.damage.impactTorque;
    block.angularVelocity += clamp(
      y * TUNING.damage.spinImpulseFactor,
      TUNING.damage.minSpinImpulse,
      TUNING.damage.maxSpinImpulse,
    );
    this.combo = Math.min(TUNING.damage.comboCap, this.combo + 1);
    this.comboTimer = 2.4;
    this.score +=
      removed *
      (TUNING.damage.pointsPerGlyph +
        Math.min(
          TUNING.damage.comboMultiplierCap,
          Math.floor(this.combo / TUNING.damage.glyphsPerComboTier),
        ));
    this.events.push("hit");
    this.visual({
      type: "impact",
      target: "code",
      blockId: block.id,
      x: block.x + x * cos - y * sin,
      y: block.y + x * sin + y * cos,
      vx: bullet.vx ?? block.vx,
      vy: bullet.vy,
      radius,
      seed: ++this.visualSeed,
      removed: removedGlyphs,
    });
    const remaining = block.cells.filter((cell) => cell.alive);
    if (
      remaining.length <
        (block.boss
          ? TUNING.damage.bossDeathCells
          : TUNING.damage.deathCells) ||
      isSpentFragment(block, remaining.length)
    ) {
      this.visual({
        type: "code-death",
        block: surfaceBeforeHit,
        x: block.x + x * cos - y * sin,
        y: block.y + x * sin + y * cos,
        vx: bullet.vx ?? block.vx,
        vy: bullet.vy,
        radius,
        seed: ++this.visualSeed,
      });
      this.blocks = this.blocks.filter((item) => item.id !== block.id);
      this.score +=
        TUNING.damage.destructionReward +
        block.generation * TUNING.damage.fragmentReward;
      this.blocksDestroyed++;
      this.burst(
        block.x,
        block.y,
        "#79e7ff",
        TUNING.particles.destroyBurstCount,
      );
      this.events.push("destroy");
    } else if (
      block.hits >=
        (block.boss
          ? TUNING.damage.bossBaseSplitHits +
            block.toughness * TUNING.damage.bossSplitHitsPerArmor
          : TUNING.damage.baseSplitHits + block.toughness) &&
      remaining.length > TUNING.damage.splitMinCells &&
      this.blocks.length < TUNING.bounds.blockCap
    ) {
      this.split(block, remaining, x, y);
    }
  }

  private triggerMagic(cell: Cell, worldX: number, worldY: number) {
    if (cell.magic && cell.magicId && !this.triggeredMagics.has(cell.magicId)) {
      this.triggeredMagics.add(cell.magicId);
      if (cell.magic === "ammo") {
        this.ammo = Math.min(
          this.weapon === "single"
            ? 60
            : PRIMARY_AMMO[this.weapon] * AMMO_CAPACITY_MULTIPLIER,
          this.ammo + TUNING.damage.ammoPerCache,
        );
        this.ammoCaches++;
        if (this.ammoCaches % TUNING.damage.cachesPerSpecial === 0) {
          const type: SpecialWeapon = (
            ["homing", "grenade", "review", "lint"] as const
          )[
            (this.ammoCaches / TUNING.damage.cachesPerSpecial - 1) %
              TUNING.damage.specialTypes
          ]!;
          this.specialAmmo[type] = Math.min(
            SPECIAL_AMMO_CAPS[type],
            this.specialAmmo[type] + 1,
          );
        }
        this.events.push("ammo");
        this.burst(worldX, worldY, "#83f4bd", TUNING.particles.ammoBurstCount);
      } else {
        this.spawnBonus(cell.magic, worldX, worldY);
      }
    }
  }

  private split(block: Block, cells: Cell[], hitX: number, hitY: number) {
    const horizontal =
      block.height > block.width * TUNING.split.horizontalAspectRatio;
    const sorted = [...cells].sort((a, b) =>
      horizontal ? a.y - b.y : a.x - b.x,
    );
    const middle = Math.floor(sorted.length * HALF);
    const halves = [sorted.slice(0, middle), sorted.slice(middle)];
    const cut = horizontal
      ? (sorted[middle - 1]!.y + sorted[middle]!.y) * HALF
      : (sorted[middle - 1]!.x + sorted[middle]!.x) * HALF;
    const cos = Math.cos(block.angle);
    const sin = Math.sin(block.angle);
    const parent = this.snapshot(block);
    const children: Block[] = [];
    const seed = ++this.visualSeed;
    this.blocks = this.blocks.filter((item) => item.id !== block.id);
    for (const [index, half] of halves.entries()) {
      const minX = Math.min(...half.map((cell) => cell.x));
      const maxX = Math.max(...half.map((cell) => cell.x));
      const minY = Math.min(...half.map((cell) => cell.y));
      const maxY = Math.max(...half.map((cell) => cell.y));
      const centerX = (minX + maxX) * HALF;
      const centerY = (minY + maxY) * HALF;
      const sign: -1 | 1 = index === 0 ? -1 : 1;
      const width = maxX - minX + TUNING.split.widthPadding;
      const height = maxY - minY + TUNING.split.heightPadding;
      const child: Block = {
        id: this.nextId++,
        title: block.title,
        x: block.x + centerX * cos - centerY * sin,
        y: block.y + centerX * sin + centerY * cos,
        vx:
          block.vx +
          sign *
            (block.boss
              ? TUNING.split.bossHorizontalKick
              : TUNING.split.horizontalKick),
        vy:
          block.vy +
          sign *
            (block.boss
              ? TUNING.split.bossVerticalKick
              : TUNING.split.verticalKick) +
          (centerY - hitY) * TUNING.split.impactVerticalFactor,
        angle: block.angle + sign * TUNING.split.angleKick,
        angularVelocity:
          block.angularVelocity +
          sign *
            (TUNING.split.spinKick +
              Math.abs(hitX) * TUNING.split.impactSpinFactor),
        width,
        height,
        cells: half.map((cell) => ({
          ...cell,
          x: cell.x - centerX,
          y: cell.y - centerY,
        })),
        hits: 0,
        age: 0,
        generation: block.generation + 1,
        toughness: block.toughness,
        angry: false,
        exception: block.exception,
        throwTimer: 3,
        boss: block.boss,
        bossRoot: block.bossRoot,
        bossMinion: block.bossMinion,
        fracture: {
          parentId: block.id,
          offsetX: centerX,
          offsetY: centerY,
          axis: horizontal ? "y" : "x",
          cut,
          side: sign,
          seed,
        },
      };
      this.blocks.push(child);
      children.push(this.snapshot(child));
    }
    this.visual({ type: "split", parent, children, seed });
    this.score += 50;
    this.events.push("split");
  }

  private collideBlocks() {
    for (let i = 0; i < this.blocks.length; i++) {
      const a = this.blocks[i]!;
      if (a.age < TUNING.collision.minimumAge) {
        continue;
      }
      const ae = this.extents(a);
      // Reject offscreen/new bodies before testing overlap; continue keeps each pair independent.
      // oxlint-disable-next-line sonarjs/too-many-break-or-continue-in-loop
      for (let j = i + 1; j < this.blocks.length; j++) {
        const b = this.blocks[j]!;
        if (
          b.age < TUNING.collision.minimumAge ||
          a.x > GAME_WIDTH + ae.x ||
          b.x > GAME_WIDTH + b.width * HALF
        ) {
          continue;
        }
        const be = this.extents(b);
        const overlapX = ae.x + be.x - Math.abs(b.x - a.x);
        const overlapY = ae.y + be.y - Math.abs(b.y - a.y);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }
        const horizontalDirection = b.x >= a.x ? 1 : -1;
        const verticalDirection = b.y >= a.y ? 1 : -1;
        const nx = overlapX < overlapY ? horizontalDirection : 0;
        const ny = nx === 0 ? verticalDirection : 0;
        const overlap = Math.min(overlapX, overlapY);
        const massA = Math.max(TUNING.collision.minimumMass, a.cells.length);
        const massB = Math.max(TUNING.collision.minimumMass, b.cells.length);
        const inverseA = 1 / massA;
        const inverseB = 1 / massB;
        const separation =
          (Math.max(0, overlap - TUNING.collision.penetrationSlop) *
            TUNING.collision.positionCorrection) /
          (inverseA + inverseB);
        a.x -= nx * separation * inverseA;
        a.y -= ny * separation * inverseA;
        b.x += nx * separation * inverseB;
        b.y += ny * separation * inverseB;
        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relative < 0) {
          const impulse =
            (TUNING.collision.impulseFactor * relative) / (inverseA + inverseB);
          a.vx -= impulse * nx * inverseA;
          a.vy -= impulse * ny * inverseA;
          b.vx += impulse * nx * inverseB;
          b.vy += impulse * ny * inverseB;
          a.angularVelocity -= relative * TUNING.collision.spinTransfer;
          b.angularVelocity += relative * TUNING.collision.spinTransfer;
        }
      }
    }
  }

  private extents(block: Block) {
    const cos = Math.abs(Math.cos(block.angle));
    const sin = Math.abs(Math.sin(block.angle));

    return {
      x: cos * block.width * HALF + sin * block.height * HALF,
      y: sin * block.width * HALF + cos * block.height * HALF,
    };
  }

  private hazardHalfWidth(hazard: TimeoutHazard) {
    return (
      (`await setTimeout(${hazard.durationMs});`.length *
        TIMEOUT_METRICS.charWidth +
        TIMEOUT_METRICS.widthPadding) *
      HALF
    );
  }

  private hitsHazard(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    hazard: TimeoutHazard,
  ) {
    const angle = Math.atan2(hazard.vy, -hazard.vx) * TUNING.hazard.angleFactor;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const local = (x: number, y: number) => ({
      x: (x - hazard.x) * cos + (y - hazard.y) * sin,
      y: -(x - hazard.x) * sin + (y - hazard.y) * cos,
    });
    const a = local(ax, ay);
    const b = local(bx, by);

    return this.segmentRectangle(
      a.x,
      a.y,
      b.x,
      b.y,
      this.hazardHalfWidth(hazard) + TUNING.hazard.hitPadding,
      TIMEOUT_METRICS.height * HALF + TUNING.hazard.hitPadding,
    );
  }

  private segmentRectangle(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    halfWidth: number,
    halfHeight: number,
  ) {
    let min = 0;
    let max = 1;
    for (const [start, delta, half] of [
      [ax, bx - ax, halfWidth],
      [ay, by - ay, halfHeight],
    ]) {
      if (Math.abs(delta!) < TUNING.collision.parallelEpsilon) {
        if (Math.abs(start!) > half!) {
          return false;
        }
      } else {
        const t1 = (-half! - start!) / delta!;
        const t2 = (half! - start!) / delta!;
        min = Math.max(min, Math.min(t1, t2));
        max = Math.min(max, Math.max(t1, t2));
        if (min > max) {
          return false;
        }
      }
    }

    return true;
  }

  private segmentDistance(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    px: number,
    py: number,
  ) {
    const dx = bx - ax;
    const dy = by - ay;
    const length = dx * dx + dy * dy;
    const t =
      length === 0
        ? 0
        : clamp(((px - ax) * dx + (py - ay) * dy) / length, 0, 1);

    return Math.hypot(ax + dx * t - px, ay + dy * t - py);
  }

  private burst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = this.random() * FULL_TURN_RADIANS;
      const speed = 60 + this.random() * TUNING.particles.burstSpeedRange;
      const life =
        TUNING.particles.burstBaseLife +
        this.random() * TUNING.particles.burstLifeRange;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color,
        angle,
      });
    }
  }
}
