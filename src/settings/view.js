import {checkRelease,applyRelease} from './updates.js';
export function renderSettings({store,profile,release,onHome,onCustomize}) {
  const root=document.createElement('section');root.className='settings-screen';root.setAttribute('aria-label','設定');
  root.innerHTML=`<header><button type="button" data-settings="home">〈 TOPへ戻る</button><h1>設定</h1></header>
  <div class="settings-content">
    <section><h2>カスタマイズ</h2><div class="settings-customize">
      <button type="button" data-edit="background">TOPの壁紙変更 <span>22枚から選択 〉</span></button>
      <button type="button" data-edit="member">推し変更 <span>3人から選択 〉</span></button>
      <button type="button" data-edit="nickname">ニックネーム変更 <span>12文字まで 〉</span></button>
    </div></section>
    <section><h2>サウンド</h2><p class="settings-note">音源は今後追加予定です。設定内容を保存できます。</p><div class="settings-sounds"></div></section>
    <section><h2>アプリ</h2><p>現在のバージョン：<span data-version></span></p>
      <div class="settings-update-actions"><button type="button" data-settings="check">アップデートを確認</button><button type="button" data-settings="apply" hidden>アップデートする</button></div>
      <p data-update-status role="status" aria-live="polite">更新確認では小さな更新情報のみ取得します。</p></section>
    <section><h2>その他</h2><h3>アプリ情報</h3><p>Mrs. English Ver.3</p><p data-info></p><label class="settings-toggle">演出スキップ <input type="checkbox" data-pref="skipEffects"><span data-toggle-label></span></label><p class="settings-note">設定の保存のみ対応しています。演出への適用は今後追加予定です。</p></section>
  </div>`;
  root.querySelector('[data-version]').textContent=`${release.version} (${release.id})`;
  root.querySelector('[data-info]').textContent=`バージョン ${release.version} ／ 更新日 ${release.updatedAt || '開発版'}`;
  const names={motoki:'大森元貴',hiroto:'若井滉斗',ryoka:'藤澤涼架'};
  for(const [key,text]of Object.entries({background:`現在：${profile.backgroundId.slice(3)} / 22`,member:`現在：${names[profile.memberId]}`,nickname:`現在：${profile.nickname}`}))root.querySelector(`[data-edit="${key}"] span`).textContent=text+' 〉';
  const values=store.read();
  for(const [prefix,name]of [['bgm','BGM'],['se','効果音']]) {
    const row=document.createElement('div');row.className='settings-sound';
    row.innerHTML=`<label class="settings-toggle">${name}<input type="checkbox" data-pref="${prefix}Enabled"><span data-toggle-label></span></label><label class="settings-volume">音量 <input type="range" min="0" max="100" step="1" aria-label="${name}の音量" data-pref="${prefix}Volume"><output></output></label>`;
    root.querySelector('.settings-sounds').append(row);
  }
  function sync(input){if(input.type==='checkbox')input.nextElementSibling.textContent=input.checked?'ON':'OFF';else input.nextElementSibling.textContent=`${input.value}%`;}
  for(const input of root.querySelectorAll('[data-pref]')) {
    const key=input.dataset.pref;
    if(input.type==='checkbox')input.checked=values[key];else input.value=values[key];
    sync(input);input.addEventListener('input',()=>{store.set(key,input.type==='checkbox'?input.checked:Number(input.value));sync(input);});
  }
  root.querySelector('[data-settings="home"]').onclick=onHome;
  for(const button of root.querySelectorAll('[data-edit]'))button.onclick=()=>onCustomize(button.dataset.edit);
  const check=root.querySelector('[data-settings="check"]'),apply=root.querySelector('[data-settings="apply"]'),status=root.querySelector('[data-update-status]');
  let candidate,working=false;
  const errorMessage=error=>navigator.onLine===false?'オフラインのため更新できません。接続してから再試行してください。':error instanceof TypeError?'更新情報を取得できませんでした。接続を確認して再試行してください。':error.message;
  check.onclick=async()=>{
    if(working)return;working=true;check.disabled=true;apply.hidden=true;candidate=null;status.textContent='更新を確認しています…';
    try{const result=await checkRelease(release);candidate=result.available?result.release:null;apply.hidden=!candidate;status.textContent=candidate?`新しいバージョンがあります：${candidate.version} (${candidate.id})`:'最新バージョンです';}
    catch(error){status.textContent=errorMessage(error);}finally{working=false;check.disabled=false;}
  };
  apply.onclick=async()=>{
    if(working||!candidate)return;working=true;check.disabled=apply.disabled=true;status.textContent='アップデートを取得しています。完了後に再読み込みします。保存データは保持されます。';
    const controls=[...root.querySelectorAll('button,input')];controls.forEach(control=>control.disabled=true);
    try{await applyRelease(candidate);}catch(error){status.textContent=errorMessage(error);working=false;controls.forEach(control=>control.disabled=false);}
  };
  return root;
}
