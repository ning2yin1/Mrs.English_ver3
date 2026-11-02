import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {cp,mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
const temporary=await mkdtemp(path.join(tmpdir(),'mrs-settings-'));
const oldRoot=path.resolve('dist'),newRoot=path.join(temporary,'new');
await cp(oldRoot,newRoot,{recursive:true});
const original=JSON.parse(await readFile(path.join(oldRoot,'version.json'),'utf8'));
const next={...original,id:original.id==='bbbbbbbbbbbbbbbb'?'cccccccccccccccc':'bbbbbbbbbbbbbbbb',version:'0.2.0'};
await writeFile(path.join(newRoot,'version.json'),JSON.stringify(next));
await writeFile(path.join(newRoot,'src/release.js'),`export const RELEASE=Object.freeze(${JSON.stringify(next)});`);
await writeFile(path.join(newRoot,'sw.js'),(await readFile(path.join(newRoot,'sw.js'),'utf8')).replace(original.id,next.id));
let published=oldRoot,brokenInfo=false,failedAsset=false;
const requests=[];
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf','.jpg':'image/jpeg','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://local'),relative=url.pathname.replace(/^\/game\//,'')||'index.html';
  requests.push(relative);
  try{
    if(!url.pathname.startsWith('/game/'))throw new Error('outside scope');
    if(failedAsset&&relative==='src/screens.js'){res.writeHead(503);res.end('simulated failed update');return;}
    if(brokenInfo&&relative==='version.json'){res.writeHead(brokenInfo==='http'?503:200,{'Content-Type':'application/json'});res.end(brokenInfo==='json'?'{broken':'{"invalid":true}');return;}
    const body=await readFile(path.join(published,relative));
    res.writeHead(200,{'Content-Type':types[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);
  }catch{res.writeHead(404);res.end('missing');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/game/`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const results=[],errors=[];
const profile={version:3,nickname:'Nene',memberId:'motoki',backgroundId:'bg-01',setupComplete:true};
const protectedData={
 'mrsEnglishV3.wallet.v1':JSON.stringify({version:1,rCoin:98765,diamonds:21}),
 'mrsEnglishV3.collection.v1':JSON.stringify({version:1,owned:{'preserved-card':{quantity:3,firstAcquiredAt:'2026-01-01'}}}),
 'mrsEnglishV3.inventory.v1':JSON.stringify({version:1,instances:{'preserved-instance':{catalogId:'preserved-card',level:7}},deck:['preserved-instance',null,null],appliedDevGrants:{done:true}}),
 'mrsEnglishV3.play.v1':JSON.stringify({version:1,revision:3,session:null,records:{'01':{bestScore:54321}},daily:{'2026-11-02':2},results:{old:{score:54321}}}),
 'mrsEnglishV3.shop.v1':JSON.stringify({version:1,preservedGachaHistory:['keep-me']}),
};
const click=(p,id)=>p.locator(`[data-action="${id}"]`).click();
const screen=(p,name)=>p.waitForFunction(name=>document.querySelector('#stage').dataset.screen===name,name);
const openMenu=async p=>{await click(p,'menu');await p.locator('.me-menu-compact[data-state="open"]').waitFor();};
const settings=async p=>{await openMenu(p);await p.getByRole('menuitem',{name:'設定',exact:true}).click();await p.locator('.settings-screen').waitFor();};
const saved=p=>p.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
let debugPage;
try{
 const c=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,reducedMotion:'reduce'});
 await c.addInitScript(({profile,data})=>{if(!localStorage.getItem('mrsEnglishV3.profile')){localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile));for(const[k,v]of Object.entries(data))localStorage.setItem(k,v);}},{profile,data:protectedData});
 const p=await c.newPage();debugPage=p;p.on('pageerror',error=>errors.push(String(error)));
 await p.goto(base);await click(p,'start');await screen(p,'home');
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await p.addStyleTag({content:'#safe-area{left:47px;right:47px;bottom:21px}'});
 const before=await p.locator('.home-hud').evaluate(n=>{const clone=n.cloneNode(true);clone.querySelector('[data-action=menu]')?.removeAttribute('aria-controls');return clone.innerHTML;});
 await openMenu(p);assert.equal(await p.getByRole('menuitem').count(),3);
 const panel=await p.locator('.me-menu-compact').boundingBox();assert.equal(panel.width,240);assert.equal(panel.height,146);
 await click(p,'menu');await p.locator('.me-menu-compact').waitFor({state:'hidden'});
 await openMenu(p);await p.keyboard.press('Escape');assert.equal(await p.locator('[data-action="menu"]').evaluate(n=>document.activeElement===n),true);
 await openMenu(p);await p.getByRole('menuitem',{name:'ログインボーナス'}).click({force:true});await screen(p,'home');
 await openMenu(p);await p.getByRole('menuitem',{name:'遊び方'}).click();await screen(p,'home');
 await openMenu(p);const inventory=await p.locator('[data-action="inventory"]').boundingBox();await p.mouse.click(inventory.x+10,inventory.y+10);await screen(p,'home');await p.locator('.me-menu-compact').waitFor({state:'hidden'});
 assert.equal(await p.locator('.home-hud').evaluate(n=>{const clone=n.cloneNode(true);clone.querySelector('[data-action=menu]')?.removeAttribute('aria-controls');return clone.innerHTML;}),before);
 for(const [w,h,inset]of [[667,375,44],[844,390,47],[932,320,59]]){
  await p.setViewportSize({width:w,height:h});await p.addStyleTag({content:`#safe-area{left:${inset}px;right:${inset}px;bottom:21px}`});await openMenu(p);
  const b=await p.locator('.me-menu-compact').boundingBox(),nav=await p.locator('[data-action="inventory"]').boundingBox();assert.equal(b.width,240);assert.ok(b.x>=inset+7&&b.x+b.width<=w-inset-7);assert.ok(b.y+b.height<=nav.y-7);
  await p.keyboard.press('Tab');await p.keyboard.press('ArrowDown');await p.keyboard.press('Escape');
 }
 await p.setViewportSize({width:844,height:390});
 await mkdir('test-results/menu-settings',{recursive:true});await openMenu(p);await p.screenshot({path:'test-results/menu-settings/menu.png'});await p.keyboard.press('Escape');
 results.push('Menu: dimensions, safe areas, toggle, outside shield, disabled rows, keyboard/focus and unchanged TOP DOM: PASS');
 await settings(p);const sections=await p.locator('.settings-content h2').allTextContents();assert.deepEqual(sections,['カスタマイズ','サウンド','アプリ','その他']);
 await p.locator('[data-edit="nickname"]').click();await screen(p,'nickname');await p.locator('#nickname').fill('');await click(p,'confirm');await screen(p,'nickname');await p.locator('#nickname').fill('  新しい名前  ');await click(p,'confirm');await p.locator('.settings-screen').waitFor();
 await p.locator('[data-edit="member"]').click();await screen(p,'member');await click(p,'hiroto');await p.waitForFunction(()=>document.querySelector('[data-action="hiroto"]').getAttribute('aria-pressed')==='true');await click(p,'confirm');await p.locator('.settings-screen').waitFor();
 await p.locator('[data-edit="background"]').click();await screen(p,'background');assert.equal(await p.getByRole('button',{name:/^背景 /}).count(),22);await click(p,'background_22');await p.waitForFunction(()=>document.querySelector('[data-action="background_22"]').getAttribute('aria-pressed')==='true');await click(p,'confirm');await p.locator('.settings-screen').waitFor();
 await p.locator('[data-edit="nickname"]').click();await p.locator('#nickname').fill('cancel me');await click(p,'back');await p.locator('.settings-screen').waitFor();assert.match(await p.locator('[data-edit="nickname"]').innerText(),/新しい名前/);
 await p.locator('[data-pref="bgmEnabled"]').uncheck();await p.locator('[data-pref="seEnabled"]').uncheck();await p.locator('[data-pref="skipEffects"]').check();
 await p.getByRole('slider',{name:'BGMの音量'}).fill('0');await p.getByRole('slider',{name:'効果音の音量'}).fill('37');
 await p.locator('[data-settings="home"]').click();await screen(p,'home');assert.equal(await p.locator('#scene-background').getAttribute('src'),'backgrounds/bg-22.jpg');assert.match(await p.locator('[data-layer="nickname"]').innerText(),/新しい名前/);assert.match(await p.locator('[data-layer="avatar"] img:last-child').getAttribute('src'),/hiroto/);
 const stored=await saved(p);assert.deepEqual(JSON.parse(stored['mrsEnglishV3.profile']),{...profile,nickname:'新しい名前',memberId:'hiroto',backgroundId:'bg-22'});
 for(const[k,v]of Object.entries(protectedData))assert.equal(stored[k],v);
 await p.reload();await click(p,'start');await screen(p,'home');await settings(p);assert.equal(await p.locator('[data-pref="bgmEnabled"]').isChecked(),false);assert.equal(await p.getByRole('slider',{name:'効果音の音量'}).inputValue(),'37');assert.equal(await p.locator('[data-pref="skipEffects"]').isChecked(),true);
 await p.locator('.settings-content').evaluate(n=>n.scrollTop=0);await p.screenshot({path:'test-results/menu-settings/settings.png'});
 results.push('Settings: all customization, cancel/empty validation, sound/skip controls, restart persistence, TOP portrait/background/name and protected game storage: PASS');
 const oldTab=await c.newPage();await oldTab.goto(base);await click(oldTab,'start');await screen(oldTab,'home');
 requests.length=0;await p.locator('[data-settings="check"]').click();await p.getByText('最新バージョンです',{exact:true}).waitFor();assert.deepEqual(requests,['version.json']);
 brokenInfo=true;await p.locator('[data-settings="check"]').click();await p.getByText(/更新情報が不正/).waitFor();brokenInfo='json';await p.locator('[data-settings="check"]').click();await p.getByText(/更新情報が不正/).waitFor();
 brokenInfo='http';await p.locator('[data-settings="check"]').click();await p.getByText('更新情報を取得できませんでした。接続を確認して再試行してください。',{exact:true}).waitFor();brokenInfo=false;
 await c.setOffline(true);await p.locator('[data-settings="check"]').click();await p.getByText(/オフラインのため/).waitFor();await c.setOffline(false);
 published=newRoot;requests.length=0;await p.locator('[data-settings="check"]').click();await p.locator('[data-settings="apply"]').waitFor();assert.deepEqual(requests,['version.json']);assert.match(await p.locator('[data-version]').innerText(),new RegExp(original.id));
 // Automatic worker detection must also remain lightweight before explicit consent.
 requests.length=0;await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});await p.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
 assert.ok(requests.every(url=>url==='sw.js'),requests.join(','));
 failedAsset=true;await p.locator('[data-settings="apply"]').click();await p.getByText('更新ファイルを取得できませんでした。接続を確認して再試行してください。',{exact:true}).waitFor();
 assert.match(await p.locator('[data-version]').innerText(),new RegExp(original.id));assert.deepEqual(await saved(p),stored);
 failedAsset=false;await p.locator('[data-settings="apply"]').click();await p.waitForFunction(()=>document.querySelector('#stage').dataset.screen==='title');await click(p,'start');await screen(p,'home');await settings(p);
 assert.match(await p.locator('[data-version]').innerText(),new RegExp(next.id));assert.deepEqual(await saved(p),stored);
 await settings(oldTab);assert.match(await oldTab.locator('[data-version]').innerText(),new RegExp(original.id));await oldTab.locator('[data-settings="check"]').click();await oldTab.locator('[data-settings="apply"]').waitFor();await oldTab.close();
 await p.locator('[data-settings="check"]').click();await p.getByText('最新バージョンです',{exact:true}).waitFor();
 await c.setOffline(true);await p.reload();await click(p,'start');await screen(p,'home');await settings(p);assert.match(await p.locator('[data-version]').innerText(),new RegExp(next.id));assert.deepEqual(await saved(p),stored);await c.setOffline(false);
 results.push('Updates under /game/: exact one-file checks, latest/new/invalid/offline, automatic worker waits without assets, failed download retains old release, retry activation/reload, all storage preserved and updated app works offline: PASS');
 assert.deepEqual(errors,[]);
 await c.close();
 // Storage denial is reported while controls retain settings for the current session.
 const denied=await browser.newContext({viewport:{width:667,height:375}});const d=await denied.newPage();await denied.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw new DOMException('blocked','SecurityError');};});await d.goto(base);await click(d,'start');for(const name of ['member','background','home']){await click(d,'confirm');await screen(d,name);}await settings(d);await d.locator('[data-pref="bgmEnabled"]').uncheck();await d.locator('[data-settings="home"]').click();await settings(d);assert.equal(await d.locator('[data-pref="bgmEnabled"]').isChecked(),false);assert.match(await d.locator('#notice').innerText(),/保存できません/);await denied.close();
 results.push('Denied storage: visible warning and in-session settings retained: PASS');
 // Legacy worker migration: the pre-settings app cannot send PREPARE_UPDATE.
 const legacyRoot=path.join(temporary,'legacy');await cp(newRoot,legacyRoot,{recursive:true});
 const legacyWorker=`const CACHE='mrs-english-v3-legacy-fixture';
self.addEventListener('install',e=>e.waitUntil((async()=>{const paths=await(await fetch('./precache.json',{cache:'no-store'})).json();const cache=await caches.open(CACHE);let i=0;async function fill(){while(i<paths.length)await cache.add(new URL(paths[i++],self.registration.scope));}await Promise.all([fill(),fill()]);await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith((async()=>await(await caches.open(CACHE)).match(e.request)||fetch(e.request))());});`;
 await writeFile(path.join(legacyRoot,'sw.js'),legacyWorker);published=legacyRoot;
 const legacy=await browser.newContext({viewport:{width:844,height:390}});await legacy.addInitScript(profile=>{if(!localStorage.getItem('mrsEnglishV3.profile'))localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile));},profile);
 const lp=await legacy.newPage();await lp.goto(base);await click(lp,'start');await screen(lp,'home');await lp.evaluate(()=>navigator.serviceWorker.ready);await lp.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const legacyData=await saved(lp);published=newRoot;
 await lp.evaluate(async()=>{const changed=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));await(await navigator.serviceWorker.getRegistration()).update();await changed;});
 await lp.reload();await click(lp,'start');await screen(lp,'home');await settings(lp);assert.match(await lp.locator('[data-version]').innerText(),new RegExp(next.id));assert.deepEqual(await saved(lp),legacyData);await legacy.close();
 results.push('Legacy worker: one-time automatic bootstrap reaches update-capable release and retains profile: PASS');
 // A clean, real play session still starts, accepts an answer, pauses and returns to TOP.
 const play=await browser.newContext({viewport:{width:844,height:390},reducedMotion:'reduce'});await play.addInitScript(profile=>{if(!localStorage.getItem('mrsEnglishV3.profile'))localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile));},profile);
 const pp=await play.newPage();pp.on('pageerror',e=>errors.push(String(e)));await pp.goto(base);await click(pp,'start');await screen(pp,'home');await click(pp,'ready');await screen(pp,'play_ready');await click(pp,'start');await screen(pp,'play_input');await click(pp,'option:0');await pp.waitForFunction(()=>JSON.parse(localStorage.getItem('mrsEnglishV3.play.v1')).session.inputs[0].selected!==null);await click(pp,'confirm');await screen(pp,'play_feedback');await click(pp,'pause');await screen(pp,'play_paused');await click(pp,'quit');await screen(pp,'play_quitConfirm');await click(pp,'abort');await screen(pp,'play_ready');await click(pp,'back');await screen(pp,'home');await settings(pp);await pp.locator('[data-settings="home"]').click();await screen(pp,'home');await play.close();
 results.push('Play smoke: start, answer/feedback, pause, abort, TOP/settings round-trip: PASS');assert.deepEqual(errors,[]);
 console.log(results.join('\n'));await writeFile('test-results/menu-settings/results.json',JSON.stringify({results,errors},null,2));
}catch(error){
 console.log('Completed checks:',results,'Page errors:',errors);
 if(debugPage&&!debugPage.isClosed()){
   console.log(await debugPage.evaluate(()=>({screen:document.querySelector('#stage').dataset.screen,notice:document.querySelector('#notice').textContent,updateStatus:document.querySelector('[data-update-status]')?.textContent})));
   await debugPage.screenshot({path:'test-results/menu-settings/failure.png'});
 }
 throw error;
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(temporary,{recursive:true,force:true});}
