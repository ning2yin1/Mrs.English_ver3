from pathlib import Path
from PIL import Image
import numpy as np,json
root=Path(__file__).resolve().parent.parent;out=root/'qa/play-browser';sections=[];metrics=[]
for p in sorted((root/'previews/play').glob('*.png')):
    actual=out/p.name
    if not actual.exists():continue
    a=np.asarray(Image.open(p).convert('RGB')).astype(int);b=np.asarray(Image.open(actual).convert('RGB')).astype(int);d=np.abs(a-b)
    metrics.append({'screen':p.stem,'mean_absolute_rgb_error_0_255':float(d.mean()),'note':'Dynamic question order/scores/skill values differ; compact layout is checked separately.'})
    Image.fromarray(np.minimum(d*3,255).astype('uint8')).save(out/f'{p.stem}-difference-x3.png')
    sections.append(f'<h2>{p.stem}</h2><section><figure><figcaption>仕様反映プレビュー</figcaption><img src="../../previews/play/{p.name}"></figure><figure><figcaption>実装</figcaption><img src="{p.name}"></figure><figure><figcaption>差分×3</figcaption><img src="{p.stem}-difference-x3.png"></figure></section>')
(out/'comparison.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')
(out/'index.html').write_text('''<!doctype html><html lang="ja"><meta charset="utf-8"><title>READY / Play比較</title><style>body{font:16px system-ui;background:#14111f;color:#eee;margin:24px}img{width:100%}section{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}figcaption{margin-bottom:8px}@media(max-width:800px){section{grid-template-columns:1fr}}</style><h1>READY / Play 9状態の比較</h1><p>1844×853 Chromium。承認原本referencesと新仕様previewsを参照し、画像/9-slice/動的DOMから描画。比較用カード/問題順/写真はdev入口のメモリ限定。問題順・スコア・コンボ・説明文は実データのため見本と異なります。スキルは既存の+8%/+6%を保持。HARDの余分な語は原データを使用。差分の数値は見た目の一致率ではありません。iPhone Safari実機は未検証です。</p>'''+''.join(sections)+'<h2>iPhone横画面相当</h2><p>844×390 / 667×375、セーフエリアと44px操作領域を確認。中央だけスクロール、上下UI固定。</p>'+''.join(f'<figure><figcaption>{p.stem}</figcaption><img src="{p.name}"></figure>' for p in sorted(out.glob('iphone-*.png'))))
print('Compared',len(metrics),'screens; report:',out/'index.html')
