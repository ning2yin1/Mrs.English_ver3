from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
import json,hashlib,shutil,csv,zipfile
import numpy as np

ROOT=Path('/workspace/scratch/686cc7d2d974');OUT=ROOT/'mrs-english-ver3-ui-kit'
hashes=json.loads((ROOT/'all-ui-work/home_hashes.json').read_text());results=[]
for rel,sha in hashes.items():
 assert hashlib.sha256((OUT/'home_approved'/rel).read_bytes()).hexdigest()==sha,rel
 assert hashlib.sha256((ROOT/'mrs-english-home-ui-v1'/rel).read_bytes()).hexdigest()==sha,rel
 results.append({'file':'home_approved/'+rel,'sha256':sha,'unchanged':True})
(OUT/'qa/home_preservation.json').write_text(json.dumps(results,indent=2))
shutil.copyfile(OUT/'home_approved/qa/home_reference.png',OUT/'mockups/home.png')
shutil.copyfile(ROOT/'inputs/backgrounds/TOP.jpg',OUT/'assets/photos/top_original.jpg')

layouts={s:json.loads((OUT/f'layouts/{s}.json').read_text()) for s in ['title','nickname','member','background']}
report=json.loads((OUT/'qa/new_screens_report.json').read_text())
inventory=json.loads((OUT/'layouts/new_asset_manifest.json').read_text())
alpha_checks=[];image_checks=[];font_checks=[]
for p in sorted(OUT.rglob('*.png')):
 with Image.open(p) as im:
  im.load();image_checks.append({'file':str(p.relative_to(OUT)),'width':im.width,'height':im.height,'decoded':True})
  if p.is_relative_to(OUT/'assets') and im.mode=='RGBA':
   alpha=np.array(im.getchannel('A'));alpha_checks.append({'file':str(p.relative_to(OUT)),'mode':'RGBA','zero_alpha':int((alpha==0).sum()),'partial_alpha':int(((alpha>0)&(alpha<255)).sum()),'edge_alpha_max':int(max(alpha[0].max(),alpha[-1].max(),alpha[:,0].max(),alpha[:,-1].max()))})
for p in sorted((OUT/'assets/fonts').glob('*.ttf')):
 with TTFont(p) as font:font_checks.append({'file':str(p.relative_to(OUT)),'characters':''.join(chr(c) for c in sorted(font.getBestCmap())),'valid':True})

for s,l in layouts.items():
 ref=np.array(Image.open(OUT/f'mockups/{s}.png').convert('RGB')).astype(int)
 rec=np.array(Image.open(OUT/f'qa/{s}/reconstructed.png').convert('RGB')).astype(int);diff=np.abs(ref-rec)
 ui=np.zeros((853,1844),bool)
 for e in l['elements']:
  if e['id']=='photo_background':continue
  x,y,w,h=e['x'],e['y'],e['width'],e['height'];pad=6
  ui[max(0,y-pad):min(853,y+h+pad),max(0,x-pad):min(1844,x+w+pad)]=True
  if e.get('file'):assert (OUT/e['file']).is_file(),e['file']
  if e.get('font_file'):
   fp=OUT/e['font_file'];font=ImageFont.truetype(str(fp),64)
   e['glyph_bbox_at_font_size_64']=list(font.getbbox(e['text'],anchor='ls'))
   e['baseline_note']='Bounds are relative to text baseline at 64px em. Use measured glyph bounds when aligning DOM/SVG text; do not equate line box with visible ink.'
 report[s]['ui_regions_mean_abs_rgb_difference_0_255']=float(diff[ui].mean())
 report[s]['non_ui_pixels_max_error']=int(diff[~ui].max()) if (~ui).any() else 0
 report[s]['photo_changed_outside_ui']=bool(diff[~ui].max()>0) if (~ui).any() else False
 report[s]['source_reference_sha256']=hashlib.sha256((OUT/f'mockups/{s}.png').read_bytes()).hexdigest()
 report[s]['reference_and_reconstruction_ui_regions']=int(ui.sum())
 (OUT/f'layouts/{s}.json').write_text(json.dumps(l,ensure_ascii=False,indent=2))
 # 100% UI-only detail difference is available without an enlarged screenshot.
 Image.fromarray(diff.astype('uint8')).save(OUT/f'qa/{s}/difference.png')

home=json.loads((OUT/'home_approved/qa/quality_report.json').read_text())
summary={'title':report['title'],'nickname':report['nickname'],'member':report['member'],'background':report['background'],'home':{'mean_abs_rgb_difference_0_255':home['mean_absolute_rgb_error'],'ui_regions_mean_abs_rgb_difference_0_255':home['ui_band_mean_absolute_rgb_error'],'pixels_channel_error_over16_percent':home['pixels_any_channel_diff_over_16_pct'],'status':'Previously approved files preserved byte-for-byte; no re-render or font changes.'}}
(OUT/'qa/quality_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
(OUT/'qa/file_validation.json').write_text(json.dumps({'images':image_checks,'alpha':alpha_checks,'fonts':font_checks,'home_files_unchanged':len(results)},ensure_ascii=False,indent=2))

index={s:{'mockup':f'mockups/{s}.png','layout':f'layouts/{s}.json','preview':f'qa/{s}/reconstructed.png'} for s in layouts}
index['home']={'mockup':'mockups/home.png','layout':'home_approved/spec/home_layout.json','asset_path_base':'home_approved/','preview':'home_approved/qa/home_reconstructed.png','instructions':'home_approved/spec/codex_instructions.md'}
(OUT/'layouts/screen_index.json').write_text(json.dumps(index,indent=2))
external=[]
for p in sorted((ROOT/'inputs/backgrounds').glob('bg-*')):
 external.append({'id':p.stem,'source_file':p.name,'included_in_new_assets':False,'display_order':int(p.stem.split('-')[1])})
(OUT/'layouts/external_backgrounds.json').write_text(json.dumps(external,indent=2))

with (OUT/'layouts/asset_inventory.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['file','kind','width','height','transparent_pixels','partial_alpha_pixels'])
 for e in inventory:w.writerow([e.get(k,'') for k in ['file','kind','width','height','transparent_pixels','partial_alpha_pixels']])
 for e in json.loads((OUT/'home_approved/spec/asset_manifest.json').read_text()):w.writerow(['home_approved/'+e['file'],e.get('kind','home-approved'),e['width'],e['height'],e.get('transparent_pixels',''),e.get('partial_alpha_pixels','')])

lines=['# 5-screen layout specification','','Reference canvas: **1844 × 853 px**. X/Y originate at top-left. PNG boxes include transparent padding. All coordinates are measured from the approved mockups.','','日本語の運用説明は `CODEX_IMPLEMENTATION.md` と `README.md` を参照してください。','', '## Screen index','','| Screen | Layout data | Mockup |','|---|---|---|']
for s,v in index.items():lines.append(f'| {s} | {v["layout"]} | {v["mockup"]} |')
for s,l in layouts.items():
 lines+=['',f'## {s}','','| ID | Type | X | Y | W | H | Z | File / text |','|---|---|---:|---:|---:|---:|---:|---|']
 for e in l['elements']:
  value=e.get('file',e.get('text','')).replace('|','vertical caret')
  lines.append('| '+' | '.join(map(str,[e['id'],e['kind'],e['x'],e['y'],e['width'],e['height'],e['z'],value]))+' |')
 lines+=['','### Tap targets','','| ID | X | Y | W | H | Action / route |','|---|---:|---:|---:|---:|---|']
 for t in l['tap_targets']:lines.append('| '+' | '.join(map(str,[t['id'],t['x'],t['y'],t['width'],t['height'],t.get('route',t.get('action','first-run / returning routing'))]))+' |')
lines+=['','## Home preserved specification','','The approved home coordinates, asset names, z order, and tap regions remain in `home_approved/spec/home_layout.json`, `home_approved/spec/home_layout.csv`, and `home_approved/spec/layout_spec.md`. Resolve their asset paths relative to `home_approved/`. None of those files were modified.','','## Resize / safe area','','Subtract env(safe-area-inset-top/right/bottom/left) from the available viewport. Scale the reference canvas uniformly with min(safeWidth/1844,safeHeight/853). Center the result within the safe rectangle. Every image, text position, and hit region uses this same transformation. Do not independently scale X and Y. Do not crop button edges to fill the viewport.','', '## Render order','','Photo plate z=0 → panel/frame z=10 → photo tiles/portraits z=15 → static logo z=20 → independent icons z=30 → DOM text z=40. The preserved home uses its existing z=0/10/20/30 order.']
(OUT/'docs/LAYOUT_SPEC.md').write_text('\n'.join(lines))

lines=['# Quality verification','','実際に納品するPNG・字形フォントを重ねて再構成し、元モックアップと比較しました。ゲームやWebアプリは実装していません。比較はPillowによる画素検証で、iPhone／ブラウザーでの表示テストではありません。','','| 画面 | RGB平均絶対差（全体、0〜255） | UI領域の平均絶対差 | 色差16超の画素（全体） |','|---|---:|---:|---:|']
for s,r in summary.items():lines.append(f"| {s} | {r['mean_abs_rgb_difference_0_255']:.4f} | {r['ui_regions_mean_abs_rgb_difference_0_255']:.4f} | {r['pixels_channel_error_over16_percent']:.3f}% |")
lines+=['','背景領域の大きさで全体差は小さくなります。上記を「再現率99％」などへ読み替えないでください。元画像と再構成画像、および差分画像を直接確認できるようにしています。','','## 保持と検査','',f'- 既存ホームの{len(results)}ファイルはSHA-256が一致。素材・配置・指示書・比較画像を変更していません。',f'- PNG {len(image_checks)}ファイルをデコードし、破損がないことを確認。',f'- 新規RGBA {len(alpha_checks)}素材のアルファを検査。写真素材は意図的に不透明です。',f'- 新規TTF {len(font_checks)}ファイルを読み込み、文字マップを検証。','- 人物・背景をAIで再生成していません。人物の写真は元モックアップから分離し、UI外の写真画素は保持しています。','- 動的な文字はPNGラベルにせず、フォントと表示文字として分離。元のバージョン表記・入力カーソル・選択ラベル・サムネイル番号も分離しています。','','## 完全一致にならない点','','1. 元のレイヤー情報がないため、文字・アイコンの下にあった模様は周囲から補間しています。','2. 透明パネルは色と透明度を解析して分離した素材で、元の制作レイヤーそのものではありません。元の見た目に合うよう写真レイヤーと組み合わせて照合しています。別の写真に載せた際の見え方まで元の未知レイヤーと同一とは保証しません。','3. 固定ラベルの字形を輪郭化したフォントには、元の色の揺らぎ・光・影・アンチエイリアスとの差があります。収録していない文字はフォールバックが必要です。','4. タイトルのロゴと発光は透過抽出しています。ロゴの裏・パネルの裏など元画像で見えない写真は、推定・補間した比較用写真レイヤーです。透過ロゴの輪郭や薄い光には小さな差が残ります。','5. 背景選択の写真小片は完成モックアップの検証用です。提供予定の元写真22枚へ差し替えると小さな写真内容は変わる場合があります。位置・枠・ボタンは維持します。','','## 比較ファイル','','- `mockups/`：決定済みモックアップ5枚。','- `qa/title/`、`qa/nickname/`、`qa/member/`、`qa/background/`：再構成・原寸差分・差を4倍強調した差分。','- `home_approved/qa/`：承認済みホームの比較一式。','- `qa/all_screens_preview.jpg`：5画面の再構成一覧。','- `qa/asset_transparency_sheet.png`：新規装飾素材の透過確認一覧。','- `qa/file_validation.json`：画像・アルファ・字形フォントの検査詳細。','- `qa/home_preservation.json`：既存ホームファイルの保持確認。']
(OUT/'docs/QUALITY_REPORT.md').write_text('\n'.join(lines))

# Display only raster previews, never ship the raster as the operating screen.
gallery=Image.new('RGB',(1860,1440),'#171522');d=ImageDraw.Draw(gallery)
for i,s in enumerate(['title','nickname','member','background','home']):
 x=8+(i%2)*930;y=8+(i//2)*480
 d.text((x+4,y+6),f'{i+1:02d}  {s.upper()} - RECONSTRUCTED',fill='#dce2ff')
 p=Image.open(OUT/index[s]['preview']).convert('RGB');p.thumbnail((922,426));gallery.paste(p,(x,y+30))
gallery.save(OUT/'qa/all_screens_preview.jpg',quality=92,subsampling=0)
entries=[e for e in inventory if e['kind']!='photo']
sheet=Image.new('RGB',(1200,((len(entries)+2)//3)*180),'#242633');sd=ImageDraw.Draw(sheet)
for i,e in enumerate(entries):
 x=(i%3)*400;y=(i//3)*180
 for yy in range(y+22,y+177,10):
  for xx in range(x,x+396,10):sd.rectangle((xx,yy,xx+9,yy+9),fill='#4a4c58' if ((xx//10+yy//10)%2) else '#858791')
 p=Image.open(OUT/e['file']);p.thumbnail((390,150));sheet.paste(p,(x+3,y+25),p);sd.text((x+3,y+4),e['id'],fill='white')
tmp=OUT/'qa/asset_transparency_sheet.part';sheet.save(tmp,format='PNG');Image.open(tmp).load();tmp.replace(OUT/'qa/asset_transparency_sheet.png')
# Inventory every actual image asset, including photograph plates and the original TOP photo.
all_images=[]
for base in [OUT/'assets',OUT/'home_approved/assets']:
 for p in sorted(base.rglob('*')):
  if p.suffix.lower() not in ['.png','.jpg','.jpeg']:continue
  with Image.open(p) as im:
   im.load();all_images.append({'file':str(p.relative_to(OUT)),'width':im.width,'height':im.height,'mode':im.mode,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(OUT/'layouts/all_image_assets.json').write_text(json.dumps(all_images,indent=2))
with (OUT/'layouts/asset_inventory.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['file','width','height','mode','sha256'])
 for e in all_images:w.writerow([e[k] for k in ['file','width','height','mode','sha256']])
with (OUT/'layouts/font_inventory.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['file','characters','valid'])
 for e in font_checks:w.writerow([e['file'],e['characters'],e['valid']])
# Final decode check after all comparison artifacts have been generated.
final_png_checks=[]
for p in sorted(OUT.rglob('*.png')):
 with Image.open(p) as im:im.load();final_png_checks.append({'file':str(p.relative_to(OUT)),'decoded':True,'width':im.width,'height':im.height})
validation=json.loads((OUT/'qa/file_validation.json').read_text());validation['images']=final_png_checks
(OUT/'qa/file_validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2))
qpath=OUT/'docs/QUALITY_REPORT.md';qs=qpath.read_text().replace(f'PNG {len(image_checks)}ファイル',f'PNG {len(final_png_checks)}ファイル')
qs+='\n\n背景選択画面のUI境界付近には、UI領域の矩形の外にも最大13／255の小さな差があります。人物を再生成した差ではなく、透過分離・境界の補間に伴うものです。\n'
qpath.write_text(qs)
(OUT/'tools/finalize.py').write_text(Path(__file__).read_text())
print(json.dumps({'home_preserved_files':len(results),'new_png_assets':len(inventory),'validated_png':len(image_checks),'new_fonts':len(font_checks),'mean_differences':{s:r['mean_abs_rgb_difference_0_255'] for s,r in summary.items()}},ensure_ascii=False,indent=2))
