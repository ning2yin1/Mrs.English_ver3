import {createShopStore} from './store.js';
import {renderShop} from './view.js';
import {createEffects} from './effects.js';
import {prepareBackground} from '../layout.js';
let resources;
export const SCENES={main:'01_shop_main',confirm:'02_purchase_confirm',opening:'03_pack_opening',back:'04_card_back',reveal:'05_card_reveal',results:'06_results'};
async function loadResources(){
  if(!resources)resources=(async()=>{
    const json=async path=>{const r=await fetch(path);if(!r.ok)throw new Error(path);return r.json();};
    const css=path=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=path;link.onload=resolve;link.onerror=reject;document.head.append(link);});
    const [catalog,products,animation,definitions,balance,...scenes]=await Promise.all([json('layouts/collection/catalog.json'),json('data/shop/catalog.json'),json('data/shop/animation.json'),json('data/inventory/card_definitions.example.json'),json('data/inventory/balance.example.json'),...Object.values(SCENES).map(n=>json(`layouts/shop/${n}.json`)),css('src/collection/style.css'),css('src/shop/style.css')]);
    return {catalog,products,animation,definitions,balance,scenes:Object.fromEntries(Object.keys(SCENES).map((n,i)=>[n,scenes[i]]))};
  })().catch(error=>{resources=null;throw error;});return resources;
}
export function createShop({stage,resize,onHome,onInventory,notify=()=>{},store:customStore,resources:customResources}){
  const state={screen:'main',index:0,sku:null,receipt:null,snapshot:null,busy:false,animating:false,storageBlocked:false};
  let data,store,fx,active=false,generation=0,task=0,root,operationId,wasHidden=false;
  const error=err=>notify(err?.message||'購入データを確認してください。既存データは保持しています。');
  async function refresh(){state.snapshot=await store.load();}
  async function render(){
    const id=++generation;
    const view=await renderShop(data.scenes[state.screen],state,actions,data);
    await Promise.all([...view.querySelectorAll('img')].map(im=>im.decode()));
    if(!active||id!==generation)return null;
    root=view;stage.replaceChildren(root);stage.dataset.screen=`shop_${state.screen}`;stage.setAttribute('aria-label',{main:'ショップ',confirm:'購入確認',opening:'パック開封',back:'カード公開前',reveal:'カード獲得',results:'獲得結果'}[state.screen]);document.body.dataset.screen=`shop_${state.screen}`;resize();
    if(state.screen==='opening'&&!state.animating)fx.idle(root);
    return root;
  }
  async function progress(){try{await store.progress(state.receipt.purchaseId,state.screen,state.index);}catch(e){error(e);}}
  async function preloadReceipt(){
    const paths=new Set(['assets/shop/cards/card_back.png',data.animation.flash]);
    for(const result of state.receipt.results){const card=data.catalog.cards.find(c=>c.id===result.catalogId);paths.add(card.image);paths.add(card.frame);}
    await Promise.all([...paths].map(async path=>{const image=new Image();image.src=path;await image.decode();}));
  }
  async function finish(){
    const id=++task;fx.cancel();state.busy=true;state.animating=false;state.screen='results';await refresh();
    const view=await render();if(!view||id!==task||!active)return;
    try{await fx.results(view);}catch(e){if(e.name==='AbortError')return;throw e;}
    if(id!==task||!active)return;state.busy=false;await render();await progress();
  }
  async function openAnimation(){
    if(state.animating||state.busy)return;const id=++task;state.animating=true;const view=await render();if(!view||id!==task||!active)return;
    try{await fx.pack(view);if(id!==task||!active)return;state.screen='back';const back=await render();if(!back||id!==task||!active)return;await fx.back(back);if(id!==task||!active)return;state.animating=false;await render();await progress();}catch(e){if(e.name!=='AbortError')error(e);}
  }
  async function flip(){
    if(state.animating||state.busy)return;const id=++task;state.animating=true;const view=await render();if(!view||id!==task||!active)return;
    try{const card=data.catalog.cards.find(c=>c.id===state.receipt.results[state.index].catalogId);await fx.flip(view,card);if(id!==task||!active)return;state.screen='reveal';const front=await render();if(!front||id!==task||!active)return;await fx.reveal(front,card.rarity);if(id!==task||!active)return;state.animating=false;await render();await progress();}catch(e){if(e.name!=='AbortError')error(e);}
  }
  async function next(){
    if(state.animating||state.busy)return;
    if(state.index===state.receipt.count-1){await finish();return;}
    const id=++task;state.animating=true;const view=await render();if(!view||id!==task||!active)return;
    try{await fx.next(view);if(id!==task||!active)return;state.index++;state.screen='back';const back=await render();if(!back||id!==task||!active)return;await fx.back(back);if(id!==task||!active)return;state.animating=false;await render();await progress();}catch(e){if(e.name!=='AbortError')error(e);}
  }
  function leave(callback){active=false;task++;generation++;fx.cancel();window.removeEventListener('storage',onStorage);document.removeEventListener('visibilitychange',onVisibility);callback();}
  async function choose(id){fx.cancel();await refresh();if(state.snapshot.receipt){state.receipt=state.snapshot.receipt;state.sku=data.products.skus.find(s=>s.id===state.receipt.sku);await finish();return;}state.sku=data.products.skus.find(s=>s.id===id);state.screen='confirm';state.busy=false;operationId=crypto.randomUUID();await render();}
  const actions={async tap(e){
    try{
      if(e.id==='skip'){if(state.receipt)await finish();return;}
      if(state.busy||state.animating)return;
      if(state.screen==='main'){
        if(e.id==='back'){leave(onHome);return;}
        await choose(e.id==='welcome_10'?'welcome_10':`normal_${e.id.slice(4)}`);return;
      }
      if(state.screen==='confirm'){
        if(['back','close','cancel'].includes(e.id)){state.screen='main';fx.cancel();await refresh();await render();return;}
        if(e.id==='purchase'){
          state.busy=true;await render();
          try{state.receipt=await store.purchase(state.sku.id,operationId);await refresh();await preloadReceipt();state.screen='opening';state.index=0;state.busy=false;await render();}
          catch(e){state.busy=false;error(e);try{await refresh();state.storageBlocked=!navigator.locks?.request;if(state.snapshot.receipt){state.receipt=state.snapshot.receipt;state.sku=data.products.skus.find(s=>s.id===state.receipt.sku);await preloadReceipt();state.screen='results';await render();return;}}catch{state.storageBlocked=true;}await render();}
          return;
        }
      }
      if(state.screen==='opening'){await openAnimation();return;}
      if(state.screen==='back'){await flip();return;}
      if(state.screen==='reveal'){await next();return;}
      if(state.screen==='results'){
        state.busy=true;await store.progress(state.receipt.purchaseId,'closed',state.index);state.busy=false;
        if(e.id==='inventory'){leave(onInventory);return;}
        state.receipt=null;state.screen='main';fx.cancel();await refresh();await render();
      }
    }catch(e){state.busy=false;error(e);}
  }};
  async function onStorage(event){if(!['mrsEnglishV3.shop.v1','mrsEnglishV3.wallet.v1'].includes(event.key)||state.busy||state.animating)return;try{await refresh();if(!state.receipt&&state.snapshot.receipt){state.receipt=state.snapshot.receipt;state.sku=data.products.skus.find(s=>s.id===state.receipt.sku);state.screen='results';}await render();}catch(e){error(e);}}
  async function onVisibility(){if(document.hidden){wasHidden=true;task++;fx.cancel();state.animating=false;}else if(wasHidden&&state.receipt&&!state.busy){wasHidden=false;try{await finish();}catch(e){error(e);}}}
  return {async open(){
    try{
      data=customResources||await loadResources();store=customStore||createShopStore(data);fx=createEffects(data.animation);await refresh();
      const bg=await prepareBackground('assets/collection/background.png');document.querySelector('#scene-background').replaceWith(bg);active=true;state.storageBlocked=!navigator.locks?.request;state.busy=false;state.animating=false;
      if(state.snapshot.receipt){state.receipt=state.snapshot.receipt;state.sku=data.products.skus.find(s=>s.id===state.receipt.sku);state.index=0;state.screen='results';await preloadReceipt();}else{state.receipt=null;state.screen='main';}
      window.removeEventListener('storage',onStorage);window.addEventListener('storage',onStorage);document.removeEventListener('visibilitychange',onVisibility);document.addEventListener('visibilitychange',onVisibility);await render();
      if(state.storageBlocked)notify('安全な購入処理が利用できないため、購入を無効にしています。');
    }catch(e){console.error(e);error(e);}
  }};
}
