import sharp from 'sharp';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Exact source pixels only: no drawing, tracing, generative model or logo reconstruction.
export async function prepareBranding(source,output){
  const original=await readFile(source),info=await sharp(original).metadata();
  let logo=sharp(original);
  if(!info.hasAlpha||(await sharp(original).stats()).isOpaque){
    const {data,info:raw}=await logo.ensureAlpha().raw().toBuffer({resolveWithObject:true});
    // Remove an opaque black matte without adding black/white edge halos. Preserve every mark.
    for(let i=0;i<data.length;i+=4){const alpha=Math.max(data[i],data[i+1],data[i+2]);for(let c=0;c<3;c++)data[i+c]=alpha?Math.round(data[i+c]*255/alpha):255;data[i+3]=alpha;}
    logo=sharp(data,{raw:{width:raw.width,height:raw.height,channels:4}});
  }
  const transparent=await logo.trim({background:'#00000000',threshold:0}).png().toBuffer();
  const dir=output+'/icons';await mkdir(dir,{recursive:true});
  const compact=await sharp(transparent).resize({width:160,height:160,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9,palette:true}).toBuffer();
  await writeFile(dir+'/apple-white.png',compact);
  const id=createHash('sha256').update(original).digest('hex').slice(0,12),icons=[];
  for(const size of [180,192,512]){
    const inset=Math.round(size*.17),image=await sharp(transparent).resize(size-inset*2,size-inset*2,{fit:'contain',background:'#00000000'}).png().toBuffer(),name=`apple-green-${id}-${size}.png`;
    await sharp({create:{width:size,height:size,channels:4,background:'#168447'}}).composite([{input:image,left:inset,top:inset}]).removeAlpha().png({compressionLevel:9}).toFile(dir+'/'+name);icons.push({src:'icons/'+name,sizes:`${size}x${size}`,type:'image/png',purpose:'any'});
  }
  return {logo:compact,icons,sourceHash:createHash('sha256').update(original).digest('hex')};
}
