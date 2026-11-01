import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='qa/shop-browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const profile={version:3,nickname:'Nene',memberId:'motoki',backgroundId:'bg-01',setupComplete:true};
const key={profile:'mrsEnglishV3.profile',owned:'mrsEnglishV3.collection.v1',inventory:'mrsEnglishV3.inventory.v1',wallet:'mrsEnglishV3.wallet.v1',shop:'mrsEnglishV3.shop.v1'};
const results=[],errors=[];
const wait=async(p,n)=>{await p.waitForFunction(n=>document.querySelector('#stage').dataset.screen===n,n);if(n==='shop_results')await p.waitForFunction(()=>!document.querySelector('[data-action="ok"]').disabled);};
const button=(p,id)=>p.locator(`[data-action="${id}"]`);
const click=async(p,id)=>{await button(p,id).click();};
const saved=(p,k)=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),k);
const count=data=>Object.values(data.owned).reduce((n,c)=>n+c.quantity,0);
const shot=async(p,n)=>{await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(im=>im.getAttribute('src')).map(im=>im.decode()))});await p.screenshot({path:`${out}/${n}.png`});};
const observe=p=>p.on('pageerror',e=>errors.push(String(e)));
async function home(p){await p.reload();await click(p,'start');await wait(p,'home');}
try{
  // Same six mockup compositions; QA entry uses memory, never localStorage or shipped assets.
  const qa=await browser.newContext({viewport:{width:1844,height:853},reducedMotion:'reduce'}),q=await qa.newPage();observe(q);
  await q.goto('http://127.0.0.1:4175/dev/shop.html');await wait(q,'shop_main');await shot(q,'01_shop_main');
  await click(q,'buy_10');await wait(q,'shop_confirm');await shot(q,'02_purchase_confirm');await click(q,'purchase');await wait(q,'shop_opening');await shot(q,'03_pack_opening');
  await click(q,'open_button');await wait(q,'shop_back');await button(q,'flip').waitFor();await q.waitForFunction(()=>!document.querySelector('[data-action="flip"]').disabled);await shot(q,'04_card_back');
  await click(q,'flip');await wait(q,'shop_reveal');await q.waitForFunction(()=>!document.querySelector('[data-action="next"]').disabled);await shot(q,'05_card_reveal');
  await click(q,'next');await wait(q,'shop_back');await click(q,'skip');await wait(q,'shop_results');await shot(q,'06_results');assert.equal(await q.evaluate(()=>localStorage.length),0);await qa.close();
  results.push('承認済み6画面を独立画像・文字・操作部品で撮影、QA残高・固定抽選はメモリ限定: PASS');
  const motion=await browser.newContext({viewport:{width:844,height:390},hasTouch:true}),m=await motion.newPage();observe(m);
  const begin=async()=>{await m.goto('http://127.0.0.1:4175/dev/shop.html');await wait(m,'shop_main');await click(m,'buy_10');await wait(m,'shop_confirm');await click(m,'purchase');await wait(m,'shop_opening');await click(m,'open_button');await wait(m,'shop_back');await m.waitForFunction(()=>!document.querySelector('[data-action="flip"]').disabled);};
  await begin();
  for(let i=0;i<10;i++){
    await click(m,'flip');await wait(m,'shop_reveal');
    if(i===0){await m.waitForFunction(()=>document.querySelectorAll('.shop-particle').length===20);await shot(m,'iphone-R-animation');}
    await m.waitForFunction(()=>!document.querySelector('[data-action="next"]').disabled);
    assert.equal(await m.locator('[data-layer="05_card_reveal_005"]').textContent(),`${i+1} / 10`);
    if(i===9)await shot(m,'iphone-S-reveal');
    await click(m,'next');await wait(m,i===9?'shop_results':'shop_back');
    if(i!==9)await m.waitForFunction(()=>!document.querySelector('[data-action="flip"]').disabled);
  }
  assert.equal(await m.locator('[data-result-index]').count(),10);
  // Skip while the 3D flip and while rarity FX are in progress; stale timers cannot advance afterward.
  for(const phase of ['flip','reveal']){
    await begin();await click(m,'flip');if(phase==='reveal')await wait(m,'shop_reveal');await click(m,'skip');await wait(m,'shop_results');await m.waitForTimeout(1300);assert.equal(await m.locator('#stage').getAttribute('data-screen'),'shop_results');assert.equal(await m.locator('[data-result-index]').count(),10);
  }
  assert.equal(await m.evaluate(()=>localStorage.length),0);await motion.close();
  results.push('通常モーションで全10枚を公開（R/S/A/B/C）、R金色20粒子・S演出、回転中/レア演出中のスキップと古いタイマー停止: PASS');
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});
  // Isolated test browser only: start with the real development seed, then use the FORMAL build.
  await context.addInitScript(profile=>{if(!localStorage.getItem('mrsEnglishV3.profile'))localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile));},profile);
  const p=await context.newPage();observe(p);await p.goto('http://127.0.0.1:4176');await click(p,'start');await wait(p,'home');
  const seed={owned:await saved(p,key.owned),inventory:await saved(p,key.inventory)};assert.equal(count(seed.owned),10);
  // Transfer this user's existing data into a separate formal-build origin, never alter actual user storage.
  const initial=await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  await p.goto('http://127.0.0.1:4173');await p.evaluate(initial=>{for(const [k,v]of Object.entries(initial))localStorage.setItem(k,v);},initial);await home(p);
  await p.addStyleTag({content:'#safe-area{left:47px;right:47px;top:0;bottom:21px}'});await shot(p,'iphone-home-before');
  await click(p,'shop');await wait(p,'shop_main');await shot(p,'iphone-shop-main');
  const b=await p.locator('#stage').boundingBox();assert.ok(b.x>=47&&b.x+b.width<=797.1&&b.y+b.height<=369.1);
  for(const [n,price]of [[1,1000],[5,5000],[10,10000]]){
    await click(p,`buy_${n}`);await wait(p,'shop_confirm');assert.ok((await p.locator('.shop-root').innerText()).includes(price.toLocaleString('en-US')));await click(p,'cancel');await wait(p,'shop_main');
  }
  assert.equal((await saved(p,key.wallet)).rCoin,10000);
  await click(p,'welcome_10');await wait(p,'shop_confirm');await shot(p,'iphone-free-confirm');await button(p,'purchase').dblclick();await wait(p,'shop_opening');await shot(p,'iphone-opening');
  let shop=await saved(p,key.shop);const receipt=shop.receipts[shop.pendingPurchaseId];assert.equal(receipt.count,10);assert.equal(receipt.pricePaid,0);assert.ok(['R','S'].includes(receipt.results[9].rarity));assert.equal(count(await saved(p,key.owned)),20);assert.equal((await saved(p,key.wallet)).rCoin,10000);
  for(const [id,old]of Object.entries(seed.inventory.instances))assert.deepEqual((await saved(p,key.inventory)).instances[id],old);
  assert.deepEqual((await saved(p,key.inventory)).deck,seed.inventory.deck);
  for(const [id,old]of Object.entries(seed.owned.owned))assert.equal((await saved(p,key.owned)).owned[id].firstAcquiredAt,old.firstAcquiredAt);
  // Restart while unopened: committed cards and exact result receipt must survive once.
  await home(p);await p.addStyleTag({content:'#safe-area{left:47px;right:47px;top:0;bottom:21px}'});await click(p,'shop');await wait(p,'shop_results');assert.deepEqual((await saved(p,key.shop)).receipts[receipt.purchaseId],receipt);assert.equal(count(await saved(p,key.owned)),20);assert.equal(await p.locator('[data-result-index]').count(),10);await shot(p,'iphone-results');
  await click(p,'inventory');await wait(p,'inventory_main');assert.equal(await p.locator('.collection-card-hit').count(),20);await click(p,'back');await wait(p,'home');await click(p,'collection');await wait(p,'collection_owned');
  const quantities=await p.locator('.collection-card-hit').count();assert.ok(quantities>=10);await click(p,'back');await wait(p,'home');await shot(p,'iphone-home-after');
  assert.ok((await readFile(`${out}/iphone-home-before.png`)).equals(await readFile(`${out}/iphone-home-after.png`)), 'TOP pixels unchanged');
  await click(p,'shop');await wait(p,'shop_main');assert.equal(await button(p,'welcome_10').count(),0);
  results.push('正式無料10枚: 開発10枚を保持して20個体、Lv/入手日/編成/残高維持、二重クリック・再起動重複なし、Collection/Inventory共有、TOP画像不変: PASS');
  // Paid 1 and 5, real animations and 1/5 result arrangement; no reseeding or wallet fixture required.
  for(const n of [1,5]){
    const before=count(await saved(p,key.owned)),coins=(await saved(p,key.wallet)).rCoin;
    await click(p,`buy_${n}`);await wait(p,'shop_confirm');await button(p,'purchase').dblclick();await wait(p,'shop_opening');
    const raw=await saved(p,key.shop),r=raw.receipts[raw.pendingPurchaseId];assert.equal(r.count,n);assert.equal(count(await saved(p,key.owned)),before+n);assert.equal((await saved(p,key.wallet)).rCoin,coins-n*1000);
    await click(p,'open_button');await wait(p,'shop_back');await p.waitForFunction(()=>!document.querySelector('[data-action="flip"]').disabled);await shot(p,`iphone-back-${n}`);
    await click(p,'flip');await wait(p,'shop_reveal');await p.waitForFunction(()=>!document.querySelector('[data-action="next"]').disabled);await shot(p,`iphone-reveal-${n}`);
    if(n===1){await click(p,'next');}else{await click(p,'next');await wait(p,'shop_back');await click(p,'skip');}
    await wait(p,'shop_results');await shot(p,`iphone-results-${n}`);assert.equal(await p.locator('[data-result-index]').count(),n);assert.deepEqual((await saved(p,key.shop)).receipts[r.purchaseId],r);assert.equal(count(await saved(p,key.owned)),before+n);
    await click(p,'ok');await wait(p,'shop_main');
  }
  await click(p,'buy_10');await wait(p,'shop_confirm');assert.equal(await button(p,'purchase').isDisabled(),true);await shot(p,'iphone-insufficient');await click(p,'cancel');await wait(p,'shop_main');
  // Remaining 4000 coins: skip DURING pack animation, fixed purchase only once.
  await click(p,'buy_1');await wait(p,'shop_confirm');await click(p,'purchase');await wait(p,'shop_opening');await click(p,'open_button');await click(p,'skip');await wait(p,'shop_results');const once=await saved(p,key.owned);await p.waitForTimeout(1500);assert.equal(p.locator('#stage')&&await p.locator('#stage').getAttribute('data-screen'),'shop_results');assert.deepEqual(await saved(p,key.owned),once);await click(p,'ok');await wait(p,'shop_main');
  await home(p);await click(p,'shop');await wait(p,'shop_main');assert.equal((await saved(p,key.wallet)).rCoin,3000);assert.equal(count(await saved(p,key.owned)),27);assert.equal(await button(p,'welcome_10').count(),0);
  results.push('1/5枚の購入・実演出・めくる/次へ・1/5枚結果配置・開封中スキップ・不足時無効・再起動後27個体/3000コイン・844×390セーフエリア: PASS');
  await context.close();assert.deepEqual(errors,[]);
  await writeFile(`${out}/functional-results.json`,JSON.stringify({results,errors},null,2)+'\n');console.log(results.join('\n'));
}finally{await browser.close();}
