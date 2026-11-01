import {cardLayer,position} from '../collection/components.js';
export function createEffects(config){
  let generation=0;const animations=new Set(),timers=new Map(),cleanups=new Set();
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const abort=()=>new DOMException('演出を終了しました。','AbortError');
  function cancel(){generation++;for(const a of animations)a.cancel();animations.clear();for(const [id,reject]of timers){clearTimeout(id);reject(abort());}timers.clear();for(const cleanup of cleanups)cleanup();cleanups.clear();}
  function begin(){cancel();return generation;}
  function wait(ms,token){return new Promise((resolve,reject)=>{if(token!==generation)return reject(abort());const id=setTimeout(()=>{timers.delete(id);token===generation?resolve():reject(abort());},ms);timers.set(id,reject);});}
  async function motion(node,frames,options,token){
    if(!node)return;
    if(token!==generation)throw abort();
    if(!node.animate){await wait(options.duration,token);Object.assign(node.style,frames.at(-1));return;}
    const a=node.animate(frames,{easing:'ease-in-out',fill:'forwards',...options});animations.add(a);
    try{await a.finished;if(token!==generation)throw abort();}catch{throw abort();}finally{animations.delete(a);}
  }
  function trackNode(node){cleanups.add(()=>node.remove());return node;}
  return {
    cancel,
    idle(root){
      if(reduced())return;
      for(const node of root.querySelectorAll('[data-effect="glow"]'))if(node.animate){const a=node.animate([{opacity:.82},{opacity:1},{opacity:.82}],{duration:config.timing.packIdlePulseMs,iterations:Infinity});a.finished.catch(()=>{});animations.add(a);}
    },
    async pack(root){
      const token=begin(),group=root.querySelector('.shop-pack-motion'),image=root.querySelector('[data-pack-image]');
      if(reduced()){await motion(group,[{opacity:1},{opacity:0}],{duration:config.reducedMotion.fadeMs||140},token);return;}
      await motion(group,[{transform:'translateX(0) rotate(0deg)'},{transform:'translateX(-7px) rotate(-2deg)'},{transform:'translateX(7px) rotate(2deg)'},{transform:'translateX(0) rotate(0deg)'}],{duration:config.timing.shakeMs},token);
      await Promise.all([...root.querySelectorAll('[data-effect="glow"]')].map(node=>motion(node,[{transform:'scale(1)'},{transform:'scale(1.35)'}],{duration:config.timing.buildGlowMs},token)));
      if(image){const seal=trackNode(image.cloneNode(true));seal.removeAttribute('data-pack-image');seal.style.clipPath=`inset(0 0 ${(1-config.packSplit.sealClipFraction)*100}% 0)`;group.append(seal);image.style.clipPath=`inset(${config.packSplit.sealClipFraction*100}% 0 0 0)`;
        await Promise.all([motion(seal,[{transform:'translateY(0) rotate(0)',opacity:1},{transform:`translateY(-${config.packSplit.sealLiftPx}px) rotate(${config.packSplit.sealRotateDeg}deg)`,opacity:0}],{duration:config.timing.sealLiftMs},token),motion(group,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:`scale(${config.packSplit.bodyScale})`}],{duration:config.timing.sealLiftMs},token)]);
      }
    },
    async back(root){const token=begin();await motion(root.querySelector('[data-card-back]'),reduced()?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'translateY(18px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:reduced()?140:config.timing.backEnterMs},token);},
    async flip(root,card){
      const token=begin(),back=root.querySelector('[data-card-back]'),g=config.cardFlipGeometry;
      if(reduced()||!CSS.supports('transform-style','preserve-3d')){await motion(back,[{opacity:1},{opacity:0}],{duration:140},token);return;}
      const shell=position(document.createElement('div'),{x:g.endCenter[0]-g.baseSize[0]/2,y:g.endCenter[1]-g.baseSize[1]/2,width:g.baseSize[0],height:g.baseSize[1]});shell.className='shop-flip-shell';
      const rotor=document.createElement('div');rotor.className='shop-flip-rotor';
      const rear=document.createElement('div');rear.className='shop-flip-face';const rearImage=new Image();rearImage.src='assets/shop/cards/card_back.png';rearImage.alt='';rear.append(rearImage);
      const front=document.createElement('div');front.className='shop-flip-face shop-flip-front';front.append(cardLayer({x:0,y:0,width:g.baseSize[0],height:g.baseSize[1]},card));rotor.append(rear,front);shell.append(rotor);root.append(shell);trackNode(shell);back.hidden=true;
      await Promise.all([motion(shell,[{transform:`translateY(${g.startCenter[1]-g.endCenter[1]}px) scale(${g.startScale})`},{transform:`translateY(0) scale(${g.endScale})`}],{duration:config.timing.flipMs},token),motion(rotor,[{transform:'rotateY(0deg)'},{transform:'rotateY(180deg)'}],{duration:config.timing.flipMs},token)]);
    },
    async reveal(root,rarity){
      const token=begin(),profile=config.profiles[rarity];
      if(reduced()||!CSS.supports('transform-style','preserve-3d')){await motion(root.querySelector('[data-reveal-card]'),[{opacity:0},{opacity:1}],{duration:140},token);return;}
      const tasks=[];
      for(const node of root.querySelectorAll('[data-effect="glow"]'))tasks.push(motion(node,[{transform:'scale(1)',opacity:profile.peakOpacity*.65},{transform:'scale(1.06)',opacity:profile.peakOpacity},{transform:'scale(1)',opacity:1}],{duration:config.timing.frontRevealMs+profile.revealHoldMs},token));
      const particles=root.querySelector('.shop-particles');
      for(let i=0;particles&&i<Math.min(24,profile.particles);i++){
        const theta=i*2.39996323,radius=205+(i%4)*12,x=922+Math.cos(theta)*radius,y=416.5+Math.sin(theta)*290;
        const star=trackNode(new Image());star.src='assets/shop/fx/star_08.png';star.alt='';star.className='shop-particle';Object.assign(star.style,{left:`${x}px`,top:`${y}px`,width:'20px',height:'20px'});particles.append(star);
        tasks.push(motion(star,[{opacity:0,transform:'translate(0,0) scale(.6)'},{opacity:profile.peakOpacity,offset:.35},{opacity:0,transform:`translate(${Math.cos(theta)*65}px,${Math.sin(theta)*65}px) rotate(80deg) scale(1.1)`}],{duration:config.timing.frontRevealMs+profile.revealHoldMs},token));
      }
      if(profile.flashOpacity){const flash=trackNode(new Image());flash.src=config.flash;flash.alt='';Object.assign(flash.style,{position:'absolute',left:'559px',top:'136px',width:'727px',height:'640px',pointerEvents:'none'});particles?.append(flash);tasks.push(motion(flash,[{opacity:0},{opacity:profile.flashOpacity,offset:.3},{opacity:0}],{duration:config.timing.flashMs},token));}
      await Promise.all([...tasks,wait(config.timing.frontRevealMs+profile.revealHoldMs,token)]);
      for(const cleanup of cleanups)cleanup();cleanups.clear();
    },
    async next(root){const token=begin();await motion(root.querySelector('[data-reveal-card]'),[{opacity:1},{opacity:0}],{duration:reduced()?140:config.timing.nextTransitionMs},token);},
    async results(root){const token=begin();await motion(root,[{opacity:0},{opacity:1}],{duration:reduced()?140:config.timing.resultFadeMs},token);},
  };
}
