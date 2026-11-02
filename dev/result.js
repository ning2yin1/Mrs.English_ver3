// QA fixture only. No user storage reads/writes, awards or settlement calls; excluded from dist.
import{loadPlayResources}from'../src/play/controller.js';
import{renderResult}from'../src/result/view.js';
import{animateResult}from'../src/result/animation.js';
import{scoreAnswer,summarize,resolveSkills}from'../src/play/scoring.js';
import{prepareBackground,createLayout}from'../src/layout.js';
const data=await loadPlayResources(),ids=['motoki-r-01','hiroto-s-01','ryoka-a-05'];
const deck=ids.map((catalogId,i)=>({catalogId,instanceId:`qa-result-${i}`,level:1,resolvedSkill:{kind:['score_up','speed_up','combo_support'][i],value:[.05,.2,1][i]}})),skills=resolveSkills(deck);let combo=0;
const answers=Array.from({length:10},(_,i)=>{const a=scoreAnswer({correct:true,elapsedActiveMs:12000,combo,supportRemaining:1,skills,difficulty:'NORMAL',config:data.config});combo=a.comboAfter;return{questionId:`25-${i+1}`,...a};});
const result={stageId:'qa-result',categoryId:'25',difficulty:'NORMAL',completionStatus:'completed',settlementId:'qa-result',questionResults:answers,...summarize(answers,6270),rewardBase:450,dailyMultiplier:2,rewardCoins:900,deckSnapshot:deck};
const root=renderResult({session:{stageId:result.stageId},saved:{results:{[result.stageId]:result}}},data,()=>location.reload()),stage=document.querySelector('#stage'),safe=document.querySelector('#safe-area');
const{resize}=createLayout(safe,stage);stage.resizeDeviceLayout=()=>{const r=safe.getBoundingClientRect(),s=Math.min(r.width/1536,r.height/710),compact=s<.72;root.dataset.layout=compact?'compact':'reference';Object.assign(stage.style,compact?{left:0,top:0,width:r.width+'px',height:r.height+'px',transform:'none'}:{left:(r.width-1536*s)/2+'px',top:(r.height-710*s)/2+'px',width:'1536px',height:'710px',transform:`scale(${s})`});return true;};stage.append(root);stage.dataset.screen='play_completed';document.body.dataset.screen='play_completed';document.querySelector('#scene-background').replaceWith(await prepareBackground('assets/play/backgrounds/bg-03.jpeg'));await Promise.all([...root.querySelectorAll('img')].map(im=>im.decode()));resize();animateResult(root);
