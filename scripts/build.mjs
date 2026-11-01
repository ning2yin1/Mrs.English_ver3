import { cp, mkdir, readdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const inventoryDevelopment=process.argv.includes('--inventory-development');
const output=inventoryDevelopment?'dist-development':'dist';
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'src', 'assets', 'layouts', 'data']) await cp(file, `${output}/${file}`, { recursive: true });
for (const file of ['assets', 'spec']) await cp(`home_approved/${file}`, `${output}/home_approved/${file}`, { recursive: true });
await cp('public', output, { recursive: true });
if(inventoryDevelopment)await writeFile(`${output}/src/inventory/runtime-config.js`,'export const development = Object.freeze({enabled:true, testCoins:10000});\n');
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...await walk(p));
    else out.push('./' + p.slice(output.length+1));
  }
  return out;
}
const files = (await walk(output)).filter(p => p !== './sw.js').sort();
const hash = createHash('sha256');
for (const file of files) { hash.update(file); hash.update(await readFile(output+'/' + file.slice(2))); }
const version = hash.digest('hex').slice(0, 16);
const sw = (await readFile('public/sw.js', 'utf8')).replace('mrs-english-v3-phase1-v1', `mrs-english-v3-${version}`);
await writeFile(`${output}/sw.js`, sw);
await writeFile(`${output}/precache.json`, JSON.stringify(['./', ...files]));
console.log(`Built ${output}/ with complete offline asset inventory; development grant ${inventoryDevelopment?'ENABLED':'disabled'}`);
