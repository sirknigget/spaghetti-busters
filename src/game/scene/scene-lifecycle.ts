import type { PlayScene } from "#root/src/game/scene/play-scene.ts";

export function bindLifecycle(scene: PlayScene): void {
  const canvas = scene.world.renderer.domElement;

  window.addEventListener("keyup", (event) => scene.keys.delete(event.code));
  window.addEventListener("blur", () => scene.release());
  window.addEventListener("resize", () => {
    scene.world.resize();
    scene.draw();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    scene.setPaused(true);
    scene.host.dispatchEvent(new CustomEvent("game-context-lost"));
  });
  canvas.addEventListener("webglcontextrestored", () => {
    scene.world.resize();
    scene.draw();
    scene.host.dispatchEvent(new CustomEvent("game-context-restored"));
  });
}
