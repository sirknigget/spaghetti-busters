import {
  type Block,
  type Bullet,
  type Explosion,
  type GameEvent,
  type Particle,
  type Pickup,
  type Robot,
  type SpecialProjectile,
  type SpecialWeapon,
  type TimeoutHazard,
  type VisualEvent,
  type Weapon,
} from "./simulation-types";

export class WorldState {
  blocks: Block[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  pickups: Pickup[] = [];
  events: GameEvent[] = [];
  visualEvents: VisualEvent[] = [];
  specials: SpecialProjectile[] = [];
  explosions: Explosion[] = [];
  hazards: TimeoutHazard[] = [];
  robots: Robot[] = [];
}

export class PlayerState {
  aimX = 900;
  aimY = 360;
  playerY = 360;
  specialWeapon: SpecialWeapon = "homing";
  specialAmmo: Record<SpecialWeapon, number> = {
    homing: 3,
    grenade: 2,
    review: 1,
    lint: 1,
  };
  stunRemaining = 0;
  freezeRemaining = 0;
  reviewPulse = 0;
  lintPulse = 0;
  weapon: Weapon = "single";
  ammo = 0;
}

export class ProgressState {
  score = 0;
  wave = 1;
  combo = 0;
  status: "playing" | "gameover" = "playing";
  elapsed = 0;
  shotsFired = 0;
  blocksDestroyed = 0;
}

export class RuntimeState {
  visualSeed = 0;
  nextId = 1;
  specialCooldown = 0;
  hazardTimer = 9;
  robotTimer = 13;
  bonusTimer = 18;
  ammoCaches = 0;
  cooldown = 0;
  spawnTimer = 0;
  pendingBlocks = 0;
  comboTimer = 0;
  waveTimer = 0;
  triggeredMagics = new Set<string>();
  activeBossRoot?: number;
  bossMaxHealth = 0;
  bossSpawnTimer = 4;
  bossRewarded = false;
}
