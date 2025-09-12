export async function embedText(text:string){ return Array.from({length:16},(_,i)=> (text.charCodeAt(i%text.length)||0)/255) }
export function cosineSim(a:number[], b:number[]){
  const dot = a.reduce((s,v,i)=>s+v*(b[i]||0),0)
  const na = Math.sqrt(a.reduce((s,v)=>s+v*v,0))
  const nb = Math.sqrt(b.reduce((s,v)=>s+v*v,0))
  return na&&nb? dot/(na*nb):0
}
