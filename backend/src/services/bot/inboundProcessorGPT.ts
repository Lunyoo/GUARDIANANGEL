// 🔥 SISTEMA OTIMIZADO FINAL - Todas as melhorias implementadas + ML INTEGRADO
import { PrismaClient } from '@prisma/client'
import { processConversationMessage } from './conversationGPT_fixed.js'
import { isWhatsAppReady, sendWhatsAppMessage } from './whatsappClient.fixed.js'
import { transcribeAudio } from './audioProcessor.js'
import { universalBandits, BanditContext } from './universalBandits.js'
import { neuralOrchestrator } from '../ml/neuralOrchestrator.js'
import { budgetAllocator } from '../ml/budgetAllocator.js'
import { autoOptimizer } from '../ml/autoOptimizer.js'

const prisma = new PrismaClient()

// 💾 CACHE DE PREÇOS POR CONVERSA (evita contradições de preço)
const conversationPrices = new Map<string, {
  quantity: number
  price: number
  originalPrice: number
  timestamp: number
}>()

// Limpar cache antigo (mais de 2 horas)
setInterval(() => {
  const now = Date.now()
  for (const [phone, data] of conversationPrices.entries()) {
    if (now - data.timestamp > 2 * 60 * 60 * 1000) { // 2 horas
      conversationPrices.delete(phone)
      console.log(`🗑️ Cache de preço removido para ${phone} (expirado)`)
    }
  }
}, 30 * 60 * 1000) // Verificar a cada 30 minutos

/**
 * 💰 Extrair e cachear preços das respostas do bot
 */
function extractAndCachePriceFromResponse(response: string, phone: string) {
  // Buscar padrões como "2 unidades por R$ 119,90" ou "duas por R$ 147,00"
  const pricePatterns = [
    /(?:(\d+)|duas|dois|três|quatro|seis)\s*(?:unidade|calcinha|peça)s?\s*(?:por|custa|fica|sai)\s*R\$\s*(\d{1,3}(?:,\d{2})?)/gi,
    /R\$\s*(\d{1,3}(?:,\d{2})?)\s*(?:por|para)\s*(?:(\d+)|duas|dois|três|quatro|seis)/gi
  ]
  
  for (const pattern of pricePatterns) {
    const match = pattern.exec(response)
    if (match) {
      const quantityStr = match[1] || match[2]
      const priceStr = match[2] || match[1]
      
      // Converter quantidade textual para número
      let quantity = parseInt(quantityStr) || 0
      if (!quantity) {
        const textToNumber: Record<string, number> = {
          'duas': 2, 'dois': 2, 'três': 3, 'quatro': 4, 'seis': 6
        }
        quantity = textToNumber[quantityStr?.toLowerCase()] || 0
      }
      
      if (quantity > 0 && priceStr) {
        const price = parseFloat(priceStr.replace(',', '.'))
        if (price > 0) {
          // Cachear este preço para a conversa
          conversationPrices.set(phone, {
            quantity,
            price,
            originalPrice: price, // Assumir que é o preço original por enquanto
            timestamp: Date.now()
          })
          
          console.log(`💾 PREÇO EXTRAÍDO E CACHEADO: ${quantity}x = R$ ${price.toFixed(2).replace('.', ',')} para ${phone}`)
          return { quantity, price }
        }
      }
    }
  }
  
  return null
}

import fs from 'fs'
import path from 'path'

// 🚨 Verificar modo de manutenção antes de enviar mensagens
function isMaintenanceMode(): boolean {
  try {
    const maintenanceFile = path.join(__dirname, '../../../MAINTENANCE_MODE')
    if (fs.existsSync(maintenanceFile)) {
      const content = fs.readFileSync(maintenanceFile, 'utf8')
      return content.includes('MAINTENANCE_ACTIVE=true')
    }
    return false
  } catch (error) {
    console.error('Erro ao verificar modo de manutenção:', error)
    return false
  }
}

/**
 * 🚨 VALIDAÇÃO CRÍTICA DE PREÇOS - Remove preços inventados pelo GPT
 */
function validateResponsePricing(botResponse: string, authorizedPrice: string = '', phone: string = ''): string {
  try {
    console.log(`🔍 VALIDANDO PREÇOS NA RESPOSTA: "${botResponse}"`)
    console.log(`🔍 PREÇO AUTORIZADO: ${authorizedPrice}`)
    
    // 🚨 TABELA OFICIAL DE PREÇOS (ÚNICA FONTE VERDADEIRA)
    const OFFICIAL_PRICES = [
      'R$ 89,90', 'R$ 97,00',           // 1 unidade
      'R$ 119,90', 'R$ 129,90', 'R$ 139,90', 'R$ 147,00',  // 2 unidades
      'R$ 159,90', 'R$ 169,90', 'R$ 179,90', 'R$ 187,00',  // 3 unidades
      'R$ 239,90',                      // 4 unidades
      'R$ 359,90'                       // 6 unidades
    ]
    
    // 💰 VERIFICAR PREÇO CACHED PARA ESTA CONVERSA
    const cachedPrice = conversationPrices.get(phone)
    let conversationAuthorizedPrices: string[] = []
    
    if (cachedPrice) {
      const formattedPrice = `R$ ${cachedPrice.price.toFixed(2).replace('.', ',')}`
      conversationAuthorizedPrices = [formattedPrice]
      console.log(`💾 PREÇO CACHED AUTORIZADO PARA CONVERSA: ${formattedPrice}`)
    } else {
      conversationAuthorizedPrices = OFFICIAL_PRICES
    }
    
    // Detectar todos os preços na mensagem
    const priceRegex = /R\$\s*\d{1,3}(?:,\d{2})?/gi
    const foundPrices = botResponse.match(priceRegex) || []
    
    console.log(`🔍 PREÇOS ENCONTRADOS: ${foundPrices.join(', ')}`)
    
    let validatedResponse = botResponse
    let hasInvalidPrice = false
    
    // Verificar cada preço encontrado
    for (const price of foundPrices) {
      const normalizedPrice = price.replace(/\s+/g, ' ')
      
      // Se tem preço cached, só aceitar esse preço
      const allowedPrices = cachedPrice ? conversationAuthorizedPrices : OFFICIAL_PRICES
      
      if (!allowedPrices.includes(normalizedPrice)) {
        console.error(`❌ PREÇO INVÁLIDO DETECTADO: ${normalizedPrice}`)
        console.error(`📋 PREÇOS PERMITIDOS: ${allowedPrices.join(', ')}`)
        hasInvalidPrice = true
        
        // Substituir preço inválido pelo autorizado ou cached
        const safePrice = cachedPrice ? 
          `R$ ${cachedPrice.price.toFixed(2).replace('.', ',')}` : 
          (authorizedPrice || 'consultar valores atualizados')
        validatedResponse = validatedResponse.replace(price, safePrice)
        console.log(`🔄 SUBSTITUÍDO: ${price} → ${safePrice}`)
      } else {
        console.log(`✅ PREÇO VÁLIDO: ${normalizedPrice}`)
      }
    }
    
    // 🚨 DETECTAR COMBINAÇÕES PROIBIDAS ESPECÍFICAS
    const forbiddenCombinations = [
      /(?:três|3)\s*(?:por|unidade|calcinha|unidades).*?R\$\s*89,90/i,  // 3 por R$ 89,90
      /(?:duas|2)\s*(?:por|unidade|calcinha|unidades).*?R\$\s*89,90/i,  // 2 por R$ 89,90
      /(?:três|3)\s*(?:por|unidade|calcinha|unidades).*?R\$\s*97,00/i,  // 3 por R$ 97,00
      /(?:duas|2)\s*(?:por|unidade|calcinha|unidades).*?R\$\s*97,00/i,  // 2 por R$ 97,00
      /(?:cinco|5)\s*(?:por|unidade|calcinha|unidades)/i,               // 5 unidades (não existe)
      /(?:sete|7)\s*(?:por|unidade|calcinha|unidades)/i,                // 7 unidades (não existe)
    ]
    
    for (const forbidden of forbiddenCombinations) {
      if (forbidden.test(validatedResponse)) {
        console.error(`❌ COMBINAÇÃO PROIBIDA DETECTADA: ${forbidden}`)
        hasInvalidPrice = true
        
        // Substituir por mensagem segura
        validatedResponse = 'Vou consultar os valores atualizados para você! Qual quantidade você tem interesse? Temos opções de 1, 2 ou 3 unidades.'
        console.log(`🔄 RESPOSTA SUBSTITUÍDA POR SEGURANÇA`)
        break
      }
    }
    
    if (hasInvalidPrice) {
      console.error(`🚨 PREÇOS INVÁLIDOS CORRIGIDOS NA RESPOSTA!`)
      console.error(`📋 RESPOSTA ORIGINAL: "${botResponse}"`)
      console.error(`📋 RESPOSTA CORRIGIDA: "${validatedResponse}"`)
    }
    
    return validatedResponse
    
  } catch (error) {
    console.error(`❌ Erro na validação de preços:`, error)
    return botResponse // Retorna original se der erro
  }
}

// 🛡️ SISTEMA ANTI-DUPLICAÇÃO ROBUSTO
const processedMessages = new Map<string, number>()
const DEDUPLICATION_WINDOW = 15000 // 15 segundos

// 🧠 FUNÇÕES AUXILIARES PARA ML
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'  
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

function isWeekend(): boolean {
  const day = new Date().getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

function determineConversationStage(message: string): 'opening' | 'qualifying' | 'presenting' | 'handling_objections' | 'closing' {
  const lowerMsg = message.toLowerCase()
  
  if (lowerMsg.includes('oi') || lowerMsg.includes('olá') || lowerMsg.includes('bom dia') || 
      lowerMsg.includes('boa tarde') || lowerMsg.includes('boa noite')) {
    return 'opening'
  }
  
  if (lowerMsg.includes('quero') || lowerMsg.includes('comprar') || lowerMsg.includes('pedido') ||
      lowerMsg.includes('confirmar') || lowerMsg.includes('fechar')) {
    return 'closing'
  }
  
  if (lowerMsg.includes('preço') || lowerMsg.includes('valor') || lowerMsg.includes('caro') ||
      lowerMsg.includes('barato') || lowerMsg.includes('desconto')) {
    return 'handling_objections'
  }
  
  if (lowerMsg.includes('tamanho') || lowerMsg.includes('cor') || lowerMsg.includes('material') ||
      lowerMsg.includes('entrega') || lowerMsg.includes('como')) {
    return 'qualifying'
  }
  
  return 'presenting'
}

// ⏱️ SISTEMA DE TIMING HUMANO
function calculateTypingTime(message: string): number {
  const baseTime = 2000 // 2 segundos mínimo
  const wordsPerMinute = 40 // Velocidade de digitação humana
  const words = message.split(' ').length
  const calculatedTime = (words / wordsPerMinute) * 60 * 1000
  
  // Entre 2-8 segundos baseado no tamanho
  const finalTime = Math.max(baseTime, Math.min(calculatedTime, 8000))
  
  return finalTime + Math.random() * 1000 // Adiciona variação
}

// 📋 COLETA DE DADOS DO CLIENTE
interface CustomerData {
  name?: string
  fullName?: string
  address?: string
  neighborhood?: string
  zipCode?: string
  selectedSize?: string
  selectedColor?: string
  phone: string
}

function extractCustomerData(phoneNumber: string, conversationHistory: any[]): CustomerData {
  const data: CustomerData = { phone: phoneNumber }
  
  // Analisar histórico para extrair dados
  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      const text = msg.content.toLowerCase()
      
      // Extrair nome
      const nameMatch = text.match(/(?:meu nome é|me chamo|sou (?:a |o )?|nome:?\s*)([a-záêçõã\s]+)/i)
      if (nameMatch && !data.name) {
        data.name = nameMatch[1].trim()
        data.fullName = data.name
      }
      
      // Extrair endereço
      const addressMatch = text.match(/(?:endereço|moro|resido|rua|av|avenida)[:\s]*([^.!?]+)/i)
      if (addressMatch && !data.address) {
        data.address = addressMatch[1].trim()
      }
      
      // Extrair tamanho
      const sizeMatch = text.match(/(?:tamanho|tam|uso)[:\s]*(p|m|g|pp|gg|pequeno|médio|grande|38|40|42|44|46)/i)
      if (sizeMatch && !data.selectedSize) {
        const size = sizeMatch[1].toLowerCase()
        data.selectedSize = size.includes('p') ? 'P' : 
                           size.includes('m') ? 'M' : 
                           size.includes('g') ? 'G' : size.toUpperCase()
      }
      
      // Extrair cor
      const colorMatch = text.match(/(?:cor|quero)[:\s]*(bege|preta?|branca?)/i)
      if (colorMatch && !data.selectedColor) {
        const color = colorMatch[1].toLowerCase()
        data.selectedColor = color.includes('bege') ? 'BEGE' : 'PRETA'
      }
    }
  }
  
  return data
}

async function ensureLeadExists(customerData: CustomerData) {
  try {
    let lead = await prisma.lead.findUnique({
      where: { phone: customerData.phone }
    })
    
    if (!lead) {
      console.log('👤 Criando novo lead:', customerData.phone)
      lead = await prisma.lead.create({
        data: {
          phone: customerData.phone,
          name: customerData.name,
          fullName: customerData.fullName, // Usando camelCase do schema
          address: customerData.address,
          neighborhood: customerData.neighborhood,
          zipCode: customerData.zipCode, // Usando camelCase do schema
          selectedSize: customerData.selectedSize, // Usando camelCase do schema
          selectedColor: customerData.selectedColor, // Usando camelCase do schema
          status: 'NEW',
          firstContact: new Date(), // Usando camelCase do schema
          lastContact: new Date() // Usando camelCase do schema
        }
      })
    } else if (customerData.name || customerData.address || customerData.selectedSize || customerData.selectedColor) {
      console.log('📝 Atualizando dados do lead:', customerData.phone)
      lead = await prisma.lead.update({
        where: { phone: customerData.phone },
        data: {
          name: customerData.name || lead.name,
          fullName: customerData.fullName || lead.fullName, // Usando camelCase do schema
          address: customerData.address || lead.address,
          neighborhood: customerData.neighborhood || lead.neighborhood,
          zipCode: customerData.zipCode || lead.zipCode, // Usando camelCase do schema
          selectedSize: customerData.selectedSize || lead.selectedSize, // Usando camelCase do schema
          selectedColor: customerData.selectedColor || lead.selectedColor, // Usando camelCase do schema
          lastContact: new Date() // Usando camelCase do schema
        }
      })
    }
    
    return lead
  } catch (error) {
    console.error('❌ Erro no banco de dados:', error)
    return null
  }
}

// 🔊 ADMIN NOTIFICATIONS
async function notifyAdminOnComplete(customerData: CustomerData) {
  const adminPhone = '554199509644'
  
  try {
    const isComplete = customerData.name && 
                      customerData.address && 
                      customerData.selectedSize && 
                      customerData.selectedColor
    
    if (isComplete) {
      const notification = `🎉 *LEAD COMPLETO!*\n\n` +
        `👤 *Cliente:* ${customerData.name}\n` +
        `📱 *Phone:* ${customerData.phone}\n` +
        `📍 *Endereço:* ${customerData.address}\n` +
        `👕 *Tamanho:* ${customerData.selectedSize}\n` +
        `🎨 *Cor:* ${customerData.selectedColor}\n\n` +
        `✅ *PRONTO PARA VENDA!*\n` +
        `⏰ ${new Date().toLocaleString('pt-BR')}`
      
      await sendWhatsAppMessage(adminPhone, notification)
      console.log('📱 Admin notificado sobre lead completo:', customerData.phone)
    }
  } catch (error) {
    console.error('❌ Erro notificando admin:', error)
  }
}

/**
 * 🎯 PROCESSADOR PRINCIPAL OTIMIZADO
 */
export async function processInbound(
  phoneNumber: string, 
  message: string, 
  mediaUrl?: string, 
  mediaType?: string
) {
  try {
    console.log(`\n🎯🎯🎯 INBOUND PROCESSOR GPT CHAMADO! 🎯🎯🎯`)
    console.log(`📞 Phone: ${phoneNumber}`)
    console.log(`💬 Message: "${message}"`)
    console.log(`📎 MediaUrl: ${mediaUrl || 'none'}`)
    console.log(`🎵 MediaType: ${mediaType || 'none'}`)
    console.log(`\n🔥 PROCESSANDO: ${phoneNumber} - "${message.substring(0, 50)}...`)
    
    // 🛡️ ANTI-DUPLICAÇÃO ABSOLUTA
    const messageHash = `${phoneNumber}-${message}-${Date.now()}`
    const now = Date.now()
    
    // Limpar mensagens antigas do cache
    for (const [hash, timestamp] of processedMessages.entries()) {
      if (now - timestamp > DEDUPLICATION_WINDOW) {
        processedMessages.delete(hash)
      }
    }
    
    // Verificar duplicação - apenas mensagens IDÊNTICAS
    const exactHash = `${phoneNumber}-${message}`
    for (const [hash, timestamp] of processedMessages.entries()) {
      if (hash.startsWith(exactHash) && (now - timestamp) < DEDUPLICATION_WINDOW) {
        console.log(`🛡️ DUPLICAÇÃO BLOQUEADA: ${phoneNumber} mensagem idêntica (há ${now - timestamp}ms)`)
        return { success: false, error: 'duplicate_message' }
      }
    }
    
    processedMessages.set(messageHash, now)
    
    // 📱 VALIDAR WHATSAPP
    if (!isWhatsAppReady()) {
      console.error('❌ WhatsApp não conectado')
      return { success: false, error: 'whatsapp_not_ready' }
    }
    
    // 🔊 PROCESSAR ÁUDIO se houver
    let processedText = message
    let transcriptionResult = null
    
    if (mediaType === 'audio' && mediaUrl) {
      console.log('🔊 Processando áudio...')
      try {
        transcriptionResult = await transcribeAudio(mediaUrl)
        if (transcriptionResult) {
          processedText = transcriptionResult
          console.log(`🔊 Áudio transcrito: "${processedText}"`)
        }
      } catch (audioError) {
        console.error('❌ Erro na transcrição:', audioError)
        processedText = '(Áudio recebido - transcrição indisponível)'
      }
    }
    
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    
    // 🧠 PROCESSAMENTO COM ML INTEGRADO
    const validMediaType = mediaType === 'image' || mediaType === 'audio' ? mediaType : undefined
    const botResponse = await processConversationMessage(cleanPhone, processedText, mediaUrl, validMediaType)
    
    // 🚨 DEBUG: Verificar botResponse
    console.log(`🔍 DEBUG botResponse recebido: "${botResponse}"`)
    console.log(`🔍 DEBUG botResponse length: ${botResponse?.length || 0}`)
    console.log(`🔍 DEBUG botResponse type: ${typeof botResponse}`)
    
    // 🚫 Se não há resposta (mensagem vazia ignorada), não fazer nada
    if (!botResponse || botResponse === null) {
      console.log('🤐 Nenhuma resposta gerada - mensagem ignorada')
      return { success: true, response: '', typingDelay: 0, transcription: null }
    }
    
    // 🧠 INTEGRAR COM SISTEMAS ML
    try {
      // 1. Processar lead no Neural Orchestrator
      const existingLead = await prisma.lead.findUnique({ where: { phone: cleanPhone } })
      if (existingLead) {
        await neuralOrchestrator.processLead(existingLead.id, 'whatsapp', {
          messageText: processedText,
          mediaType,
          timestamp: new Date()
        })
      }

      // 2. Criar contexto para Universal Bandits
      const banditContext: BanditContext = {
        customerProfile: existingLead ? 'returning' : 'new',
        city: existingLead?.city || 'unknown',
        hasCodeDelivery: true,
        timeOfDay: getTimeOfDay(),
        dayOfWeek: isWeekend() ? 'weekend' : 'weekday',
        conversationStage: determineConversationStage(processedText),
        messageCount: 1
      }

      // 3. Registrar impressão e interação no Universal Bandits
      const currentStrategy = universalBandits.getBestApproach(banditContext)
      universalBandits.recordResult(currentStrategy.id, { 
        impression: true,
        interaction: processedText.length > 5
      })

      // 4. Atualizar métricas se lead qualificado
      if (processedText.toLowerCase().includes('quero') || 
          processedText.toLowerCase().includes('interesse') ||
          processedText.toLowerCase().includes('comprar')) {
        budgetAllocator.recordCampaignResult('whatsapp_bot', 0.50, 1, 0)
      }

      console.log('🧠 ML Integration completed for', cleanPhone)
    } catch (mlError) {
      console.error('❌ Erro na integração ML:', mlError)
    }
    
    // 🔄 LIMITAR MENSAGEM (MÁXIMO 2 LINHAS)
    let finalResponse = botResponse
    console.log(`🔍 DEBUG finalResponse inicial: "${finalResponse}"`)
    console.log(`🔍 DEBUG finalResponse inicial length: ${finalResponse?.length || 0}`)
    
    const lines = finalResponse.split('\n').filter(line => line.trim())
    
    // ✅ REMOVER LIMITAÇÃO - Permitir respostas completas
    // Não cortaremos mais as mensagens para manter naturalidade
    
    // ⏱️ TIMING HUMANO OBRIGATÓRIO
    const typingTime = calculateTypingTime(finalResponse)
    console.log(`⏱️ Simulando digitação: ${typingTime}ms`)

    await new Promise(resolve => setTimeout(resolve, typingTime))

    // 🚨 VALIDAÇÃO CRÍTICA DE PREÇOS ANTES DO ENVIO
    console.log(`🔍 DEBUG ANTES DA VALIDAÇÃO - finalResponse: "${finalResponse}"`)
    const validatedResponse = validateResponsePricing(finalResponse, '', cleanPhone)
    console.log(`🔍 DEBUG APÓS VALIDAÇÃO - validatedResponse: "${validatedResponse}"`)

    // � EXTRAIR E CACHEAR PREÇOS DA RESPOSTA PARA MANTER CONSISTÊNCIA
    extractAndCachePriceFromResponse(validatedResponse, cleanPhone)

    // �📤 ENVIAR RESPOSTA VALIDADA
    console.log(`🔍 DEBUG ANTES DO ENVIO - finalResponse: "${validatedResponse}"`)
    console.log(`🔍 DEBUG ANTES DO ENVIO - length: ${validatedResponse?.length || 0}`)
    console.log(`🔍 DEBUG ANTES DO ENVIO - type: ${typeof validatedResponse}`)

    // 🚨 VERIFICAR MODO DE MANUTENÇÃO
    if (isMaintenanceMode()) {
      console.log('🚨 MODO DE MANUTENÇÃO ATIVO - Mensagem NÃO será enviada')
      console.log('📝 Mensagem que seria enviada:', validatedResponse)
      console.log('✅ Processamento concluído (sem envio)')
      return
    }

    await sendWhatsAppMessage(cleanPhone, validatedResponse)
    console.log(`✅ Resposta enviada para ${cleanPhone}`)    // 📊 COLETA DE DADOS (Executar após envio para não atrasar)
    setTimeout(async () => {
      try {
        // Obter histórico da conversa (seria necessário implementar)
        const conversationHistory: any[] = [] // TODO: Implementar busca do histórico
        
        const customerData = extractCustomerData(cleanPhone, conversationHistory)
        const lead = await ensureLeadExists(customerData)
        
        if (lead) {
          await notifyAdminOnComplete(customerData)
        }
      } catch (error) {
        console.error('❌ Erro na coleta de dados:', error)
      }
    }, 1000)
    
    return { 
      success: true, 
      response: finalResponse,
      typingDelay: typingTime,
      transcription: transcriptionResult || null
    }
    
  } catch (error) {
    console.error('❌ ERRO PROCESSAMENTO GERAL:', error)
    return { success: false, error: (error as any)?.message || String(error) }
  }
}

/**
 * 📊 MÉTRICAS DO SISTEMA
 */
export function getProcessorMetrics() {
  return {
    processedCount: processedMessages.size,
    lastProcessedAt: Math.max(...Array.from(processedMessages.values())),
    deduplicationWindow: DEDUPLICATION_WINDOW,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  }
}

/**
 * 🧹 LIMPEZA MANUAL DO CACHE
 */
export function clearCache() {
  processedMessages.clear()
  console.log('🧹 Cache de deduplicação limpo')
}
