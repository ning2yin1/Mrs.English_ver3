import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createInventoryStore,INVENTORY_KEY,WALLET_KEY} from '../src/inventory/store.js';
import {COLLECTION_KEY} from '../src/collection/store.js';
import {JOURNAL_KEY} from '../src/inventory/persistence.js';
import {power,cost,CAPS,totalPower} from '../src/inventory/model.js';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const catalog=await json('layouts/collection/catalog.json'),definitions=await json('data/inventory/card_definitions.example.json'),balance=await json('data/inventory/balance.example.json'),seed=await json('data/inventory/dev_seed.example.json');
function fixture(){
  const values=new Map([['mrsEnglishV3.profile','profile-must-stay']]);let fault=null,queue=Promise.resolve();
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(fault?.(key,value))throw new Error('simulated save failure');values.set(key,value)},removeItem:key=>{if(fault?.(key,null))throw new Error('simulated remove failure');values.delete(key)}};
  const locks={request:(name,fn)=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;}};
  const store=createInventoryStore({catalog,definitions,balance,storageProvider:()=>storage,locks});
  return {store,values,storage,locks,fault:fn=>{fault=fn}};
}
const a=fixture();assert.equal(await a.store.seedDevelopment(seed),false);assert.equal(a.values.has(COLLECTION_KEY),false);
assert.equal(await a.store.seedDevelopment(seed,{enabled:true,testCoins:10000}),true);
const originalOwned=a.values.get(COLLECTION_KEY);const first=await a.store.load();
assert.equal(first.instances.length,10);assert.equal(first.wallet.rCoin,10000);assert.equal(totalPower(first.deck,first.instances),12450);
assert.deepEqual(Object.fromEntries(['R','S','A','B','C'].map(rank=>[rank,first.instances.filter(i=>i.rarity===rank).length])),{R:2,S:2,A:2,B:2,C:2});
assert.equal(await a.store.seedDevelopment(seed,{enabled:true,testCoins:10000}),false);assert.equal(a.values.get(COLLECTION_KEY),originalOwned);
const interruptedSeed=fixture();interruptedSeed.fault(key=>key===INVENTORY_KEY);await assert.rejects(interruptedSeed.store.seedDevelopment(seed,{enabled:true,testCoins:10000}));interruptedSeed.fault(null);assert.equal(await interruptedSeed.store.seedDevelopment(seed,{enabled:true,testCoins:10000}),true);assert.equal((await interruptedSeed.store.load()).instances.length,10);
const saved=await a.store.saveDeck([first.deck[0],first.instances[3].instanceId,first.deck[2]],first.data.revision||0);
assert.equal(saved.deck[1],first.instances[3].instanceId);
await assert.rejects(a.store.saveDeck([first.deck[0],first.deck[0],null]));
await assert.rejects(a.store.saveDeck(['unknown',null,null]));
await assert.rejects(a.store.saveDeck(first.deck,0));
const target=(await a.store.load()).instances.find(i=>i.instanceId===first.deck[0]);assert.equal(target.level,12);assert.equal(cost(target,balance),500);
const upgraded=await a.store.upgrade(target.instanceId,12,'test-upgrade-1');
assert.equal(upgraded.wallet.rCoin,9500);assert.equal(upgraded.instances.find(i=>i.instanceId===target.instanceId).level,13);assert.equal(power(upgraded.instances.find(i=>i.instanceId===target.instanceId)),5350);
await a.store.upgrade(target.instanceId,12,'test-upgrade-1');assert.equal((await a.store.load()).wallet.rCoin,9500);
const two=await Promise.allSettled([a.store.upgrade(target.instanceId,13,'race1'),a.store.upgrade(target.instanceId,13,'race2')]);
assert.equal(two.filter(r=>r.status==='fulfilled').length,1);assert.equal((await a.store.load()).instances.find(i=>i.instanceId===target.instanceId).level,14);
assert.equal(a.values.get(COLLECTION_KEY),originalOwned);assert.equal(a.values.get('mrsEnglishV3.profile'),'profile-must-stay');
// Empty and pre-existing ownership never get reset or silently granted cards/wallets.
const empty=fixture();assert.equal((await empty.store.load()).instances.length,0);assert.equal(empty.values.has(INVENTORY_KEY),false);assert.equal(empty.values.has(WALLET_KEY),false);
const hundred=fixture();hundred.values.set(COLLECTION_KEY,JSON.stringify({version:1,owned:{'motoki-r-01':{quantity:100,firstAcquiredAt:'2025-01-01T00:00:00Z'}}}));assert.equal((await hundred.store.load()).instances.length,100);
const legacy=fixture();legacy.values.set(COLLECTION_KEY,JSON.stringify({version:1,future:3,owned:{'motoki-r-01':{quantity:2,firstAcquiredAt:'2025-01-01T00:00:00Z',extra:true},unknown:{quantity:5}}}));
const before=legacy.values.get(COLLECTION_KEY);assert.equal(await legacy.store.seedDevelopment(seed,{enabled:true,testCoins:10000}),false);
const mapped=await legacy.store.load();assert.deepEqual(mapped.instances.map(i=>i.instanceId),['legacy:motoki-r-01:0001','legacy:motoki-r-01:0002']);
await legacy.store.saveDeck([mapped.instances[0].instanceId,mapped.instances[1].instanceId,null]);assert.equal(legacy.values.get(COLLECTION_KEY),before);assert.equal(legacy.values.has(WALLET_KEY),false);
assert.deepEqual((await legacy.store.load()).instances.map(i=>i.instanceId),mapped.instances.map(i=>i.instanceId));
const badDeck=JSON.parse(legacy.values.get(INVENTORY_KEY));badDeck.deck=['missing','missing',null];badDeck.extraField={preserve:true};legacy.values.set(INVENTORY_KEY,JSON.stringify(badDeck));
const repairedView=await legacy.store.load();assert.deepEqual(repairedView.deck,[null,null,null]);assert.deepEqual(JSON.parse(legacy.values.get(INVENTORY_KEY)).deck,badDeck.deck);assert.deepEqual(repairedView.data.extraField,{preserve:true});
// All caps, exact-balance spend, insufficient funds, and invalid saved formats.
for(const rarity of Object.keys(CAPS)) {
 const f=fixture();await f.store.seedDevelopment(seed,{enabled:true,testCoins:10000});let s=await f.store.load();const instance=s.instances.find(i=>i.rarity===rarity);
 const data=JSON.parse(f.values.get(INVENTORY_KEY));data.instances[instance.instanceId].level=CAPS[rarity];data.unknownField={keep:true};f.values.set(INVENTORY_KEY,JSON.stringify(data));
 await assert.rejects(f.store.upgrade(instance.instanceId,CAPS[rarity],'cap'));assert.deepEqual((await f.store.load()).data.unknownField,{keep:true});
}
const exact=fixture();await exact.store.seedDevelopment(seed,{enabled:true,testCoins:500});let es=await exact.store.load();await exact.store.upgrade(es.deck[0],12,'exact');assert.equal((await exact.store.load()).wallet.rCoin,0);await assert.rejects(exact.store.upgrade(es.deck[0],13,'insufficient'));
for(const key of [INVENTORY_KEY,WALLET_KEY,COLLECTION_KEY])for(const raw of ['broken',JSON.stringify({version:99})]){const f=fixture();f.values.set(key,raw);await assert.rejects(f.store.load());assert.equal(f.values.get(key),raw);}
// Failure after level write rolls back both keys; a retained recovery record repairs interruption.
const failure=fixture();await failure.store.seedDevelopment(seed,{enabled:true,testCoins:10000});const fs=await failure.store.load(),ib=failure.values.get(INVENTORY_KEY),wb=failure.values.get(WALLET_KEY);
failure.fault(key=>key===WALLET_KEY);await assert.rejects(failure.store.upgrade(fs.deck[0],12,'failure'));assert.equal(failure.values.get(INVENTORY_KEY),ib);assert.equal(failure.values.get(WALLET_KEY),wb);failure.fault(null);
const afterI=JSON.parse(ib);afterI.instances[fs.deck[0]].level=13;const afterW=JSON.stringify({version:1,rCoin:9500});
failure.values.set(JOURNAL_KEY,JSON.stringify({version:1,changes:[{key:INVENTORY_KEY,before:ib,after:JSON.stringify(afterI)},{key:WALLET_KEY,before:wb,after:afterW}]}));failure.values.set(INVENTORY_KEY,JSON.stringify(afterI));
const recovered=await failure.store.load();assert.equal(recovered.instances.find(i=>i.instanceId===fs.deck[0]).level,13);assert.equal(recovered.wallet.rCoin,9500);assert.equal(failure.values.has(JOURNAL_KEY),false);
// Existing wallet is preserved even when an explicit dev grant is permitted.
const funded=fixture();funded.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:77,future:4}));await funded.store.seedDevelopment(seed,{enabled:true,testCoins:10000});assert.equal((await funded.store.load()).wallet.rCoin,77);
console.log('Inventory store passed: seed once/zero-only, shared ownership, stable instances, deck ownership/uniqueness/revision, per-rarity caps, costs, idempotence, concurrency, exact/insufficient balance, rollback/recovery, legacy/unknown data and existing wallet protection.');
