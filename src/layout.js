// All screens share a full-viewport photographic layer and an independent safe UI canvas.
export const REFERENCE = { width:1844, height:853 };
export function isSceneBackground(e) {
  return e.file && e.z === 0 && e.x === 0 && e.y === 0
    && e.width === REFERENCE.width && e.height === REFERENCE.height;
}
export function sceneBackground(layout, base = '', override) {
  const background = layout?.elements.find(isSceneBackground);
  return background ? override || base + background.file : null;
}
export function createLayout(safe, stage) {
  function resize() {
    // A screen may keep device-sized controls; all existing screens use the reference path below.
    if (stage.resizeDeviceLayout?.()) return;
    const rect = safe.getBoundingClientRect();
    const viewport = window.visualViewport;
    // Intersect the safe rectangle with what is visible above the software keyboard.
    const left = Math.max(rect.left, viewport?.offsetLeft || 0);
    const top = Math.max(rect.top, viewport?.offsetTop || 0);
    const right = Math.min(rect.right, (viewport?.offsetLeft || 0) + (viewport?.width || innerWidth));
    const bottom = Math.min(rect.bottom, (viewport?.offsetTop || 0) + (viewport?.height || innerHeight));
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    const scale = Math.min(width / REFERENCE.width, height / REFERENCE.height);
    const home = stage.dataset.screen === 'home';
    const canvasWidth = home && scale ? width/scale : REFERENCE.width;
    const canvasHeight = home && scale ? height/scale : REFERENCE.height;
    // Reclaim a little of the footer inset, retaining 14 CSS px for the home indicator.
    const bottomInset = Math.max(0, (viewport?.offsetTop || 0) + (viewport?.height || innerHeight) - bottom);
    const footerOffset = home ? Math.min(8, Math.max(0, bottomInset - 14)) : 0;
    safe.classList.toggle('home-layout', home);
    Object.assign(stage.style, {
      width:`${canvasWidth}px`, height:`${canvasHeight}px`,
      transform:`scale(${scale})`,
      left:`${left - rect.left + (width - canvasWidth * scale) / 2}px`,
      top:`${top - rect.top + (height - canvasHeight * scale) / 2}px`,
    });
    stage.querySelector('.home-hud')?.resizeHud(canvasWidth,canvasHeight,scale ? footerOffset/scale : 0);
  }
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('scroll', resize);
  document.addEventListener('focusin', resize);
  document.addEventListener('focusout', () => requestAnimationFrame(resize));
  new ResizeObserver(resize).observe(safe);
  resize();
  return { resize };
}
export async function prepareBackground(file) {
  if (!file) return null;
  const existing=document.querySelector('#scene-background');
  if(existing?.src===new URL(file,location.href).href&&existing.complete&&existing.naturalWidth)return existing;
  const image = new Image();
  image.id = 'scene-background'; image.alt = ''; image.setAttribute('aria-hidden', 'true');
  image.draggable = false;image.fetchPriority='high'; image.src = file;
  const loading=window.mrsLoading,id=loading?.begin();let deadline;
  try{await Promise.race([image.decode(),new Promise((_,reject)=>deadline=setTimeout(()=>reject(new Error('背景画像を読み込めませんでした。接続を確認してください。')),30000))]);return image;}finally{clearTimeout(deadline);if(loading)loading.end(id);}
}
