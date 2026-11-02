import {DEFINITIONS} from './definitions.js';
import {readWallet,WALLET_KEY} from '../wallet.js';
export const MISSION_KEY='mrsEnglishV3.missions.v1';
const DAY=86400000,OFFSET=9*3600000;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
export function periodKeys(at) {
  const stamp=Date.parse(at);if(!Number.isFinite(stamp))throw new Error('ミッションの時刻が不正です。');
  const jst=new Date(stamp+OFFSET),daily=jst.toISOString().slice(0,10);
  const monday=new Date(Date.UTC(jst.getUTCFullYear(),jst.getUTCMonth(),jst.getUTCDate())-((jst.getUTCDay()+6)%7)*DAY).toISOString().slice(0,10);
  return {daily,weekly:monday};
}
export function nextBoundary(at=Date.now()){return Math.floor((at+OFFSET)/DAY)*DAY+DAY-OFFSET;}
export function emptyBucket(){return {stage_clear:0,correct_answers:0,true_correct_streak_max:0,grammarIds:[],normal_or_hard_clear:0,hard_clear:0,perfect_stage_clear:0,successful_upgrade:0,rewards:{}};}
export function readMissions(storage) {
  const raw=storage.getItem(MISSION_KEY);
  if(raw===null)return {version:1,userId:crypto.randomUUID(),periods:{daily:{},weekly:{}},processed:{},streaks:{},outbox:[],exchanges:{}};
  const data=JSON.parse(raw);
  const bad=()=>{throw new Error('ミッションの保存内容を読み込めません。元データを保持しています。');};
  if(data?.version!==1||typeof data.userId!=='string'||!object(data.periods)||!object(data.periods.daily)||!object(data.periods.weekly)||!object(data.processed)||!object(data.streaks)||!Array.isArray(data.outbox)||!object(data.exchanges))bad();
  for(const periods of Object.values(data.periods))for(const [key,b]of Object.entries(periods)){
    if(!/^\d{4}-\d\d-\d\d$/.test(key)||!object(b)||!object(b.rewards)||!Array.isArray(b.grammarIds)||b.grammarIds.some(id=>typeof id!=='string'))bad();
    for(const metric of Object.keys(emptyBucket()).filter(k=>!['grammarIds','rewards'].includes(k)))if(!integer(b[metric]))bad();
    if(Object.values(b.rewards).some(v=>typeof v!=='string'))bad();
  }
  if(Object.values(data.processed).some(v=>typeof v!=='string')||Object.values(data.streaks).some(v=>!object(v)||!integer(v.count)||!Number.isSafeInteger(v.index))||data.outbox.some(n=>!object(n)||typeof n.id!=='string'||typeof n.name!=='string'||!['r_coin','diamond'].includes(n.currency)||!integer(n.amount)||!['pending','started'].includes(n.status)))bad();
  return data;
}
export function ensurePeriods(data,at) {
  const keys=periodKeys(at);
  for(const kind of ['daily','weekly'])data.periods[kind][keys[kind]] ||= emptyBucket();
  return keys;
}
export function missionValue(bucket,definition) {
  if(definition.metric==='base_missions_completed')return DEFINITIONS[definition.id.startsWith('D')?'daily':'weekly'].slice(0,5).filter(d=>Object.hasOwn(bucket.rewards,d.id)).length;
  if(definition.metric==='distinct_grammar_clear')return new Set(bucket.grammarIds).size;
  return bucket[definition.metric];
}
export function missionRows(data,kind,at) {
  const key=periodKeys(at)[kind],bucket=data.periods[kind][key]||emptyBucket();
  return DEFINITIONS[kind].map(d=>{const value=Math.min(d.target,Math.max(0,missionValue(bucket,d))),completed=Object.hasOwn(bucket.rewards,d.id);return {...d,value,state:completed?'completed':value?'in_progress':'untouched'};});
}
// Called only inside the existing inventory mutations lock, before its durable commit.
// The caller supplies the already validated wallet after any stage reward/upgrade cost.
export function planMissionEvent(storage,event,walletInput) {
  const data=readMissions(storage),raw=storage.getItem(MISSION_KEY),walletRaw=storage.getItem(WALLET_KEY);
  const expected={[MISSION_KEY]:raw,[WALLET_KEY]:walletRaw};
  if(Object.hasOwn(data.processed,event.id))return {values:walletInput?{[WALLET_KEY]:JSON.stringify(walletInput)}:{},expected};
  if(!['answer','clear','upgrade'].includes(event.type)||typeof event.id!=='string'||!event.id)throw new Error('ミッションのイベントが不正です。');
  const keys=ensurePeriods(data,event.at);let streak=0;
  if(event.type==='answer'){
    if(typeof event.correct!=='boolean'||!Number.isInteger(event.index)||event.index<0||event.index>9||typeof event.stageId!=='string')throw new Error('回答イベントが不正です。');
    const key='stage:'+event.stageId,previous=data.streaks[key];
    // Never reconstruct historical progress on first introduction. Gaps start a fresh run.
    streak=event.correct?(previous?.index===event.index-1?previous.count:0)+1:0;
    data.streaks[key]={index:event.index,count:streak};
  }
  if(event.type==='clear'&&(event.total!==10||!integer(event.correctCount)||event.correctCount>10||typeof event.grammarId!=='string'||!['EASY','NORMAL','HARD'].includes(event.difficulty)))throw new Error('クリアイベントが不正です。');
  const wallet=walletInput?{...walletInput}:readWallet(storage);let rewarded=false;
  for(const kind of ['daily','weekly']){
    const bucket=data.periods[kind][keys[kind]];
    if(event.type==='answer'){
      if(event.correct)bucket.correct_answers++;
      bucket.true_correct_streak_max=Math.max(bucket.true_correct_streak_max,streak);
    }else if(event.type==='clear'){
      bucket.stage_clear++;
      if(!bucket.grammarIds.includes(event.grammarId))bucket.grammarIds.push(event.grammarId);
      if(event.difficulty!=='EASY')bucket.normal_or_hard_clear++;
      if(event.difficulty==='HARD')bucket.hard_clear++;
      if(event.correctCount===10)bucket.perfect_stage_clear++;
    }else bucket.successful_upgrade++;
    // Definitions are ordered: D01..D06 then W01..W06. Bonus is evaluated last.
    for(const definition of DEFINITIONS[kind]){
      if(Object.hasOwn(bucket.rewards,definition.id)||missionValue(bucket,definition)<definition.target)continue;
      const id=`${data.userId}/mission-v1/${kind}/${keys[kind]}/${definition.id}`;
      const field=definition.reward.currency==='r_coin'?'rCoin':'diamonds';
      wallet[field]+=definition.reward.amount;if(!integer(wallet[field]))throw new Error('通貨残高の上限です。');
      bucket.rewards[definition.id]=id;rewarded=true;
      data.outbox.push({id,missionId:definition.id,name:definition.name,...definition.reward,status:'pending'});
    }
  }
  data.processed[event.id]=event.at;
  const values={[MISSION_KEY]:JSON.stringify(data)};
  if(rewarded||walletInput)values[WALLET_KEY]=JSON.stringify(wallet);
  return {values,expected};
}
