import type { Simulation } from "#root/src/game/simulation/simulation.ts";

export function gameplaySnapshot(simulation: Simulation): string {
  return JSON.stringify({
    blocks: simulation.world.blocks,
    robots: simulation.world.robots,
    score: simulation.progress.score,
    ammo: simulation.player.ammo,
    elapsed: simulation.progress.elapsed,
  });
}
