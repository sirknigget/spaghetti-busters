export function inspectDamageHole() {
  const {
    world: w,
    scene: runtime,
    simulation: s,
  } = (window as any).__spaghetti;
  const block = s.world.blocks[0];
  const old = w.blocks.get(block.id);
  let disposed = false;
  old.children[0].geometry.addEventListener("dispose", () => (disposed = true));
  const cell = block.cells.find(
    (c: any) => c.alive && Math.abs(c.x) < 70 && Math.abs(c.y) < 50,
  );
  cell.alive = false;
  block.hits++;
  runtime.draw();
  const group = w.blocks.get(block.id);
  // An interior dead cell must leave no front-face triangle at its center.
  const coversHole = surfaceCoversHole(group, cell);
  runtime.reset();

  return {
    removed: group.userData.removedCells,
    coversHole,
    disposed,
    staleRemoved: old.parent === null,
    cache: w.blocks.size,
    live: s.world.blocks.length,
  };
}

function surfaceCoversHole(group: any, cell: any) {
  const positions = group.children[0].geometry.attributes.position;
  const frontCount = group.children[0].geometry.groups[0].count;
  let coversHole = false;
  for (let i = 0; i < frontCount; i += 3) {
    const ax = positions.getX(i);
    const ay = positions.getY(i);
    const bx = positions.getX(i + 1);
    const by = positions.getY(i + 1);
    const cx = positions.getX(i + 2);
    const cy = positions.getY(i + 2);
    const area = cross([bx - ax, by - ay], [cx - ax, cy - ay]);
    if (Math.abs(area) < 0.00001) {
      continue;
    }
    const u = cross([cell.x - ax, -cell.y - ay], [cx - ax, cy - ay]) / area;
    const v = cross([bx - ax, by - ay], [cell.x - ax, -cell.y - ay]) / area;
    if (u >= 0 && v >= 0 && u + v <= 1) {
      coversHole = true;
    }
  }

  return coversHole;
}

export function inspectInitialWebGL() {
  const {
    world: w,
    scene: runtime,
    simulation: s,
  } = (window as any).__spaghetti;
  runtime.setPaused(true);
  const block = s.world.blocks[0];
  runtime.draw();
  const mesh = w.blocks.get(block.id);
  const geometry = mesh.children[0].geometry;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const rotation = mesh.rotation.toArray().slice(0, 3);
  block.age += 1;
  runtime.draw();

  return {
    webgl: w.renderer.isWebGLRenderer,
    perspective: w.camera.isPerspectiveCamera,
    depth: box.max.z - box.min.z,
    shadows: w.renderer.shadowMap.enabled,
    specialist: !!w.scene.getObjectByName("sculpted-code-quality-specialist"),
    cannon: !!w.scene.getObjectByName("volumetric-refactor-cannon"),
    environment: !!w.scene.getObjectByName("sculpted-mint-city"),
    rotatesX: mesh.rotation.x !== rotation[0],
    rotatesY: mesh.rotation.y !== rotation[1],
    triangles: w.renderer.info.render.triangles,
  };
}

function cross(a: readonly [number, number], b: readonly [number, number]) {
  return a[0] * b[1] - a[1] * b[0];
}
