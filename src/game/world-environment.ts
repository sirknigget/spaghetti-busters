import * as THREE from "three";
import { instantiateModel, loadGeometry } from "./model-assets";
import { createEnvironment } from "./models3d";
import { VIEW, LIGHT, MARKER, HEIGHT } from "./world-settings";

export function configureRenderer(renderer: THREE.WebGLRenderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, VIEW.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.setAttribute(
    "aria-label",
    "3D arcade playfield. Move to aim, left click or Space to shoot. Right click launches special weapons. Select with 1 for homing, 2 for grenades, 3 for code review, or 4 for lint bombs.",
  );
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    renderer.domElement.dispatchEvent(new Event("game-context-lost"));
  });
}

function sunlight() {
  const light = new THREE.DirectionalLight("#fff0c1", LIGHT.sun);
  light.position.set(LIGHT.sunX, LIGHT.sunY, LIGHT.sunZ);
  light.target.position.set(LIGHT.targetX, LIGHT.targetY, LIGHT.targetZ);
  light.castShadow = true;
  light.shadow.mapSize.set(LIGHT.shadowSize, LIGHT.shadowSize);
  light.shadow.camera.left = -1000;
  light.shadow.camera.right = 1000;
  light.shadow.camera.top = 750;
  light.shadow.camera.bottom = -750;
  light.shadow.camera.near = 10;
  light.shadow.camera.far = 2500;
  light.shadow.normalBias = 0.8;
  light.shadow.bias = -0.0002;

  return light;
}

export function populateEnvironment(
  scene: THREE.Scene,
  danger: THREE.Material,
) {
  scene.background = new THREE.Color("#b8d3c2");
  scene.fog = new THREE.Fog("#c2d9c8", VIEW.fogNear, VIEW.fogFar);
  scene.add(new THREE.HemisphereLight("#e4f7ff", "#586d55", LIGHT.ambient));
  const sun = sunlight();
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight("#93cfff", LIGHT.rim);
  rim.position.set(LIGHT.rimX, LIGHT.rimY, LIGHT.rimZ);
  scene.add(rim, createEnvironment());
  for (let y = MARKER.startY; y < MARKER.endY; y += MARKER.spacing) {
    const marker = new THREE.Mesh(loadGeometry("danger-marker"), danger);
    marker.position.set(MARKER.x, HEIGHT - y, 0);
    scene.add(marker);
  }
}

export function createReticle() {
  const reticle = instantiateModel("reticle");
  reticle.renderOrder = 100;
  reticle.traverse((child) => (child.renderOrder = 100));

  return reticle;
}
