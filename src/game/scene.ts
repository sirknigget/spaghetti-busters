import Phaser from 'phaser';
import { Simulation, type Block } from './simulation';

export interface GameController { reset():void; setPaused(value:boolean):void; }
interface Callbacks { onState:(s:Simulation)=>void; onEvent:(event:string)=>void; onGameOver:(score:number,wave:number)=>void; }
type CachedBlock = { canvas:HTMLCanvasElement; hits:number; count:number };
const WIDTH=1280, HEIGHT=720;

export async function createGame(parent:string, callbacks:Callbacks):Promise<GameController> {
  const images = await Promise.all(['city','character','cannon'].map(name=>new Promise<HTMLImageElement>((resolve,reject)=>{
    const img = new Image(); img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(`Could not load ${name}`));img.src=`/assets/${name}.svg`;
  })));
  const [city,character,cannon]=images;
  let ready!: (controller:GameController)=>void;
  const promise=new Promise<GameController>(resolve=>{ ready=resolve; });
  class PlayScene extends Phaser.Scene {
    sim=new Simulation();
    paused=true;
    holding=false;
    muzzle=0;
    impact=0;
    lastHud=0;
    blockCache=new Map<number,CachedBlock>();
    texture!:Phaser.Textures.CanvasTexture;
    ctx!:CanvasRenderingContext2D;
    keys!:Record<string,Phaser.Input.Keyboard.Key>;
    create() {
      this.texture=this.textures.createCanvas('playfield',WIDTH,HEIGHT)!;
      this.ctx=this.texture.getContext();
      this.add.image(0,0,'playfield').setOrigin(0);
      this.keys=this.input.keyboard!.addKeys('SPACE,UP,DOWN,W,S') as Record<string,Phaser.Input.Keyboard.Key>;
      const point=(p:Phaser.Input.Pointer)=>{ this.sim.aimX=Math.max(220,Math.min(WIDTH,p.x));this.sim.aimY=Math.max(130,Math.min(640,p.y)); };
      this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{ if(!this.paused)point(p); });
      this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{ if(!this.paused){point(p);this.sim.fire();this.holding=true;} });
      this.input.on('pointerup',()=>{this.holding=false;});
      this.input.on('pointerupoutside',()=>{this.holding=false;});
      this.game.canvas.addEventListener('contextmenu',e=>e.preventDefault());
      this.game.canvas.setAttribute('aria-label','Arcade playfield. Move the pointer to aim and hold to shoot. Arrow keys and Space also work.');
      ready({reset:()=>{this.sim.reset();this.blockCache.clear();this.holding=false;this.muzzle=0;this.impact=0;callbacks.onState(this.sim);},setPaused:(value)=>{this.paused=value;this.holding=false;if(value)this.input.keyboard?.resetKeys();}});
      if(import.meta.env.DEV || import.meta.env.MODE==='test') {
        (window as unknown as {__spaghetti:unknown}).__spaghetti={simulation:this.sim,scene:this};
      }
      this.draw();
    }
    update(_time:number,delta:number) {
      if(this.paused) return;
      const dt=Math.min(delta/1000,.05);
      if(!this.paused) {
        if(this.keys.UP.isDown||this.keys.W.isDown)this.sim.aimY=Math.max(145,this.sim.aimY-dt*450);
        if(this.keys.DOWN.isDown||this.keys.S.isDown)this.sim.aimY=Math.min(630,this.sim.aimY+dt*450);
        if(this.holding||this.keys.SPACE.isDown)this.sim.fire();
        this.sim.update(dt);
        for(const event of this.sim.events.splice(0)) {
          if(event==='shot')this.muzzle=.065;
          if(event==='hit')this.impact=3;
          if(event==='split'||event==='destroy')this.impact=5;
          callbacks.onEvent(event);
        }
        this.muzzle=Math.max(0,this.muzzle-dt);
        this.impact=Math.max(0,this.impact-dt*30);
        this.lastHud+=dt;
        if(this.lastHud>.07){callbacks.onState(this.sim);this.lastHud=0;}
        if(this.sim.status==='gameover'){callbacks.onState(this.sim);callbacks.onGameOver(this.sim.score,this.sim.wave);}
      }
      this.draw();
    }
    card(block:Block) {
      let cached=this.blockCache.get(block.id);
      if(cached&&cached.hits===block.hits&&cached.count===block.cells.length)return cached.canvas;
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(block.width+20);canvas.height=Math.ceil(block.height+55);
      const c=canvas.getContext('2d')!;c.translate(canvas.width/2,canvas.height/2+12);
      const w=block.width,h=block.height;
      c.shadowColor='#173e3540';c.shadowBlur=0;c.shadowOffsetX=5;c.shadowOffsetY=7;
      c.fillStyle='#173d3b';c.strokeStyle='#0c2c28';c.lineWidth=3;
      c.beginPath();c.roundRect(-w/2,-h/2-25,w,h+25,7);c.fill();c.stroke();c.shadowOffsetX=0;c.shadowOffsetY=0;
      c.fillStyle='#244b45';c.beginPath();c.roundRect(-w/2+2,-h/2-23,w-4,24,[5,5,0,0]);c.fill();
      c.fillStyle='#ecbc61';c.beginPath();c.arc(-w/2+13,-h/2-11,3,0,Math.PI*2);c.fill();c.fillStyle='#99bc8b';c.beginPath();c.arc(-w/2+24,-h/2-11,3,0,Math.PI*2);c.fill();
      c.font='9px monospace';c.fillStyle='#a8bda8';c.textBaseline='middle';c.textAlign='left';
      c.fillText(block.title ?? 'legacy-service.ts',-w/2+36,-h/2-10);
      c.textAlign='right';c.fillStyle='#6d9284';c.fillText('TS',w/2-10,-h/2-10);
      c.textAlign='center';c.textBaseline='middle';c.font='14px monospace';
      for(const cell of block.cells) {
        if(!cell.alive)continue;
        if(cell.magic){c.fillStyle='#fadd431a';c.fillRect(cell.x-4.5,cell.y-9,9,18);}
        c.fillStyle=cell.color;c.fillText(cell.char,cell.x,cell.y);
      }
      c.globalCompositeOperation='destination-out';
      for(const cell of block.cells)if(!cell.alive){c.beginPath();c.arc(cell.x,cell.y,8,0,Math.PI*2);c.fill();}
      c.globalCompositeOperation='source-over';
      cached={canvas,hits:block.hits,count:block.cells.length};this.blockCache.set(block.id,cached);return canvas;
    }
    draw() {
      if(!this.ctx)return;
      const c=this.ctx,s=this.sim;c.clearRect(0,0,WIDTH,HEIGHT);
      c.drawImage(city,0,0,WIDTH,HEIGHT);
      c.save();
      if(this.impact>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches)c.translate(Math.sin(s.elapsed*175)*this.impact,Math.cos(s.elapsed*143)*this.impact*.5);
      const danger=s.blocks.some(b=>b.x<240);
      c.fillStyle=danger?'#d65d3820':'#254d3420';c.fillRect(0,110,22,508);
      c.setLineDash([5,8]);c.strokeStyle=danger?'#c15b3d':'#799c7a';c.lineWidth=2;c.beginPath();c.moveTo(23,115);c.lineTo(23,615);c.stroke();c.setLineDash([]);
      c.save();c.translate(14,380);c.rotate(-Math.PI/2);c.font='bold 8px monospace';c.fillStyle=danger?'#ae4938':'#6c8c6b';c.textAlign='center';c.fillText('NO SPAGHETTI BEYOND THIS LINE',0,0);c.restore();
      // Small drifting source-code motes place the flat artwork in a living world.
      c.font='17px monospace';c.fillStyle='#61926d1e';
      for(let i=0;i<14;i++){const x=((i*137-s.elapsed*(8+i%3)*.6)%1400+1400)%1400;const y=145+(i*83)%410;c.fillText(['{ }','</>',';','=>'][i%4],x,y);}
      const aliveIds=new Set(s.blocks.map(b=>b.id));for(const id of this.blockCache.keys())if(!aliveIds.has(id))this.blockCache.delete(id);
      for(const block of s.blocks) {
        c.save();c.translate(block.x,block.y);c.rotate(block.angle);
        const card=this.card(block);c.drawImage(card,-card.width/2,-card.height/2-12);c.restore();
      }
      for(const p of s.pickups){
        c.save();c.translate(p.x,p.y);c.rotate(Math.sin(p.age*4)*.13);
        c.strokeStyle='#f9db48';c.lineWidth=2;c.globalAlpha=.55+.2*Math.sin(p.age*8);
        c.beginPath();c.arc(0,0,33+Math.sin(p.age*5)*3,0,Math.PI*2);c.stroke();c.globalAlpha=1;
        c.fillStyle='#f9db48';c.strokeStyle='#173e35';c.lineWidth=3;c.beginPath();c.roundRect(-26,-23,52,46,8);c.fill();c.stroke();
        c.font='bold 23px monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#173e35';c.fillText(p.type==='triple'?'≋':'Ⅱ',0,-2);
        c.fillStyle='#173e35';c.font='bold 8px monospace';c.fillText('SHOOT TO EQUIP',0,43);c.restore();
      }
      for(const b of s.bullets){c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));c.strokeStyle='#173e35';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(-13,0);c.lineTo(5,0);c.stroke();c.strokeStyle=b.weapon==='single'?'#f9db48':'#eaffaa';c.lineWidth=4;c.stroke();c.restore();}
      for(const p of s.particles){c.save();c.globalAlpha=Math.min(1,p.life/p.maxLife*2);c.translate(p.x,p.y);c.rotate(p.angle);c.fillStyle=p.color;if(p.char){c.font='bold 14px monospace';c.fillText(p.char,0,0);}else{c.fillRect(-2,-2,4,4);}c.restore();}
      const py=s.playerY,angle=Math.atan2(s.aimY-py,Math.max(80,s.aimX-158));
      c.fillStyle='#1b504a17';c.beginPath();c.ellipse(91,py+113,67,12,0,0,Math.PI*2);c.fill();
      c.drawImage(character,15,py-104+Math.sin(s.elapsed*6)*1.2,140,215);
      c.save();c.translate(103,py);c.rotate(angle);c.drawImage(cannon,-13-(this.muzzle>0?4:0),-26,91,49);
      if(this.muzzle>0){c.fillStyle='#fff7c1';c.strokeStyle='#f0be34';c.lineWidth=3;c.beginPath();c.moveTo(76,0);c.lineTo(94,-19);c.lineTo(96,-7);c.lineTo(116,-2);c.lineTo(96,6);c.lineTo(96,18);c.closePath();c.fill();c.stroke();}c.restore();
      const ax=s.aimX,ay=s.aimY;c.strokeStyle='#234c3b';c.lineWidth=1.5;c.beginPath();c.arc(ax,ay,13,0,Math.PI*2);c.stroke();c.fillStyle='#f9db48';c.beginPath();c.arc(ax,ay,3,0,Math.PI*2);c.fill();
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){c.beginPath();c.moveTo(ax+dx*17,ay+dy*17);c.lineTo(ax+dx*22,ay+dy*22);c.stroke();}
      c.restore();this.texture.refresh();
    }
  }
  new Phaser.Game({type:Phaser.CANVAS,parent,width:WIDTH,height:HEIGHT,backgroundColor:'#e1eddb',scene:PlayScene,transparent:false,antialias:true,render:{roundPixels:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},input:{activePointers:3},audio:{noAudio:true},banner:false});
  return promise;
}
