from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
import matplotlib
matplotlib.use('Agg')
from matplotlib import pyplot as plt
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

root=Path('/workspace/scratch/686cc7d2d974')
rgb=np.asarray(Image.open(root/'upload/Mrs. English Ver.3のホーム画面(2).png').convert('RGB'))[754:823,1539:1664]
coverage=1-rgb.max(2)/255
cols=(coverage>.5).sum(0)>0
labels,num=ndimage.label(cols)
groups=[]
for i in range(1,num+1):
 xs=np.where(labels==i)[0]
 if len(xs)>2:groups.append((int(xs.min()),int(xs.max()+1)))
assert len(groups)==5,groups
fb=FontBuilder(1024,isTTF=True)
glyph_order=['.notdef','space']+list('Ready')
fb.setupGlyphOrder(glyph_order)
fb.setupCharacterMap({ord(c):c for c in 'Ready'}|{32:'space'})
glyphs={};metrics={}
for c in ['.notdef','space']:
 pen=TTGlyphPen(None);glyphs[c]=pen.glyph();metrics[c]=(256,0)
for i,(c,(x0,x1)) in enumerate(zip('Ready',groups)):
 z=np.pad(coverage[:,x0:x1],2)
 fig,ax=plt.subplots();cs=ax.contour(z,levels=[.5]);segments=cs.allsegs[0];plt.close(fig)
 pen=TTGlyphPen(None)
 for seg in segments:
  if len(seg)<4:continue
  pts=[(round((float(x)-2)*16),round((54-(float(y)-2))*16)) for x,y in seg]
  pen.moveTo(pts[0])
  for p in pts[1:]:pen.lineTo(p)
  pen.closePath()
 glyphs[c]=pen.glyph()
 advance=(groups[i+1][0]-x0) if i<4 else x1-x0
 metrics[c]=(advance*16,0)
fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=960,descent=-192)
fb.setupNameTable({'familyName':'MrsEnglishReadyTrace','styleName':'Regular','uniqueFontIdentifier':'MrsEnglishReadyTrace-1','fullName':'MrsEnglishReadyTrace Regular','psName':'MrsEnglishReadyTrace-Regular'})
fb.setupOS2(sTypoAscender=960,sTypoDescender=-192,usWinAscent=960,usWinDescent=192)
fb.setupPost();fb.setupMaxp();fb.save(root/'home-ui-work/MrsEnglishReadyTrace.ttf')
print(groups)
