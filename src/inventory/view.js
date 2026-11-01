import {artLayer,textLayer,cardLayer,position,hit,memberNames} from '../collection/components.js';
import {power,cost,totalPower} from './model.js';
const UI='assets/inventory/ui/';
const fmt=n=>n.toLocaleString('en-US');
const text=(e,value=e.text)=>textLayer({...e,color:e.fill,tracking:0},String(value));
const at=(root,e,node)=>{node.style.zIndex='';node.dataset.layer=e.id;root.append(node);return node;};
function artwork(e){const node=artLayer(e);if(e.file?.endsWith('deck_backplate.png'))node.style.objectFit='fill';if(e.replace_alpha!==undefined)node.style.opacity=e.replace_alpha/255;if(e.bright_top){const line=document.createElement('div');line.className='inventory-bright';line.style.top=`${2-e.insets[0]}px`;line.style.left=`${16-e.insets[3]}px`;line.style.right=`${16-e.insets[1]}px`;node.append(line);}return node;}
export async function renderInventory(scene,state,actions) {
  const root=document.createElement('div');root.className='inventory-root collection-root';
  const mode=state.screen;
  const instances=state.snapshot.instances,deck=mode==='deck'?state.draft:state.snapshot.deck;
  const slots=deck.map(id=>instances.find(i=>i.instanceId===id));
  const current=mode==='deck'?slots[state.slot]:instances.find(i=>i.instanceId===state.selected)||slots[0]||instances[0];
  const coins=state.snapshot.wallet.rCoin;
  const maximum=current?.definition.maxLevel||0;
  const capped=!current||current.level>=maximum;
  const required=current?cost(current,state.balance):0;
  const insufficient=coins<required;
  const blocked=capped||insufficient||state.busy;
  const buttonLabel=state.busy?'強化中…':capped?'レベル上限':insufficient?'Rコイン不足':`Rコイン ${fmt(required)}で強化`;
  const number=id=>Number(id.slice(id.lastIndexOf('_')+1));
  let scroll;
  const values=mode==='main'?{
    7:fmt(coins),11:`${slots.filter(Boolean).length} / 3`,23:fmt(totalPower(deck,instances)),32:`${instances.length}枚`,36:state.descending?'入手順 ↓':'入手順',
  }:mode==='deck'?{
    7:fmt(coins),29:fmt(totalPower(deck,instances)),35:current?memberNames[current.memberId]:'未編成',37:current?`${current.rarity} ランク`:'—',38:current?`Lv. ${current.level} / ${maximum}`:'—',39:current?`能力値  ${fmt(power(current))}`:'能力値  —',42:current?.definition.skill.name||'—',43:current?.definition.skill.description||'—',46:`所持${instances.length}枚`,
  }:{
    7:fmt(coins),12:current?memberNames[current.memberId]:'未選択',14:current?`${current.rarity} ランク`:'—',19:current?.level||'—',21:current?Math.min(maximum,current.level+1):'—',22:`最大 Lv.${maximum}`,24:current?fmt(power(current)):'—',26:current?fmt(power({...current,level:Math.min(maximum,current.level+1)})):'—',29:current?.definition.skill.name||'—',30:current?.definition.skill.description||'—',34:capped?'—':fmt(required),37:fmt(coins),39:blocked?'—':fmt(coins-required),41:buttonLabel,
  };
  for(const original of scene.layers) {
    const e={...original}; const n=number(e.id);
    if(n===1)continue;
    if(e.kind==='scrollbar')continue;
    if(e.kind==='viewport'){scroll=await list(e,state,actions,deck);at(root,e,scroll);continue;}
    const cardNumbers=mode==='main'?[12,15,18]:mode==='deck'?[13,19,24]:[10];
    const slot=cardNumbers.indexOf(n);
    if(e.kind==='card') {
      const card=mode==='upgrade'?current:slots[slot];
      if(card){const node=cardLayer({...e,shadow:true},card);node.dataset.instanceId=card.instanceId;at(root,e,node);}
      continue;
    }
    if(mode!=='upgrade') {
      for(let i=0;i<3;i++) {
        if(n===cardNumbers[i]+1)values[n]=slots[i]?memberNames[slots[i].memberId]:'未編成';
        if(n===cardNumbers[i]+2)values[n]=slots[i]?`Lv. ${slots[i].level} / ${slots[i].definition.maxLevel}`:'—';
      }
    }
    if(mode==='deck') {
      if([11,16,22].includes(n)){const i=[11,16,22].indexOf(n);e.width=i===state.slot?148:84;}
      if([12,17,23].includes(n)){const i=[12,17,23].indexOf(n);values[n]=`枠 ${i+1}${i===state.slot?'  選択中':''}`;e.anchor_x=185+276*i+(i===state.slot?148:84)/2;}
      if(n===18){if(!current)continue;e.x=120+276*state.slot;}
      if(n===36)e.file=UI+(current?.rarity==='R'?'tag_rank_r.png':current?.rarity==='S'?'tag_rank_s.png':'tag_normal.png');
    }
    if(mode==='upgrade') {
      if(n===13)e.file=UI+(current?.rarity==='R'?'tag_rank_r.png':current?.rarity==='S'?'tag_rank_s.png':'tag_normal.png');
      if(n===34&&insufficient&&!capped)e.fill='#ff9da5';
    }
    if(e.kind==='text') {
      const node=await text(e,values[n]??e.text);
      if(mode==='upgrade'&&n===41&&blocked)node.style.opacity=state.busy ? .65 : .45;
      at(root,e,node);
    } else if(e.kind==='separator') {
      const line=position(document.createElement('div'),e);line.className='layer';line.style.background=e.browser_rgb;at(root,e,line);
    } else {
      const node=artwork(e);if(mode==='upgrade'&&n===40&&blocked)node.style.opacity=state.busy ? .65 : .45;at(root,e,node);
    }
  }
  for(const e of scene.taps) {
    const names={back:mode==='main'?'ホームに戻る':'インベントリに戻る',edit_deck:'デッキ編成',upgrade_card:'カード強化',show_all:'すべての所持カード',acquisition_order:'入手順を切り替える',confirm_deck:'編成を確定',upgrade:buttonLabel};
    const button=hit(e,names[e.id]||`枠 ${e.slot+1}`,()=>actions.tap(e));
    if(e.id==='upgrade')button.disabled=blocked;
    if(['upgrade_card','edit_deck'].includes(e.id))button.disabled=!instances.length;
    if(e.id==='confirm_deck')button.disabled=state.busy||!instances.length;
    if(e.slot!==undefined)button.setAttribute('aria-pressed',String(state.slot===e.slot));
    root.append(button);
  }
  if(mode==='main')slots.forEach((card,i)=>{if(card)root.append(hit({id:`deck_card_${i}`,x:140+276*i,y:217,width:238,height:333},`${memberNames[card.memberId]}を選択`,()=>actions.select(card.instanceId)));});
  if(scroll) {
    const railSpec=scene.layers.find(e=>e.kind==='scrollbar');const rail=position(document.createElement('div'),railSpec);rail.className='inventory-rail';
    const thumb=document.createElement('div');thumb.className='inventory-thumb';rail.append(thumb);root.append(rail);
    const update=()=>{rail.hidden=scroll.scrollHeight<=scroll.clientHeight;const h=railSpec.height*scroll.clientHeight/Math.max(1,scroll.scrollHeight);thumb.style.height=`${h}px`;thumb.style.top=`${(railSpec.height-h)*scroll.scrollTop/Math.max(1,scroll.scrollHeight-scroll.clientHeight)}px`;state.scroll[mode]=scroll.scrollTop;};
    scroll.addEventListener('scroll',update,{passive:true});root.afterMount=()=>{scroll.scrollTop=state.scroll[mode];update();};
  }
  return root;
}
async function list(e,state,actions,deck) {
  const viewport=position(document.createElement('div'),e);viewport.className='collection-scroll';viewport.setAttribute('aria-label','インベントリ所持カード');viewport.tabIndex=0;
  const content=document.createElement('div');content.className='inventory-content';viewport.append(content);
  const pitch=state.screen==='main'?255:271;
  const cards=state.descending?[...state.snapshot.instances].reverse():state.snapshot.instances;
  content.style.height=`${cards.length?(Math.ceil(cards.length/4)-1)*pitch+247:0}px`;
  let origin,dragged=false;
  viewport.addEventListener('pointerdown',event=>{origin={x:event.clientX,y:event.clientY};dragged=false;},{passive:true});
  viewport.addEventListener('pointermove',event=>{if(origin&&Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>8)dragged=true;},{passive:true});
  viewport.addEventListener('pointercancel',()=>{dragged=true;origin=null;},{passive:true});
  const nameTemplate=e.children.find(c=>c.kind==='text'&&c.binding==='member name from catalog');
  const levelTemplate=e.children.find(c=>c.kind==='text'&&c.text.startsWith('Lv.'));
  const labelTemplate=e.children.find(c=>c.kind==='text'&&c.text.startsWith('編成'))||e.children.find(c=>c.kind==='text'&&c.text==='ほかの枠で編成中');
  for(const [i,card] of cards.entries()) {
    const x=4+i%4*171,y=5+Math.floor(i/4)*pitch;
    const deckIndex=deck.indexOf(card.instanceId);
    const selected=state.screen==='deck'?deckIndex===state.slot:state.selected===card.instanceId;
    const used=state.screen==='deck'&&deckIndex!==-1&&deckIndex!==state.slot;
    if(selected)at(content,{id:`glow_${i}`},artwork({id:`glow_${i}`,kind:'image',file:UI+'selection_glow_136.png',x:x-20,y:y-20,width:176,height:230}));
    const box={id:`instance_${card.instanceId}`,x,y,width:136,height:190,shadow:true};
    const art=cardLayer(box,card);art.dataset.instanceId=card.instanceId;at(content,box,art);
    if(used){const overlay=position(document.createElement('div'),box);overlay.className='inventory-used';content.append(overlay);}
    if(deckIndex!==-1) {
      const width=used?138:83,tx=used?x-1:x+51;
      at(content,{id:`tag_${i}`},artwork({id:`tag_${i}`,kind:'nine_slice',x:tx,y:y+159,width,height:29,file:UI+(used?'tag_used.png':'tag_normal.png'),insets:[8,8,8,8]}));
      at(content,{id:`tag_label_${i}`},await text({...labelTemplate,id:`tag_label_${i}`,anchor_x:tx+width/2,y:y+163,align:'center'},used?'ほかの枠で編成中':`編成 ${deckIndex+1}`));
    }
    at(content,{id:`name_${i}`},await text({...nameTemplate,id:`name_${i}`,anchor_x:x+68,y:y+196},memberNames[card.memberId]));
    at(content,{id:`level_${i}`},await text({...levelTemplate,id:`level_${i}`,anchor_x:x+68,y:y+221},`Lv. ${card.level}`));
    const button=hit(box,`${memberNames[card.memberId]} ${card.rarity} Lv.${card.level}`,event=>{if(event.detail===0||!dragged)actions.select(card.instanceId);});button.className='collection-card-hit';button.dataset.instanceId=card.instanceId;button.disabled=used;button.setAttribute('aria-disabled',String(used));content.append(button);
  }
  if(!cards.length)content.append(await text({...nameTemplate,id:'inventory-empty',anchor_x:337.5,y:70,font_size:26},'所持カードがありません'));
  return viewport;
}
