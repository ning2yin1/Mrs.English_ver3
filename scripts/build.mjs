import sharp from 'sharp';
import {prepareBranding} from './prepare-branding.mjs';
import { cp, mkdir, readdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const inventoryDevelopment=process.argv.includes('--inventory-development');
const output=inventoryDevelopment?'dist-development':'dist';
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'src', 'assets', 'layouts', 'data', 'styles']) await cp(file, `${output}/${file}`, { recursive: true });
// Result's delivery kit includes byte-identical copies; runtime reuses the original common assets.
await rm(`${output}/assets/result/reused`, {recursive:true,force:true});
for(const folder of ['backgrounds','panels','tabs'])await rm(`${output}/assets/mission/${folder}`,{recursive:true,force:true});
for(const file of ['mission_coin.png','mission_diamond.png','mission_back.png'])await rm(`${output}/assets/mission/icons/${file}`,{force:true});
await cp('specs/play', `${output}/specs/play`, { recursive: true });
for (const file of ['assets', 'spec']) await cp(`home_approved/${file}`, `${output}/home_approved/${file}`, { recursive: true });
await cp('public', output, { recursive: true });
// Lossless encoding of the existing title artwork; retain the original file in the checkout/output.
await mkdir(`${output}/assets/startup`,{recursive:true});
const titleLogo=await sharp('assets/title/title_logo.png').webp({lossless:true,effort:4}).toBuffer();
if(titleLogo.length<(await readFile('assets/title/title_logo.png')).length){
  await writeFile(`${output}/assets/startup/title-logo.webp`,titleLogo);
  const title=JSON.parse(await readFile(`${output}/layouts/title.json`,'utf8'));title.elements.find(e=>e.id==='title_logo').file='assets/startup/title-logo.webp';await writeFile(`${output}/layouts/title.json`,JSON.stringify(title));
  await writeFile(`${output}/index.html`,(await readFile(`${output}/index.html`,'utf8')).replace('./assets/title/title_logo.png','./assets/startup/title-logo.webp'));
}
// Thumbnail derivatives reduce the 22-tile selector payload; full originals remain untouched.
const backgrounds=JSON.parse(await readFile('layouts/external_backgrounds.json','utf8'));
await mkdir(`${output}/thumbnails`,{recursive:true});
for(const background of backgrounds){
  const file=`thumbnails/${background.id}.jpg`;
  await sharp(`public/backgrounds/${background.source_file}`).resize({width:320,height:224,fit:'inside',withoutEnlargement:true}).jpeg({quality:88,mozjpeg:true}).toFile(`${output}/${file}`);
  background.thumbnail_file=file;
}
await writeFile(`${output}/layouts/external_backgrounds.json`,JSON.stringify(backgrounds));
// The supplied original is required: fail the build rather than silently publishing old branding.
const branding=await prepareBranding('assets/branding/apple-white-source.png',output);
const manifest=JSON.parse(await readFile(`${output}/manifest.webmanifest`,'utf8'));
manifest.icons=branding.icons.filter(icon=>icon.sizes!=='180x180');
await writeFile(`${output}/manifest.webmanifest`,JSON.stringify(manifest,null,2));
let html=await readFile(`${output}/index.html`,'utf8');
html=html.replace(/\/\* LOADING_LOGO \*\/ (?:null|'[^']*'|"[^"]*")/,JSON.stringify('data:image/png;base64,'+branding.logo.toString('base64')))
  .replace(/(<link rel="apple-touch-icon" href=")[^"]*(")/,'$1./'+branding.icons.find(icon=>icon.sizes==='180x180').src+'$2');
await writeFile(`${output}/index.html`,html);
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
