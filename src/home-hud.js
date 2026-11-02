import { label, picture, nineSlice, hit, position, fontFor } from './components.js';

async function coinLabel(original,value,bounds) {
  const text=Number.isSafeInteger(value)&&value>=0?value.toLocaleString('en-US'):'—';
  const family=await fontFor('home_approved/'+original.font_file),ctx=document.createElement('canvas').getContext('2d');
  ctx.font=`${original.font_size}px ${family}`;
  const nativeWidth=Math.max(1,Math.ceil(ctx.measureText(text).width));
  const width=Math.min(170,nativeWidth*original.height/(bounds[3]-bounds[1]));
  const e={...original,text,x:original.x+original.width-width,width};
  const node=await label(e,'home_approved/',[0,bounds[1],nativeWidth,bounds[3]]);
  node.setAttribute('preserveAspectRatio','xMaxYMid meet');node.setAttribute('aria-label',`Rコイン ${text}`);
  return {e,node};
}

const top = [
  {id:'status_player', advance:525, elements:['avatar','nickname','rank','energy'], targets:['player']},
  {id:'status_stamina', advance:298, elements:['stamina','stamina_max','stamina_value'], targets:[]},
  {id:'status_currency', advance:537, elements:['coin','coins_value','diamond','diamonds_value'], targets:[]},
  {id:'status_menu', advance:290, elements:['menu','menu_label'], targets:['menu']},
];
const bottom = [
  {id:'button_inventory', advance:334, elements:['inventory','inventory_label'], targets:['inventory']},
  {id:'button_collection', advance:339, elements:['collection','collection_label'], targets:['collection']},
  {id:'button_mission', advance:350, elements:['mission','mission_label'], targets:['mission']},
  {id:'button_shop', advance:328, elements:['shop','shop_label'], targets:['shop']},
  {id:'button_ready', advance:350, elements:['ready_label'], targets:['ready']},
];

export async function renderHomeHud(layout, state, tap, bounds) {
  const root = document.createElement('div'); root.className = 'home-hud';
  const elements = new Map(layout.elements.map(e => [e.id,e]));
  const targets = new Map(layout.tap_targets.map(e => [e.id,e]));
  const groups = [];
  let coin,lastSize;
  for (const [row, entries] of [['top',top],['bottom',bottom]]) {
    for (const spec of entries) {
      const frame = elements.get(spec.id);
      const insets = frame.nine_slice;
      const art = nineSlice(frame, 'home_approved/' + frame.file, [insets.top,insets.right,insets.bottom,insets.left]);
      root.append(art);
      const content = [];
      for (const id of spec.elements) {
        let e = elements.get(id);
        let node;
        if(id==='avatar'&&['hiroto','ryoka'].includes(state.memberId)) {
          // Keep the approved avatar frame/coordinates and reuse the selected member's existing portrait.
          node=document.createElement('div');node.className='layer';node.dataset.layer=id;
          const frame=picture(e,'home_approved/');Object.assign(frame.style,{inset:'0',width:'100%',height:'100%'});
          const portrait=new Image();portrait.alt='';portrait.src=`assets/photos/${state.memberId}_portrait.png`;
          Object.assign(portrait.style,{position:'absolute',left:'6%',top:'6%',width:'88%',height:'88%',borderRadius:'50%',objectFit:'cover',objectPosition:'50% 20%'});
          node.append(frame,portrait);
        } else if(id==='coins_value'){
          const result=await coinLabel(e,state.rCoin,bounds[id]);e=result.e;node=result.node;
        } else if (id === 'nickname' && state.nickname !== 'Nene') {
          node = document.createElement('span'); node.className = 'layer'; node.dataset.layer = id;
          node.textContent = state.nickname;
          Object.assign(node.style,{font:'30px/1.15 system-ui, sans-serif',color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'});
        } else node = e.kind === 'text' ? await label(e,'home_approved/',bounds[id]) : picture(e,'home_approved/');
        root.append(node);const entry={e,node};content.push(entry);if(id==='coins_value')coin=entry;
      }
      const buttons = spec.targets.map(id => {
        const e = targets.get(id);
        const node = hit(e,id,()=>tap(e)); root.append(node); return {e,node};
      });
      groups.push({row,spec,frame,art,content,buttons});
    }
  }
  root.resizeHud = (width,height,footerOffset = 0) => {
    lastSize=[width,height,footerOffset];
    for (const row of ['top','bottom']) {
      const list = groups.filter(group => group.row === row);
      const total = list.reduce((sum,group)=>sum+group.spec.advance,0);
      let x = 0;
      list.forEach((group,index) => {
        const {frame,art,content,buttons,spec} = group;
        const advance = width * spec.advance / total;
        const frameWidth = advance + (index === list.length-1 ? 0 : frame.width-spec.advance);
        const y = row === 'top' ? 0 : height-112+footerOffset;
        position(art,{...frame,x,y,width:frameWidth});
        for (const {e,node} of content) {
          let localX = e.x-frame.x;
          // Keep the player identity left-aligned and its energy icon on the right.
          if (spec.id === 'status_player') {
            if (e.id === 'energy') localX += frameWidth-frame.width;
          } else if (spec.id === 'status_stamina') {
            if (e.id === 'stamina_value') localX += frameWidth-frame.width;
            else if (e.id === 'stamina_max') localX += (frameWidth-frame.width)/2;
          } else if (spec.id === 'status_currency') {
            if (e.id === 'coins_value') localX += (frameWidth-frame.width)/2;
            if (e.id === 'diamond') localX += (frameWidth-frame.width)/2;
            if (e.id === 'diamonds_value') localX += frameWidth-frame.width;
          } else localX += (frameWidth-frame.width)/2;
          const box = {...e,x:x+localX,y:y+e.y-frame.y};
          if (e.id === 'nickname' && state.nickname !== 'Nene') { box.width=Math.max(60,frameWidth-200); box.height=35; box.y=y+10; }
          position(node,box);
        }
        for (const {e,node} of buttons) position(node,{...e,x,y,width:advance,height:row==='top'?80:112});
        x += advance;
      });
    }
  };
  let coinVersion=0;
  root.updateCoins=async value=>{
    const version=++coinVersion,result=await coinLabel(elements.get('coins_value'),value,bounds.coins_value);
    if(version!==coinVersion)return;
    coin.node.replaceWith(result.node);coin.e=result.e;coin.node=result.node;
    if(lastSize)root.resizeHud(...lastSize);
  };
  return root;
}
