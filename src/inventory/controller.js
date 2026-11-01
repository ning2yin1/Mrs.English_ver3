import {renderInventory} from './view.js';
import {createInventoryStore} from './store.js';
import {development} from './runtime-config.js';
import {JOURNAL_KEY} from './persistence.js';
import {prepareBackground} from '../layout.js';
let resources;
async function loadResources(){
  if(!resources)resources=(async()=>{
    const css=path=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=path;link.onload=resolve;link.onerror=reject;document.head.append(link);});
    const json=async path=>{const r=await fetch(path);if(!r.ok)throw new Error(path);return r.json();};
    const [catalog,definitions,balance,...scenes]=await Promise.all([
      json('layouts/collection/catalog.json'),json('data/inventory/card_definitions.example.json'),json('data/inventory/balance.example.json'),
      ...['main','deck','upgrade'].map(n=>json(`layouts/inventory/inventory_${n}.json`)),
      css('src/collection/style.css'),css('src/inventory/style.css'),
    ]);
    return {catalog,definitions,balance,scenes:Object.fromEntries(['main','deck','upgrade'].map((n,i)=>[n,scenes[i]]))};
  })().catch(e=>{resources=null;throw e;});
  return resources;
}
export function createInventory({stage,resize,onHome,notify=()=>{},store:customStore}) {
  const state={screen:'main',selected:null,slot:1,draft:null,scroll:{main:0,deck:0},descending:false,busy:false};
  let data,store,active=false,generation=0,seeded=false;
  const report=error=>notify(error?.message||'保存できませんでした。元の状態を保持しています。');
  async function initialize(){data=await loadResources();store=customStore||createInventoryStore(data);state.balance=data.balance;}
  async function refresh(){state.snapshot=await store.load();if(state.selected&&!state.snapshot.instances.some(i=>i.instanceId===state.selected))state.selected=null;}
  async function render(){
    const id=++generation;
    const root=await renderInventory(data.scenes[state.screen],state,actions);
    if(!active||generation!==id)return;
    stage.replaceChildren(root);stage.dataset.screen=`inventory_${state.screen}`;stage.setAttribute('aria-label',{main:'インベントリ',deck:'デッキ編成',upgrade:'カード強化'}[state.screen]);
    document.body.dataset.screen=`inventory_${state.screen}`;resize();root.afterMount?.();
  }
  async function safeRender(){try{await render();}catch(error){console.error(error);report(error);}}
  const actions={
    select(id){
      if(state.busy)return;
      if(state.screen==='deck'){
        if(state.draft.some((entry,index)=>index!==state.slot&&entry===id))return;
        state.draft[state.slot]=id;
      }else state.selected=id;
      safeRender();
    },
    async tap(e){
      if(state.busy)return;
      try {
        if(e.id==='back'){
          if(state.screen==='main'){active=false;generation++;window.removeEventListener('storage',onStorage);onHome();return;}
          state.draft=null;state.screen='main';await refresh();
        }else if(e.id==='edit_deck'){
          await refresh();state.draft=[...state.snapshot.deck];state.expectedRevision=state.snapshot.data.revision||0;state.screen='deck';
        }else if(e.slot!==undefined)state.slot=e.slot;
        else if(e.id==='confirm_deck'){
          state.busy=true;await safeRender();
          state.snapshot=await store.saveDeck(state.draft,state.expectedRevision);state.draft=null;state.screen='main';state.busy=false;
        }else if(e.id==='upgrade_card'){
          await refresh();state.selected=state.selected||state.snapshot.deck.find(Boolean)||state.snapshot.instances[0]?.instanceId;
          if(!state.selected)return;state.screen='upgrade';
        }else if(e.id==='upgrade'){
          const instance=state.snapshot.instances.find(i=>i.instanceId===state.selected);if(!instance)return;
          state.busy=true;await safeRender();
          state.snapshot=await store.upgrade(instance.instanceId,instance.level,crypto.randomUUID());
          // Keep the synchronous lock through the double-tap interval, including rerender time.
          await new Promise(resolve=>setTimeout(resolve,400));await refresh();state.busy=false;
        }else if(e.id==='acquisition_order'){state.descending=!state.descending;state.scroll.main=0;}
        else if(e.id==='show_all'){state.descending=false;state.scroll.main=0;}
      }catch(error){state.busy=false;report(error);try{await refresh();}catch{} }
      await safeRender();
    },
  };
  async function onStorage(event){if(['mrsEnglishV3.collection.v1','mrsEnglishV3.inventory.v1','mrsEnglishV3.wallet.v1'].includes(event.key)&&!state.busy){try{await refresh();if(state.screen==='deck')notify('別の画面で保存内容が更新されました。確定時に再検証します。');await safeRender();}catch(error){report(error);}}}
  return {
    async initializeDevelopment(){
      if(!development.enabled){let pending=false;try{pending=localStorage.getItem(JOURNAL_KEY)!==null;}catch{}if(pending){await initialize();await refresh();}return;}
      if(seeded)return;
      await initialize();const seed=await(await fetch('data/inventory/dev_seed.example.json')).json();
      await store.seedDevelopment(seed,development);seeded=true;
    },
    async open(){
      try{
        await initialize();await refresh();const bg=await prepareBackground('assets/collection/background.png');
        document.querySelector('#scene-background').replaceWith(bg);active=true;state.screen='main';state.draft=null;
        window.removeEventListener('storage',onStorage);window.addEventListener('storage',onStorage);await safeRender();
      }catch(error){console.error(error);report(error);}
    },
  };
}
