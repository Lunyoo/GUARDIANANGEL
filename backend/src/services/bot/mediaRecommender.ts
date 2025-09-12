interface MediaItem { id:string; url:string; type:'image'|'video'; fileName?:string; aiAnalysis?:{ summary?:string }; category?:string }
const mediaCatalog: Record<string, MediaItem[]> = {}

export function registerMedia(slug:string, items: MediaItem[]){
  mediaCatalog[slug] = (mediaCatalog[slug]||[]).concat(items)
}

export function recommendProductMedia(slug: string, text: string, options: { limit: number; minScore: number }) {
  const items = mediaCatalog[slug] || []
  if (!items.length) return []
  const lower = text.toLowerCase()
  const scored = items.map(it => {
    let score = 0
    if (it.type === 'video') score += 2
    if (/antes|depois|resultado|modela/.test(lower)) score += 1.5
    if (/tamanho|como fica|ajusta/.test(lower)) score += 1
    return { item: it, score }
  }).filter(s=>s.score >= options.minScore/10)
  scored.sort((a,b)=>b.score-a.score)
  return scored.slice(0, options.limit).map(s=>({ ...s.item, category: s.item.type==='video'?'videos':'images' }))
}

export function shouldAutoSend(text: string): boolean {
  const lowerText = text.toLowerCase()
  return /(foto|imagem|video|ver|mostra|mostrar)/.test(lowerText)
}