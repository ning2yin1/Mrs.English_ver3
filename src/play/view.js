import {cardLayer,memberNames} from '../collection/components.js';
import {summarize} from './scoring.js';
const fmt=n=>Math.floor(n).toLocaleString('en-US');
function el(tag,cls,text){const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function rect(n,x,y,w,h){Object.assign(n.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});return n;}
function copy(parent,cls,text,x,y,w,h,size=26){const n=rect(el('div',`play-copy ${cls}`,text),x,y,w,h);n.style.fontSize=`${size}px`;parent.append(n);return n;}
function button(parent,id,label,callback,blue=false){const n=el('button',`play-button ${blue?'blue':'purple'}`);n.type='button';n.dataset.action=id;n.append(el('span','play-button-label',label));n.addEventListener('click',()=>callback(id,n));parent.append(n);return n;}
function image(parent,cls,path,x,y,w,h){const n=rect(el('img',cls),x,y,w,h);n.src=path;n.alt='';n.draggable=false;parent.append(n);return n;}
function panel(parent,cls,x,y,w,h){const n=rect(el('div',`play-panel ${cls}`),x,y,w,h);parent.append(n);return n;}
function header(root,state,data,act){
  const bar=el('header','play-header');root.append(bar);image(bar,'play-bar','assets/nickname/nickname_header.png',92,26,1661,84);
  if(!state.session){
    const back=button(bar,'back','',act);back.className='play-back';rect(back,118,22,88,88);back.setAttribute('aria-label','ホームに戻る');image(back,'','assets/icons/nickname_back.png',28,25,24,40);
    copy(bar,'ready-title','READY',237,42,440,60,44);
    copy(bar,'header-hint','学習する文法と難易度を選択',650,55,580,40,24);
    copy(bar,'dataset-count',`${data.dataset.categories.length}文法 / ${data.dataset.categories.reduce((n,c)=>n+c.questions.length,0)}例文`,1390,54,300,40,26);return;
  }
  const s=state.session,category=data.dataset.categories.find(c=>c.id===s.categoryId),summary=summarize(s.answers,s.deckPowerSnapshot);
  const pause=button(bar,'pause','',act);pause.className='play-pause';rect(pause,118,22,88,88);pause.setAttribute('aria-label','一時停止');pause.append(el('i',''),el('i',''));
  copy(bar,'grammar-title',`No.${s.categoryId} ${category?.title||s.categoryId}`,237,48,550,42,34);
  const difficulty=button(bar,'difficulty-badge',s.difficulty,()=>{},true);difficulty.tabIndex=-1;difficulty.style.pointerEvents='none';rect(difficulty,815,42,157,54);
  copy(bar,'progress',`${s.index+1} / 10`,1084,53,140,40,30);
  copy(bar,'score-label','スコア',1257,40,200,20,16);copy(bar,'score',fmt(summary.questionScoreRaw),1257,61,230,36,30);
  copy(bar,'combo-label','コンボ',1556,40,160,20,16);copy(bar,'combo',String(s.combo),1556,61,160,36,30);
}
function ready(root,state,data,act){
  root.classList.add('is-ready');const categories=[...data.dataset.categories].sort((a,b)=>Number(a.id)-Number(b.id)),current=categories.find(c=>c.id===state.categoryId)||categories[0]||{id:'',title:'選択できる文法がありません',description:'問題データを追加してください。',grade:'',questions:[]};
  panel(root,'ready-left',95,135,850,640);panel(root,'ready-right',971,135,777,640);
  copy(root,'list-title','英文法を選択',128,156,550,42,30);copy(root,'list-count',`${categories.length}項目`,800,158,105,40,26);
  const tabs=rect(el('nav','play-grades'),128,206,730,52);tabs.setAttribute('aria-label','学年');root.append(tabs);
  for(const [i,grade]of ['',...new Set(categories.map(c=>c.grade))].entries()){const n=button(tabs,`grade:${grade}`,grade||'すべて',act,state.grade===grade);n.setAttribute('aria-pressed',state.grade===grade);n.style.flex='1';}
  const list=rect(el('div','play-category-list'),119,280,800,483);list.setAttribute('aria-label','文法カテゴリ');root.append(list);
  for(const c of categories.filter(c=>!state.grade||c.grade===state.grade)){
    const n=button(list,`category:${c.id}`,'',act,c.id===current.id);n.classList.add('play-category');n.setAttribute('aria-pressed',c.id===current.id);n.title=`No.${c.id} ${c.title}`;n.querySelector('span').append(el('b','category-number',`No.${c.id}`),el('span','category-name',data.titles?.[c.id]||c.title),el('span','category-count',`${c.questions.length}文`));
  }
  copy(root,'selected-label','選択中の文法',1006,157,570,40,24);copy(root,'selected-id',`No.${current.id}`,1443,155,115,29,20);
  const title=copy(root,'selected-title',current.title,1006,201,570,66,38);
  const description=copy(root,'selected-description',current.description,1006,258,570,42,24);if(current.title.length>17){title.classList.add('long-title');description.style.top='270px';description.style.height='30px';}
  image(root,'ready-book','assets/play/decor/ready_book.png',1582,171,137,137);
  copy(root,'selected-grade',current.grade,1006,301,88,29,19);copy(root,'example-count',`収録例文 ${current.questions.length}文`,1120,303,440,35,24);
  copy(root,'difficulty-title','難易度を選択',1006,363,704,36,26);
  for(const [i,mode]of ['EASY','NORMAL','HARD'].entries()){
    const n=button(root,`mode:${mode}`,'',act,state.difficulty===mode);n.classList.add('play-difficulty');rect(n,1006,408+76*i,704,66);n.setAttribute('aria-pressed',state.difficulty===mode);n.querySelector('span').append(el('strong','',mode),el('span','difficulty-best',`最高スコア ${state.saved.records[`${current.id}:${mode}`]?fmt(state.saved.records[`${current.id}:${mode}`].bestScore):'—'}`),el('b','check',state.difficulty===mode?'✓':''));
  }
  const record=state.saved.records[`${current.id}:${state.difficulty}`];copy(root,'records',`最高スコア ${record?fmt(record.bestScore):'—'}　　${record?`クリア ${record.completionCount}回`:'クリア記録 未プレイ'}`,1006,638,704,29,21);
  copy(root,'start-hint',`${state.difficulty} / 1プレイ10問`,1006,674,704,29,24);
  const start=button(root,'start','START',act,true);start.classList.add('play-start');rect(start,1006,703,704,62);start.disabled=state.busy||current.questions.length<10||!state.canSave;
  copy(root,'ready-foot',`装備 ${state.deckCount}枚 / 総合力 ${fmt(state.deckPower)}　文法と難易度を選んでSTART`,119,804,1500,30,20);
}
function footer(root,state,data,act){
  const s=state.session,foot=el('footer','play-footer');root.append(foot);copy(foot,'deck-label','編成カード',128,645,300,28,21);
  const answer=s.answers[s.index],active=answer?.activeSkillIds||[];
  const cards=rect(el('div','play-deck'),128,665,272,112);foot.append(cards);
  for(const [i,slot]of s.deckSnapshot.entries()){
    const card=slot&&data.catalog.cards.find(c=>c.id===slot.catalogId);
    if(card){const n=cardLayer({x:i*96,y:0,width:80,height:112},card);if(active.includes(slot.instanceId))n.classList.add('play-skill-active');n.setAttribute('aria-label',`${memberNames[card.memberId]} ${card.rarity} Lv.${slot.level}`);cards.append(n);}
  }
  let skill='スキル待機中';if(answer){const names=[];if(answer.correct&&s.skills.scoreBps)names.push(`スコアUP +${s.skills.scoreBps/100}%`);if(answer.correct&&s.skills.speedBps)names.push(`スピードUP +${s.skills.speedBps/100}%`);if(answer.supportConsumed)names.push('コンボサポート発動・コンボ維持');skill=names.join(' / ')||'スキル発動なし';}
  copy(foot,'skill-status',skill,476,696,728,70,26);copy(foot,'deck-hint',`総合力 ${fmt(s.deckPowerSnapshot)} / 装備スキルでプレイをサポート`,128,801,1100,30,18);
  const feedback=s.status==='feedback'||(['paused','quitConfirm'].includes(s.status)&&s.resumeStatus==='feedback');
  const action=button(foot,feedback?'next':'confirm',feedback?'NEXT':'決定',act,true);rect(action,1365,705,360,72);action.classList.add('play-confirm');
  const input=s.inputs[s.index];action.disabled=state.busy||(s.status==='input'&&(s.difficulty==='EASY'?input.selected===null:!input.selectedIds.length));
}
function question(root,state,data,act){
  const s=state.session,q=data.dataset.categories.find(c=>c.id===s.categoryId)?.questions.find(q=>q.id===s.questionIds[s.index])||JSON.parse(s.questionSources[s.index]);
  const content=el('main','play-central');root.append(content);copy(content,'japanese',q.japanese,200,130,1444,80,42);
  const showing=s.status==='feedback'||(['paused','quitConfirm'].includes(s.status)&&s.resumeStatus==='feedback');
  if(showing){
    const a=s.answers[s.index];content.classList.add(a.correct?'is-correct':'is-incorrect');
    if(a.correct)image(content,'feedback-title','assets/play/decor/feedback_correct.png',737,230,370,160);else copy(content,'feedback-title incorrect-title','残念！',737,230,370,160,74);
    const accessible=el('span','play-sr',a.correct?'正解！':'残念！');accessible.setAttribute('role','status');content.append(accessible);
    copy(content,'correct-english',q.english,250,405,1344,85,46);
    const explanation=copy(content,'feedback-copy',q.explanation,320,500,1204,115,25);explanation.setAttribute('tabindex','0');
    copy(content,'earned',`+${fmt(a.awardedQuestionPointsRaw)}`,700,625,444,40,32);return;
  }
  const input=s.inputs[s.index];
  if(s.difficulty==='EASY'){
    copy(content,'arrange-hint','空欄に入る単語を選んでください',400,214,1044,32,23);
    const phrase=copy(content,'english-blank','',350,260,1150,90,48);const [before,after]=q.easy.prompt.split('_____');phrase.append(document.createTextNode(before),el('span','blank',input.selected||'_____'),document.createTextNode(after||''));
    const options=rect(el('div','play-options'),440,420,950,180);content.append(options);
    if(input.options.some(s=>s.length>12))options.classList.add('long-options');
    for(const [i,value]of input.options.entries()){const n=button(options,`option:${i}`,value,act,input.selected===value);n.setAttribute('aria-pressed',input.selected===value);}
  }else{
    const answer=rect(el('div','play-answer'),354,260,1190,120);answer.setAttribute('aria-label','回答');content.append(answer);
    for(const id of input.selectedIds){const t=input.tiles.find(t=>t.id===id);const n=button(answer,`undo:${id}`,t.text,act,true);n.classList.add('play-tile');}
    copy(content,'undo-hint','回答内の単語をタップすると取り消せます',354,386,1130,30,23);
    const bank=rect(el('div','play-bank'),354,430,1130,212);bank.setAttribute('aria-label','単語');content.append(bank);
    for(const t of input.tiles){const n=button(bank,`tile:${t.id}`,t.text,act);n.classList.add('play-tile');n.dataset.used=input.selectedIds.includes(t.id);n.disabled=input.selectedIds.includes(t.id);}
    copy(content,'answer-label','回答',128,274,150,35,25);copy(content,'bank-label','単語',128,448,150,35,25);
    copy(content,'arrange-hint',s.difficulty==='HARD'?'ダミー単語を含む並び替え・和訳に合う原文を作ろう':'英単語を並べて、和訳に合う原文を作ろう',400,214,1044,32,23);
  }
}
function modal(root,state,act){
  const s=state.session,wrap=el('div','play-modal-wrap');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label',s.status==='paused'?'一時停止':'途中終了の確認');root.append(wrap);
  panel(wrap,'play-modal-panel',487,215,870,430);
  if(s.status==='paused'){
    copy(wrap,'modal-title','一時停止',550,265,744,70,44);
    rect(button(wrap,'resume','再開',act,true),622,365,600,80);rect(button(wrap,'quit','途中終了',act),622,475,600,80);
  }else{
    copy(wrap,'modal-title','ステージを終了しますか？',550,265,744,70,38);copy(wrap,'modal-warning','スコアとRコインは獲得できません',550,355,744,70,28);
    rect(button(wrap,'cancelQuit','戻る',act,true),550,500,350,80);rect(button(wrap,'abort','終了する',act),944,500,350,80);
  }
  for(const child of [...root.children].filter(n=>n!==wrap))child.inert=true;
}
function completed(root,state,act){
  root.classList.add('is-completed');const r=state.saved.results[state.session.stageId];panel(root,'result-panel',350,150,1144,635);copy(root,'result-title','ステージ完了',420,180,1004,65,44);
  const items=[['正解数 / 正解率',`${r.correctCount}/10 ・ ${r.accuracy}%`],['基本点',r.basePointsRaw],['速度ボーナス',r.speedPointsRaw],['コンボボーナス',r.comboPointsRaw],['スキル追加点',r.skillPointsRaw],['カードボーナス',r.cardBonusRaw],['最終スコア',fmt(r.finalScoreInteger)],['獲得Rコイン',`${r.rewardCoins} R${r.dailyMultiplier===2?'（デイリー2倍）':''}`]];
  const grid=rect(el('dl','play-result-grid'),450,260,944,360);root.append(grid);for(const [label,value]of items){grid.append(el('dt','',label),el('dd','',typeof value==='number'?value.toLocaleString('en-US',{maximumFractionDigits:3}):value));}
  rect(button(root,'ready','READYへ',act,true),450,670,440,80);rect(button(root,'home','ホームへ',act),954,670,440,80);
}
export function renderPlay(state,data,act){
  const root=el('div','me-play-kit collection-root');root.dataset.view=state.session?.status||'ready';root.dataset.difficulty=state.session?.difficulty||state.difficulty;
  header(root,state,data,act);
  if(!state.session)ready(root,state,data,act);
  else if(state.session.status==='completed')completed(root,state,act);
  else{question(root,state,data,act);footer(root,state,data,act);if(['paused','quitConfirm'].includes(state.session.status))modal(root,state,act);}
  if(state.busy)root.querySelectorAll('button').forEach(n=>n.disabled=true);
  return root;
}
