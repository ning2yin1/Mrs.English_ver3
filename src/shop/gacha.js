export function randomInt(limit,source=globalThis.crypto) {
  if(!Number.isSafeInteger(limit)||limit<1||limit>0x100000000)throw new Error('抽選範囲が不正です。');
  const ceiling=Math.floor(0x100000000/limit)*limit,buffer=new Uint32Array(1);let value;
  do{source.getRandomValues(buffer);value=buffer[0];}while(value>=ceiling);
  return value%limit;
}
export function pickRarity(weights,roll) {
  if(!Number.isInteger(roll)||roll<0||roll>=100||!Array.isArray(weights)||weights.some(w=>!Number.isInteger(w.weight)||w.weight<0||!['R','S','A','B','C'].includes(w.rarity))||new Set(weights.map(w=>w.rarity)).size!==weights.length||weights.reduce((n,w)=>n+w.weight,0)!==100)throw new Error('排出確率の設定が不正です。');
  let end=0;for(const row of weights){if(!Number.isInteger(row.weight)||row.weight<0)throw new Error('排出確率が不正です。');end+=row.weight;if(roll<end)return row.rarity;}
  throw new Error('排出確率が不正です。');
}
export function drawCards(sku,config,catalog,integer=randomInt) {
  if(![1,5,10].includes(sku.count)||(sku.count===10?sku.guaranteedIndex!==9:sku.guaranteedIndex!==null))throw new Error('パック枚数と確定枠の設定が不正です。');
  const ids=new Set();const pools=new Map(['R','S','A','B','C'].map(rank=>[rank,[]]));
  for(const card of catalog.cards){if(!card.id||ids.has(card.id)||!pools.has(card.rarity)||!card.image||!card.frame)throw new Error('カードカタログが不正です。');ids.add(card.id);pools.get(card.rarity).push(card);}
  for(const rows of [config.normalWeights,config.guaranteedWeights])for(const row of rows){if(!pools.get(row.rarity)?.length)throw new Error('必要なレアリティのカードがありません。');}
  // Validate both probability tables before consuming any randomness.
  pickRarity(config.normalWeights,0);pickRarity(config.guaranteedWeights,0);
  return Array.from({length:sku.count},(_,index)=>{
    const guaranteed=index===sku.guaranteedIndex;
    const rarity=pickRarity(guaranteed?config.guaranteedWeights:config.normalWeights,integer(100));
    const pool=pools.get(rarity);return {card:pool[integer(pool.length)],guaranteed};
  });
}
