from pathlib import Path
import json
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parent.parent
out=root/'qa/shop-browser'
results=[];sections=[]
for reference in sorted((root/'mockups/shop').glob('*.png')):
    name=reference.stem
    a=np.asarray(Image.open(reference).convert('RGB')).astype(int)
    b=np.asarray(Image.open(out/reference.name).convert('RGB')).astype(int)
    d=np.abs(a-b)
    results.append({'screen':name,'mean_absolute_rgb_error_0_255':float(d.mean()),'pixels_any_channel_over_16_percent':float((d.max(2)>16).mean()*100)})
    Image.fromarray(np.minimum(d*4,255).astype('uint8')).save(out/f'{name}-difference-x4.png')
    sections.append(f'<h2>{name}</h2><section><figure><figcaption>承認モックアップ</figcaption><img src="../../mockups/shop/{name}.png"></figure><figure><figcaption>実装</figcaption><img src="{name}.png"></figure><figure><figcaption>差分×4</figcaption><img src="{name}-difference-x4.png"></figure></section>')
(out/'comparison.json').write_text(json.dumps(results,indent=2)+'\n')
(out/'index.html').write_text('''<!doctype html><html lang="ja"><meta charset="utf-8"><title>Shop画面比較</title><style>body{font:16px system-ui;background:#14111f;color:#eee;margin:24px}img{width:100%}section{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}figcaption{margin-bottom:8px}@media(max-width:800px){section{grid-template-columns:1fr}}</style><h1>Shop 6画面比較</h1><p>1844×853 / Chromium、モーション低減。可変文字は独立描画、人物・枠・パック・UIは納品素材。QA専用メモリ上で見本残高とカード順を揃えています。本番にQA入口・固定抽選・見本残高は入りません。文字のラスタライズ、画像縮小、画像合成の丸めによる微差があります。iPhone実機は未検証です。</p>'''+''.join(sections)+'<h2>iPhone横画面相当（844×390）</h2><p>左右47px・下21pxのセーフエリアを模擬した実購入テスト。背景は画面全体、UIは等比縮小。</p>'+''.join(f'<figure><figcaption>{p.stem}</figcaption><img src="{p.name}"></figure>' for p in sorted(out.glob('iphone-*.png'))))
print(json.dumps(results,indent=2))
