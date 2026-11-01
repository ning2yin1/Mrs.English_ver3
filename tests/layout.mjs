import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox'] });
const baseURL = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = 'qa/layout';
await mkdir(output, {recursive:true});
const results = [];
try {
  for (const [width,height,inset,bottom] of [[844,390,47,21],[852,393,59,21],[932,430,59,21],[812,375,44,21],[1844,853,0,0]]) {
    const context = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(baseURL);
    // Chromium's viewport has no physical notch: emulate the CSS safe rectangle explicitly.
    await page.addStyleTag({ content:`#safe-area { left:${inset}px; right:${inset}px; top:0px; bottom:${bottom}px; }` });
    const wait = screen => page.waitForFunction(screen => document.querySelector('#stage').dataset.screen === screen, screen);
    for (const screen of ['title','nickname','member','background','home']) {
      await wait(screen);
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(im => im.getAttribute('src')).map(im => im.decode())); });
      const metrics = await page.evaluate(() => {
        const bg = document.querySelector('#scene-background');
        const stage = document.querySelector('#stage');
        const box = node => { const r=node.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
        const matrix = new DOMMatrix(getComputedStyle(stage).transform);
        return { background:box(bg), ui:box(stage), scaleX:matrix.a, scaleY:matrix.d,
          objectFit:getComputedStyle(bg).objectFit, source:bg.getAttribute('src'), loaded:bg.complete && bg.naturalWidth>0,
          nestedBackground:!!stage.querySelector('[data-layer="photo_background"], [data-layer="background"]') };
      });
      assert.deepEqual(metrics.background, {left:0,top:0,right:width,bottom:height,width,height});
      assert.equal(metrics.objectFit, 'cover'); assert.equal(metrics.loaded,true); assert.equal(metrics.nestedBackground,false);
      assert.equal(metrics.source, ['title','nickname'].includes(screen) ? 'assets/photos/top_original.jpg' : 'backgrounds/bg-01.jpg');
      assert.equal(metrics.scaleX,metrics.scaleY);
      const expectedScale = Math.min((width-2*inset)/1844,(height-bottom)/853);
      assert.ok(Math.abs(metrics.scaleX-expectedScale) < .000001);
      assert.ok(metrics.ui.left >= inset-.01 && metrics.ui.right <= width-inset+.01);
      assert.ok(metrics.ui.top >= -.01 && metrics.ui.bottom <= height-bottom+.01);
      await page.screenshot({path:`${output}/${width}x${height}-${screen}.png`});
      results.push({ viewport:`${width}x${height}`, screen, safeInsets:{left:inset,right:inset,top:0,bottom}, ...metrics });
      if (screen !== 'home') await page.locator(`[data-action="${screen === 'title' ? 'start' : 'confirm'}"]`).click();
    }
    // Width-fitting and height-fitting layouts must both retain a safe UI over the photograph.
    assert.deepEqual(errors,[]);
    await context.close();
  }
  await writeFile(`${output}/results.json`,JSON.stringify({checks:results.length, results, limitation:'Chromium with explicitly simulated safe rectangles; physical iPhone Safari and keyboard not tested.'},null,2)+'\n');
  console.log(`${results.length} screen/viewport combinations passed: full-viewport cover background, uniform UI scale, safe-area containment.`);
} finally { await browser.close(); }
