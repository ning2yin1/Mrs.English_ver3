export const JOURNAL_KEY='mrsEnglishV3.inventory.transaction.v1';
const LOCK='mrsEnglishV3.inventory.mutations.v1';
export function persistence(storageProvider=()=>localStorage, locks=globalThis.navigator?.locks) {
  const put=(storage,key,value)=>value===null?storage.removeItem(key):storage.setItem(key,value);
  function recover(storage) {
    const raw=storage.getItem(JOURNAL_KEY);if(raw===null)return;
    const journal=JSON.parse(raw);
    const allowed=['mrsEnglishV3.collection.v1','mrsEnglishV3.inventory.v1','mrsEnglishV3.wallet.v1','mrsEnglishV3.shop.v1','mrsEnglishV3.play.v1'];
    if(journal.version!==1||!Array.isArray(journal.changes)||journal.changes.some(c=>!allowed.includes(c.key)||(c.before!==null&&typeof c.before!=='string')||(c.after!==null&&typeof c.after!=='string')))throw new Error('未対応の保存復旧データです。元データを保持しています。');
    if(journal.changes.some(c=>![c.before,c.after].includes(storage.getItem(c.key))))throw new Error('保存内容が別の操作で変更されています。復旧データを保持しています。');
    if(journal.phase!==undefined&&!['prepared','committed','applied'].includes(journal.phase))throw new Error('未対応の取引状態です。復旧記録を保持しています。');
    const cancelled=journal.phase ? journal.phase==='prepared' : journal.rollback||journal.changes.every(c=>storage.getItem(c.key)===c.before);
    for(const c of journal.changes){const value=cancelled?c.before:c.after;put(storage,c.key,value);if(storage.getItem(c.key)!==value)throw new Error('保存を復旧できません。再度開いてください。');}
    storage.removeItem(JOURNAL_KEY);
  }
  return {
    async read(action) {
      if(locks?.request)return this.run(action);
      const storage=storageProvider();if(storage.getItem(JOURNAL_KEY)!==null)throw new Error('保存の復旧には対応ブラウザーが必要です。');
      return action(storage);
    },
    async run(action) {
      if(!locks?.request)throw new Error('このブラウザーでは安全な保存の排他制御が利用できません。');
      return locks.request(LOCK,async()=>{const storage=storageProvider();recover(storage);return action(storage);});
    },
    commit(storage,values,expected={}) {
      if(Object.entries(expected).some(([key,value])=>storage.getItem(key)!==value))throw new Error('別の操作で保存内容が更新されました。再度お試しください。');
      const changes=Object.entries(values).map(([key,after])=>({key,before:storage.getItem(key),after})).filter(c=>c.before!==c.after);
      if(!changes.length)return;
      const journal={version:1,id:globalThis.crypto.randomUUID(),changes};
      storage.setItem(JOURNAL_KEY,JSON.stringify(journal));
      try {
        for(const c of changes){if(storage.getItem(c.key)!==c.before)throw new Error('別の操作が先に保存されました。再度お試しください。');put(storage,c.key,c.after);if(storage.getItem(c.key)!==c.after)throw new Error('保存を確認できませんでした。');}
        storage.removeItem(JOURNAL_KEY);
      }catch(error){
        try{storage.setItem(JOURNAL_KEY,JSON.stringify({...journal,rollback:true}));}catch{}
        let rolledBack=true;
        for(const c of [...changes].reverse())try{if(storage.getItem(c.key)===c.after)put(storage,c.key,c.before);}catch{rolledBack=false;}
        if(rolledBack)try{storage.removeItem(JOURNAL_KEY);}catch{}
        throw error;
      }
    },
    // Shop commits one immutable intent before projecting any balance/ownership changes.
    commitDurable(storage,values,expected={}) {
      if(Object.entries(expected).some(([key,value])=>storage.getItem(key)!==value))throw new Error('別の操作で保存内容が更新されました。再度お試しください。');
      const changes=Object.entries(values).map(([key,after])=>({key,before:storage.getItem(key),after})).filter(c=>c.before!==c.after);
      if(!changes.length)return;
      const journal={version:1,id:globalThis.crypto.randomUUID(),phase:'prepared',changes};
      storage.setItem(JOURNAL_KEY,JSON.stringify(journal));
      journal.phase='committed';
      storage.setItem(JOURNAL_KEY,JSON.stringify(journal)); // The durable purchase commit point.
      for(const c of changes){if(![c.before,c.after].includes(storage.getItem(c.key)))throw new Error('購入は保存済みですが、投影中に競合しました。再読み込みしてください。');put(storage,c.key,c.after);if(storage.getItem(c.key)!==c.after)throw new Error('購入の保存内容を復旧する必要があります。');}
      journal.phase='applied';storage.setItem(JOURNAL_KEY,JSON.stringify(journal));
      storage.removeItem(JOURNAL_KEY);
    },
  };
}
