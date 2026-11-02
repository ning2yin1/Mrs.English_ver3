export const TIMELINE=Object.freeze({enter:250,segments:[{id:'base',start:250,end:900},{id:'speed',start:900,end:1350},{id:'combo',start:1350,end:1650},{id:'skill',start:1650,end:2000},{id:'deck',start:2000,end:2250}],hold:2250,impact:2370,rank:2470,summary:2700,summaryEnd:3200,reward:3200,rewardEnd:3550,actions:3550,end:3800});
const clamp=n=>Math.min(1,Math.max(0,n)),ease=n=>1-(1-clamp(n))**3;
export function frameAt(ms,parts,t=TIMELINE){
  let total=0,step=-1;for(const [i,s]of t.segments.entries()){if(ms<s.start)break;step=i;if(ms>=s.end)total+=parts[i];else{total+=Math.floor(parts[i]*ease((ms-s.start)/(s.end-s.start)));break;}}
  return {total,step,phase:ms>=t.end?'final':ms>=t.summary?'summary':ms>=t.impact?'impact':ms>=t.hold?'hold':ms>=t.enter?'count':'enter',summary:ease((ms-t.summary)/(t.summaryEnd-t.summary)),reward:clamp((ms-t.reward)/(t.rewardEnd-t.reward)),actions:clamp((ms-t.actions)/(t.end-t.actions))};
}
export function animateResult(root,{finished=()=>{},replay=true,timeline=TIMELINE}={}){
  const model=root.resultModel;if(!model)return {destroy(){},skip(){}};
  const score=root.querySelector('.result-score'),value=root.querySelector('.result-score-value'),ghosts=root.querySelectorAll('.result-score-ghost'),target=root.querySelector('.result-total-target'),intro=root.querySelector('.result-intro'),summary=root.querySelector('.result-summary'),actions=root.querySelector('.result-actions'),reward=root.querySelector('.result-reward'),fx=root.querySelector('.result-fx'),introDeck=root.querySelector('.result-intro-deck'),steps=root.querySelectorAll('.result-steps > div');
  let raf=null,start=performance.now(),done=false,destroyed=false,lastValue,blockedPointer,blockedKeyboard=false,lastMs=0;
  const emitted=new Set();
  function event(id){if(emitted.has(id))return;emitted.add(id);root.dispatchEvent(new CustomEvent('result:sync',{detail:{id,stageId:model.stageId}}));}
  function geometry(progress,impact){
    const compact=root.dataset.layout==='compact';let sx=compact?root.clientWidth/2:768,sy=compact?Math.min(root.clientHeight*.48,220):322;
    // Intro score positions come from reserved layout slots, not independent top offsets.
    const rootBox=root.getBoundingClientRect(),to=target.getBoundingClientRect(),scale=rootBox.width/root.clientWidth;
    const tx=(to.left+to.width/2-rootBox.left)/scale,ty=(to.top-rootBox.top)/scale+10; // Summary score only.
    let max=compact?Math.min(82,root.clientWidth*.13):(lastMs<timeline.impact?133:137);
    const end=compact?Math.min(60,Math.max(48,root.clientHeight*.15)):94;
    const length=model.total.toLocaleString('en-US').length,fit=length>7?Math.max(.4,7/length):1;
    if(lastMs<timeline.impact){
      const slot=root.querySelector('.result-count-score-target').getBoundingClientRect(),height=slot.height/scale;
      // Leave 12px above/below the score for the existing blurred +/-8px ghost copies.
      max=Math.min(max,Math.max(1,height-24));sy=(slot.top-rootBox.top)/scale+(height-max*fit)/2;
    }
    if(lastMs>=timeline.impact){
      const slot=root.querySelector('.result-impact-score-target').getBoundingClientRect(),height=slot.height/scale;
      // Reserve the full 1.12x impact envelope; the label-to-slot gap stays clear throughout the pulse.
      max=Math.min(max,height/1.12);sy=(slot.top-rootBox.top)/scale+(height-max*fit)/2;
    }
    score.style.left=`${sx+(tx-sx)*progress}px`;score.style.top=`${progress>=1?ty:sy+(ty-sy)*progress}px`;score.style.fontSize=`${(max+(end-max)*progress)*fit}px`;
    score.style.transform=`translateX(-50%) scale(${impact})`;
  }
  function draw(ms,notify=true){
    lastMs=ms;const f=frameAt(ms,model.parts,timeline),text=f.total.toLocaleString('en-US');root.dataset.phase=f.phase;root.classList.toggle('result-impact-layout',ms>=timeline.impact);root.classList.toggle('result-count-layout',ms<timeline.impact);
    // Remove outgoing text before the score travels through its old position; FX keep their timeline.
    root.querySelector('.result-impact-stack').style.opacity=f.summary>0?'0':'1';
    if(text!==lastValue){value.textContent=text;ghosts.forEach(n=>n.textContent=text);lastValue=text;}
    const entered=clamp(ms/timeline.enter);root.querySelector('.result-header').style.opacity=entered;intro.style.opacity=entered*(1-f.summary);intro.style.visibility=f.summary>=1?'hidden':'visible';summary.style.opacity=f.summary;
    summary.style.visibility=f.summary>0?'visible':'hidden';reward.style.opacity=f.reward;actions.style.opacity=f.actions;actions.style.visibility=f.actions>0?'visible':'hidden';
    const impactU=clamp((ms-timeline.impact)/(timeline.summary-timeline.impact)),impact=ms>=timeline.impact&&ms<timeline.summary?1+Math.sin(impactU*Math.PI)*.12:1;
    const lit=ms>=timeline.impact&&ms<timeline.summary;root.classList.toggle('result-impact',lit);fx.style.opacity=lit?String(model.rank.intensity*(1-impactU*.6)):String(.15*f.summary);fx.style.transform=`scale(${lit ? .8+impactU*.55 : 1})`;
    root.querySelectorAll('.result-intro-rank').forEach(n=>{n.style.opacity=ms>=timeline.rank?'1':'0';});
    const totalLabel=root.querySelector('.result-intro-total'),compact=root.dataset.layout==='compact';totalLabel.style.opacity='1';totalLabel.style.top=ms>=timeline.impact?(compact?'auto':'345px'):(compact?'47px':'90px');totalLabel.style.bottom=ms>=timeline.impact&&compact?'42px':'auto';totalLabel.style.color=ms>=timeline.impact?'#ffe7a1':'#66e6ff';root.querySelector('.result-intro-stats').style.opacity=ms>=timeline.impact?'1':'0';
    const step=Math.max(0,f.step),labels=['基本スコアを加算中','スピードボーナスを加算中','コンボボーナスを加算中','カードスキルを加算中','デッキボーナスを加算中'];root.querySelector('.result-step-label').textContent=labels[step];
    root.querySelector('.result-step-label').style.opacity=ms<timeline.impact?'1':'0';root.querySelector('.result-progress').style.opacity=ms<timeline.impact?'1':'0';root.querySelector('.result-progress-fill').style.width=`${clamp(ms/timeline.hold)*100}%`;steps.forEach((n,i)=>n.dataset.active=String(i===f.step));
    root.querySelector('.result-steps').style.opacity=ms<timeline.impact?'1':'0';introDeck.style.opacity=1-f.summary;introDeck.style.visibility=f.summary>=1?'hidden':'visible';
    for(const card of root.querySelectorAll('.result-card-slot')){const skill=step===3&&ms<timeline.segments[3].end&&card.dataset.active==='true',deck=step===4&&ms<timeline.hold;card.classList.toggle('result-card-glow',skill||deck);}
    geometry(f.summary,impact);
    if(ms>=timeline.impact){ghosts.forEach(n=>n.style.opacity='0');score.classList.add('gold');}else{ghosts.forEach(n=>n.style.opacity=f.phase==='count'?'.12':'0');score.classList.remove('gold');}
    const points=[['result_enter',0],['count_start',timeline.enter],['base_complete',timeline.segments[0].end],['speed_complete',timeline.segments[1].end],['combo_complete',timeline.segments[2].end],['skill_trigger',timeline.segments[3].start],['skill_complete',timeline.segments[3].end],['deck_complete',timeline.segments[4].end],['score_hold',timeline.hold],['score_impact',timeline.impact],['rank_reveal',timeline.rank],['summary_open',timeline.summary],['reward_reveal',timeline.reward],['actions_ready',timeline.end]];if(notify)for(const[id,time]of points)if(ms>=time)event(id);
  }
  function finish(emit=true){if(done||destroyed)return;done=true;if(raf!==null)cancelAnimationFrame(raf);raf=null;draw(timeline.end,false);root.dataset.ready='true';root.querySelector('.result-skip').hidden=true;root.querySelectorAll('.result-action').forEach(b=>b.disabled=false);value.setAttribute('aria-label',`最終スコア ${model.total.toLocaleString('en-US')}`);if(emit)finished();}
  function tick(now){if(destroyed||done)return;const ms=Math.max(0,now-start);draw(ms);if(ms>=timeline.end){finish();return;}raf=requestAnimationFrame(tick);}
  // Consume the skip pointer sequence, including its following click. Only a fresh sequence can navigate.
  function down(e){if(!done){blockedPointer=e.pointerId;}else{blockedPointer=undefined;blockedKeyboard=false;}}
  function up(e){if(!done&&e.isPrimary!==false){blockedPointer=e.pointerId;e.preventDefault();e.stopImmediatePropagation();finish();}}
  function click(e){if(!done||blockedPointer!==undefined||blockedKeyboard){e.preventDefault();e.stopImmediatePropagation();if(!done){blockedKeyboard=true;finish();}}}
  function key(e){if(e.key==='Enter'||e.key===' '){if(!done){blockedKeyboard=true;e.preventDefault();e.stopImmediatePropagation();finish();}else if(!e.repeat){blockedKeyboard=false;}}}
  function visibility(){if(document.hidden)finish();}
  function resize(){if(!destroyed)geometry(done?1:frameAt(lastMs,model.parts,timeline).summary,1);}
  const observer=new ResizeObserver(resize);observer.observe(root);
  root.addEventListener('pointerdown',down,true);root.addEventListener('pointerup',up,true);root.addEventListener('click',click,true);root.addEventListener('keydown',key,true);document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize);
  event('result_enter');if(!replay||matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)finish();else{draw(0);raf=requestAnimationFrame(tick);}
  return {skip:()=>finish(),destroy(){destroyed=true;observer.disconnect();if(raf!==null)cancelAnimationFrame(raf);root.removeEventListener('pointerdown',down,true);root.removeEventListener('pointerup',up,true);root.removeEventListener('click',click,true);root.removeEventListener('keydown',key,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);}};
}
