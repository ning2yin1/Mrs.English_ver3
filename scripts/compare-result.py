from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parent.parent;out=root/'qa/result';sections=[];metrics=[]
for name in ['final','countup','impact']:
    reference=root/f'references/result/result_{name}.png';actual=out/f'result-{name}.png'
    if name!='final' and (out/f'result-{name}-qa.png').exists():actual=out/f'result-{name}-qa.png'
    if not actual.exists():continue
    a=np.asarray(Image.open(reference).convert('RGB')).astype(int);b=np.asarray(Image.open(actual).convert('RGB')).astype(int);d=np.abs(a-b)
    metrics.append({'screen':name,'mean_absolute_rgb_error_0_255':float(d.mean()),'note':'Approved 24527/900 QA sample; countup values vary with capture timing.'})
    Image.fromarray(np.minimum(d*3,255).astype('uint8')).save(out/f'{name}-difference-x3.png')
    sections.append(f'<h2>{name}</h2><section><figure><figcaption>承認画像</figcaption><img src="../../references/result/result_{name}.png"></figure><figure><figcaption>独立部品による実装</figcaption><img src="{actual.name}"></figure><figure><figcaption>差分×3</figcaption><img src="{name}-difference-x3.png"></figure></section>')
(out/'comparison.json').write_text(json.dumps(metrics,indent=2)+'\n')
(out/'index.html').write_text('''<!doctype html><html lang="ja"><meta charset="utf-8"><title>Result比較・検証</title><style>body{font:16px system-ui;background:#14111f;color:#eee;margin:24px}img{width:100%}section{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}figcaption{margin:8px 0}@media(max-width:800px){section{grid-template-columns:1fr}}</style><h1>Result 3状態比較</h1><p>1536×710 Chromium。3状態とも隔離したQAの24527/900例で比較。カウント途中の数値は撮影時刻で変わります。実際の既存精算結果による演出も別途テストしています。差分値は一致率ではありません。全画面画像は使用せず、文字/数値/カード/装飾/ボタンを独立描画。iPhone Safari実機は未検証。</p><p><a href="results.json">動作検証結果</a></p>'''+''.join(sections)+'<h2>横画面・5評価</h2>'+''.join(f'<figure><figcaption>{p.stem}</figcaption><img src="{p.name}"></figure>' for p in sorted(out.glob('*.png')) if p.stem.startswith(('iphone-','rank-'))))
print('Compared Result final/countup/impact; report:',out/'index.html')
