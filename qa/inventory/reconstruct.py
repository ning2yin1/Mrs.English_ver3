from pathlib import Path
import json,argparse
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageFilter
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--out',required=True);a=p.parse_args();ROOT=Path(a.root);OUT=Path(a.out);OUT.mkdir(parents=True,exist_ok=True)
cat={c['id']:c for c in json.loads((ROOT/'layouts/collection/catalog.json').read_text())['cards']}
def src(path):return ROOT/path
@lru_cache(None)
def card(id,width):
 c=cat[id];f=Image.open(src(c['frame'])).convert('RGBA');x,y,x1,y1=c['photo_window'];ph=ImageOps.fit(Image.open(src(c['image'])).convert('RGBA'),(x1-x,y1-y),method=Image.Resampling.LANCZOS,centering=(.56,.42));im=Image.new('RGBA',f.size);im.alpha_composite(ph,(x,y));im.alpha_composite(f);return im.resize((width,round(width*1.4)),Image.Resampling.LANCZOS)
def nine(path,w,h,sl):
 im=Image.open(src(path)).convert('RGBA');sw,sh=im.size;t,r,b,l=sl;xs=[0,l,sw-r,sw];ys=[0,t,sh-b,sh];xx=[0,l,w-r,w];yy=[0,t,h-b,h];out=Image.new('RGBA',(w,h))
 for i in range(3):
  for j in range(3):out.alpha_composite(im.crop((xs[i],ys[j],xs[i+1],ys[j+1])).resize((xx[i+1]-xx[i],yy[j+1]-yy[j]),Image.Resampling.LANCZOS),(xx[i],yy[j]))
 return out

def draw(im,e):
 k=e['kind'];x=round(e['x']);y=round(e['y']);w=round(e['width']);h=round(e['height'])
 if k=='text':
  d=ImageDraw.Draw(im);f=ImageFont.truetype(str(src(e['font_file'])),e['font_size']);xx=e['x'];y=e['y'];d.text((xx+1,y+1),e['text'],font=f,fill=(0,0,20,160),anchor='lt');d.text((xx,y),e['text'],font=f,fill=e['fill'],anchor='lt');return
 if k=='separator':ImageDraw.Draw(im).line((x,y,x+w-1,y),fill=tuple(e['fill']),width=1);return
 if k=='scrollbar':
  d=ImageDraw.Draw(im);d.rounded_rectangle((x,y,x+w-1,y+h-1),radius=3,fill=e['fill']);d.rounded_rectangle((x,y,x+w-1,y+e['thumb_height']-1),radius=3,fill=e['thumb_fill']);return
 if k=='viewport':
  p=Image.new('RGBA',(w,h))
  for c in e['children']:draw(p,c)
 elif k=='nine_slice':
  p=nine(e['file'],w,h,e['insets'])
  im.alpha_composite(p,(x,y))
  if e.get('bright_top'):ImageDraw.Draw(im).line((x+16,y+2,x+w-16,y+2),fill='#63e8ff',width=2)
  return
 elif k=='card':
  p=card(e['catalog_id'],w);sh=Image.new('RGBA',(w+24,p.height+24));sh.alpha_composite(p,(12,12));alpha=sh.getchannel('A').filter(ImageFilter.GaussianBlur(5)).point(lambda n:int(n*.7));sh=Image.new('RGBA',sh.size);sh.putalpha(alpha);im.alpha_composite(sh,(x-9,y-4))
 elif k=='overlay':p=Image.new('RGBA',(w,h),tuple(e['fill']))
 else:
  p=Image.open(src(e['file'])).convert('RGBA').resize((w,h),Image.Resampling.LANCZOS)
  if 'replace_alpha' in e:p.putalpha(e['replace_alpha'])
 im.alpha_composite(p,(x,y))
def save_png(im,path):
 temp=path.with_suffix('.tmp');im.save(temp,format='PNG');Image.open(temp).load();temp.replace(path)
report={}
for name in ['main','deck','upgrade']:
 s=json.loads((ROOT/f'layouts/inventory/inventory_{name}.json').read_text());im=Image.new('RGBA',tuple(s['reference_size']))
 for e in s['layers']:draw(im,e)
 im=im.convert('RGB');save_png(im,OUT/f'inventory_{name}_reconstructed.png');ref=Image.open(ROOT/f'mockups/inventory/inventory_{name}.png').convert('RGB');d=np.abs(np.array(im).astype(int)-np.array(ref).astype(int));save_png(Image.fromarray(np.minimum(d*4,255).astype('uint8')),OUT/f'inventory_{name}_difference_x4.png');report[name]={'mean_absolute_rgb_error':float(d.mean()),'maximum_channel_error':int(d.max()),'pixels_with_any_channel_error_over16_percent':float((d.max(2)>16).mean()*100),'different_pixels':int((d.max(2)>0).sum())}
(OUT/'comparison.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
