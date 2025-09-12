import OpenAI from 'openai'
import { getDatabase } from '../../config/database.js'
import { dynamicPromptGenerator, getProductInfo, getCampaignInfo } from './dynamicPromptGenerator.js'
import { sendWhatsAppMessage } from './whatsappClient.fixed.js'
import { broadcast } from './sse.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const ADMIN_PHONE = process.env.ADMIN_PHONE || '554199509644'

interface AnalysisResult {
  approved: boolean
  confidence: number
  reason: string
  suggestedResponse?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface ConversationContext {
  phone: string
  lastMessages: Array<{role: 'user' | 'assistant', content: string, timestamp?: string}>
  userIntent: string
  conversationStage: string
  productContext: string
}

/**
 * 🛡️ BOT VIGIA - Sistema de validação e correção automática de respostas
 */
class BotVigia {
  private static instance: BotVigia
  
  private constructor() {}
  
  static getInstance(): BotVigia {
    if (!BotVigia.instance) {
      BotVigia.instance = new BotVigia()
    }
    return BotVigia.instance
  }

  async validateResponse(
    phone: string, 
    userMessage: string,
    botResponse: string,
    conversationHistory?: Array<{role: 'user' | 'assistant', content: string, timestamp?: string}>
  ): Promise<AnalysisResult> {
    try {
      // Validação básica
      if (!botResponse || botResponse.trim().length === 0) {
        return {
          approved: false,
          confidence: 0,
          reason: 'Resposta vazia detectada',
          suggestedResponse: 'Oi! Tive um probleminha técnico, mas posso te ajudar! Como posso te auxiliar? 😊',
          severity: 'critical'
        }
      }

      // Contexto da conversa
      const context = await this.buildConversationContext(phone, userMessage, botResponse, conversationHistory)
      
      // Validações específicas
      const validations = [
        this.validateProductInfo(botResponse),
        this.validatePricing(botResponse),
        this.validateCityInfo(userMessage, botResponse),
        this.validateResponseRelevance(userMessage, botResponse)
      ]

      const results = await Promise.all(validations)
      const failed = results.filter(r => !r.approved)

      if (failed.length > 0) {
        return failed.reduce((prev, curr) => 
          prev.severity === 'critical' ? prev : curr
        )
      }

      return {
        approved: true,
        confidence: 95,
        reason: 'Resposta aprovada',
        severity: 'low'
      }

    } catch (error) {
      console.error('❌ VIGIA: Erro na validação:', error)
      return {
        approved: false,
        confidence: 0,
        reason: 'Erro interno na validação',
        suggestedResponse: 'Oi! Tive um probleminha técnico, mas posso te ajudar! Como posso te auxiliar? 😊',
        severity: 'critical'
      }
    }
  }

  private async buildConversationContext(
    phone: string,
    userMessage: string,
    botResponse: string,
    conversationHistory?: Array<{role: 'user' | 'assistant', content: string, timestamp?: string}>
  ): Promise<ConversationContext> {
    try {
      const productContext = await this.getProductContext()
      
      return {
        phone,
        lastMessages: conversationHistory || [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: botResponse }
        ],
        userIntent: this.detectUserIntent(userMessage),
        conversationStage: this.detectConversationStage(conversationHistory || []),
        productContext
      }
    } catch (error) {
      console.error('❌ VIGIA: Erro ao construir contexto:', error)
      return {
        phone,
        lastMessages: [{ role: 'user', content: userMessage }, { role: 'assistant', content: botResponse }],
        userIntent: 'unknown',
        conversationStage: 'initial',
        productContext: 'Calcinha Modeladora ShapeFit'
      }
    }
  }

  private detectUserIntent(userMessage: string): string {
    const message = userMessage.toLowerCase()
    
    if (message.includes('preço') || message.includes('valor') || message.includes('custa')) {
      return 'pricing_inquiry'
    }
    if (message.includes('entrega') || message.includes('frete') || message.includes('cidade')) {
      return 'delivery_inquiry'
    }
    if (message.includes('quero') || message.includes('comprar') || message.includes('pedido')) {
      return 'purchase_intent'
    }
    if (message.includes('oi') || message.includes('olá') || message.includes('bom dia')) {
      return 'greeting'
    }
    
    return 'general_inquiry'
  }

  private detectConversationStage(history: Array<{role: string, content: string}>): string {
    if (history.length <= 2) return 'initial'
    if (history.length <= 5) return 'engagement'
    if (history.length <= 10) return 'negotiation'
    return 'closing'
  }

  private async getProductContext(): Promise<string> {
    try {
      const productInfo = await getProductInfo('default')
      if (productInfo && productInfo.name) {
        return `${productInfo.name} - ${productInfo.description || 'produto de modelagem corporal'}`
      }
      return 'Calcinha Modeladora ShapeFit - produto de modelagem corporal'
    } catch (error) {
      console.error('❌ VIGIA: Erro ao buscar contexto do produto:', error)
      return 'Produto não identificado'
    }
  }

  private async validateProductInfo(botResponse: string): Promise<AnalysisResult> {
    const validProductNames = [
      'calcinha modeladora',
      'shapefit',
      'shape fit',
      'modeladora',
      'calcinha'
    ]

    const response = botResponse.toLowerCase()
    const hasValidProduct = validProductNames.some(name => response.includes(name))

    if (!hasValidProduct && (response.includes('produto') || response.includes('item'))) {
      return {
        approved: false,
        confidence: 85,
        reason: 'Nome do produto não mencionado corretamente',
        suggestedResponse: 'Nossa Calcinha Modeladora ShapeFit é perfeita para modelar sua silhueta! Qual informação você gostaria de saber?',
        severity: 'medium'
      }
    }

    return {
      approved: true,
      confidence: 95,
      reason: 'Informações do produto corretas',
      severity: 'low'
    }
  }

  private async validatePricing(botResponse: string): Promise<AnalysisResult> {
    const response = botResponse.toLowerCase()
    const priceMatches = response.match(/r\$\s*\d+[,.]?\d*/g)
    
    if (priceMatches && priceMatches.length > 1) {
      const hasQuantityContext = response.includes('unidade') || response.includes('kit') || response.includes('combo')
      
      if (!hasQuantityContext) {
        return {
          approved: false,
          confidence: 90,
          reason: 'Múltiplos preços detectados para a mesma quantidade',
          suggestedResponse: 'Nossa Calcinha Modeladora ShapeFit custa R$ 89,90 para 1 unidade. Qual sua cidade para calcular a entrega?',
          severity: 'high'
        }
      }
    }

    return {
      approved: true,
      confidence: 95,
      reason: 'Precificação correta',
      severity: 'low'
    }
  }

  private async validateCityInfo(userMessage: string, botResponse: string): Promise<AnalysisResult> {
    const needsClarification = this.detectCityClarificationNeeded(userMessage, botResponse)
    
    if (needsClarification) {
      return {
        approved: false,
        confidence: 80,
        reason: 'Necessário pedir clarificação sobre cidade específica',
        suggestedResponse: 'Para calcular o frete corretamente, preciso saber a cidade específica. Qual cidade exatamente?',
        severity: 'medium'
      }
    }

    return {
      approved: true,
      confidence: 95,
      reason: 'Informações de cidade adequadas',
      severity: 'low'
    }
  }

  private detectCityClarificationNeeded(userMessage: string, botResponse: string): boolean {
    const userLower = (userMessage || '').toLowerCase()
    const responseLower = (botResponse || '').toLowerCase()
    
    const genericLocationMentions = [
      /\b(rio|rj)\b/i,
      /\b(sp)\b/i,
      /\b(região metropolitana|grande|baixada)\b/i
    ]
    
    const mentionedGeneric = genericLocationMentions.some(pattern => pattern.test(userMessage))
    
    if (mentionedGeneric && !responseLower.includes('qual cidade') && !responseLower.includes('cidade específica')) {
      return true
    }
    
    return false
  }

  private async validateResponseRelevance(userMessage: string, botResponse: string): Promise<AnalysisResult> {
    const userIntent = this.detectUserIntent(userMessage)
    const response = botResponse.toLowerCase()

    switch (userIntent) {
      case 'pricing_inquiry':
        if (!response.includes('r$') && !response.includes('preço') && !response.includes('valor')) {
          return {
            approved: false,
            confidence: 85,
            reason: 'Pergunta sobre preço não foi respondida adequadamente',
            suggestedResponse: 'Nossa Calcinha Modeladora ShapeFit custa R$ 89,90 para 1 unidade. Qual sua cidade?',
            severity: 'high'
          }
        }
        break

      case 'delivery_inquiry':
        if (!response.includes('entrega') && !response.includes('frete') && !response.includes('cidade')) {
          return {
            approved: false,
            confidence: 85,
            reason: 'Pergunta sobre entrega não foi respondida adequadamente',
            suggestedResponse: 'Para informar sobre a entrega, preciso saber sua cidade. Qual cidade você está?',
            severity: 'high'
          }
        }
        break
    }

    return {
      approved: true,
      confidence: 95,
      reason: 'Resposta relevante para a pergunta',
      severity: 'low'
    }
  }

  async checkMessage(
    phone: string,
    userMessage: string,
    botResponse: string,
    conversationHistory?: Array<{role: 'user' | 'assistant', content: string, timestamp?: string}>
  ): Promise<AnalysisResult> {
    return this.validateResponse(phone, userMessage, botResponse, conversationHistory)
  }
}

export const botVigia = BotVigia.getInstance()
export { BotVigia }
