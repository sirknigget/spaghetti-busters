import type { AudioGraph } from "./audio-graph";
import type { Synth } from "./audio-synth";
import { menuOpen, menuHover, menuClick } from "./audio-effects-menu";
import { boss, bossSpawn, bossDefeated } from "./audio-effects-boss";
import {
  robot,
  generate,
  exception,
  absorb,
  robotDestroy,
} from "./audio-effects-enemies";
import {
  missile,
  grenade,
  shot,
  hit,
  split,
  destroy,
  explosion,
} from "./audio-effects-combat";
import { review, lint, hazard, stun, recover } from "./audio-effects-status";
import { bonus, pickup, ammo, wave, gameover } from "./audio-effects-bonuses";

type Effect = (synth: Synth, graph: AudioGraph, time: number) => void;
const effects = new Map<string, Effect>(
  Object.entries({
    "menu-open": menuOpen,
    "menu-hover": menuHover,
    "menu-click": menuClick,
    boss: boss,
    "boss-spawn": bossSpawn,
    "boss-defeated": bossDefeated,
    missile: missile,
    grenade: grenade,
    robot: robot,
    generate: generate,
    exception: exception,
    "robot-hit": absorb,
    absorb: absorb,
    review: review,
    lint: lint,
    bonus: bonus,
    explosion: explosion,
    hazard: hazard,
    stun: stun,
    recover: recover,
    shot: shot,
    hit: hit,
    split: split,
    "robot-destroy": robotDestroy,
    destroy: destroy,
    pickup: pickup,
    ammo: ammo,
    wave: wave,
    gameover: gameover,
  }),
);

export function playEffect(event: string, synth: Synth): void {
  effects.get(event)?.(synth, synth.graph, synth.graph.context.currentTime);
}
