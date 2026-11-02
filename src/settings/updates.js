export async function checkRelease(current) {
  if (current.id === 'development') throw new Error('開発サーバーでは更新確認できません。公開ビルドを使用してください。');
  if (navigator.onLine === false) throw new Error('オフラインのため更新できません。接続してから再試行してください。');
  // Network-only even while controlled by a worker. Never call registration.update here.
  let response;
  try { response = await fetch(new URL('../../version.json', import.meta.url), {cache:'no-store',signal:AbortSignal.timeout(15000)}); }
  catch { throw new Error('更新情報を取得できませんでした。接続を確認して再試行してください。'); }
  if (!response.ok) throw new Error('更新情報を取得できませんでした。接続を確認して再試行してください。');
  let next;
  try { next = await response.json(); } catch { throw new Error('更新情報が不正です。時間をおいて再試行してください。'); }
  if (!/^[a-f0-9]{16}$/.test(next?.id) || typeof next.version !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(next.updatedAt)) throw new Error('更新情報が不正です。時間をおいて再試行してください。');
  return {release:next,available:next.id !== current.id};
}

function request(worker, message, timeout = 180000) {
  return new Promise((resolve,reject)=>{
    const channel = new MessageChannel();
    const timer = setTimeout(()=>{channel.port1.close();reject(new Error('更新がタイムアウトしました。接続を確認して再試行してください。'));},timeout);
    channel.port1.onmessage = ({data})=>{clearTimeout(timer);channel.port1.close();data?.ok ? resolve(data) : reject(new Error(data?.error || '更新できませんでした。'));};
    worker.postMessage(message,[channel.port2]);
  });
}
async function installed(worker) {
  if (worker.state === 'installed' || worker.state === 'activated') return worker;
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error('更新の準備がタイムアウトしました。'));},30000);
    const changed=()=>{if(worker.state==='installed'||worker.state==='activated'){cleanup();resolve();}else if(worker.state==='redundant'){cleanup();reject(new Error('更新の準備に失敗しました。'));}};
    const cleanup=()=>{clearTimeout(timer);worker.removeEventListener('statechange',changed);};
    worker.addEventListener('statechange',changed);changed();
  });
  return worker;
}
export async function applyRelease(expected) {
  if(navigator.onLine===false)throw new Error('オフラインのため更新できません。接続してから再試行してください。');
  if (!('serviceWorker' in navigator)) throw new Error('このブラウザーはアプリ更新に対応していません。');
  const registration = await navigator.serviceWorker.getRegistration(new URL('../../',import.meta.url));
  if (!registration?.active || !navigator.serviceWorker.controller) throw new Error('アプリの初回準備中です。しばらく待ってから再試行してください。');
  await registration.update();
  let worker = registration.installing || registration.waiting;
  if (!worker) {
    const active = await request(registration.active,{type:'GET_RELEASE'},10000);
    if(active.id !== expected.id) throw new Error('公開版が変更されました。もう一度更新を確認してください。');
    location.reload(); return;
  }
  worker = await installed(worker);
  const version = await request(worker,{type:'GET_RELEASE'},10000);
  if (version.id !== expected.id) throw new Error('公開版が変更されました。もう一度更新を確認してください。');
  if(worker.state==='activated'){location.reload();return;}
  // Prepare completely before activation; a failed download leaves the current release usable.
  await request(worker,{type:'PREPARE_UPDATE',id:expected.id});
  if(worker.state!=='activated') await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error('更新の有効化を確認できませんでした。再読み込みしてください。'));},30000);
    const changed=()=>{if(worker.state==='activated'){cleanup();resolve();}else if(worker.state==='redundant'){cleanup();reject(new Error('更新の有効化に失敗しました。'));}};
    const cleanup=()=>{clearTimeout(timer);worker.removeEventListener('statechange',changed);};
    worker.addEventListener('statechange',changed);changed();
  });
  location.reload();
}
