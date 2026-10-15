import { preloadModels } from "./model-assets";
import type { Simulation, SpecialWeapon } from "./simulation";
import { WorldRenderer } from "./world3d";
import { PlayScene } from "./play-scene";

export interface GameController {
  reset(): void;
  setPaused(value: boolean): void;
  selectSpecial(type: SpecialWeapon): void;
  fireSpecial(): void;
}
export interface Callbacks {
  onState: (s: Simulation) => void;
  onEvent: (event: string) => void;
  onGameOver: (score: number, wave: number) => void;
}

export async function createGame(
  parent: string,
  callbacks: Callbacks,
): Promise<GameController> {
  const host = document.getElementById(parent)!;

  await preloadModels();

  const world = new WorldRenderer(host);

  try {
    await world.initialize();
  } catch (error) {
    world.dispose();
    throw error;
  }

  const scene = new PlayScene(world, callbacks, host);

  if (import.meta.env.DEV || import.meta.env.MODE === "test") {
    Object.assign(window, {
      __spaghetti: {
        simulation: scene.sim,
        scene,
        renderer: scene.world.renderer,
        world: scene.world,
      },
    });
  }

  return scene;
}
