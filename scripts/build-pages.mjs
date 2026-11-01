import {readFile,rm,cp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(await readFile('config/pages.json','utf8'));
if(typeof config.inventoryDevelopment!=='boolean')throw new Error('Explicit Pages deployment mode required');
const result=spawnSync(process.execPath,['scripts/build.mjs',...(config.inventoryDevelopment?['--inventory-development']:[])],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
if(config.inventoryDevelopment){await rm('dist',{recursive:true,force:true});await cp('dist-development','dist',{recursive:true});}
console.log(`Pages mode: ${config.inventoryDevelopment?'INVENTORY DEVELOPMENT — empty ownership grant and test wallet enabled':'formal — no development grants'}`);
