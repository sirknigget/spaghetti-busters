import * as THREE from 'three';
import type { Block } from './simulation';
import { chippedHole, fractureMask, perforatedGeometry, type Polygon } from './fracture-geometry';

interface FractureVisual {
  canvas:HTMLCanvasElement; width:number; height:number; depth:number;
  offset:{x:number;y:number}; regions:Polygon[]; holes:Map<string,Polygon>; scars:Set<string>; fractured:boolean;
}

/** A child uses the parent's surface and the complementary side of one seeded broken cut. */
export function createFragmentMesh(block:Block,parent:THREE.Group,parentBlock:Block):THREE.Group {
  const inherited=parent.userData.fractureVisual as FractureVisual|undefined;
  if(!inherited||!block.fracture)return createCodeMesh(block);
  const f=block.fracture,axis=f.axis;
  const bounds={left:-inherited.width/2-1,right:inherited.width/2+1,bottom:-inherited.height/2-1,top:inherited.height/2+27};
  const cut=axis==='x'?inherited.offset.x+f.cut:inherited.offset.y-f.cut;
  const region=fractureMask(axis,cut,axis==='x'?f.side:-f.side,f.seed,bounds);
  const parentVisual:FractureVisual={...inherited,holes:new Map(inherited.holes)};
  addRemovedCells(parentVisual,parentBlock);
  const visual:FractureVisual={...parentVisual,offset:{x:inherited.offset.x+f.offsetX,y:inherited.offset.y-f.offsetY},regions:[...inherited.regions,region],holes:new Map(parentVisual.holes),fractured:true};
  return createCodeMesh(block,undefined,visual);
}


function addDamageScars(visual:FractureVisual,block:Block) {
  const context=visual.canvas.getContext('2d')!;
  context.save();
  const scale=visual.canvas.width/visual.width;
  context.setTransform(scale,0,0,scale,visual.width*scale/2,(visual.height/2+26)*scale);
  for(const cell of block.cells)if(cell.alive&&cell.health<cell.maxHealth){
    const x=cell.x+visual.offset.x,y=cell.y-visual.offset.y,key=`${x}:${y}:${cell.health}`;
    if(visual.scars.has(key))continue;visual.scars.add(key);
    // Cracks accumulate in the original sheet's coordinates, including on surviving armor.
    context.lineWidth=.75;context.strokeStyle='#ffb471';context.beginPath();
    context.moveTo(x-4,y-8);context.lineTo(x+2,y-3);context.lineTo(x-2,y+1);context.lineTo(x+3,y+7);
    context.moveTo(x-2,y+1);context.lineTo(x-7,y+3);context.stroke();
    context.lineWidth=.5;context.strokeStyle='#050c13';context.beginPath();context.moveTo(x-3,y-7);context.lineTo(x+3,y-3);context.lineTo(x-1,y+1);context.lineTo(x+4,y+7);context.stroke();
  }
  context.restore();
}

function addRemovedCells(visual:FractureVisual,block:Block) {
  for(const cell of block.cells)if(!cell.alive){
    const x=cell.x+visual.offset.x,y=-cell.y+visual.offset.y,key=`${x.toFixed(3)}:${y.toFixed(3)}`;
    if(!visual.holes.has(key))visual.holes.set(key,chippedHole(x,y,Math.round(x*7919+y*193+visual.width)));
  }
}

/** A real, perforated solid: removed code cells remove both faces and expose the cut edges. */
export function createCodeMesh(block: Block,previous?:THREE.Group,inherited?:FractureVisual): THREE.Group {
  const group = new THREE.Group();
  group.name = `code-solid-${block.id}`;
  const w = block.width, h = block.height, top = h / 2 + 26, bottom = -h / 2;
  const prior=inherited??previous?.userData.fractureVisual as FractureVisual|undefined;
  const canvas = prior?.canvas??document.createElement('canvas');
  const scale = 2;
  if(!prior){
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

  }
  }
  const visual:FractureVisual=prior?{...prior,holes:new Map(prior.holes)}:{canvas,width:w,height:h,depth:block.boss?32:14+Math.min(8,block.generation*2),offset:{x:0,y:0},regions:[[{x:-w/2,y:bottom},{x:w/2,y:bottom},{x:w/2,y:top},{x:-w/2,y:top}]],holes:new Map(),scars:new Set(),fractured:false};
  addRemovedCells(visual,block);
  addDamageScars(visual,block);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const front = new THREE.MeshToonMaterial({ map: texture, color: '#ffffff' });
  const side = new THREE.MeshToonMaterial({ color: block.boss?'#bd492e':block.angry?'#e95860':block.exception?'#9d6387':'#547e92', emissive:block.boss?'#7c2314':block.angry?'#6a0f22':'#000000',emissiveIntensity:.3 });
  const z=visual.depth;
  const dead=block.cells.filter(cell=>!cell.alive);
  const geometry=perforatedGeometry(visual.regions,[...visual.holes.values()],z,visual.offset,{width:visual.width,height:visual.height});
  const mesh = new THREE.Mesh(geometry,[front,side]); mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.name='perforated-extruded-code';group.add(mesh);
  if(block.boss) {
    createBossArmor(group,visual.width,visual.height,z);
    if(visual.fractured) clipBossArmor(group,visual,z);
  }
  if(block.angry&&!visual.fractured) {
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
  group.userData.fractureVisual=visual;
  group.userData.fractured=visual.fractured;
  group.userData.hits=block.hits;group.userData.cellCount=block.cells.length;
  group.userData.solidDepth=z*2;group.userData.removedCells=dead.length;
  group.userData.angry=block.angry;group.userData.exception=block.exception;
  group.userData.boss=block.boss;group.userData.bossTitle=block.boss?'FactoryFactoryFactory':undefined;
  return group;
}


function insideRegions(point:{x:number;y:number},regions:Polygon[]) {
  return regions.every(polygon=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i]!,b=polygon[j]!;if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }return inside;});
}

/** Cut the original housing at the same physical seam as the code, retaining its old bolts/core. */
function clipBossArmor(group:THREE.Group,visual:FractureVisual,z:number) {
  const armor=group.getObjectByName('factory-boss-reinforced-frame')!;
  const removed:THREE.Object3D[]=[];
  for(const child of [...armor.children]){
    const mesh=child as THREE.Mesh;
    if(mesh.geometry instanceof THREE.BoxGeometry){
      const {width,height,depth}=mesh.geometry.parameters,x=mesh.position.x,y=mesh.position.y;
      const rectangle=[{x:x-width/2,y:y-height/2},{x:x+width/2,y:y-height/2},{x:x+width/2,y:y+height/2},{x:x-width/2,y:y+height/2}];
      mesh.geometry.dispose();mesh.geometry=perforatedGeometry([...visual.regions,rectangle],[],depth/2,visual.offset,{width:visual.width,height:visual.height});
      mesh.position.x=mesh.position.y=0;
    }else if(insideRegions(child.position,visual.regions)){
      child.position.x-=visual.offset.x;child.position.y-=visual.offset.y;
    }else {
      // Geometry/materials may be shared by other retained bolts; dispose centrally once.
      child.removeFromParent();removed.push(child);
    }
  }
  const liveGeometries=new Set<THREE.BufferGeometry>(),liveMaterials=new Set<THREE.Material>();
  armor.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)liveGeometries.add(mesh.geometry);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material)liveMaterials.add(material);});
  const deadGeometries=new Set<THREE.BufferGeometry>(),deadMaterials=new Set<THREE.Material>();
  removed.forEach(object=>object.traverse(child=>{const mesh=child as THREE.Mesh;if(mesh.geometry&&!liveGeometries.has(mesh.geometry))deadGeometries.add(mesh.geometry);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material&&!liveMaterials.has(material))deadMaterials.add(material);}));
  deadGeometries.forEach(geometry=>geometry.dispose());deadMaterials.forEach(material=>material.dispose());
  armor.userData.originalDepth=z*2;
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
