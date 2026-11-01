import { loadProfile, saveProfile, normalizeName } from './profile.js';
import { renderScreen, placeholder, backgroundForScreen } from './screens.js';
import { createLayout, sceneBackground, prepareBackground } from './layout.js';
const stage = document.querySelector('#stage');
const safe = document.querySelector('#safe-area');
const notice = document.querySelector('#notice');
let persistentWarning = false;
function storageWarning() { persistentWarning = true; message('設定を保存できません。この起動中のみ設定を保持します。'); }
function message(text) { notice.textContent = text; notice.hidden = !text; }
let saved = loadProfile(storageWarning);
const state = { nickname: saved?.nickname || 'Nene', memberId:saved?.memberId || 'motoki', backgroundId:saved?.backgroundId || 'bg-01' };
let current = 'title';
let renderVersion = 0;
let layouts, backgrounds, homeBounds;
const { resize } = createLayout(safe, stage);

async function show(screen) {
  current = screen;
  const version = ++renderVersion;
  if (!persistentWarning) message('');
  const isPlaceholder = screen.startsWith('placeholder/');
  const backgroundFile = sceneBackground(layouts[screen], screen === 'home' ? 'home_approved/' : '',
    backgroundForScreen(screen, state, backgrounds));
  const [fragment, background] = await Promise.all([
    isPlaceholder ? placeholder(screen, () => show('home'))
      : renderScreen(screen, layouts[screen], state, { tap, confirm }, backgrounds, homeBounds),
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
}
function confirm() {
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
  if (target.id === 'back') { show({nickname:'title',member:'nickname',background:'member'}[current]); return; }
  if (current === 'member') { state.memberId = target.id; show('member'); }
  else if (current === 'background' && target.value) { state.backgroundId = target.value; show('background'); }
  else if (current === 'home') show(target.route);
}
try {
  const json = async path => { const response = await fetch(path); if (!response.ok) throw new Error(path); return response.json(); };
  const screens = ['title','nickname','member','background','home'];
  const data = await Promise.all(screens.map(s => json(s === 'home' ? 'home_approved/spec/home_layout.json' : `layouts/${s}.json`)));
  layouts = Object.fromEntries(screens.map((s, i) => [s, data[i]]));
  [backgrounds, homeBounds] = await Promise.all([json('layouts/external_backgrounds.json'), json('src/home-font-bounds.json')]);
  await show('title');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
} catch (error) {
  message('画面素材を読み込めませんでした。接続を確認して再読み込みしてください。'); console.error(error);
}
