// Read-only bridge: Collection keeps its approved quantity-based design and reads the same levels.
export function readInventoryProgress(storageProvider=()=>localStorage) {
  try{const raw=storageProvider().getItem('mrsEnglishV3.inventory.v1');if(!raw)return {};const data=JSON.parse(raw);return data.version===1&&data.instances&&typeof data.instances==='object'?data.instances:{};}catch{return {};}
}
