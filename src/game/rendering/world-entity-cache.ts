import { disposeObjectMap } from "#root/src/game/rendering/graphics-resources.ts";
import * as THREE from "three";
import { disposeObject } from "#root/src/game/code/code-mesh.ts";
import { HEIGHT } from "#root/src/game/rendering/world-settings.ts";

interface Entity {
  id: number;
  x: number;
  y: number;
}
interface EntityPresentation<T> {
  create: (entity: T) => THREE.Group;
  update: (mesh: THREE.Group, entity: T) => void;
}

export class EntityCache<T extends Entity> {
  readonly meshes = new Map<number, THREE.Group>();

  constructor(private readonly scene: THREE.Scene) {}

  sync(entities: T[], presentation: EntityPresentation<T>) {
    const alive = new Set(entities.map((e) => e.id));

    for (const [id, mesh] of this.meshes) {
      if (!alive.has(id)) {
        disposeObject(mesh);
        this.meshes.delete(id);
      }
    }

    for (const entity of entities) {
      let mesh = this.meshes.get(entity.id);

      if (!mesh) {
        mesh = presentation.create(entity);
        this.meshes.set(entity.id, mesh);
        this.scene.add(mesh);
      }

      mesh.position.set(entity.x, HEIGHT - entity.y, 0);
      presentation.update(mesh, entity);
    }
  }

  reset() {
    disposeObjectMap(this.meshes);
  }
}
