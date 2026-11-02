import {createMissionStore} from './store.js';
import {nextBoundary} from './engine.js';
import {loadStyle} from '../menu.js';
export function createMission({onHome,notify=()=>{},enabled=()=>true}) {
  const store=createMissionStore();
  const report=error=>notify(error?.name==='SecurityError'?'ミッションを保存できません。このブラウザーの保存設定を確認してください。':error.message);
  let root,kind='daily',snapshot,renderMission,boundaryTimer,generation=0,refreshing=null;
  const scroll={daily:0,weekly:0};
  async function render(focusTab=false,preserveScroll=true){
    if(!root)return;
    if(preserveScroll)scroll[kind]=root.querySelector('ul')?.scrollTop||0;
    const next=renderMission({snapshot,kind,onHome:()=>{close();onHome();},onTab:(selected,focus)=>{scroll[kind]=root.querySelector('ul').scrollTop;kind=selected;render(focus,false);}});
    root.replaceWith(next);root=next;fit();root.querySelector('ul').scrollTop=scroll[kind];if(focusTab)root.querySelector('[aria-selected=true]').focus();
  }
  function schedule(){clearTimeout(boundaryTimer);boundaryTimer=setTimeout(()=>refresh(),Math.max(1,nextBoundary()-Date.now()+25));}
  async function refresh(){
    if(!enabled())return;
    if(refreshing)return refreshing;
    refreshing=(async()=>{try{snapshot=await store.refresh();if(root)await render();await pump();}catch(error){report(error);}finally{schedule();}})();
    try{return await refreshing;}finally{refreshing=null;}
  }
  function close(){generation++;root?.remove();root=null;}
  let toast,toastReady,pumping=false,current=null,timer,remaining=0,due=0,phase='hidden';
  async function ensureToast(){
    toastReady ||= (async()=>{await loadStyle('./mission/notification.css');const {CHECK}=await import('./view.js');toast=document.createElement('div');toast.className='me-mission-toast';toast.hidden=true;toast.dataset.phase='hidden';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true');toast.innerHTML=CHECK+'<strong class="me-mission-toast__title">ミッション達成！</strong><span class="me-mission-toast__divider"></span><span class="me-mission-toast__name"></span><span class="me-mission-toast__divider"></span><span class="me-mission-toast__reward"><img alt=""><span></span></span>';toast.firstChild.classList.add('me-mission-toast__check');document.body.append(toast);})();
    try{await toastReady;}catch(error){toastReady=null;throw error;}
  }
  function fit(){if(!root)return;const r=document.querySelector('#safe-area').getBoundingClientRect();for(const [name,value]of Object.entries({l:r.left,r:innerWidth-r.right,t:r.top,b:innerHeight-r.bottom}))root.style.setProperty('--safe-'+name,`${value}px`);}
  function placeToast(){
    if(!toast||!current)return;
    const safe=document.querySelector('#safe-area').getBoundingClientRect(),v=visualViewport,left=Math.max(safe.left,v?.offsetLeft||0),right=Math.min(safe.right,(v?.offsetLeft||0)+(v?.width||innerWidth));
    const settings=document.querySelector('.settings-screen header'),mission=root?.querySelector('header'),stage=document.querySelector('#stage');
    const candidates=[settings,mission,stage.querySelector('[data-layer="status_player"]'),stage.querySelector('[data-layer$="_002"]'),stage.querySelector('.play-header .play-bar'),stage.querySelector('.play-header'),...stage.querySelectorAll('img[src$="_header.png"]')];
    const header=candidates.find(n=>n&&n.getBoundingClientRect().height>0),rect=header?.getBoundingClientRect();
    const bottom=rect?Math.min(rect.bottom,safe.top+Math.max(44,safe.height*.2)):safe.top;
    toast.style.setProperty('--header-bottom',`${bottom}px`);toast.style.left=`${(left+right)/2}px`;toast.style.maxWidth=`${Math.max(0,right-left-24)}px`;toast.style.minWidth=`${Math.min(800*Math.min(1,Math.max(.65,innerWidth/1536)),Math.max(0,right-left-24))}px`;
  }
  function arm(ms){remaining=ms;clearTimeout(timer);if(document.hidden)return;due=performance.now()+ms;timer=setTimeout(advance,ms);}
  function advance(){
    if(document.hidden)return;
    if(phase==='enter'){phase='hold';toast.dataset.phase=phase;arm(3000);}
    else if(phase==='hold'){phase='exit';toast.dataset.phase=phase;arm(220);}
    else if(phase==='exit'){phase='hidden';toast.dataset.phase=phase;toast.hidden=true;arm(100);}
    else{current=null;pump();}
  }
  async function pump(){
    if(!enabled()||pumping||current||document.hidden)return;pumping=true;
    try{
      // Only create/read visual resources when a committed notification actually exists.
      const pending=await store.refresh();if(!pending.data.outbox.some(n=>n.status==='pending'))return;
      await ensureToast();current=await store.nextNotification();if(!current)return;
      const {ASSETS}=await import('./assets.js'),diamond=current.currency==='diamond',reward=`＋${current.amount.toLocaleString('en-US')}${diamond?'':' R'}`;
      toast.querySelector('.me-mission-toast__name').textContent=current.name;toast.querySelector('.me-mission-toast__reward img').src=ASSETS[`assets/mission/icons/mission_${diamond?'diamond':'coin'}.png`];toast.querySelector('.me-mission-toast__reward span').textContent=reward;toast.setAttribute('aria-label',`ミッション達成！ ${current.name} ${diamond?'ダイヤ':'Rコイン'} ${current.amount}`);
      phase='enter';toast.hidden=false;toast.dataset.phase='hidden';placeToast();toast.getBoundingClientRect();toast.dataset.phase=phase;arm(180);
    }catch(error){report(error);current=null;}finally{pumping=false;}
  }
  function changed(){if(root)refresh();else pump();}
  window.addEventListener('mrs-progress-change',changed);
  window.addEventListener('storage',event=>{if(event.key===null||event.key==='mrsEnglishV3.missions.v1')changed();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);if(current)remaining=Math.max(0,due-performance.now());}else{if(current)arm(remaining);refresh();}});
  window.addEventListener('focus',()=>refresh());
  window.addEventListener('resize',()=>{fit();placeToast();});visualViewport?.addEventListener('resize',placeToast);visualViewport?.addEventListener('scroll',placeToast);
  const observer=new MutationObserver(()=>{if(current)requestAnimationFrame(placeToast);});observer.observe(document.querySelector('#stage'),{childList:true});observer.observe(document.body,{attributes:true,attributeFilter:['data-screen']});
  new ResizeObserver(()=>{fit();placeToast();}).observe(document.querySelector('#safe-area'));
  return {refresh,close,async open(){
    const version=++generation;
    try{const [view]=await Promise.all([import('./view.js'),loadStyle('./mission/skin.css'),loadStyle('./mission/layout.css')]);renderMission=view.renderMission;snapshot=await store.refresh();if(version!==generation)return;
      root?.remove();root=renderMission({snapshot,kind,onHome:()=>{close();onHome();},onTab:(selected,focus)=>{scroll[kind]=root.querySelector('ul').scrollTop;kind=selected;render(focus,false);}});document.body.append(root);fit();document.body.dataset.screen='mission';document.querySelector('#stage').replaceChildren();document.querySelector('#stage').dataset.screen='mission';root.querySelector('.me-mission__back').focus();schedule();pump();
    }catch(error){report(error);}
  }};
}
