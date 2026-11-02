import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {emptyBucket,ensurePeriods,readMissions,MISSION_KEY,periodKeys} from '../src/mission/engine.js';
const url=process.env.TEST_URL||'http://127.0.0.1:4173';
const output='test-results/mission';await mkdir(output,{recursive:true});
const data=readMissions({getItem:()=>null}),keys=ensurePeriods(data,new Date().toISOString());
Object.assign(data.periods.daily[keys.daily],{stage_clear:1,correct_answers:9,true_correct_streak_max:5,grammarIds:['01'],rewards:{D01:'sample-d1',D03:'sample-d3'}});
Object.assign(data.periods.weekly[keys.weekly],{stage_clear:8,grammarIds:['01','02','03','04','05'],perfect_stage_clear:3,successful_upgrade:3,rewards:{W04:'sample-w4',W05:'sample-w5'}});
const profile={version:3,nickname:'Nene',memberId:'motoki',backgroundId:'bg-01',setupComplete:true};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const results=[],errors=[],missing=[];let page;
const click=(p,id)=>p.locator(`[data-action="${id}"]`).click();
const screen=(p,name)=>p.waitForFunction(name=>document.querySelector('#stage').dataset.screen===name,name);
async function shot(name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${output}/${name}.png`});}
try{
 const c=await browser.newContext({viewport:{width:1536,height:710},reducedMotion:'reduce'});
 await c.addInitScript(({profile,data,key})=>{if(!localStorage.getItem('mrsEnglishV3.profile')){localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile));localStorage.setItem(key,JSON.stringify(data));localStorage.setItem('mrsEnglishV3.wallet.v1',JSON.stringify({version:1,rCoin:600,diamonds:21}));}},{profile,data,key:MISSION_KEY});
 page=await c.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&!/precache|favicon/.test(r.url()))missing.push(r.url());});
 const requests=[];page.on('request',r=>requests.push(r.url()));await page.goto(url);await click(page,'start');await screen(page,'home');
 assert.ok(!requests.some(u=>/references\/mission|mission_background|mission\/skin.css/.test(u)));
 await click(page,'mission');await page.locator('.me-mission').waitFor();await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('.me-mission__row').count(),6);assert.deepEqual(await page.locator('.me-mission__progress-value').allTextContents(),['1 / 1','9 / 15','5 / 5','1 / 2','0 / 1','2 / 5']);
 assert.equal(await page.locator('.me-mission__summary strong').innerText(),'2 / 5');assert.equal(await page.locator('.me-mission__row[data-state="completed"]').count(),2);assert.equal(await page.getByRole('progressbar').count(),6);
 const header=await page.locator('.me-mission__header').boundingBox(),frame=await page.locator('.me-mission__list-frame').boundingBox();assert.ok(Math.abs(header.x-80)<1&&Math.abs(header.y-18)<1&&Math.abs(header.width-1376)<1);assert.ok(Math.abs(frame.y-166)<2);await shot('daily-1536');
 await page.getByRole('tab',{name:'ウィークリー'}).click();assert.deepEqual(await page.locator('.me-mission__progress-value').allTextContents(),['8 / 15','0 / 3','5 / 10','3 / 3','3 / 3','2 / 5']);assert.match(await page.locator('[data-mission-id="W06"] .me-mission__reward-amount').innerText(),/20/);await shot('weekly-1536');
 for(const [width,height,left,right,bottom]of [[844,390,47,47,21],[852,393,59,59,21],[667,375,44,44,21]]){
  await page.setViewportSize({width,height});await page.addStyleTag({content:`#safe-area{left:${left}px;right:${right}px;bottom:${bottom}px}`});
  await page.waitForFunction(({left,right})=>{const r=document.querySelector('.me-mission__header').getBoundingClientRect();return r.left>=left&&r.right<=innerWidth-right;},{left,right});
  const dims=await page.locator('.me-mission').evaluate(n=>({width:n.scrollWidth,visible:n.clientWidth}));assert.ok(dims.width<=dims.visible);
  for(const b of await page.locator('.me-mission button').all()){const r=await b.boundingBox();assert.ok(r.height>=44&&r.width>=44);}
  await page.locator('.me-mission__list').evaluate(n=>n.scrollTop=n.scrollHeight);await page.locator('[data-mission-id=W06]').waitFor({state:'visible'});await shot(`weekly-${width}`);
 }
 results.push('Approved daily/weekly sample: 6 dynamic rows, exact values/state/rewards, reference header/frame placement; 844/852/667 landscape safe areas, >=44px controls, list-only scroll: PASS');
 // Post-install events flow through the real durable journal; one shared toast follows every route.
 await page.getByRole('button',{name:'ホームへ戻る',exact:true}).click();await screen(page,'home');
 await page.evaluate(async()=>{const {MISSION_KEY}=await import('./src/mission/engine.js');localStorage.removeItem(MISSION_KEY);});
 const event=async e=>page.evaluate(async e=>{const {planMissionEvent}=await import('./src/mission/engine.js'),{persistence}=await import('./src/inventory/persistence.js');const db=persistence();await db.run(storage=>{const p=planMissionEvent(storage,{...e,at:new Date().toISOString()});db.commitDurable(storage,p.values,p.expected);});},e);
 for(let i=0;i<5;i++)await event({id:`browser-answer-${i}`,type:'answer',stageId:'browser',index:i,correct:true});
 await page.locator('.me-mission-toast[data-phase=hold]').waitFor();assert.match(await page.locator('.me-mission-toast').innerText(),/コンボに挑戦/);assert.match(await page.locator('.me-mission-toast').innerText(),/300 R/);
 assert.equal(await page.locator('.me-mission-toast').evaluate(n=>getComputedStyle(n).pointerEvents),'none');await page.locator('.me-mission-toast').evaluate(n=>n.dataset.identity='shared');await shot('notification-home');
 await click(page,'inventory');await screen(page,'inventory_main');assert.equal(await page.locator('.me-mission-toast').getAttribute('data-identity'),'shared');assert.equal(await page.locator('.me-mission-toast').count(),1);await shot('notification-inventory');
 await page.getByRole('button',{name:'ホームに戻る',exact:true}).click();await screen(page,'home');await click(page,'shop');await screen(page,'shop_main');
 await event({id:'browser-clear',type:'clear',grammarId:'01',difficulty:'NORMAL',total:10,correctCount:10});
 await page.locator('.me-mission-toast[data-phase=hold] .me-mission-toast__name').filter({hasText:'今日の英語学習'}).waitFor();
 assert.equal(await page.locator('.me-mission-toast').count(),1);assert.equal(await page.locator('.me-mission-toast').getAttribute('data-identity'),'shared');await shot('notification-shop');
 await page.getByRole('button',{name:'ホームに戻る',exact:true}).click();await screen(page,'home');await click(page,'ready');await screen(page,'play_ready');await page.locator('.me-mission-toast__name').filter({hasText:'難易度アップ！'}).waitFor();await shot('notification-play');
 await page.getByRole('button',{name:'ホームに戻る',exact:true}).click();await screen(page,'home');
 const wallet=await page.evaluate(()=>JSON.parse(localStorage.getItem('mrsEnglishV3.wallet.v1')));assert.deepEqual(wallet,{version:1,rCoin:1500,diamonds:21});
 assert.equal(await page.locator('[data-layer=coins_value]').getAttribute('aria-label'),'Rコイン 1,500');assert.equal(await page.locator('[data-layer=diamonds_value]').getAttribute('aria-label'),'ダイヤ 21');
 for(let i=0;i<10;i++)await event({id:`browser-more-${i}`,type:'answer',stageId:'more',index:i,correct:true});
 await event({id:'browser-second-grammar',type:'clear',grammarId:'02',difficulty:'EASY',total:10,correctCount:0});
 await page.locator('.me-mission-toast[data-phase=hold] .me-mission-toast__name').filter({hasText:'デイリー完全達成'}).waitFor();
 assert.match(await page.locator('.me-mission-toast__reward span').innerText(),/＋5/);assert.match(await page.locator('.me-mission-toast__reward img').getAttribute('src'),/diamond/);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('mrsEnglishV3.wallet.v1'))),{version:1,rCoin:2100,diamonds:26});await shot('notification-diamond');
 await page.reload();await click(page,'start');await screen(page,'home');await click(page,'mission');await page.locator('.me-mission').waitFor();assert.equal(await page.locator('[data-mission-id=D03]').getAttribute('data-state'),'completed');assert.equal(await page.locator('[data-mission-id=D01]').getAttribute('data-state'),'completed');assert.equal(await page.locator('.me-mission-toast').count(),0);
 results.push('Actual durable progress/reward outbox -> one shared pointer-transparent queued toast across TOP/Inventory/Shop/READY; live wallet, restart retains progress/rewards without replay: PASS');
 // Existing Inventory UI shows the new extra cost; no new upgrade screen is introduced.
 const upgrade=await browser.newContext({viewport:{width:844,height:390},reducedMotion:'reduce'});await upgrade.addInitScript(profile=>{if(!localStorage.getItem('mrsEnglishV3.profile'))localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile));},profile);const up=await upgrade.newPage();up.on('pageerror',e=>errors.push(String(e)));await up.goto(url);await click(up,'start');await screen(up,'home');
 await up.evaluate(async()=>{const {createInventoryStore}=await import('./src/inventory/store.js');const json=async p=>(await fetch(p)).json();const [catalog,definitions,balance,seed]=await Promise.all(['layouts/collection/catalog.json','data/inventory/card_definitions.example.json','data/inventory/balance.example.json','data/inventory/dev_seed.example.json'].map(json));const store=createInventoryStore({catalog,definitions,balance});await store.seedDevelopment(seed,{enabled:true,testCoins:10000});const wallet=JSON.parse(localStorage.getItem('mrsEnglishV3.wallet.v1'));wallet.diamonds=4;localStorage.setItem('mrsEnglishV3.wallet.v1',JSON.stringify(wallet));});
 await click(up,'inventory');await screen(up,'inventory_main');await click(up,'upgrade_card');await screen(up,'inventory_upgrade');assert.equal(await up.locator('[data-action=upgrade]').isDisabled(),true);assert.match(await up.locator('[data-layer=diamond-cost]').innerText(),/所持 4 ／ 必要 5/);
 await up.evaluate(()=>{const key='mrsEnglishV3.wallet.v1',w=JSON.parse(localStorage.getItem(key));w.diamonds=5;localStorage.setItem(key,JSON.stringify(w));window.dispatchEvent(new Event('mrs-progress-change'));});await up.waitForFunction(()=>!document.querySelector('[data-action=upgrade]').disabled);await up.screenshot({path:`${output}/upgrade-diamonds.png`});await click(up,'upgrade');await up.waitForFunction(()=>JSON.parse(localStorage.getItem('mrsEnglishV3.wallet.v1')).diamonds===0);assert.equal(await up.evaluate(()=>JSON.parse(localStorage.getItem('mrsEnglishV3.wallet.v1')).rCoin),9500);await upgrade.close();
 results.push('Daily all-complete diamond toast and actual existing Inventory UI: R 4 diamonds blocked, 5 accepted, coin and diamond debit committed together: PASS');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log(results.join('\n'));await writeFile(`${output}/results.json`,JSON.stringify({results,errors,missing},null,2));await c.close();
} catch(error){if(page&&!page.isClosed()){console.log('Screen',await page.locator('#stage').getAttribute('data-screen'),'notice',await page.locator('#notice').innerText(),errors);await page.screenshot({path:`${output}/failure.png`});}throw error;}finally{await browser.close();}
