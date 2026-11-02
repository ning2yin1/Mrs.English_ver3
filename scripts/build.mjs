import { cp, mkdir, readdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const inventoryDevelopment=process.argv.includes('--inventory-development');
const output=inventoryDevelopment?'dist-development':'dist';
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'src', 'assets', 'layouts', 'data', 'styles']) await cp(file, `${output}/${file}`, { recursive: true });
// Result's delivery kit includes byte-identical copies; runtime reuses the original common assets.
await rm(`${output}/assets/result/reused`, {recursive:true,force:true});
await cp('specs/play', `${output}/specs/play`, { recursive: true });
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
// Include worker logic and metadata in the immutable build identity. Avoid hashing generated files recursively.
const files = (await walk(output)).filter(p => !['./sw.js','./src/release.js'].includes(p)).sort();
const sourceWorker = await readFile('public/sw.js','utf8');
const packageInfo = JSON.parse(await readFile('package.json','utf8'));
const updatedAt = new Date(process.env.SOURCE_DATE_EPOCH ? Number(process.env.SOURCE_DATE_EPOCH)*1000 : Date.now()).toISOString().slice(0,10);
const hash = createHash('sha256');
hash.update(sourceWorker); hash.update(packageInfo.version); hash.update(updatedAt);
for (const file of files) { hash.update(file); hash.update(await readFile(output+'/' + file.slice(2))); }
const version = hash.digest('hex').slice(0, 16);
const release = {id:version,version:packageInfo.version,updatedAt};
await writeFile(`${output}/src/release.js`, `export const RELEASE = Object.freeze(${JSON.stringify(release)});\n`);
await writeFile(`${output}/version.json`, JSON.stringify(release)+'\n');
const sw = sourceWorker.replace('mrs-english-v3-phase1-v1', `mrs-english-v3-${version}`);
await writeFile(`${output}/sw.js`, sw);
const inventory = (await walk(output)).filter(p=>p!=='./sw.js').sort();
await writeFile(`${output}/precache.json`, JSON.stringify(['./', ...inventory]));
console.log(`Built ${output}/ release ${version}; development grant ${inventoryDevelopment?'ENABLED':'disabled'}`);
