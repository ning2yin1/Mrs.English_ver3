import {readWallet as wallet,WALLET_KEY,diamondCost} from '../wallet.js';
import {planMissionEvent} from '../mission/engine.js';
export {WALLET_KEY};
import {createOwnershipStore,ownedCards,COLLECTION_KEY} from '../collection/store.js';
import {persistence} from './persistence.js';
import {definition,validDeck,cost} from './model.js';
export const INVENTORY_KEY='mrsEnglishV3.inventory.v1';
function sidecar(storage){
  const raw=storage.getItem(INVENTORY_KEY);if(raw===null)return {version:1,instances:{},deck:[null,null,null],appliedDevGrants:{}};
  const data=JSON.parse(raw);
  if(data.version!==1||!data.instances||typeof data.instances!=='object'||Array.isArray(data.instances)||!data.appliedDevGrants||typeof data.appliedDevGrants!=='object')throw new Error('個体データの形式を読み込めません。保存内容は変更していません。');
  if((data.revision!==undefined&&(!Number.isSafeInteger(data.revision)||data.revision<0))||(data.transactions!==undefined&&(!data.transactions||typeof data.transactions!=='object'||Array.isArray(data.transactions)))||Array.isArray(data.appliedDevGrants))throw new Error('保存の管理情報を読み込めません。元データを保持しています。');
  return data;
}
export function createInventoryStore({catalog,definitions,balance,storageProvider=()=>localStorage,locks=globalThis.navigator?.locks,now=()=>new Date().toISOString()}) {
  const db=persistence(storageProvider,locks);
  function snapshot(storage) {
    const raw=Object.fromEntries([COLLECTION_KEY,INVENTORY_KEY,WALLET_KEY].map(key=>[key,storage.getItem(key)]));
    const source={getItem:key=>Object.hasOwn(raw,key)?raw[key]:storage.getItem(key)};
    const ownership=createOwnershipStore(catalog,()=>source).read();if(ownership.error)throw new Error('所持データを読み込めません。元データを保持しています。');
    const data=sidecar(source),coins=wallet(source),instances=[];
    for(const card of ownedCards(catalog,ownership.ledger)) {
      const d=definition(card,definitions,balance);
      const existing=Object.entries(data.instances).filter(([,value])=>value?.catalogId===card.id);
      if(card.quantity>10000)throw new Error('所持個体数が大きいため自動対応を停止しました。');
      for(let n=0;n<card.quantity;n++) {
        let [instanceId,value]=existing[n]||[];
        if(!instanceId){let ordinal=n+1;do{instanceId=`legacy:${card.id}:${String(ordinal++).padStart(4,'0')}`;}while(data.instances[instanceId]);value={catalogId:card.id,level:1};data.instances[instanceId]=value;}
        if(!Number.isInteger(value.level)||value.level<1||value.level>d.maxLevel)throw new Error('個体レベルが不正です。保存内容を保持しています。');
        instances.push({...card,instanceId,level:value.level,acquiredAt:value.acquiredAt||card.firstAcquiredAt,definition:d});
      }
    }
    const time=value=>Number.isFinite(Date.parse(value))?Date.parse(value):Infinity;
    instances.sort((a,b)=>(time(a.acquiredAt)-time(b.acquiredAt))||0);
    return {raw,data,wallet:coins,ownership:ownership.ledger,instances,deck:validDeck(data.deck,instances)?[...data.deck]:[null,null,null]};
  }
  async function load(){return db.run(storage=>{
    const state=snapshot(storage);
    if(state.instances.length)db.commit(storage,{[INVENTORY_KEY]:JSON.stringify(state.data)},state.raw);
    return state;
  });}
  return {
    load,
    prepare:snapshot,
    saveDeck(deck,expectedRevision) {return db.run(storage=>{
      const state=snapshot(storage);if(!validDeck(deck,state.instances))throw new Error('所有する異なる個体を3枠に選択してください。');
      if(expectedRevision!==undefined&&(state.data.revision||0)!==expectedRevision)throw new Error('別の操作で編成やレベルが更新されています。編成を開き直してください。');
      state.data.deck=[...deck];state.data.revision=(state.data.revision||0)+1;db.commit(storage,{[INVENTORY_KEY]:JSON.stringify(state.data)},state.raw);return snapshot(storage);
    });},
    upgrade(instanceId,expectedLevel,operationId) {return db.run(storage=>{
      if(typeof operationId!=='string'||!operationId)throw new Error('強化操作IDが必要です。');
      const state=snapshot(storage);
      if(state.data.transactions?.[operationId])return state;
      const instance=state.instances.find(i=>i.instanceId===instanceId);
      if(!instance||instance.level!==expectedLevel)throw new Error('カードの状態が更新されました。再度確認してください。');
      if(instance.level>=instance.definition.maxLevel)throw new Error('レベル上限です。');
      const required=cost(instance,balance);if(state.wallet.rCoin<required)throw new Error('Rコインが不足しています。');
      const diamonds=diamondCost(instance.rarity);if(state.wallet.diamonds<diamonds)throw new Error(`ダイヤが不足しています（必要 ${diamonds}個）。`);
      state.data.instances[instanceId].level++;state.wallet.rCoin-=required;state.wallet.diamonds-=diamonds;
      state.data.revision=(state.data.revision||0)+1;
      state.data.transactions={...state.data.transactions,[operationId]:{instanceId,from:expectedLevel,cost:required}};
      const mission=planMissionEvent(storage,{id:`upgrade:${operationId}`,type:'upgrade',at:now()},state.wallet);
      db.commitDurable(storage,{[INVENTORY_KEY]:JSON.stringify(state.data),...mission.values},{...state.raw,...mission.expected});
      return snapshot(storage);
    });},
    seedDevelopment(seed,{enabled=false,testCoins=0}={}) {
      if(!enabled)return Promise.resolve(false);
      return db.run(async storage=>{
        const raw=Object.fromEntries([COLLECTION_KEY,INVENTORY_KEY,WALLET_KEY].map(key=>[key,storage.getItem(key)]));
        const own=createOwnershipStore(catalog,()=>storage).read();if(own.error)throw own.error;
        const data=sidecar(storage);wallet(storage);
        if(Object.keys(own.ledger.owned).length||Object.keys(data.instances).length||Object.keys(data.appliedDevGrants).length||(data.deck||[]).some(Boolean))return false;
        const staged=new Map([[COLLECTION_KEY,storage.getItem(COLLECTION_KEY)]]);
        const proxy={getItem:key=>staged.has(key)?staged.get(key):storage.getItem(key),setItem:(key,value)=>staged.set(key,value)};
        const awards=createOwnershipStore(catalog,()=>proxy);
        const now=Date.now();
        for(const item of [...seed.instances].sort((a,b)=>Date.parse(a.firstAcquiredAt)-Date.parse(b.firstAcquiredAt))) {
          // Use real grant times, retaining acquisition order without writing the QA dates.
          await new Promise(resolve=>setTimeout(resolve,2));
          awards.awardCard(item.catalogId,1,new Date().toISOString());
          data.instances[item.instanceId]={catalogId:item.catalogId,level:item.level,origin:'inventory-development',grantId:seed.grantId};
        }
        data.deck=[...seed.deck];data.appliedDevGrants[seed.grantId]={at:new Date(now).toISOString()};
        const changes={[COLLECTION_KEY]:staged.get(COLLECTION_KEY),[INVENTORY_KEY]:JSON.stringify(data)};
        if(storage.getItem(WALLET_KEY)===null&&Number.isSafeInteger(testCoins)&&testCoins>0)changes[WALLET_KEY]=JSON.stringify({version:1,rCoin:testCoins,origin:'inventory-development-test'});
        db.commit(storage,changes,raw);return true;
      });
    },
  };
}

// Read-only access to the same wallet used by upgrades, Shop and Play.
export {wallet as readWallet};
