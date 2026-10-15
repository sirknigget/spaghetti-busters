import { expect, test, type Page } from '@playwright/test';

async function start(page:Page) {
  await page.goto('/');
  await page.getByRole('button',{name:'Click to play',exact:true}).click();
  await page.locator('#start').click();
  await page.waitForFunction(()=>!!(window as any).__spaghetti);
}

test('a tough branded robot intercepts shots, thinks, and creates a huge solid block',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await start(page);
  const shielding=await page.evaluate(()=>{
    const {simulation:s,scene:r,world:w}=(window as any).__spaghetti;
    r.setPaused(true);s.blocks=[];
    const robot=s.spawnRobot({brand:'openai',x:500,y:360});
    robot.state='thinking';robot.stateTime=0;
    const block=s.spawnBlock({x:850,y:360,vx:0,vy:0,angle:0,code:['const shielded = JSON.parse(JSON.stringify(data));','return shielded.map((x: any) => eval("x"));']});
    s.aimY=360;s.aimX=900;s.fire();
    for(let i=0;i<4;i++)s.update(.1);
    r.draw();
    return {robots:s.robots.length,hitFlash:robot.hitFlash,hits:block.hits,damaged:s.events.includes('robot-hit'),health:robot.health,model:!!w.scene.getObjectByName('ai-code-robot-openai')};
  });
  expect(shielding).toMatchObject({robots:1,hits:0,damaged:true,health:14,model:true});
  const generated=await page.evaluate(()=>{
    const {simulation:s,scene:r,world:w}=(window as any).__spaghetti;
    for(let i=0;i<9;i++)s.update(.25);
    r.draw();
    const huge=s.blocks.find((b:any)=>b.cells.length>450);
    return {state:s.robots[0].state,generated:s.events.includes('generate'),huge:!!huge,solid:huge ? w.blocks.get(huge.id).userData.solidDepth : 0};
  });
  expect(generated).toMatchObject({state:'leaving',generated:true,huge:true});
  expect(generated.solid).toBeGreaterThan(20);
  await expect.poll(()=>page.evaluate(()=>{
    const w=(window as any).__spaghetti.world;
    const robot=w.scene.getObjectByName('ai-code-robot-openai');
    let loaded=false;
    robot?.traverse((child:any)=>{if(child.material?.map?.image?.src?.includes('/brands/openai.svg'))loaded=true;});
    return loaded;
  })).toBe(true);
  const removed=await page.evaluate(()=>{
    const {simulation:s,scene:r,world:w}=(window as any).__spaghetti;
    s.robots=[];r.draw();
    return !w.scene.getObjectByName('ai-code-robot-openai');
  });
  expect(removed).toBe(true);
  expect(errors).toEqual([]);
});

test('angry code throws solid exceptions and code review visibly freezes the attackers',async({page})=>{
  await start(page);
  const state=await page.evaluate(()=>{
    const {simulation:s,scene:r,world:w}=(window as any).__spaghetti;
    r.setPaused(true);s.blocks=[];
    const angry=s.spawnBlock({x:900,y:320,vx:-50,vy:5,angry:true});
    angry.throwTimer=.01;
    s.update(.05);r.draw();
    const exception=s.blocks.find((b:any)=>b.exception);
    const before=s.blocks.map((b:any)=>[b.id,b.x,b.y,b.age]);
    s.selectSpecial('review');s.fireSpecial();
    for(let i=0;i<4;i++)s.update(.25);
    r.draw();
    const after=s.blocks.map((b:any)=>[b.id,b.x,b.y,b.age]);
    return {angry:w.blocks.get(angry.id).userData.angry,exception:!!exception,
      exceptionSolid:exception?w.blocks.get(exception.id).userData.solidDepth:0,before,after,freeze:s.freezeRemaining};
  });
  expect(state.angry).toBe(true);
  expect(state.exception).toBe(true);
  expect(state.exceptionSolid).toBeGreaterThan(0);
  expect(state.after).toEqual(state.before);
  expect(state.freeze).toBeGreaterThan(.9);
});
