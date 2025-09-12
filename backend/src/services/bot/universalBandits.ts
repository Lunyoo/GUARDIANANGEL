// 🎰 SISTEMA UNIVERSAL DE MULTI-ARMED BANDITS
// Otimização inteligente para TODAS as partes do bot

export interface UniversalBanditArm {
  id: string
  category: 'pricing' | 'approach' | 'timing' | 'media' | 'closing' | 'script' | 'style' | 'urgency' | 'offers' | 'emoji_usage' | 'message_length' | 'technical_detail' | 'objection_price' | 'objection_quality' | 'objection_size' | 'objection_delivery'
  variant: string
  context?: any
  // Métricas
  impressions: number      // Quantas vezes foi usado
  interactions: number     // Quantas vezes gerou resposta
  created?: number         // Pedidos criados (intermediário)
  conversions: number      // Quantas vezes resultou em venda
  revenue: number          // Receita total gerada
  avgResponseTime: number  // Tempo médio de resposta do cliente
  // Taxas calculadas
  interactionRate: number  // interactions / impressions
  conversionRate: number   // conversions / impressions  
  revenuePerImpression: number // revenue / impressions
  // Confiança estatística
  confidence: number
  ucbScore: number        // Upper Confidence Bound
  lastUsed: Date
}

export interface BanditContext {
  customerProfile: 'new' | 'returning' | 'price_sensitive' | 'interested' | 'engaged' | 'hesitant'
  city: string
  hasCodeDelivery: boolean
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  dayOfWeek: 'weekday' | 'weekend'
  conversationStage: 'opening' | 'qualifying' | 'presenting' | 'handling_objections' | 'closing'
  messageCount: number
  lastResponseTime?: number // Quanto tempo demorou para responder última mensagem
  deviceType?: 'mobile' | 'web'
  trafficSource?: 'organic' | 'ads' | 'referral'
}

export class UniversalBanditSystem {
  private arms: Map<string, UniversalBanditArm> = new Map()
  private totalTrials: number = 0
  private explorationRate: number = 0.15 // 15% exploração, 85% exploração
  private stateFile = 'universalBandits.json'
  private autosaveIntervalMs = 60_000
  private autosaveTimer?: NodeJS.Timeout
  private dirty = false
  private idAliases: Record<string,string> = {
    'approach_consultiva': 'approach_consultative',
    'timing_imediato': 'timing_instant',
    'media_video_demo': 'media_video',
  'closing_parcelamento': 'closing_parcelamento',
  // Personalization and objections aliases
  'style_amigavel': 'style_friendly',
  'urgency_moderada': 'urgency_moderate',
  'offers_combo': 'offers_bundle',
  'emoji_moderado': 'emoji_usage_moderate',
  'message_curta': 'message_length_short',
  'technical_simples': 'technical_detail_simple'
  }

  constructor() {
    this.initializeArms()
    this.loadState()
    this.startAutosave()
  }

  private async loadState() {
    try {
      const { loadJSON, resolveDataPath } = await import('../ml/persistence')
      const state = await loadJSON<any>(resolveDataPath(this.stateFile))
      if (state && state.arms) {
        this.arms = new Map(state.arms)
        this.totalTrials = state.totalTrials || 0
        this.explorationRate = state.explorationRate || this.explorationRate
        console.log('💾 UniversalBandits state loaded')
      }
    } catch (e) {
      // silencioso
    }
  }

  private startAutosave() {
    this.autosaveTimer = setInterval(()=>{ if (this.dirty) { this.saveState(); this.dirty = false } }, this.autosaveIntervalMs).unref()
  }

  private async saveState() {
    try {
      const { saveJSON, resolveDataPath } = await import('../ml/persistence')
      await saveJSON(resolveDataPath(this.stateFile), this.exportData())
    } catch (e) {
      console.error('Persist universalBandits failed', e)
    }
  }

  private initializeArms() {
    // 🎯 BANDITS DE PREÇOS (expandido)
    const pricingArms = [
      { id: 'price_1un_89', variant: '1 unidade R$ 89,90', context: { qty: 1, price: 89.90, productId: 'prod-calcinha-1un-89' } },
      { id: 'price_1un_97', variant: '1 unidade R$ 97,00', context: { qty: 1, price: 97.00, productId: 'prod-calcinha-1un-97' } },
      { id: 'price_2un_119', variant: '2 unidades R$ 119,90', context: { qty: 2, price: 119.90, productId: 'prod-calcinha-2un-119' } },
      { id: 'price_2un_129', variant: '2 unidades R$ 129,90', context: { qty: 2, price: 129.90, productId: 'prod-calcinha-2un-129' } },
      { id: 'price_2un_139', variant: '2 unidades R$ 139,90', context: { qty: 2, price: 139.90, productId: 'prod-calcinha-2un-139' } },
      { id: 'price_2un_147', variant: '2 unidades R$ 147,00', context: { qty: 2, price: 147.00, productId: 'prod-calcinha-2un-147' } },
      { id: 'price_3un_159', variant: '3 unidades R$ 159,90', context: { qty: 3, price: 159.90, productId: 'prod-calcinha-3un-159' } },
      { id: 'price_3un_169', variant: '3 unidades R$ 169,90', context: { qty: 3, price: 169.90, productId: 'prod-calcinha-3un-169' } },
      { id: 'price_3un_179', variant: '3 unidades R$ 179,90', context: { qty: 3, price: 179.90, productId: 'prod-calcinha-3un-179' } },
      { id: 'price_3un_187', variant: '3 unidades R$ 187,00', context: { qty: 3, price: 187.00, productId: 'prod-calcinha-3un-187' } },
      { id: 'price_4un_239', variant: '4 unidades R$ 239,90', context: { qty: 4, price: 239.90, productId: 'prod-calcinha-4un-239' } },
      { id: 'price_6un_359', variant: '6 unidades R$ 359,90', context: { qty: 6, price: 359.90, productId: 'prod-calcinha-6un-359' } }
    ];

    // 🗣️ BANDITS DE ABORDAGEM (8 estilos diferentes) - SEM PREÇOS INICIAIS
    const approachArms = [
      { id: 'approach_direct', variant: 'Direto aos benefícios', context: { style: 'direct', script: 'Oi! A calcinha lipo modela na hora. Qual seu tamanho?' } },
      { id: 'approach_consultative', variant: 'Consultivo', context: { style: 'consultative', script: 'Oi! Qual seu principal objetivo com a calcinha modeladora?' } },
      { id: 'approach_benefit', variant: 'Foca benefícios', context: { style: 'benefit', script: 'Oi! A calcinha lipo modela cintura e levanta bumbum. Qual tamanho você usa?' } },
      { id: 'approach_social_proof', variant: 'Prova social', context: { style: 'social', script: 'Oi! Nossa calcinha mais vendida modela na hora. Quer ver depoimentos?' } },
      { id: 'approach_urgency', variant: 'Urgência', context: { style: 'urgency', script: 'Oi! Últimas unidades com entrega rápida. Qual seu tamanho?' } },
      { id: 'approach_question', variant: 'Pergunta aberta', context: { style: 'question', script: 'Oi! O que te fez procurar uma calcinha modeladora?' } },
      { id: 'approach_problem', variant: 'Identifica problema', context: { style: 'problem', script: 'Oi! Cansada de calcinhas que marcam e não modelam? Tenho a solução!' } },
      { id: 'approach_friendly', variant: 'Amigável', context: { style: 'friendly', script: 'Oi querida! Vi que tem interesse na calcinha lipo. Vou te ajudar! 😊' } }
    ];

    // ⏰ BANDITS DE TIMING (6 intervalos diferentes) - AUMENTADOS PARA MAIS NATURAL
    const timingArms = [
      { id: 'timing_instant', variant: 'Resposta instantânea', context: { delay: 1000 } },
      { id: 'timing_quick', variant: 'Resposta rápida', context: { delay: 2000 } },
      { id: 'timing_natural', variant: 'Timing natural', context: { delay: 3500 } },
      { id: 'timing_thoughtful', variant: 'Pensativo', context: { delay: 5000 } },
      { id: 'timing_careful', variant: 'Cuidadoso', context: { delay: 6500 } },
      { id: 'timing_strategic', variant: 'Estratégico', context: { delay: 8000 } }
    ];

    // 📸 BANDITS DE MÍDIA (5 tipos)
    const mediaArms = [
      { id: 'media_none', variant: 'Só texto', context: { type: 'text' } },
      { id: 'media_product', variant: 'Foto do produto', context: { type: 'product_image' } },
      { id: 'media_testimonial', variant: 'Depoimento com foto', context: { type: 'testimonial' } },
      { id: 'media_before_after', variant: 'Antes e depois', context: { type: 'before_after' } },
      { id: 'media_video', variant: 'Vídeo demonstrativo', context: { type: 'video' } }
    ];

    // 🎯 BANDITS DE FECHAMENTO (7 técnicas)
    const closingArms = [
      { id: 'closing_assumptive', variant: 'Assumptivo', context: { technique: 'assumptive', script: 'Perfeito! Vou separar sua calcinha. Me confirma nome e endereço?' } },
  { id: 'closing_alternative', variant: 'Alternativa', context: { technique: 'alternative', script: 'Prefere 1 unidade (R$ 89,90) ou 2 unidades (R$ 119,90)?' } },
      { id: 'closing_urgency', variant: 'Urgência', context: { technique: 'urgency', script: 'Últimas unidades! Posso reservar a sua agora?' } },
      { id: 'closing_benefit', variant: 'Benefício final', context: { technique: 'benefit', script: 'Imagina como vai se sentir com a cintura modelada! Confirma seu pedido?' } },
      { id: 'closing_risk_reversal', variant: 'Reversão risco', context: { technique: 'risk_reversal', script: 'Sem risco: se não ficar perfeita, trocamos. Pode pedir?' } },
      { id: 'closing_scarcity', variant: 'Escassez', context: { technique: 'scarcity', script: 'Só restam poucas no seu tamanho. Garante a sua?' } },
  { id: 'closing_trial', variant: 'Teste', context: { technique: 'trial', script: 'Que tal testar por 7 dias? Se não gostar, devolvemos seu dinheiro.' } },
  { id: 'closing_parcelamento', variant: 'Parcelamento', context: { technique: 'installments', script: 'Podemos parcelar para facilitar. Posso montar seu pedido parcelado agora?' } }
  // adicionaremos parcelamento depois em patch subsequente se não existir
    ];

    // 📋 BANDITS DE SCRIPTS POR SITUAÇÃO (6 cenários)
    const scriptArms = [
      { id: 'script_price_objection', variant: 'Objeção preço', context: { situation: 'price_objection', script: 'Entendo! O valor da calcinha se paga com o quanto você economiza em outras peças que não precisará mais comprar.' } },
      { id: 'script_size_doubt', variant: 'Dúvida tamanho', context: { situation: 'size_doubt', script: 'Sem problemas! A calcinha tem elastano, então se ficar apertada ou folgada, trocamos sem custo.' } },
      { id: 'script_delivery_question', variant: 'Pergunta entrega', context: { situation: 'delivery_question', script: 'Na sua região entrego em 1-3 dias com pagamento só na entrega. Muito prático!' } },
      { id: 'script_quality_concern', variant: 'Preocupação qualidade', context: { situation: 'quality_concern', script: 'Nossa calcinha tem certificado de qualidade e já vendemos mais de 50.000 unidades. É confiável!' } },
      { id: 'script_comparison', variant: 'Comparação concorrência', context: { situation: 'comparison', script: 'A diferença é que nossa calcinha não enrola, não marca e modela de verdade. Vale cada centavo!' } },
      { id: 'script_indecision', variant: 'Indecisão', context: { situation: 'indecision', script: 'Te entendo! Que tal começar com 1 unidade para testar? Se gostar, depois pede mais.' } }
    ];

    // ✨ BANDITS DE ESTILO/TOM (para mlIntegratedPrompt.estilo)
    const styleArms = [
      { id: 'style_friendly', variant: 'Amigável', context: { tone: 'casual' } },
      { id: 'style_professional', variant: 'Profissional', context: { tone: 'formal' } },
      { id: 'style_consultative', variant: 'Consultivo', context: { tone: 'consultative' } }
    ]

    // ⏳ BANDITS DE URGÊNCIA (para mlIntegratedPrompt.urgencia)
    const urgencyArms = [
      { id: 'urgency_low', variant: 'Baixa', context: { urgency: 'low' } },
      { id: 'urgency_moderate', variant: 'Moderada', context: { urgency: 'moderate' } },
      { id: 'urgency_high', variant: 'Alta', context: { urgency: 'high' } }
    ]

    // 🧾 BANDITS DE OFERTAS (para mlIntegratedPrompt.ofertas)
    const offersArms = [
      { id: 'offers_bundle', variant: 'Combo', context: { focus: 'bundle' } },
      { id: 'offers_single', variant: 'Unitário', context: { focus: 'single' } },
      { id: 'offers_upsell', variant: 'Upsell', context: { focus: 'upsell' } }
    ]

    // 💬 PERSONALIZAÇÃO
    const emojiArms = [
      { id: 'emoji_usage_none', variant: 'Sem emoji', context: { level: 'none' } },
      { id: 'emoji_usage_moderate', variant: 'Moderado', context: { level: 'moderate' } },
      { id: 'emoji_usage_high', variant: 'Alto', context: { level: 'high' } }
    ]
    const lengthArms = [
      { id: 'message_length_short', variant: 'Conciso', context: { length: 'short' } },
      { id: 'message_length_medium', variant: 'Médio', context: { length: 'medium' } }
    ]
    const technicalArms = [
      { id: 'technical_detail_simple', variant: 'Simples', context: { technical: 'simple' } },
      { id: 'technical_detail_detailed', variant: 'Detalhado', context: { technical: 'detailed' } }
    ]

    // ❓ OBJEÇÕES
    const objectionArms = [
      { id: 'objection_price_valor_comparativo', variant: 'Valor comparativo', context: { type: 'price' } },
      { id: 'objection_quality_social_proof', variant: 'Prova social', context: { type: 'quality' } },
      { id: 'objection_size_consultoria', variant: 'Consultoria de tamanho', context: { type: 'size' } },
      { id: 'objection_delivery_cod_emphasis', variant: 'Ênfase no COD', context: { type: 'delivery' } }
    ]

    // Inicializar todos os braços
    const allArms = [
      ...pricingArms,
      ...approachArms,
      ...timingArms,
      ...mediaArms,
      ...closingArms,
      ...scriptArms,
      ...styleArms,
      ...urgencyArms,
      ...offersArms,
      ...emojiArms,
      ...lengthArms,
      ...technicalArms,
      ...objectionArms
    ];

    const deriveCategory = (id: string): UniversalBanditArm['category'] => {
      if (id.startsWith('price_')) return 'pricing' as const
      if (id.startsWith('approach_')) return 'approach'
      if (id.startsWith('timing_')) return 'timing'
      if (id.startsWith('media_')) return 'media'
      if (id.startsWith('closing_')) return 'closing'
      if (id.startsWith('script_')) return 'script'
      if (id.startsWith('style_')) return 'style'
      if (id.startsWith('urgency_')) return 'urgency'
      if (id.startsWith('offers_')) return 'offers'
      if (id.startsWith('emoji_usage_')) return 'emoji_usage'
      if (id.startsWith('message_length_')) return 'message_length'
      if (id.startsWith('technical_detail_')) return 'technical_detail'
      if (id.startsWith('objection_price_')) return 'objection_price'
      if (id.startsWith('objection_quality_')) return 'objection_quality'
      if (id.startsWith('objection_size_')) return 'objection_size'
      if (id.startsWith('objection_delivery_')) return 'objection_delivery'
      return id.split('_')[0] as any
    }

    allArms.forEach(armData => {
      const normalizedCategory = deriveCategory(armData.id)
      const arm: UniversalBanditArm = {
        id: armData.id,
        category: normalizedCategory as any,
        variant: armData.variant,
        context: armData.context,
  impressions: 0,
  interactions: 0,
  created: 0,
  conversions: 0,
        revenue: 0,
        avgResponseTime: 0,
        interactionRate: 0,
        conversionRate: 0,
        revenuePerImpression: 0,
        confidence: 0,
        ucbScore: 0,
        lastUsed: new Date()
      };
      this.arms.set(armData.id, arm);
    });

    console.log(`🎰 Universal Bandit System initialized with ${this.arms.size} arms across 6 categories`);
  }

  // 🎯 SELECIONAR MELHOR OPÇÃO PARA CATEGORIA
  selectBestArm(category: UniversalBanditArm['category'], context: BanditContext): UniversalBanditArm {
    let categoryArms = Array.from(this.arms.values()).filter(arm => arm.category === category)
    // Alias de compatibilidade
    if (categoryArms.length === 0 && category === 'pricing') {
      // Compat: aceitar prefixo antigo 'price' nos IDs
      categoryArms = Array.from(this.arms.values()).filter(arm => (arm as any).category === 'price')
    }
    
    // Filtrar braços relevantes para o contexto
    const relevantArms = this.filterRelevantArms(categoryArms, context)
    
    if (relevantArms.length === 0) {
      console.warn(`No relevant arms found for category: ${category}`)
      return categoryArms[0] // Fallback para primeiro da categoria
    }

    // Epsilon-Greedy: exploração vs exploração
    if (Math.random() < this.explorationRate) {
      // 🔍 EXPLORAÇÃO: Testar algo novo
      return this.selectRandomArm(relevantArms)
    } else {
      // 💰 EXPLORAÇÃO: Usar o melhor conhecido
      return this.selectUCBArm(relevantArms)
    }
  }

  // 📊 REGISTRAR RESULTADO
  recordResult(armId: string, result: { impression?: boolean; interaction?: boolean; created?: boolean; conversion?: boolean; revenue?: number; responseTime?: number }): void {
    let arm = this.arms.get(armId)
    if (!arm && this.idAliases[armId]) {
      arm = this.arms.get(this.idAliases[armId])
      if (arm) console.warn(`Arm alias usado: ${armId} -> ${arm.id}`)
    }
    if (!arm) { console.warn(`Arm not found: ${armId}`); return }

    // Atualizar métricas
  if (result.impression) arm.impressions++
  if (result.interaction) arm.interactions++
  if (result.created) arm.created = (arm.created||0)+1
  if (result.conversion) arm.conversions++
  if (result.revenue) arm.revenue += result.revenue

    // Atualizar tempo médio de resposta
    if (result.responseTime) {
      arm.avgResponseTime = (arm.avgResponseTime + result.responseTime) / 2
    }

    // Recalcular taxas
    this.updateArmMetrics(arm)
    
    // Atualizar timestamp
    arm.lastUsed = new Date()
    
  this.totalTrials++
  this.dirty = true

    console.log(`🎰 Bandit ${armId}: ${arm.conversionRate.toFixed(3)} conv rate (${arm.conversions}/${arm.impressions})`)
  }

  // 📈 OBTER ESTATÍSTICAS POR CATEGORIA
  getStatsByCategory(category: UniversalBanditArm['category']): UniversalBanditArm[] {
    return Array.from(this.arms.values())
      .filter(arm => arm.category === category || (category === 'pricing' && (arm as any).category === 'price'))
      .sort((a, b) => b.ucbScore - a.ucbScore)
  }

  // 🏆 OBTER RANKING GERAL
  getTopPerformers(limit: number = 10): UniversalBanditArm[] {
    return Array.from(this.arms.values())
      .sort((a, b) => b.ucbScore - a.ucbScore)
      .slice(0, limit)
  }

  // 💾 EXPORTAR/IMPORTAR DADOS
  exportData(): string {
    const data = {
      arms: Array.from(this.arms.entries()),
      totalTrials: this.totalTrials,
      explorationRate: this.explorationRate,
      lastUpdate: new Date().toISOString()
    }
  return JSON.stringify(data)
  }

  importData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData)
      this.arms = new Map(data.arms)
      this.totalTrials = data.totalTrials || 0
      this.explorationRate = data.explorationRate || 0.15
      console.log(`🎰 Bandit data imported: ${this.arms.size} arms, ${this.totalTrials} trials`)
    } catch (error) {
      console.error('Error importing bandit data:', error)
    }
  }

  // 🎯 MÉTODOS PRIVADOS

  private filterRelevantArms(arms: UniversalBanditArm[], context: BanditContext): UniversalBanditArm[] {
    const filtered = arms.filter(arm => {
      // Para pricing, sempre incluir algumas opções básicas
      if (arm.category === 'pricing') {
        return true // Incluir todos os preços por enquanto
      }
      
      // Filtrar por estágio da conversa
      if (arm.category === 'approach' && context.conversationStage !== 'opening') return false
      if (arm.category === 'closing' && context.conversationStage !== 'closing') return false
      
      // Filtrar por horário (evitar vídeos de madrugada)
      if (arm.category === 'media' && context.timeOfDay === 'night') {
        return arm.context?.type !== 'video'
      }

      return true
    })
    
    // Se não sobrou nenhum braço relevante, retornar todos da categoria
    return filtered.length > 0 ? filtered : arms
  }

  private selectRandomArm(arms: UniversalBanditArm[]): UniversalBanditArm {
    return arms[Math.floor(Math.random() * arms.length)]
  }

  private selectUCBArm(arms: UniversalBanditArm[]): UniversalBanditArm {
    // Atualizar UCB scores antes de selecionar
    arms.forEach(arm => {
      arm.ucbScore = this.calculateUCB(arm)
    })
    
    return arms.sort((a, b) => b.ucbScore - a.ucbScore)[0]
  }

  private calculateUCB(arm: UniversalBanditArm): number {
    if (arm.impressions === 0) return Infinity // Priorizar braços nunca testados
    
    // Combinar multiple métricas no UCB
    const conversionComponent = arm.conversionRate
    const revenueComponent = arm.revenuePerImpression / 1000 // Normalizar receita
    const interactionComponent = arm.interactionRate * 0.3 // Peso menor para interação
    
    const avgValue = conversionComponent + revenueComponent + interactionComponent
    
    // Confidence interval
    const confidence = Math.sqrt((2 * Math.log(this.totalTrials)) / arm.impressions)
    
    return avgValue + confidence
  }

  private updateArmMetrics(arm: UniversalBanditArm): void {
    if (arm.impressions > 0) {
      arm.interactionRate = arm.interactions / arm.impressions
      arm.conversionRate = arm.conversions / arm.impressions
      arm.revenuePerImpression = arm.revenue / arm.impressions
      arm.confidence = Math.min(1, arm.impressions / 100) // 100% confiança após 100 impressões
    }
  }

  // 🎯 MÉTODOS PÚBLICOS PARA CADA CATEGORIA

  getBestPricing(context: BanditContext) {
    return this.selectBestArm('pricing', context)
  }

  getBestApproach(context: BanditContext) {
    return this.selectBestArm('approach', context)
  }

  getBestTiming(context: BanditContext) {
    return this.selectBestArm('timing', context)
  }

  getBestMedia(context: BanditContext) {
    return this.selectBestArm('media', context)
  }

  getBestClosing(context: BanditContext) {
    return this.selectBestArm('closing', context)
  }

  getBestScript(context: BanditContext) {
    return this.selectBestArm('script', context)
  }

  /**
   * 💰 Registrar conversão para aprendizado
   */
  recordConversion(strategyId: string, value: number, context: any) {
    // Usar getTopPerformers para encontrar arm ou usar primeiro da categoria
    const allArms = this.getTopPerformers(100); // Pegar todos
    const arm = allArms.find(a => a.id === strategyId || a.variant.includes(strategyId));
    
    if (!arm) {
      console.warn(`Estratégia ${strategyId} não encontrada para registrar conversão`);
      return;
    }

    // Registrar conversão
    this.recordResult(arm.id, {
      impression: true,
      interaction: true,
      conversion: true,
      revenue: value
    });

    console.log(`💰 Conversão Universal Bandit: ${arm.id} = R$ ${value}`);
  }

  /**
   * 🎯 Analisar potencial de campanha baseado nos dados dos bandits
   */
  analyzeCampaignPotential(params: {
    budget: number;
    targetAudience: string;
    objective: string;
  }) {
    const { budget, targetAudience, objective } = params;
    
    // Analisar performance histórica por categoria
    const categories = ['pricing', 'approach', 'timing', 'media', 'closing'];
    const categoryInsights = categories.map(category => {
      const arms = this.getStatsByCategory(category as any);
      const bestArm = arms[0];
      const avgConversion = arms.reduce((sum, arm) => sum + arm.conversionRate, 0) / arms.length;
      
      return {
        category,
        bestPerformer: bestArm,
        avgConversionRate: avgConversion,
        totalExperiments: arms.reduce((sum, arm) => sum + arm.impressions, 0),
        confidence: arms.reduce((sum, arm) => sum + arm.confidence, 0) / arms.length
      };
    });

    // Calcular potencial baseado no melhor mix
    const bestConversionRate = Math.max(...categoryInsights.map(c => c.avgConversionRate));
    const projectedConversions = Math.round(budget * 0.01 * bestConversionRate * 100); // Estimativa
    const projectedROI = projectedConversions > 0 ? (projectedConversions * 100) / budget : 0;

    return {
      projectedConversions,
      projectedROI,
      confidence: categoryInsights.reduce((sum, c) => sum + c.confidence, 0) / categoryInsights.length,
      recommendations: this.generateCampaignRecommendations(categoryInsights),
      categoryInsights,
      riskLevel: bestConversionRate > 0.05 ? 'low' : bestConversionRate > 0.02 ? 'medium' : 'high'
    };
  }

  private generateCampaignRecommendations(insights: any[]) {
    const recommendations = [];
    
    // Recomendar baseado na performance das categorias
    const weakCategories = insights.filter(c => c.avgConversionRate < 0.02);
    if (weakCategories.length > 0) {
      recommendations.push(`Otimizar estratégias de: ${weakCategories.map(c => c.category).join(', ')}`);
    }

    const strongCategories = insights.filter(c => c.avgConversionRate > 0.05);
    if (strongCategories.length > 0) {
      recommendations.push(`Focar em estratégias de: ${strongCategories.map(c => c.category).join(', ')}`);
    }

    // Recomendar mais testes se poucos dados
    const lowDataCategories = insights.filter(c => c.totalExperiments < 100);
    if (lowDataCategories.length > 0) {
      recommendations.push(`Coletar mais dados para: ${lowDataCategories.map(c => c.category).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * 🚚 Atualizar contexto de entrega COD
   */
  updateDeliveryContext(deliveryConfig: any) {
    try {
      // Preservar codCities existentes quando não fornecidas e calcular merge
      const mergedCodCities = Array.isArray(deliveryConfig.codCities)
        ? deliveryConfig.codCities
        : (this.deliveryContext?.codCities || [])

      this.deliveryContext = {
        ...this.deliveryContext,
        ...deliveryConfig,
        codCities: mergedCodCities,
        hasCodeDelivery: typeof deliveryConfig.hasCodeDelivery === 'boolean'
          ? deliveryConfig.hasCodeDelivery
          : (this.deliveryContext?.hasCodeDelivery ?? (mergedCodCities.length > 0)),
        lastUpdated: new Date()
      }

      // Mapear extras opcionais
      const extras = {
        availableColors: deliveryConfig.colors || deliveryConfig.availableColors,
        preferredMedia: deliveryConfig.preferredMedia,
        basePrice: deliveryConfig.price || deliveryConfig.basePrice,
        template: deliveryConfig.template,
        images: deliveryConfig.images
      }

      // Atualizar todas as arms com novo contexto
    this.arms.forEach(arm => {
        if (arm.context) {
      arm.context.codCities = mergedCodCities.length ? mergedCodCities : (arm.context.codCities || [])
          arm.context.hasCodeDelivery = typeof deliveryConfig.hasCodeDelivery === 'boolean' ? deliveryConfig.hasCodeDelivery : arm.context.hasCodeDelivery
          // Propagar extras
          if (extras.availableColors) arm.context.availableColors = extras.availableColors
          if (extras.preferredMedia) arm.context.preferredMedia = extras.preferredMedia
          if (extras.basePrice) arm.context.basePrice = extras.basePrice
          if (extras.template) arm.context.template = extras.template
          if (extras.images) arm.context.images = extras.images
        }
      })

    console.log(`🚚 Contexto de entrega atualizado: ${mergedCodCities.length} cidades COD`)
      return true
    } catch (error) {
      console.error('Erro ao atualizar contexto de entrega:', error)
      return false
    }
  }

  /**
   * 📊 Obter contexto atual
   */
  getContext() {
    return {
      deliveryContext: this.deliveryContext,
      codCities: this.deliveryContext?.codCities || [],
      hasCodeDelivery: this.deliveryContext?.hasCodeDelivery || false,
  colors: this.deliveryContext?.colors || this.deliveryContext?.availableColors || [],
  preferredMedia: this.deliveryContext?.preferredMedia,
  basePrice: this.deliveryContext?.price || this.deliveryContext?.basePrice,
  template: this.deliveryContext?.template,
  images: this.deliveryContext?.images,
      armsCount: this.arms.size,
      lastUpdated: this.deliveryContext?.lastUpdated
    }
  }

  /**
   * 🎯 Reset de braço específico
   */
  resetArm(armId: string) {
    const arm = this.arms.get(armId)
    if (arm) {
      arm.impressions = 0
      arm.interactions = 0
      arm.conversions = 0
      arm.revenue = 0
      arm.conversionRate = 0
      arm.ucbScore = 0
      console.log(`🔄 Braço ${arm.variant} resetado`)
    }
  }

  /**
   * 🎯 Adicionar novo braço dinamicamente
   */
  addArm(newArm: {
    id: string
    variant: string
    category: UniversalBanditArm['category']
    context: any
  }) {
    const arm: UniversalBanditArm = {
      ...newArm,
      impressions: 0,
      interactions: 0,
      conversions: 0,
      revenue: 0,
      conversionRate: 0,
      ucbScore: 0,
      avgResponseTime: 0,
      interactionRate: 0,
      revenuePerImpression: 0,
      confidence: 0,
      lastUsed: new Date()
    }
    this.arms.set(arm.id, arm)
    console.log(`➕ Novo braço adicionado: ${arm.variant}`)
  }

  /**
   * 🎯 Aumentar exploração por categoria
   */
  increaseExploration(category: UniversalBanditArm['category'], factor: number) {
    const categoryArms = Array.from(this.arms.values()).filter(arm => arm.category === category)
    categoryArms.forEach(arm => {
      // Diminui impressões para aumentar exploração
      arm.impressions = Math.max(1, Math.floor(arm.impressions * (1 - factor)))
      arm.interactions = Math.max(0, Math.floor(arm.interactions * (1 - factor)))
      arm.conversions = Math.max(0, Math.floor(arm.conversions * (1 - factor)))
      this.updateArmMetrics(arm)
    })
    console.log(`🔍 Exploração aumentada para categoria ${category}`)
  }

  private deliveryContext: any = {}
}

// 🌟 INSTÂNCIA GLOBAL
export const universalBandits = new UniversalBanditSystem()

// 🎯 HELPER FUNCTIONS PARA USO FÁCIL
export function getBanditRecommendation(category: UniversalBanditArm['category'], context: BanditContext) {
  return universalBandits.selectBestArm(category, context)
}

export function recordBanditOutcome(armId: string, outcome: 'impression' | 'interaction' | 'conversion', value?: number) {
  const result = {
    impression: outcome === 'impression',
    interaction: outcome === 'interaction', 
    conversion: outcome === 'conversion',
    revenue: outcome === 'conversion' ? value : 0
  }
  universalBandits.recordResult(armId, result)
}

/*
🎰 EXEMPLO DE USO:

// 1. Obter melhor abordagem para cliente novo
const context = {
  customerProfile: 'new',
  city: 'São Paulo', 
  hasCodeDelivery: true,
  timeOfDay: 'afternoon',
  dayOfWeek: 'weekday',
  conversationStage: 'opening',
  messageCount: 1
}

const bestApproach = universalBandits.getBestApproach(context)
console.log('🎯 Melhor abordagem:', bestApproach.variant)

// 2. Usar a abordagem e registrar resultado
// sendMessage(bestApproach.context.script) // COMENTADO - problema com getMaybeMeUser
universalBandits.recordResult(bestApproach.id, { impression: true })

// 3. Se cliente respondeu
universalBandits.recordResult(bestApproach.id, { interaction: true })

// 4. Se cliente comprou
universalBandits.recordResult(bestApproach.id, { conversion: true, revenue: 89.90 })

// 5. Ver estatísticas
const topApproaches = universalBandits.getStatsByCategory('approach')
console.log('📊 Ranking de abordagens:', topApproaches)
*/
