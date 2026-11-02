// All score arithmetic uses exact integer units; only final total is rounded.
export const DENOMINATOR=300000000n;
export const raw=units=>Number(BigInt(units))/Number(DENOMINATOR);
const units=n=>BigInt(n)*DENOMINATOR;
export function resolveSkills(deck){
  const result={scoreBps:0,speedBps:0,supportCharges:0,cards:[],warnings:[]};
  for(const card of deck.filter(Boolean)){
    const skill=card.resolvedSkill;if(!skill)continue;
    const value=skill.value;
    if(!Number.isFinite(value)||value<0)throw new Error('カードスキル値を確認してください。');
    if(skill.kind==='score_up')result.scoreBps+=Math.round(value*10000);
    else if(skill.kind==='speed_up')result.speedBps+=Math.round(value*10000);
    else if(skill.kind==='combo_support'){if(!Number.isInteger(value))throw new Error('コンボ支援回数が不正です。');result.supportCharges+=value;}
    else{result.warnings.push(skill.kind);continue;}
    result.cards.push({instanceId:card.instanceId,...skill});
  }return result;
}
export function scoreAnswer({correct,elapsedActiveMs,combo,supportRemaining,skills,difficulty,config}){
  if(!Number.isSafeInteger(elapsedActiveMs)||elapsedActiveMs<0)throw new Error('回答時間が不正です。');
  const remainingBefore=supportRemaining;let supportConsumed=false,comboAfter=combo;
  if(correct)comboAfter=Math.min(config.combo_cap,combo+1);
  else if(supportRemaining>0){supportRemaining--;supportConsumed=true;}else comboAfter=0;
  const base=correct?units(config.base[difficulty]):0n;
  const remaining=Math.max(0,config.speed_zero_seconds*1000-elapsedActiveMs);
  const speed=correct?BigInt(config.speed_max[difficulty])*BigInt(remaining)*10000n:0n;
  const baseSkill=base*BigInt(skills.scoreBps)/10000n,speedSkill=speed*BigInt(skills.speedBps)/10000n;
  const streak=correct?units(comboAfter*config.combo_per_streak):0n;
  const total=base+speed+baseSkill+speedSkill+streak;
  let used=skills.supportCharges-remainingBefore,supportCard;for(const card of skills.cards.filter(c=>c.kind==='combo_support')){if(used<card.value){supportCard=card.instanceId;break;}used-=card.value;}
  return {correct,elapsedActiveMs,comboAfter,supportRemaining,supportConsumed,baseUnits:String(base),speedUnits:String(speed),comboUnits:String(streak),skillUnits:String(baseSkill+speedSkill),questionUnits:String(total),basePointsRaw:raw(base),speedPointsRaw:raw(speed),comboPointsRaw:raw(streak),skillPointsRaw:raw(baseSkill+speedSkill),awardedQuestionPointsRaw:raw(total),activeSkillIds:skills.cards.filter(s=>correct?['score_up','speed_up'].includes(s.kind):supportConsumed&&s.instanceId===supportCard).map(s=>s.instanceId)};
}
export function summarize(answers,power){
  const sum=key=>answers.reduce((n,a)=>n+BigInt(a[key]),0n),correctCount=answers.filter(a=>a.correct).length;
  const card=BigInt(power)*BigInt(correctCount)*(DENOMINATOR/100n),question=sum('questionUnits'),total=question+card;
  return {correctCount,wrongCount:answers.length-correctCount,accuracy:answers.length?correctCount/answers.length*100:0,basePointsRaw:raw(sum('baseUnits')),speedPointsRaw:raw(sum('speedUnits')),comboPointsRaw:raw(sum('comboUnits')),skillPointsRaw:raw(sum('skillUnits')),cardBonusRaw:raw(card),questionScoreRaw:raw(question),totalUnits:String(total),finalScoreInteger:Number((total+DENOMINATOR/2n)/DENOMINATOR),maxCombo:Math.max(0,...answers.map(a=>a.comboAfter)),totalActiveMs:answers.reduce((n,a)=>n+a.elapsedActiveMs,0)};
}
export function dateKey(iso,zone='Asia/Tokyo'){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));}
