import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
const layout=JSON.parse(await readFile('home_approved/spec/home_layout.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const output=process.env.HOME_HUD_OUTPUT || 'qa/home-width'; await mkdir(output,{recursive:true});
const results=[];
try {
  for (const [width,height,left,right,bottom] of [[844,390,47,47,21],[852,393,59,59,21],[932,430,59,59,21],[812,375,44,44,21],[932,320,59,59,21],[844,390,47,0,21],[844,390,0,0,0]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const profile={version:3,nickname:'Nene',memberId:'motoki',backgroundId:'bg-01',setupComplete:true};
    await context.addInitScript(profile=>localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile)),profile);
    const page=await context.newPage();
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
    await page.addStyleTag({content:`#safe-area{left:${left}px;right:${right}px;top:0;bottom:${bottom}px}`});
    await page.locator('[data-action="start"]').click();
    await page.waitForFunction(()=>document.querySelector('#stage').dataset.screen==='home');
    await page.evaluate(async()=>{await document.fonts.ready; await Promise.all([...document.images].filter(im=>im.getAttribute('src')).map(im=>im.decode()))});
    const scale=Math.min((width-left-right)/1844,(height-bottom)/853);
    const box=async id=>page.locator(`[data-layer="${id}"]`).boundingBox();
    const player=await box('status_player'),menu=await box('status_menu');
    const inventory=await box('button_inventory'),ready=await box('button_ready');
    const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.05,`${actual} != ${expected}`);
    close(player.x,left);close(player.y,0);close(menu.x+menu.width,width-right);
    const footerBottom=height-(bottom===21?14:0);
    close(inventory.x,left);close(ready.x+ready.width,width-right);close(ready.y+ready.height,footerBottom);
    for (const e of layout.elements.filter(e=>e.kind==='text'||e.kind==='icon')) {
      const actual=await box(e.id);close(actual.width,e.width*scale);close(actual.height,e.height*scale);
    }
    for (const e of layout.elements.filter(e=>e.id.startsWith('status_')||e.id.startsWith('button_'))) {
      const actual=await box(e.id);close(actual.height,e.height*scale);
      assert.match(await page.locator(`[data-layer="${e.id}"]`).getAttribute('style'),/border-image/);
    }
    const name=`${width}x${height}${left!==right?'-asymmetric':bottom===0?'-no-inset':''}`;
    await page.screenshot({path:`${output}/${name}.png`});
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('mrsEnglishV3.profile'))),profile);
    assert.equal(await page.locator('#scene-background').getAttribute('src'),'backgrounds/bg-01.jpg');
    // The expanded outside edges are actionable, not decoration-only extensions.
    await page.mouse.click(left+3,player.height/2);
    await page.waitForFunction(()=>document.querySelector('#stage').dataset.screen==='placeholder/profile');
    await page.locator('[data-action="home"]').click();
    await page.waitForFunction(()=>document.querySelector('#stage').dataset.screen==='home');
    await page.mouse.click(width-right-3,footerBottom-3);
    await page.waitForFunction(()=>document.querySelector('#stage').dataset.screen==='placeholder/ready');
    results.push({viewport:name,safeInsets:{left,right,bottom},scale,topBeforeSafeWidthPercent:1650*scale/(width-left-right)*100,bottomBeforeSafeWidthPercent:1701*scale/(width-left-right)*100,topAfterSafeWidthPercent:100,bottomAfterSafeWidthPercent:100,checks:'Height, icon/text dimensions, nine-slice artwork, safe edges, taps, background and saved profile passed.'});
    await context.close();
  }
  await copyFile('qa/layout/844x390-home.png',`${output}/844x390-before.png`);
  await writeFile(`${output}/results.json`,JSON.stringify({results,referenceScreenshot:'SuperStar reference screenshot was not attached; no direct visual comparison claimed.',device:'Chromium; safe areas simulated. Physical iPhone not tested.'},null,2)+'\n');
  console.log(`${results.length} home viewports passed: full safe width, pinned rows, original heights and text/icon dimensions, edge taps, unchanged background/profile.`);
} finally {await browser.close()}
