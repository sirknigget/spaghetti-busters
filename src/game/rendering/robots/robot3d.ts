import { PALETTE } from "#root/src/game/palette.ts";
import * as THREE from "three";
import { instantiateModel } from "#root/src/game/graphics/model-assets.ts";
import {
  ROBOT_MOTION,
  LABEL_LAYOUT,
  names,
  type Brand,
  type RobotPose,
} from "#root/src/game/rendering/robots/robot-config.ts";

const SHELL_EMISSIVE_INTENSITY = 0.45;

/** Every robot owns its geometry, badge texture and label; no immortal resource cache. */
export function createRobot(brand: Brand): THREE.Group {
  const group = instantiateModel("robot");

  group.name = `ai-code-robot-${brand}`;
  attachBadge(group, brand);

  const anchor = group.getObjectByName("robot-status-anchor");

  if (!anchor) {
    throw new Error("Robot model has no status anchor");
  }

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
  findShell(group);
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
  animateLimbs(group, robot, frozen);
  if (!animateShield(group, robot)) {
    return;
  }

  const shell = group.userData.shell;

  if (!(shell instanceof THREE.MeshStandardMaterial)) {
    return;
  }

  const damageColor =
    robot.hitFlash > 0 ? PALETTE.robot.damageEmissive : PALETTE.common.black;

  shell.emissive.set(frozen ? PALETTE.robot.frozenEmissive : damageColor);
  shell.emissiveIntensity = SHELL_EMISSIVE_INTENSITY;
  animateThoughts(group, robot);
  updateLabel(group, robot, frozen);
}

function animateShield(group: THREE.Group, robot: RobotPose) {
  const shield = group.getObjectByName("robot-armor-flash");

  if (
    !(shield instanceof THREE.Mesh) ||
    !(shield.material instanceof THREE.MeshStandardMaterial)
  ) {
    return false;
  }

  shield.material.opacity =
    robot.hitFlash > 0 ? ROBOT_MOTION.hitShieldOpacity : 0;
  shield.material.color.set(
    robot.hitFlash > 0 ? PALETTE.robot.hitShield : PALETTE.robot.shield,
  );

  return true;
}

function attachBadge(group: THREE.Group, brand: Brand) {
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
}

function findShell(group: THREE.Group) {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    for (const material of materials) {
      if (material.name === "robot-shell") {
        group.userData.shell = material;
      }
    }
  });
}

function animateLimbs(group: THREE.Group, robot: RobotPose, frozen: boolean) {
  const running = robot.state !== "thinking";
  const striding = running && !frozen;
  const phase = robot.age * ROBOT_MOTION.strideFrequency;

  for (const side of [-1, 1]) {
    group.getObjectByName(`robot-leg-${side}`)!.rotation.x = striding
      ? Math.sin(phase + (side * Math.PI) / ROBOT_MOTION.legsPerStride) *
        ROBOT_MOTION.legSwing
      : 0;
    group.getObjectByName(`robot-leg-${side}`)!.rotation.z = striding
      ? Math.sin(phase + (side * Math.PI) / ROBOT_MOTION.legsPerStride) *
        ROBOT_MOTION.legSway
      : 0;
    group.getObjectByName(`robot-arm-${side}`)!.rotation.x = striding
      ? -Math.sin(phase + (side * Math.PI) / ROBOT_MOTION.legsPerStride) *
        ROBOT_MOTION.armSwing
      : ROBOT_MOTION.restingArmAngle;
  }

  animateBody(group, robot, frozen);
}

function animateBody(group: THREE.Group, robot: RobotPose, frozen: boolean) {
  const running = robot.state !== "thinking";
  const phase = robot.age * ROBOT_MOTION.strideFrequency;

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
}

function animateThoughts(group: THREE.Group, robot: RobotPose) {
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
}

function updateLabel(group: THREE.Group, robot: RobotPose, frozen: boolean) {
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

    if (!(canvas instanceof HTMLCanvasElement)) {
      return;
    }

    paintLabel(canvas, { brand: robot.brand, state, frozen });

    const labelTexture = group.userData.labelTexture;

    if (labelTexture instanceof THREE.CanvasTexture) {
      labelTexture.needsUpdate = true;
    }
  }
}

interface LabelInfo {
  brand: Brand;
  state: string;
  frozen: boolean;
}

function paintLabel(canvas: HTMLCanvasElement, info: LabelInfo) {
  const c = canvas.getContext("2d")!;

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = PALETTE.robot.labelBackground;
  c.beginPath();
  c.roundRect(0, 0, canvas.width, canvas.height, LABEL_LAYOUT.cornerRadius);
  c.fill();
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = "bold 40px monospace";
  c.fillStyle = PALETTE.robot.labelText;
  c.fillText(
    names[info.brand],
    canvas.width / LABEL_LAYOUT.centerDivisor,
    LABEL_LAYOUT.companyY,
  );
  c.font = "bold 22px monospace";
  c.fillStyle = info.frozen
    ? PALETTE.robot.labelFrozen
    : PALETTE.robot.labelActive;
  c.fillText(
    info.state,
    canvas.width / LABEL_LAYOUT.centerDivisor,
    LABEL_LAYOUT.statusY,
  );
}
