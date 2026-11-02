export const WALLET_KEY='mrsEnglishV3.wallet.v1';
export function readWallet(storage) {
  const raw=storage.getItem(WALLET_KEY);
  const data=raw===null?{version:1,rCoin:0}:JSON.parse(raw);
  if(data?.version!==1||!Number.isSafeInteger(data.rCoin)||data.rCoin<0||(data.diamonds!==undefined&&(!Number.isSafeInteger(data.diamonds)||data.diamonds<0)))throw new Error('通貨の保存内容を確認してください。元データを保持しています。');
  return {...data,diamonds:data.diamonds??0};
}
export const diamondCost=rarity=>rarity==='R'?5:rarity==='S'?3:0;
