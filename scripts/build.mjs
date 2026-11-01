import { cp, mkdir, readdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'src', 'assets', 'layouts']) await cp(file, `dist/${file}`, { recursive: true });
for (const file of ['assets', 'spec']) await cp(`home_approved/${file}`, `dist/home_approved/${file}`, { recursive: true });
await cp('public', 'dist', { recursive: true });
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...await walk(p));
    else out.push('./' + p.slice(5));
  }
  return out;
}
const files = (await walk('dist')).filter(p => p !== './sw.js').sort();
const hash = createHash('sha256');
for (const file of files) { hash.update(file); hash.update(await readFile('dist/' + file.slice(2))); }
const version = hash.digest('hex').slice(0, 16);
const sw = (await readFile('public/sw.js', 'utf8')).replace('mrs-english-v3-phase1-v1', `mrs-english-v3-${version}`);
await writeFile('dist/sw.js', sw);
await writeFile('dist/precache.json', JSON.stringify(['./', ...files]));
console.log('Built dist/ with complete offline asset inventory');
