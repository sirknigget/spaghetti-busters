import { preloadModels } from "#root/src/game/graphics/model-assets.ts";
import type {
  Simulation,
  SpecialWeapon,
} from "#root/src/game/simulation/simulation.ts";
import { WorldRenderer } from "#root/src/game/rendering/world3d.ts";
import { PlayScene } from "#root/src/game/scene/play-scene.ts";

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
