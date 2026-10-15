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
  context.fillStyle = block.boss ? '#2f202a' : block.angry ? '#421b2a' : block.exception ? '#382335' : '#122d40'; context.fillRect(-w / 2, -top, w, h + 26);
  context.fillStyle = block.boss ? '#8b3329' : block.angry ? '#a23646' : block.exception ? '#73506a' : '#35556b'; context.fillRect(-w / 2, -top, w, 26);
  context.fillStyle = block.boss ? '#ffae59' : block.angry ? '#ff9e8c' : '#8ebebf'; context.fillRect(-w / 2, -top, w, 1.5);
  context.font = block.boss ? `bold ${w<260?13:20}px monospace` : '9px monospace'; context.textBaseline = 'middle';
  const title=block.boss?(w<260?'F³ // FRAGMENT':'FactoryFactoryFactory'):block.title;
  context.fillStyle = block.boss ? '#fff0be' : '#e4efe1'; context.fillText(title, -w / 2 + 34, -h / 2 - 13, Math.max(15,w - (block.boss?86:block.angry?110:66)));
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
  const side = new THREE.MeshToonMaterial({ color: block.boss?'#bd492e':block.angry?'#e95860':block.exception?'#9d6387':'#547e92', emissive:block.boss?'#7c2314':block.angry?'#6a0f22':'#000000',emissiveIntensity:.3 });
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
  const z=block.boss?32:14+Math.min(8,block.generation*2);
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
  if(block.boss) createBossArmor(group,w,h,z);
  if(block.angry) {
    const face=new THREE.Group();face.name='angry-code-face';face.position.set(w/2-29,h/2+13,z+3);group.add(face);
    const eyeMaterial=new THREE.MeshBasicMaterial({color:'#fff4ba'}),browMaterial=new THREE.MeshToonMaterial({color:'#44122a'});
    for(const side of [-1,1]) {
      const eye=new THREE.Mesh(new THREE.SphereGeometry(3.5,10,8),eyeMaterial);eye.scale.set(1,.8,.5);eye.position.set(side*9,-1,0);face.add(eye);
      const brow=new THREE.Mesh(new THREE.BoxGeometry(13,3.5,3),browMaterial);brow.position.set(side*9,5,1);brow.rotation.z=side*.35;face.add(brow);
    }
  }
  const ice=new THREE.Group();ice.name='frozen-code-outline';ice.visible=false;
  const outlineGeometry=new THREE.BoxGeometry(w+5,h+31,z*2+5);
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(outlineGeometry),new THREE.LineBasicMaterial({color:'#9eeaff',transparent:true,opacity:.8}));outlineGeometry.dispose();outline.position.y=13;ice.add(outline);
  const crystalMaterial=new THREE.MeshToonMaterial({color:'#b6eeff',emissive:'#2885ac',emissiveIntensity:.35,transparent:true,opacity:.85});
  for(const x of [-w/2,w/2])for(const y of [-h/2,h/2+26]){const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(7),crystalMaterial);crystal.position.set(x,y,z+3);crystal.scale.set(.7,1.4,.8);ice.add(crystal);}
  group.add(ice);
  group.userData.hits=block.hits;group.userData.cellCount=block.cells.length;
  group.userData.solidDepth=z*2;group.userData.removedCells=dead.length;
  group.userData.angry=block.angry;group.userData.exception=block.exception;
  group.userData.boss=block.boss;group.userData.bossTitle=block.boss?'FactoryFactoryFactory':undefined;
  return group;
}

/** A thick industrial housing stays outside the readable code, inside the collider's XY bounds. */
function createBossArmor(group:THREE.Group,w:number,h:number,z:number) {
  const armor=new THREE.Group();armor.name='factory-boss-reinforced-frame';group.add(armor);
  const orange=new THREE.MeshStandardMaterial({color:'#e85b2b',metalness:.62,roughness:.35});
  const dark=new THREE.MeshStandardMaterial({color:'#542c30',metalness:.7,roughness:.4});
  const gold=new THREE.MeshStandardMaterial({color:'#ffc26a',metalness:.65,roughness:.27});
  const add=(x:number,y:number,sx:number,sy:number,material:THREE.Material,depth=z*2+5)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,depth),material);mesh.position.set(x,y,0);mesh.castShadow=true;mesh.receiveShadow=true;armor.add(mesh);return mesh;};
  const rail=Math.min(8,w*.045,h*.07);
  add(-w/2+rail/2,13,rail,h+26,orange);add(w/2-rail/2,13,rail,h+26,orange);
  add(0,-h/2+rail/2,w,rail,orange);add(0,h/2+26-rail/2,w,rail,orange);
  const plate=Math.min(22,w*.1,h*.16);
  const boltGeometry=new THREE.CylinderGeometry(2.8,2.8,3,6);
  for(const x of [-w/2+plate/2,w/2-plate/2])for(const y of [-h/2+plate/2,h/2+26-plate/2]){
    add(x,y,plate,plate,dark,z*2+8);
    const bolt=new THREE.Mesh(boltGeometry,gold);bolt.rotation.x=Math.PI/2;bolt.position.set(x,y,z+6);bolt.castShadow=true;armor.add(bolt);
  }
  for(let y=-h/2+35;y<h/2-10;y+=38){
    for(const x of [-w/2+rail/2,w/2-rail/2]){const stripe=add(x,y,rail,8,gold,3);stripe.position.z=z+4;}
  }
  if(w>100){
    const reactor=new THREE.Group();reactor.name='factory-boss-reactor';reactor.position.set(w/2-32,h/2+13,z+7);armor.add(reactor);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(7.5,2.1,6,16),gold);ring.castShadow=true;reactor.add(ring);
    const coreMaterial=new THREE.MeshStandardMaterial({color:'#ffd48b',emissive:'#ff6d21',emissiveIntensity:.8,metalness:.3,roughness:.2});
    const core=new THREE.Mesh(new THREE.OctahedronGeometry(4.6),coreMaterial);core.name='factory-boss-core';core.rotation.x=.5;reactor.add(core);
    for(let i=0;i<3;i++){const fin=new THREE.Mesh(new THREE.BoxGeometry(2.2,5,3),gold);const a=i*Math.PI*2/3;fin.position.set(Math.cos(a)*8,Math.sin(a)*8,2);fin.rotation.z=a-Math.PI/2;reactor.add(fin);}
  }
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
