import { readFile } from "node:fs/promises";
import { preloadModels } from "#root/src/game/graphics/model-assets.ts";

export async function preloadTestModels(): Promise<void> {
  const bytes = await readFile(
    new URL("../../public/assets/models/arcade-models.glb", import.meta.url),
  );

  await preloadModels(Uint8Array.from(bytes).buffer);
}
