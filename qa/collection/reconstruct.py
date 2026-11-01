from pathlib import Path
import argparse,json
from PIL import Image,ImageDraw,ImageFont,ImageFilter,ImageOps
import numpy as np
parser=argparse.ArgumentParser(description="Offline Collection image QA; no game or storage operations")
parser.add_argument('--root',required=True,help='Repository root with this kit extracted and original shared assets present')
parser.add_argument('--out',required=True,help='Fresh output directory for regenerated comparison images')
a=parser.parse_args();ROOT=Path(a.root).resolve();OUT=Path(a.out).resolve();OUT.mkdir(parents=True,exist_ok=True)
def resolve(path):return ROOT/path
catalog=json.loads((ROOT/'layouts/collection/catalog.json').read_text())['cards'];byid={c['id']:c for c in catalog}


def nine(path,w,h,slices):
 im=Image.open(resolve(path)).convert('RGBA');sw,sh=im.size;t,r,b,l=slices;xs=[0,l,sw-r,sw];ys=[0,t,sh-b,sh];xx=[0,l,w-r,w];yy=[0,t,h-b,h];out=Image.new('RGBA',(w,h))
 for i in range(3):
  for j in range(3):
   p=im.crop((xs[i],ys[j],xs[i+1],ys[j+1])).resize((xx[i+1]-xx[i],yy[j+1]-yy[j]),Image.Resampling.LANCZOS);out.alpha_composite(p,(xx[i],yy[j]))
 return out

def card_image(id,width):
 c=byid[id];frame=Image.open(resolve(c['frame'])).convert('RGBA');x,y,x1,y1=c['photo_window'];photo=Image.open(resolve(c['image'])).convert('RGBA');photo=ImageOps.fit(photo,(x1-x,y1-y),method=Image.Resampling.LANCZOS,centering=(.56,.42));p=Image.new('RGBA',frame.size);p.alpha_composite(photo,(x,y));p.alpha_composite(frame);return p.resize((width,round(width*1484/1060)),Image.Resampling.LANCZOS)

def render_layer(canvas,e):
 x,y=round(e['x']),round(e['y']);kind=e['kind'];w,h=round(e['width']),round(e['height'])
 if kind=='text':
  f=ImageFont.truetype(str(resolve(e['font_file'])),e['font_size']);d=ImageDraw.Draw(canvas);x=e['x'];tracking=e['tracking']
  for char in e['text'] if tracking else [e['text']]:
   d.text((x+1,y+1),char,font=f,fill=(0,0,20,150),anchor='lt');d.text((x,y),char,font=f,fill=e['color'],anchor='lt');x+=d.textlength(char,font=f)+tracking
  return
 if kind=='member_text':
  f=ImageFont.truetype(str(resolve(e['font_file'])),64);bb=e['render_crop_bbox'];p=Image.new('RGBA',(bb[2]-bb[0],bb[3]-bb[1]));ImageDraw.Draw(p).text((-bb[0],-bb[1]),e['text'],font=f,fill='#f4f2ff');p=p.resize((w,h),Image.Resampling.LANCZOS)
 elif kind=='nine_slice':p=nine(e['file'],w,h,e['insets'])
 elif kind=='card':
  p=card_image(e['card_id'],w)
  if e.get('shadow'):
   shadow=Image.new('RGBA',p.size);shadow.putalpha(p.getchannel('A').filter(ImageFilter.GaussianBlur(6)).point(lambda n:round(n*.7)));canvas.alpha_composite(shadow,(x+3,y+7))
 elif kind=='viewport':
  p=Image.new('RGBA',(w,h))
  for child in e['children']:render_layer(p,child)
 else:
  p=Image.open(resolve(e['file'])).convert('RGBA');p=p.resize((w,h),Image.Resampling.LANCZOS)
  if e.get('rotate'):p=p.rotate(e['rotate'],expand=True)
  if e.get('mirror'):p=ImageOps.mirror(p)
 canvas.alpha_composite(p,(x,y))

results={}
for name in ['collection_owned','collection_detail','collection_empty']:
 scene=json.loads((ROOT/f'layouts/collection/{name}.json').read_text());im=Image.new('RGBA',tuple(scene['reference_size']))
 for e in scene['layers']:render_layer(im,e)
 im=im.convert('RGB');im.save(OUT/f'{name}_reconstructed.png');ref=Image.open(ROOT/f'mockups/collection/{name}.png').convert('RGB')
 d=np.abs(np.array(im).astype(int)-np.array(ref).astype(int));Image.fromarray(np.minimum(d*4,255).astype('uint8')).save(OUT/f'{name}_difference_x4.png')
 results[name]={'mean_absolute_rgb_error':float(d.mean()),'max_error':int(d.max()),'pixels_any_channel_error_over16_percent':float((d.max(2)>16).mean()*100)}
(OUT/'comparison.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
