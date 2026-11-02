import './touch.js';
import {development} from './inventory/runtime-config.js';
import {RELEASE} from './release.js';
import { loadProfile, saveProfile, normalizeName } from './profile.js';
import { renderScreen, placeholder, backgroundForScreen } from './screens.js';
import { createLayout, sceneBackground, prepareBackground } from './layout.js';
import {readWallet,WALLET_KEY} from './wallet.js';
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
async function openSettings(){try{return await loading.run(()=>paintSettings(),()=>openSettings());}catch(error){message(error.message);}}
async function paintSettings() {
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
let layouts={}, backgrounds=[], homeBounds;
const loading=window.mrsLoading||{run:task=>task(),finishBoot(){},fail(){}};
const resourceCache=new Map();
async function json(path){if(!resourceCache.has(path)){const pending=fetch(path,{signal:AbortSignal.timeout(15000)}).then(response=>{if(!response.ok)throw new Error('画面データを読み込めませんでした。接続を確認して再試行してください。');return response.json();}).catch(error=>{resourceCache.delete(path);throw error;});resourceCache.set(path,pending);}return resourceCache.get(path);}
async function screenData(screen){
  if(screen.startsWith('placeholder/'))return;
  const tasks=[json(screen==='home'?'home_approved/spec/home_layout.json':`layouts/${screen}.json`).then(layout=>layouts[screen]=layout)];
  if(['member','background','home'].includes(screen))tasks.push(json('layouts/external_backgrounds.json').then(data=>backgrounds=data));
  if(screen==='home')tasks.push(json('src/home-font-bounds.json').then(data=>homeBounds=data));
  await Promise.all(tasks);
}
const { resize } = createLayout(safe, stage);
const services=new Map();
async function service(name){
  if(!services.has(name))services.set(name,import(`./${name}/controller.js`).then(module=>module[{collection:'createCollection',inventory:'createInventory',shop:'createShop',play:'createPlay',mission:'createMission'}[name]]({stage,resize,onHome:()=>show('home'),onInventory:()=>openFeature('inventory'),notify:message,enabled:()=>!!saved})).catch(error=>{services.delete(name);throw error;}));
  return services.get(name);
}
const mission={close(){services.get('mission')?.then(instance=>instance.close()).catch(()=>{});},refresh(){return service('mission').then(instance=>instance.refresh());}};
let opening=false;
async function openFeature(name){
  if(opening)return;opening=true;
  try{await loading.run(async()=>{const instance=await service(name);await instance.open();},()=>openFeature(name));}catch(error){message(error.message);}finally{opening=false;}
}

async function show(screen){try{return await loading.run(()=>paintScreen(screen),()=>show(screen));}catch(error){message(error.message);return false;}}
async function paintScreen(screen) {
  menu?.close(false); removeSettings();mission.close();
  current = screen;
  const version = ++renderVersion;
  if (!persistentWarning) message('');
  await screenData(screen);
  const isPlaceholder = screen.startsWith('placeholder/');
  let wallet;
  if(screen==='home')try{wallet=await persistence().read(storage=>readWallet(storage));}catch(error){if(!persistentWarning)message(error.message);wallet={rCoin:null,diamonds:null};}
  const backgroundFile = sceneBackground(layouts[screen], screen === 'home' ? 'home_approved/' : '',
    backgroundForScreen(screen, state, backgrounds));
  const [fragment, background] = await Promise.all([
    isPlaceholder ? placeholder(screen, () => show('home'))
      : renderScreen(screen, layouts[screen], screen==='home'?{...state,...wallet}:state, { tap, confirm }, backgrounds, homeBounds),
    prepareBackground(backgroundFile),
  ]);
  if (version !== renderVersion) return;
  let imageDeadline;
  try{await Promise.race([Promise.all([...fragment.querySelectorAll('img')].map(image=>image.decode())),new Promise((_,reject)=>imageDeadline=setTimeout(()=>reject(new Error('画面素材を読み込めませんでした。再試行してください。')),20000))]);}finally{clearTimeout(imageDeadline);}
  if(version!==renderVersion)return;
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
  try{const value=await persistence().read(storage=>readWallet(storage));if(stage.querySelector('.home-hud')===root)await root.updateWallet(value);}catch(error){message(error.message);}
}
window.addEventListener('storage',event=>{if(event.key===WALLET_KEY||event.key===null)refreshHomeCoins();});
window.addEventListener('focus',refreshHomeCoins);
window.addEventListener('mrs-progress-change',refreshHomeCoins);
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
    if(target.id==='mission'){current='mission';openFeature('mission').finally(()=>{if(stage.dataset.screen==='home')current='home';});return;}
    if (target.route === 'placeholder/collection') openFeature('collection');
    else if (target.route === 'placeholder/inventory') openFeature('inventory');
    else if (target.route === 'placeholder/shop') openFeature('shop');
    else if (target.route === 'placeholder/ready') openFeature('play');
    else show(target.route);
  }
}
try {
  if(development.enabled){try{await(await service('inventory')).initializeDevelopment();}catch(error){message(error.message);}}
  await show('title');
  if(saved)mission.refresh().catch(error=>message(error.message));
  import('./offline.js').then(({registerOffline})=>registerOffline()).catch(()=>{});
} catch (error) {
  loading.fail(new Error('画面素材を読み込めませんでした。接続を確認して再試行してください。'));console.error(error);
} finally {loading.finishBoot();}
