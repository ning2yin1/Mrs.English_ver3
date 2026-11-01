// QA-only memory store. This entry, deterministic RNG and sample wallet never ship in dist/.
import {createShop,SCENES} from '../src/shop/controller.js';
import {createShopStore} from '../src/shop/store.js';
import {createLayout} from '../src/layout.js';
const json=async path=>(await fetch(path)).json();
const [catalog,products,animation,definitions,balance,...scenes]=await Promise.all([json('layouts/collection/catalog.json'),json('data/shop/catalog.json'),json('data/shop/animation.json'),json('data/inventory/card_definitions.example.json'),json('data/inventory/balance.example.json'),...Object.values(SCENES).map(name=>json(`layouts/shop/${name}.json`))]);
const data={catalog,products,animation,definitions,balance,scenes:Object.fromEntries(Object.keys(SCENES).map((key,i)=>[key,scenes[i]]))};
const values=new Map([['mrsEnglishV3.profile',JSON.stringify({version:3,nickname:'Nene',memberId:'motoki',backgroundId:'bg-01',setupComplete:true})],['mrsEnglishV3.wallet.v1',JSON.stringify({version:1,rCoin:25000,diamonds:21})]]);
const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
const ids=data.scenes.results.layers.filter(e=>e.kind==='card').map(e=>e.catalog_id);
let calls=0;
const integer=limit=>{const index=Math.floor(calls++/2)%ids.length,card=catalog.cards.find(c=>c.id===ids[index]);if(calls%2===1)return {R:0,S:10,A:10,B:35,C:65}[card.rarity];return catalog.cards.filter(c=>c.rarity===card.rarity).findIndex(c=>c.id===card.id);};
const store=createShopStore({...data,storageProvider:()=>storage,integer});
const stage=document.querySelector('#stage'),{resize}=createLayout(document.querySelector('#safe-area'),stage);
const shop=createShop({stage,resize,resources:data,store,onHome:()=>location.assign(new URL('./',document.baseURI)),onInventory:()=>location.assign(new URL('./',document.baseURI)),notify:text=>{const n=document.querySelector('#notice');n.textContent=text;n.hidden=false;}});
await shop.open();
