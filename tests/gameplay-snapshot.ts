import type { Simulation } from "../src/game/simulation";

export function gameplaySnapshot(simulation: Simulation): string {
  return JSON.stringify({
    blocks: simulation.world.blocks,
    robots: simulation.world.robots,
    score: simulation.progress.score,
    ammo: simulation.player.ammo,
    elapsed: simulation.progress.elapsed,
  });
}
