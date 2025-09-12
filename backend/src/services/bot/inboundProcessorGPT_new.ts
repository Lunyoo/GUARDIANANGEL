// 🔥 SISTEMA OTIMIZADO FINAL - Todas as melhorias implementadas + ML INTEGRADO
import { PrismaClient } from '@prisma/client'
import { processConversationMessage } from './conversationGPT_fixed.js'
import { isWhatsAppReady, sendWhatsAppMessage } from './whatsappClient.fixed'
import { transcribeAudio } from './audioProcessor.js'
import { universalBandits, BanditContext } from './universalBandits.js'
import { neuralOrchestrator } from '../ml/neuralOrchestrator.js'
import { budgetAllocator } from '../ml/budgetAllocator.js'
import { autoOptimizer } from '../ml/autoOptimizer.js'

const prisma = new PrismaClient()

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
    
    // Verificar duplicação
    for (const [hash, timestamp] of processedMessages.entries()) {
      if (hash.startsWith(phoneNumber) && (now - timestamp) < DEDUPLICATION_WINDOW) {
        console.log(`🛡️ DUPLICAÇÃO BLOQUEADA: ${phoneNumber} (há ${now - timestamp}ms)`)
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
    const lines = finalResponse.split('\n').filter(line => line.trim())
    
    if (lines.length > 2) {
      // Pega só as 2 primeiras linhas mais importantes
      finalResponse = lines.slice(0, 2).join('\n')
      console.log(`✂️ Mensagem cortada: ${lines.length} → 2 linhas`)
    }
    
    // Limitar por caracteres também (máximo 150 chars)
    if (finalResponse.length > 150) {
      const sentences = finalResponse.split(/[.!?]/)
      finalResponse = sentences[0]
      if (finalResponse.length > 150) {
        finalResponse = finalResponse.substring(0, 147) + '...'
      }
      console.log(`✂️ Mensagem encurtada para ${finalResponse.length} chars`)
    }
    
    // ⏱️ TIMING HUMANO OBRIGATÓRIO
    const typingTime = calculateTypingTime(finalResponse)
    console.log(`⏱️ Simulando digitação: ${typingTime}ms`)
    
    await new Promise(resolve => setTimeout(resolve, typingTime))
    
    // 📤 ENVIAR RESPOSTA
    await sendWhatsAppMessage(cleanPhone, finalResponse)
    console.log(`✅ Resposta enviada para ${cleanPhone}`)
    
    // 📊 COLETA DE DADOS (Executar após envio para não atrasar)
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
