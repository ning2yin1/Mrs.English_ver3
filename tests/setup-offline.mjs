import{chromium}from'playwright';import assert from'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const c=await browser.newContext({viewport:{width:844,height:390}}),p=await c.newPage();p.setDefaultTimeout(60000);await p.goto('http://127.0.0.1:4173');await p.waitForFunction(()=>document.querySelector('#stage').dataset.screen==='title');
 const manifest=await p.evaluate(async()=>{const paths=await(await fetch('./precache.json')).json();await navigator.serviceWorker.ready;return paths;});
 const state=await p.evaluate(async paths=>{const cache=await caches.open((await caches.keys()).find(k=>k.startsWith('mrs-english-v3-')));return{missing:(await Promise.all(paths.map(async path=>await cache.match(new URL(path,location.href))?null:path))).filter(Boolean),keys:(await cache.keys()).length};},manifest);
 assert.deepEqual(state.missing,[]);await p.reload();await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await c.setOffline(true);await p.reload();await p.waitForFunction(()=>document.querySelector('#stage').dataset.screen==='title');
 await p.locator('[data-action=start]').click();await p.waitForFunction(()=>document.querySelector('#stage').dataset.screen==='nickname');await p.locator('#nickname').fill('Offline');await p.locator('[data-action=confirm]').click();await p.waitForFunction(()=>document.querySelector('#stage').dataset.screen==='member');await p.locator('[data-action=confirm]').click();await p.waitForFunction(()=>document.querySelector('#stage').dataset.screen==='background');await p.waitForFunction(()=>[...document.querySelectorAll('[data-layer^=background_tile_]')].filter(im=>im.complete&&im.naturalWidth>0).length===22);
 console.log(`Complete offline cache (${state.keys} entries), offline reload and setup, all 22 original backgrounds: PASS`);await c.close();
}finally{await browser.close();}
