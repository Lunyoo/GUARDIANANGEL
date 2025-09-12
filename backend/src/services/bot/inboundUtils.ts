import { BanditContext } from './universalBandits'

export function extractCityFromText(text: string): string | null {
  if (!text) return null
  const lower = text.toLowerCase()
  
  // Primeiro, checar se é uma palavra isolada que claramente NÃO é cidade
  const nonCityWords = /^(oi|olá|tchau|obrigada?|sim|não|ok|tudo|bem|como|que|vai|quero|gostaria|preciso|tenho|sou|estou|vou|pode|tem|é|fica|para|por|com|sem|muito|pouco|bom|boa|melhor|pior|grande|pequeno|novo|velha?|caro|barato|preto|bege|branco|azul|vermelho|verde|amarelo|rosa|calcinha|lipo|modeladora|tamanho|cor|unidade|peça|produto|comprar|vender|preço|valor|dinheiro|real|reais|m|g|gg|pp|p)$/i
  
  if (nonCityWords.test(text.trim())) {
    return null
  }
  
  const cityPatterns = [
    // Padrões específicos com contexto
    /sou de\s+([a-zA-ZÀ-ÿ\s]{2,40})\b/,
    /moro em\s+([a-zA-ZÀ-ÿ\s]{2,40})\b/,
    /fico em\s+([a-zA-ZÀ-ÿ\s]{2,40})\b/,
    /estou em\s+([a-zA-ZÀ-ÿ\s]{2,40})\b/,
    /vivo em\s+([a-zA-ZÀ-ÿ\s]{2,40})\b/,
    /aqui em\s+([a-zA-ZÀ-ÿ\s]{2,40})\b/,
    // Cidades conhecidas (lista parcial das principais)
    /\b(são paulo|rio de janeiro|belo horizonte|salvador|brasília|fortaleza|manaus|curitiba|recife|porto alegre|goiânia|belém|guarulhos|campinas|são luís|maceió|nova iguaçu|duque de caxias|teresina|natal|campo grande|são bernardo|santo andré|osasco|jaboatão|contagem|ribeirão preto|sorocaba|joinville|londrina)\b/i
  ]
  
  for (const pattern of cityPatterns) {
    const match = lower.match(pattern)
    if (match) {
      const cand = match[1]?.trim() || match[0]?.trim()
      if (!cand) continue
      
      // Filtrar palavras que definitivamente não são cidades
      if (/(quero|tamanho|preto|bege|unid|unidade|cep|rua|avenida|apto|apartamento|calcinha|lipo|modeladora|promo|preço|cor|não|sim|obrigad|tchau|oi|olá|como|vai|está|estou|sou|tem|pode|fica|muito|pouco|bom|boa)/i.test(cand)) {
        continue
      }
      
      // Não aceitar apenas números ou muito curto
      if (/^\d+$/.test(cand) || cand.length < 3) {
        continue
      }
      
      return cand
    }
  }
  
  return null
}

export function determineCustomerProfile(convo: any, text: string): BanditContext['customerProfile'] {
  const lower = (text||'').toLowerCase()
  if (convo?.customer?.totalOrders > 0) return 'returning'
  if (/caro|preço|barato/.test(lower)) return 'price_sensitive'
  if (/quero|interesse|gostei/.test(lower)) return 'interested'
  if ((convo?.messages?.length||0) > 3) return 'engaged'
  if (/não sei|talvez|pensando/.test(lower)) return 'hesitant'
  return 'new'
}

export function determineConversationStage(convo: any, text: string): BanditContext['conversationStage'] {
  const lower = (text||'').toLowerCase()
  const messageCount = convo?.messages?.length || 1
  if (messageCount === 1) return 'opening'
  if (/preço|quanto/.test(lower)) return 'presenting'
  if (/caro|não|mas/.test(lower)) return 'handling_objections'
  if (/quero|pode|confirma/.test(lower)) return 'closing'
  return 'qualifying'
}

export function getTimeOfDay(): BanditContext['timeOfDay'] {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

export function isWeekend(): boolean { const d = new Date().getDay(); return d===0||d===6 }

export function replacePricePlaceholders(text: string, price: number | null | undefined): string {
  try {
    if (!text) return text
    if (price == null || isNaN(Number(price))) return text
    const priceStr = `R$ ${Number(price).toFixed(2).replace('.', ',')}`
    const patterns = [
      /R\$\s*xx[,\.]xx/gi,
      /R\$\s*XX[,\.]XX/g,
      /xx[,\.]xx\s*R\$/gi,
      /\bxx[,\.]xx\b/gi,
      /\bXX[,\.]XX\b/g,
      /\{\s*pre[çc]o\s*\}/gi,
      /<\s*pre[çc]o\s*>/gi,
      /\[\s*pre[çc]o\s*\]/gi,
      /R\$\s*X{1,2}[,\.]X{2}/g
    ]
    let out = text
    for (const re of patterns) out = out.replace(re, priceStr)
    return out
  } catch { return text }
}

export interface CityCoverageMessage { content: string; baseDelay: number; variant: string }
