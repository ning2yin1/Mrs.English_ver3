import { label, picture, nineSlice, hit, position } from './components.js';

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
  for (const [row, entries] of [['top',top],['bottom',bottom]]) {
    for (const spec of entries) {
      const frame = elements.get(spec.id);
      const insets = frame.nine_slice;
      const art = nineSlice(frame, 'home_approved/' + frame.file, [insets.top,insets.right,insets.bottom,insets.left]);
      root.append(art);
      const content = [];
      for (const id of spec.elements) {
        const e = elements.get(id);
        let node;
        if (id === 'nickname' && state.nickname !== 'Nene') {
          node = document.createElement('span'); node.className = 'layer'; node.dataset.layer = id;
          node.textContent = state.nickname;
          Object.assign(node.style,{font:'30px/1.15 system-ui, sans-serif',color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'});
        } else node = e.kind === 'text' ? await label(e,'home_approved/',bounds[id]) : picture(e,'home_approved/');
        root.append(node); content.push({e,node});
      }
      const buttons = spec.targets.map(id => {
        const e = targets.get(id);
        const node = hit(e,id,()=>tap(e)); root.append(node); return {e,node};
      });
      groups.push({row,spec,frame,art,content,buttons});
    }
  }
  root.resizeHud = (width,height) => {
    for (const row of ['top','bottom']) {
      const list = groups.filter(group => group.row === row);
      const total = list.reduce((sum,group)=>sum+group.spec.advance,0);
      let x = 0;
      list.forEach((group,index) => {
        const {frame,art,content,buttons,spec} = group;
        const advance = width * spec.advance / total;
        const frameWidth = advance + (index === list.length-1 ? 0 : frame.width-spec.advance);
        const y = row === 'top' ? 0 : height-112;
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
  return root;
}
