import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
const dataset=JSON.parse(await readFile('data/play/source/grammar_01_40.json'));
const profile={version:3,nickname:'Nene',memberId:'motoki',backgroundId:'bg-01',setupComplete:true};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const output='test-results/mission-timing';await mkdir(output,{recursive:true});
let page;const errors=[];
const click=id=>page.locator(`[data-action="${id}"]`).click();
const screen=name=>page.waitForFunction(name=>document.querySelector('#stage').dataset.screen===name,name);
const snapshot=()=>page.evaluate(()=>({play:JSON.parse(localStorage.getItem('mrsEnglishV3.play.v1')),missions:JSON.parse(localStorage.getItem('mrsEnglishV3.missions.v1')),wallet:JSON.parse(localStorage.getItem('mrsEnglishV3.wallet.v1'))}));
const invisible=async()=>assert.equal(await page.locator('.me-mission-toast:visible').count(),0);
async function answer(){const {play}=await snapshot(),s=play.session,q=dataset.categories.find(c=>c.id===s.categoryId).questions.find(q=>q.id===s.questionIds[s.index]);const index=s.inputs[s.index].options.indexOf(q.easy.answer);await click(`option:${index}`);await page.waitForFunction(answer=>JSON.parse(localStorage.getItem('mrsEnglishV3.play.v1')).session.inputs[JSON.parse(localStorage.getItem('mrsEnglishV3.play.v1')).session.index].selected===answer,q.easy.answer);await click('confirm');await screen('play_feedback');await invisible();}
try{
 const context=await browser.newContext({viewport:{width:844,height:390},reducedMotion:'reduce'});
 await context.addInitScript(profile=>{if(!localStorage.getItem('mrsEnglishV3.profile')){localStorage.setItem('mrsEnglishV3.profile',JSON.stringify(profile));localStorage.setItem('mrsEnglishV3.wallet.v1',JSON.stringify({version:1,rCoin:100,diamonds:0}));}},profile);
 page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(base);await click('start');await screen('home');
 await page.evaluate(()=>{window.toastNames=[];new MutationObserver(()=>{const n=document.querySelector('.me-mission-toast');if(n&&!n.hidden&&['enter','hold'].includes(n.dataset.phase)){const name=n.querySelector('.me-mission-toast__name').textContent;if(toastNames.at(-1)!==name)toastNames.push(name);}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-phase','hidden']});});
 await click('ready');await screen('play_ready');await click('start');await screen('play_input');
 for(let i=0;i<5;i++){await answer();if(i<4){await click('next');await screen('play_input');}}
 let state=await snapshot();assert.equal(state.wallet.rCoin,400);assert.deepEqual(state.missions.outbox.map(n=>[n.missionId,n.status]),[['D03','pending']]);
 // Longer than the ordinary entire toast lifetime: pending notifications must remain untouched.
 await page.waitForTimeout(3600);await invisible();assert.deepEqual((await snapshot()).missions.outbox.map(n=>n.status),['pending']);
 await click('pause');await screen('play_paused');await invisible();await click('quit');await screen('play_quitConfirm');await invisible();await click('cancelQuit');await screen('play_paused');await click('resume');await screen('play_feedback');await invisible();
 for(let i=5;i<10;i++){await click('next');await screen('play_input');await invisible();await answer();}
 state=await snapshot();assert.equal(state.wallet.rCoin,400);assert.equal(state.missions.outbox[0].status,'pending');
 await click('next');await screen('play_completed');await page.locator('.me-mission-toast[data-phase=hold]:visible').waitFor();assert.equal(await page.locator('.me-mission-toast__name').innerText(),'コンボに挑戦');
 state=await snapshot();assert.equal(state.wallet.rCoin,1200);assert.deepEqual(state.missions.outbox.map(n=>[n.missionId,n.status]),[['D03','started'],['D01','pending']]);
 await page.screenshot({path:`${output}/result.png`});
 // Enter another stage while a toast is already visible; suspend and resume that exact toast.
 await click('again');await screen('play_input');await invisible();await page.waitForTimeout(3600);await invisible();assert.deepEqual((await snapshot()).missions.outbox.map(n=>n.status),['started','pending']);
 await click('pause');await screen('play_paused');await invisible();await click('quit');await screen('play_quitConfirm');await invisible();await click('abort');await screen('play_ready');
 await page.locator('.me-mission-toast[data-phase=hold]:visible').waitFor();assert.equal(await page.locator('.me-mission-toast__name').innerText(),'コンボに挑戦');
 await click('back');await screen('home');await page.locator('.me-mission-toast[data-phase=hold]:visible .me-mission-toast__name').filter({hasText:'今日の英語学習'}).waitFor();
 await page.locator('.me-mission-toast').waitFor({state:'hidden'});assert.deepEqual(await page.evaluate(()=>toastNames),['コンボに挑戦','今日の英語学習']);assert.equal((await snapshot()).wallet.rCoin,1200);
 await page.reload();await click('start');await screen('home');assert.equal(await page.locator('.me-mission-toast:visible').count(),0);assert.deepEqual((await snapshot()).missions.outbox.map(n=>n.status),['started','started']);assert.equal((await snapshot()).wallet.rCoin,1200);
 assert.deepEqual(errors,[]);const results=['Actual answer rewards commit immediately while input/feedback/pause/quit confirmation show no toast; pending survives beyond toast duration.','Completed stage shows pending notifications in order; entering play pauses an existing toast, non-play screens resume it without loss/reward replay/duplicate display.'];console.log(results.join('\n'));await writeFile(`${output}/results.json`,JSON.stringify({results,errors},null,2));await context.close();
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:`${output}/failure.png`});throw error;}finally{await browser.close();}
