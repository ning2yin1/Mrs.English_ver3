import {ASSETS} from './assets.js';
export const CHECK="<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 28 28\" fill=\"none\"><circle cx=\"14\" cy=\"14\" r=\"13\" fill=\"currentColor\" fill-opacity=\".15\" stroke=\"currentColor\"/><path d=\"m8 14 4 5 9-11\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
export function renderMission({snapshot,kind,onTab,onHome}) {
  const root=document.createElement('section');root.className='me-mission';root.setAttribute('aria-label','ミッション');
  root.innerHTML=`<header class="me-mission__header"><button type="button" class="me-mission__back" aria-label="ホームへ戻る"><img alt="" src="${ASSETS['assets/mission/icons/mission_back.png']}"></button><h1 class="me-mission__title">ミッション</h1><span class="me-mission__subtitle">学びを重ねて、報酬を獲得</span><span class="me-mission__automatic">報酬は自動で獲得</span></header>
  <div class="me-mission__toolbar"><div class="me-mission__tabs" role="tablist" aria-label="ミッションの期間"><button type="button" class="me-mission__tab" role="tab" id="mission-daily" data-period="daily" aria-controls="mission-panel">デイリー</button><button type="button" class="me-mission__tab" role="tab" id="mission-weekly" data-period="weekly" aria-controls="mission-panel">ウィークリー</button></div><div class="me-mission__summary"><span>達成状況</span><strong></strong></div></div>
  <div class="me-mission__list-frame" id="mission-panel" role="tabpanel"><ul class="me-mission__list"></ul></div><footer class="me-mission__footer"><span>ミッション達成時に報酬を自動付与</span><span>全5件達成で、特別なダイヤ報酬</span></footer>`;
  root.querySelector('.me-mission__back').onclick=onHome;
  const tabs=[...root.querySelectorAll('[role=tab]')];
  for(const tab of tabs){tab.setAttribute('aria-selected',String(tab.dataset.period===kind));tab.tabIndex=tab.dataset.period===kind?0:-1;tab.onclick=()=>onTab(tab.dataset.period);tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();onTab(e.key==='Home'?'daily':e.key==='End'?'weekly':kind==='daily'?'weekly':'daily',true);}};}
  root.querySelector('[role=tabpanel]').setAttribute('aria-labelledby',`mission-${kind}`);
  const rows=snapshot[kind];root.querySelector('.me-mission__summary strong').textContent=`${rows.slice(0,5).filter(d=>d.state==='completed').length} / 5`;
  for(const definition of rows){
    const row=document.createElement('li');row.className='me-mission__row';row.dataset.state=definition.state;row.dataset.missionId=definition.id;row.dataset.bonus=String(definition.metric==='base_missions_completed');
    row.innerHTML=`<div class="me-mission__text"><strong class="me-mission__name"></strong><span class="me-mission__condition"></span></div><div class="me-mission__progress"><span class="me-mission__progress-value"></span><div class="me-mission__track" role="progressbar"><span class="me-mission__fill"></span></div></div><div class="me-mission__reward"><img class="me-mission__reward-icon" alt=""><span class="me-mission__reward-amount"></span><span class="me-mission__reward-unit"></span></div><div class="me-mission__state"></div>`;
    row.querySelector('.me-mission__name').textContent=definition.name;
    row.querySelector('.me-mission__condition').textContent=definition.metric==='base_missions_completed'?'上記5件をすべて達成':definition.condition;
    row.querySelector('.me-mission__progress-value').textContent=`${definition.value} / ${definition.target}`;
    const bar=row.querySelector('[role=progressbar]');bar.setAttribute('aria-label',definition.name);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',definition.target);bar.setAttribute('aria-valuenow',definition.value);row.querySelector('.me-mission__fill').style.setProperty('--progress',`${definition.value/definition.target*100}%`);
    const diamond=definition.reward.currency==='diamond',currency=diamond?'ダイヤ':'Rコイン';row.querySelector('.me-mission__reward-icon').src=ASSETS[`assets/mission/icons/mission_${diamond?'diamond':'coin'}.png`];row.querySelector('.me-mission__reward-amount').textContent=definition.reward.amount.toLocaleString('en-US');row.querySelector('.me-mission__reward-unit').textContent=currency;row.querySelector('.me-mission__reward').setAttribute('aria-label',`${currency} ${definition.reward.amount}`);
    const status=row.querySelector('.me-mission__state');if(definition.state==='completed'){status.innerHTML=CHECK;status.firstChild.classList.add('me-mission__check');}status.append(document.createTextNode({completed:'達成済み',in_progress:'進行中',untouched:'未着手'}[definition.state]));root.querySelector('ul').append(row);
  }
  return root;
}
