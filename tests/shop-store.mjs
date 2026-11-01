import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomInt,pickRarity,drawCards} from '../src/shop/gacha.js';
import {createShopStore,SHOP_KEY,WELCOME_EVENT} from '../src/shop/store.js';
import {createInventoryStore,INVENTORY_KEY,WALLET_KEY} from '../src/inventory/store.js';
import {COLLECTION_KEY} from '../src/collection/store.js';
import {PROFILE_KEY} from '../src/profile.js';
import {JOURNAL_KEY,persistence} from '../src/inventory/persistence.js';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const catalog=await json('layouts/collection/catalog.json'),products=await json('data/shop/catalog.json'),definitions=await json('data/inventory/card_definitions.example.json'),balance=await json('data/inventory/balance.example.json'),seed=await json('data/inventory/dev_seed.example.json');
const profile={version:3,nickname:'Nene',memberId:'motoki',backgroundId:'bg-01',setupComplete:true};
const normal=Object.fromEntries(['R','S','A','B','C'].map(rank=>[rank,0]));
for(let i=0;i<100;i++)normal[pickRarity(products.normalWeights,i)]++;
assert.deepEqual(normal,{R:1,S:9,A:25,B:30,C:35});
for(let i=0;i<100;i++)assert.equal(pickRarity(products.guaranteedWeights,i),i<10?'R':'S');
let entropyCalls=0;assert.equal(randomInt(100,{getRandomValues(buffer){buffer[0]=entropyCalls++===0?4294967295:42;}}),42);assert.equal(entropyCalls,2);
const reached=new Set();
for(const [rank,roll]of [['R',0],['S',1],['A',10],['B',35],['C',65]])for(let i=0;i<catalog.cards.filter(c=>c.rarity===rank).length;i++){
 let call=0;const result=drawCards(products.skus[0],products,catalog,()=>call++===0?roll:i);reached.add(result[0].card.id);
}
assert.equal(reached.size,catalog.cards.length);
for(const sku of products.skus){const drawn=drawCards(sku,products,catalog,limit=>limit===100?99:0);assert.equal(drawn.length,sku.count);drawn.forEach((r,i)=>{assert.equal(r.card.rarity,sku.count===10&&i===9?'S':'C');assert.equal(r.guaranteed,sku.count===10&&i===9);});}
function fixture(){
 const values=new Map([[PROFILE_KEY,JSON.stringify(profile)]]);let fault=null,queue=Promise.resolve(),randomCalls=0;
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(fault?.(key,value))throw new Error('simulated quota failure');values.set(key,value)},removeItem:key=>{if(fault?.(key,null))throw new Error('simulated remove failure');values.delete(key)}};
 const locks={request:(name,fn)=>{const p=queue.then(fn);queue=p.catch(()=>{});return p;}};
 const options={catalog,products,definitions,balance,storageProvider:()=>storage,locks,integer:limit=>{randomCalls++;return limit===100?99:0;}};
 return {values,storage,locks,store:createShopStore(options),inventory:createInventoryStore(options),fault:fn=>fault=fn,calls:()=>randomCalls};
}
const a=fixture();await a.inventory.seedDevelopment(seed,{enabled:true,testCoins:25000});
const beforeOwned=JSON.parse(a.values.get(COLLECTION_KEY)),beforeInventory=JSON.parse(a.values.get(INVENTORY_KEY));
const gift=await a.store.purchase('welcome_10','official-welcome');assert.equal(gift.count,10);assert.equal(gift.pricePaid,0);assert.equal(gift.results[9].rarity,'S');assert.equal(new Set(gift.results.map(r=>r.instanceId)).size,10);
let state=await a.store.load();assert.equal(state.instances.length,20);assert.equal(state.wallet.rCoin,25000);assert.equal(state.welcomeAvailable,false);assert.equal(state.shop.claims[WELCOME_EVENT],'official-welcome');assert.deepEqual(state.data.deck,beforeInventory.deck);
for(const [id,value]of Object.entries(beforeInventory.instances))assert.deepEqual(state.data.instances[id],value);
for(const [id,value]of Object.entries(beforeOwned.owned))assert.equal(state.ownership.owned[id].firstAcquiredAt,value.firstAcquiredAt);
assert.ok(gift.results.every(r=>state.data.instances[r.instanceId].level===1));
const callCount=a.calls();assert.deepEqual(await a.store.purchase('welcome_10','official-welcome'),gift);assert.equal(a.calls(),callCount);
await a.store.progress(gift.purchaseId,'results',9);await a.store.progress(gift.purchaseId,'closed',9);await assert.rejects(a.store.purchase('welcome_10','second-gift'));assert.equal((await a.store.load()).instances.length,20);
const paid=await a.store.purchase('normal_10','paid-ten');assert.equal((await a.store.load()).wallet.rCoin,15000);assert.equal((await a.store.load()).instances.length,30);assert.equal(paid.results.filter(r=>r.guaranteed).length,1);
const savedReceipt=JSON.stringify(paid),paidCalls=a.calls();for(const screen of ['opening','back','reveal','results'])await a.store.progress(paid.purchaseId,screen,0);assert.equal(JSON.stringify((await a.store.load()).receipt),savedReceipt);assert.equal(a.calls(),paidCalls);
await a.store.progress(paid.purchaseId,'closed');
for(const [sku,id,remaining,count]of [['normal_5','paid-five',10000,5],['normal_1','paid-one',9000,1]]){const r=await a.store.purchase(sku,id);assert.equal(r.count,count);assert.equal((await a.store.load()).wallet.rCoin,remaining);await a.store.progress(id,'closed');}
assert.equal(a.values.get(PROFILE_KEY),JSON.stringify(profile));
// Exact/insufficient balances, unfinished setup, already claimed legacy event and invalid pools.
const exact=fixture();exact.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:1000,diamonds:44,unknown:{keep:true}}));await exact.store.purchase('normal_1','exact');assert.deepEqual((await exact.store.load()).wallet,{version:1,rCoin:0,diamonds:44,unknown:{keep:true}});await exact.store.progress('exact','closed');await assert.rejects(exact.store.purchase('normal_1','insufficient'));
const noSetup=fixture();noSetup.values.set(PROFILE_KEY,JSON.stringify({...profile,setupComplete:false}));await assert.rejects(noSetup.store.purchase('welcome_10','not-ready'));assert.equal(noSetup.calls(),0);assert.equal(noSetup.values.has(COLLECTION_KEY),false);
const claimed=fixture();claimed.values.set(SHOP_KEY,JSON.stringify({version:1,receipts:{},appliedPurchaseIds:{},claims:{[WELCOME_EVENT]:'previous-event'},presentation:{},pendingPurchaseId:null}));assert.equal((await claimed.store.load()).welcomeAvailable,false);await assert.rejects(claimed.store.purchase('welcome_10','should-not-grant'));
assert.throws(()=>drawCards(products.skus[2],products,{cards:catalog.cards.filter(c=>c.rarity!=='C')},()=>0));
for(const key of [COLLECTION_KEY,INVENTORY_KEY,WALLET_KEY,SHOP_KEY])for(const raw of ['broken JSON',JSON.stringify({version:99})]){const f=fixture();f.values.set(key,raw);await assert.rejects(f.store.purchase('welcome_10','invalid'));assert.equal(f.values.get(key),raw);assert.equal(f.calls(),0);}
// Same operation replays once; distinct concurrent operations cannot consume one free claim twice.
const concurrent=fixture();const both=await Promise.allSettled([concurrent.store.purchase('welcome_10','free-a'),concurrent.store.purchase('welcome_10','free-b')]);assert.equal(both.filter(r=>r.status==='fulfilled').length,1);assert.equal((await concurrent.store.load()).instances.length,10);
// Fail at each durable boundary/projection. Prepared is cancelled; committed always recovers the fixed after-state.
for(const boundary of ['prepared','committed',COLLECTION_KEY,INVENTORY_KEY,WALLET_KEY,SHOP_KEY,'applied','remove']){
 const f=fixture();f.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:10000}));
 f.fault((key,value)=>{
  if(key===JOURNAL_KEY&&value&&['prepared','committed','applied'].includes(boundary))return JSON.parse(value).phase===boundary;
  return boundary==='remove'?key===JOURNAL_KEY&&value===null:key===boundary;
 });
 await assert.rejects(f.store.purchase('normal_10','interrupted'));
 const calls=f.calls();f.fault(null);const recovered=await f.store.load();
 if(['prepared','committed'].includes(boundary)){assert.equal(recovered.instances.length,0);assert.equal(recovered.wallet.rCoin,10000);assert.equal(recovered.receipt,null);}
 else {assert.equal(recovered.instances.length,10);assert.equal(recovered.wallet.rCoin,0);assert.equal(recovered.receipt.purchaseId,'interrupted');assert.equal((await f.store.purchase('normal_10','interrupted')).results.length,10);}
 assert.equal(f.calls(),calls);assert.equal(f.values.has(JOURNAL_KEY),false);
}
// Readers of other features pass the same recovery barrier before seeing projections.
const reader=fixture();reader.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:10000}));reader.fault(key=>key===INVENTORY_KEY);await assert.rejects(reader.store.purchase('normal_10','read-barrier'));reader.fault(null);
const recoveredQuantity=await persistence(()=>reader.storage,reader.locks).read(storage=>Object.values(JSON.parse(storage.getItem(COLLECTION_KEY)).owned).reduce((n,c)=>n+c.quantity,0));assert.equal(recoveredQuantity,10);
const conflict=fixture();conflict.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:10000}));conflict.fault(key=>key===INVENTORY_KEY);await assert.rejects(conflict.store.purchase('normal_10','conflict'));conflict.fault(null);const external=JSON.stringify({version:1,rCoin:4321});conflict.values.set(WALLET_KEY,external);await assert.rejects(conflict.store.load());assert.equal(conflict.values.get(WALLET_KEY),external);assert.equal(conflict.values.has(JOURNAL_KEY),true);
console.log('Shop store passed: exact probability boundaries/rejection sampling/all 79 cards, 1/5/10 and tenth-only guarantee, duplicates as new Lv1 instances, official free 10→20 once, existing levels/deck/dates/wallet/diamonds preserved, idempotence/concurrency, prepared/committed/applied recovery, read barriers and conflicts.');
