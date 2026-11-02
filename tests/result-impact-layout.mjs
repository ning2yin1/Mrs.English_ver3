import{execFileSync}from'node:child_process';import{chromium}from'playwright';import assert from'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises';
const output='qa/result-impact-layout';await mkdir(output,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const results=[],errors=[];
const sizes=[[1536,710],[844,390],[667,375]];
try{
  for(const[width,height]of sizes){
    const p=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});p.on('pageerror',e=>errors.push(String(e)));
    await p.addInitScript(()=>{Object.defineProperty(performance,'now',{value:()=>0});window.requestAnimationFrame=fn=>{window.resultLayoutFrame=fn;return 1;};window.cancelAnimationFrame=()=>{};});
    await p.goto('http://127.0.0.1:4175/dev/result.html');await p.waitForFunction(()=>typeof window.resultLayoutFrame==='function',null,{polling:50});
    if(width!==1536){await p.addStyleTag({content:'#safe-area{left:47px;right:47px;top:0;bottom:21px}'});await p.waitForTimeout(30);}
    const phases=[];
    for(const time of [0,2100,2370,2470,2500,2535,2600,2699,2700,2710,2750,2800,2900,3000,3100,3200,3800]){
      const state=await p.evaluate(time=>{window.resultLayoutFrame(time);const root=document.querySelector('.result-root'),r=s=>root.querySelector(s).getBoundingClientRect().toJSON();return{time,phase:root.dataset.phase,stackOpacity:+root.querySelector('.result-impact-stack').style.opacity,boxes:['.result-stage-clear','.result-intro-rank','.result-intro-total','.result-score','.result-intro-stats'].map(r),normalLabel:r('.result-total-label'),score:r('.result-score'),root:root.getBoundingClientRect().toJSON(),glow:root.classList.contains('result-impact'),wave:!!root.querySelector('.result-shockwave')};},time);
      if(time>=2370&&time<2700){
        for(let i=1;i<state.boxes.length;i++)assert.ok(state.boxes[i].top>=state.boxes[i-1].bottom-.1,`${width} at ${time}: item ${i} overlaps`);
        assert.ok(state.boxes[3].top-state.boxes[2].bottom>=11.9,`${width} at ${time}: label gap ${state.boxes[3].top-state.boxes[2].bottom}`);
        assert.ok(state.boxes[4].bottom<=state.root.bottom+.1);assert.equal(state.glow,true);assert.equal(state.wave,true);
      }
      if(time>2700&&time<3200)assert.equal(state.stackOpacity,0,'Outgoing labels must not cross the moving score');
      if(time===2535||time===3800)await p.screenshot({path:`${output}/${width}-${time===2535?'impact-peak':'final'}.png`});phases.push(state);
    }
    // Compare the released implementation under identical motion and font-loading conditions.
    const before=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
    for(const file of ['view.js','animation.js','style.css'])await before.route(`**/src/result/${file}`,route=>route.fulfill({contentType:file.endsWith('.css')?'text/css':'text/javascript',body:execFileSync('git',['show',`5ee8730:src/result/${file}`],{encoding:'utf8'})}));
    await before.addInitScript(()=>{Object.defineProperty(performance,'now',{value:()=>0});window.requestAnimationFrame=fn=>{window.resultLayoutFrame=fn;return 1;};window.cancelAnimationFrame=()=>{};});
    await before.goto('http://127.0.0.1:4175/dev/result.html');await before.waitForFunction(()=>typeof window.resultLayoutFrame==='function',null,{polling:50});
    if(width!==1536)await before.addStyleTag({content:'#safe-area{left:47px;right:47px;top:0;bottom:21px}'});
    await before.evaluate(()=>window.resultLayoutFrame(3800));await before.evaluate(()=>document.fonts.ready);await p.evaluate(()=>document.fonts.ready);
    assert.ok((await before.screenshot()).equals(await p.screenshot()),`${width}: normal summary pixels changed`);await before.close();
    assert.equal(await p.evaluate(()=>localStorage.length),0);
    results.push({width,height,checks:'Five items in order, >=12px label gap at full 1.12x pulse, transition without text crossing, existing FX, unchanged final layout',phases});await p.close();
  }
  assert.deepEqual(errors,[]);await writeFile(`${output}/results.json`,JSON.stringify({results,errors},null,2)+'\n');console.log('Impact layout: 1536/844/667, five-item vertical order, >=12px gap through pulse, clean convergence, normal summary unchanged: PASS');
}finally{await browser.close();}
