from pathlib import Path
import json
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parent.parent
out=root/'qa/inventory-browser'
results=[];sections=[]
for mode in ['main','deck','upgrade']:
    name='inventory_'+mode
    a=np.asarray(Image.open(root/f'mockups/inventory/{name}.png').convert('RGB')).astype(int)
    b=np.asarray(Image.open(out/f'{name}.png').convert('RGB')).astype(int)
    d=np.abs(a-b)
    results.append({'screen':name,'mean_absolute_rgb_error_0_255':float(d.mean()),'pixels_any_channel_over_16_percent':float((d.max(2)>16).mean()*100)})
    Image.fromarray(np.minimum(d*4,255).astype('uint8')).save(out/f'{name}-difference-x4.png')
    sections.append(f'<h2>{name}</h2><section><figure><figcaption>承認モックアップ</figcaption><img src="../../mockups/inventory/{name}.png"></figure><figure><figcaption>ブラウザー実装</figcaption><img src="{name}.png"></figure><figure><figcaption>差分×4</figcaption><img src="{name}-difference-x4.png"></figure></section>')
(out/'comparison.json').write_text(json.dumps(results,indent=2)+'\n')
(out/'index.html').write_text('''<!doctype html><html lang="ja"><meta charset="utf-8"><title>Inventory画面比較</title><style>body{font:16px system-ui;background:#14111f;color:#eee;margin:24px}img{width:100%}section{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}figcaption{margin-bottom:8px}@media(max-width:800px){section{grid-template-columns:1fr}}</style><h1>Inventory 3画面の比較</h1><p>1844×853 / Chromium。納品PNG・原写真・原枠・独立文字から描画。比較用ブラウザーの見本残高のみ9,979、実際の開発配布は空データに10枚＋テスト10,000コインです。スクロールバーは実データに連動します。iPhone実機は未検証です。</p>'''+''.join(sections)+'<h2>iPhone相当</h2>'+''.join(f'<figure><figcaption>{name}</figcaption><img src="{name}.png"></figure>' for name in ['iphone-main','iphone-deck','iphone-upgrade']))
print(json.dumps(results,indent=2))
