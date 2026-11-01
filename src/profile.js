export const PROFILE_KEY = 'mrsEnglishV3.profile';
export const MEMBERS = ['motoki', 'hiroto', 'ryoka'];
export const BACKGROUNDS = Array.from({ length: 22 }, (_, i) => `bg-${String(i + 1).padStart(2, '0')}`);
export const normalizeName = value => Array.from(String(value).trim()).slice(0, 12).join('');
export function validProfile(p) {
  return p && p.version === 3 && p.setupComplete === true && typeof p.nickname === 'string'
    && p.nickname === normalizeName(p.nickname) && p.nickname.length > 0
    && MEMBERS.includes(p.memberId) && BACKGROUNDS.includes(p.backgroundId);
}
export function loadProfile(onError) {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    return validProfile(profile) ? profile : null;
  } catch (error) {
    // Malformed JSON is an invalid profile; blocked storage needs a visible warning.
    if (!(error instanceof SyntaxError)) onError();
    return null;
  }
}
export function saveProfile(profile, onError) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { onError(); }
}
