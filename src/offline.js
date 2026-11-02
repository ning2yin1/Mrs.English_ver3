export async function registerOffline(){
  if(!('serviceWorker' in navigator))return;
  try{
    const registration=await navigator.serviceWorker.register('./sw.js');let heartbeat;
    function foreground(){
      const busy=!!window.mrsLoading?.busy;
      for(const worker of new Set([registration.installing,registration.waiting,registration.active]))worker?.postMessage({type:'FOREGROUND_BUSY',busy});
      clearInterval(heartbeat);if(busy)heartbeat=setInterval(foreground,5000);
    }
    window.addEventListener('mrs-loading-change',foreground);registration.addEventListener('updatefound',foreground);navigator.serviceWorker.addEventListener('controllerchange',foreground);foreground();
  }catch{/* Online play still works when offline installation is unavailable. */}
}
