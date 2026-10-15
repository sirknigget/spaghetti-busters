import type { PlayScene } from "./play-scene";
import { INPUT } from "./scene-config";

export function point(scene: PlayScene, event: PointerEvent) {
  const canvas = scene.world.renderer.domElement;
  const box = canvas.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) {
    return;
  }
  scene.sim.player.aimX = Math.max(
    INPUT.pointerMinX,
    Math.min(
      INPUT.viewportWidth,
      ((event.clientX - box.left) / box.width) * INPUT.viewportWidth,
    ),
  );
  scene.sim.player.aimY = Math.max(
    INPUT.pointerMinY,
    Math.min(
      INPUT.pointerMaxY,
      ((event.clientY - box.top) / box.height) * INPUT.viewportHeight,
    ),
  );
}
export function bindPointer(scene: PlayScene): void {
  const canvas = scene.world.renderer.domElement;
  canvas.addEventListener("pointermove", (event) => {
    if (!scene.paused) {
      point(scene, event);
    }
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (scene.paused) {
      return;
    }
    event.preventDefault();
    point(scene, event);
    canvas.setPointerCapture(event.pointerId);
    if (event.button === INPUT.secondaryButton) {
      scene.sim.fireSpecial();
      scene.holdingSpecial = true;
    } else if (event.button === 0) {
      scene.sim.fire();
      scene.holding = true;
    }
  });
  window.addEventListener("pointerup", (event) => {
    scene.holding = (event.buttons & 1) !== 0;
    scene.holdingSpecial = (event.buttons & INPUT.secondaryButton) !== 0;
  });
  canvas.addEventListener("pointercancel", () => scene.release());
  canvas.addEventListener("lostpointercapture", () => scene.release());
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
}

export function bindKeyboard(scene: PlayScene): void {
  window.addEventListener("keydown", (event) => {
    if (scene.paused) {
      return;
    }
    if (
      ["Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(event.code)
    ) {
      event.preventDefault();
      scene.keys.add(event.code);
    }
    if (event.code === "Digit1" || event.code === "Numpad1") {
      scene.selectSpecial("homing");
    }
    if (event.code === "Digit2" || event.code === "Numpad2") {
      scene.selectSpecial("grenade");
    }
    if (event.code === "Digit3" || event.code === "Numpad3") {
      scene.selectSpecial("review");
    }
    if (event.code === "Digit4" || event.code === "Numpad4") {
      scene.selectSpecial("lint");
    }
  });
}
