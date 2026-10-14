import * as THREE from 'three';
import type { Block } from './simulation';

/** A real, perforated solid: removed code cells remove both faces and expose the cut edges. */
export function createCodeMesh(block: Block): THREE.Group {
  const group = new THREE.Group();
  group.name = `code-solid-${block.id}`;
  const w = block.width, h = block.height, top = h / 2 + 26, bottom = -h / 2;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = Math.ceil(w * scale); canvas.height = Math.ceil((h + 26) * scale);
  const context = canvas.getContext('2d')!;
  context.scale(scale, scale); context.translate(w / 2, top);
  context.fillStyle = '#122d40'; context.fillRect(-w / 2, -top, w, h + 26);
  context.fillStyle = '#35556b'; context.fillRect(-w / 2, -top, w, 26);
  context.fillStyle = '#8ebebf'; context.fillRect(-w / 2, -top, w, 1.5);
  context.font = '9px monospace'; context.textBaseline = 'middle';
  context.fillStyle = '#e4efe1'; context.fillText(block.title, -w / 2 + 34, -h / 2 - 13, Math.max(15,w - 66));
  ['#ff8b69', '#ffd96a', '#aee5a3'].forEach((color, i) => {
    context.fillStyle = color; context.beginPath(); context.arc(-w/2+10+i*9,-h/2-13,2.4,0,Math.PI*2); context.fill();
  });
  context.font = '14px monospace'; context.textAlign = 'center';
  for (const cell of block.cells) {
    if (!cell.alive) continue;
    if (cell.magic) { context.fillStyle = '#ffe75b2b'; context.fillRect(cell.x-4.5,cell.y-9,9,18); }
    context.fillStyle = cell.color; context.fillText(cell.char, cell.x, cell.y);
    if (cell.health < cell.maxHealth) {
      context.strokeStyle = '#ffbc79'; context.lineWidth = .7; context.beginPath();
      context.moveTo(cell.x-3,cell.y-8);context.lineTo(cell.x+2,cell.y);context.lineTo(cell.x-2,cell.y+7);context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const front = new THREE.MeshToonMaterial({ map: texture, color: '#ffffff' });
  const side = new THREE.MeshToonMaterial({ color: '#547e92' });
  const rects: [number, number, number, number][] = [];
  const dead = block.cells.filter(cell => !cell.alive);
  // Sweep horizontal bands around holes, avoiding overlapping Shape holes and keeping two draw calls per slab.
  const cuts = [...new Set([bottom, top,...dead.flatMap(c => [Math.max(bottom,-c.y-10), Math.min(top,-c.y+10)])])].sort((a,b)=>a-b);
  for(let row=0;row<cuts.length-1;row++) {
    const y0=cuts[row]!, y1=cuts[row+1]!;
    if(y1-y0<.01)continue;
    const middle=(y0+y1)/2;
    const holes=dead.filter(c=>Math.abs(middle+c.y)<10).map(c=>[Math.max(-w/2,c.x-5),Math.min(w/2,c.x+5)]).sort((a,b)=>a[0]!-b[0]!);
    let x=-w/2;
    for(const hole of holes) {if(hole[0]!>x)rects.push([x,y0,hole[0]!,y1]);x=Math.max(x,hole[1]!);}
    if(x<w/2)rects.push([x,y0,w/2,y1]);
  }
  const positions:number[]=[], normals:number[]=[], uvs:number[]=[];
  const face=(points:number[][],normal:number[])=>{
    for(const index of [0,1,2,0,2,3]) {const p=points[index]!;positions.push(...p);normals.push(...normal);uvs.push((p[0]!+w/2)/w,(p[1]!-bottom)/(h+26));}
  };
  const z=14+Math.min(8,block.generation*2);
  for(const [x0,y0,x1,y1] of rects) face([[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],[0,0,1]);
  const frontCount=positions.length/3;
  for(const [x0,y0,x1,y1] of rects) {
    face([[x1,y0,-z],[x0,y0,-z],[x0,y1,-z],[x1,y1,-z]],[0,0,-1]);
    face([[x0,y0,-z],[x1,y0,-z],[x1,y0,z],[x0,y0,z]],[0,-1,0]);
    face([[x0,y1,z],[x1,y1,z],[x1,y1,-z],[x0,y1,-z]],[0,1,0]);
    face([[x0,y0,-z],[x0,y0,z],[x0,y1,z],[x0,y1,-z]],[-1,0,0]);
    face([[x1,y0,z],[x1,y0,-z],[x1,y1,-z],[x1,y1,z]],[1,0,0]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.addGroup(0,frontCount,0);geometry.addGroup(frontCount,positions.length/3-frontCount,1);
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry,[front,side]); mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.name='perforated-extruded-code';group.add(mesh);
  group.userData.hits=block.hits;group.userData.cellCount=block.cells.length;
  group.userData.solidDepth=z*2;group.userData.removedCells=dead.length;
  return group;
}

export function disposeObject(object: THREE.Object3D) {
  const geometries=new Set<THREE.BufferGeometry>(), materials=new Set<THREE.Material>(), textures=new Set<THREE.Texture>();
  object.traverse(child=>{
    const mesh=child as THREE.Mesh;
    if(mesh.geometry)geometries.add(mesh.geometry);
    const list=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    for(const material of list)if(material){materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);}
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  object.removeFromParent();
}
