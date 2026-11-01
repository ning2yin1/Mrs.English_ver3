from pathlib import Path
import json,csv,shutil,hashlib,zipfile,re
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
from scipy import ndimage,sparse
from scipy.sparse.linalg import spsolve
import matplotlib
matplotlib.use('Agg')
from matplotlib import pyplot as plt
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT=Path('/workspace/scratch/686cc7d2d974');OUT=ROOT/'mrs-english-ver3-ui-kit'
W,H=1844,853
OUT.mkdir(exist_ok=True)
if not (OUT/'home_approved').exists():shutil.copytree(ROOT/'mrs-english-home-ui-v1',OUT/'home_approved')
for d in ['assets/common','assets/icons','assets/fonts','assets/photos','mockups','layouts','docs','qa','tools']:(OUT/d).mkdir(parents=True,exist_ok=True)
sources={
 'title':'Mrs. English Ver.3 タイトル画面(2).png',
 'nickname':'ニックネーム設定画面(2).png',
 'member':'推しを選ぶメンバー選択画面(2).png',
 'background':'背景選択 22種プレビュー(2).png'}
manifest=[];layouts={};reports={}

def save_image(image,path):
 path=Path(path);tmp=path.with_suffix('.part');image.save(tmp,format='PNG')
 with Image.open(tmp) as check:check.load()
 tmp.replace(path)

def inpaint(a,box):
 x,y,x1,y1=map(int,box);p=a[y:y1,x:x1].astype(float);h,w=p.shape[:2]
 yy,xx=np.mgrid[1:h-1,1:w-1];yy=yy.ravel();xx=xx.ravel();n=len(yy)
 if not n:return
 ids=np.full((h,w),-1);ids[yy,xx]=np.arange(n)
 rows=list(range(n));cols=list(range(n));vs=[4.]*n;b=np.zeros((n,3))
 for dy,dx in [(-1,0),(1,0),(0,-1),(0,1)]:
  ny,nx=yy+dy,xx+dx;ix=ids[ny,nx];inside=ix>=0
  rows.extend(np.arange(n)[inside]);cols.extend(ix[inside]);vs.extend([-1.]*inside.sum());b[~inside]+=p[ny[~inside],nx[~inside]]
 mat=sparse.coo_matrix((vs,(rows,cols)),shape=(n,n)).tocsr();p[yy,xx]=np.clip(spsolve(mat,b),0,255)
 a[y:y1,x:x1]=np.rint(p).astype('uint8')

def maskpoly(box,points=None):
 x,y,x1,y1=map(int,box);w=x1-x;h=y1-y;m=Image.new('L',(w,h))
 if points is None:m.paste(255,(0,0,w,h))
 else:ImageDraw.Draw(m).polygon(points,fill=255)
 return np.asarray(m).copy()

def save(id,p,folder,box,z,kind,**kw):
 path=f'assets/{folder}/{id}.png';p=p.copy();p[p[:,:,3]==0,:3]=0
 tmp=(OUT/path).with_suffix('.tmp.png');Image.fromarray(p.astype('uint8')).save(tmp)
 with Image.open(tmp) as check:check.load()
 tmp.replace(OUT/path)
 alpha=p[:,:,3];manifest.append({'file':path,'id':id,'width':p.shape[1],'height':p.shape[0],'kind':kind,'transparent_pixels':int((alpha==0).sum()),'partial_alpha_pixels':int(((alpha>0)&(alpha<255)).sum()),'sha256':hashlib.sha256((OUT/path).read_bytes()).hexdigest()})
 return entry(id,box,z,kind,file=path,**kw)
def entry(id,box,z,kind,**kw):
 x,y,x1,y1=map(int,box);return dict(id=id,x=x,y=y,width=x1-x,height=y1-y,z=z,kind=kind,**kw)
def rgba(p,alpha):
 return np.dstack([p,alpha]).round().clip(0,255).astype('uint8')

def isolate(p,b):
 p=p.astype(float);b=b.astype(float);res=p-b
 alpha=np.maximum((np.maximum(res,0)/np.maximum(255-b,1)).max(2),(np.maximum(-res,0)/np.maximum(b,1)).max(2))
 alpha[alpha<.012]=0
 f=np.divide(p-(1-alpha[:,:,None])*b,alpha[:,:,None],out=np.zeros_like(p),where=alpha[:,:,None]>0)
 o=rgba(f,alpha*255);o[o[:,:,3]==0,:3]=0;return o

def trace_font(id,text,target):
 # Outline the measured source glyphs, preserving DOM text rather than PNG labels.
 target=np.clip(target,0,1);loc=np.argwhere(target>.25)
 if not len(loc):raise ValueError(('no glyph',id))
 y0,x0=loc.min(0);y1,x1=loc.max(0)+1;g=target[y0:y1,x0:x1]
 cols=(g>.3).sum(0)>0;lb,n=ndimage.label(cols);groups=[]
 for i in range(1,n+1):
  xx=np.where(lb==i)[0]
  if len(xx):groups.append((int(xx.min()),int(xx.max()+1)))
 chars=[c for c in text if c!=' ']
 if len(groups)!=len(chars):
  # Japanese glyphs may contain disconnected parts; use measured inter-cell gaps.
  pitch=g.shape[1]/len(chars);cuts=[0];proj=(g>.2).sum(0)
  for i in range(1,len(chars)):
   t=i*pitch;lo=max(cuts[-1]+1,round(t-pitch*.2));hi=min(g.shape[1]-1,round(t+pitch*.2))
   candidates=np.arange(lo,hi+1);cost=proj[candidates]+.03*np.abs(candidates-t)
   cuts.append(int(candidates[np.argmin(cost)]))
  cuts.append(g.shape[1]);groups=list(zip(cuts[:-1],cuts[1:]))
 family='MEV3'+''.join(x.title() for x in id.split('_'));order=['.notdef','space']+list(dict.fromkeys(chars))
 fb=FontBuilder(1024,isTTF=True);fb.setupGlyphOrder(order);fb.setupCharacterMap({ord(c):c for c in chars}|{32:'space'})
 glyphs={};metrics={};pen=TTGlyphPen(None);glyphs['.notdef']=pen.glyph();metrics['.notdef']=(512,0)
 pen=TTGlyphPen(None);glyphs['space']=pen.glyph();metrics['space']=(96,0)
 baseline=g.shape[0]+2
 for i,(c,(l,r)) in enumerate(zip(chars,groups)):
  if c in glyphs:continue
  z=np.pad(g[:,l:r],2);fig,ax=plt.subplots();cs=ax.contour(z,levels=[.5]);segments=cs.allsegs[0];plt.close(fig)
  pen=TTGlyphPen(None)
  for seg in segments:
   if len(seg)<4:continue
   pts=[(round((float(x)-2)*16),round((baseline-(float(y)-2))*16)) for x,y in seg]
   pen.moveTo(pts[0])
   for pt in pts[1:]:pen.lineTo(pt)
   pen.closePath()
  glyphs[c]=pen.glyph()
  advance=(groups[i+1][0]-l) if i<len(groups)-1 else r-l
  metrics[c]=(max(1,advance)*16,0)
 fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=1408,descent=-192)
 fb.setupNameTable({'familyName':family,'styleName':'Regular','uniqueFontIdentifier':family+'-1','fullName':family,'psName':family})
 fb.setupOS2(sTypoAscender=1408,sTypoDescender=-192,usWinAscent=1408,usWinDescent=192);fb.setupPost(keepGlyphNames=False);fb.setupMaxp()
 path=f'assets/fonts/{id}.ttf';fb.save(OUT/path)
 # The QA raster uses the actual exported outline font, not the source text crop.
 font=ImageFont.truetype(str(OUT/path),64);bb=font.getbbox(text)
 gm=Image.new('L',(max(1,bb[2]-bb[0]),max(1,bb[3]-bb[1])));ImageDraw.Draw(gm).text((-bb[0],-bb[1]),text,font=font,fill=255)
 gm=gm.resize((g.shape[1],g.shape[0]),Image.Resampling.LANCZOS)
 return path,np.asarray(gm),[int(x0),int(y0),int(x1),int(y1)],''.join(dict.fromkeys(chars))

def textmask(a,clean,box,dark=False):
 x,y,x1,y1=box;p=a[y:y1,x:x1].astype(float);b=clean[y:y1,x:x1].astype(float)
 if dark:return np.clip((b-p).max(2)/np.maximum(b.max(2),1),0,1)
 # Monochrome text: remove blue surface variations before tracing white glyphs.
 al=np.maximum(p-b,0)/np.maximum(255-b,1)
 return np.clip(al.max(2),0,1)

def build(screen,panels,texts,icons,photos=(),special=None):
 print('START',screen,flush=True)
 (OUT/f'assets/{screen}').mkdir(exist_ok=True);(OUT/f'qa/{screen}').mkdir(exist_ok=True)
 src=ROOT/'upload'/sources[screen];shutil.copyfile(src,OUT/f'mockups/{screen}.png')
 a=np.asarray(Image.open(src).convert('RGB')).copy();assert a.shape==(H,W,3);clean=a.copy()
 for t in texts:
  x,y,x1,y1=t['box'];inpaint(clean,(x-4,y-3,x1+4,y1+3))
 for id,box in icons:
  x,y,x1,y1=box;inpaint(clean,(x-3,y-3,x1+3,y1+3))
 elements=[];cover=np.zeros((H,W),bool);composites=[]
 # Start with a photograph-only layer; known UI regions are removed below.
 plate=a.copy()
 for id,box,poly,mode in panels:
  x,y,x1,y1=box;m=maskpoly(box,poly);p=clean[y:y1,x:x1].copy()
  for _,pb in photos:
   px,py,px1,py1=pb;ix,iy,ix1,iy1=max(x,px),max(y,py),min(x1,px1),min(y1,py1)
   if ix<ix1 and iy<iy1:m[iy-y:iy1-y,ix-x:ix1-x]=0
  if id=='nickname_panel':m[475-y:577-y,503-x:1341-x]=0
  if mode=='frame':
   # mode frame holes are supplied separately by photos; no face pixels in frame.
   pass
  if isinstance(mode,dict) and 'hole' in mode:
   hx,hy,hx1,hy1=mode['hole'];m[hy-y:hy1-y,hx-x:hx1-x]=0
   pp=a[y:y1,x:x1].astype(float);cool=(pp[:,:,2]>=pp[:,:,0]*.90)&(pp[:,:,2]>=pp[:,:,1]*.94);m[~cool]=0
  if mode=='glass':
   # Analytic alpha split: no photographic detail is baked into the glass PNG.
   # Smooth purple chroma retains relief/ornament, recovered photo goes in plate.
   pf=p.astype(float)
   lum=.65*pf[:,:,0]+.35*pf[:,:,1]
   orn=ndimage.gaussian_filter(np.maximum(pf[:,:,2]-lum-45,0),1.2)
   orn=orn-ndimage.gaussian_filter(orn,18)
   yy,xx=np.mgrid[:orn.shape[0],:orn.shape[1]]
   corner=np.minimum.reduce([xx+yy,xx+(orn.shape[0]-1-yy),(orn.shape[1]-1-xx)+yy,(orn.shape[1]-1-xx)+(orn.shape[0]-1-yy)])
   orn*=np.clip((220-corner)/100,0,1)
   fg=np.dstack([25+orn*.18,10+orn*.08,115+orn*.65]).clip(0,255)
   desired=.58
   # Choose feasible alpha so inverse composite stays within RGB gamut.
   lim=np.ones(p.shape[:2])*desired
   for ch in range(3):
    f=fg[:,:,ch];c=pf[:,:,ch]
    lim=np.minimum(lim,np.where(f>1,c/np.maximum(f,1),1))
    lim=np.minimum(lim,np.where(f<254,(255-c)/np.maximum(255-f,1),1))
   alpha=np.clip(lim*.98,.01,desired)*(m/255)
   # Opaque bevel/frame, translucent interior.
   edge=(m>0)&~ndimage.binary_erosion(m>0,iterations=5)
   alpha[edge]=1;fg[edge]=pf[edge]
   recovered=np.divide(pf-alpha[:,:,None]*fg,1-alpha[:,:,None],out=np.zeros_like(pf),where=alpha[:,:,None]<.999)
   inside=(m>0)&~edge;plate[y:y1,x:x1][inside]=recovered[inside].round().clip(0,255).astype('uint8')
   out=rgba(fg,alpha*255)
  else:out=rgba(p,m)
  e=save(id,out,screen,box,10,'panel',nine_slice={'recommended':False,'reason':'Use native aspect and uniform screen scaling; transparent decorative relief must not be stretched.'});elements.append(e)
  cover[y:y1,x:x1]|=m>0;composites.append(e)
 # Fill pixels hidden behind opaque UI only. Every visible photo pixel is copied.
 # Glass interiors already have an algebraically separated photograph layer.
 for id,box,poly,mode in panels:
  x,y,x1,y1=box;m=maskpoly(box,poly)>0
  for _,pb in photos:
   px,py,px1,py1=pb;ix,iy,ix1,iy1=max(x,px),max(y,py),min(x1,px1),min(y1,py1)
   if ix<ix1 and iy<iy1:m[iy-y:iy1-y,ix-x:ix1-x]=False
  if id=='nickname_panel':m[475-y:577-y,503-x:1341-x]=False
  if isinstance(mode,dict) and 'hole' in mode:
   hx,hy,hx1,hy1=mode['hole'];m[hy-y:hy1-y,hx-x:hx1-x]=False
   pp=a[y:y1,x:x1].astype(float);cool=(pp[:,:,2]>=pp[:,:,0]*.90)&(pp[:,:,2]>=pp[:,:,1]*.94);m[~cool]=False
  if mode=='glass':m=m&~ndimage.binary_erosion(m,iterations=5)
  # Donors are temporary hidden fill, never used for visible persons.
  donor_y=max(0,y-6) if y>10 else min(H-1,y1+6)
  donor=a[donor_y,x:x1]
  for ry in range(y1-y):plate[y+ry,x:x1][m[ry]]=donor[m[ry]]
 for id,box in icons:
  x,y,x1,y1=box;o=isolate(a[y:y1,x:x1],clean[y:y1,x:x1]);elements.append(save(id,o,'icons',box,30,'icon'))
 for id,box in photos:
  x,y,x1,y1=box;p=clean[y:y1,x:x1].copy()
  # Image is an independent photographic tile, never an interactive UI snapshot.
  elements.append(save(id,rgba(p,np.full(p.shape[:2],255)),'photos',box,15,'photo',source='Photographic crop of user-approved mockup; no generation.'))
  cover[y:y1,x:x1]=True
  plate[y:y1,x:x1]=[15,12,39]
 if special:special(a,clean,plate,elements,cover)
 # For text, retain actual glyph outlines in a font; data remains editable text.
 textlayers=[]
 for t in texts:
  id=t['id'];box=t['box'];mask=textmask(a,clean,box,t.get('dark',False))
  path,gm,bounds,chars=trace_font(screen+'_'+id,t['text'],mask)
  x,y,_,_=box;dx,dy,dx1,dy1=bounds;bb=(x+dx,y+dy,x+dx1,y+dy1)
  e=entry(id,bb,40,'text',text=t['text'],font_file=path,font_size=64,color=t.get('color','#ffffff'),covered_characters=chars,dynamic=t.get('dynamic',True),fallback='system-ui, sans-serif');elements.append(e)
  textlayers.append((e,gm))
 # Store the no-UI photographic layer. Texts outside panels need explicit removal.
 for t in texts:
  x,y,x1,y1=t['box']
  if not cover[y:y1,x:x1].any():
   inpaint(plate,(x-4,y-3,x1+4,y1+3))
 for id,box in icons:
  x,y,x1,y1=box
  if not cover[y:y1,x:x1].any():inpaint(plate,(x-3,y-3,x1+3,y1+3))
 bgpath=f'assets/{screen}/photo_plate.png';save_image(Image.fromarray(plate),OUT/bgpath)
 elements.append(entry('photo_background',(0,0,W,H),0,'photo',file=bgpath,limits='UI-hidden areas are restored or analytically separated; do not treat as a pristine original photograph.'))
 comp=Image.fromarray(plate).convert('RGBA')
 for e in sorted(elements,key=lambda e:e['z']):
  if e['kind']!='text' and e['id']!='photo_background':comp.alpha_composite(Image.open(OUT/e['file']),(e['x'],e['y']))
 for e,gm in textlayers:
  fg=Image.new('RGBA',(e['width'],e['height']),e['color']);fg.putalpha(Image.fromarray(gm));comp.alpha_composite(fg,(e['x'],e['y']))
 comp=comp.convert('RGB');save_image(comp,OUT/f'qa/{screen}/reconstructed.png')
 diff=np.abs(np.asarray(comp).astype(int)-a.astype(int));save_image(Image.fromarray(np.minimum(diff*4,255).astype('uint8')),OUT/f'qa/{screen}/difference_x4.png')
 report={'screen':screen,'reference_size':[W,H],'mean_abs_rgb_difference_0_255':float(diff.mean()),'pixels_channel_error_over16_percent':float((diff.max(2)>16).mean()*100),'non_ui_pixels_max_error':int(diff[~cover].max()) if (~cover).any() else 0,'method':'Actual exported PNGs and TTF text composed with Pillow, no game or browser implementation.','limitations':['Hidden decoration restored by harmonic interpolation.','Glyph contours traced from approved mockup; restricted character sets need system fallback.','Photo plates retain original visible photo pixels, but UI-hidden areas are not clean source photography.','Glass layers use analytic alpha separation; original source layers are unavailable.']}
 reports[screen]=report
 layout={'screen':screen,'reference_size':{'width':W,'height':H},'elements':sorted(elements,key=lambda e:e['z']),'tap_targets':[],'resize':{'mode':'uniform-contain-safe-area','scale':'min(safeWidth/1844,safeHeight/853)','safe_area':'Subtract env(safe-area-inset-*) before uniform scaling; center canvas; do not stretch either axis separately.'}}
 layouts[screen]=layout
 print('DONE',screen,report['mean_abs_rgb_difference_0_255'],flush=True)
 return layout

def T(id,text,box,**kw):return {'id':id,'text':text,'box':box,**kw}
def clipped(w,h,c=13):return [(0,c),(c,0),(w-c,0),(w,c),(w,h-c),(w-c,h),(c,h),(0,h-c)]

# Measured screen-specific elements. No other-screen design is invented.
def title_special(a,clean,plate,elements,cover):
 box=(275,484,1538,746);x,y,x1,y1=box;p=clean[y:y1,x:x1].astype(float)
 # Cold highlights and pearlescent logo are separated from warm skin and navy suits.
 rgb=p;mx=rgb.max(2);mn=rgb.min(2);cold=rgb[:,:,2]-np.maximum(rgb[:,:,0]*.86,rgb[:,:,1]*.83)
 strength=np.maximum((mx-55)/200,0)*np.clip((cold+8)/35,0,1)
 strength=np.clip(strength,0,1)
 strength[:,1466-x:]=0
 # Exclude warm hand/skin pixels; logo highlights remain cool/neutral.
 strength[(rgb[:,:,0]>rgb[:,:,2]+12)&(rgb[:,:,0]>rgb[:,:,1]+10)]=0
 strength[:12]*=np.linspace(0,1,12)[:,None];strength[-10:]*=np.linspace(1,0,10)[:,None]
 strength[:,:20]*=np.linspace(0,1,20);strength[:,-20:]*=np.linspace(1,0,20)
 # Recover opaque glyphs/highlights and soft illumination without rectangular background.
 alpha=np.clip(strength,0,1)
 # Background estimate is used only behind the static logo, never on visible faces.
 est=ndimage.median_filter(p,size=(1,51,1))
 # Keep dark suit tone rather than reconstructing new subjects.
 # The median retains broad shirt/skin regions while removing narrow logo strokes.
 out=isolate(p,est)
 out[:,:,3]=(out[:,:,3].astype(float)*np.clip(strength*1.7,0,1)).astype('uint8')
 aa=out[:,:,3]/255;fg=out[:,:,:3].astype(float)
 recovered=np.divide(p-aa[:,:,None]*fg,1-aa[:,:,None],out=est.copy(),where=aa[:,:,None]<.99)
 used=aa>.005;plate[y:y1,x:x1][used]=recovered[used].clip(0,255).round().astype('uint8')
 elements.append(save('title_logo',out,'title',box,20,'logo',static_brand_artwork=True));cover[y:y1,x:x1]|=used

title=build('title',[
 ('tap_strip',(593,742,1250,807),[(5,31),(35,6),(621,6),(652,31),(621,57),(35,57)],'glass')],
 [T('version','Ver.3',(870,692,974,727)),T('tap_label','TAP TO START',(752,758,1092,789))],[],special=title_special)
title['tap_targets']=[{'id':'start','x':0,'y':0,'width':W,'height':H,'route_if_setup_complete':'home','route_if_first_run':'nickname'}]

nickname=build('nickname',[
 ('nickname_header',(92,26,1753,110),clipped(1660,82,14),'opaque'),
 ('nickname_panel',(385,336,1461,673),[(6,25),(26,6),(1047,6),(1068,25),(1068,310),(1048,329),(26,329),(6,310)],'glass'),
 ('nickname_input',(503,475,1341,577),[(4,17),(17,4),(821,4),(834,17),(834,82),(820,97),(17,97),(4,82)],'opaque'),
 ('nickname_confirm',(685,695,1159,813),clipped(473,117,19),'opaque')],
 [T('header','ニックネーム設定',(239,47,558,90)),T('step','01 / 03',(1611,52,1708,86)),T('prompt','ニックネームを入力してください',(656,409,1192,448)),T('name','Nene',(538,505,648,548),dark=True,color='#090a30'),T('input_caret','|',(654,498,664,554),dark=True,color='#3533c8'),T('hint','あとから変更できます',(798,589,1047,618)),T('confirm','決定',(872,726,971,779))],
 [('nickname_back',(140,49,164,89)),('nickname_confirm_arrow',(1075,731,1104,778))])
nickname['tap_targets']=[{'id':'back','x':97,'y':30,'width':107,'height':76,'route':'title'},{'id':'input','x':508,'y':479,'width':830,'height':94,'action':'native-text-input','maxlength':12},{'id':'confirm','x':690,'y':700,'width':465,'height':108,'route':'member'}]

member=build('member',[
 ('member_header',(99,27,1747,110),clipped(1647,82,14),'opaque'),
 ('card_selected',(306,145,730,678),[(13,27),(33,12),(388,12),(410,34),(410,497),(388,519),(33,519),(13,499)],{'hole':(337,197,698,589)}),
 ('card_hiroto',(732,171,1111,655),clipped(378,483,20),{'hole':(748,191,1096,585)}),
 ('card_ryoka',(1138,171,1525,658),clipped(386,486,22),{'hole':(1154,191,1510,586)}),
 ('member_confirm',(616,721,1230,825),clipped(613,103,18),'opaque')],
 [T('header','推しを選択',(253,52,423,87)),T('step','02 / 03',(1596,54,1696,86)),T('selected','SELECTED',(465,168,567,194),color='#24f7ff'),T('motoki_name','大森元貴',(449,601,585,640)),T('hiroto_name','若井滉斗',(855,597,989,635)),T('ryoka_name','藤澤涼架',(1265,598,1404,635)),T('confirm','決定',(883,750,967,795))],
 [('member_back',(142,51,178,89)),('member_confirm_arrow',(1153,758,1176,791)),('member_check',(636,171,704,239))],
 [('motoki_portrait',(337,197,698,589)),('hiroto_portrait',(748,191,1096,585)),('ryoka_portrait',(1154,191,1510,586))])
member['tap_targets']=[{'id':'back','x':105,'y':33,'width':113,'height':72,'route':'nickname'},{'id':'motoki','x':320,'y':157,'width':394,'height':506,'action':'select-member','value':'motoki'},{'id':'hiroto','x':737,'y':176,'width':372,'height':475,'action':'select-member','value':'hiroto'},{'id':'ryoka','x':1144,'y':176,'width':375,'height':477,'action':'select-member','value':'ryoka'},{'id':'confirm','x':622,'y':728,'width':603,'height':91,'route':'background'}]

# In the approved mockup the rows deliberately have 6,5,6,5 tiles of varying width.
# Preserve these measured positions instead of silently redesigning as equal columns.
tiles=[(88,177,247,288),(263,177,417,288),(434,177,590,289),(607,177,765,289),(781,177,939,289),(955,177,1111,289),
 (88,311,269,424),(286,311,476,424),(495,311,685,425),(704,311,898,425),(917,311,1111,426),
 (88,448,244,555),(263,448,416,556),(434,448,590,556),(607,448,763,556),(781,448,938,556),(954,448,1111,556),
 (88,577,244,689),(263,577,418,689),(435,577,591,689),(609,577,764,689),(782,577,938,689)]
bg_texts=[T('header','背景を選択',(224,48,379,83)),T('step','03 / 03',(1603,50,1710,83)),T('preview_header','PREVIEW',(1398,173,1504,204)),T('preview_index','01 / 22',(1400,584,1502,619)),T('confirm','決定',(1398,684,1504,733)),T('hint','ホーム画面に表示する背景を選んでください',(165,761,732,791))]
for i,b in enumerate(tiles,1):bg_texts.append(T('tile_'+str(i).zfill(2),str(i).zfill(2),(b[0]+3,b[1]+3,b[0]+37,b[1]+29)))
background=build('background',[
 ('background_header',(95,22,1749,108),clipped(1653,85,15),'opaque'),
 ('background_panel',(57,144,1787,733),clipped(1729,588,21),'glass'),
 ('background_confirm',(1141,644,1761,766),clipped(619,121,21),'opaque'),
 ('background_preview_frame',(1142,212,1763,568),clipped(620,355,11),{'hole':(1152,224,1751,555)}),
 ('background_selection_frame',(76,165,259,300),clipped(182,134,12),{'hole':(88,177,247,288)})],
 bg_texts,[('background_back',(129,46,156,86)),('background_confirm_arrow',(1687,685,1717,727)),('background_check',(206,171,251,216)),('background_photo_icon',(96,749,144,799))],
 [(f'background_tile_{i:02d}',b) for i,b in enumerate(tiles,1)]+[('background_selected_preview',(1152,224,1751,555))])
background['tap_targets']=[{'id':'back','x':100,'y':27,'width':91,'height':76,'route':'member'},{'id':'confirm','x':1147,'y':651,'width':607,'height':108,'route':'home'}]+[{'id':f'background_{i:02d}','x':b[0],'y':b[1],'width':b[2]-b[0],'height':b[3]-b[1],'action':'select-background','value':f'bg-{i:02d}'} for i,b in enumerate(tiles,1)]

for screen,layout in layouts.items():
 (OUT/f'layouts/{screen}.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2))
 with (OUT/f'layouts/{screen}.csv').open('w',newline='') as f:
  wr=csv.writer(f);wr.writerow(['id','kind','x','y','width','height','z','file','text','font_file'])
  for e in layout['elements']:wr.writerow([e.get(k,'') for k in ['id','kind','x','y','width','height','z','file','text','font_file']])
(OUT/'layouts/new_asset_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(OUT/'qa/new_screens_report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
shutil.copyfile(__file__,OUT/'tools/build_all.py')
print('BUILD COMPLETE',flush=True)
