const CACHE = 'mrs-english-v3-phase1-v1';
const RELEASE_ID = CACHE.slice('mrs-english-v3-'.length);
const versionURL = new URL('./version.json', self.registration.scope).href;
let preparing;
async function fillCache() {
  const getVersion=async()=>{const r=await fetch(versionURL,{cache:'no-store'});if(!r.ok||(await r.json()).id!==RELEASE_ID)throw new Error('公開版が変更されました。もう一度更新を確認してください。');};
  await getVersion();
  const response=await fetch('./precache.json',{cache:'no-store'});
  if(!response.ok)throw new Error('更新ファイル一覧を取得できませんでした。');
  const paths=await response.json();
  if(!Array.isArray(paths)||!paths.includes('./src/release.js'))throw new Error('更新ファイル一覧が不正です。');
  const cache=await caches.open(CACHE);
  let next=0;
  async function fill(){
    while(next<paths.length){
      const url=new URL(paths[next++],self.registration.scope);
      if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))throw new Error('更新ファイルの場所が不正です。');
      const request=new Request(url,{cache:'no-store',priority:'low'}),result=await fetch(request);
      if(!result.ok)throw new Error('更新ファイルを取得できませんでした。接続を確認して再試行してください。');
      await cache.put(request,result);
    }
  }
  // Always settle both download queues before reporting failure or retrying.
  const results=await Promise.allSettled([fill(),fill()]);
  const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
  await getVersion();
}
function supportsManualUpdates(worker) {
  return new Promise(resolve=>{
    const channel=new MessageChannel();
    const finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value);};
    const timer=setTimeout(()=>finish(false),1500);
    channel.port1.onmessage=({data})=>finish(data?.ok===true&&typeof data.id==='string');
    worker.postMessage({type:'GET_RELEASE'},[channel.port2]);
  });
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    // Browsers may check sw.js automatically. Protocol-aware upgrades fetch no assets.
    const active=self.registration.active;
    if(active&&await supportsManualUpdates(active))return;
    // One-time migration: the legacy worker/app has no update UI or message protocol.
    // Bootstrap that UI using its original complete offline installation behavior.
    await fillCache();await self.skipWaiting();
  })());
});
self.addEventListener('message',event=>{
  const reply=value=>event.ports[0]?.postMessage(value);
  if(event.data?.type==='GET_RELEASE'){reply({ok:true,id:RELEASE_ID});return;}
  if(event.data?.type!=='PREPARE_UPDATE')return;
  if(event.data.id!==RELEASE_ID){reply({ok:false,error:'公開版が変更されました。もう一度更新を確認してください。'});return;}
  preparing ||= fillCache().then(()=>self.skipWaiting()).finally(()=>{preparing=null;});
  event.waitUntil(preparing.then(()=>reply({ok:true,id:RELEASE_ID}),error=>reply({ok:false,error:error.message})));
});
self.addEventListener('activate',event=>{
  // Retain previous release caches for already-open clients; never touch application storage.
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  // Release checks must reflect the server, never an offline/stale copy.
  if(url.href.split('?')[0]===versionURL||event.request.cache==='no-store'){
    event.respondWith(fetch(event.request));return;
  }
  event.respondWith((async()=>{
    const cached=await(await caches.open(CACHE)).match(event.request);
    return cached||fetch(event.request);
  })());
});
