export function validateDataset(data){
  if(data?.schema_version!==1||!Array.isArray(data.categories))throw new Error('問題データの形式を確認してください。');
  const categories=new Set(),ids=new Set();
  for(const c of data.categories){if(typeof c.id!=='string'||categories.has(c.id)||!c.title||!Array.isArray(c.questions))throw new Error('文法カテゴリが不正です。');categories.add(c.id);
    for(const q of c.questions){if(!q.id||ids.has(q.id)||!q.english||!q.japanese||!q.explanation||q.easy?.options?.length!==4||new Set(q.easy.options).size!==4||!q.easy.options.includes(q.easy.answer))throw new Error(`問題を確認してください: ${q.id}`);ids.add(q.id);
      for(const mode of ['normal','hard']){const x=q[mode];if(!Array.isArray(x?.tiles)||!Array.isArray(x.answer_order)||x.answer_order.length!==x.tiles.length||new Set(x.answer_order).size!==x.tiles.length||x.answer_order.some(n=>!Number.isInteger(n)||n<0||n>=x.tiles.length)||(mode==='hard'&&x.distractors?.length!==2))throw new Error(`タイル設定が不正です: ${q.id}`);}
    }
  }return data;
}
export function shuffle(items,integer){const a=[...items];for(let i=a.length-1;i>0;i--){const j=integer(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function prepareQuestion(q,difficulty,integer){
  if(difficulty==='EASY')return {questionId:q.id,options:shuffle(q.easy.options,integer),selected:null,selectedIds:[],elapsedActiveMs:0};
  const source=q[difficulty.toLowerCase()],tiles=[...source.tiles,...(difficulty==='HARD'?source.distractors:[])].map((text,i)=>({id:`${q.id}:${i}`,text}));
  return {questionId:q.id,tiles:shuffle(tiles,integer),selectedIds:[],selected:null,elapsedActiveMs:0};
}
export function isCorrect(q,difficulty,input){
  if(difficulty==='EASY')return input.selected===q.easy.answer;
  const source=q[difficulty.toLowerCase()],expected=source.answer_order.map(i=>source.tiles[i]),selected=input.selectedIds;
  if(new Set(selected).size!==selected.length)return false;
  return expected.length===selected.length&&selected.every((id,i)=>input.tiles.find(t=>t.id===id)?.text===expected[i]);
}
