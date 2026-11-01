import {renderCollection} from './view.js';
import {createOwnershipStore,ownedCards} from './store.js';
import {prepareBackground} from '../layout.js';
let resources;
async function loadResources() {
  if(!resources) resources=(async()=>{
    const style=document.createElement('link');style.rel='stylesheet';style.href='src/collection/style.css';
    const ready=new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=reject;});document.head.append(style);
    const json=async name=>{const r=await fetch(`layouts/collection/${name}.json`);if(!r.ok)throw new Error(name);return r.json();};
    const names=['collection_owned','collection_detail','collection_empty'];
    const [catalog,...scenes]=await Promise.all([json('catalog'),...names.map(json),ready]);
    return {catalog,scenes:Object.fromEntries(names.map((name,i)=>[name,scenes[i]]))};
  })().catch(error=>{resources=null;throw error;});
  return resources;
}
export function createCollection({stage,resize,onHome,notify=()=>{},store:customStore}) {
  const state={member:null,rarity:null,scrollTop:0,index:0,dropdown:false,total:0,filtered:[]};
  let data,store,owned=[],active=false,detail=false,generation=0;
  const actions={
    tap(e) {
      if(e.id==='back'&&detail){detail=false;render();}
      else if(e.route==='home'){active=false;generation++;window.removeEventListener('storage',onStorage);onHome();}
      else if(e.id==='member_filter'){state.dropdown=!state.dropdown;render();}
      else if(e.action==='filter-rarity'){state.rarity=e.value;state.scrollTop=0;filter();render();}
      else if(e.id==='previous')actions.step(-1);
      else if(e.id==='next')actions.step(1);
    },
    detail(id){state.index=state.filtered.findIndex(card=>card.id===id);detail=true;render();},
    step(amount){const index=state.index+amount;if(index>=0&&index<state.filtered.length){state.index=index;render();}},
    member(value){state.member=value;state.dropdown=false;state.scrollTop=0;filter();render();},
    closeDropdown(){state.dropdown=false;render();},
  };
  function filter(){state.filtered=owned.filter(card=>(!state.member||card.memberId===state.member)&&(!state.rarity||card.rarity===state.rarity));state.index=Math.max(0,Math.min(state.index,state.filtered.length-1));}
  function read(){
    const {ledger,error}=store.read();owned=ownedCards(data.catalog,ledger);
    state.total=owned.reduce((sum,card)=>sum+card.quantity,0);filter();
    if(error)notify('所持データを読み込めません。保存内容は変更していません。');
  }
  async function render() {
    const version=++generation;
    try {
      if(!state.filtered.length)detail=false;
      const scene=data.scenes[detail?'collection_detail':state.filtered.length?'collection_owned':'collection_empty'];
      const root=await renderCollection(scene,state,actions,data.scenes);
      if(!active||version!==generation)return;
      stage.replaceChildren(root);stage.dataset.screen=scene.screen;stage.setAttribute('aria-label',detail?'カード詳細':'コレクション');
      document.body.dataset.screen=scene.screen;resize();root.afterMount?.();
    }catch(error){console.error(error);notify('コレクションを表示できませんでした。再度開いてください。');}
  }
  function onStorage(event){if(event.key==='mrsEnglishV3.collection.v1'){read();render();}}
  return {
    async open(cardId) {
      try {
        data=await loadResources();store=customStore||createOwnershipStore(data.catalog);read();
        const background=await prepareBackground('assets/collection/background.png');
        document.querySelector('#scene-background').replaceWith(background);
        active=true;detail=false;state.dropdown=false;
        if(cardId&&state.filtered.some(c=>c.id===cardId)){state.index=state.filtered.findIndex(c=>c.id===cardId);detail=true;}
        window.removeEventListener('storage',onStorage);window.addEventListener('storage',onStorage);
        await render();
      }catch(error){console.error(error);notify('コレクションの素材を読み込めませんでした。');}
    },
  };
}
