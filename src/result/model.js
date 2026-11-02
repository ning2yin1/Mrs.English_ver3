import {DENOMINATOR} from '../play/scoring.js';
const ranks=[['perfect','PERFECT!!','gold',1,true],['excellent','EXCELLENT!','silver',.7,true],['great','GREAT!','cyan',.45,true],['good','GOOD!','silver',.25,true],['nice_try','NICE TRY!','silver',.15,false]];
export function rankFor(correct){
  if(!Number.isInteger(correct)||correct<0||correct>10)throw new Error('正解数を確認してください。');
  const [id,label,halo,intensity,shockwave]=ranks[correct===10?0:correct===9?1:correct>=7?2:correct>=5?3:4];return{id,label,halo,intensity,shockwave};
}
export function allocateUnits(values,total){
  if(values.length!==5||values.some(n=>typeof n!=='bigint'||n<0n)||!Number.isSafeInteger(total)||total<0)throw new Error('スコア内訳が不正です。');
  const sum=values.reduce((a,b)=>a+b,0n);if(Number((sum+DENOMINATOR/2n)/DENOMINATOR)!==total)throw new Error('確定スコアと内訳が一致しません。保存内容は変更していません。');
  const result=values.map(n=>Number(n/DENOMINATOR)),remaining=total-result.reduce((a,b)=>a+b,0);
  const order=values.map((n,index)=>({index,fraction:n%DENOMINATOR})).sort((a,b)=>a.fraction===b.fraction?a.index-b.index:a.fraction>b.fraction?-1:1);
  for(let i=0;i<remaining;i++)result[order[i].index]++;
  return result;
}
export function allocateDisplay(values,total){
  if(values.some(n=>!Number.isFinite(n)||n<0))throw new Error('スコア内訳が未記録です。');
  return allocateUnits(values.map(n=>BigInt(Math.round(n*Number(DENOMINATOR)))),total);
}
export function resultModel(result,data){
  if(result?.completionStatus!=='completed'||!result.settlementId||!result.stageId||!Array.isArray(result.questionResults)||result.questionResults.length!==10)throw new Error('精算済みの結果を読み込めません。再読み込みしてください。');
  const answers=result.questionResults,correct=answers.filter(a=>a.correct===true).length;
  if(answers.some(a=>typeof a.correct!=='boolean')||correct!==result.correctCount)throw new Error('結果の正解数が一致しません。');
  let displayed;
  const fields=['baseUnits','speedUnits','comboUnits','skillUnits'];
  if(answers.every(a=>fields.every(k=>typeof a[k]==='string'&&/^\d+$/.test(a[k]))&&typeof a.questionUnits==='string'&&/^\d+$/.test(a.questionUnits))&&typeof result.totalUnits==='string'&&/^\d+$/.test(result.totalUnits)){
    for(const a of answers)if(fields.reduce((n,k)=>n+BigInt(a[k]),0n)!==BigInt(a.questionUnits))throw new Error('問題点の内訳が一致しません。');
    const values=fields.map(k=>answers.reduce((n,a)=>n+BigInt(a[k]),0n)),question=values.reduce((a,b)=>a+b,0n);values.push(BigInt(result.totalUnits)-question);displayed=allocateUnits(values,result.finalScoreInteger);
  }else displayed=allocateDisplay([result.basePointsRaw,result.speedPointsRaw,result.comboPointsRaw,result.skillPointsRaw,result.cardBonusRaw],result.finalScoreInteger);
  if(![1,2].includes(result.dailyMultiplier)||!Number.isSafeInteger(result.rewardBase)||result.rewardBase<0||!Number.isSafeInteger(result.rewardCoins)||result.rewardCoins!==result.rewardBase*result.dailyMultiplier)throw new Error('確定報酬を確認してください。');
  if(!Number.isInteger(result.maxCombo)||result.maxCombo<0||result.maxCombo>10)throw new Error('コンボ記録を確認してください。');
  const completeTimes=answers.every(a=>Number.isSafeInteger(a.elapsedActiveMs)&&a.elapsedActiveMs>=0),averageSeconds=completeTimes?answers.reduce((n,a)=>n+a.elapsedActiveMs,0)/answers.length/1000:null;
  const category=data.dataset.categories.find(c=>c.id===result.categoryId),skillIds=[...new Set(answers.flatMap(a=>a.activeSkillIds||[]))];
  const snapshot=Array.isArray(result.deckSnapshot)?result.deckSnapshot:[];
  return {stageId:result.stageId,categoryId:result.categoryId,categoryTitle:category?.title||result.categoryId,shortTitle:data.titles?.[result.categoryId]||category?.title||result.categoryId,difficulty:result.difficulty,rank:rankFor(correct),correctCount:correct,accuracy:correct*10,maxCombo:result.maxCombo,averageSeconds,parts:displayed,total:result.finalScoreInteger,rewardCoins:result.rewardCoins,rewardBase:result.rewardBase,multiplier:result.dailyMultiplier,deck:snapshot.slice(0,3).map(slot=>slot?{...slot,card:data.catalog.cards.find(c=>c.id===slot.catalogId)}:null),skillIds};
}
