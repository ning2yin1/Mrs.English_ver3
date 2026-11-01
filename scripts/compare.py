"""Compare real browser captures with approved mockups (requires Pillow)."""
import json
from pathlib import Path
from shutil import copy2
from html import escape
from PIL import Image, ImageChops, ImageDraw, ImageStat

root = Path(__file__).resolve().parent.parent
out = root / 'qa/browser'
out.mkdir(exist_ok=True)
results = []
sections = []
for screen in ['title', 'nickname', 'member', 'background', 'home']:
    reference = Image.open(root / f'mockups/{screen}.png').convert('RGB')
    actual = Image.open(root / f'test-results/{screen}.png').convert('RGB')
    if actual.size != reference.size:
        raise ValueError(f'{screen}: capture must use reference viewport')
    difference = ImageChops.difference(reference, actual)
    home = screen == 'home'
    base = root / 'home_approved' if home else root
    layout = json.loads((root / ('home_approved/spec/home_layout.json' if home else f'layouts/{screen}.json')).read_text())
    mask = Image.new('L', reference.size)
    draw = ImageDraw.Draw(mask)
    # Isolate opaque UI artwork and text. Photograph differences are reported separately.
    for e in layout['elements']:
        if e['kind'] == 'text':
            draw.rectangle((e['x'], e['y'], e['x']+e['width']-1, e['y']+e['height']-1), fill=255)
        elif e['kind'] in ['panel','icon','logo','image'] and e['id'] != 'background':
            im = Image.open(base / e['file']).convert('RGBA')
            alpha = im.getchannel('A').point(lambda x: 255 if x >= 240 else 0)
            layer = Image.new('L', reference.size)
            layer.paste(alpha, (e['x'], e['y']))
            mask = ImageChops.lighter(mask, layer)
            draw = ImageDraw.Draw(mask)
    worst = ImageChops.lighter(ImageChops.lighter(*difference.split()[:2]), difference.split()[2])
    metrics = {
        'screen': screen,
        'mean_absolute_rgb_error_0_255': sum(ImageStat.Stat(difference).mean)/3,
        'opaque_ui_and_text_mean_absolute_rgb_error_0_255': sum(ImageStat.Stat(difference, mask).mean)/3,
        'pixels_any_channel_over_16_percent': ImageStat.Stat(worst.point(lambda x:255 if x>16 else 0)).mean[0]/255*100,
        'note': 'Original supplied backgrounds replace reference photo crops; full-frame difference is not a UI fidelity score.' if screen in ['background','home'] else 'Native input caret omitted when unfocused.' if screen == 'nickname' else '',
    }
    results.append(metrics)
    copy2(root / f'test-results/{screen}.png', out / f'{screen}.png')
    difference.point(lambda x: min(255, x*4)).save(out / f'{screen}-difference-x4.png')
    sections.append(f'<section><h2>{screen}</h2><div class="images"><figure><figcaption>完成モックアップ</figcaption><img src="../../mockups/{screen}.png"></figure><figure><figcaption>ブラウザー実装</figcaption><img src="{screen}.png"></figure><figure><figcaption>差分 ×4</figcaption><img src="{screen}-difference-x4.png"></figure></div><p>全体RGB平均絶対差: {metrics["mean_absolute_rgb_error_0_255"]:.4f} / 255、UI・文字領域: {metrics["opaque_ui_and_text_mean_absolute_rgb_error_0_255"]:.4f} / 255</p><p>{escape(metrics["note"])}</p></section>')
for name in ['member-hiroto','member-ryoka','background-22','iphone-landscape','keyboard-available-area']:
    copy2(root / f'test-results/{name}.png', out / f'{name}.png')
copy2(root / 'test-results/results.json', out / 'functional-results.json')
(out / 'comparison.json').write_text(json.dumps(results, indent=2, ensure_ascii=False)+'\n')
(out / 'index.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><title>Mrs. English — ブラウザー比較</title><style>body{font:16px system-ui;background:#14111f;color:#eee;margin:24px}img{width:100%}.images{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}h2{margin-top:40px}@media(max-width:800px){.images{grid-template-columns:1fr}}</style><h1>5画面のブラウザー比較</h1><p>1844×853 / Chromium。参照PNGを実際のUIとして使用していません。背景選択とホームは提供された元写真を使用しているため写真領域が異なります。差分を再現率へ読み替えないでください。iPhone実機は未検証です。</p>'+''.join(sections))
print(json.dumps(results, indent=2, ensure_ascii=False))
