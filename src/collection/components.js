import {fontFor,position,picture,nineSlice,hit,label} from '../components.js';
const SVG='http://www.w3.org/2000/svg';
const ctx=document.createElement('canvas').getContext('2d');
const memberBounds={motoki:[-1,-37,130,0],hiroto:[0,-33,126,0],ryoka:[0,-32,128,0]};
const memberNames={motoki:'大森元貴',hiroto:'若井滉斗',ryoka:'藤澤涼架'};
export async function textLayer(e, text=e.text) {
  const primary=await fontFor(e.font_file);
  const fallback=e.font_fallback_file ? await fontFor(e.font_fallback_file) : null;
  const family=[primary,fallback].filter(Boolean).join(',');
  ctx.font=`${e.font_size}px ${family}`;
  const advance=ctx.measureText(text).width + (Array.from(text).length-1)*(e.tracking||0);
  const x=e.align==='right'?e.anchor_x-advance:e.align==='center'?e.anchor_x-advance/2:e.anchor_x ?? e.x;
  const svg=document.createElementNS(SVG,'svg'); svg.classList.add('layer');svg.dataset.layer=e.id;
  svg.style.overflow='visible'; position(svg,{...e,x,width:Math.max(advance,1),height:e.font_size*1.5});
  const add=(char,offset,ascent)=>{
    const node=document.createElementNS(SVG,'text');node.textContent=char;
    node.setAttribute('x',offset);node.setAttribute('y',ascent);node.setAttribute('fill',e.color);
    node.style.fontFamily=family;node.style.fontSize=`${e.font_size}px`;
    node.style.filter='drop-shadow(1px 1px 0 rgba(0,0,20,.59))';svg.append(node);
  };
  if (e.tracking) {
    let offset=0;
    for (const char of text) {const m=ctx.measureText(char);add(char,offset,m.actualBoundingBoxAscent);offset+=m.width+e.tracking;}
  } else add(text,0,text===e.text ? -e.glyph_bbox_baseline[1] : ctx.measureText(text).actualBoundingBoxAscent);
  return svg;
}
export async function memberLayer(e,memberId=e.memberId) {
  return label({...e,text:memberNames[memberId],font_file:`assets/fonts/member_${memberId}_name.ttf`,font_size:64,color:'#f4f2ff',glyph_bbox_at_font_size_64:memberBounds[memberId]});
}
export function artLayer(e) {
  if (e.kind==='nine_slice') return nineSlice(e,e.file,e.insets);
  if (e.rotate) {
    const wrapper=position(document.createElement('div'),e); wrapper.className='layer';wrapper.dataset.layer=e.id;
    // Pillow's expand rotation anchors the resulting image at the supplied x/y.
    wrapper.style.width=`${e.height}px`;wrapper.style.height=`${e.width}px`;
    const im=picture({...e,x:0,y:0}); im.style.transformOrigin='0 0';
    im.style.transform=`translateX(${e.height}px) rotate(90deg)`;wrapper.append(im);return wrapper;
  }
  const node=picture(e); if(e.mirror)node.style.transform='scaleX(-1)';return node;
}
export function cardLayer(e,card) {
  const node=position(document.createElement('div'),e);node.className='collection-card';node.dataset.cardId=card.id;
  if(card.instances)node.dataset.instanceLevels=JSON.stringify(card.instances);
  if(e.shadow) node.style.filter='drop-shadow(3px 7px 6px rgba(0,0,0,.7))';
  const art=document.createElement('div');art.className='card-art';art.style.transform=`scale(${e.width/1060})`;
  const [x,y,x1,y1]=card.photo_window;
  const photo=document.createElement('img');photo.className='card-photo';photo.src=card.image;photo.alt='';photo.draggable=false;
  Object.assign(photo.style,{left:`${x}px`,top:`${y}px`,width:`${x1-x}px`,height:`${y1-y}px`,objectPosition:'56% 42%'});
  const frame=document.createElement('img');frame.src=card.frame;frame.alt='';frame.draggable=false;
  Object.assign(frame.style,{left:'0',top:'0',width:'1060px',height:'1484px'});
  art.append(photo,frame);node.append(art);return node;
}
export {position,hit,memberNames};
