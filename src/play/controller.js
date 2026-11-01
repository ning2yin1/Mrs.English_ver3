import {createPlayStore} from './store.js';
import {validateDataset} from './data.js';
import {renderPlay} from './view.js';
import {prepareBackground} from '../layout.js';
import {createInventoryStore} from '../inventory/store.js';
import {totalPower} from '../inventory/model.js';
import {persistence} from '../inventory/persistence.js';
let resources;
export async function loadPlayResources(){
  if(!resources)resources=(async()=>{
    const json=async p=>{const r=await fetch(p);if(!r.ok)throw new Error(`読込失敗: ${p}`);return r.json();};
    const css=p=>new Promise((resolve,reject)=>{const n=document.createElement('link');n.rel='stylesheet';n.href=p;n.onload=resolve;n.onerror=reject;document.head.append(n);});
    const response=await fetch('data/play/source/grammar_01_40.json');if(!response.ok)throw new Error('問題を読み込めません。');const source=await response.text(),dataset=validateDataset(JSON.parse(source));
    const datasetHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)))].map(n=>n.toString(16).padStart(2,'0')).join('');
    const [config,backgrounds,catalog,definitions,balance,layouts]=await Promise.all([json('specs/play/scoring_config.json'),json('specs/play/backgrounds.json'),json('layouts/collection/catalog.json'),json('data/inventory/card_definitions.example.json'),json('data/inventory/balance.example.json'),json('specs/play/layouts.json'),css('src/collection/style.css'),css('src/play/style.css')]);
    await document.fonts.load('26px PlayJP');await document.fonts.load('700 26px PlayJP');await document.fonts.load('26px PlayEN');
    return {dataset,datasetHash,config,backgrounds,catalog,definitions,balance,layouts};
  })().catch(e=>{resources=null;throw e;});return resources;
}
export function createPlay({stage,resize,onHome,notify=()=>{},resources:customResources,store:customStore}){
  const state={session:null,saved:null,categoryId:'01',difficulty:'EASY',grade:'',deckCount:0,deckPower:0,busy:false,canSave:true};
  let data,store,active=false,root,renderId=0,anchor=null,baseMs=0,queue=Promise.resolve(),backgroundPath,checkpoint,observing=false;
  const error=e=>notify(e.message||'プレイを保存できませんでした。再試行してください。');
  const running=()=>active&&state.session?.status==='input'&&!document.hidden&&innerWidth>innerHeight;
  function elapsed(){return baseMs+(anchor===null?0:Math.max(0,Math.floor(performance.now()-anchor)));}
  function stop(){baseMs=elapsed();anchor=null;}
  function startClock(){baseMs=state.session?.inputs[state.session.index]?.elapsedActiveMs||0;anchor=running()?performance.now():null;}
  function adopt(saved){state.saved=saved;const s=saved.session;state.session=s&&!['aborted'].includes(s.status)?s:null;}
  function fit(){
    if(!active||!root)return false;const safe=document.querySelector('#safe-area'),r=safe.getBoundingClientRect();
    const compact=Math.min(r.width/1844,r.height/853)<.72;root.dataset.layout=compact?'compact':'reference';root.classList.toggle('is-short',r.height<365);
    if(compact){Object.assign(stage.style,{left:'0px',top:'0px',width:`${r.width}px`,height:`${r.height}px`,transform:'none'});return true;}
    return false;
  }
  stage.resizeDeviceLayout=fit;
  async function render(decode=true){
    const id=++renderId;const scroll=root?.querySelector('.play-category-list')?.scrollTop||0,central=root?.querySelector('.play-central')?.scrollTop||0;
    const next=renderPlay(state,data,tap);if(decode)await Promise.all([...next.querySelectorAll('img')].map(im=>im.decode()));
    if(!active||id!==renderId)return;
    root=next;stage.replaceChildren(root);const screen=state.session?state.session.status:'ready';stage.dataset.screen=`play_${screen}`;document.body.dataset.screen=`play_${screen}`;stage.setAttribute('aria-label',state.session?'英語プレイ':'READY');
    resize();if(root.querySelector('.play-category-list'))root.querySelector('.play-category-list').scrollTop=scroll;if(root.querySelector('.play-central'))root.querySelector('.play-central').scrollTop=central;
    if(['paused','quitConfirm'].includes(state.session?.status))root.querySelector('.play-modal-wrap button')?.focus({preventScroll:true});
  }
  async function backdrop(){
    const path=state.session?data.backgrounds.find(b=>b.id===state.session.backgroundId)?.path:'assets/collection/background.png';
    if(!path)throw new Error('背景写真を読み込めません。');
    if(path!==backgroundPath){const bg=await prepareBackground(path);document.querySelector('#scene-background').replaceWith(bg);backgroundPath=path;}
  }
  function leave(){active=false;anchor=null;clearInterval(checkpoint);renderId++;window.removeEventListener('storage',onStorage);window.removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',onPageHide);onHome();}
  async function ready(){
    stop();state.session=null;
    const categories=[...data.dataset.categories].sort((a,b)=>Number(a.id)-Number(b.id));
    if(!categories.some(c=>c.id===state.categoryId))state.categoryId=categories[0]?.id||'';
    if(state.grade&&!categories.some(c=>c.grade===state.grade))state.grade='';
    await backdrop();const inventory=createInventoryStore(data),snapshot=await persistence().read(storage=>inventory.prepare(storage));state.deckCount=snapshot.deck.filter(Boolean).length;state.deckPower=totalPower(snapshot.deck,snapshot.instances);await render();
  }
  function schedule(fn){queue=queue.then(fn).catch(async e=>{anchor=null;error(e);try{adopt(await store.load());if(state.session?.status==='input'){// A conflicting/retried tab resumes explicitly, never silently resets its timer.
      adopt(await store.change(state.session.stageId,state.saved.revision,'pause',{elapsedActiveMs:state.session.inputs[state.session.index].elapsedActiveMs}));}
      await backdrop();await render();}catch(recovery){error(recovery);}});return queue;}
  function tap(id){
    if(state.busy)return;
    if(!state.session){
      if(id==='back'){leave();return;}
      if(id.startsWith('grade:')){state.grade=id.slice(6);render();return;}
      if(id.startsWith('category:')){state.categoryId=id.slice(9);render();return;}
      if(id.startsWith('mode:')){state.difficulty=id.slice(5);render();return;}
      if(id==='start'){state.busy=true;schedule(async()=>{try{adopt(await store.start(state.categoryId,state.difficulty,state.saved.revision));await backdrop();await render();}finally{state.busy=false;await render();startClock();}});return;}
      return;
    }
    if(state.session.status==='completed'){
      if(['home','ready'].includes(id)){state.busy=true;schedule(async()=>{try{adopt(await store.dismiss(state.session.stageId,state.saved.revision));if(id==='home')leave();else await ready();}finally{state.busy=false;if(active)await render();}});return;}return;
    }
    const s=state.session;
    if(id.startsWith('option:')||id.startsWith('tile:')||id.startsWith('undo:')){
      if(s.status!=='input')return;const ms=elapsed();
      schedule(async()=>{
        if(state.session?.stageId!==s.stageId||state.session.status!=='input')return;
        const input=state.session.inputs[state.session.index];let payload;
        if(id.startsWith('option:')){const value=input.options[Number(id.slice(7))];payload={selected:input.selected===value?null:value,elapsedActiveMs:ms};}
        else{const tile=id.slice(id.indexOf(':')+1);if(id.startsWith('tile:')&&input.selectedIds.includes(tile))return;payload={selectedIds:id.startsWith('undo:')?input.selectedIds.filter(i=>i!==tile):[...input.selectedIds,tile],elapsedActiveMs:ms};}
        adopt(await store.change(s.stageId,state.saved.revision,'edit',payload));
        await render(false);});return;
    }
    state.busy=true;stop();const ms=baseMs;
    schedule(async()=>{try{
      if(id==='confirm')adopt(await store.change(s.stageId,state.saved.revision,'answer',{elapsedActiveMs:ms}));
      else if(id==='next'){if(s.index===9)adopt(await store.settle(s.stageId,state.saved.revision));else adopt(await store.change(s.stageId,state.saved.revision,'next'));}
      else if(['pause','resume','quit','cancelQuit','abort'].includes(id))adopt(await store.change(s.stageId,state.saved.revision,id,{elapsedActiveMs:ms}));
      if(id==='abort'){await ready();return;}
      await render();
    }finally{state.busy=false;await render();startClock();}});
  }
  function autoPause(){if(!active||!state.session||!['input','feedback'].includes(state.session.status))return;stop();const id=state.session.stageId,ms=baseMs;
    schedule(async()=>{const saved=await store.load();adopt(saved);if(state.session?.stageId===id&&['input','feedback'].includes(state.session.status))adopt(await store.change(id,state.saved.revision,'pause',{elapsedActiveMs:Math.max(ms,state.session.inputs[state.session.index].elapsedActiveMs)}));await render();});}
  function onVisibility(){if(document.hidden)autoPause();}
  function onPageHide(){autoPause();}
  function onResize(){fit();if(innerWidth<=innerHeight)autoPause();}
  function onStorage(e){if(active&&e.key==='mrsEnglishV3.play.v1'){stop();schedule(async()=>{adopt(await store.load());if(state.session&&['input','feedback'].includes(state.session.status))adopt(await store.change(state.session.stageId,state.saved.revision,'pause',{elapsedActiveMs:state.session.inputs[state.session.index].elapsedActiveMs}));notify('別のタブで更新されました。保存済み状態から再開してください。');await backdrop();await render();});}}
  return {async open(){
    try{data=customResources||await loadPlayResources();store=customStore||createPlayStore(data);state.canSave=!!navigator.locks?.request;adopt(await store.load());active=true;backgroundPath=undefined;
      if(state.session&&['input','feedback'].includes(state.session.status))adopt(await store.change(state.session.stageId,state.saved.revision,'pause',{elapsedActiveMs:state.session.inputs[state.session.index].elapsedActiveMs}));
      if(!state.session)await ready();else{await backdrop();await render();startClock();}
      window.removeEventListener('storage',onStorage);window.addEventListener('storage',onStorage);window.removeEventListener('resize',onResize);window.addEventListener('resize',onResize);document.removeEventListener('visibilitychange',onVisibility);document.addEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',onPageHide);window.addEventListener('pagehide',onPageHide);
      if(!observing){
        new ResizeObserver(fit).observe(document.querySelector('#safe-area'));
        // Keep Play sizing current after focus and viewport changes; existing screens retain their layout.
        document.addEventListener('focusin',fit);
        document.addEventListener('focusout',()=>requestAnimationFrame(fit));
        window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);
        observing=true;
      }
      clearInterval(checkpoint);checkpoint=setInterval(()=>{if(running()&&!state.busy&&anchor!==null){const s=state.session,ms=elapsed();schedule(async()=>{if(state.session?.stageId!==s.stageId||state.session?.index!==s.index||state.session?.status!=='input')return;const input=state.session.inputs[s.index],payload=s.difficulty==='EASY'?{selected:input.selected}:{selectedIds:input.selectedIds};adopt(await store.change(s.stageId,state.saved.revision,'edit',{...payload,elapsedActiveMs:ms}));});}},2000);
    }catch(e){error(e);}
  }};
}
