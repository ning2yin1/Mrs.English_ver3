import {planMissionEvent} from '../mission/engine.js';
import {persistence} from '../inventory/persistence.js';
import {createInventoryStore,WALLET_KEY} from '../inventory/store.js';
import {power,totalPower} from '../inventory/model.js';
import {randomInt} from '../shop/gacha.js';
import {shuffle,prepareQuestion,isCorrect} from './data.js';
import {resolveSkills,scoreAnswer,summarize,dateKey} from './scoring.js';
export const PLAY_KEY='mrsEnglishV3.play.v1';
export function createPlayStore({dataset,datasetHash,backgrounds,config,catalog,definitions,balance,storageProvider=()=>localStorage,locks=globalThis.navigator?.locks,integer=randomInt,now=()=>new Date().toISOString()}){
  const db=persistence(storageProvider,locks),inventory=createInventoryStore({catalog,definitions,balance,storageProvider,locks});
  function read(storage){
    const raw=storage.getItem(PLAY_KEY);const data=raw===null?{version:1,revision:0,session:null,results:{},daily:{},records:{}}:JSON.parse(raw);
    if(data?.version!==1||!Number.isSafeInteger(data.revision)||data.revision<0||['results','daily','records'].some(k=>!data[k]||typeof data[k]!=='object'||Array.isArray(data[k])))throw new Error('プレイの保存内容を確認してください。元データを保持しています。');
    return {raw,data};
  }
  function save(storage,state,event){
    state.data.revision++;const values={[PLAY_KEY]:JSON.stringify(state.data)},expected={[PLAY_KEY]:state.raw};
    if(event){const mission=planMissionEvent(storage,event);db.commitDurable(storage,{...values,...mission.values},{...expected,...mission.expected});}
    else db.commit(storage,values,expected);
    return structuredClone(state.data);
  }
  function session(state,id,revision){const s=state.data.session;if(!s||s.stageId!==id||state.data.revision!==revision)throw new Error('別のタブでプレイが更新されました。保存内容を再読み込みしてください。');return s;}
  function verify(s){if(!s||s.datasetHash===datasetHash)return;if(!s.questionSources?.every((q,i)=>JSON.stringify(dataset.categories.find(c=>c.id===s.categoryId)?.questions.find(x=>x.id===s.questionIds[i]))===q))throw new Error('途中の問題データが更新されています。このステージは再開できません。途中終了で戻ってください。');}
  const api={
    load:()=>db.read(storage=>{const {data}=read(storage);return structuredClone(data);}),
    dismiss(id,revision){return db.run(storage=>{const state=read(storage),s=session(state,id,revision);if(s.status!=='completed')throw new Error('未完了のステージです。');state.data.session=null;return save(storage,state);});},
    start(categoryId,difficulty,expectedRevision){return db.run(storage=>{
      const state=read(storage);if(state.data.revision!==expectedRevision)throw new Error('開始前の保存状態が変わりました。再度お試しください。');
      if(state.data.session&&!['completed','aborted'].includes(state.data.session.status))throw new Error('途中のステージを先に再開または終了してください。');
      const category=dataset.categories.find(c=>c.id===categoryId);if(!category||category.questions.length<10||!config.base[difficulty])throw new Error('10問以上のカテゴリと難易度を選択してください。');
      const snapshot=inventory.prepare(storage),deck=snapshot.deck.map(id=>{const instance=snapshot.instances.find(c=>c.instanceId===id);return instance?{instanceId:id,catalogId:instance.id,level:instance.level,power:power(instance),resolvedSkill:{kind:instance.definition.skillId,value:instance.definition.skill?.value??0,name:instance.definition.skill?.name||instance.definition.skillId}}:null;});
      const questions=shuffle(category.questions,integer).slice(0,10),createdAt=now();
      state.data.session={stageId:crypto.randomUUID(),categoryId,difficulty,datasetHash,questionIds:questions.map(q=>q.id),questionSources:questions.map(q=>JSON.stringify(q)),backgroundId:backgrounds[integer(backgrounds.length)].id,deckSnapshot:deck,deckPowerSnapshot:totalPower(snapshot.deck,snapshot.instances),skills:resolveSkills(deck),effectVersion:`inventory-balance-${balance.version}`,status:'input',index:0,inputs:questions.map(q=>prepareQuestion(q,difficulty,integer)),answers:[],combo:0,supportRemaining:resolveSkills(deck).supportCharges,createdAt,updatedAt:createdAt};
      return save(storage,state);
    });},
    change(id,revision,action,payload={}){return db.run(storage=>{
      const state=read(storage),s=session(state,id,revision);if(['completed','aborted'].includes(s.status))throw new Error('このステージは終了しています。');
      const input=s.inputs[s.index];
      if(['edit','answer','resume','next'].includes(action))verify(s);
      if(action==='edit'){
        if(s.status!=='input')throw new Error('回答を変更できません。');
        if(s.difficulty==='EASY'){if(payload.selected!==null&&!input.options.includes(payload.selected))throw new Error('選択肢が不正です。');input.selected=payload.selected;}
        else{if(!Array.isArray(payload.selectedIds)||new Set(payload.selectedIds).size!==payload.selectedIds.length||payload.selectedIds.some(id=>!input.tiles.some(t=>t.id===id)))throw new Error('タイルが不正です。');input.selectedIds=[...payload.selectedIds];}
      }else if(action==='answer'){
        if(s.status!=='input'||s.answers.length!==s.index)throw new Error('採点済みの問題です。');
        if(s.difficulty==='EASY'?input.selected===null:input.selectedIds.length===0)throw new Error('回答を選んでください。');
      }else if(action==='pause'){
        if(['input','feedback'].includes(s.status)){s.resumeStatus=s.status;s.status='paused';}
      }else if(action==='resume'){if(!['paused','quitConfirm'].includes(s.status))throw new Error('一時停止中ではありません。');s.status=s.resumeStatus||'input';delete s.resumeStatus;}
      else if(action==='quit'){if(s.status!=='paused')throw new Error('一時停止してください。');s.status='quitConfirm';}
      else if(action==='cancelQuit'){s.status='paused';}
      else if(action==='abort'){s.status='aborted';s.updatedAt=now();return save(storage,state);}
      else if(action==='next'){if(s.status!=='feedback'||s.answers.length!==s.index+1||s.index===9)throw new Error('次へ進めません。');s.index++;s.status='input';}
      else throw new Error('未対応のプレイ操作です。');
      if(['edit','answer','pause'].includes(action)&&typeof payload.elapsedActiveMs==='number'){
        if(!Number.isSafeInteger(payload.elapsedActiveMs)||payload.elapsedActiveMs<input.elapsedActiveMs)throw new Error('回答時間が不正です。');
        if(s.status==='input'||action==='answer'||(action==='pause'&&s.resumeStatus==='input'))input.elapsedActiveMs=payload.elapsedActiveMs;
      }
      if(action==='answer'){
        const q=dataset.categories.find(c=>c.id===s.categoryId).questions.find(q=>q.id===s.questionIds[s.index]);
        const answer={questionId:q.id,...scoreAnswer({correct:isCorrect(q,s.difficulty,input),elapsedActiveMs:input.elapsedActiveMs,combo:s.combo,supportRemaining:s.supportRemaining,skills:s.skills,difficulty:s.difficulty,config}),resolvedSkillSnapshot:s.skills};
        s.answers.push(answer);s.combo=answer.comboAfter;s.supportRemaining=answer.supportRemaining;s.status='feedback';
      }
      s.updatedAt=now();return save(storage,state,action==='answer'?{id:`answer:${s.stageId}:${s.index}`,type:'answer',stageId:s.stageId,index:s.index,correct:s.answers.at(-1).correct,at:s.updatedAt}:undefined);
    });},
    settle(id,revision){return db.run(storage=>{
      const state=read(storage);if(state.data.results[id])return structuredClone(state.data);
      const s=session(state,id,revision);verify(s);
      if(s.status!=='feedback'||s.index!==9||s.answers.length!==10)throw new Error('10問を完了してください。');
      const snapshot=inventory.prepare(storage),completedAt=now(),day=dateKey(completedAt,config.daily_timezone),before=state.data.daily[day]??0;
      if(!Number.isSafeInteger(before)||before<0)throw new Error('日次記録を確認してください。');
      const multiplier=before<config.daily_double_count?2:1,rewardBase=config.reward_coins[s.difficulty],rewardCoins=rewardBase*multiplier;
      if(!Number.isSafeInteger(snapshot.wallet.rCoin+rewardCoins))throw new Error('Rコイン残高の上限です。');
      const result={stageId:id,categoryId:s.categoryId,difficulty:s.difficulty,datasetHash:s.datasetHash,startedAt:s.createdAt,completedAt,rewardDateKey:day,backgroundId:s.backgroundId,questionResults:s.answers,deckSnapshot:s.deckSnapshot,deckPowerSnapshot:s.deckPowerSnapshot,...summarize(s.answers,s.deckPowerSnapshot),rewardBase,dailyMultiplier:multiplier,rewardCoins,completionStatus:'completed',settlementId:`play:${id}`};
      state.data.results[id]=result;state.data.daily[day]=before+1;
      const recordKey=`${s.categoryId}:${s.difficulty}`,previous=state.data.records[recordKey];
      state.data.records[recordKey]={...previous,completionCount:(previous?.completionCount??0)+1,lastStageId:id};
      if(previous?.bestScore===undefined||result.finalScoreInteger>previous.bestScore)state.data.records[recordKey].bestScore=result.finalScoreInteger;
      s.status='completed';state.data.revision++;snapshot.wallet.rCoin+=rewardCoins;
      const mission=planMissionEvent(storage,{id:`clear:${id}`,type:'clear',at:completedAt,grammarId:s.categoryId,difficulty:s.difficulty,total:10,correctCount:s.answers.filter(answer=>answer.correct).length},snapshot.wallet);
      db.commitDurable(storage,{[PLAY_KEY]:JSON.stringify(state.data),...mission.values},{[PLAY_KEY]:state.raw,...mission.expected});
      return structuredClone(state.data);
    });},
  };return api;
}
