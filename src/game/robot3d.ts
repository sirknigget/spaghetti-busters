import * as THREE from "three";
import { instantiateModel } from "./model-assets";

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
const ROBOT_MOTION = {
  strideFrequency: 14,
  legsPerStride: 2,
  legSwing: 0.75,
  legSway: 0.24,
  armSwing: 0.8,
  restingArmAngle: -0.35,
  leavingYaw: -0.38,
  runningYaw: 0.25,
  runningBounce: 5,
  idleFrequency: 3,
  idleBounce: 1.3,
  thinkingFrequency: 4,
  thinkingTilt: 0.12,
  hitShieldOpacity: 0.2,
  thoughtBaseScale: 0.7,
  thoughtFrequency: 7,
  thoughtPhase: 1.2,
  thoughtPulse: 0.6,
};
const LABEL_LAYOUT = {
  cornerRadius: 16,
  companyY: 32,
  statusY: 77,
  centerDivisor: 2,
};
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
  const group = instantiateModel("robot");
  group.name = `ai-code-robot-${brand}`;
  const mark = group.getObjectByName("robot-brand-mark");
  if (
    mark instanceof THREE.Mesh &&
    mark.material instanceof THREE.MeshBasicMaterial
  ) {
    const logo = new THREE.TextureLoader().load(`/assets/brands/${brand}.svg`);
    logo.colorSpace = THREE.SRGBColorSpace;
    mark.material.map = logo;
    mark.material.needsUpdate = true;
  }
  const anchor = group.getObjectByName("robot-status-anchor");
  if (!anchor) throw new Error("Robot model has no status anchor");
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = anchor.userData.canvasWidth;
  labelCanvas.height = anchor.userData.canvasHeight;
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false }),
  );
  label.name = "robot-status";
  label.position.copy(anchor.position);
  label.scale.copy(anchor.scale);
  group.remove(anchor);
  group.add(label);
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials)
      if (material.name === "robot-shell") group.userData.shell = material;
  });
  group.userData.brand = brand;
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
    phase = robot.age * ROBOT_MOTION.strideFrequency;
  for (const side of [-1, 1]) {
    group.getObjectByName(`robot-leg-${side}`)!.rotation.x =
      running && !frozen
        ? Math.sin(phase + (side * Math.PI) / ROBOT_MOTION.legsPerStride) *
          ROBOT_MOTION.legSwing
        : 0;
    group.getObjectByName(`robot-leg-${side}`)!.rotation.z =
      running && !frozen
        ? Math.sin(phase + (side * Math.PI) / ROBOT_MOTION.legsPerStride) *
          ROBOT_MOTION.legSway
        : 0;
    group.getObjectByName(`robot-arm-${side}`)!.rotation.x =
      running && !frozen
        ? -Math.sin(phase + (side * Math.PI) / ROBOT_MOTION.legsPerStride) *
          ROBOT_MOTION.armSwing
        : ROBOT_MOTION.restingArmAngle;
  }
  group.rotation.y =
    robot.state === "leaving"
      ? ROBOT_MOTION.leavingYaw
      : ROBOT_MOTION.runningYaw;
  group.position.y +=
    running && !frozen
      ? Math.abs(Math.sin(phase)) * ROBOT_MOTION.runningBounce
      : Math.sin(robot.age * ROBOT_MOTION.idleFrequency) *
        ROBOT_MOTION.idleBounce;
  group.getObjectByName("robot-head")!.rotation.z =
    robot.state === "thinking"
      ? Math.sin(robot.age * ROBOT_MOTION.thinkingFrequency) *
        ROBOT_MOTION.thinkingTilt
      : 0;
  const shield = group.getObjectByName("robot-armor-flash");
  if (
    !(shield instanceof THREE.Mesh) ||
    !(shield.material instanceof THREE.MeshStandardMaterial)
  )
    return;
  shield.material.opacity =
    robot.hitFlash > 0 ? ROBOT_MOTION.hitShieldOpacity : 0;
  shield.material.color.set(robot.hitFlash > 0 ? "#fff0ad" : "#74cfe2");
  const shell = group.userData.shell;
  if (!(shell instanceof THREE.MeshStandardMaterial)) return;
  const damageColor = robot.hitFlash > 0 ? "#bd8e35" : "#000000";
  shell.emissive.set(frozen ? "#286c9c" : damageColor);
  shell.emissiveIntensity = 0.45;
  const thought = group.getObjectByName("robot-thinking")!;
  thought.visible = robot.state === "thinking";
  for (const [i, dot] of thought.children.entries()) {
    dot.scale.setScalar(
      ROBOT_MOTION.thoughtBaseScale +
        Math.max(
          0,
          Math.sin(
            robot.age * ROBOT_MOTION.thoughtFrequency -
              i * ROBOT_MOTION.thoughtPhase,
          ),
        ) *
          ROBOT_MOTION.thoughtPulse,
    );
  }
  const activities = {
    thinking: "THINKING…",
    leaving: "CODE DELIVERED",
    running: "ARMORED",
  };
  const activity = frozen ? "REVIEW PAUSED" : activities[robot.state];
  const state = `${activity} · ${robot.health}/${robot.maxHealth}`;
  if (group.userData.labelState !== state) {
    group.userData.labelState = state;
    const canvas = group.userData.labelCanvas;
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const c = canvas.getContext("2d")!;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "#173849";
    c.beginPath();
    c.roundRect(0, 0, canvas.width, canvas.height, LABEL_LAYOUT.cornerRadius);
    c.fill();
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "bold 40px monospace";
    c.fillStyle = "#fff1be";
    c.fillText(
      names[robot.brand],
      canvas.width / LABEL_LAYOUT.centerDivisor,
      LABEL_LAYOUT.companyY,
    );
    c.font = "bold 22px monospace";
    c.fillStyle = frozen ? "#9deaff" : "#b4e7e7";
    c.fillText(
      state,
      canvas.width / LABEL_LAYOUT.centerDivisor,
      LABEL_LAYOUT.statusY,
    );
    const labelTexture = group.userData.labelTexture;
    if (labelTexture instanceof THREE.CanvasTexture)
      labelTexture.needsUpdate = true;
  }
}
