export const CAPS=Object.freeze({R:50,S:40,A:30,B:20,C:10});
export const FALLBACK=Object.freeze({R:{basePower:3550,powerPerLevel:150,skillId:'score_up'},S:{basePower:2800,powerPerLevel:150,skillId:'speed_up'},A:{basePower:2050,powerPerLevel:150,skillId:'combo_support'},B:{basePower:1420,powerPerLevel:150,skillId:'score_up'},C:{basePower:660,powerPerLevel:150,skillId:'combo_support'}});
export function definition(card,definitions,balance) {
  const d=definitions.cards.find(d=>d.catalogId===card.id)||FALLBACK[card.rarity];
  return {...d,maxLevel:CAPS[card.rarity],skill:balance.skills[d.skillId]};
}
export function power(instance){const value=instance.definition.basePower+(instance.level-1)*instance.definition.powerPerLevel;if(!Number.isSafeInteger(value)||value<0)throw new Error('能力値の定義を確認してください。');return value;}
export function cost(instance,balance){const rule=balance.upgradeCostByRarity[instance.rarity];const value=rule.base+(instance.level-1)*rule.perCurrentLevelAbove1;if(!Number.isSafeInteger(value)||value<0)throw new Error('強化コストの定義を確認してください。');return value;}
export function validDeck(deck,instances){const ids=new Set(instances.map(i=>i.instanceId));return Array.isArray(deck)&&deck.length===3&&deck.every(id=>id===null||ids.has(id))&&new Set(deck.filter(Boolean)).size===deck.filter(Boolean).length;}
export function totalPower(deck,instances){return deck.reduce((sum,id)=>{const card=instances.find(i=>i.instanceId===id);return sum+(card?power(card):0);},0);}
