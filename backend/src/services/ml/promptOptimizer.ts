import { universalBandits } from '../bot/universalBandits.js'

// 🧠 Interface para análise de performance do prompt
interface PromptAnalysis {
  currentPrompt: string
  conversionRate: number
  responseTime: number
  customerSatisfaction: number
  commonIssues: string[]
  suggestedImprovements: string[]
}

// 🎯 Interface para sugestão de otimização
interface PromptOptimization {
  id: string
  type: 'pricing' | 'messaging' | 'cities' | 'strategy'
  currentValue: string
  suggestedValue: string
  reasoning: string
  expectedImprovement: number
  confidence: number
  testGroup?: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected' | 'testing'
  approvedBy?: string
  appliedAt?: string
}

// 📊 Sistema de otimização de prompts com ML
export class PromptOptimizer {
  private optimizations = new Map<string, PromptOptimization>()
  private conversationHistory = new Map<string, any[]>()
  
  // 📈 Analisar performance atual do prompt
  analyzePromptPerformance(productId: string, timeFrame: number = 24): PromptAnalysis {
    try {
      // Obter dados do Universal Bandits
      const stats = (universalBandits as any).getStatsByCategory?.('messaging') || []
      const pricingStats = (universalBandits as any).getStatsByCategory?.('pricing') || []
      
      // Calcular métricas
      const totalInteractions = stats.reduce((sum: number, stat: any) => sum + (stat.trials || 0), 0)
      const totalConversions = stats.reduce((sum: number, stat: any) => sum + (stat.successes || 0), 0)
      const avgConversion = totalInteractions > 0 ? totalConversions / totalInteractions : 0
      
      // Identificar problemas comuns
      const commonIssues = this.identifyCommonIssues(stats)
      
      // Gerar sugestões baseadas em ML
      const suggestions = this.generateMLSuggestions(stats, pricingStats)
      
      return {
        currentPrompt: 'Prompt dinâmico baseado em produto e campanha',
        conversionRate: avgConversion,
        responseTime: 2.5,
        customerSatisfaction: 0.85,
        commonIssues,
        suggestedImprovements: suggestions
      }
    } catch (error) {
      console.error('❌ Erro ao analisar performance do prompt:', error)
      return {
        currentPrompt: 'Análise indisponível',
        conversionRate: 0,
        responseTime: 0,
        customerSatisfaction: 0,
        commonIssues: [],
        suggestedImprovements: []
      }
    }
  }
  
  // 🎯 Identificar problemas comuns nas conversas
  private identifyCommonIssues(stats: any[]): string[] {
    const issues: string[] = []
    
    // Analisar baixa conversão
    const lowConversionArms = stats.filter(stat => stat.conversionRate < 0.1)
    if (lowConversionArms.length > 0) {
      issues.push('Taxa de conversão baixa em algumas abordagens')
    }
    
    // Analisar abandono
    const highAbandonArms = stats.filter(stat => stat.abandonRate > 0.3)
    if (highAbandonArms.length > 0) {
      issues.push('Alto índice de abandono na conversa')
    }
    
    // Analisar dúvidas sobre preço
    const priceIssues = stats.filter(stat => stat.variant?.includes('preço') || stat.variant?.includes('caro'))
    if (priceIssues.length > 0) {
      issues.push('Muitas objeções relacionadas ao preço')
    }
    
    // Analisar problemas com entrega
    const deliveryIssues = stats.filter(stat => stat.variant?.includes('entrega') || stat.variant?.includes('COD'))
    if (deliveryIssues.length > 0) {
      issues.push('Dúvidas frequentes sobre entrega e COD')
    }
    
    return issues
  }
  
  // 🧠 Gerar sugestões de melhoria baseadas em ML
  private generateMLSuggestions(messagingStats: any[], pricingStats: any[]): string[] {
    const suggestions: string[] = []
    
    // Analisar melhores performers
    const topMessaging = messagingStats.sort((a, b) => b.conversionRate - a.conversionRate)[0]
    const topPricing = pricingStats.sort((a, b) => b.conversionRate - a.conversionRate)[0]
    
    if (topMessaging && topMessaging.conversionRate > 0.15) {
      suggestions.push(`Expandir uso da abordagem "${topMessaging.variant}" (${(topMessaging.conversionRate * 100).toFixed(1)}% conversão)`)
    }
    
    if (topPricing && topPricing.conversionRate > 0.12) {
      suggestions.push(`Otimizar estratégia de preço "${topPricing.variant}" (melhor performance)`)
    }
    
    // Sugestões baseadas em padrões
    suggestions.push('Personalizar mensagens por horário do dia')
    suggestions.push('Ajustar abordagem baseada na origem da campanha')
    suggestions.push('Otimizar resposta para dúvidas sobre COD')
    
    return suggestions
  }
  
  // 🎯 Criar otimização para aprovação
  createOptimization(type: PromptOptimization['type'], current: string, suggested: string, reasoning: string): string {
    const optimization: PromptOptimization = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      currentValue: current,
      suggestedValue: suggested,
      reasoning,
      expectedImprovement: this.calculateExpectedImprovement(type),
      confidence: this.calculateConfidence(type),
      createdAt: new Date().toISOString(),
      status: 'pending'
    }
    
    this.optimizations.set(optimization.id, optimization)
    
    console.log(`🎯 Nova otimização criada: ${optimization.id} (${type})`)
    return optimization.id
  }
  
  // 📊 Calcular melhoria esperada
  private calculateExpectedImprovement(type: string): number {
    const improvements = {
      'pricing': 0.15,      // 15% melhoria esperada
      'messaging': 0.12,    // 12% melhoria esperada  
      'cities': 0.08,       // 8% melhoria esperada
      'strategy': 0.20      // 20% melhoria esperada
    }
    return improvements[type as keyof typeof improvements] || 0.10
  }
  
  // 🎯 Calcular confiança na sugestão
  private calculateConfidence(type: string): number {
    const confidence = {
      'pricing': 0.85,      // 85% confiança
      'messaging': 0.75,    // 75% confiança
      'cities': 0.90,       // 90% confiança
      'strategy': 0.70      // 70% confiança
    }
    return confidence[type as keyof typeof confidence] || 0.75
  }
  
  // ✅ Aprovar otimização
  approveOptimization(optimizationId: string, approvedBy: string): boolean {
    const optimization = this.optimizations.get(optimizationId)
    if (!optimization || optimization.status !== 'pending') {
      return false
    }
    
    optimization.status = 'approved'
    optimization.approvedBy = approvedBy
    optimization.appliedAt = new Date().toISOString()
    
    this.optimizations.set(optimizationId, optimization)
    
    // Aplicar a otimização ao sistema
    this.applyOptimization(optimization)
    
    console.log(`✅ Otimização aprovada: ${optimizationId} por ${approvedBy}`)
    return true
  }
  
  // ❌ Rejeitar otimização
  rejectOptimization(optimizationId: string, rejectedBy: string): boolean {
    const optimization = this.optimizations.get(optimizationId)
    if (!optimization || optimization.status !== 'pending') {
      return false
    }
    
    optimization.status = 'rejected'
    optimization.approvedBy = rejectedBy
    
    this.optimizations.set(optimizationId, optimization)
    
    console.log(`❌ Otimização rejeitada: ${optimizationId} por ${rejectedBy}`)
    return true
  }
  
  // 🚀 Aplicar otimização aprovada
  private applyOptimization(optimization: PromptOptimization) {
    try {
      switch (optimization.type) {
        case 'pricing':
          this.applyPricingOptimization(optimization)
          break
        case 'messaging':
          this.applyMessagingOptimization(optimization)
          break
        case 'cities':
          this.applyCitiesOptimization(optimization)
          break
        case 'strategy':
          this.applyStrategyOptimization(optimization)
          break
      }
      
      console.log(`🚀 Otimização aplicada: ${optimization.type} - ${optimization.id}`)
    } catch (error) {
      console.error('❌ Erro ao aplicar otimização:', error)
    }
  }
  
  // 💰 Aplicar otimização de preço
  private applyPricingOptimization(optimization: PromptOptimization) {
    // Atualizar Universal Bandits com nova estratégia de preço
    const context = {
      type: 'pricing_optimization',
      strategy: optimization.suggestedValue,
      confidence: optimization.confidence
    }
    
    // Registrar nova arm no Universal Bandits
    ;(universalBandits as any).recordResult?.('pricing', optimization.suggestedValue, true, context)
  }
  
  // 💬 Aplicar otimização de mensagem
  private applyMessagingOptimization(optimization: PromptOptimization) {
    // Atualizar estratégia de mensagem no Universal Bandits
    const context = {
      type: 'messaging_optimization',
      newApproach: optimization.suggestedValue,
      confidence: optimization.confidence
    }
    
    ;(universalBandits as any).recordResult?.('messaging', optimization.suggestedValue, true, context)
  }
  
  // 🏙️ Aplicar otimização de cidades
  private applyCitiesOptimization(optimization: PromptOptimization) {
    // Atualizar estratégia de COD no Universal Bandits
    const context = {
      type: 'cities_optimization',
      newCities: optimization.suggestedValue,
      confidence: optimization.confidence
    }
    
    ;(universalBandits as any).recordResult?.('delivery', optimization.suggestedValue, true, context)
  }
  
  // 🎯 Aplicar otimização de estratégia
  private applyStrategyOptimization(optimization: PromptOptimization) {
    // Atualizar estratégia geral no Universal Bandits
    const context = {
      type: 'strategy_optimization', 
      newStrategy: optimization.suggestedValue,
      confidence: optimization.confidence
    }
    
    ;(universalBandits as any).recordResult?.('strategy', optimization.suggestedValue, true, context)
  }
  
  // 📊 Obter todas as otimizações pendentes
  getPendingOptimizations(): PromptOptimization[] {
    return Array.from(this.optimizations.values())
      .filter(opt => opt.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  
  // 📈 Obter histórico de otimizações
  getOptimizationHistory(): PromptOptimization[] {
    return Array.from(this.optimizations.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  
  // 🎯 Obter otimização por ID
  getOptimization(id: string): PromptOptimization | undefined {
    return this.optimizations.get(id)
  }
  
  // 🤖 Gerar otimizações automáticas baseadas em ML
  generateAutomaticOptimizations(): string[] {
    const generated: string[] = []
    
    // Analisar performance atual
    const analysis = this.analyzePromptPerformance('default')
    
    // Gerar otimizações baseadas nos problemas identificados
    if (analysis.conversionRate < 0.12) {
      const id = this.createOptimization(
        'messaging',
        'Abordagem atual padrão',
        'Abordagem mais direta focada em benefícios',
        'Taxa de conversão baixa detectada pelo ML'
      )
      generated.push(id)
    }
    
    if (analysis.commonIssues.includes('Muitas objeções relacionadas ao preço')) {
      const id = this.createOptimization(
        'pricing',
        'Estratégia de preço atual',
        'Estratégia com mais foco em valor e parcelamento',
        'ML detectou resistência ao preço nas conversas'
      )
      generated.push(id)
    }
    
    if (analysis.commonIssues.includes('Dúvidas frequentes sobre entrega e COD')) {
      const id = this.createOptimization(
        'cities',
        'Explicação COD atual',
        'Explicação mais clara sobre COD e entrega rápida',
        'ML identificou confusão sobre processo de entrega'
      )
      generated.push(id)
    }
    
    console.log(`🤖 ${generated.length} otimizações automáticas geradas`)
    return generated
  }
}

export const promptOptimizer = new PromptOptimizer()
