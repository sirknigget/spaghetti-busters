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
} from "#root/src/game/simulation/simulation-types.ts";

const INITIAL_AIM_X = 900;
const INITIAL_PLAYER_Y = 360;
const INITIAL_HOMING_AMMO = 3;
const INITIAL_GRENADE_AMMO = 2;
const INITIAL_HAZARD_DELAY_SECONDS = 9;
const INITIAL_ROBOT_DELAY_SECONDS = 13;
const INITIAL_BONUS_DELAY_SECONDS = 18;
const INITIAL_BOSS_SPAWN_DELAY_SECONDS = 4;

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
  aimX = INITIAL_AIM_X;
  aimY = INITIAL_PLAYER_Y;
  playerY = INITIAL_PLAYER_Y;
  specialWeapon: SpecialWeapon = "homing";
  specialAmmo: Record<SpecialWeapon, number> = {
    homing: INITIAL_HOMING_AMMO,
    grenade: INITIAL_GRENADE_AMMO,
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
  hazardTimer = INITIAL_HAZARD_DELAY_SECONDS;
  robotTimer = INITIAL_ROBOT_DELAY_SECONDS;
  bonusTimer = INITIAL_BONUS_DELAY_SECONDS;
  ammoCaches = 0;
  cooldown = 0;
  spawnTimer = 0;
  pendingBlocks = 0;
  comboTimer = 0;
  waveTimer = 0;
  triggeredMagics = new Set<string>();
  activeBossRoot?: number;
  bossMaxHealth = 0;
  bossSpawnTimer = INITIAL_BOSS_SPAWN_DELAY_SECONDS;
  bossRewarded = false;
}
