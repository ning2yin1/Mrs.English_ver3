import {artLayer,textLayer,cardLayer,position,hit,memberNames} from '../collection/components.js';
const fmt=n=>n.toLocaleString('en-US');
const text=(e,value=e.text)=>textLayer({...e,color:e.fill,tracking:0},String(value));
function artwork(e){
  const node=artLayer(e);
  if(e.bright_top){const line=document.createElement('div');line.className='shop-bright';Object.assign(line.style,{top:`${2-e.insets[0]}px`,left:`${16-e.insets[3]}px`,right:`${16-e.insets[1]}px`});node.append(line);}
  return node;
}
function append(root,e,node){node.style.zIndex='';node.dataset.layer=e.id;root.append(node);return node;}
export async function renderShop(scene,state,actions,data){
  const root=document.createElement('div');root.className='shop-root collection-root';
  const mode=state.screen,sku=state.sku||data.products.skus.find(s=>s.id==='normal_10');
  const receipt=state.receipt,results=receipt?.results||[],result=results[state.index];
  const current=result?data.catalog.cards.find(c=>c.id===result.catalogId):null;
  const coins=state.snapshot.wallet.rCoin,diamonds=state.snapshot.diamonds;
  const insufficient=coins<sku.price,free=sku.id==='welcome_10';
  const disabled=state.busy||state.storageBlocked||!state.snapshot.ready||insufficient||(free&&!state.snapshot.welcomeAvailable);
  const values={7:fmt(coins),9:fmt(diamonds)};
  if(mode==='confirm')Object.assign(values,{5:sku.label,12:free?'初回無料パックを受け取りますか？':'このパックを購入しますか？',16:String(sku.count),18:sku.label,21:`カード${sku.count}枚入り`,26:fmt(sku.price),30:fmt(coins),33:insufficient?'—':fmt(coins-sku.price),34:free?'初回限定・Rコインを消費せずに受け取ります':'Rコインを消費して、カードパックを購入します',38:state.busy?'購入を保存中…':state.storageBlocked?'保存内容を確認してください':insufficient?'Rコイン不足':free?'無料で受け取る':`${fmt(sku.price)} Rコインで購入`});
  if(mode==='opening')Object.assign(values,{5:sku.label,17:String(receipt.count)});
  if(mode==='back')Object.assign(values,{5:`${state.index+1} / ${results.length}`,15:sku.label,16:`${state.index+1}枚目 / 全${results.length}枚`});
  if(mode==='reveal')Object.assign(values,{5:`${state.index+1} / ${results.length}`,22:result.rarity,23:`${result.rarity}ランク`,26:memberNames[current.memberId],27:`${result.rarity}ランク`,28:`${sku.count}枚パック  ${state.index+1} / ${results.length}`,29:memberNames[current.memberId],31:state.index===results.length-1?'結果を見る':'次へ'});
  if(mode==='results')values[5]=`${results.length}枚のカードを獲得`;
  let packGroup;
  for(const original of scene.layers){
    const e={...original};const n=Number(e.id.slice(e.id.lastIndexOf('_')+1));
    if(n===1||e.kind==='overlay')continue;
    if(mode==='main'&&n>=10&&n<=15&&!state.snapshot.welcomeAvailable)continue;
    if(mode==='main'){
      const rows=[[17,19,20,21,24,'normal_1'],[28,30,31,32,36,'normal_5'],[39,41,42,43,49,'normal_10']];
      for(const [title,pack,badge,count,price,id]of rows){const product=data.products.skus.find(s=>s.id===id);if(n===title)values[n]=product.label;if(n===pack)e.file=product.packImage;if(n===count)values[n]=String(product.count);if(n===price)values[n]=`${fmt(product.price)} Rコイン`;}
    }
    if(mode==='confirm'){
      if([19,20,22].includes(n)&&sku.count!==10)continue;
      if(n===14)e.file=sku.packImage;
      if(n===15)e.file=`assets/shop/ui/count_badge_${sku.count===1?'silver':sku.count===5?'violet':'gold'}_44.png`;
      if(n===33&&insufficient)e.fill='#ff9da5';
    }
    if(mode==='opening'){
      if(n===13&&receipt.count!==10)continue;
      if(n===15)e.file=sku.packImage;
      if(n===16)e.file=`assets/shop/ui/count_badge_${receipt.count===1?'silver':receipt.count===5?'violet':'gold'}_44.png`;
    }
    if(mode==='back'){
      if(n===17&&receipt.count!==10)continue;
      if(e.kind==='dot')continue;
    }
    if(mode==='reveal'){
      if(e.effect&&current.rarity!=='R')continue;
      if([22,23,27].includes(n))e.fill=data.animation.profiles[current.rarity].accent;
    }
    if(mode==='results'&&(e.kind==='card'||e.effect||(n>=14&&n<=36)))continue;
    const packParts=mode==='confirm'?[14,15,16,17]:mode==='opening'?[15,16,17,18]:[];
    let target=root;
    if(packParts.includes(n)){
      if(!packGroup){packGroup=document.createElement('div');packGroup.className='shop-pack-motion';packGroup.style.transformOrigin='922px 446px';root.append(packGroup);}
      target=packGroup;
    }
    let node;
    if(e.kind==='text')node=await text(e,values[n]??e.text);
    else if(e.kind==='separator'){node=position(document.createElement('div'),e);node.className='layer';node.style.background=e.browser_rgb||'#8fa9f6';}
    else if(e.kind==='card'){
      if(current.rarity!=='R'){
        const halo=artwork({id:'rarity_halo',kind:'image',x:559,y:46,width:727,height:763,file:data.animation.profiles[current.rarity].halo});halo.style.opacity=data.animation.profiles[current.rarity].peakOpacity;const clip=document.createElement('div');clip.className='shop-effect-clip';clip.append(halo);root.append(clip);
      }
      const particles=document.createElement('div');particles.className='shop-particles shop-effect-clip';root.append(particles);
      node=cardLayer({...e,shadow:true},current);node.dataset.revealCard='true';node.dataset.instanceId=result.instanceId;
    }else node=artwork(e);
    if(e.effect){
      node.dataset.effect=e.effect;
      if(e.pivot_canvas)node.style.transformOrigin=`${e.pivot_canvas[0]-e.x}px ${e.pivot_canvas[1]-e.y}px`;
      const clip=document.createElement('div');clip.className='shop-effect-clip';append(clip,e,node);root.append(clip);
    }else append(target,e,node);
    if(mode==='opening'&&n===15)node.dataset.packImage='true';
    if(mode==='back'&&n===13)node.dataset.cardBack='true';
    if(mode==='confirm'&&[37,38,39].includes(n)&&disabled)node.style.opacity=.45;
  }
  if(mode==='back')for(let i=0;i<results.length;i++){
    const dot=document.createElement('div');dot.className='shop-dot';position(dot,{x:922-(results.length-1)*11-4+i*22,y:756,width:8,height:8});dot.style.background=i===state.index?'#ffe89c':'#62658c';root.append(dot);
  }
  if(mode==='results')await resultCards(root,scene,state,data);
  for(const e of scene.taps){
    if(mode==='main'&&e.id==='welcome_10'&&!state.snapshot.welcomeAvailable)continue;
    const labels={back:mode==='main'?'ホームに戻る':'ショップに戻る',welcome_10:'初回無料10枚パック',buy_1:'1枚パックを選択',buy_5:'5枚パックを選択',buy_10:'10枚パックを選択',purchase:values[38],cancel:'キャンセル',close:'閉じる',open_pack:'パックを開封',open_button:'タップして開封',flip:'カードをめくる',skip:'スキップ',next:values[31],inventory:'インベントリへ',ok:'OK'};
    const button=hit(e,labels[e.id]||e.id,()=>actions.tap(e));
    if(e.id==='purchase')button.disabled=disabled;
    else if(e.id!=='skip')button.disabled=state.busy||state.animating;
    root.append(button);
  }
  if(state.animating&&mode!=='back')await skipOverlay(root,data.scenes.back,actions);
  return root;
}
export async function skipOverlay(root,scene,actions){
  const group=document.createElement('div');group.className='shop-live-skip';Object.assign(group.style,{position:'absolute',inset:0,zIndex:200,pointerEvents:'none'});
  for(const e of scene.layers.filter(e=>[21,22].includes(Number(e.id.slice(-3)))))append(group,e,e.kind==='text'?await text(e):artwork(e));
  const target=scene.taps.find(t=>t.id==='skip'),button=hit(target,'スキップ',()=>actions.tap(target));button.style.pointerEvents='auto';group.append(button);root.append(group);return group;
}
async function resultCards(root,scene,state,data){
  const results=state.receipt.results;
  const labelTemplate=scene.layers.find(e=>e.id.endsWith('_014'));
  const tag=scene.layers.find(e=>e.id.endsWith('_035')),tagLabel=scene.layers.find(e=>e.id.endsWith('_036'));
  for(const [i,result]of results.entries()){
    const card=data.catalog.cards.find(c=>c.id===result.catalogId);
    const width=results.length===1?300:180,height=width*1.4;
    const x=results.length===1?772:206+310*(i%5),y=results.length===1?205:results.length===5?302:147+302*Math.floor(i/5);
    if(['R','S'].includes(card.rarity)){
      const ratio=width/180;const halo=artwork({id:`result_halo_${i}`,kind:'image',x:x-130*ratio,y:y-122*ratio,width:441*ratio,height:495*ratio,file:`assets/shop/fx/glow_${card.rarity==='R'?'25':'27'}.png`});const clip=document.createElement('div');clip.className='shop-effect-clip';clip.append(halo);root.append(clip);
    }
    const box={id:`result_${i}`,x,y,width,height,shadow:true};
    const node=cardLayer(box,card);node.dataset.resultIndex=i;node.dataset.instanceId=result.instanceId;append(root,box,node);
    if(['R','S'].includes(card.rarity))append(root,{id:`result_star_${i}`},artwork({id:`result_star_${i}`,kind:'image',x:x+width-30,y:y+26,width:21,height:21,file:`assets/shop/fx/star_${card.rarity==='R'?'10':'28'}.png`}));
    append(root,{id:`result_name_${i}`},await text({...labelTemplate,id:`result_name_${i}`,anchor_x:x+width/2,y:results.length===1?637:y+height+9},memberNames[card.memberId]));
    if(result.guaranteed){append(root,{id:'guaranteed_badge'},artwork({...tag,x:x+94,y:y+223}));append(root,{id:'guaranteed_label'},await text({...tagLabel,anchor_x:x+138.5,y:y+227}));}
  }
}
