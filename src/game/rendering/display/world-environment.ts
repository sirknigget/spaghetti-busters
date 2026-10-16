import { PALETTE } from "#root/src/game/palette.ts";
import * as THREE from "three";
import {
  instantiateModel,
  loadGeometry,
} from "#root/src/game/graphics/model-assets.ts";
import { createEnvironment } from "#root/src/game/rendering/models/models3d.ts";
import {
  VIEW,
  LIGHT,
  MARKER,
  HEIGHT,
} from "#root/src/game/rendering/world-settings.ts";

const RETICLE_ORDER = 100;
const SHADOW_BIAS = -0.0002;
const SHADOW_NORMAL_BIAS = 0.8;
const SHADOW_FAR = 2500;
const SHADOW_NEAR = 10;
const SHADOW_BOTTOM = -750;
const SHADOW_TOP = 750;
const SHADOW_RIGHT = 1000;
const SHADOW_LEFT = -1000;
const EXPOSURE = 1.1;

export function configureRenderer(renderer: THREE.WebGLRenderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, VIEW.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
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
  const light = new THREE.DirectionalLight(PALETTE.environment.sun, LIGHT.sun);

  light.position.set(LIGHT.sunX, LIGHT.sunY, LIGHT.sunZ);
  light.target.position.set(LIGHT.targetX, LIGHT.targetY, LIGHT.targetZ);
  light.castShadow = true;
  light.shadow.mapSize.set(LIGHT.shadowSize, LIGHT.shadowSize);
  light.shadow.camera.left = SHADOW_LEFT;
  light.shadow.camera.right = SHADOW_RIGHT;
  light.shadow.camera.top = SHADOW_TOP;
  light.shadow.camera.bottom = SHADOW_BOTTOM;
  light.shadow.camera.near = SHADOW_NEAR;
  light.shadow.camera.far = SHADOW_FAR;
  light.shadow.normalBias = SHADOW_NORMAL_BIAS;
  light.shadow.bias = SHADOW_BIAS;

  return light;
}

export function populateEnvironment(
  scene: THREE.Scene,
  danger: THREE.Material,
) {
  scene.background = new THREE.Color(PALETTE.environment.sky);
  scene.fog = new THREE.Fog(PALETTE.environment.fog, VIEW.fogNear, VIEW.fogFar);
  scene.add(
    new THREE.HemisphereLight(
      PALETTE.environment.ambientSky,
      PALETTE.environment.ground,
      LIGHT.ambient,
    ),
  );

  const sun = sunlight();

  scene.add(sun, sun.target);

  const rim = new THREE.DirectionalLight(PALETTE.environment.rim, LIGHT.rim);

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

  reticle.renderOrder = RETICLE_ORDER;
  reticle.traverse((child) => (child.renderOrder = RETICLE_ORDER));

  return reticle;
}
