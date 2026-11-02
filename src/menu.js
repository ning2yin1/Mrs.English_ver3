const icons = {"gift": "<svg aria-hidden=\"true\" class=\"me-menu-compact__icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 11v10h16V11M3 7h18v4H3ZM12 7v14M12 7 7 6 6 4 8 3 10 4 12 7 14 4 16 3 18 4 17 6 12 7\"/></svg>", "settings": "<svg aria-hidden=\"true\" class=\"me-menu-compact__icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"18.800,12.000 20.435,13.678 19.945,15.291 17.654,15.778 16.808,16.808 16.778,19.151 15.291,19.945 13.327,18.669 12.000,18.800 10.322,20.435 8.709,19.945 8.222,17.654 7.192,16.808 4.849,16.778 4.055,15.291 5.331,13.327 5.200,12.000 3.565,10.322 4.055,8.709 6.346,8.222 7.192,7.192 7.222,4.849 8.709,4.055 10.673,5.331 12.000,5.200 13.678,3.565 15.291,4.055 15.778,6.346 16.808,7.192 19.151,7.222 19.945,8.709 18.669,10.673\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>", "help": "<svg aria-hidden=\"true\" class=\"me-menu-compact__icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m12 6-4-2H3v15h5l4 2 4-2h5V4h-5l-4 2v15\"/></svg>", "chevron": "<svg aria-hidden=\"true\" class=\"me-menu-compact__chevron\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 8 12\" width=\"8\" height=\"12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m2 2 4 4-4 4\"/></svg>"};
export function loadStyle(path) {
  const href=new URL(path,import.meta.url).href;
  const existing=document.querySelector(`link[data-ui-style="${href}"]`);
  if(existing)return existing.ready;
  const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.uiStyle=href;
  link.ready=new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>{link.remove();reject(new Error('画面の読み込みに失敗しました。再試行してください。'));};});
  document.head.append(link);return link.ready;
}
export async function createMenu({onSettings}) {
  await loadStyle('../styles/menu_compact/menu.css');
  const panel=document.createElement('div');panel.id='home-menu';panel.className='me-menu-compact';panel.setAttribute('role','menu');panel.setAttribute('aria-label','Menu');panel.hidden=true;
  const shield=document.createElement('div');shield.className='menu-shield';shield.hidden=true;
  Object.assign(shield.style,{position:'fixed',inset:'0',zIndex:'999'});
  panel.style.overflowY='auto';
  let anchor,opened=false,timer;
  const rows=[['gift','ログインボーナス',null],['settings','設定',onSettings],['help','遊び方',null]];
  for(const [icon,label,action]of rows){
    const button=document.createElement('button');button.type='button';button.className='me-menu-compact__item';button.setAttribute('role','menuitem');
    if(icon==='gift')button.setAttribute('aria-disabled','true');
    button.innerHTML=icons[icon]+`<span class="me-menu-compact__label">${label}</span>`+icons.chevron;
    button.onclick=()=>{close();action?.();};panel.append(button);
  }
  function place(){
    if(opened&&matchMedia('(orientation: portrait)').matches){close(false);return;}
    if(!opened||!anchor?.isConnected){if(opened)close(false);return;}
    const rect=anchor.getBoundingClientRect(),safe=document.querySelector('#safe-area').getBoundingClientRect(),v=visualViewport;
    const left=Math.max(safe.left,v?.offsetLeft||0)+8,right=Math.min(safe.right,(v?.offsetLeft||0)+(v?.width||innerWidth))-8;
    const top=Math.max(safe.top,v?.offsetTop||0)+8;
    const nav=document.querySelector('[data-action="inventory"]')?.getBoundingClientRect();
    const bottom=Math.min(safe.bottom,(v?.offsetTop||0)+(v?.height||innerHeight),nav?.top??Infinity)-8;
    const width=Math.min(240,Math.max(0,right-left)),y=Math.max(top,Math.min(rect.bottom+11,bottom-146));
    panel.style.width=`${width}px`;panel.style.maxHeight=`${Math.max(46,bottom-y)}px`;
    panel.style.setProperty('--menu-left',`${Math.max(left,Math.min(rect.right-width,right-width))}px`);panel.style.setProperty('--menu-top',`${y}px`);
    // Permit the existing Menu button through the shield, while shielding every other control.
    shield.style.clipPath=`polygon(0 0,100% 0,100% 100%,0 100%,0 0,${rect.left}px ${rect.top}px,${rect.left}px ${rect.bottom}px,${rect.right}px ${rect.bottom}px,${rect.right}px ${rect.top}px,${rect.left}px ${rect.top}px)`;
  }
  function close(restore=true){
    if(!opened)return;opened=false;panel.dataset.state='closing';shield.hidden=true;anchor?.setAttribute('aria-expanded','false');
    if(restore&&anchor?.isConnected)anchor.focus({preventScroll:true});
    timer=setTimeout(()=>{panel.hidden=true;},matchMedia('(prefers-reduced-motion: reduce)').matches?0:180);
  }
  shield.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();});
  shield.onclick=event=>{event.stopPropagation();close();};
  function keydown(event){
    if(!opened)return;
    const items=[...panel.querySelectorAll('button')],i=items.indexOf(document.activeElement);
    if(event.key==='Escape'){event.preventDefault();close();}
    else if(['ArrowDown','ArrowUp','Home','End','Tab'].includes(event.key)){
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?items.length-1:(i+(event.key==='ArrowUp'||(event.key==='Tab'&&event.shiftKey)?-1:1)+items.length)%items.length;items[next].focus();
    }
  }
  document.addEventListener('keydown',keydown);
  window.addEventListener('resize',place);visualViewport?.addEventListener('resize',place);visualViewport?.addEventListener('scroll',place);
  document.body.append(shield,panel);
  return {close,toggle(button){if(opened){close();return;}clearTimeout(timer);anchor=button;opened=true;button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','true');panel.hidden=false;shield.hidden=false;place();panel.dataset.state='closed';panel.getBoundingClientRect();requestAnimationFrame(()=>{if(opened){panel.dataset.state='open';panel.querySelector('button').focus();}});}};
}
