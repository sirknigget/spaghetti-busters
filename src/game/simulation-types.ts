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
