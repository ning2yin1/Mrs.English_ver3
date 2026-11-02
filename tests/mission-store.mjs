import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEFINITIONS} from '../src/mission/definitions.js';
import {MISSION_KEY,planMissionEvent,readMissions,missionRows,periodKeys,ensurePeriods} from '../src/mission/engine.js';
import {createMissionStore} from '../src/mission/store.js';
import {persistence,JOURNAL_KEY} from '../src/inventory/persistence.js';
import {WALLET_KEY,diamondCost} from '../src/wallet.js';
import {createInventoryStore,INVENTORY_KEY} from '../src/inventory/store.js';
import {createPlayStore} from '../src/play/store.js';
assert.deepEqual(DEFINITIONS,JSON.parse(await readFile('docs/mission_definitions.json')));
function fixture(){
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fault?.(k,v))throw new Error('quota');values.set(k,v)},removeItem:k=>{if(fault?.(k,null))throw new Error('quota');values.delete(k)}};let fault,queue=Promise.resolve(),time='2026-11-01T10:00:00Z';
 const locks={request:(name,fn)=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;}},opts={storageProvider:()=>storage,locks,now:()=>time},db=persistence(opts.storageProvider,locks),store=createMissionStore(opts);
 const event=async e=>db.run(s=>{const p=planMissionEvent(s,{at:time,...e});db.commitDurable(s,p.values,p.expected);});
 return {values,storage,locks,opts,db,store,event,time:t=>time=t,fault:fn=>fault=fn};
}
const f=fixture();f.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:0,diamonds:7,legacy:'keep'}));await f.store.refresh();
for(let i=0;i<15;i++)await f.event({id:`a:${i}`,type:'answer',stageId:`stage${Math.floor(i/10)}`,index:i%10,correct:true});
for(let i=0;i<15;i++)await f.event({id:`c:${i}`,type:'clear',grammarId:String(i%10+1).padStart(2,'0'),difficulty:i<3?'HARD':'NORMAL',total:10,correctCount:10});
for(let i=0;i<3;i++)await f.event({id:`u:${i}`,type:'upgrade'});
let state=await f.store.refresh();assert.ok([...state.daily,...state.weekly].every(m=>m.state==='completed'));assert.equal(state.data.outbox.length,12);assert.deepEqual(JSON.parse(f.values.get(WALLET_KEY)),{version:1,rCoin:8500,diamonds:32,legacy:'keep'});
const all=f.values.get(WALLET_KEY);await f.event({id:'c:0',type:'clear',grammarId:'99',difficulty:'EASY',total:10,correctCount:0});assert.equal(f.values.get(WALLET_KEY),all);
let releaseClaim,allowed=true;const held=f.locks.request('test',()=>new Promise(resolve=>releaseClaim=resolve));await Promise.resolve();const guarded=f.store.nextNotification(()=>allowed);allowed=false;releaseClaim();await held;assert.equal(await guarded,null);assert.ok(readMissions(f.storage).outbox.every(n=>n.status==='pending'));
const pending=[];for(let i=0;i<12;i++)pending.push((await f.store.nextNotification()).id);assert.equal(new Set(pending).size,12);assert.equal(await f.store.nextNotification(),null);assert.equal(f.values.get(WALLET_KEY),all);
// JST midnight/Monday and actual streak crossing the boundary; same ID stays in its old period.
assert.deepEqual(periodKeys('2026-11-01T14:59:59Z'),{daily:'2026-11-01',weekly:'2026-10-26'});assert.deepEqual(periodKeys('2026-11-01T15:00:00Z'),{daily:'2026-11-02',weekly:'2026-11-02'});
assert.deepEqual(periodKeys('2026-11-02T15:00:00Z'),{daily:'2026-11-03',weekly:'2026-11-02'});
const b=fixture();for(let i=0;i<4;i++)await b.event({id:`before${i}`,type:'answer',stageId:'overnight',index:i,correct:true,at:'2026-11-01T14:59:59Z'});b.time('2026-11-01T15:00:00Z');await b.event({id:'fifth',type:'answer',stageId:'overnight',index:4,correct:true});state=await b.store.refresh();assert.equal(state.daily[1].value,1);assert.equal(state.daily[2].state,'completed');assert.equal(state.data.periods.daily['2026-11-01'].correct_answers,4);await b.event({id:'before0',type:'answer',stageId:'overnight',index:0,correct:true});assert.equal((await b.store.refresh()).daily[1].value,1);
b.time('2026-12-14T12:00:00Z');state=await b.store.refresh();assert.ok(state.daily.every(m=>m.value===0));assert.ok(state.weekly.every(m=>m.value===0));assert.equal(JSON.parse(b.values.get(WALLET_KEY)).rCoin,300);
const streak=fixture();for(const [i,correct]of [true,true,true,true,false,true,true,true,true].entries())await streak.event({id:`streak${i}`,type:'answer',stageId:'supported-combo',index:i,correct});assert.equal((await streak.store.refresh()).daily[2].value,4);await streak.event({id:'new-stage',type:'answer',stageId:'other',index:0,correct:true});assert.equal((await streak.store.refresh()).daily[2].value,4);
const zero=fixture();await zero.event({id:'zero',type:'clear',grammarId:'01',difficulty:'EASY',total:10,correctCount:0});await zero.event({id:'same-grammar',type:'clear',grammarId:'01',difficulty:'NORMAL',total:10,correctCount:0});state=await zero.store.refresh();assert.equal(state.daily[0].state,'completed');assert.equal(state.daily[3].value,1);assert.equal(state.weekly[3].value,0);assert.equal(state.daily[4].state,'completed');
// Interrupted durable commits project exactly once; prepared intents roll back and can retry.
for(const boundary of ['prepared','committed',MISSION_KEY,WALLET_KEY,'applied','remove']){
 const x=fixture();for(let i=0;i<4;i++)await x.event({id:`pre${i}`,type:'answer',stageId:'fault',index:i,correct:true});let fired=false;
 x.fault((key,value)=>{if(fired)return false;const hit=['prepared','committed','applied'].includes(boundary)?key===JOURNAL_KEY&&value&&JSON.parse(value).phase===boundary:boundary==='remove'?key===JOURNAL_KEY&&value===null:key===boundary;if(hit)fired=true;return hit;});
 await assert.rejects(x.event({id:'fault-fifth',type:'answer',stageId:'fault',index:4,correct:true}));x.fault(null);await x.store.refresh();await x.event({id:'fault-fifth',type:'answer',stageId:'fault',index:4,correct:true});await x.event({id:'fault-fifth',type:'answer',stageId:'fault',index:4,correct:true});assert.equal(JSON.parse(x.values.get(WALLET_KEY)).rCoin,300);assert.equal(readMissions(x.storage).outbox.length,1);
}
const exchange=fixture();exchange.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:5,diamonds:9}));await assert.rejects(exchange.store.exchange('x'));exchange.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:5,diamonds:10,future:true}));await Promise.all([exchange.store.exchange('x'),exchange.store.exchange('x')]);assert.deepEqual(JSON.parse(exchange.values.get(WALLET_KEY)),{version:1,rCoin:1005,diamonds:0,future:true});await assert.rejects(exchange.store.exchange('other'));
const broken=fixture();broken.values.set(MISSION_KEY,'broken');await assert.rejects(broken.store.refresh());assert.equal(broken.values.get(MISSION_KEY),'broken');
// Actual upgrade hook: every rarity, latest balances, no reward borrowing, stable operation IDs.
const json=async p=>JSON.parse(await readFile(p));const catalog=await json('layouts/collection/catalog.json'),definitions=await json('data/inventory/card_definitions.example.json'),balance=await json('data/inventory/balance.example.json'),seed=await json('data/inventory/dev_seed.example.json');
for(const rarity of ['R','S','A','B','C']){
 const x=fixture(),inventory=createInventoryStore({...x.opts,catalog,definitions,balance});await inventory.seedDevelopment(seed,{enabled:true,testCoins:100000});let inventoryState=await inventory.load();const card=inventoryState.instances.find(c=>c.rarity===rarity&&c.level<c.definition.maxLevel),needed=diamondCost(rarity);
 x.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:100000,diamonds:Math.max(0,needed-1)}));
 if(needed)await assert.rejects(inventory.upgrade(card.instanceId,card.level,'insufficient'));
 assert.equal((await x.store.refresh()).weekly[4].value,0);
 x.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:100000,diamonds:needed}));await inventory.upgrade(card.instanceId,card.level,'ok');await inventory.upgrade(card.instanceId,card.level,'ok');inventoryState=await inventory.load();assert.equal(inventoryState.wallet.diamonds,0);assert.equal(inventoryState.instances.find(c=>c.instanceId===card.instanceId).level,card.level+1);assert.equal((await x.store.refresh()).weekly[4].value,1);
}
// W05/W06 rewards cannot be borrowed to pay a currently unaffordable R upgrade.
const borrowing=fixture(),bi=createInventoryStore({...borrowing.opts,catalog,definitions,balance});await bi.seedDevelopment(seed,{enabled:true,testCoins:100000});let bis=await bi.load();const br=bis.instances.find(c=>c.rarity==='R'),bm=readMissions(borrowing.storage),bk=ensurePeriods(bm,borrowing.opts.now());Object.assign(bm.periods.weekly[bk.weekly],{stage_clear:15,hard_clear:3,grammarIds:Array.from({length:10},(_,i)=>String(i)),perfect_stage_clear:3,successful_upgrade:2,rewards:{W01:'one',W02:'two',W03:'three',W04:'four'}});borrowing.values.set(MISSION_KEY,JSON.stringify(bm));borrowing.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:100000,diamonds:4}));await assert.rejects(bi.upgrade(br.instanceId,br.level,'no-borrow'));assert.equal((await borrowing.store.refresh()).weekly[4].value,2);borrowing.values.set(WALLET_KEY,JSON.stringify({version:1,rCoin:100000,diamonds:5}));await bi.upgrade(br.instanceId,br.level,'paid');assert.equal((await bi.load()).wallet.diamonds,20);assert.deepEqual((await borrowing.store.refresh()).data.outbox.map(n=>n.missionId),['W05','W06']);
// Real graded answers and completion use existing gameplay APIs, with no score/reward rule changes.
const dataset=await json('data/play/source/grammar_01_40.json'),config=await json('specs/play/scoring_config.json'),backgrounds=await json('specs/play/backgrounds.json');const x=fixture();const play=createPlayStore({...x.opts,dataset,datasetHash:'test',config,backgrounds,catalog,definitions,balance,integer:()=>0});let p=await play.start('01','EASY',0);
for(let i=0;i<10;i++){const s=p.session,q=dataset.categories[0].questions.find(q=>q.id===s.questionIds[i]);p=await play.change(s.stageId,p.revision,'edit',{selected:q.easy.answer});p=await play.change(s.stageId,p.revision,'answer');if(i<9)p=await play.change(s.stageId,p.revision,'next');}
assert.equal((await x.store.refresh()).daily[1].value,10);assert.equal((await x.store.refresh()).daily[2].state,'completed');const id=p.session.stageId;p=await play.settle(id,p.revision);assert.equal(p.results[id].rewardCoins,600);assert.equal((await x.store.refresh()).daily[0].state,'completed');assert.equal(JSON.parse(x.values.get(WALLET_KEY)).rCoin,1100);await play.settle(id,0);assert.equal(JSON.parse(x.values.get(WALLET_KEY)).rCoin,1100);
console.log('Mission store: exact 12 definitions, daily/weekly bonuses, JST rollover and cross-midnight real streaks, duplicate events, durable recovery boundaries, notification outbox, exchange, all rarity diamond costs and actual answer/settlement hooks: PASS');
