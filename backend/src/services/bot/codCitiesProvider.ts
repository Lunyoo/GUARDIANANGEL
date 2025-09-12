import { PrismaClient } from '@prisma/client'
import { LIPO_MODELADORA } from './productScripts.js'
import { universalBandits } from './universalBandits.js'

const prisma = new PrismaClient()

let codCitiesCache: string[] = []
let lastCacheUpdate = 0
const CACHE_TTL = 60_000 // 60s

export async function updateCodCitiesCache(): Promise<void> {
  try {
    // 1) Prefer Universal Bandits context if available
    try {
      const ctx: any = (universalBandits as any).getContext?.()
      if (ctx && Array.isArray(ctx.codCities) && ctx.codCities.length) {
        codCitiesCache = ctx.codCities
        lastCacheUpdate = Date.now()
        console.log(`🏙️ [COD Provider] Cache via UniversalBandits: ${codCitiesCache.length} cidades`)
        return
      }
    } catch {}

    // 2) DB (products table)
    const products: any[] = await (prisma as any).product.findMany()
    const calcinhaProduct = products.find(p => p?.name?.toLowerCase?.().includes('calcinha'))
    if (calcinhaProduct && Array.isArray(calcinhaProduct.codCities) && calcinhaProduct.codCities.length) {
      codCitiesCache = calcinhaProduct.codCities
      lastCacheUpdate = Date.now()
      console.log(`🏙️ [COD Provider] Cache via DB: ${codCitiesCache.length} cidades`)
      return
    }

    // 3) Fallback to script
    codCitiesCache = LIPO_MODELADORA.cities || []
    lastCacheUpdate = Date.now()
    console.log(`🏙️ [COD Provider] Cache via fallback (script): ${codCitiesCache.length} cidades`)
  } catch (err) {
    console.log('⚠️ [COD Provider] Erro ao atualizar cache:', err)
    // Ensure we always have something
    codCitiesCache = LIPO_MODELADORA.cities || []
    lastCacheUpdate = Date.now()
  }
}

export function getCodCities(): string[] {
  // Refresh in background if stale
  if (!lastCacheUpdate || (Date.now() - lastCacheUpdate) > CACHE_TTL) {
    updateCodCitiesCache().catch(() => {})
  }
  return codCitiesCache.length ? codCitiesCache : (LIPO_MODELADORA.cities || [])
}

export async function ensureCodCitiesFresh(): Promise<void> {
  if (!codCitiesCache.length || (Date.now() - lastCacheUpdate) > CACHE_TTL) {
    await updateCodCitiesCache()
  }
}

/**
 * 🚨 Notifica admin quando cliente está fora da área COD
 */
export async function notifyAdminNoCOD(phone: string, cityName: string, userMessage: string): Promise<void> {
  try {
    const ADMIN_PHONE = process.env.ADMIN_PHONE || '554199509644'
    
    // Importar dinamicamente para evitar dependência circular
    const { sendWhatsAppMessage } = await import('./whatsappClient.fixed.js')
    
    const alertMessage = `� CRIAR LINK DE PAGAMENTO

📱 Cliente: ${phone}
🏙️ Cidade: ${cityName}
💬 Mensagem: "${userMessage}"

❌ Cidade sem cobertura COD
💳 Cliente foi informado: "Pagamento antecipado - link em 1 hora"

⚡ AÇÃO NECESSÁRIA:
• Criar link de pagamento
• Enviar para: ${phone}
• Prazo: até 1 hora

🕐 ${new Date().toLocaleString('pt-BR')}`

    await sendWhatsAppMessage(ADMIN_PHONE, alertMessage)
    console.log(`🚨 Admin notificado - Cliente ${phone} aguarda link de pagamento (${cityName})`)
    
  } catch (error) {
    console.error('❌ Erro ao notificar admin sobre área não-COD:', error)
  }
}

/**
 * 🎯 Função principal para processar detecção de cidade e notificações
 */
export async function processCityDetection(
  phone: string, 
  message: string
): Promise<{
  cityDetected: string | null
  isCOD: boolean
  shouldNotifyAdmin: boolean
  deliveryType: 'cod' | 'prepaid'
  confidence: 'high' | 'medium' | 'low'
}> {
  
  const detection = detectCityFromMessage(message)
  
  if (detection.detectedCity && detection.isCOD) {
    // ✅ Cidade com COD detectada
    console.log(`✅ COD disponível para ${phone} em ${detection.detectedCity}`)
    return {
      cityDetected: detection.detectedCity,
      isCOD: true,
      shouldNotifyAdmin: false,
      deliveryType: 'cod',
      confidence: detection.confidence
    }
  }
  
  // 🔍 Se detectou uma cidade mas não é COD - só armazena, não notifica ainda
  if (detection.detectedCity) {
    console.log(`❌ Cidade sem COD detectada para ${phone}: ${detection.detectedCity}`)
    return {
      cityDetected: detection.detectedCity,
      isCOD: false,
      shouldNotifyAdmin: false, // Só notifica quando confirmar compra
      deliveryType: 'prepaid',
      confidence: detection.confidence
    }
  }
  
  // 🤷 Nenhuma cidade detectada
  return {
    cityDetected: null,
    isCOD: false,
    shouldNotifyAdmin: false,
    deliveryType: 'prepaid',
    confidence: 'low'
  }
}

/**
 * 🛒 Notifica admin quando cliente CONFIRMA compra fora da área COD
 */
export async function notifyAdminSaleNoCOD(
  phone: string, 
  cityName: string, 
  saleDetails: {
    product: string
    quantity: number
    price: number
    customerName?: string
    address?: string
    size?: string
  }
): Promise<void> {
  try {
    const ADMIN_PHONE = process.env.ADMIN_PHONE || '554199509644'
    
    // Importar dinamicamente para evitar dependência circular
    const { sendWhatsAppMessage } = await import('./whatsappClient.fixed.js')
    
    const alertMessage = `🔗 CRIAR LINK DE PAGAMENTO URGENTE

📱 Cliente: ${phone}
👤 Nome: ${saleDetails.customerName || 'Não informado'}
🏙️ Cidade: ${cityName} (SEM COD)
📍 Endereço: ${saleDetails.address || 'Não informado'}

🛒 PEDIDO CONFIRMADO:
• ${saleDetails.product}
• Tamanho: ${saleDetails.size || 'Não informado'}
• Quantidade: ${saleDetails.quantity}
• Valor: R$ ${saleDetails.price.toFixed(2)}

💳 Cliente aguarda link de pagamento em 1 hora
⚡ CRIAR E ENVIAR AGORA PARA: ${phone}

🕐 ${new Date().toLocaleString('pt-BR')}`

    await sendWhatsAppMessage(ADMIN_PHONE, alertMessage)
    console.log(`🔗 Admin notificado - Venda confirmada, criar link para ${phone}`)
    
  } catch (error) {
    console.error('❌ Erro ao notificar admin sobre venda sem COD:', error)
  }
}

export function isCODCity(cityName: string): boolean {
  if (!cityName) return false
  
  const COD_CITIES = getCodCities()
  if (!COD_CITIES.length) return false
  
  // Normalizar input do cliente
  const normalizedInput = normalizeCity(cityName)
  
  // ❌ Verificar se contém qualificadores que indicam que NÃO é a cidade principal
  const invalidQualifiers = [
    'interior', 'região', 'area', 'zona rural', 'distrito', 'periferia', 
    'arredores', 'proximidades', 'entorno', 'redondeza', 'circunvizinhança',
    'fora da', 'longe do', 'perto de', 'próximo a', 'nas proximidades',
    'região metropolitana', 'grande', 'baixada'
  ]
  
  const hasInvalidQualifier = invalidQualifiers.some(qualifier => 
    normalizedInput.includes(qualifier.toLowerCase())
  )
  
  if (hasInvalidQualifier) {
    console.log(`🚫 Cidade rejeitada por qualificador inválido: "${cityName}"`)
    return false
  }
  
  // 🎯 Buscar match exato primeiro (mais preciso)
  const exactMatch = findExactCityMatch(normalizedInput, COD_CITIES)
  if (exactMatch) {
    console.log(`✅ Match exato encontrado: "${cityName}" -> "${exactMatch}"`)
    return true
  }
  
  // 🔍 Buscar match parcial apenas se não houver ambiguidade
  const partialMatch = findSafPartialMatch(normalizedInput, COD_CITIES)
  if (partialMatch) {
    console.log(`✅ Match parcial seguro: "${cityName}" -> "${partialMatch}"`)
    return true
  }
  
  console.log(`❌ Cidade não encontrada na lista COD: "${cityName}"`)
  return false
}

/**
 * 🧹 Normaliza nome da cidade para comparação
 */
function normalizeCity(cityName: string): string {
  return cityName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim()
}

/**
 * 🎯 Busca match exato da cidade
 */
function findExactCityMatch(normalizedInput: string, codCities: string[]): string | null {
  // Variações do input para testar
  const inputVariations = [
    normalizedInput,
    normalizedInput.replace(/\s*-\s*[a-z]{2}$/, ''), // Remove estado no final
    normalizedInput.replace(/^(rio de janeiro|rj|sp|sao paulo|bh|belo horizonte)$/i, (match) => {
      // Expansões específicas para abreviações comuns
      const expansions: Record<string, string> = {
        'rj': 'rio de janeiro',
        'sp': 'sao paulo', 
        'bh': 'belo horizonte'
      }
      return expansions[match.toLowerCase()] || match
    })
  ]
  
  for (const variation of inputVariations) {
    if (!variation) continue
    
    const match = codCities.find(city => {
      const normalizedCity = normalizeCity(city)
      const cityOnly = normalizedCity.split(' - ')[0]
      
      // Match exato do nome da cidade
      return cityOnly === variation || normalizedCity === variation
    })
    
    if (match) return match
  }
  
  return null
}

/**
 * 🔍 Busca match parcial apenas quando é seguro (sem ambiguidade)
 */
function findSafPartialMatch(normalizedInput: string, codCities: string[]): string | null {
  // Só faz match parcial se o input tem pelo menos 4 caracteres
  if (normalizedInput.length < 4) return null
  
  const possibleMatches = codCities.filter(city => {
    const normalizedCity = normalizeCity(city)
    const cityOnly = normalizedCity.split(' - ')[0]
    
    // Match parcial: cidade contém o input OU input contém a cidade
    return cityOnly.includes(normalizedInput) || normalizedInput.includes(cityOnly)
  })
  
  // ⚠️ Se há múltiplos matches possíveis, é ambíguo - não retorna nada
  if (possibleMatches.length > 1) {
    console.log(`⚠️ Match ambíguo para "${normalizedInput}": ${possibleMatches.map(c => c.split(' - ')[0]).join(', ')}`)
    return null
  }
  
  // ✅ Se há exatamente 1 match, é seguro retornar
  return possibleMatches.length === 1 ? possibleMatches[0] : null
}

/**
 * 🗺️ Detecta cidade específica e estado da mensagem do cliente
 */
export function detectCityFromMessage(message: string): {
  detectedCity: string | null
  confidence: 'high' | 'medium' | 'low'
  isCOD: boolean
  suggestions?: string[]
} {
  if (!message) return { detectedCity: null, confidence: 'low', isCOD: false }
  
  const normalizedMessage = normalizeCity(message)
  const COD_CITIES = getCodCities()
  
  // 🎯 Padrões para detectar cidade na mensagem
  const cityPatterns = [
    // Padrões diretos
    /(?:sou|moro|fico|estou|to)\s+(?:em|na|no|de|da|do)\s+([^,.!?]+?)(?:\s*-\s*[a-z]{2})?(?:[,.!?]|$)/i,
    /(?:cidade|aqui)\s+(?:e|é|eh)\s+([^,.!?]+?)(?:\s*-\s*[a-z]{2})?(?:[,.!?]|$)/i,
    /(?:^|\s)([a-záêíóõçãôàéúü\s]+?)\s*-?\s*(?:rj|sp|mg|rs|pe|ce|go|ba|pr|sc)(?:\s|$)/i,
    /(?:de|em|na|no)\s+([a-záêíóõçãôàéúü\s]{3,})(?:\s|$)/i
  ]
  
  const detectedCities: Array<{city: string, confidence: 'high' | 'medium' | 'low'}> = []
  
  // Testar cada padrão
  for (const pattern of cityPatterns) {
    const matches = message.match(pattern)
    if (matches && matches[1]) {
      const cityCandidate = matches[1].trim()
      
      // Verificar se é uma cidade válida
      const exactMatch = findExactCityMatch(normalizeCity(cityCandidate), COD_CITIES)
      if (exactMatch) {
        detectedCities.push({ city: exactMatch, confidence: 'high' })
        continue
      }
      
      const partialMatch = findSafPartialMatch(normalizeCity(cityCandidate), COD_CITIES)
      if (partialMatch) {
        detectedCities.push({ city: partialMatch, confidence: 'medium' })
      }
    }
  }
  
  // 🏆 Retornar a melhor detecção
  if (detectedCities.length > 0) {
    // Priorizar por confiança
    const bestMatch = detectedCities.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 }
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
    })[0]
    
    return {
      detectedCity: bestMatch.city,
      confidence: bestMatch.confidence,
      isCOD: true, // Se detectou, já é COD
      suggestions: detectedCities.slice(0, 3).map(d => d.city)
    }
  }
  
  // 🤔 Se não encontrou cidade COD, sugerir que pergunte especificamente
  return {
    detectedCity: null,
    confidence: 'low',
    isCOD: false,
    suggestions: []
  }
}

/**
 * 📋 Retorna lista formatada de cidades COD por estado para o bot usar
 */
export function getFormattedCODCitiesList(): string {
  const codCities = getCodCities()
  
  // Agrupar por estado
  const citiesByState: Record<string, string[]> = {}
  
  codCities.forEach(city => {
    const [cityName, state] = city.split(' - ')
    if (!citiesByState[state]) {
      citiesByState[state] = []
    }
    citiesByState[state].push(cityName)
  })
  
  // Formatar para exibição
  const formatted = Object.entries(citiesByState)
    .map(([state, cities]) => `**${state}:** ${cities.join(', ')}`)
    .join('\n')
  
  return `🏙️ **CIDADES COM PAGAMENTO NA ENTREGA (${codCities.length} cidades):**\n\n${formatted}`
}

/**
 * 🎯 Verifica se uma mensagem contém menção a cidade específica do RJ
 */
export function checkRJCityMention(message: string): {
  isRJMention: boolean
  specificCity: string | null
  needsClarification: boolean
} {
  const normalizedMessage = normalizeCity(message)
  const rjCities = getCodCities().filter(city => city.includes('- RJ'))
  
  // Verifica se mencionou "Rio" ou "RJ" genericamente
  const genericRJMention = /\b(rio|rj|rio de janeiro)\b/i.test(message) && 
    !/\b(rio de janeiro - rj|rio de janeiro cidade)\b/i.test(normalizedMessage)
  
  if (genericRJMention) {
    // Se mencionou Rio genericamente, precisa de clarificação
    return {
      isRJMention: true,
      specificCity: null,
      needsClarification: true
    }
  }
  
  // Verifica se mencionou uma cidade específica do RJ
  const specificMatch = rjCities.find(city => {
    const cityName = city.split(' - ')[0].toLowerCase()
    return normalizedMessage.includes(cityName)
  })
  
  return {
    isRJMention: !!specificMatch,
    specificCity: specificMatch || null,
    needsClarification: false
  }
}

// Initialize on load
updateCodCitiesCache().catch(() => {})
