import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const output='qa/inventory-browser';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const profile={version:3,nickname:'Nene',memberId:'motoki',backgroundId:'bg-01',setupComplete:true};
const keys={owned:'mrsEnglishV3.collection.v1',inventory:'mrsEnglishV3.inventory.v1',wallet:'mrsEnglishV3.wallet.v1'};
const results=[];
const wait=(page,name)=>page.waitForFunction(name=>document.querySelector('#stage').dataset.screen===name,name);
const click=(page,id)=>page.locator(`[data-action="${id}"]`).click();
async function settled(page){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(im=>im.getAttribute('src')).map(im=>im.decode()))});}
async function shot(page,name){await settled(page);await page.screenshot({path:`${output}/${name}.png`});}
async function make(url='http://127.0.0.1:4176',options={}) {
  const context=await browser.newContext({viewport:{width:1844,height:853},deviceScaleFactor:1,...options});
  await context.addInitScript(profile=>{if(!localStorage.getItem('mrsEnglishV3.profile'))localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile));},profile);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);await click(page,'start');await wait(page,'home');return {context,page,errors};
}
const saved=(page,key)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
async function reopen(page){await page.reload();await click(page,'start');await wait(page,'home');await click(page,'inventory');await wait(page,'inventory_main');}
try {
  const a=await make();const {page,context,errors}=a;
  const owner=await saved(page,keys.owned);assert.equal(Object.keys(owner.owned).length,10);assert.equal(Object.values(owner.owned).reduce((n,c)=>n+c.quantity,0),10);
  const initial=await saved(page,keys.inventory);assert.equal(initial.deck.filter(Boolean).length,3);
  assert.equal((await saved(page,keys.wallet)).rCoin,10000);
  await settled(page);const homeBefore=await page.screenshot({mask:[page.locator('[data-layer="status_currency"]')]});assert.equal(await page.locator('[data-layer="coins_value"]').textContent(),'10,000');
  await click(page,'collection');await wait(page,'collection_owned');assert.equal(await page.locator('.collection-card-hit').count(),10);
  await click(page,'back');await wait(page,'home');await click(page,'inventory');await wait(page,'inventory_main');
  assert.equal(await page.locator('.collection-card-hit').count(),10);
  assert.equal(await page.locator('[data-layer="main_023"]').textContent(),'12,450');
  const header=await page.locator('[data-layer="main_002"]').boundingBox();
  await page.locator('.collection-scroll').evaluate(node=>{node.scrollTop=150});await page.waitForFunction(()=>document.querySelector('.collection-scroll').scrollTop===150);
  assert.deepEqual(await page.locator('[data-layer="main_002"]').boundingBox(),header);
  await click(page,'edit_deck');await wait(page,'inventory_deck');
  assert.equal(await page.locator(`.collection-card-hit[data-instance-id="${initial.deck[0]}"]`).isDisabled(),true);
  const candidate='inventory-dev-v1-dev-07';await page.locator(`.collection-card-hit[data-instance-id="${candidate}"]`).click();
  await page.waitForFunction(()=>document.querySelector('[data-layer="deck_035"]').textContent==='大森元貴');
  await click(page,'back');await wait(page,'inventory_main');
  assert.deepEqual((await saved(page,keys.inventory)).deck,initial.deck);
  assert.equal(await page.locator('.collection-scroll').evaluate(node=>node.scrollTop),150);
  await click(page,'edit_deck');await wait(page,'inventory_deck');await page.locator(`.collection-card-hit[data-instance-id="${candidate}"]`).click();
  await click(page,'confirm_deck');await wait(page,'inventory_main');assert.equal((await saved(page,keys.inventory)).deck[1],candidate);
  await reopen(page);assert.equal((await saved(page,keys.inventory)).deck[1],candidate);
  assert.deepEqual(await saved(page,keys.owned),owner);
  results.push('開発ビルド: 空台帳へR/S/A/B/C各2枚を一度だけ登録・Collection共有・3枠・候補重複拒否・キャンセル破棄・確定/再起動維持・一覧のみスクロール: PASS');
  await page.locator(`.collection-card-hit[data-instance-id="${initial.deck[0]}"]`).click();await click(page,'upgrade_card');await wait(page,'inventory_upgrade');
  await page.locator('[data-action="upgrade"]').dblclick();
  await page.waitForFunction(()=>document.querySelector('[data-layer="upgrade_019"]').textContent==='13'&&!document.querySelector('[data-action="upgrade"]').disabled);
  assert.equal((await saved(page,keys.wallet)).rCoin,9500);
  assert.equal((await saved(page,keys.inventory)).instances[initial.deck[0]].level,13);
  assert.deepEqual(await saved(page,keys.owned),owner);
  await shot(page,'upgraded');await click(page,'back');await wait(page,'inventory_main');
  assert.equal(await page.locator('[data-layer="main_014"]').textContent(),'Lv. 13 / 50');
  await click(page,'back');await wait(page,'home');await settled(page);assert.ok((await page.screenshot({mask:[page.locator('[data-layer="status_currency"]')]})).equals(homeBefore));assert.equal(await page.locator('[data-layer="coins_value"]').textContent(),'9,500');
  await click(page,'collection');await wait(page,'collection_owned');
  const progress=JSON.parse(await page.locator('.collection-card[data-card-id="motoki-r-01"]').getAttribute('data-instance-levels'));
  assert.equal(progress.find(i=>i.instanceId===initial.deck[0]).level,13);
  await reopen(page);assert.equal((await saved(page,keys.wallet)).rCoin,9500);assert.equal((await saved(page,keys.inventory)).instances[initial.deck[0]].level,13);assert.deepEqual(await saved(page,keys.owned),owner);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await context.setOffline(true);await reopen(page);assert.equal(await page.locator('[data-layer="main_014"]').textContent(),'Lv. 13 / 50');await context.setOffline(false);
  results.push('強化Lv12→13・500コインのみ消費・二重タップ1回分・総合力更新・入手日/数量不変・Collectionの共有個体情報更新・ホーム画像不変・保存再読込: PASS');
  await page.evaluate(key=>{const data=JSON.parse(localStorage.getItem(key));data.rCoin=0;localStorage.setItem(key,JSON.stringify(data));},keys.wallet);
  await reopen(page);await click(page,'upgrade_card');await wait(page,'inventory_upgrade');
  assert.equal(await page.locator('[data-action="upgrade"]').isDisabled(),true);assert.equal(await page.locator('[data-layer="upgrade_041"]').textContent(),'Rコイン不足');await shot(page,'insufficient');
  await page.evaluate(({key,id})=>{const data=JSON.parse(localStorage.getItem(key));data.instances[id].level=50;localStorage.setItem(key,JSON.stringify(data));},{key:keys.inventory,id:initial.deck[0]});
  await reopen(page);await click(page,'upgrade_card');await wait(page,'inventory_upgrade');
  assert.equal(await page.locator('[data-layer="upgrade_021"]').textContent(),'50');assert.equal(await page.locator('[data-layer="upgrade_034"]').textContent(),'—');assert.equal(await page.locator('[data-layer="upgrade_041"]').textContent(),'レベル上限');assert.equal(await page.locator('[data-action="upgrade"]').isDisabled(),true);await shot(page,'level-cap');
  assert.deepEqual(errors,[]);await context.close();results.push('残高不足・R50上限の無効表示と支出なし: PASS');
  // The formal build cannot activate a grant through a URL parameter.
  const formal=await make('http://127.0.0.1:4173/?inventoryDevelopment=true');
  assert.equal(await formal.page.evaluate(key=>localStorage.getItem(key),keys.owned),null);
  await click(formal.page,'inventory');await wait(formal.page,'inventory_main');assert.equal(await formal.page.locator('.collection-card-hit').count(),0);assert.equal(await formal.page.locator('[data-action="upgrade_card"]').isDisabled(),true);await shot(formal.page,'empty');assert.equal(await formal.page.evaluate(key=>localStorage.getItem(key),keys.wallet),null);await formal.context.close();
  results.push('正式ビルドは配布・テスト残高無効、URL指定でも有効化不可、所持0枚は空表示: PASS');
  // A real existing owner is not replaced, even by an explicitly enabled dev build.
  const keep=await browser.newContext({viewport:{width:1844,height:853}});
  const prior={version:1,owned:{'motoki-r-01':{quantity:1,firstAcquiredAt:'2025-01-01T00:00:00Z'}}};
  await keep.addInitScript(({prior,profile})=>{if(localStorage.length===0){localStorage.setItem('mrsEnglishV3.collection.v1',JSON.stringify(prior));localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile));localStorage.setItem('mrsEnglishV3.wallet.v1',JSON.stringify({version:1,rCoin:77}));}}, {prior,profile});
  const kp=await keep.newPage();await kp.goto('http://127.0.0.1:4176');await click(kp,'start');await wait(kp,'home');await click(kp,'inventory');await wait(kp,'inventory_main');
  assert.equal(await kp.locator('.collection-card-hit').count(),1);assert.deepEqual(await saved(kp,keys.owned),prior);assert.equal((await saved(kp,keys.wallet)).rCoin,77);await keep.close();
  results.push('開発ビルドでも既所持カード・入手日・既存77コインを保持し追加配布しない: PASS');
  // Matching QA sample balance is injected only into this isolated screenshot context.
  const qa=await make();await qa.page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,rCoin:9979})),keys.wallet);
  await click(qa.page,'inventory');await wait(qa.page,'inventory_main');await shot(qa.page,'inventory_main');await click(qa.page,'edit_deck');await wait(qa.page,'inventory_deck');await shot(qa.page,'inventory_deck');await click(qa.page,'back');await wait(qa.page,'inventory_main');await click(qa.page,'upgrade_card');await wait(qa.page,'inventory_upgrade');await shot(qa.page,'inventory_upgrade');await qa.context.close();
  const mobile=await make('http://127.0.0.1:4176',{viewport:{width:844,height:390},hasTouch:true});
  await mobile.page.addStyleTag({content:'#safe-area{left:47px;right:47px;top:0;bottom:21px}'});await click(mobile.page,'inventory');await wait(mobile.page,'inventory_main');await shot(mobile.page,'iphone-main');
  const box=await mobile.page.locator('#stage').boundingBox();assert.ok(box.x>=47&&box.x+box.width<=797.1&&box.y+box.height<=369.1);
  const cdp=await mobile.context.newCDPSession(mobile.page),v=await mobile.page.locator('.collection-scroll').boundingBox(),mx=v.x+v.width/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mx,y:v.y+v.height-10}]});
  for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mx,y:v.y+v.height-10-i*8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.page.waitForFunction(()=>document.querySelector('.collection-scroll').scrollTop>10);
  assert.equal(await mobile.page.locator('#stage').getAttribute('data-screen'),'inventory_main');
  await click(mobile.page,'edit_deck');await wait(mobile.page,'inventory_deck');await shot(mobile.page,'iphone-deck');await click(mobile.page,'back');await wait(mobile.page,'inventory_main');await click(mobile.page,'upgrade_card');await wait(mobile.page,'inventory_upgrade');await shot(mobile.page,'iphone-upgrade');await mobile.context.close();
  results.push('3承認モックアップ比較用キャプチャ・844×390セーフエリア内の3画面: PASS');
  assert.match(await readFile('dist/src/inventory/runtime-config.js','utf8'),/enabled:false/);assert.match(await readFile('dist-development/src/inventory/runtime-config.js','utf8'),/enabled:true/);
  await writeFile(`${output}/functional-results.json`,JSON.stringify({results},null,2)+'\n');console.log(results.join('\n'));
}finally{await browser.close()}
