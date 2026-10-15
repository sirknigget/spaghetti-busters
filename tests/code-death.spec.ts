import { expect, test, type Page } from '@playwright/test';

async function start(page:Page) {
  await page.goto('/'); await page.locator('#enter').click(); await page.locator('#start').click();
  await page.waitForFunction(() => !!(window as any).__spaghetti?.world.debris);
}

function renderingErrors(page:Page) {
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  return errors;
}

test('destroyed code collapses as its original perforated surface and physically settles without affecting gameplay',async({page},testInfo)=>{
  const errors=renderingErrors(page);await start(page);
  const death=await page.evaluate(()=>{
    const {simulation:s,scene:r,world:w}=(window as any).__spaghetti;
    r.setPaused(true);s.blocks=[];s.pendingBlocks=0;s.robots=[];
    const block=s.spawnBlock({x:790,y:285,vx:0,vy:0,angle:.12,
      code:Array(7).fill('const tangled = factoryFactory(JSON.parse(JSON.stringify(input)));')});
    const oldHole=block.cells.find((c:any)=>Math.abs(c.x)<20&&Math.abs(c.y)<30);
    oldHole.alive=false;block.hits++;r.draw();
    const original=w.blocks.get(block.id),canvas=original.userData.fractureVisual.canvas;
    const oldHoleKeys=[...original.userData.fractureVisual.holes.keys()];
    s.damage(block,0,0,{vx:1080,vy:0},1000,100);r.draw();
    const fragments=w.scene.children.filter((mesh:any)=>mesh.name.startsWith('code-death-fragment-'));
    const result={effects:w.debris.diagnostics,originalRemoved:original.parent===null&&!w.blocks.has(block.id),
      originalCanvas:fragments.every((mesh:any)=>mesh.userData.sourceCanvas===canvas),
      oldHoles:fragments.every((mesh:any)=>oldHoleKeys.every(key=>mesh.userData.fractureVisual.holes.has(key))),
      geometryCount:new Set(fragments.map((mesh:any)=>mesh.children[0].geometry.uuid)).size,
      areas:fragments.map((mesh:any)=>mesh.userData.fragmentArea),
      smoke:w.scene.getObjectByName('physics-buoyant-turbulent-smoke').count,
      sparks:w.scene.getObjectByName('physics-incandescent-sparks').count,
      cleared:!s.blocks.some((b:any)=>b.id===block.id)};
    for(let i=0;i<30;i++)w.debris.update(1/120);r.draw();
    return result;
  });
  expect(death.effects.codeDeaths).toBe(1);expect(death.effects.codeParts).toBeGreaterThanOrEqual(8);
  expect(death).toMatchObject({originalRemoved:true,originalCanvas:true,oldHoles:true,cleared:true});
  expect(death.geometryCount).toBe(death.effects.codeParts);
  expect(death.areas.every((area:number)=>area>0)).toBe(true);
  expect(new Set(death.areas.map((area:number)=>Math.round(area))).size).toBeGreaterThan(3);
  expect(death.effects.letters).toBeGreaterThan(6);expect(death.smoke).toBeGreaterThan(0);expect(death.sparks).toBeGreaterThan(0);
  await page.screenshot({path:testInfo.outputPath('code-disintegration-mid-fall.png')});
  const settled=await page.evaluate(()=>{
    const {simulation:s,scene:r,world:w}=(window as any).__spaghetti;
    const gameplay=()=>JSON.stringify({blocks:s.blocks,robots:s.robots,score:s.score,ammo:s.ammo,elapsed:s.elapsed});
    const before=gameplay(),bodies=w.debris.bodySnapshots;
    r.draw();r.draw();
    const pauseSafe=JSON.stringify(bodies)===JSON.stringify(w.debris.bodySnapshots);
    const start=bodies.filter((body:any)=>body.kind==='code');
    for(let i=0;i<600;i++)w.debris.update(1/120);r.draw();
    return {unchanged:gameplay()===before,pauseSafe,start,end:w.debris.bodySnapshots.filter((body:any)=>body.kind==='code'),
      effects:w.debris.diagnostics,glError:w.renderer.getContext().getError()};
  });
  expect(settled.unchanged).toBe(true);expect(settled.pauseSafe).toBe(true);expect(settled.glError).toBe(0);
  expect(settled.end).toHaveLength(settled.start.length);
  expect(settled.end.some((body:any,index:number)=>body.y<settled.start[index].y-100)).toBe(true);
  expect(settled.end.every((body:any)=>body.y>=40)).toBe(true);
  expect(settled.effects.settled).toBeGreaterThan(0);expect(settled.effects.crumbled).toBeGreaterThan(0);
  await page.screenshot({path:testInfo.outputPath('code-disintegration-on-floor.png')});
  await page.setViewportSize({width:844,height:390});
  await page.screenshot({path:testInfo.outputPath('code-disintegration-mobile.png')});
  const reset=await page.evaluate(()=>{
    const {scene:r,world:w}=(window as any).__spaghetti;r.reset();
    return {effects:w.debris.diagnostics,fragments:w.scene.children.filter((mesh:any)=>mesh.name.startsWith('code-death-fragment-')).length};
  });
  expect(reset.effects.rigidBodies).toBe(0);expect(reset.effects.particles).toBe(0);
  expect(reset.effects.codeDeaths).toBe(0);expect(reset.fragments).toBe(0);expect(errors).toEqual([]);
});

test('explosions, lint clearing and uncached boss deaths retain a surface even when every glyph is removed',async({page})=>{
  const errors=renderingErrors(page);await start(page);
  const results=await page.evaluate(()=>{
    const {simulation:s,scene:r,world:w}=(window as any).__spaghetti;
    return ['explosion','lint','uncached-boss'].map(mode=>{
      r.reset();r.setPaused(true);s.blocks=[];s.pendingBlocks=0;
      const block=s.spawnBlock({boss:mode==='uncached-boss',x:800,y:320,vx:0,vy:0,angle:0,
        code:['const unnecessarilyNested = factoryFactory();','return JSON.parse(JSON.stringify(input));']});
      block.cells.forEach((cell:any)=>cell.health=1);block.cells[0].alive=false;
      if(mode!=='uncached-boss')r.draw();
      const wasCached=w.blocks.has(block.id);
      if(mode==='lint'){s.selectSpecial('lint');s.fireSpecial();}
      else s.explode(block.x,block.y,300,5);
      r.draw();
      const parts=w.scene.children.filter((mesh:any)=>mesh.name.startsWith('code-death-fragment-'));
      return {mode,wasCached,cleared:!s.blocks.some((b:any)=>b.id===block.id),
        allGlyphsRemoved:block.cells.every((cell:any)=>!cell.alive),effects:w.debris.diagnostics,
        surface:parts.every((mesh:any)=>!!mesh.userData.sourceCanvas&&mesh.userData.fragmentArea>0),
        holes:parts.every((mesh:any)=>mesh.userData.fractureVisual.holes.size>0),
        glError:w.renderer.getContext().getError()};
    });
  });
  for(const result of results){
    expect(result.wasCached).toBe(result.mode!=='uncached-boss');
    expect(result).toMatchObject({cleared:true,allGlyphsRemoved:true,surface:true,holes:true,glError:0});
    expect(result.effects.codeDeaths).toBe(1);expect(result.effects.codeParts).toBeGreaterThan(1);
    expect(result.effects.letters).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
