import Phaser from 'phaser';
import { Simulation, type Block } from './simulation';

export interface GameController { reset():void; setPaused(value:boolean):void; selectSpecial(type:'homing'|'grenade'):void; fireSpecial():void; }
interface Callbacks { onState:(s:Simulation)=>void; onEvent:(event:string)=>void; onGameOver:(score:number,wave:number)=>void; }
type CachedBlock = { canvas:HTMLCanvasElement; shadow:HTMLCanvasElement; hits:number; count:number };
const WIDTH=1280, HEIGHT=720;

export async function createGame(parent:string, callbacks:Callbacks):Promise<GameController> {
  const images = await Promise.all(['city','character','cannon'].map(name=>new Promise<HTMLImageElement>((resolve,reject)=>{
    const img = new Image(); img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`Could not load ${name}`));img.src=`/assets/${name}.svg`;
  })));
  const [city,character,cannon]=images;
  // Rasterize the SVG artwork and its soft lighting once, rather than rerasterizing filters every frame.
  const sprite=(source:HTMLImageElement,w:number,h:number,pad:number,color?:string,blur=0,dx=0,dy=0)=>{
    const canvas=document.createElement('canvas');canvas.width=w+pad*2;canvas.height=h+pad*2;
    const context=canvas.getContext('2d')!;context.shadowColor=color??'transparent';context.shadowBlur=blur;context.shadowOffsetX=dx;context.shadowOffsetY=dy;context.drawImage(source,pad,pad,w,h);return canvas;
  };
  const citySprite=sprite(city,WIDTH,HEIGHT,0);
  const specialistSprite=sprite(character,140,215,12,'#fff7c5',7,-3,-2);
  const cannonSprite=sprite(cannon,91,49,10,'#17332f60',4,4,5);
  const groundShadow=document.createElement('canvas');groundShadow.width=220;groundShadow.height=80;
  const shadowContext=groundShadow.getContext('2d')!;shadowContext.filter='blur(7px)';shadowContext.fillStyle='#1a42384a';shadowContext.beginPath();shadowContext.ellipse(110,40,81,8,.04,0,Math.PI*2);shadowContext.fill();
  let ready!: (controller:GameController)=>void;
  const promise=new Promise<GameController>(resolve=>{ ready=resolve; });
  class PlayScene extends Phaser.Scene {
    sim=new Simulation();
    paused=true;
    holding=false;
    holdingSpecial=false;
    muzzle=0;
    impact=0;
    lastHud=0;
    blockCache=new Map<number,CachedBlock>();
    missileTrails=new Map<number,{x:number;y:number}[]>();
    texture!:Phaser.Textures.CanvasTexture;
    ctx!:CanvasRenderingContext2D;
    keys!:Record<string,Phaser.Input.Keyboard.Key>;
    create() {
      this.texture=this.textures.createCanvas('playfield',WIDTH,HEIGHT)!;
      this.ctx=this.texture.getContext();
      this.add.image(0,0,'playfield').setOrigin(0);
      this.keys=this.input.keyboard!.addKeys('SPACE,UP,DOWN,W,S') as Record<string,Phaser.Input.Keyboard.Key>;
      const point=(p:Phaser.Input.Pointer)=>{ this.sim.aimX=Math.max(220,Math.min(WIDTH,p.x));this.sim.aimY=Math.max(130,Math.min(640,p.y)); };
      const release=()=>{this.holding=false;this.holdingSpecial=false;};
      this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{ if(!this.paused)point(p); });
      this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
        if(this.paused)return;
        point(p);
        if(p.rightButtonDown()){this.sim.fireSpecial();this.holdingSpecial=true;}
        else if(p.leftButtonDown()){this.sim.fire();this.holding=true;}
      });
      this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{this.holding=p.leftButtonDown();this.holdingSpecial=p.rightButtonDown();});
      this.input.on('pointerupoutside',release);
      this.input.keyboard!.on('keydown-ONE',()=>{if(!this.paused)this.sim.selectSpecial('homing');});
      this.input.keyboard!.on('keydown-TWO',()=>{if(!this.paused)this.sim.selectSpecial('grenade');});
      this.game.events.on(Phaser.Core.Events.BLUR,()=>{release();this.input.keyboard?.resetKeys();});
      this.game.canvas.addEventListener('contextmenu',e=>e.preventDefault());
      this.game.canvas.setAttribute('aria-label','Arcade playfield. Move to aim, left click or Space to shoot. Right click launches special weapons. Press 1 for homing backspace missiles or 2 for recycle grenades.');
      ready({selectSpecial:(type)=>{if(!this.paused){this.sim.selectSpecial(type);callbacks.onState(this.sim);}},fireSpecial:()=>{if(!this.paused)this.sim.fireSpecial();},reset:()=>{this.sim.reset();this.blockCache.clear();this.missileTrails.clear();release();this.muzzle=0;this.impact=0;callbacks.onState(this.sim);},setPaused:(value)=>{this.paused=value;release();if(value)this.input.keyboard?.resetKeys();}});
      if(import.meta.env.DEV || import.meta.env.MODE==='test') {
        (window as unknown as {__spaghetti:unknown}).__spaghetti={simulation:this.sim,scene:this};
      }
      this.draw();
    }
    update(_time:number,delta:number) {
      if(this.paused) return;
      const dt=Math.min(delta/1000,.05);
      if(this.keys.UP.isDown||this.keys.W.isDown)this.sim.aimY=Math.max(145,this.sim.aimY-dt*450);
      if(this.keys.DOWN.isDown||this.keys.S.isDown)this.sim.aimY=Math.min(630,this.sim.aimY+dt*450);
      if(this.holding||this.keys.SPACE.isDown)this.sim.fire();
      if(this.holdingSpecial)this.sim.fireSpecial();
      this.sim.update(dt);
      for(const event of this.sim.events.splice(0)) {
        if(event==='shot'||event==='missile'||event==='grenade')this.muzzle=.065;
        if(event==='hit')this.impact=3;
        if(event==='split'||event==='destroy')this.impact=5;
        if(event==='explosion')this.impact=8;
        if(event==='stun')this.impact=7;
        callbacks.onEvent(event);
      }
      this.muzzle=Math.max(0,this.muzzle-dt);
      this.impact=Math.max(0,this.impact-dt*30);
      this.lastHud+=dt;
      if(this.lastHud>.07){callbacks.onState(this.sim);this.lastHud=0;}
      if(this.sim.status==='gameover'){callbacks.onState(this.sim);callbacks.onGameOver(this.sim.score,this.sim.wave);}
      this.draw();
    }
    card(block:Block) {
      let cached=this.blockCache.get(block.id);
      if(cached&&cached.hits===block.hits&&cached.count===block.cells.length)return cached.canvas;
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(block.width+26);canvas.height=Math.ceil(block.height+65);
      const c=canvas.getContext('2d')!;c.translate(canvas.width/2,canvas.height/2+12);
      const w=block.width,h=block.height;
      const surface=c.createLinearGradient(-w/2,-h/2,w/2,h/2);surface.addColorStop(0,'#365f62');surface.addColorStop(.12,'#1b3b48');surface.addColorStop(.72,'#122d3c');surface.addColorStop(1,'#0e2333');
      c.fillStyle=surface;c.strokeStyle='#061d26';c.lineWidth=3;
      c.beginPath();c.roundRect(-w/2,-h/2-25,w,h+25,7);c.fill();c.stroke();
      const header=c.createLinearGradient(0,-h/2-25,0,-h/2);header.addColorStop(0,'#537776');header.addColorStop(1,'#2d5158');
      c.fillStyle=header;c.beginPath();c.roundRect(-w/2+2,-h/2-23,w-4,24,[5,5,0,0]);c.fill();
      c.strokeStyle='#c5e9d078';c.lineWidth=1;c.beginPath();c.moveTo(-w/2+7,-h/2-23);c.lineTo(w/2-7,-h/2-23);c.moveTo(-w/2+2,-h/2-19);c.lineTo(-w/2+2,h/2-5);c.stroke();
      c.fillStyle='#ffcb69';c.beginPath();c.arc(-w/2+13,-h/2-11,3,0,Math.PI*2);c.fill();c.fillStyle='#a7d49b';c.beginPath();c.arc(-w/2+24,-h/2-11,3,0,Math.PI*2);c.fill();
      c.font='9px monospace';c.fillStyle='#d0e4d4';c.textBaseline='middle';c.textAlign='left';
      const title=block.title ?? 'legacy-service.ts';
      c.fillText(title,-w/2+36,-h/2-10,Math.max(10,w-80));
      c.textAlign='right';c.fillStyle='#9dbab7';c.fillText('TS',w/2-10,-h/2-10);
      c.textAlign='center';c.textBaseline='middle';c.font='14px monospace';
      for(const cell of block.cells) {
        if(!cell.alive)continue;
        if(cell.magic){c.fillStyle='#ffe55c26';c.fillRect(cell.x-4.5,cell.y-9,9,18);}
        c.fillStyle=cell.color;c.fillText(cell.char,cell.x,cell.y);
        if(cell.health<cell.maxHealth){c.strokeStyle='#fdbf7080';c.lineWidth=.8;c.beginPath();c.moveTo(cell.x-4,cell.y-8);c.lineTo(cell.x+1,cell.y);c.lineTo(cell.x-2,cell.y+7);c.stroke();}
      }
      // The entire plate, including its extrusion and shadow, shares this chipped alpha mask.
      c.globalCompositeOperation='destination-out';
      for(const cell of block.cells)if(!cell.alive){c.beginPath();c.arc(cell.x,cell.y,8,0,Math.PI*2);c.fill();}
      c.globalCompositeOperation='source-over';
      const plate=document.createElement('canvas');plate.width=canvas.width;plate.height=canvas.height;
      const pc=plate.getContext('2d')!;pc.filter='brightness(0.42) saturate(0.75)';pc.drawImage(canvas,9,10);pc.filter='brightness(0.65) saturate(0.75)';pc.drawImage(canvas,5,5);pc.filter='none';pc.drawImage(canvas,0,0);
      const shadow=document.createElement('canvas');shadow.width=plate.width+32;shadow.height=plate.height+32;
      const sc=shadow.getContext('2d')!;sc.filter='brightness(0) blur(8px)';sc.drawImage(plate,16,16);
      cached={canvas:plate,shadow,hits:block.hits,count:block.cells.length};this.blockCache.set(block.id,cached);return plate;
    }
    glow(x:number,y:number,radius:number,color:string,strength=1) {
      const c=this.ctx;c.save();c.globalAlpha=strength;c.globalCompositeOperation='screen';
      const g=c.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,color);g.addColorStop(.25,color+'90');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);c.restore();
    }
    draw() {
      if(!this.ctx)return;
      const c=this.ctx,s=this.sim;c.clearRect(0,0,WIDTH,HEIGHT);
      c.drawImage(citySprite,0,0);
      // Warm upper-left sunlight and cool floor perspective provide a shared lighting direction.
      const sun=c.createLinearGradient(180,0,950,720);sun.addColorStop(0,'#fff5bd42');sun.addColorStop(.6,'#d5e7dd00');sun.addColorStop(1,'#1a486f24');c.fillStyle=sun;c.fillRect(0,0,WIDTH,HEIGHT);
      c.fillStyle='#fff6c411';c.beginPath();c.moveTo(260,0);c.lineTo(330,0);c.lineTo(1060,720);c.lineTo(730,720);c.closePath();c.fill();
      c.save();
      if(this.impact>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches)c.translate(Math.sin(s.elapsed*175)*this.impact,Math.cos(s.elapsed*143)*this.impact*.5);
      const danger=s.blocks.some(b=>b.x<240);
      c.fillStyle=danger?'#d65d3820':'#254d3420';c.fillRect(0,110,22,508);
      c.setLineDash([5,8]);c.strokeStyle=danger?'#c15b3d':'#799c7a';c.lineWidth=2;c.beginPath();c.moveTo(23,115);c.lineTo(23,615);c.stroke();c.setLineDash([]);
      c.save();c.translate(14,380);c.rotate(-Math.PI/2);c.font='bold 8px monospace';c.fillStyle=danger?'#ae4938':'#6c8c6b';c.textAlign='center';c.fillText('NO SPAGHETTI BEYOND THIS LINE',0,0);c.restore();
      c.font='17px monospace';c.fillStyle='#61926d1e';
      for(let i=0;i<14;i++){const x=((i*137-s.elapsed*(8+i%3)*.6)%1400+1400)%1400;const y=145+(i*83)%410;c.fillText(['{ }','</>',';','=>'][i%4],x,y);}
      const aliveIds=new Set(s.blocks.map(b=>b.id));for(const id of this.blockCache.keys())if(!aliveIds.has(id))this.blockCache.delete(id);
      // Project each chipped silhouette onto the floor; high plates cast longer, softer shadows.
      for(const block of s.blocks){
        this.card(block);const shadow=this.blockCache.get(block.id)!.shadow,altitude=Math.max(0,650-block.y);
        c.save();c.translate(block.x+25+altitude*.11,650+Math.min(20,block.height*.04));c.scale(1,.13+Math.min(.1,block.height/1400));c.rotate(block.angle*.3);c.globalAlpha=.12+Math.max(0,1-altitude/560)*.07;c.drawImage(shadow,-shadow.width/2,-shadow.height/2);c.restore();
      }
      for(const block of s.blocks) {
        c.save();c.translate(block.x,block.y);c.rotate(block.angle);
        const card=this.card(block),cx=-card.width/2,cy=-card.height/2-12;
        c.drawImage(card,cx,cy);c.restore();
      }
      for(const p of s.pickups){
        c.save();c.translate(p.x,p.y);c.rotate(Math.sin(p.age*4)*.13);
        c.strokeStyle='#f9db48';c.lineWidth=2;c.globalAlpha=.55+.2*Math.sin(p.age*8);
        c.beginPath();c.arc(0,0,33+Math.sin(p.age*5)*3,0,Math.PI*2);c.stroke();c.globalAlpha=1;
        c.fillStyle='#967629';c.beginPath();c.roundRect(-23,-19,52,46,8);c.fill();
        const face=c.createLinearGradient(0,-23,0,23);face.addColorStop(0,'#fff5aa');face.addColorStop(1,'#ebbc37');c.fillStyle=face;c.strokeStyle='#173e35';c.lineWidth=3;c.beginPath();c.roundRect(-26,-23,52,46,8);c.fill();c.stroke();
        c.font='bold 23px monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#173e35';
        c.fillText(p.type==='triple'?'≋':p.type==='double'?'Ⅱ':p.type==='homing'?'⌫':'♻',0,-2);
        c.font='bold 8px monospace';c.fillText('SHOOT TO EQUIP',0,43);c.restore();
      }
      for(const h of s.hazards){
        c.save();c.translate(h.x,h.y);c.rotate(Math.atan2(h.vy,-h.vx)*-.12);
        const text=`await setTimeout(${h.durationMs});`,w=text.length*9+28;
        c.globalAlpha=.28;c.strokeStyle='#ff674b';c.lineWidth=20;c.lineCap='round';c.beginPath();c.moveTo(w/2-5,0);c.lineTo(w/2+85,0);c.stroke();c.lineWidth=4;c.globalAlpha=.75;c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2+112,0);c.stroke();c.globalAlpha=1;
        c.shadowBlur=16;c.shadowColor='#ff643e';c.fillStyle='#6b281f';c.strokeStyle='#ffb16a';c.lineWidth=2;c.beginPath();c.roundRect(-w/2,-20,w,40,9);c.fill();c.stroke();c.shadowBlur=0;
        c.font='bold 15px monospace';c.textBaseline='middle';c.textAlign='left';
        let tx=-w/2+14;for(const [word,color] of [['await ','#d9a3ff'],['setTimeout','#ffe3b0'],['(','#fac2a5'],[String(h.durationMs),'#ffb36e'],[');','#fac2a5']]){c.fillStyle=color;c.fillText(word,tx,0);tx+=word.length*9;}
        c.font='bold 9px monospace';c.textAlign='center';c.fillStyle='#8c312a';c.fillText('⚠ ASYNC TRAP · SHOOT OR DODGE',0,-31);c.restore();
      }
      const missileIds=new Set(s.specials.map(p=>p.id));for(const id of this.missileTrails.keys())if(!missileIds.has(id))this.missileTrails.delete(id);
      for(const projectile of s.specials){
        if(projectile.type==='homing'){
          const trail=this.missileTrails.get(projectile.id)??[];trail.push({x:projectile.x,y:projectile.y});if(trail.length>20)trail.shift();this.missileTrails.set(projectile.id,trail);
          c.save();c.lineCap='round';for(let i=1;i<trail.length;i++){c.globalAlpha=i/trail.length*.4;c.strokeStyle='#fff3ad';c.lineWidth=i/trail.length*5;c.beginPath();c.moveTo(trail[i-1]!.x,trail[i-1]!.y);c.lineTo(trail[i]!.x,trail[i]!.y);c.stroke();}c.restore();
        }
        const a=projectile.angle;c.save();c.translate(projectile.x,projectile.y);c.rotate(a);
        if(projectile.type==='homing'){
          const exhaust=27+Math.sin(s.elapsed*71+projectile.id)*8;
          c.fillStyle='#eaa83466';c.beginPath();c.moveTo(-20,-8);c.quadraticCurveTo(-exhaust-20,Math.sin(s.elapsed*20)*11,-exhaust-40,-5);c.quadraticCurveTo(-exhaust-15,4,-20,8);c.fill();
          c.fillStyle='#fff3a9';c.beginPath();c.moveTo(-18,-5);c.lineTo(-exhaust-12,0);c.lineTo(-18,5);c.fill();
          c.fillStyle='#416a69';c.strokeStyle='#153a42';c.lineWidth=2;c.beginPath();c.moveTo(-25,3);c.lineTo(-11,-12);c.lineTo(20,-12);c.lineTo(20,16);c.lineTo(-11,16);c.closePath();c.fill();c.stroke();
          const key=c.createLinearGradient(0,-15,0,11);key.addColorStop(0,'#edfff5');key.addColorStop(1,'#91ccc2');c.fillStyle=key;c.beginPath();c.moveTo(-25,0);c.lineTo(-11,-15);c.lineTo(20,-15);c.lineTo(20,11);c.lineTo(-11,11);c.closePath();c.fill();c.stroke();
          c.strokeStyle='#1d5861';c.lineWidth=2;c.beginPath();c.moveTo(-5,-7);c.lineTo(5,3);c.moveTo(5,-7);c.lineTo(-5,3);c.stroke();
        }else{
          c.fillStyle='#25493e';c.strokeStyle='#0d3329';c.lineWidth=2;c.beginPath();c.roundRect(-14,-13,28,32,[2,2,6,6]);c.fill();c.stroke();
          const bin=c.createLinearGradient(-13,0,13,0);bin.addColorStop(0,'#b5e791');bin.addColorStop(.45,'#61b175');bin.addColorStop(1,'#2e7959');c.fillStyle=bin;c.fillRect(-12,-11,24,27);c.fillStyle='#c6f0aa';c.fillRect(-17,-17,34,6);c.fillStyle='#4c8863';c.fillRect(-7,-21,14,5);c.font='bold 20px sans-serif';c.fillStyle='#edffd2';c.textAlign='center';c.textBaseline='middle';c.fillText('♻',0,3);
          c.strokeStyle='#f5c369';c.lineWidth=2;c.beginPath();c.moveTo(6,-20);c.quadraticCurveTo(11,-34,17,-27);c.stroke();c.fillStyle=s.elapsed% .14<.07?'#fff6b0':'#ff8f40';c.beginPath();c.arc(17,-27,4,0,Math.PI*2);c.fill();
        }c.restore();
      }
      for(const b of s.bullets){c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));c.strokeStyle='#173e35';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(-13,0);c.lineTo(5,0);c.stroke();c.strokeStyle=b.weapon==='single'?'#f9db48':'#eaffaa';c.lineWidth=4;c.stroke();c.restore();}
      for(const e of s.explosions){
        const t=1-e.life/e.maxLife,r=Math.max(1,e.radius*(.35+t*.65));this.glow(e.x,e.y,r*1.6,'#ffca68',e.life/e.maxLife*.65);
        c.save();c.globalAlpha=Math.max(0,e.life/e.maxLife);c.strokeStyle='#fff0ae';c.lineWidth=7*(1-t)+1;c.beginPath();c.arc(e.x,e.y,r,0,Math.PI*2);c.stroke();c.strokeStyle='#ec7d41';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,r*.82,0,Math.PI*2);c.stroke();c.restore();
      }
      for(const p of s.particles){c.save();c.globalAlpha=Math.min(1,p.life/p.maxLife*2);c.translate(p.x,p.y);c.rotate(p.angle);c.fillStyle=p.color;if(p.char){c.shadowColor='#0e243b';c.shadowOffsetX=2;c.shadowOffsetY=3;c.font='bold 14px monospace';c.fillText(p.char,0,0);}else{c.fillRect(-2,-2,4,4);}c.restore();}
      const py=s.playerY,angle=Math.atan2(s.aimY-py,Math.max(80,s.aimX-158));
      c.drawImage(groundShadow,17,py+72);
      c.drawImage(specialistSprite,3,py-116+Math.sin(s.elapsed*6)*1.2);
      c.save();c.translate(103,py);c.rotate(angle);c.drawImage(cannonSprite,-23-(this.muzzle>0?4:0),-36);
      if(this.muzzle>0){c.fillStyle='#fff7c1';c.strokeStyle='#f0be34';c.lineWidth=3;c.beginPath();c.moveTo(76,0);c.lineTo(94,-19);c.lineTo(96,-7);c.lineTo(116,-2);c.lineTo(96,6);c.lineTo(96,18);c.closePath();c.fill();c.stroke();}c.restore();
      if(this.muzzle>0)this.glow(103+Math.cos(angle)*90,py+Math.sin(angle)*90,145,'#ffe4a1',.8);
      if(s.isStunned){
        c.save();c.translate(86,py-14);c.strokeStyle='#b756e6';c.lineWidth=3;c.shadowColor='#f0a4ff';c.shadowBlur=12;
        c.beginPath();c.ellipse(0,0,72,105,Math.sin(s.elapsed*6)*.12,0,Math.PI*2);c.stroke();
        for(let i=0;i<4;i++){const a=s.elapsed*5+i*Math.PI/2,x=Math.cos(a)*67,y=Math.sin(a)*99;c.beginPath();c.moveTo(x-6,y-10);c.lineTo(x+2,y-2);c.lineTo(x-3,y+1);c.lineTo(x+7,y+10);c.stroke();}
        c.shadowBlur=0;c.fillStyle='#56256e';c.beginPath();c.roundRect(-56,-132,112,25,7);c.fill();c.font='bold 12px monospace';c.textAlign='center';c.fillStyle='#ffe4ff';c.fillText(`AWAIT ${s.stunRemaining.toFixed(1)}s`,0,-115);c.restore();
      }
      const ax=s.aimX,ay=s.aimY;c.strokeStyle=s.isStunned?'#b756e6':'#234c3b';c.lineWidth=1.5;c.beginPath();c.arc(ax,ay,13,0,Math.PI*2);c.stroke();c.fillStyle='#f9db48';c.beginPath();c.arc(ax,ay,3,0,Math.PI*2);c.fill();
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){c.beginPath();c.moveTo(ax+dx*17,ay+dy*17);c.lineTo(ax+dx*22,ay+dy*22);c.stroke();}
      c.restore();
      const vignette=c.createRadialGradient(600,330,320,640,360,790);vignette.addColorStop(0,'#17324000');vignette.addColorStop(1,'#17324033');c.fillStyle=vignette;c.fillRect(0,0,WIDTH,HEIGHT);
      this.texture.refresh();
    }
  }
  new Phaser.Game({type:Phaser.CANVAS,parent,width:WIDTH,height:HEIGHT,backgroundColor:'#e1eddb',scene:PlayScene,transparent:false,antialias:true,render:{roundPixels:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},input:{activePointers:3},audio:{noAudio:true},banner:false});
  return promise;
}
