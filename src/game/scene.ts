import { Simulation, type SpecialWeapon } from './simulation';
import { WorldRenderer } from './world3d';

export interface GameController {
  reset():void;
  setPaused(value:boolean):void;
  selectSpecial(type:SpecialWeapon):void;
  fireSpecial():void;
}
interface Callbacks {
  onState:(s:Simulation)=>void;
  onEvent:(event:string)=>void;
  onGameOver:(score:number,wave:number)=>void;
}

/** Inputs and the frame loop adapt the 2D simulation to the actual 3D scene. */
export async function createGame(parent:string, callbacks:Callbacks):Promise<GameController> {
  const host=document.getElementById(parent)!;
  class PlayScene implements GameController {
    sim=new Simulation();
    world=new WorldRenderer(host);
    paused=true;
    holding=false;
    holdingSpecial=false;
    muzzle=0;
    impact=0;
    lastHud=0;
    lastFrame=performance.now();
    keys=new Set<string>();

    constructor() {
      const canvas=this.world.renderer.domElement;
      canvas.setAttribute('aria-label','3D arcade playfield. Move to aim, left click or Space to shoot. Right click launches special weapons. Press 1 for homing backspace missiles, 2 for recycle grenades, 3 for the code review freeze gun, or 4 for the lint bomb.');
      const point=(event:PointerEvent)=>{
        const box=canvas.getBoundingClientRect();
        if(box.width<=0||box.height<=0)return;
        this.sim.aimX=Math.max(220,Math.min(1280,(event.clientX-box.left)/box.width*1280));
        this.sim.aimY=Math.max(130,Math.min(640,(event.clientY-box.top)/box.height*720));
      };
      canvas.addEventListener('pointermove',event=>{if(!this.paused)point(event);});
      canvas.addEventListener('pointerdown',event=>{
        if(this.paused)return;
        event.preventDefault();point(event);
        canvas.setPointerCapture(event.pointerId);
        if(event.button===2){this.sim.fireSpecial();this.holdingSpecial=true;}
        else if(event.button===0){this.sim.fire();this.holding=true;}
      });
      window.addEventListener('pointerup',event=>{this.holding=(event.buttons&1)!==0;this.holdingSpecial=(event.buttons&2)!==0;});
      canvas.addEventListener('pointercancel',()=>this.release());
      canvas.addEventListener('lostpointercapture',()=>this.release());
      canvas.addEventListener('contextmenu',event=>event.preventDefault());
      window.addEventListener('keydown',event=>{
        if(this.paused)return;
        if(['Space','ArrowUp','ArrowDown','KeyW','KeyS'].includes(event.code)){event.preventDefault();this.keys.add(event.code);}
        if(event.code==='Digit1'||event.code==='Numpad1')this.selectSpecial('homing');
        if(event.code==='Digit2'||event.code==='Numpad2')this.selectSpecial('grenade');
        if(event.code==='Digit3'||event.code==='Numpad3')this.selectSpecial('review');
        if(event.code==='Digit4'||event.code==='Numpad4')this.selectSpecial('lint');
      });
      window.addEventListener('keyup',event=>this.keys.delete(event.code));
      window.addEventListener('blur',()=>this.release());
      window.addEventListener('resize',()=>{this.world.resize();this.draw();});
      canvas.addEventListener('webglcontextlost',event=>{
        event.preventDefault();this.setPaused(true);
        host.dispatchEvent(new CustomEvent('game-context-lost'));
      });
      canvas.addEventListener('webglcontextrestored',()=>{
        this.world.resize();this.draw();host.dispatchEvent(new CustomEvent('game-context-restored'));
      });
      this.draw();requestAnimationFrame(this.frame);
    }

    release(){this.holding=this.holdingSpecial=false;this.keys.clear();}
    reset(){this.sim.reset();this.world.reset();this.release();this.muzzle=this.impact=0;callbacks.onState(this.sim);this.draw();}
    setPaused(value:boolean){this.paused=value;this.release();this.lastFrame=performance.now();if(!value){this.world.resize();this.draw();}}
    selectSpecial(type:SpecialWeapon){if(!this.paused){this.sim.selectSpecial(type);callbacks.onState(this.sim);}}
    fireSpecial(){if(!this.paused)this.sim.fireSpecial();}
    draw(){this.world.render(this.sim,this.muzzle,this.impact);}

    frame=(now:number)=>{
      const dt=Math.min(Math.max(0,(now-this.lastFrame)/1000),.05);
      this.lastFrame=now;if(!this.paused)this.update(dt);requestAnimationFrame(this.frame);
    };
    update(dt:number){
      if(this.keys.has('ArrowUp')||this.keys.has('KeyW'))this.sim.aimY=Math.max(145,this.sim.aimY-dt*450);
      if(this.keys.has('ArrowDown')||this.keys.has('KeyS'))this.sim.aimY=Math.min(630,this.sim.aimY+dt*450);
      if(this.holding||this.keys.has('Space'))this.sim.fire();
      if(this.holdingSpecial)this.sim.fireSpecial();
      this.sim.update(dt);
      for(const event of this.sim.events.splice(0)){
        if(event==='shot'||event==='missile'||event==='grenade'||event==='review'||event==='lint')this.muzzle=.065;
        if(event==='hit')this.impact=3;
        if(event==='split'||event==='destroy')this.impact=5;
        if(event==='explosion'||event==='lint')this.impact=8;
        if(event==='generate')this.impact=3;
        if(event==='stun')this.impact=7;
        callbacks.onEvent(event);
      }
      this.muzzle=Math.max(0,this.muzzle-dt);this.impact=Math.max(0,this.impact-dt*30);this.lastHud+=dt;
      if(this.lastHud>.07){callbacks.onState(this.sim);this.lastHud=0;}
      if(this.sim.status==='gameover'){callbacks.onState(this.sim);callbacks.onGameOver(this.sim.score,this.sim.wave);}
      this.draw();
    }
  }
  const scene=new PlayScene();
  if(import.meta.env.DEV||import.meta.env.MODE==='test'){
    (window as unknown as {__spaghetti:unknown}).__spaghetti={simulation:scene.sim,scene,renderer:scene.world.renderer,world:scene.world};
  }
  return scene;
}
