import {cardLayer} from '../collection/components.js';
import {resultModel} from './model.js';
export const PART_LABELS=['基本スコア','スピードボーナス','コンボボーナス','カードスキルボーナス','デッキボーナス'];
const fmt=n=>n.toLocaleString('en-US');
function el(tag,cls,text){const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function text(parent,cls,value){const n=el('div',cls,value);parent.append(n);return n;}
function picture(parent,cls,path){const n=el('img',cls);n.src=path;n.alt='';n.draggable=false;n.setAttribute('aria-hidden','true');parent.append(n);return n;}
function rank(parent,model,cls){const box=el('div',cls);picture(box,'result-rank-image',`assets/result/ranks/rank_${model.rank.id}.png`);const label=text(box,'result-sr',model.rank.label);label.setAttribute('role','status');parent.append(box);return box;}
function cards(parent,model){const group=el('div','result-cards');for(const [i,slot]of model.deck.entries()){if(!slot?.card)continue;const wrap=el('div','result-card-slot');wrap.dataset.instanceId=slot.instanceId;wrap.dataset.active=model.skillIds.includes(slot.instanceId);const card=cardLayer({x:0,y:0,width:45,height:63},slot.card);card.style.zIndex='';card.setAttribute('aria-label',`${slot.card.rarity} Lv.${slot.level}`);wrap.append(card);group.append(wrap);}parent.append(group);return group;}
export function renderResult(state,data,act){
  const root=el('div','result-root collection-root');root.dataset.phase='enter';root.dataset.ready='false';
  let model;try{const result=state.saved.results[state.session.stageId];if(result?.stageId!==state.session.stageId)throw new Error('結果IDを確認してください。');model=resultModel(result,data);}catch(e){
    root.dataset.phase='error';root.append(el('div','result-error',e.message));const retry=el('button','result-action blue','再読み込み');retry.type='button';retry.addEventListener('click',()=>location.reload());root.append(retry);return root;
  }
  root.resultModel=model;root.dataset.rank=model.rank.id;
  const header=el('header','result-header');text(header,'result-title','RESULT');const category=text(header,'result-category',`No.${model.categoryId} ${model.shortTitle}`);category.title=model.categoryTitle;category.setAttribute('aria-label',`No.${model.categoryId} ${model.categoryTitle}`);text(header,'result-difficulty blue',model.difficulty);root.append(header);
  const summary=el('main','result-summary');root.append(summary);
  const left=el('section','result-left result-panel');summary.append(left);rank(left,model,'result-rank');text(left,'result-total-label','TOTAL SCORE');const target=text(left,'result-total-target','');target.setAttribute('aria-hidden','true');
  const stats=el('dl','result-stats');for(const [label,value]of [['正解数',`${model.correctCount} / 10`],['正答率',`${model.accuracy}%`],['最大コンボ',`${model.maxCombo} COMBO`],['平均回答時間',model.averageSeconds===null?'—':`${model.averageSeconds.toFixed(1)}秒`]]){const cell=el('div','');cell.append(el('dt','',label),el('dd','',value));stats.append(cell);}left.append(stats);
  const right=el('section','result-right result-panel');summary.append(right);text(right,'result-breakdown-title','スコア内訳');const breakdown=el('dl','result-breakdown');for(const[i,label]of PART_LABELS.entries()){breakdown.append(el('dt','',label),el('dd',i>=3?'gold':'',fmt(model.parts[i])));}right.append(breakdown);
  const reward=el('section','result-reward');text(reward,'result-reward-label','獲得Rコイン');text(reward,'result-reward-value',fmt(model.rewardCoins));text(reward,'result-double',model.multiplier===2?'×2 BONUS!':'通常報酬');text(reward,'result-reward-base',model.multiplier===2?`${fmt(model.rewardBase)} × 2`:fmt(model.rewardBase));right.append(reward);
  const deck=text(right,'result-deck','');cards(deck,model);text(deck,'result-skill-info',model.skillIds.length?'装備カードのスキルが発動':'開始時の装備カード');
  const actions=el('nav','result-actions');for(const[id,label,blue]of [['again','もう一回',true],['ready','ステージ選択',true],['home','ホーム',false]]){const b=el('button',`result-action ${blue?'blue':'purple'}`,label);b.type='button';b.dataset.action=id;b.disabled=true;b.addEventListener('click',()=>{if(root.dataset.ready!=='true'||state.busy)return;actions.querySelectorAll('button').forEach(n=>n.disabled=true);act(id);});actions.append(b);}root.append(actions);
  const intro=el('div','result-intro result-panel');text(intro,'result-stage-clear','STAGE CLEAR');text(intro,'result-intro-total','TOTAL SCORE');rank(intro,model,'result-intro-rank').setAttribute('aria-hidden','true');text(intro,'result-step-label','基本スコアを加算中');const progress=el('div','result-progress');progress.append(el('div','result-progress-fill'));intro.append(progress);const steps=el('div','result-steps');for(const label of ['基本点','スピード','コンボ','カードスキル','デッキ'])text(steps,'',label);intro.append(steps);text(intro,'result-intro-stats',`${model.correctCount} / 10 正解 ・ 正答率 ${model.accuracy}%`);root.append(intro);
  const impactStack=el('div','result-impact-stack');intro.prepend(impactStack);
  for(const selector of ['.result-stage-clear','.result-intro-rank','.result-intro-total'])impactStack.append(intro.querySelector(selector));
  const impactTarget=el('div','result-impact-score-target');impactTarget.setAttribute('aria-hidden','true');impactStack.append(impactTarget,intro.querySelector('.result-intro-stats'));
  const fx=el('div','result-fx');picture(fx,'result-halo',`assets/result/fx/halo_${model.rank.halo}.svg`);if(model.rank.id==='perfect')picture(fx,'result-halo result-halo-second','assets/result/fx/halo_silver.svg');picture(fx,'result-particles','assets/result/fx/particles.svg');if(model.rank.shockwave)picture(fx,'result-shockwave','assets/result/fx/shockwave.svg');root.append(fx);
  const score=el('div','result-score');text(score,'result-score-ghost ghost-top','0');text(score,'result-score-value','0');text(score,'result-score-ghost ghost-bottom','0');score.querySelectorAll('.result-score-ghost').forEach(n=>n.setAttribute('aria-hidden','true'));root.append(score);
  const introDeck=el('div','result-intro-deck');cards(introDeck,model);text(introDeck,'result-skill-info','装備スキル発動');root.append(introDeck);
  const skip=el('button','result-skip','タップで演出をスキップ');skip.type='button';skip.setAttribute('aria-label','演出をスキップ');root.append(skip);
  root.querySelectorAll('button').forEach(b=>{if(state.busy)b.disabled=true;});return root;
}
