import * as THREE from 'three';
import { Simulation, type Particle, type TimeoutHazard } from './simulation';
import { createCodeMesh, disposeObject } from './code-mesh';
import { createEnvironment, createSpecialist, createCannon, createBullet, createSpecial, createPickup } from './models3d';

const WIDTH=1280, HEIGHT=720;
type Entity={id:number;x:number;y:number};
export class WorldRenderer {
  readonly renderer:THREE.WebGLRenderer;
  readonly scene=new THREE.Scene();
  readonly camera=new THREE.PerspectiveCamera(2*Math.atan(360/1400)*180/Math.PI,16/9,1,4000);
  readonly blocks=new Map<number,THREE.Group>();
  private readonly specialist=createSpecialist();
  private readonly cannon=createCannon();
  private readonly bulletMeshes=new Map<number,THREE.Group>();
  private readonly pickupMeshes=new Map<number,THREE.Group>();
  private readonly specialMeshes=new Map<number,THREE.Group>();
  private readonly hazardMeshes=new Map<number,THREE.Group>();
  private readonly particleMeshes=new Map<Particle,THREE.Mesh>();
  private readonly letterTextures=new Map<string,THREE.CanvasTexture>();
  private readonly explosionMeshes:THREE.Mesh[]=[];
  private readonly muzzleLight=new THREE.PointLight('#ffdc85',0,450,2);
  private readonly explosionLight=new THREE.PointLight('#ffc777',0,700,2);
  private readonly reticle=new THREE.Group();
  private readonly stun=new THREE.Group();
  private readonly stunLabel:THREE.Sprite;
  private readonly dangerMaterial=new THREE.MeshBasicMaterial({color:'#8faf76'});
  private readonly reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly resizeObserver:ResizeObserver;

  constructor(private readonly parent:HTMLElement) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display='block';
    this.renderer.domElement.style.touchAction='none';
    this.renderer.domElement.setAttribute('aria-label','3D arcade playfield. Move to aim, left click or Space to shoot. Right click launches special weapons. Press 1 for homing missiles or 2 for recycle grenades.');
    this.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();this.renderer.domElement.dispatchEvent(new Event('game-context-lost'));});
    parent.appendChild(this.renderer.domElement);
    this.scene.background=new THREE.Color('#b8d3c2');
    this.scene.fog=new THREE.Fog('#c2d9c8',1750,3300);
    this.camera.position.set(640,360,1400);this.camera.lookAt(640,360,0);
    this.scene.add(new THREE.HemisphereLight('#e4f7ff','#586d55',2.4));
    const sunlight=new THREE.DirectionalLight('#fff0c1',3.1);
    sunlight.position.set(150,1000,750);sunlight.target.position.set(680,300,-80);
    sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);
    sunlight.shadow.camera.left=-1000;sunlight.shadow.camera.right=1000;
    sunlight.shadow.camera.top=750;sunlight.shadow.camera.bottom=-750;
    sunlight.shadow.camera.near=10;sunlight.shadow.camera.far=2500;
    sunlight.shadow.normalBias=.8;sunlight.shadow.bias=-.0002;
    this.scene.add(sunlight,sunlight.target);
    const rim=new THREE.DirectionalLight('#93cfff',1.15);rim.position.set(1400,400,300);this.scene.add(rim);
    this.scene.add(createEnvironment(),this.specialist,this.cannon,this.muzzleLight,this.explosionLight);
    this.muzzleLight.position.set(175,360,90);
    for(let y=114;y<612;y+=15){const marker=new THREE.Mesh(new THREE.BoxGeometry(3,7,4),this.dangerMaterial);marker.position.set(23,720-y,0);this.scene.add(marker);}
    const reticleMaterial=new THREE.MeshBasicMaterial({color:'#275749',depthTest:false});
    const ring=new THREE.Mesh(new THREE.RingGeometry(11.6,13,40),reticleMaterial);this.reticle.add(ring);
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const tick=new THREE.Mesh(new THREE.BoxGeometry(6,1.6,1),reticleMaterial);
      tick.position.set(Math.cos(angle)*19,Math.sin(angle)*19,0);tick.rotation.z=angle;this.reticle.add(tick);
    }
    const dot=new THREE.Mesh(new THREE.CircleGeometry(2.4,16),new THREE.MeshBasicMaterial({color:'#ffd35c',depthTest:false}));this.reticle.add(dot);
    this.reticle.renderOrder=100;this.reticle.traverse(child=>child.renderOrder=100);this.scene.add(this.reticle);
    for(let i=0;i<3;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(71+i*5,1.5,6,64),new THREE.MeshBasicMaterial({color:i%2?'#ffaef5':'#bc65f4',transparent:true,opacity:.8}));
      ring.rotation.set(i*.7,.45+i*.5,0);this.stun.add(ring);
    }
    const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=64;
    const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
    this.stunLabel=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture,depthTest:false}));this.stunLabel.scale.set(128,32,1);this.stunLabel.position.set(0,130,0);this.stun.add(this.stunLabel);
    this.scene.add(this.stun);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(parent);this.resize();
  }

  resize() {
    const available=this.parent.getBoundingClientRect();
    const width=Math.max(1,Math.min(available.width||WIDTH,(available.height||HEIGHT)*16/9));
    this.renderer.setSize(width,width*9/16);
    this.renderer.domElement.style.margin='auto';
  }

  private sync<T extends Entity>(entities:T[],cache:Map<number,THREE.Group>,create:(entity:T)=>THREE.Group,update:(mesh:THREE.Group,entity:T)=>void) {
    const alive=new Set(entities.map(e=>e.id));
    for(const [id,mesh] of cache)if(!alive.has(id)){disposeObject(mesh);cache.delete(id);}
    for(const entity of entities){let mesh=cache.get(entity.id);if(!mesh){mesh=create(entity);cache.set(entity.id,mesh);this.scene.add(mesh);}mesh.position.set(entity.x,720-entity.y,0);update(mesh,entity);}
  }

  private hazard(hazard:TimeoutHazard) {
    const text=`await setTimeout(${hazard.durationMs});`,width=text.length*9+28;
    const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=80;
    const c=canvas.getContext('2d')!;c.scale(2,2);c.fillStyle='#692e3a';c.fillRect(0,0,width,40);
    c.strokeStyle='#ffbe7c';c.lineWidth=2;c.strokeRect(1,1,width-2,38);
    c.font='bold 15px monospace';c.textBaseline='middle';let x=14;
    for(const [word,color] of [['await ','#dcadff'],['setTimeout','#fff0c2'],['(','#ffc2a8'],[String(hazard.durationMs),'#ffb778'],[');','#ffc2a8']]){c.fillStyle=color;c.fillText(word!,x,20);x+=word!.length*9;}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.MeshToonMaterial({map:texture});const side=new THREE.MeshToonMaterial({color:'#df7456'});
    const group=new THREE.Group();group.name='timeout-solid';
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,40,26),[side,side,side,side,face,side]);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    const trail=new THREE.Mesh(new THREE.ConeGeometry(12,100,5),new THREE.MeshBasicMaterial({color:'#ff9975',transparent:true,opacity:.32}));trail.rotation.z=-Math.PI/2;trail.position.set(width/2+50,0,-3);group.add(trail);return group;
  }

  private particle(particle:Particle) {
    if(particle.char){
      const key=`${particle.char}:${particle.color}`;let texture=this.letterTextures.get(key);
      if(!texture){const canvas=document.createElement('canvas');canvas.width=32;canvas.height=40;const c=canvas.getContext('2d')!;c.font='bold 27px monospace';c.fillStyle=particle.color;c.textAlign='center';c.textBaseline='middle';c.fillText(particle.char,16,20);texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;this.letterTextures.set(key,texture);}
      return new THREE.Mesh(new THREE.PlaneGeometry(12,15),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
    }
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(4,4,4),new THREE.MeshToonMaterial({color:particle.color,transparent:true}));mesh.castShadow=true;return mesh;
  }

  render(sim:Simulation,muzzle:number,impact:number) {
    const t=sim.elapsed;
    const alive=new Set(sim.blocks.map(b=>b.id));
    for(const [id,mesh] of this.blocks)if(!alive.has(id)){disposeObject(mesh);this.blocks.delete(id);}
    for(const block of sim.blocks){
      let mesh=this.blocks.get(block.id);
      if(mesh&&(mesh.userData.hits!==block.hits||mesh.userData.cellCount!==block.cells.length)){disposeObject(mesh);this.blocks.delete(block.id);mesh=undefined;}
      if(!mesh){mesh=createCodeMesh(block);this.blocks.set(block.id,mesh);this.scene.add(mesh);}
      const tumble=block.generation>0 ? .45 : .18;
      const phase=block.id*.81+block.age*(block.generation>0?1.65:.65);
      mesh.position.set(block.x,720-block.y,0);
      mesh.rotation.set(Math.sin(phase)*tumble,Math.cos(phase*.83)*tumble,-block.angle,'ZYX');
    }
    this.sync(sim.bullets,this.bulletMeshes,()=>createBullet(),(mesh,b)=>{mesh.rotation.z=-Math.atan2(b.vy,b.vx);});
    this.sync(sim.pickups,this.pickupMeshes,p=>createPickup(p.type),(mesh,p)=>{mesh.rotation.set(Math.sin(p.age*2)*.28,Math.sin(p.age*2.6)*.5,Math.sin(p.age*3)*.13);});
    this.sync(sim.specials,this.specialMeshes,p=>createSpecial(p.type),(mesh,p)=>{mesh.rotation.set(p.type==='grenade'?t*4:.12,p.type==='grenade'?t*3:.24,-p.angle);});
    this.sync(sim.hazards,this.hazardMeshes,h=>this.hazard(h),(mesh,h)=>{mesh.rotation.set(Math.sin(h.age*8)*.12,Math.sin(h.age*6)*.16,Math.atan2(h.vy,-h.vx)*.12);});
    const particles=sim.particles.slice(-220);const livingParticles=new Set(particles);
    for(const [particle,mesh] of this.particleMeshes)if(!livingParticles.has(particle)){
      mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();mesh.removeFromParent();this.particleMeshes.delete(particle);
    }
    for(const particle of particles){let mesh=this.particleMeshes.get(particle);if(!mesh){mesh=this.particle(particle);this.particleMeshes.set(particle,mesh);this.scene.add(mesh);}
      const age=particle.maxLife-particle.life;mesh.position.set(particle.x,720-particle.y,Math.sin(age*3)*35+20);
      mesh.rotation.set(age*3,age*4,particle.angle);(mesh.material as THREE.MeshBasicMaterial).opacity=Math.min(1,particle.life/particle.maxLife*2);
    }
    while(this.explosionMeshes.length<sim.explosions.length){const mesh=new THREE.Mesh(new THREE.TorusGeometry(1,.025,5,64),new THREE.MeshBasicMaterial({color:'#ffe8a4',transparent:true,depthWrite:false}));this.explosionMeshes.push(mesh);this.scene.add(mesh);}
    this.explosionMeshes.forEach((mesh,i)=>{const explosion=sim.explosions[i];mesh.visible=!!explosion;if(!explosion)return;const progress=1-explosion.life/explosion.maxLife,radius=explosion.radius*(.35+progress*.65);mesh.position.set(explosion.x,720-explosion.y,25);mesh.rotation.set(progress*.3,progress*.5,0);mesh.scale.setScalar(radius);(mesh.material as THREE.MeshBasicMaterial).opacity=1-progress;});
    const angle=-Math.atan2(sim.aimY-sim.playerY,Math.max(80,sim.aimX-158));
    this.specialist.position.set(82,720-sim.playerY,0);
    this.specialist.rotation.y=Math.sin(t*1.5)*.08;
    this.cannon.position.set(103-(muzzle>0?4:0),720-sim.playerY,24);this.cannon.rotation.set(0,-.1,angle);
    this.muzzleLight.position.set(103+Math.cos(angle)*88,720-sim.playerY+Math.sin(angle)*88,70);this.muzzleLight.intensity=muzzle>0?95000:0;
    const flash=this.cannon.getObjectByName('muzzle-flash');if(flash)flash.visible=muzzle>0;
    const blast=sim.explosions[0];this.explosionLight.intensity=blast?120000*blast.life/blast.maxLife:impact>2?18000:0;
    if(blast)this.explosionLight.position.set(blast.x,720-blast.y,90);
    this.reticle.position.set(sim.aimX,720-sim.aimY,0);
    this.stun.visible=sim.isStunned;this.stun.position.set(86,720-sim.playerY,45);
    if(sim.isStunned){for(let i=0;i<3;i++)this.stun.children[i]!.rotation.z=t*(i%2?-2:2);const canvas=(this.stunLabel.material.map!.image as HTMLCanvasElement),c=canvas.getContext('2d')!;c.clearRect(0,0,256,64);c.fillStyle='#56286e';c.fillRect(0,0,256,64);c.fillStyle='#ffe0ff';c.font='bold 25px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(`AWAIT ${sim.stunRemaining.toFixed(1)}s`,128,32);this.stunLabel.material.map!.needsUpdate=true;}
    this.dangerMaterial.color.set(sim.blocks.some(b=>b.x<240)?'#de6a47':'#8faf76');
    const shake=this.reducedMotion?0:Math.min(impact,3)*.35;
    this.camera.position.set(640+Math.sin(t*145)*shake,360+Math.cos(t*133)*shake,1400);
    this.renderer.render(this.scene,this.camera);
  }

  reset() {
    for(const cache of [this.blocks,this.bulletMeshes,this.pickupMeshes,this.specialMeshes,this.hazardMeshes]){cache.forEach(disposeObject);cache.clear();}
    this.particleMeshes.forEach(mesh=>{mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();mesh.removeFromParent();});this.particleMeshes.clear();
    this.explosionMeshes.forEach(mesh=>mesh.visible=false);this.muzzleLight.intensity=this.explosionLight.intensity=0;
  }

  dispose() {
    this.resizeObserver.disconnect();this.reset();this.letterTextures.forEach(texture=>texture.dispose());this.letterTextures.clear();
    disposeObject(this.scene);this.renderer.dispose();this.renderer.domElement.remove();
  }
}
