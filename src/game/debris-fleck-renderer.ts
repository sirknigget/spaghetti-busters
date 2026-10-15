import * as THREE from "three";
import { loadGeometry } from "./model-assets";
import { MAX_FLECKS, HALF, DRAW } from "./debris-settings";
import { disposeObject } from "./graphics-resources";
import { type Fleck } from "./debris-types";

export function createShards() {
  const mesh = new THREE.InstancedMesh(
    loadGeometry("solid-impact-shard"),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.86,
      metalness: 0.12,
    }),
    MAX_FLECKS,
  );
  mesh.name = "physics-chipped-code-shards";
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

export function createSparks() {
  const mesh = new THREE.InstancedMesh(
    loadGeometry("spark-fleck"),
    new THREE.MeshBasicMaterial({
      color: "#ffffff",
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    MAX_FLECKS,
  );
  mesh.name = "physics-incandescent-sparks";

  return mesh;
}

export function createSmoke(smokeAlpha: THREE.InstancedBufferAttribute) {
  const smokeGeometry = loadGeometry("smoke-quad");
  smokeGeometry.setAttribute("instanceAlpha", smokeAlpha);
  const smokeMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: false,
    vertexShader:
      "attribute float instanceAlpha; varying vec2 vUv; varying float vAlpha; void main(){vUv=uv;vAlpha=instanceAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec2 vUv; varying float vAlpha; void main(){float r=length(vUv-.5)*2.;float a=exp(-r*r*4.)*(1.-smoothstep(.55,1.,r))*vAlpha;gl_FragColor=vec4(.32,.39,.40,a);}",
  });

  const mesh = new THREE.InstancedMesh(
    smokeGeometry,
    smokeMaterial,
    MAX_FLECKS,
  );
  mesh.name = "physics-buoyant-turbulent-smoke";

  return mesh;
}

export class FleckRenderer {
  private readonly shards = createShards();
  private readonly sparks = createSparks();
  private readonly smokeAlpha = new THREE.InstancedBufferAttribute(
    new Float32Array(MAX_FLECKS),
    1,
  );
  private readonly smoke = createSmoke(this.smokeAlpha);
  private readonly transform = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    for (const mesh of [this.shards, this.sparks, this.smoke]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
    }
  }

  render(flecks: Fleck[]) {
    const counts = { shard: 0, spark: 0, smoke: 0 };
    for (const p of flecks) {
      const meshes = {
        shard: this.shards,
        spark: this.sparks,
        smoke: this.smoke,
      };
      const mesh = meshes[p.kind];
      const index = counts[p.kind]++;
      this.pose(p, index);
      this.transform.updateMatrix();
      mesh.setMatrixAt(index, this.transform.matrix);
      if (p.kind !== "smoke") {
        mesh.setColorAt(index, p.color);
      }
    }
    this.shards.count = counts.shard;
    this.sparks.count = counts.spark;
    this.smoke.count = counts.smoke;
    for (const mesh of [this.shards, this.sparks, this.smoke]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
    this.smokeAlpha.needsUpdate = true;
  }

  private pose(p: Fleck, index: number) {
    this.transform.position.copy(p.position);
    this.transform.quaternion.copy(p.rotation);
    const fade = Math.min(1, (p.life - p.age) * DRAW.fadeRate);
    this.transform.scale
      .copy(p.scale)
      .multiplyScalar(p.kind === "smoke" ? 1 + p.age * DRAW.smokeGrowth : fade);
    if (p.kind === "smoke") {
      this.poseSmoke(p, index);
    }
    if (p.kind === "spark") {
      this.transform.scale.y *= DRAW.sparkStretch;
      this.transform.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        p.velocity.clone().normalize(),
      );
    }
  }

  private poseSmoke(p: Fleck, index: number) {
    this.transform.rotation.set(0, 0, p.phase + p.age * DRAW.smokeSpin);
    this.transform.scale.z = 1;
    this.smokeAlpha.setX(
      index,
      Math.sin(Math.min(1, p.age / DRAW.smokeFadeIn) * Math.PI * HALF) *
        Math.min(DRAW.smokeAlpha, (p.life - p.age) * DRAW.smokeFadeOut),
    );
  }

  dispose() {
    for (const mesh of [this.shards, this.sparks, this.smoke]) {
      disposeObject(mesh);
    }
  }
}
