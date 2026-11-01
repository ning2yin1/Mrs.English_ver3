import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
const fixture=JSON.parse(await readFile('qa/collection/owned_fixture.json','utf8'));
const profile={version:3,nickname:'Nene',memberId:'motoki',backgroundId:'bg-01',setupComplete:true};
const key='mrsEnglishV3.collection.v1';
const output='qa/collection-browser';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];
async function make(ledger,{width=1844,height=853,touch=false}={}) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,deviceScaleFactor:1});
  await context.addInitScript(({profile,key,ledger})=>{
    if(!localStorage.getItem('mrsEnglishV3.profile'))localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile));
    if(ledger!==undefined&&localStorage.getItem(key)===null)localStorage.setItem(key,typeof ledger==='string'?ledger:JSON.stringify(ledger));
  },{profile,key,ledger});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base);await page.locator('[data-action="start"]').click();await wait(page,'home');
  return {context,page,errors};
}
const wait=(page,name)=>page.waitForFunction(name=>document.querySelector('#stage').dataset.screen===name,name);
const click=(page,id)=>page.locator(`[data-action="${id}"]`).click();
async function settled(page){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(im=>im.getAttribute('src')).map(im=>im.decode()))});}
async function shot(page,name){await settled(page);await page.screenshot({path:`${output}/${name}.png`});}
async function swipe(page,dx,dy=0){
  const r=await page.locator('.collection-swipe').boundingBox();const x=r.x+r.width/2,y=r.y+r.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();
}
try {
  const empty=await make();
  const before=await empty.page.evaluate(()=>JSON.stringify({...localStorage}));
  await settled(empty.page);const homeBefore=await empty.page.screenshot();
  await click(empty.page,'collection');await wait(empty.page,'collection_empty');await shot(empty.page,'collection_empty');
  assert.equal(await empty.page.locator('.collection-card').count(),0);
  assert.equal(await empty.page.evaluate(()=>JSON.stringify({...localStorage})),before);
  await click(empty.page,'home');await wait(empty.page,'home');await settled(empty.page);
  assert.deepEqual(await empty.page.screenshot(),homeBefore);
  await shot(empty.page,'home-regression');
  assert.deepEqual(empty.errors,[]);await empty.context.close();
  results.push('通常起動0枚・空状態・所持データの自動投入なし・既存プロフィール保持・ホーム往復画素差0: PASS');

  const {context,page,errors}=await make(fixture);
  await click(page,'collection');await wait(page,'collection_owned');await shot(page,'collection_owned');
  assert.equal(await page.locator('.collection-card-hit').count(),18);
  assert.equal(await page.locator('[data-layer="count"]').textContent(),'所持18枚');
  await page.locator('.collection-card-hit[data-card-id="motoki-r-01"]').click();await wait(page,'collection_detail');await shot(page,'collection_detail');
  assert.equal(await page.locator('[data-action="previous"]').isDisabled(),true);
  await swipe(page,-100);await page.waitForFunction(()=>document.querySelector('[data-layer="count"]').textContent==='02 / 18');
  await click(page,'previous');await page.waitForFunction(()=>document.querySelector('[data-layer="count"]').textContent==='01 / 18');
  await swipe(page,100);assert.equal(await page.locator('[data-layer="count"]').textContent(),'01 / 18');
  await swipe(page,10,100);assert.equal(await page.locator('[data-layer="count"]').textContent(),'01 / 18');
  await click(page,'back');await wait(page,'collection_owned');
  await click(page,'member_filter');await page.getByRole('option',{name:'若井滉斗'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.collection-card-hit').length===6);
  await click(page,'rarity_1');await page.waitForFunction(()=>document.querySelectorAll('.collection-card-hit').length===1);
  assert.equal(await page.locator('.collection-card-hit').getAttribute('data-card-id'),'hiroto-r-01');
  assert.equal(await page.locator('[data-layer="count"]').textContent(),'所持18枚');
  await page.locator('.collection-card-hit').click();await wait(page,'collection_detail');
  assert.equal(await page.locator('[data-action="previous"]').isDisabled(),true);assert.equal(await page.locator('[data-action="next"]').isDisabled(),true);
  assert.equal(await page.locator('[data-layer="count"]').textContent(),'01 / 1');
  await click(page,'back');await wait(page,'collection_owned');
  await click(page,'rarity_0');await click(page,'member_filter');await page.getByRole('option',{name:'すべてのメンバー'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.collection-card-hit').length===18);
  const header=await page.locator('[data-layer="title_bar"]').boundingBox();
  await page.locator('.collection-scroll').evaluate(node=>{node.scrollTop=370});
  await page.waitForFunction(()=>document.querySelector('.collection-scroll').scrollTop===370);
  await page.locator('.collection-card-hit[data-card-id="hiroto-a-01"]').click();await wait(page,'collection_detail');
  await click(page,'next');await page.waitForFunction(()=>document.querySelector('[data-layer="count"]').textContent==='09 / 18');
  await click(page,'back');await wait(page,'collection_owned');
  assert.equal(await page.locator('.collection-scroll').evaluate(node=>node.scrollTop),370);
  assert.deepEqual(await page.locator('[data-layer="title_bar"]').boundingBox(),header);
  await shot(page,'scrolled-list');
  await page.locator('.collection-card-hit[data-card-id="ryoka-a-01"]').click();await wait(page,'collection_detail');
  assert.equal(await page.locator('[data-layer="count"]').textContent(),'18 / 18');
  assert.equal(await page.locator('[data-action="next"]').isDisabled(),true);
  await swipe(page,-100);assert.equal(await page.locator('[data-layer="count"]').textContent(),'18 / 18');
  // Directly read persisted state through a fresh app load, never a fixture-seeding UI path.
  await page.reload();await click(page,'start');await wait(page,'home');await click(page,'collection');await wait(page,'collection_owned');
  assert.equal(await page.locator('.collection-card-hit').count(),18);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}))});
  await context.setOffline(true);await page.reload();await click(page,'start');await wait(page,'home');await click(page,'collection');await wait(page,'collection_owned');await settled(page);
  assert.equal(await page.locator('.collection-card-hit').count(),18);await context.setOffline(false);
  assert.deepEqual(errors,[]);await context.close();
  results.push('18種一覧・メンバー×ランク・総枚数固定・詳細・矢印・横/縦/複数ポインターの区別・境界停止・スクロール復帰・再読込・オフライン: PASS');

  const one=await make({version:1,owned:{'motoki-r-01':{quantity:3,firstAcquiredAt:'2026-10-31T16:00:00Z'},'future-id':{quantity:99}}});
  await click(one.page,'collection');await wait(one.page,'collection_owned');assert.equal(await one.page.locator('[data-layer="count"]').textContent(),'所持3枚');
  await click(one.page,'rarity_5');await wait(one.page,'collection_empty');
  assert.equal(await one.page.locator('[data-layer="count"]').textContent(),'所持3枚');assert.match(await one.page.locator('[data-layer="empty_title"]').textContent(),/絞り込み/);
  await shot(one.page,'no-filter-match');await click(one.page,'rarity_0');await wait(one.page,'collection_owned');
  await one.page.locator('.collection-card-hit').click();await wait(one.page,'collection_detail');
  assert.equal(await one.page.locator('[data-layer="quantity_value"]').textContent(),'× 3');assert.equal(await one.page.locator('[data-layer="first_acquired_value"]').textContent(),'2026.11.01');
  await one.context.close();
  results.push('1種3枚集約・未知ID保留・絞り込み0件から復帰・日本時間の初回日: PASS');

  for(const raw of ['invalid JSON',JSON.stringify({version:2,owned:{}})]) {
    const invalid=await make(raw);await click(invalid.page,'collection');await wait(invalid.page,'collection_empty');
    assert.equal(await invalid.page.evaluate(key=>localStorage.getItem(key),key),raw);assert.match(await invalid.page.locator('#notice').textContent(),/保存内容は変更/);await invalid.context.close();
  }
  results.push('不正JSON・未知バージョンを通知して元データを保持: PASS');

  const mobile=await make(fixture,{width:844,height:390,touch:true});
  await mobile.page.addStyleTag({content:'#safe-area{left:47px;right:47px;top:0;bottom:21px}'});
  await shot(mobile.page,'iphone-home');await click(mobile.page,'collection');await wait(mobile.page,'collection_owned');await shot(mobile.page,'iphone-owned');
  const rect=await mobile.page.locator('#stage').boundingBox();assert.ok(rect.x>=47&&rect.x+rect.width<=797.1&&rect.y+rect.height<=369.1);
  const bg=await mobile.page.locator('#scene-background').boundingBox();assert.deepEqual(bg,{x:0,y:0,width:844,height:390});
  const cdp=await mobile.context.newCDPSession(mobile.page);
  const v=await mobile.page.locator('.collection-scroll').boundingBox();const x=v.x+v.width/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:v.y+v.height-15}]});
  for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:v.y+v.height-15-i*8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.page.waitForFunction(()=>document.querySelector('.collection-scroll').scrollTop>20);
  assert.equal(await mobile.page.locator('#stage').getAttribute('data-screen'),'collection_owned');
  await shot(mobile.page,'iphone-scrolled');
  await mobile.page.locator('.collection-scroll').evaluate(node=>{node.scrollTop=0});
  await mobile.page.locator('.collection-card-hit[data-card-id="motoki-r-01"]').focus();
  await mobile.page.locator('.collection-card-hit[data-card-id="motoki-r-01"]').press('Enter');await wait(mobile.page,'collection_detail');
  const area=await mobile.page.locator('.collection-swipe').boundingBox();const cx=area.x+area.width/2,cy=area.y+area.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx-15,y:cy},{id:2,x:cx+15,y:cy}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx-75,y:cy},{id:2,x:cx-45,y:cy}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await mobile.page.locator('[data-layer="count"]').textContent(),'01 / 18');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx+35,y:cy}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx+35-i*9,y:cy}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.page.waitForFunction(()=>document.querySelector('[data-layer="count"]').textContent==='02 / 18');
  await shot(mobile.page,'iphone-detail');assert.deepEqual(mobile.errors,[]);await mobile.context.close();
  results.push('844×390セーフエリア・全画面背景・実タッチ縦スクロールで詳細を誤表示しない: PASS');
  // Development fixture is memory-only and neither fixture nor dev entry is shipped.
  const manifest=JSON.parse(await readFile('dist/precache.json','utf8'));
  assert.ok(!manifest.some(path=>path.includes('owned_fixture')||path.startsWith('./dev/')));
  const dev=await browser.newPage();await dev.goto('http://127.0.0.1:4175/dev/collection.html');await wait(dev,'collection_owned');
  assert.equal(await dev.evaluate(key=>localStorage.getItem(key),key),null);await dev.close();
  results.push('開発fixtureはメモリのみ・本番成果物にdev/QAデータを含めない: PASS');
  await writeFile(`${output}/functional-results.json`,JSON.stringify({results},null,2)+'\n');console.log(results.join('\n'));
}finally{await browser.close()}
