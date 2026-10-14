import { test, expect, type Page } from '@playwright/test';

async function start(page:Page) {
  await page.goto('/');
  await page.getByRole('button',{name:'Click to play',exact:true}).click();
  await page.locator('#start').click();
  await expect(page.locator('#game-screen')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(()=>!!(window as any).__spaghetti);
}
async function point(page:Page,x:number,y:number) {
  const box=await page.locator('canvas').boundingBox();
  await page.mouse.move(box!.x+x/1280*box!.width,box!.y+y/720*box!.height);
}

test('opening screen, help popup and sound control',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const NativeAudioContext=window.AudioContext;
    window.AudioContext=class extends NativeAudioContext {
      constructor(options?:AudioContextOptions){super(options);(window as any).__openingAudioContext=this;}
    };
  });
  await page.goto('/');
  await expect(page).toHaveTitle(/Spaghetti Busters/);
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('#prelude button')).toHaveCount(1);
  expect(await page.evaluate(()=>(window as any).__openingAudioContext)).toBeUndefined();
  await page.getByRole('button',{name:'Click to play',exact:true}).click();
  await expect(page.locator('#prelude')).toBeHidden();
  await expect(page.locator('#opening-audio-status')).toHaveText('♫ OPENING THEME · SOUND ON');
  await expect.poll(()=>page.evaluate(()=>(window as any).__openingAudioContext.state)).toBe('running');
  await expect(page.locator('h1')).toContainText('SPAGHETTI');
  await page.getByRole('button',{name:'Help: how to play'}).click();
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('dialog')).toContainText('TRIPLE_SHOT');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.locator('#menu [data-sound]').click();
  await expect(page.locator('#menu [data-sound]')).toHaveText('SOUND OFF');
  expect(errors).toEqual([]);
});

test('pointer fire chips code, scores points and renders without errors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);
  await point(page,1000,330);await page.mouse.down();
  await expect.poll(()=>page.evaluate(()=>(window as any).__spaghetti.simulation.score)).toBeGreaterThan(0);
  await page.waitForTimeout(700);await page.mouse.up();
  const state=await page.evaluate(()=>{const s=(window as any).__spaghetti.simulation;return{shots:s.shotsFired,chipped:s.blocks.some((b:any)=>b.hits>0||b.generation>0),score:s.score};});
  expect(state.shots).toBeGreaterThan(3);expect(state.chipped).toBe(true);expect(state.score).toBeGreaterThan(0);
  await expect(page.locator('#score')).not.toHaveText('000000');
  expect(errors).toEqual([]);
});

test('pause freezes the simulation, resume and keyboard controls work',async({page})=>{
  await start(page);await page.keyboard.press('KeyP');
  await expect(page.locator('#game-overlay')).toBeVisible();
  const time=await page.evaluate(()=>(window as any).__spaghetti.simulation.elapsed);
  await page.waitForTimeout(350);
  expect(await page.evaluate(()=>(window as any).__spaghetti.simulation.elapsed)).toBe(time);
  await page.locator('#resume').click();
  await page.keyboard.down('ArrowDown');await page.keyboard.down('Space');await page.waitForTimeout(450);await page.keyboard.up('ArrowDown');await page.keyboard.up('Space');
  const state=await page.evaluate(()=>{const s=(window as any).__spaghetti.simulation;return{y:s.playerY,shots:s.shotsFired,elapsed:s.elapsed};});
  expect(state.y).toBeGreaterThan(400);expect(state.shots).toBeGreaterThan(1);expect(state.elapsed).toBeGreaterThan(time);
});

test('magic variable releases a weapon and another hit equips it',async({page})=>{
  await start(page);
  await page.evaluate(()=>{const s=(window as any).__spaghetti.simulation;s.blocks=[];s.spawnBlock({x:650,y:330,vx:0,vy:0,angle:0,code:['TRIPLE_SHOT = true;']});});
  await point(page,650,328);await page.mouse.down();await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>(window as any).__spaghetti.simulation.pickups.length)).toBeGreaterThan(0);
  await expect(page.locator('#weapon')).toHaveText('SINGLE SHOT');
  await page.evaluate(()=>{const p=(window as any).__spaghetti.simulation.pickups[0];p.x=600;p.y=350;p.vx=0;p.vy=0;});
  await point(page,600,350);await page.mouse.down();
  await expect(page.locator('#weapon')).toHaveText('TRIPLE SHOT');await page.mouse.up();
  await expect(page.locator('#ammo')).toContainText('ROUNDS REMAINING');
});

test('escaped chunk ends run, saves best score and restart resets play',async({page})=>{
  await start(page);
  await page.evaluate(()=>{const s=(window as any).__spaghetti.simulation;s.score=1234;s.blocks[0].x=-1000;});
  await expect(page.locator('#overlay-title')).toHaveText('BUILDFAILED.');
  await expect(page.locator('#results')).toContainText('001234');
  await expect(page.locator('#resume')).toBeHidden();
  await page.locator('#restart').click();
  await expect(page.locator('#game-overlay')).toBeHidden();
  await expect(page.locator('#score')).toHaveText('000000');
  await page.keyboard.press('KeyP');await page.locator('#quit').click();
  await expect(page.locator('#menu-best')).toHaveText('001234');
  await page.reload();await page.locator('#enter').click();await expect(page.locator('#menu-best')).toHaveText('001234');
});

test('touch landscape is playable and menu fits a phone',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
  const page=await context.newPage();await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await expect(page.locator('#enter')).toBeInViewport();
  await page.locator('#enter').tap();
  await expect(page.locator('#start')).toBeInViewport();
  await expect(page.locator('#help')).toBeInViewport();
  await page.setViewportSize({width:844,height:390});await page.locator('#start').click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.orientation-hint')).toBeHidden();
  await expect(page.locator('#pause')).toBeInViewport();
  const box=await page.locator('canvas').boundingBox();
  await page.touchscreen.tap(box!.x+box!.width*.7,box!.y+box!.height*.45);
  await expect.poll(()=>page.evaluate(()=>(window as any).__spaghetti.simulation.shotsFired)).toBeGreaterThan(0);
  await page.locator('#select-grenade').tap();
  await expect(page.locator('#select-grenade')).toHaveAttribute('aria-pressed','true');
  await page.locator('#fire-special').tap();
  await expect(page.locator('#grenade-ammo')).toHaveText('1');
  await page.locator('#pause').click();await expect(page.locator('#resume')).toBeInViewport();
  await context.close();
});

test('right click launches selected special and never fires the primary cannon',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);await point(page,900,350);
  await page.mouse.click(1000,440,{button:'right'});
  await expect(page.locator('#homing-ammo')).toHaveText('2');
  expect(await page.evaluate(()=>(window as any).__spaghetti.simulation.shotsFired)).toBe(0);
  await page.keyboard.press('Digit2');
  await expect(page.locator('#select-grenade')).toHaveAttribute('aria-pressed','true');
  await page.waitForFunction(()=>(window as any).__spaghetti.simulation.specialCooldown===0);
  await page.mouse.click(1000,440,{button:'right'});
  await expect(page.locator('#grenade-ammo')).toHaveText('1');
  expect(await page.evaluate(()=>(window as any).__spaghetti.simulation.shotsFired)).toBe(0);
  await page.keyboard.press('Digit1');
  await expect(page.locator('#select-homing')).toHaveAttribute('aria-pressed','true');
  expect(errors).toEqual([]);
});

test('timeout collision paralyzes movement and all weapons, then recovers',async({page})=>{
  await start(page);
  await page.evaluate(()=>{const s=(window as any).__spaghetti.simulation;s.spawnHazard({x:100,y:s.playerY,durationMs:2000,vx:0,vy:0});});
  await expect(page.locator('#game-screen')).toHaveClass(/stunned/);
  await expect(page.locator('#combo')).toContainText('EVENT LOOP BLOCKED');
  const before=await page.evaluate(()=>{const s=(window as any).__spaghetti.simulation;return{y:s.playerY,shots:s.shotsFired,ammo:s.specialAmmo.homing};});
  await point(page,900,570);await page.mouse.down();await page.waitForTimeout(250);await page.mouse.up();
  await page.mouse.click(1000,650,{button:'right'});
  const after=await page.evaluate(()=>{const s=(window as any).__spaghetti.simulation;return{y:s.playerY,shots:s.shotsFired,ammo:s.specialAmmo.homing};});
  expect(after).toEqual(before);
  await expect(page.locator('#game-screen')).not.toHaveClass(/stunned/);
  await page.mouse.click(1000,650);
  await expect.poll(()=>page.evaluate(()=>(window as any).__spaghetti.simulation.shotsFired)).toBeGreaterThan(before.shots);
});
