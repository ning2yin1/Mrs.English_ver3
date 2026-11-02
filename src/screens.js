import { picture, label, hit, nineSlice, position, fontFor } from './components.js';
import { MEMBERS, normalizeName } from './profile.js';
import { isSceneBackground } from './layout.js';
import { renderHomeHud } from './home-hud.js';
const names = { motoki: '大森元貴', hiroto: '若井滉斗', ryoka: '藤澤涼架' };
const byId = (layout, id) => layout.elements.find(e => e.id === id);

export function backgroundForScreen(screen, state, backgrounds) {
  // Comparison plates contain UI-removal patches: never expose them behind a differently fitted UI.
  if (screen === 'title' || screen === 'nickname') return 'assets/photos/top_original.jpg';
  if (screen === 'member' || screen === 'background') return 'backgrounds/' + backgrounds[0].source_file;
  if (screen === 'home') return 'backgrounds/' + backgrounds.find(b => b.id === state.backgroundId).source_file;
}

export async function renderScreen(screen, layout, state, actions, backgrounds, homeBounds) {
  const assetBase=screen==='home'?'home_approved/':'';
  const fonts=[...new Set(layout.elements.filter(e=>e.kind==='text').map(e=>assetBase+e.font_file))].map(fontFor);
  // Launch visible artwork and fonts together, rather than serializing each label's network request.
  for(const e of layout.elements){
    if(!e.file||isSceneBackground(e))continue;
    let file=assetBase+e.file;
    if(screen==='background'&&e.id.startsWith('background_tile_')){const b=backgrounds[Number(e.id.slice(-2))-1];file=b.thumbnail_file||'backgrounds/'+b.source_file;}
    if(screen==='background'&&e.id==='background_selected_preview')file='backgrounds/'+backgrounds.find(b=>b.id===state.backgroundId).source_file;
    const image=new Image();image.src=file;
  }
  await Promise.all(fonts);
  if (screen === 'home') return renderHomeHud(layout,state,actions.tap,homeBounds);
  const fragment = document.createDocumentFragment();
  const base = screen === 'home' ? 'home_approved/' : '';
  const selectedMember = MEMBERS.indexOf(state.memberId);
  const selectedBackground = backgrounds.find(b => b.id === state.backgroundId);
  const tile = screen === 'background' ? byId(layout, `background_tile_${state.backgroundId.slice(3)}`) : null;
  const memberFrames = [
    { id:'frame-motoki', x:320, y:171, width:394, height:484, z:10 },
    { id:'frame-hiroto', x:717, y:145, width:409, height:533, z:10 },
    { id:'frame-ryoka', x:1123, y:145, width:417, height:533, z:10 },
  ];
  for (const original of layout.elements) {
    if (isSceneBackground(original)) continue;
    const e = { ...original };
    if (screen === 'nickname' && ['name', 'input_caret'].includes(e.id)) continue;
    if (screen === 'member') {
      if (['card_selected', 'card_hiroto', 'card_ryoka'].includes(e.id) && selectedMember !== 0) continue;
      if (selectedMember !== 0) {
        const frame = memberFrames[selectedMember];
        if (e.id === 'selected') e.x = frame.x + frame.width / 2 - e.width / 2;
        if (e.id === 'member_check') e.x = frame.x + frame.width - 94;
        if (e.id === 'motoki_portrait') { e.y = 191; e.height = 394; }
        if (e.id === 'motoki_name') e.y = 599;
        if (e.id === `${MEMBERS[selectedMember]}_portrait`) { e.y = 197; e.height = 392; }
        if (e.id === `${MEMBERS[selectedMember]}_name`) e.y = 604;
      }
    }
    if (screen === 'background') {
      if (e.id === 'background_selection_frame') {
        const frame = { ...e, x: tile.x - 12, y: tile.y - 12, width: tile.width + 24, height: tile.height + 24 };
        fragment.append(tile.width === 159 && tile.height === 111 ? picture(frame) : nineSlice(frame, e.file, [16,16,16,16]));
        continue;
      }
      if (e.id === 'background_check') { e.x = tile.x + tile.width - 41; e.y = tile.y - 6; }
      if (e.id.startsWith('background_tile_')) {const b=backgrounds[Number(e.id.slice(-2))-1];e.file=b.thumbnail_file||'backgrounds/'+b.source_file;}
      if (e.id === 'background_selected_preview') e.file = 'backgrounds/' + selectedBackground.source_file;
      if (e.id === 'preview_index' && state.backgroundId !== 'bg-01') {
        fragment.append(dynamicText(e, `${state.backgroundId.slice(3)} / 22`, 31)); continue;
      }
    }
    fragment.append(e.kind === 'text' ? await label(e, base, screen === 'home' ? homeBounds[e.id] : undefined) : picture(e, base));
  }
  if (screen === 'nickname') {
    const input = document.createElement('input');
    input.className = 'nickname-input'; input.id = 'nickname'; input.name = 'nickname'; input.value = state.nickname;
    input.setAttribute('aria-label', 'ニックネーム'); input.placeholder = 'ニックネーム'; input.autocomplete = 'nickname';
    input.enterKeyHint = 'done'; input.spellcheck = false;
    position(input, { x: 546, y: 490, width: 750, height: 70 });
    // Native input/caret while editing; the supplied editable font matches the static sample when idle.
    let sample;
    if (state.nickname === 'Nene') {
      sample = await label(byId(layout, 'name'));
      input.style.color = 'transparent';
      fragment.append(sample);
    }
    input.addEventListener('focus', () => { input.style.color = '#0c1033'; if (sample) sample.style.display = 'none'; });
    input.addEventListener('blur', () => { state.nickname = normalizeName(input.value); input.value = state.nickname; if (sample && state.nickname === 'Nene') { sample.style.display = ''; input.style.color = 'transparent'; } });
    input.addEventListener('input', () => { state.nickname = input.value; });
    input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) actions.confirm(); });
    fragment.append(input);
  }
  if (screen === 'member' && selectedMember !== 0) {
    memberFrames.forEach((e, i) => {
      if (i === selectedMember) fragment.append(nineSlice(e, 'assets/member/card_selected.png', [56,32,95,32]));
      else if (i === 0) fragment.append(nineSlice(e, 'assets/member/card_hiroto.png', [24,22,76,22]));
      else fragment.append(picture(byId(layout, i === 1 ? 'card_hiroto' : 'card_ryoka')));
    });
  }
  for (const target of layout.tap_targets) {
    if (target.id === 'input') continue;
    let name = target.id;
    let pressed;
    if (screen === 'title') name = 'TAP TO START';
    else if (target.id === 'back') name = '戻る';
    else if (target.id === 'confirm') name = '決定';
    else if (screen === 'member' && MEMBERS.includes(target.id)) { name = names[target.id]; pressed = state.memberId === target.id; }
    else if (target.value) { name = `背景 ${target.value.slice(3)}`; pressed = state.backgroundId === target.value; }
    fragment.append(hit(target, name, () => actions.tap(target), pressed));
  }
  return fragment;
}
function dynamicText(e, text, size) {
  const node = document.createElement('span'); node.className = 'layer'; node.textContent = text; node.dataset.layer = e.id;
  Object.assign(node.style, { fontSize: `${size}px`, lineHeight:'1.15', color:e.color || '#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' });
  return position(node, e);
}
export function placeholder(id, goHome) {
  const fragment = document.createDocumentFragment();
  const button = hit({ id:'home', x:97, y:30, width:220, height:76 }, 'ホームへ戻る', goHome);
  button.style.color = '#fff'; button.style.fontSize = '30px'; button.textContent = '〈 ホーム';
  fragment.append(button);
  return fragment;
}
