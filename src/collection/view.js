import {artLayer,textLayer,memberLayer,cardLayer,position,hit,memberNames} from './components.js';
import {acquiredDate} from './store.js';
const BLUE={file:'home_approved/assets/home/button_collection.png',insets:[18,20,17,20]};
const PURPLE={file:'home_approved/assets/home/status_menu.png',insets:[16,18,16,18]};
export async function renderCollection(scene, state, actions, scenes) {
  const root=document.createElement('div'); root.className='collection-root';
  const detail=scene.screen==='collection_detail';
  const current=state.filtered[state.index];
  const element=id=>scene.layers.find(e=>e.id===id);
  let scroll;
  for (const original of scene.layers) {
    const e={...original}; if(e.id==='background')continue;
    if(e.id==='scroll_track'||e.id==='scroll_thumb')continue;
    if(e.kind==='viewport') {
      scroll=await cardList(e,state,actions);root.append(scroll);continue;
    }
    if(e.id.startsWith('rarity_')&&e.kind==='nine_slice') {
      const value=[null,'R','S','A','B','C'][Number(e.id.slice(-1))];Object.assign(e,value===state.rarity?BLUE:PURPLE);
    }
    if(e.kind==='text') {
      let text=e.text;
      if(e.id==='count')text=detail?`${String(state.index+1).padStart(2,'0')} / ${state.filtered.length}`:`所持${state.total}枚`;
      if(e.id==='member_filter_label')text=state.member?memberNames[state.member]:'すべてのメンバー';
      if(detail&&e.id==='rarity_value')text=current.rarity;
      if(detail&&e.id==='first_acquired_value')text=acquiredDate(current.firstAcquiredAt);
      if(detail&&e.id==='quantity_value')text=`× ${current.quantity}`;
      if(e.id==='empty_title'&&state.total>0)text='絞り込みに一致するカードがありません';
      if(e.id==='empty_hint'&&state.total>0)text='すべてのメンバー・すべてのレアリティ';
      root.append(await textLayer(e,text));
    } else if(e.kind==='member_text') {
      const template=scenes.collection_owned.layers.find(e=>e.kind==='viewport').children.find(e=>e.kind==='member_text'&&e.memberId===current.memberId);
      const bbox=template.render_crop_bbox;
      root.append(await memberLayer({...e,width:Math.round((bbox[2]-bbox[0])*37/(bbox[3]-bbox[1])),height:37},current.memberId));
    } else if(e.kind==='card')root.append(cardLayer(e,current));
    else root.append(artLayer(e));
  }
  if(scroll) {
    const track=artLayer(element('scroll_track'));const thumb=artLayer(element('scroll_thumb'));root.append(track,thumb);
    const update=()=>{
      const contentHeight=scroll.scrollHeight; const visible=scroll.clientHeight; const needed=contentHeight>visible;
      track.hidden=thumb.hidden=!needed;
      const h=Math.max(20,496*visible/contentHeight);
      position(thumb,{...element('scroll_thumb'),height:h,y:260+(496-h)*scroll.scrollTop/Math.max(1,contentHeight-visible)});
    };
    scroll.addEventListener('scroll',()=>{state.scrollTop=scroll.scrollTop;update();},{passive:true});
    root.afterMount=()=>{scroll.scrollTop=state.scrollTop;update();};
  }
  for(const e of new Map(scene.taps.map(t=>[t.id,t])).values()) {
    const name=e.id==='back'?(detail?'一覧に戻る':'ホームに戻る'):e.id==='home'?'ホームに戻る':e.id==='member_filter'?'メンバーで絞り込み':e.id==='previous'?'前のカード':e.id==='next'?'次のカード':`レアリティ ${e.value||'すべて'}`;
    const selected=e.action==='filter-rarity'?state.rarity===e.value:undefined;
    const button=hit(e,name,()=>actions.tap(e),selected);
    if(e.id==='member_filter'){button.setAttribute('aria-expanded',String(state.dropdown));button.setAttribute('aria-haspopup','listbox');}
    if(detail&&e.id==='previous')button.disabled=state.index===0;
    if(detail&&e.id==='next')button.disabled=state.index===state.filtered.length-1;
    root.append(button);
  }
  if(detail) {
    const swipe=position(document.createElement('div'),{x:687,y:140,width:470,height:658});
    swipe.className='collection-swipe';swipe.setAttribute('aria-label','カードを左右にスワイプ');
    let gesture; const pointers=new Set();
    swipe.addEventListener('pointerdown',event=>{
      pointers.add(event.pointerId);
      if(pointers.size===1&&event.isPrimary)gesture={x:event.clientX,y:event.clientY,id:event.pointerId};else gesture=null;
      swipe.setPointerCapture(event.pointerId);
    });
    swipe.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);gesture=null;});
    swipe.addEventListener('pointerup',event=>{
      pointers.delete(event.pointerId);const start=gesture;gesture=null;
      if(!start||start.id!==event.pointerId||pointers.size)return;
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(Math.abs(dx)>=40&&Math.abs(dx)>1.5*Math.abs(dy))actions.step(dx<0?1:-1);
    });
    root.append(swipe);
  }
  if(state.dropdown&&!detail) {
    const overlay=document.createElement('div');overlay.className='collection-dropdown';
    const dismiss=document.createElement('button');dismiss.className='collection-dismiss';dismiss.setAttribute('aria-label','メンバー選択を閉じる');dismiss.onclick=actions.closeDropdown;overlay.append(dismiss);
    const options=document.createElement('div');options.setAttribute('role','listbox');options.setAttribute('aria-label','メンバー');overlay.append(options);
    for(const [i,value] of [null,'motoki','hiroto','ryoka'].entries()) {
      const y=222+i*65;
      options.append(artLayer({id:`option_art_${i}`,kind:'nine_slice',x:113,y,width:502,height:65,z:10,...BLUE}));
      const template=element('member_filter_label');
      options.append(await textLayer({...template,id:`option_label_${i}`,y:y+17.5},value?memberNames[value]:'すべてのメンバー'));
      const button=hit({id:`member_${value||'all'}`,x:113,y,width:502,height:65},value?memberNames[value]:'すべてのメンバー',()=>actions.member(value));
      button.setAttribute('role','option');button.setAttribute('aria-selected',String(state.member===value));options.append(button);
    }
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')actions.closeDropdown();});
    root.append(overlay);
    const mount=root.afterMount;
    root.afterMount=()=>{mount?.();root.querySelector('[role="option"][aria-selected="true"]')?.focus({preventScroll:true});};
  }
  return root;
}
async function cardList(e,state,actions) {
  const viewport=position(document.createElement('div'),e);viewport.className='collection-scroll';viewport.setAttribute('aria-label','所持カード一覧');viewport.tabIndex=0;
  const content=document.createElement('div');content.className='collection-content';content.style.height=`${Math.max(514,(Math.ceil(state.filtered.length/7)-1)*370+333)}px`;viewport.append(content);
  let pointer,dragged=false;
  viewport.addEventListener('pointerdown',event=>{pointer={x:event.clientX,y:event.clientY};dragged=false;},{passive:true});
  viewport.addEventListener('pointermove',event=>{if(pointer&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>8)dragged=true;},{passive:true});
  viewport.addEventListener('pointercancel',()=>{dragged=true;pointer=null;},{passive:true});
  for(const [i,card] of state.filtered.entries()) {
    const x=i%7*228,y=Math.floor(i/7)*370;
    const box={id:`card_${card.id}`,x,y,width:214,height:300,z:20,shadow:true};
    content.append(cardLayer(box,card));
    const template=e.children.find(c=>c.kind==='member_text'&&c.memberId===card.memberId);
    content.append(await memberLayer({...template,id:`member_${card.id}`,x:x+Math.floor((214-template.width)/2),y:y+310},card.memberId));
    const button=hit(box,`${memberNames[card.memberId]} ${card.rarity} ${card.id}`,event=>{if(event.detail===0||!dragged)actions.detail(card.id);});
    button.className='collection-card-hit';button.dataset.cardId=card.id;content.append(button);
  }
  return viewport;
}
