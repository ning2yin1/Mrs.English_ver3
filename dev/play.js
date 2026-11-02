// Excluded from production. Fixed picture/order and sample cards exist in this memory store only.
import {createPlay,loadPlayResources} from '../src/play/controller.js';
import {createPlayStore} from '../src/play/store.js';
import {createLayout} from '../src/layout.js';
const data=await loadPlayResources();
const ids=['motoki-r-01','hiroto-s-01','ryoka-a-05'];
const values=new Map([['mrsEnglishV3.collection.v1',JSON.stringify({version:1,owned:Object.fromEntries(ids.map(id=>[id,{quantity:1,firstAcquiredAt:'2026-01-01T00:00:00Z'}]))})],['mrsEnglishV3.inventory.v1',JSON.stringify({version:1,appliedDevGrants:{},instances:Object.fromEntries(ids.map((id,i)=>[`qa-${i}`,{catalogId:id,level:1}])),deck:ids.map((_,i)=>`qa-${i}`)})]]);
const memory={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
let mode='HARD';const original=createPlayStore({...data,storageProvider:()=>memory,integer:limit=>limit===22?data.backgrounds.findIndex(b=>b.id===({EASY:'bg-01',NORMAL:'bg-04',HARD:'bg-09'}[mode])):limit-1});
const store={...original,start(category,difficulty,revision){mode=difficulty;return original.start(category,difficulty,revision);}};
const stage=document.querySelector('#stage'),{resize}=createLayout(document.querySelector('#safe-area'),stage);
await createPlay({stage,resize,resources:data,store,notify:text=>{document.querySelector('#notice').textContent=text;document.querySelector('#notice').hidden=false;},onHome:()=>location.reload()}).open();
