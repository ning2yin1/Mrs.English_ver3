// This entry and the QA fixture are intentionally excluded from dist/.
import {createCollection} from '../src/collection/controller.js';
import {createLayout} from '../src/layout.js';
const mode=new URL(location.href).searchParams.get('mode')||'owned';
const fixture=mode==='empty'?{version:1,owned:{}}:await(await fetch('qa/collection/owned_fixture.json')).json();
const stage=document.querySelector('#stage');
const {resize}=createLayout(document.querySelector('#safe-area'),stage);
const collection=createCollection({stage,resize,onHome:()=>location.assign(new URL('./',document.baseURI)),store:{read:()=>({ledger:structuredClone(fixture),error:null})},notify:text=>{const n=document.querySelector('#notice');n.textContent=text;n.hidden=false;}});
await collection.open(mode==='detail'?'motoki-r-01':undefined);
