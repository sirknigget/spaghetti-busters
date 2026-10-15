import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type Brand =
  | "openai"
  | "anthropic"
  | "google"
  | "x"
  | "moonshot"
  | "zai"
  | "deepseek"
  | "meta";
interface RobotPose {
  brand: Brand;
  state: "running" | "thinking" | "leaving";
  age: number;
  stateTime: number;
  hitFlash: number;
  health: number;
  maxHealth: number;
}
const names: Record<Brand, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  x: "X",
  moonshot: "Moonshot",
  zai: "Z.ai",
  deepseek: "DeepSeek",
  meta: "Meta",
};

/** Every robot owns its geometry, badge texture and label; no immortal resource cache. */
export function createRobot(brand: Brand): THREE.Group {
  const group = new THREE.Group();
  group.name = `ai-code-robot-${brand}`;
  group.scale.setScalar(1.05);
  const shell = new THREE.MeshStandardMaterial({
    color: "#e0ebee",
    metalness: 0.68,
    roughness: 0.31,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#233c4c",
    metalness: 0.5,
    roughness: 0.4,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: "#f8c355",
    metalness: 0.45,
    roughness: 0.28,
  });
  const cyan = new THREE.MeshStandardMaterial({
    color: "#76e4f9",
    emissive: "#278caf",
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  const boxGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.15);
  const box = (
    parent: THREE.Group,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => {
    const mesh = new THREE.Mesh(boxGeo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  box(group, shell, 0, 0, 0, 49, 47, 30);
  box(group, dark, 0, -27, 0, 34, 12, 25);
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = `robot-leg-${side}`;
    leg.position.set(side * 13, -30, 0);
    group.add(leg);
    box(leg, dark, 0, -12, 0, 11, 26, 13);
    box(leg, shell, 0, -26, 3, 14, 16, 17);
    box(leg, gold, side * 2, -35, 9, 22, 11, 28);
    const arm = new THREE.Group();
    arm.name = `robot-arm-${side}`;
    arm.position.set(side * 29, 15, 0);
    group.add(arm);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 8), gold);
    arm.add(joint);
    box(arm, shell, side * 2, -17, 0, 13, 27, 15);
    box(arm, dark, side * 3, -32, 2, 16, 12, 17);
    box(group, gold, side * 23, 0, 0, 5, 40, 33);
  }
  box(group, dark, 0, 29, 0, 13, 13, 13);
  const head = new THREE.Group();
  head.name = "robot-head";
  head.position.set(0, 45, 0);
  group.add(head);
  box(head, shell, 0, 0, 0, 42, 29, 29);
  box(head, dark, 0, 0, 16, 33, 15, 4);
  for (const x of [-9, 9]) box(head, cyan, x, 2, 19, 6, 4, 3);
  box(head, gold, 0, -8, 18, 13, 2, 3);
  box(head, gold, 0, 24, 0, 3, 23, 3);
  const antenna = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 8), cyan);
  antenna.name = "robot-antenna";
  antenna.position.set(0, 37, 0);
  head.add(antenna);
  box(group, dark, 0, 4, 17, 38, 35, 3);
  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 31),
    new THREE.MeshBasicMaterial({ color: "#ffffff" }),
  );
  badge.position.set(0, 4, 19.2);
  group.add(badge);
  // Badges use locally bundled vector brand marks on an actual solid torso.
  const logo = new THREE.TextureLoader().load(`/assets/brands/${brand}.svg`);
  logo.colorSpace = THREE.SRGBColorSpace;
  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(31, 28),
    new THREE.MeshBasicMaterial({ map: logo, transparent: true }),
  );
  mark.position.set(0, 4, 19.5);
  group.add(mark);
  for (let i = 0; i < 3; i++) box(group, cyan, -10 + i * 10, -19, 17, 5, 2, 2);
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(67, 20, 14),
    new THREE.MeshStandardMaterial({
      color: "#74cfe2",
      transparent: true,
      opacity: 0.075,
      roughness: 0.12,
      metalness: 0.3,
      depthWrite: false,
    }),
  );
  shield.name = "robot-armor-flash";
  shield.scale.set(0.72, 1.05, 0.7);
  shield.position.y = 5;
  group.add(shield);
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 110;
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false }),
  );
  label.name = "robot-status";
  label.scale.set(208, 45, 1);
  label.position.set(0, 113, 0);
  group.add(label);
  const thought = new THREE.Group();
  thought.name = "robot-thinking";
  thought.position.set(0, 91, 0);
  group.add(thought);
  for (let i = 0; i < 3; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(3.4, 10, 8), cyan);
    dot.position.x = (i - 1) * 13;
    thought.add(dot);
  }
  group.userData.brand = brand;
  group.userData.shell = shell;
  group.userData.labelCanvas = labelCanvas;
  group.userData.labelTexture = texture;
  return group;
}

export function animateRobot(
  group: THREE.Group,
  robot: RobotPose,
  frozen: boolean,
) {
  const running = robot.state !== "thinking",
    phase = robot.age * 14;
  for (const side of [-1, 1]) {
    group.getObjectByName(`robot-leg-${side}`)!.rotation.x =
      running && !frozen ? Math.sin(phase + (side * Math.PI) / 2) * 0.75 : 0;
    group.getObjectByName(`robot-leg-${side}`)!.rotation.z =
      running && !frozen ? Math.sin(phase + (side * Math.PI) / 2) * 0.24 : 0;
    group.getObjectByName(`robot-arm-${side}`)!.rotation.x =
      running && !frozen
        ? -Math.sin(phase + (side * Math.PI) / 2) * 0.8
        : -0.35;
  }
  group.rotation.y = robot.state === "leaving" ? -0.38 : 0.25;
  group.position.y +=
    running && !frozen
      ? Math.abs(Math.sin(phase)) * 5
      : Math.sin(robot.age * 3) * 1.3;
  group.getObjectByName("robot-head")!.rotation.z =
    robot.state === "thinking" ? Math.sin(robot.age * 4) * 0.12 : 0;
  const shield = group.getObjectByName("robot-armor-flash") as THREE.Mesh;
  (shield.material as THREE.MeshStandardMaterial).opacity =
    robot.hitFlash > 0 ? 0.2 : 0;
  (shield.material as THREE.MeshStandardMaterial).color.set(
    robot.hitFlash > 0 ? "#fff0ad" : "#74cfe2",
  );
  const shell = group.userData.shell as THREE.MeshStandardMaterial;
  shell.emissive.set(
    frozen ? "#286c9c" : robot.hitFlash > 0 ? "#bd8e35" : "#000000",
  );
  shell.emissiveIntensity = 0.45;
  const thought = group.getObjectByName("robot-thinking")!;
  thought.visible = robot.state === "thinking";
  thought.children.forEach((dot, i) => {
    dot.scale.setScalar(
      0.7 + Math.max(0, Math.sin(robot.age * 7 - i * 1.2)) * 0.6,
    );
  });
  const activity = frozen
    ? "REVIEW PAUSED"
    : robot.state === "thinking"
      ? "THINKING…"
      : robot.state === "leaving"
        ? "CODE DELIVERED"
        : "ARMORED";
  const state = `${activity} · ${robot.health}/${robot.maxHealth}`;
  if (group.userData.labelState !== state) {
    group.userData.labelState = state;
    const canvas = group.userData.labelCanvas as HTMLCanvasElement,
      c = canvas.getContext("2d")!;
    c.clearRect(0, 0, 512, 110);
    c.fillStyle = "#173849";
    c.beginPath();
    c.roundRect(0, 0, 512, 110, 16);
    c.fill();
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "bold 40px monospace";
    c.fillStyle = "#fff1be";
    c.fillText(names[robot.brand], 256, 32);
    c.font = "bold 22px monospace";
    c.fillStyle = frozen ? "#9deaff" : "#b4e7e7";
    c.fillText(state, 256, 77);
    (group.userData.labelTexture as THREE.CanvasTexture).needsUpdate = true;
  }
}
