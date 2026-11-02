export const SETTINGS_KEY = 'mrsEnglishV3.settings.v1';
const defaults = {version:1,bgmEnabled:true,bgmVolume:100,seEnabled:true,seVolume:100,skipEffects:false};
export function createSettingsStore(storage, warn) {
  let value = {...defaults};
  try {
    const saved = JSON.parse(storage.getItem(SETTINGS_KEY) || 'null');
    if (saved?.version === 1) for (const key of Object.keys(defaults)) {
      if (typeof defaults[key] === 'boolean' && typeof saved[key] === 'boolean') value[key] = saved[key];
      if (key.endsWith('Volume') && Number.isFinite(saved[key])) value[key] = Math.round(Math.max(0, Math.min(100, saved[key])));
    }
  } catch { warn(); }
  return {
    read:()=>({...value}),
    set(key, next) {
      if (!(key in defaults) || key === 'version') return;
      value = {...value,[key]:typeof defaults[key] === 'boolean' ? Boolean(next) : Math.round(Math.max(0,Math.min(100,Number(next) || 0)))};
      try { storage.setItem(SETTINGS_KEY,JSON.stringify(value)); } catch { warn(); }
    },
  };
}
