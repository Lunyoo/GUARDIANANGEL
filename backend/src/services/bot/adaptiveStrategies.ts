// Sistema de Estratégias Adaptativas com Machine Learning
import { budgetAllocator } from '../ml/budgetAllocator'
import { universalBandits, BanditContext } from './universalBandits'

interface ConversationMetrics {
  responseLength: number
  engagementScore: number
  conversionRate: number
  lastUsed: number
  successCount: number
  totalUsed: number
}

interface StrategyVariant {
  id: string
  name: string
  approach: 'direct' | 'consultative' | 'urgency' | 'value' | 'social_proof'
  messageStyle: 'short' | 'medium' | 'detailed'
  tone: 'friendly' | 'professional' | 'casual' | 'enthusiastic'
  promptModifications: string[]
  metrics: ConversationMetrics
}

// Estratégias base para diferentes perfis de cliente
const STRATEGY_VARIANTS: StrategyVariant[] = [
  {
    id: 'short_direct',
    name: 'Direto e Conciso',
    approach: 'direct',
    messageStyle: 'short',
    tone: 'professional',
    promptModifications: [
      'RESPOSTA MÁXIMO 2 LINHAS - seja direto MAS natural',
      'Use frases curtas e claras',
      'Responda o que foi perguntado sem forçar venda',
      'Seja consultiva, não vendedora agressiva'
    ],
    metrics: { responseLength: 0, engagementScore: 0, conversionRate: 0, lastUsed: 0, successCount: 0, totalUsed: 0 }
  },
  {
    id: 'consultative_short',
    name: 'Consultivo Conciso',
    approach: 'consultative',
    messageStyle: 'short',
    tone: 'friendly',
    promptModifications: [
      'RESPOSTA MÁXIMO 2 LINHAS - seja consultivo, natural e educativo',
      'Se PRIMEIRA INTERAÇÃO, SEMPRE se apresente: "Oi! Sou a Larissa, gerente comercial da ShapeFit Brasil 😊"',
      'SEMPRE mencione que trabalha com Calcinha Lipo Modeladora na primeira interação',
      'Demonstre expertise sobre benefícios quando perguntado',
      'QUALIDADE: Tecido Cetinete premium de alta compressão, cintura alta',
      'PREÇOS: 1un R$ 97,00 | 2un R$ 139,90 (PROMOÇÃO) | 3un R$ 179,90 (MELHOR)',
      'Use abordagem educativa e consultiva, não forçada'
    ],
    metrics: { responseLength: 0, engagementScore: 0, conversionRate: 0, lastUsed: 0, successCount: 0, totalUsed: 0 }
  },
  {
    id: 'value_focused',
    name: 'Foco em Valor',
    approach: 'value',
    messageStyle: 'short',
    tone: 'enthusiastic',
    promptModifications: [
      'RESPOSTA MÁXIMO 2 LINHAS - destaque benefícios quando perguntado',
      'PREÇOS OFICIAIS: 1un R$ 97,00 | 2un R$ 139,90 (PRINCIPAL) | 3un R$ 179,90 (MELHOR)',
      'ENTREGA: 70 cidades COD = equipe própria | Outras = correios + pagamento antecipado',
      'QUALIDADE: Tecido Cetinete, cintura alta, não marca nem enrola',
      'Use dados quando cliente perguntar, não empurre informações'
    ],
    metrics: { responseLength: 0, engagementScore: 0, conversionRate: 0, lastUsed: 0, successCount: 0, totalUsed: 0 }
  },
  {
    id: 'social_proof_short',
    name: 'Prova Social Concisa',
    approach: 'social_proof',
    messageStyle: 'short',
    tone: 'casual',
    promptModifications: [
      'RESPOSTA MÁXIMO 2 LINHAS - use depoimentos e casos',
      'Mencione outras clientes satisfeitas',
      'Use estatísticas de satisfação',
      'Crie senso de comunidade'
    ],
    metrics: { responseLength: 0, engagementScore: 0, conversionRate: 0, lastUsed: 0, successCount: 0, totalUsed: 0 }
  },
  {
    id: 'closing_focused',
    name: 'Fechamento Natural',
    approach: 'direct',
    messageStyle: 'short',
    tone: 'professional',
    promptModifications: [
      'RESPOSTA MÁXIMO 2 LINHAS - só finalize se cliente REALMENTE quer',
      'PREÇOS: 1un R$ 97,00 | 2un R$ 139,90 (PRINCIPAL) | 3un R$ 179,90',
      'ENTREGA: 70 cidades COD = equipe própria | Outras = correios + antecipado',
      'QUALIDADE: Produção própria, tecido Cetinete premium',
      'SÓ finalize pedido se cliente demonstrou intenção CLARA de compra'
    ],
    metrics: { responseLength: 0, engagementScore: 0, conversionRate: 0, lastUsed: 0, successCount: 0, totalUsed: 0 }
  }
]

// Cache de estratégias por contexto
const strategyCache = new Map<string, { strategy: StrategyVariant; timestamp: number }>()
const CACHE_DURATION = 1000 * 60 * 30 // 30 minutos

export class AdaptiveStrategyManager {
  private strategies: StrategyVariant[] = [...STRATEGY_VARIANTS]

  // Seleciona a melhor estratégia baseada no contexto e ML
  async selectOptimalStrategy(context: BanditContext, customerProfile: string, messageHistory: any[]): Promise<StrategyVariant> {
    const cacheKey = `${context.city}_${context.customerProfile}_${context.conversationStage}`
    const cached = strategyCache.get(cacheKey)
    
    // Usar cache se ainda válido
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📋 Usando estratégia em cache: ${cached.strategy.name}`)
      return cached.strategy
    }

    // Fatores para seleção de estratégia baseado no histórico completo
    const factors = {
      hasShownUrgency: messageHistory.some(m => 
        /urgente|rápido|logo|agora|hoje/i.test(m.content)
      ),
      hasPriceResistance: messageHistory.some(m => 
        /caro|preço|barato|desconto|promoção/i.test(m.content)
      ),
      hasQualityQuestions: messageHistory.some(m => 
        /funciona|qualidade|resultado|eficaz/i.test(m.content)
      ),
      isReadyToBuy: messageHistory.some(m => 
        /quero.*levar|vou.*comprar|como.*peço|fazer.*pedido|fechar|finalizar|quero.*unidade/i.test(m.content)
      ),
      isProvidingData: messageHistory.some(m => 
        /meu nome|me chamo|sou.*de|endereço|rua.*|avenida.*|bairro.*|cep.*|moro.*em/i.test(m.content)
      ),
      isNewCustomer: customerProfile === 'cold' || customerProfile === 'new',
      messageCount: messageHistory.length
    }

    // Lógica de seleção baseada em contexto
    let selectedStrategy: StrategyVariant

    // Prioridade máxima para fechamento se cliente está fornecendo dados de compra
    if (factors.isProvidingData && factors.isReadyToBuy) {
      selectedStrategy = this.strategies.find(s => s.id === 'closing_focused') || this.strategies[0]
      console.log('🎯 Cliente fornecendo dados de compra - usando estratégia de fechamento')
    } 
    // Prioridade para fechamento se cliente demonstrou interesse em comprar
    else if (factors.isReadyToBuy) {
      selectedStrategy = this.strategies.find(s => s.id === 'closing_focused') || this.strategies[0]
      console.log('🎯 Cliente pronto para comprar - usando estratégia de fechamento')
    } else if (factors.hasPriceResistance) {
      selectedStrategy = this.strategies.find(s => s.id === 'value_focused') || this.strategies[0]
    } else if (factors.hasQualityQuestions) {
      selectedStrategy = this.strategies.find(s => s.id === 'social_proof_short') || this.strategies[0]
    } else if (factors.isNewCustomer || factors.messageCount <= 2) {
      // MUDANÇA: Novos clientes ou primeiras interações usam estratégia consultiva
      selectedStrategy = this.strategies.find(s => s.id === 'consultative_short') || this.strategies[0]
      console.log('👥 Cliente novo/primeira interação - usando estratégia consultiva')
    } else {
      // Para conversas já iniciadas, manter consultivo ao invés de direto
      selectedStrategy = this.strategies.find(s => s.id === 'consultative_short') || this.strategies[0]
    }

    // Aplicar bandits para otimização contínua
    try {
      const banditResult = await universalBandits.selectBestArm('approach', context)
      
      // Se bandits sugerem uma estratégia específica, mapear para nossa estratégia
      if (banditResult.variant && banditResult.variant !== 'default') {
        const approachMap: { [key: string]: string } = {
          'casual': 'consultative_short',
          'direct': 'short_direct', 
          'friendly': 'value_focused',
          'professional': 'social_proof_short',
          'urgent': 'closing_focused'
        }
        
        const banditStrategy = this.strategies.find(s => s.id === approachMap[banditResult.variant])
        if (banditStrategy) {
          selectedStrategy = banditStrategy
          console.log(`🎯 Bandits selecionaram: ${selectedStrategy.name}`)
        }
      }
    } catch (error) {
      console.log('⚠️ Erro nos bandits, usando seleção contextual')
    }

    // Atualizar métricas
    selectedStrategy.metrics.totalUsed++
    selectedStrategy.metrics.lastUsed = Date.now()

    // Cache da estratégia
    strategyCache.set(cacheKey, {
      strategy: selectedStrategy,
      timestamp: Date.now()
    })

    console.log(`🧠 Estratégia selecionada: ${selectedStrategy.name} (${selectedStrategy.approach})`)
    return selectedStrategy
  }

  // Registra feedback de sucesso para aprendizado
  async recordStrategySuccess(strategyId: string, context: BanditContext, metrics: {
    responded: boolean
    converted: boolean
    responseTime?: number
    messageLength: number
  }) {
    const strategy = this.strategies.find(s => s.id === strategyId)
    if (!strategy) return

    // Atualizar métricas locais
    strategy.metrics.successCount += metrics.converted ? 1 : 0
    strategy.metrics.responseLength = (strategy.metrics.responseLength + metrics.messageLength) / 2
    strategy.metrics.engagementScore += metrics.responded ? 1 : 0
    
    if (strategy.metrics.totalUsed > 0) {
      strategy.metrics.conversionRate = strategy.metrics.successCount / strategy.metrics.totalUsed
    }

    // Informar aos bandits usando o método correto
    try {
      const reward = metrics.converted ? 1.0 : (metrics.responded ? 0.5 : 0.0)
      console.log(`📊 Feedback registrado: ${strategy.name} = ${reward}`)
      
      // Log para análise posterior
      const db = await import('../../config/database').then(m => m.getDatabase())
      db.prepare(`INSERT OR IGNORE INTO rewards (conversation_id, phone, variant, reward, out_at) VALUES (?,?,?,?,datetime('now'))`).run(
        `strategy_${strategyId}`, 
        context.city || 'unknown', 
        strategy.approach,
        reward
      )
    } catch (error) {
      console.log('⚠️ Erro ao registrar feedback')
    }
  }

  // Gera prompt modificado baseado na estratégia
  generateAdaptedPrompt(basePrompt: string, strategy: StrategyVariant, context: any): string {
    const modifications = strategy.promptModifications.join('\n')
    
    // Template adaptativo
    const adaptedPrompt = `${basePrompt}

=== ESTRATÉGIA ATIVA: ${strategy.name.toUpperCase()} ===
${modifications}

REGRAS CRÍTICAS:
- MÁXIMO 2 LINHAS por resposta
- Tom: ${strategy.tone}
- Abordagem: ${strategy.approach}
- Seja ${strategy.messageStyle === 'short' ? 'CONCISO' : 'detalhado'}

CONTEXTO:
- Cliente está em: ${context.city || 'localização não informada'}
- Perfil: ${context.customerProfile}
- Estágio: ${context.conversationStage}
- Histórico: ${context.messageCount || 0} mensagens

IMPORTANTE: A resposta NUNCA deve passar de 2 linhas. Seja direto, útil e envolvente.`

    return adaptedPrompt
  }

  // Obtém estatísticas das estratégias
  getStrategyStats(): any {
    return this.strategies.map(s => ({
      id: s.id,
      name: s.name,
      approach: s.approach,
      totalUsed: s.metrics.totalUsed,
      successRate: s.metrics.totalUsed > 0 ? 
        (s.metrics.successCount / s.metrics.totalUsed * 100).toFixed(1) + '%' : 'N/A',
      avgResponseLength: s.metrics.responseLength.toFixed(0),
      lastUsed: s.metrics.lastUsed ? new Date(s.metrics.lastUsed).toLocaleString() : 'Nunca'
    }))
  }

  // Reset de métricas para rebalanceamento
  resetMetrics() {
    this.strategies.forEach(s => {
      s.metrics = { responseLength: 0, engagementScore: 0, conversionRate: 0, lastUsed: 0, successCount: 0, totalUsed: 0 }
    })
    strategyCache.clear()
    console.log('🔄 Métricas de estratégias resetadas')
  }
}

export const adaptiveStrategyManager = new AdaptiveStrategyManager()
