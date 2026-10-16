import * as THREE from "three";

interface SpinSettings {
  rotationSpan: number;
  spinSpan: number;
  spinBias?: number;
}

export function randomDebrisSpin(random: () => number, settings: SpinSettings) {
  const rotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      random() * settings.rotationSpan,
      random() * settings.rotationSpan,
      random() * settings.rotationSpan,
    ),
  );
  const spinBias = settings.spinBias ?? 0;
  const spin = new THREE.Vector3(
    random() * settings.spinSpan - spinBias,
    random() * settings.spinSpan - spinBias,
    random() * settings.spinSpan - spinBias,
  );

  return { rotation, spin };
}
