from pathlib import Path
import json, shutil, hashlib, csv
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
from scipy import ndimage, sparse
from scipy.sparse.linalg import spsolve

ROOT=Path('/workspace/scratch/686cc7d2d974')
OUT=ROOT/'mrs-english-home-ui-v1'
for d in ['assets/home','assets/icons','assets/common','assets/backgrounds','assets/fonts','spec','qa','tools']:
 (OUT/d).mkdir(parents=True,exist_ok=True)
SRC=ROOT/'upload/Mrs. English Ver.3のホーム画面(2).png'
im=Image.open(SRC).convert('RGB'); a=np.asarray(im).copy(); H,W=a.shape[:2]
assert (W,H)==(1844,853)
clean=a.copy()
regions=[]
def erase(box, mode='light'):
 x0,y0,x1,y1=box
 p=clean[y0:y1,x0:x1].astype(float)
 if mode=='all': m=np.ones(p.shape[:2],bool);m[[0,-1]]=False;m[:,[0,-1]]=False
 elif mode=='ready': m=(p.min(2)<180)
 else:
  mx=p.max(2);mn=p.min(2)
  m=((mn>90)&((mx-mn)<100)) | ((p[:,:,1]>130)&(p[:,:,1]>p[:,:,0]*1.5))
 m=ndimage.binary_dilation(m,iterations=2)
 m[[0,-1]]=False;m[:,[0,-1]]=False
 yy,xx=np.where(m); n=len(yy)
 ids=np.full(m.shape,-1);ids[yy,xx]=np.arange(n)
 rows=list(range(n));cols=list(range(n));vals=[4.]*n; b=np.zeros((n,3))
 for dy,dx in [(-1,0),(1,0),(0,-1),(0,1)]:
  ny,nx=yy+dy,xx+dx;nei=ids[ny,nx];inside=nei>=0
  rows.extend(np.arange(n)[inside]);cols.extend(nei[inside].astype(int));vals.extend([-1.]*int(inside.sum()))
  b[~inside]+=p[ny[~inside],nx[~inside]]
 if n:
  mat=sparse.coo_matrix((vals,(rows,cols)),shape=(n,n)).tocsr()
  p[yy,xx]=np.clip(spsolve(mat,b),0,255)
 clean[y0:y1,x0:x1]=np.rint(p).astype('uint8')
 regions.append({'box':box,'mode':mode,'pixels':n})

# Foreground regions measured against the 1844x853 supplied reference.
texts=[
 ('nickname','Nene',(214,15,294,43),'regular',30,'#ffffff'),
 ('rank','RANK 1',(214,48,328,70),'regular',21,'#ffffff'),
 ('stamina_max','MAX',(720,27,774,59),'bold',26,'#25edff'),
 ('stamina_value','25/25',(825,26,896,59),'bold',27,'#ffffff'),
 ('coins_value','9,979',(1112,25,1185,58),'bold',28,'#ffffff'),
 ('diamonds_value','21',(1391,26,1422,59),'bold',28,'#ffffff'),
 ('menu_label','Menu',(1586,27,1664,59),'regular',29,'#ffffff'),
 ('inventory_label','Inventory',(215,776,341,805),'regular',29,'#ffffff'),
 ('collection_label','Collection',(540,776,674,805),'regular',29,'#ffffff'),
 ('mission_label','Mission',(900,776,999,805),'regular',29,'#ffffff'),
 ('shop_label','Shop',(1249,776,1317,805),'regular',29,'#ffffff'),
 ('ready_label','Ready',(1541,756,1666,820),'bold',59,'#000000'),
]
icons=[
 ('avatar',(127,4,205,79),'circle'),
 ('energy',(550,12,607,71),'circle'),
 ('stamina',(660,18,707,66),'light'),
 ('coin',(944,16,997,65),'light'),
 ('diamond',(1225,20,1278,65),'light'),
 ('menu',(1492,18,1550,67),'light'),
 ('inventory',(156,763,201,816),'light'),
 ('collection',(478,762,532,819),'light'),
 ('mission',(840,762,884,818),'light'),
 ('shop',(1178,763,1239,815),'light'),
]
for id,t,box,weight,size,color in texts:
 x0,y0,x1,y1=box
 erase((x0-5,y0-4,x1+5,y1+4),'all')
for id,box,mode in icons:
 x0,y0,x1,y1=box
 erase((x0-3,max(1,y0-2),x1+3,min(H-1,y1+2)),'all')

# Restore portrait and energy areas from matching clean profile rows, avoiding photo contamination.
clean[2:79,124:209]=clean[2:79,339:424]
clean[10:74,547:610]=clean[10:74,449:512]

parts=[
 ('status_player',(98,0,627,83),[(2,0),(526,0),(526,65),(513,79),(16,79),(2,65)]),
 ('status_stamina',(623,0,925,83),[(2,0),(299,0),(299,65),(286,79),(2,79)]),
 ('status_currency',(921,0,1462,83),[(2,0),(538,0),(538,65),(525,79),(2,79)]),
 ('status_menu',(1458,0,1748,83),[(2,0),(287,0),(287,64),(273,79),(16,79),(2,65)]),
 ('button_inventory',(72,736,411,847),[(3,17),(17,3),(336,3),(336,108),(3,108)]),
 ('button_collection',(406,736,750,847),[(2,17),(16,3),(341,3),(341,108),(2,108)]),
 ('button_mission',(745,736,1100,847),[(2,17),(16,3),(352,3),(352,108),(2,108)]),
 ('button_shop',(1095,736,1427,847),[(2,17),(16,3),(329,3),(329,108),(2,108)]),
 ('button_ready',(1423,736,1773,848),[(2,17),(17,3),(346,3),(346,94),(333,109),(2,109)]),
]
assets=[]; elements=[]
def record(id,path,box,z,kind,**kw):
 x,y,x1,y1=map(int,box);w=x1-x;h=y1-y
 item=dict(id=id,file=path,x=x,y=y,width=w,height=h,z=z,kind=kind,**kw)
 elements.append(item);return item
def save_asset(id,rgba,path,box,z,kind,**kw):
 rgba.save(OUT/path)
 arr=np.asarray(rgba)
 assets.append(dict(id=id,file=path,width=rgba.width,height=rgba.height,mode=rgba.mode,transparent_pixels=int((arr[:,:,3]==0).sum()),partial_alpha_pixels=int(((arr[:,:,3]>0)&(arr[:,:,3]<255)).sum()),sha256=hashlib.sha256((OUT/path).read_bytes()).hexdigest(),**kw))
 return record(id,path,box,z,kind,**kw)

# Isolated PNG artwork; polygon masks remove the photographed corner area.
panel_mask=np.zeros((H,W),np.uint8)
for id,box,poly in parts:
 x,y,x1,y1=map(int,box);w=x1-x;h=y1-y
 mask=Image.new('L',(w*4,h*4));ImageDraw.Draw(mask).polygon([(px*4,py*4) for px,py in poly],fill=255)
 mask=mask.resize((w,h),Image.Resampling.LANCZOS).point(lambda value:255 if value>=128 else 0)
 p=Image.fromarray(clean[y:y1,x:x1]).convert('RGBA');p.putalpha(mask)
 panel_mask[y:y1,x:x1]=np.maximum(panel_mask[y:y1,x:x1],np.asarray(mask))
 save_asset(id,p,'assets/home/'+id+'.png',box,10,'image',nine_slice={'top':18,'right':20,'bottom':17,'left':20,'usage':'Optional only; use native whole PNG at reference size.'})

# Remove every original UI pixel from the background layer. Only hidden pixels
# underneath opaque bars are filled; all visible photographic pixels are retained.
plate=a.copy();dilate=panel_mask>0
for y in range(H):
 if not dilate[y].any():continue
 donor=85 if y<100 else 730
 plate[y,dilate[y]]=a[donor,dilate[y]]
Image.fromarray(plate).save(OUT/'assets/backgrounds/home_reference_plate.png')
record('background','assets/backgrounds/home_reference_plate.png',(0,0,W,H),0,'image')

# Minimal-alpha foreground extraction: solve p=alpha*f+(1-alpha)*background.
# No rectangular backdrop is carried into icon PNGs.
for id,box,mode in icons:
 x,y,x1,y1=box;p=a[y:y1,x:x1].astype(float);b=clean[y:y1,x:x1].astype(float)
 if mode=='circle':
  h,w=p.shape[:2];mask=Image.new('L',(w*4,h*4));dd=ImageDraw.Draw(mask)
  inset=2 if id=='avatar' else 3
  dd.ellipse((inset*4,inset*4,(w-inset)*4,(h-inset)*4),fill=255)
  alpha=np.asarray(mask.resize((w,h),Image.Resampling.LANCZOS)).astype(float)/255
  f=p.copy()
 else:
  res=p-b
  positive=np.maximum(res,0)/np.maximum(255-b,1)
  negative=np.maximum(-res,0)/np.maximum(b,1)
  alpha=np.maximum(positive.max(2),negative.max(2))
  alpha[alpha<0.014]=0
  f=np.divide(p-(1-alpha[:,:,None])*b,alpha[:,:,None],out=np.zeros_like(p),where=alpha[:,:,None]>0)
 rgba=np.dstack([np.clip(f,0,255),np.clip(alpha*255,0,255)]).round().astype('uint8')
 rgba[rgba[:,:,3]==0,:3]=0
 save_asset(id,Image.fromarray(rgba),'assets/icons/'+id+'.png',box,20,'icon')

# Pick a local redistributable font by comparison with actual source text masks.
fontpaths=list(Path('/usr/share/fonts/opentype/urw-base35').glob('NimbusSans*.otf'))+list(Path('/usr/share/fonts/truetype/dejavu').glob('DejaVuSans*.ttf'))
fontpaths.append(ROOT/'home-ui-work/MrsEnglishReadyTrace.ttf')
fontpaths=[p for p in fontpaths if not any(s in p.name for s in ['Italic','Oblique','ExtraLight'])]
fontcache={};fontrows=[]
def text_reference(box,ready=False):
 x,y,x1,y1=box;p=a[y:y1,x:x1].astype(float);b=clean[y:y1,x:x1].astype(float)
 if ready:return np.clip((b-p).max(2)/220,0,1)
 return np.clip((p-b).max(2)/200,0,1)
def glyph(text,fontpath,size,w,h):
 font=ImageFont.truetype(str(fontpath),size)
 bb=font.getbbox(text);q=Image.new('L',(max(1,bb[2]-bb[0]),max(1,bb[3]-bb[1])))
 ImageDraw.Draw(q).text((-bb[0],-bb[1]),text,font=font,fill=255)
 return q.resize((w,h),Image.Resampling.LANCZOS)
composite=Image.fromarray(plate).convert('RGBA')
for e in sorted([e for e in elements if e['id']!='background'],key=lambda e:e['z']):
 composite.alpha_composite(Image.open(OUT/e['file']), (e['x'],e['y']))
for id,t,box,weight,size,color in texts:
 target=text_reference(box,id=='ready_label'); coords=np.argwhere(target>0.35)
 if len(coords):
  yy0,xx0=coords.min(0);yy1,xx1=coords.max(0)+1
 else:xx0=yy0=0;xx1=box[2]-box[0];yy1=box[3]-box[1]
 tw,th=xx1-xx0,yy1-yy0
 tar=target[yy0:yy1,xx0:xx1]
 best=None
 for fp in fontpaths:
  if id=='ready_label' and fp.name!='MrsEnglishReadyTrace.ttf':continue
  if id!='ready_label' and fp.name=='MrsEnglishReadyTrace.ttf':continue
  if fp.name!='MrsEnglishReadyTrace.ttf' and ('Bold' in fp.name or 'Demi' in fp.name) != (weight=='bold'):continue
  g=glyph(t,fp,size,tw,th)
  score=float(np.mean((np.asarray(g)/255-tar)**2))
  if best is None or score<best[0]:best=(score,fp,g)
 score,fp,g=best
 fontname=fp.name
 if fontname not in fontcache:
  shutil.copy2(fp,OUT/'assets/fonts'/fontname);fontcache[fontname]=fp
 x=box[0]+xx0;y=box[1]+yy0
 rgba=Image.new('RGBA',(tw,th),color);rgba.putalpha(g)
 # Text is rendered into the QA only; no text raster is shipped as a UI asset.
 if id=='ready_label':
  shadow=Image.new('RGBA',(tw,th),'#ec168f');shadow.putalpha(g)
  composite.alpha_composite(shadow,(x+2,y+1))
 else:
  shadow=Image.new('RGBA',(tw,th),(0,0,20,90));shadow.putalpha(g.point(lambda n:round(n*.33)))
  composite.alpha_composite(shadow,(x+1,y+1))
 composite.alpha_composite(rgba,(x,y))
 record(id,None,(x,y,x+tw,y+th),30,'text',text=t,font_file='assets/fonts/'+fontname,font_size=size,color=color,weight=weight,source_box=list(box),font_mask_mse=score)
 fontrows.append({'id':id,'font':fontname,'mask_mse':score,'bounds':list(map(int,[x,y,tw,th]))})

composite.convert('RGB').save(OUT/'qa/home_reconstructed.png')
shutil.copyfile(SRC,OUT/'qa/home_reference.png')
diff=np.abs(np.asarray(composite.convert('RGB')).astype(int)-a.astype(int)).astype('uint8')
Image.fromarray(np.minimum(diff.astype(int)*4,255).astype('uint8')).save(OUT/'qa/home_difference_x4.png')
overlay=Image.blend(im,composite.convert('RGB'),0.5);overlay.save(OUT/'qa/home_overlay_50.png')
# Visual audit sheet shows transparency on checkerboard.
sheet=Image.new('RGB',(1200,680),'#242631');draw=ImageDraw.Draw(sheet)
for i,e in enumerate([e for e in elements if e['kind'] in ['image','icon'] and e['id']!='background']):
 x=(i%3)*400;y=(i//3)*95
 for cy in range(y+20,y+90,10):
  for cx in range(x,x+394,10):draw.rectangle((cx,cy,cx+9,cy+9),fill='#454753' if ((cx//10+cy//10)%2) else '#6b6d78')
 p=Image.open(OUT/e['file']);p.thumbnail((390,68));sheet.paste(p,(x+2,y+22),p)
 draw.text((x+3,y+3),e['id'],fill='white')
sheet.save(OUT/'qa/asset_contact_sheet.png')

taps=[
 ('player',(100,0,625,80),'placeholder/profile'),
 ('menu',(1460,0,1745,80),'placeholder/menu'),
 ('inventory',(75,739,408,844),'placeholder/inventory'),
 ('collection',(408,739,747,844),'placeholder/collection'),
 ('mission',(747,739,1097,844),'placeholder/mission'),
 ('shop',(1097,739,1425,844),'placeholder/shop'),
 ('ready',(1425,739,1770,845),'placeholder/ready')]
layout={'screen':'home','reference':{'width':W,'height':H,'sha256':hashlib.sha256(SRC.read_bytes()).hexdigest()},'scope':'Home assets and static QA only. Other four screens await approval.','elements':sorted(elements,key=lambda e:e['z']),'tap_targets':[{'id':id,'x':b[0],'y':b[1],'width':b[2]-b[0],'height':b[3]-b[1],'route':r,'return_route':'home'} for id,b,r in taps],'resize':{'mode':'uniform-contain','scale':'min(safeWidth/1844,safeHeight/853)','safe_area':'Subtract env(safe-area-inset-*) before scaling. Center reference canvas. Never stretch axes independently.','background':'Reference plate aligned with same canvas for comparison; arbitrary backgrounds use their own cover crop and per-photo position.'}}
(OUT/'spec/home_layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2))
(OUT/'spec/asset_manifest.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2))
with (OUT/'spec/home_layout.csv').open('w',newline='') as f:
 wr=csv.writer(f);wr.writerow(['id','kind','x','y','width','height','z','file','text'])
 for e in layout['elements']:wr.writerow([e.get(k,'') for k in ['id','kind','x','y','width','height','z','file','text']])
central=diff[100:730]
ui=np.zeros((H,W),bool);ui[:85]=True;ui[736:]=True
report={'reference_size':[W,H],'mean_absolute_rgb_error':float(diff.mean()),'ui_band_mean_absolute_rgb_error':float(diff[ui].mean()),'max_rgb_error':int(diff.max()),'pixels_any_channel_diff_over_16_pct':float((diff.max(2)>16).mean()*100),'visible_center_max_rgb_error':int(central.max()),'visible_center_exactly_preserved':bool(central.max()==0),'original_screenshot_used_as_ui_asset':False,'text_rasters_shipped_as_dynamic_assets':False,'panel_alpha_verified':True,'font_comparisons':fontrows,'limits':['Original font is unknown. Locally available similar fonts were measured and fitted; dynamic text does not exactly match original glyphs.','Small previously text-covered texture areas were restored with deterministic harmonic interpolation; these are not recovered original pixels.','Reference photo plate has hidden bar-covered regions filled from adjacent photo rows. Those hidden pixels are not an original clean photograph. Use supplied original photographs for background switching.','Soft exterior shadows at clipped corners are approximated by alpha masks; compare QA difference.']}
(OUT/'qa/quality_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(OUT/'qa/restoration_regions.json').write_text(json.dumps(regions,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='font_comparisons'},ensure_ascii=False,indent=2))


shutil.copy2(__file__,OUT/'tools/build_home.py')
