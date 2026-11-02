import {persistence} from '../inventory/persistence.js';
import {readWallet,WALLET_KEY} from '../wallet.js';
import {MISSION_KEY,readMissions,ensurePeriods,missionRows} from './engine.js';
export {MISSION_KEY};
export function createMissionStore({storageProvider=()=>localStorage,locks=globalThis.navigator?.locks,now=()=>new Date().toISOString()}={}) {
  const db=persistence(storageProvider,locks);
  function snapshot(storage){const data=readMissions(storage),at=now();ensurePeriods(data,at);return {data,at,daily:missionRows(data,'daily',at),weekly:missionRows(data,'weekly',at)};}
  return {
    refresh:()=>db.run(storage=>{const result=snapshot(storage),values={[MISSION_KEY]:JSON.stringify(result.data)},raw=storage.getItem(WALLET_KEY);if(raw!==null){const wallet=readWallet(storage);if(JSON.parse(raw).diamonds===undefined)values[WALLET_KEY]=JSON.stringify(wallet);}db.commitDurable(storage,values);return result;}),
    nextNotification:(canStart=()=>true)=>db.run(storage=>{if(!canStart())return null;const data=readMissions(storage),next=data.outbox.find(n=>n.status==='pending');if(!next)return null;next.status='started';db.commitDurable(storage,{[MISSION_KEY]:JSON.stringify(data)});return {...next};}),
    // Prepared for a future approved Shop/currency confirmation UI. No new screen is invented.
    exchange(operationId){return db.run(storage=>{
      if(typeof operationId!=='string'||!operationId)throw new Error('交換操作IDが必要です。');
      const data=readMissions(storage),key='exchange:'+operationId,wallet=readWallet(storage);
      if(Object.hasOwn(data.exchanges,key))return wallet;
      if(wallet.diamonds<10)throw new Error('交換にはダイヤ10個が必要です。');
      if(!Number.isSafeInteger(wallet.rCoin+1000))throw new Error('Rコイン残高の上限です。');
      wallet.diamonds-=10;wallet.rCoin+=1000;data.exchanges[key]={at:now(),diamonds:10,rCoin:1000};
      db.commitDurable(storage,{[MISSION_KEY]:JSON.stringify(data),[WALLET_KEY]:JSON.stringify(wallet)});return wallet;
    });},
  };
}
