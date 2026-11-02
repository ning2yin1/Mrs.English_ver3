import {RELEASE} from './release.js';
import { loadProfile, saveProfile, normalizeName } from './profile.js';
import { renderScreen, placeholder, backgroundForScreen } from './screens.js';
import { createLayout, sceneBackground, prepareBackground } from './layout.js';
import { createCollection } from './collection/controller.js';
import { createInventory } from './inventory/controller.js';
import { createShop } from './shop/controller.js';
import { createPlay } from './play/controller.js';
import {readWallet,WALLET_KEY} from './inventory/store.js';
import {persistence} from './inventory/persistence.js';
const stage = document.querySelector('#stage');
const safe = document.querySelector('#safe-area');
const notice = document.querySelector('#notice');
let persistentWarning = false;
function storageWarning() { persistentWarning = true; message('設定を保存できません。この起動中のみ設定を保持します。'); }
function message(text) { notice.textContent = text; notice.hidden = !text; }
let saved = loadProfile(storageWarning);
const state = { nickname: saved?.nickname || 'Nene', memberId:saved?.memberId || 'motoki', backgroundId:saved?.backgroundId || 'bg-01' };
let current = 'title';
let menu, menuLoading, settingsRoot, settingsStore, editing;
function removeSettings() { settingsRoot?.remove(); settingsRoot=null; document.querySelector('.settings-editor-note')?.remove(); }
async function openSettings() {
  menu?.close(false); removeSettings(); current='settings'; const version=++renderVersion;
  try {
    const [{renderSettings},{createSettingsStore},{loadStyle}]=await Promise.all([import('./settings/view.js'),import('./settings/store.js'),import('./menu.js')]);
    await loadStyle('./settings/style.css');
    if(version!==renderVersion)return;
    settingsStore ||= createSettingsStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},storageWarning);
    stage.replaceChildren();stage.dataset.screen='settings';document.body.dataset.screen='settings';document.querySelector('#scene-background').hidden=true;
    settingsRoot=renderSettings({store:settingsStore,profile:state,release:RELEASE,onHome:()=>show('home'),onCustomize:screen=>{editing={screen,previous:{...state}};show(screen);}});
    document.body.append(settingsRoot);settingsRoot.querySelector('button').focus();
  }catch(error){await show('home');message(error.message);}
}
async function toggleMenu() {
  try {
    menuLoading ||= import('./menu.js').then(({createMenu})=>createMenu({onSettings:openSettings})).catch(error=>{menuLoading=null;throw error;});
    menu ||= await menuLoading;
    if(current==='home'&&stage.dataset.screen==='home')menu.toggle(stage.querySelector('[data-action=menu]'));
  } catch(error){message(error.message);}
}
let renderVersion = 0;
let layouts, backgrounds, homeBounds;
const { resize } = createLayout(safe, stage);
const collection = createCollection({stage,resize,onHome:()=>show('home'),notify:message});
const inventory = createInventory({stage,resize,onHome:()=>show('home'),notify:message});
const shop = createShop({stage,resize,onHome:()=>show('home'),onInventory:()=>inventory.open(),notify:message});
const play = createPlay({stage,resize,onHome:()=>show('home'),notify:message});

async function show(screen) {
  menu?.close(false); removeSettings();
  current = screen;
  const version = ++renderVersion;
  if (!persistentWarning) message('');
  const isPlaceholder = screen.startsWith('placeholder/');
  let rCoin;
  if(screen==='home')try{rCoin=await persistence().read(storage=>readWallet(storage).rCoin);}catch(error){if(!persistentWarning)message(error.message);rCoin=null;}
  const backgroundFile = sceneBackground(layouts[screen], screen === 'home' ? 'home_approved/' : '',
    backgroundForScreen(screen, state, backgrounds));
  const [fragment, background] = await Promise.all([
    isPlaceholder ? placeholder(screen, () => show('home'))
      : renderScreen(screen, layouts[screen], screen==='home'?{...state,rCoin}:state, { tap, confirm }, backgrounds, homeBounds),
    prepareBackground(backgroundFile),
  ]);
  if (version !== renderVersion) return;
  const previousBackground = document.querySelector('#scene-background');
  if (background) previousBackground.replaceWith(background);
  else { previousBackground.hidden = true; previousBackground.removeAttribute('src'); }
  document.body.dataset.screen = screen;
  stage.replaceChildren(fragment); stage.dataset.screen = screen;
  stage.setAttribute('aria-label', {title:'タイトル',nickname:'ニックネーム設定',member:'推し選択',background:'背景選択',home:'ホーム'}[screen] || '仮画面');
  resize();
  if(screen==='home') { const button=stage.querySelector('[data-action=menu]');button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false'); }
  if(editing) {const note=document.createElement('p');note.className='settings-editor-note';note.textContent='カスタマイズ：決定で保存 ／ 戻るでキャンセル';document.body.append(note);}
}
async function refreshHomeCoins(){
  const root=stage.querySelector('.home-hud');if(current!=='home'||stage.dataset.screen!=='home'||!root)return;
  try{const value=await persistence().read(storage=>readWallet(storage).rCoin);if(stage.querySelector('.home-hud')===root)await root.updateCoins(value);}catch(error){message(error.message);}
}
window.addEventListener('storage',event=>{if(event.key===WALLET_KEY||event.key===null)refreshHomeCoins();});
window.addEventListener('focus',refreshHomeCoins);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshHomeCoins();});
function confirm() {
  if(editing) {
    if(current==='nickname') {const input=document.querySelector('#nickname');state.nickname=normalizeName(input.value);input.value=state.nickname;if(!state.nickname){message('ニックネームを入力してください（12文字まで）。');input.focus();return;}input.blur();}
    saved={...saved,...state,version:3,setupComplete:true};saveProfile(saved,storageWarning);editing=null;openSettings();return;
  }
  if (current === 'nickname') {
    const input = document.querySelector('#nickname');
    state.nickname = normalizeName(input.value);
    input.value = state.nickname;
    if (!state.nickname) { message('ニックネームを入力してください（12文字まで）。'); input.focus(); return; }
    input.blur(); show('member');
  } else if (current === 'member') show('background');
  else if (current === 'background') {
    saved = { version:3, ...state, setupComplete:true };
    saveProfile(saved, storageWarning); show('home');
  }
}
function tap(target) {
  if (current === 'title') { show(saved ? 'home' : 'nickname'); return; }
  if (target.id === 'confirm') { confirm(); return; }
  if(target.id==='back'&&editing){Object.assign(state,editing.previous);editing=null;openSettings();return;}
  if (target.id === 'back') { show({nickname:'title',member:'nickname',background:'member'}[current]); return; }
  if (current === 'member') { state.memberId = target.id; show('member'); }
  else if (current === 'background' && target.value) { state.backgroundId = target.value; show('background'); }
  else if (current === 'home') {
    if(target.id==='menu'){toggleMenu();return;}
    menu?.close(false);
    if (target.route === 'placeholder/collection') collection.open();
    else if (target.route === 'placeholder/inventory') inventory.open();
    else if (target.route === 'placeholder/shop') shop.open();
    else if (target.route === 'placeholder/ready') play.open();
    else show(target.route);
  }
}
try {
  const json = async path => { const response = await fetch(path); if (!response.ok) throw new Error(path); return response.json(); };
  const screens = ['title','nickname','member','background','home'];
  const data = await Promise.all(screens.map(s => json(s === 'home' ? 'home_approved/spec/home_layout.json' : `layouts/${s}.json`)));
  layouts = Object.fromEntries(screens.map((s, i) => [s, data[i]]));
  [backgrounds, homeBounds] = await Promise.all([json('layouts/external_backgrounds.json'), json('src/home-font-bounds.json')]);
  try { await inventory.initializeDevelopment(); } catch (error) { message(error.message); }
  await show('title');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
} catch (error) {
  message('画面素材を読み込めませんでした。接続を確認して再読み込みしてください。'); console.error(error);
}
