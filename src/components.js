const SVG = 'http://www.w3.org/2000/svg';
const fontCache = new Map();
export const boxStyle = e => ({ left: `${e.x}px`, top: `${e.y}px`, width: `${e.width}px`, height: `${e.height}px`, zIndex: String(e.z ?? 100) });
export function position(node, e) { Object.assign(node.style, boxStyle(e)); return node; }
export function picture(e, base = '') {
  const node = document.createElement('img');
  node.className = 'layer'; node.alt = ''; node.draggable = false; node.src = base + e.file;
  node.dataset.layer = e.id;
  return position(node, e);
}
export async function fontFor(file) {
  if (!fontCache.has(file)) {
    const family = `mrs${fontCache.size}`;
    const ready = new FontFace(family, `url("${file}")`).load().then(font => { document.fonts.add(font); return family; });
    fontCache.set(file, ready);
  }
  return fontCache.get(file);
}
export async function label(e, base = '', homeBounds) {
  const family = await fontFor(base + e.font_file);
  const svg = document.createElementNS(SVG, 'svg');
  svg.classList.add('layer'); svg.dataset.layer = e.id;
  const b = homeBounds || e.glyph_bbox_at_font_size_64;
  svg.setAttribute('viewBox', `${b[0]} ${b[1]} ${b[2] - b[0]} ${b[3] - b[1]}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.overflow = 'visible';
  const text = document.createElementNS(SVG, 'text');
  text.setAttribute('x', '0'); text.setAttribute('y', '0');
  text.style.fontFamily = family; text.style.fontSize = `${e.font_size}px`;
  text.setAttribute('fill', e.color); text.textContent = e.text;
  svg.append(text);
  if (e.id === 'ready_label') svg.style.filter = 'drop-shadow(2px 1px 0 #ec168f)';
  return position(svg, e);
}
export function hit(e, name, action, selected) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'hit'; button.dataset.action = e.id;
  button.setAttribute('aria-label', name);
  if (selected !== undefined) button.setAttribute('aria-pressed', String(selected));
  button.addEventListener('click', action);
  return position(button, e);
}
export function nineSlice(e, file, insets) {
  const node = document.createElement('div'); node.className = 'layer slice-frame'; node.dataset.layer = e.id;
  const [t, r, b, l] = insets;
  Object.assign(node.style, { borderWidth: `${t}px ${r}px ${b}px ${l}px`, borderImageSource: `url("${file}")`, borderImageSlice: `${t} ${r} ${b} ${l} fill` });
  return position(node, e);
}
