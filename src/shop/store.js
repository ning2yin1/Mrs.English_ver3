import {persistence} from '../inventory/persistence.js';
import {createInventoryStore,INVENTORY_KEY,WALLET_KEY} from '../inventory/store.js';
import {createOwnershipStore,COLLECTION_KEY} from '../collection/store.js';
import {validProfile,PROFILE_KEY} from '../profile.js';
import {drawCards,randomInt} from './gacha.js';
export const SHOP_KEY='mrsEnglishV3.shop.v1';
export const WELCOME_EVENT='mrs-english-welcome-10-v1';
function shopData(storage){
  const raw=storage.getItem(SHOP_KEY);if(raw===null)return {version:1,receipts:{},appliedPurchaseIds:{},claims:{},pendingPurchaseId:null,presentation:{}};
  const data=JSON.parse(raw);
  if(data?.version!==1||!['receipts','appliedPurchaseIds','claims'].every(key=>data[key]&&typeof data[key]==='object'&&!Array.isArray(data[key])))throw new Error('購入履歴を読み込めません。元データを保持しています。');
  if(data.presentation!==undefined&&(!data.presentation||typeof data.presentation!=='object'||Array.isArray(data.presentation)))throw new Error('開封履歴を読み込めません。');
  return data;
}
function receiptValid(receipt,catalog,config){
  const sku=config.skus.find(s=>s.id===receipt?.sku);
  if(!sku||receipt.schemaVersion!==1||![1,5,10].includes(receipt.count)||!Number.isSafeInteger(receipt.pricePaid)||receipt.pricePaid<0||typeof receipt.purchaseId!=='string'||!Number.isFinite(Date.parse(receipt.committedAt))||!Array.isArray(receipt.results)||receipt.results.length!==receipt.count)throw new Error('保存された購入結果を確認してください。再抽選は行いません。');
  const ids=new Set();
  for(const [index,result]of receipt.results.entries()){
    const card=catalog.cards.find(card=>card.id===result.catalogId);
    if(!card||card.rarity!==result.rarity||result.index!==index||result.initialLevel!==1||result.instanceId!==`purchase:${receipt.purchaseId}:${String(index).padStart(2,'0')}`||ids.has(result.instanceId)||!Number.isFinite(Date.parse(result.acquiredAt))||result.guaranteed!==(receipt.count===10&&index===9)||(result.guaranteed&&!['R','S'].includes(result.rarity)))throw new Error('購入カードの記録が不正です。記録を保持しています。');
    ids.add(result.instanceId);
  }
  return receipt;
}
export function createShopStore({catalog,products,definitions,balance,storageProvider=()=>localStorage,locks=globalThis.navigator?.locks,integer=randomInt}) {
  const db=persistence(storageProvider,locks),inventory=createInventoryStore({catalog,definitions,balance,storageProvider,locks});
  function read(storage){
    const state=inventory.prepare(storage),data=shopData(storage);state.raw[SHOP_KEY]=storage.getItem(SHOP_KEY);
    const profileRaw=storage.getItem(PROFILE_KEY);let profile;try{profile=JSON.parse(profileRaw);}catch{}
    const ready=!!validProfile(profile);
    let receipt=null;
    if(data.pendingPurchaseId){receipt=receiptValid(data.receipts[data.pendingPurchaseId],catalog,products);if(!data.appliedPurchaseIds[data.pendingPurchaseId])throw new Error('未完了の購入を先に復旧してください。');}
    const diamonds=state.wallet.diamonds;
    if(!Number.isSafeInteger(diamonds)||diamonds<0)throw new Error('ダイヤの表示データが不正です。');
    return {...state,shop:data,profileRaw,ready,diamonds,receipt,welcomeAvailable:ready&&!data.claims[WELCOME_EVENT]};
  }
  return {
    load:()=>db.read(read),
    purchase(skuId,purchaseId){return db.run(storage=>{
      const state=read(storage),sku=products.skus.find(s=>s.id===skuId);
      if(!sku||typeof purchaseId!=='string'||!purchaseId||!Number.isSafeInteger(sku.price)||sku.price<0||![1,5,10].includes(sku.count))throw new Error('商品または購入IDが不正です。');
      const previous=state.shop.receipts[purchaseId];
      if(previous){if(previous.sku!==skuId||!state.shop.appliedPurchaseIds[purchaseId])throw new Error('購入IDの記録を確認してください。');return receiptValid(previous,catalog,products);}
      if(state.receipt)throw new Error('先に購入済みの結果を確認してください。');
      if(!state.ready)throw new Error('初期設定を完了してください。');
      if(sku.claimEventId&&state.shop.claims[sku.claimEventId])throw new Error('初回無料パックは受け取り済みです。');
      if(state.wallet.rCoin<sku.price)throw new Error('Rコインが不足しています。');
      const now=new Date().toISOString();
      const results=drawCards(sku,products,catalog,integer).map(({card,guaranteed},index)=>({index,instanceId:`purchase:${purchaseId}:${String(index).padStart(2,'0')}`,catalogId:card.id,rarity:card.rarity,acquiredAt:now,initialLevel:1,guaranteed}));
      const receipt={schemaVersion:1,purchaseId,sku:sku.id,count:sku.count,pricePaid:sku.price,committedAt:now,claimEventId:sku.claimEventId||null,catalogVersion:String(catalog.version),results};
      const staged=new Map([[COLLECTION_KEY,state.raw[COLLECTION_KEY]]]);
      const proxy={getItem:key=>staged.has(key)?staged.get(key):storage.getItem(key),setItem:(key,value)=>staged.set(key,value)};
      const ownership=createOwnershipStore(catalog,()=>proxy);
      for(const result of results){
        if(state.data.instances[result.instanceId])throw new Error('個体IDが既に存在しています。');
        ownership.awardCard(result.catalogId,1,now);
        state.data.instances[result.instanceId]={catalogId:result.catalogId,level:1,acquiredAt:now,origin:'shop',purchaseId};
      }
      state.data.revision=(state.data.revision||0)+1;
      state.wallet.rCoin-=sku.price;
      state.shop.receipts[purchaseId]=receipt;state.shop.appliedPurchaseIds[purchaseId]=true;state.shop.pendingPurchaseId=purchaseId;
      state.shop.presentation={...state.shop.presentation,[purchaseId]:{screen:'opening',index:0}};
      if(sku.claimEventId)state.shop.claims[sku.claimEventId]=purchaseId;
      db.commitDurable(storage,{[COLLECTION_KEY]:staged.get(COLLECTION_KEY),[INVENTORY_KEY]:JSON.stringify(state.data),[WALLET_KEY]:JSON.stringify(state.wallet),[SHOP_KEY]:JSON.stringify(state.shop)},{...state.raw,[PROFILE_KEY]:state.profileRaw});
      return receipt;
    });},
    progress(purchaseId,screen,index=0){return db.run(storage=>{
      const state=read(storage);const receipt=receiptValid(state.shop.receipts[purchaseId],catalog,products);
      if(!state.shop.appliedPurchaseIds[purchaseId])throw new Error('購入を復旧してください。');
      if(!['opening','back','reveal','results','closed'].includes(screen)||!Number.isInteger(index)||index<0||index>=receipt.count)throw new Error('表示進捗が不正です。');
      state.shop.presentation={...state.shop.presentation,[purchaseId]:{screen,index}};
      if(screen==='closed'&&state.shop.pendingPurchaseId===purchaseId)state.shop.pendingPurchaseId=null;
      db.commit(storage,{[SHOP_KEY]:JSON.stringify(state.shop)},state.raw);return state;
    });},
  };
}
