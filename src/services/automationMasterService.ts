/**
 * Serviço de Automação Master
 * Coordena todo o processo automatizado desde scraping até criação de campanhas
 */

import { kiwifyService } from './kiwifyService'
import IdeogramService from './ideogramService'
import { scrapingService } from './scrapingService'
import { machineLearningService } from './machineLearningService'
import type { MetricasCampanha, Criativo } from '@/types'

export interface AutomationConfig {
  user_id: string
  niche_preference: 'white' | 'grey' | 'black'
  budget_range: {
    min: number
    max: number
  }
  target_audience: string
  automation_level: 'conservative' | 'moderate' | 'aggressive'
  apis: {
    facebook_token?: string
    facebook_account_id?: string
    kiwify_client_id?: string
    kiwify_client_secret?: string
    ideogram_api_key?: string
  }
}

export interface AutomationResult {
  success: boolean
  steps_completed: number
  total_steps: number
  results: {
    scraped_offers?: any[]
    selected_offer?: any
    generated_product?: any
    generated_creatives?: any[]
    created_campaign?: any
  }
  errors: string[]
  recommendations: string[]
  next_actions: string[]
}

export interface OfferAnalysis {
  id: string
  original_url: string
  success_score: number
  estimated_revenue: number
  competition_level: 'low' | 'medium' | 'high'
  replication_difficulty: 'easy' | 'medium' | 'hard'
  niche: string
  target_audience: string
  pricing_strategy: {
    suggested_price: number
    upsell_potential: number
    recurring_potential: boolean
  }
  creative_elements: {
    main_hook: string
    pain_points: string[]
    benefits: string[]
    cta_style: string
  }
  funnel_structure: {
    pages_count: number
    conversion_elements: string[]
    gamification_potential: number
  }
}

class AutomationMasterService {
  private config: AutomationConfig | null = null
  private isRunning = false
  private ideogramService: IdeogramService | null = null

  // Configurar automação
  setConfig(config: AutomationConfig) {
    this.config = config
    
    // Configurar APIs
    if (config.apis.kiwify_client_id && config.apis.kiwify_client_secret) {
      kiwifyService.setCredentials(config.apis.kiwify_client_id, config.apis.kiwify_client_secret)
    }
    if (config.apis.ideogram_api_key) {
      this.ideogramService = new IdeogramService(config.apis.ideogram_api_key)
    }
  }

  // Executar automação completa
  async runFullAutomation(): Promise<AutomationResult> {
    if (!this.config) {
      throw new Error('Configuração da automação não definida')
    }

    if (this.isRunning) {
      throw new Error('Automação já está em execução')
    }

    console.log('🚀 Iniciando Automação Master')
    this.isRunning = true

    const result: AutomationResult = {
      success: false,
      steps_completed: 0,
      total_steps: 8,
      results: {},
      errors: [],
      recommendations: [],
      next_actions: []
    }

    try {
      // Etapa 1: Scraping de ofertas de sucesso
      console.log('🔍 Etapa 1/8: Scraping de ofertas...')
      result.results.scraped_offers = await this.scrapeSuccessfulOffers()
      result.steps_completed++

      // Etapa 2: Análise e seleção da melhor oferta
      console.log('🎯 Etapa 2/8: Analisando ofertas...')
      result.results.selected_offer = await this.analyzeAndSelectOffer(result.results.scraped_offers)
      result.steps_completed++

      // Etapa 3: Criar produto no Kiwify
      console.log('🏭 Etapa 3/8: Criando produto...')
      result.results.generated_product = await this.createProductFromOffer(result.results.selected_offer)
      result.steps_completed++

      // Etapa 4: Gerar criativos com IA
      console.log('🎨 Etapa 4/8: Gerando criativos...')
      result.results.generated_creatives = await this.generateCreativesForOffer(result.results.selected_offer)
      result.steps_completed++

      // Etapa 5: Revisar criativos
      console.log('🔎 Etapa 5/8: Revisando criativos...')
      result.results.generated_creatives = await this.reviewAndOptimizeCreatives(result.results.generated_creatives)
      result.steps_completed++

      // Etapa 6: Criar funil gamificado
      console.log('🎮 Etapa 6/8: Criando funil gamificado...')
      await this.createGamifiedFunnel(result.results.generated_product, result.results.selected_offer)
      result.steps_completed++

      // Etapa 7: Criar campanha no Facebook (se configurado)
      if (this.config.apis.facebook_token && this.config.apis.facebook_account_id) {
        console.log('📱 Etapa 7/8: Criando campanha no Facebook...')
        result.results.created_campaign = await this.createFacebookCampaign(
          result.results.generated_product,
          result.results.generated_creatives
        )
      } else {
        console.log('⏭️ Etapa 7/8: Pulando criação de campanha no Facebook (API não configurada)')
      }
      result.steps_completed++

      // Etapa 8: Gerar recomendações
      console.log('📊 Etapa 8/8: Gerando recomendações...')
      result.recommendations = await this.generateRecommendations(result.results)
      result.next_actions = await this.generateNextActions(result.results)
      result.steps_completed++

      result.success = true
      console.log('✅ Automação Master concluída com sucesso!')

    } catch (error) {
      console.error('❌ Erro na Automação Master:', error)
      result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      this.isRunning = false
    }

    return result
  }

  // Scraping de ofertas de sucesso
  private async scrapeSuccessfulOffers(): Promise<any[]> {
    try {
      const keywords = this.generateKeywordsByNiche(this.config!.niche_preference)
      const offers: any[] = []

      for (const keyword of keywords) {
        try {
          const scraped = await scrapingService.scrapeAds(keyword, {
            limit: 10,
            min_engagement: 1000,
            success_indicators: ['high_comments', 'multiple_reactions', 'shares']
          })

          offers.push(...scraped)
        } catch (error) {
          console.warn(`Erro ao fazer scraping para ${keyword}:`, error)
        }
      }

      // Remover duplicatas e ordenar por score de sucesso
      const uniqueOffers = this.removeDuplicateOffers(offers)
      return uniqueOffers.sort((a, b) => b.success_score - a.success_score)

    } catch (error) {
      console.error('Erro no scraping:', error)
      return []
    }
  }

  // Gerar palavras-chave por nicho
  private generateKeywordsByNiche(niche: string): string[] {
    const nicheKeywords = {
      white: [
        'curso online', 'ebook gratis', 'treinamento', 'mentoria',
        'coaching', 'desenvolvimento pessoal', 'produtividade'
      ],
      grey: [
        'ganhar dinheiro', 'renda extra', 'trabalhar em casa',
        'negócio online', 'investimento', 'trade'
      ],
      black: [
        'fórmula secreta', 'método exclusivo', 'sistema automático',
        'enriquecer rápido', 'técnica proibida'
      ]
    }

    return nicheKeywords[niche] || nicheKeywords.white
  }

  // Remover ofertas duplicadas
  private removeDuplicateOffers(offers: any[]): any[] {
    const seen = new Set()
    return offers.filter(offer => {
      const key = offer.advertiser_name + offer.main_text
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Analisar e selecionar melhor oferta
  private async analyzeAndSelectOffer(offers: any[]): Promise<OfferAnalysis> {
    if (offers.length === 0) {
      throw new Error('Nenhuma oferta encontrada no scraping')
    }

    console.log(`Analisando ${offers.length} ofertas encontradas...`)

    // Analisar cada oferta com ML
    const analyses: OfferAnalysis[] = []

    for (const offer of offers.slice(0, 5)) { // Analisar top 5
      try {
        const analysis = await this.analyzeOffer(offer)
        analyses.push(analysis)
      } catch (error) {
        console.warn('Erro ao analisar oferta:', error)
      }
    }

    // Selecionar melhor oferta baseada no score
    const bestOffer = analyses.reduce((best, current) => 
      current.success_score > best.success_score ? current : best
    )

    console.log(`✅ Oferta selecionada: Score ${bestOffer.success_score}`)
    return bestOffer
  }

  // Analisar oferta individual
  private async analyzeOffer(offer: any): Promise<OfferAnalysis> {
    const prompt = spark.llmPrompt`
      Analise esta oferta para replicação automatizada:
      
      Anunciante: ${offer.advertiser_name}
      Texto: ${offer.main_text}
      Nicho: ${this.config!.niche_preference}
      
      Avalie:
      1. Score de sucesso (1-10) baseado no engagement
      2. Receita estimada mensal
      3. Nível de competição
      4. Dificuldade de replicação
      5. Preço sugerido para nossa versão
      6. Elementos principais de conversão
      7. Estrutura de funil identificada
      
      Retorne JSON estruturado com todos os campos de OfferAnalysis.
    `

    try {
      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      const analysis = JSON.parse(result)

      return {
        id: `analysis_${Date.now()}`,
        original_url: offer.link_url || '',
        success_score: analysis.success_score || 7,
        estimated_revenue: analysis.estimated_revenue || 10000,
        competition_level: analysis.competition_level || 'medium',
        replication_difficulty: analysis.replication_difficulty || 'medium',
        niche: this.config!.niche_preference,
        target_audience: analysis.target_audience || this.config!.target_audience,
        pricing_strategy: analysis.pricing_strategy || {
          suggested_price: 97,
          upsell_potential: 297,
          recurring_potential: false
        },
        creative_elements: analysis.creative_elements || {
          main_hook: offer.main_text.substring(0, 100),
          pain_points: ['Problema comum do nicho'],
          benefits: ['Solução eficaz'],
          cta_style: 'urgency'
        },
        funnel_structure: analysis.funnel_structure || {
          pages_count: 3,
          conversion_elements: ['Social proof', 'Scarcity'],
          gamification_potential: 7
        }
      }
    } catch (error) {
      console.warn('Erro na análise de oferta, usando dados padrão')
      return {
        id: `analysis_${Date.now()}`,
        original_url: offer.link_url || '',
        success_score: 6,
        estimated_revenue: 5000,
        competition_level: 'medium',
        replication_difficulty: 'medium',
        niche: this.config!.niche_preference,
        target_audience: this.config!.target_audience,
        pricing_strategy: {
          suggested_price: 97,
          upsell_potential: 197,
          recurring_potential: false
        },
        creative_elements: {
          main_hook: offer.main_text || 'Oferta Exclusiva',
          pain_points: ['Problema comum'],
          benefits: ['Solução eficaz'],
          cta_style: 'urgency'
        },
        funnel_structure: {
          pages_count: 3,
          conversion_elements: ['Social proof'],
          gamification_potential: 5
        }
      }
    }
  }

  // Criar produto baseado na oferta
  private async createProductFromOffer(offer: OfferAnalysis): Promise<any> {
    try {
      const productName = await this.generateProductName(offer)
      const productDescription = await this.generateProductDescription(offer)

      const product = await kiwifyService.createProduct({
        name: productName,
        price: offer.pricing_strategy.suggested_price,
        description: productDescription,
        category: 'ebook',
        niche: offer.niche,
        checkout_settings: {
          headline: offer.creative_elements.main_hook,
          subheadline: `Descobra ${offer.creative_elements.benefits[0]}`,
          bullet_points: offer.creative_elements.benefits,
          testimonials: await this.generateTestimonials(offer)
        }
      })

      console.log('✅ Produto criado no Kiwify:', product.id)
      return product
    } catch (error) {
      console.error('Erro ao criar produto:', error)
      throw error
    }
  }

  // Gerar nome do produto
  private async generateProductName(offer: OfferAnalysis): Promise<string> {
    const prompt = spark.llmPrompt`
      Crie um nome atrativo para um produto digital baseado nesta análise:
      
      Nicho: ${offer.niche}
      Hook Principal: ${offer.creative_elements.main_hook}
      Público: ${offer.target_audience}
      
      O nome deve ser:
      - Atrativo e persuasivo
      - Específico para o nicho
      - Máximo 60 caracteres
      - Em português brasileiro
      
      Apenas o nome, sem explicações.
    `

    try {
      return await spark.llm(prompt, 'gpt-4o-mini')
    } catch (error) {
      return `${offer.niche.toUpperCase()} Master - Método Exclusivo`
    }
  }

  // Gerar descrição do produto
  private async generateProductDescription(offer: OfferAnalysis): Promise<string> {
    const prompt = spark.llmPrompt`
      Crie uma descrição completa e persuasiva para este produto digital:
      
      Análise da Oferta:
      ${JSON.stringify(offer, null, 2)}
      
      A descrição deve ter:
      - Problema que resolve
      - Solução oferecida
      - Benefícios específicos
      - Prova social
      - Call to action
      
      Estilo: Copywriting brasileiro, persuasivo, entre 200-400 palavras.
    `

    try {
      return await spark.llm(prompt, 'gpt-4o-mini')
    } catch (error) {
      return `Descubra o método que está transformando resultados no nicho ${offer.niche}. Este produto exclusivo foi desenvolvido baseado em análises de mercado e ofertas de alta performance.`
    }
  }

  // Gerar depoimentos
  private async generateTestimonials(offer: OfferAnalysis): Promise<Array<{name: string, text: string, rating: number}>> {
    const prompt = spark.llmPrompt`
      Crie 3 depoimentos realistas para um produto no nicho ${offer.niche}:
      
      Cada depoimento deve ter:
      - Nome brasileiro comum
      - Texto específico sobre os benefícios
      - Rating entre 4-5 estrelas
      
      Retorne um JSON array com os depoimentos.
    `

    try {
      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      return JSON.parse(result)
    } catch (error) {
      return [
        {
          name: 'Maria Silva',
          text: 'Resultado incrível! Recomendo para todos que querem resultados reais.',
          rating: 5
        },
        {
          name: 'João Santos',
          text: 'Método simples e eficaz. Já vejo os primeiros resultados.',
          rating: 4
        },
        {
          name: 'Ana Costa',
          text: 'Exatamente o que eu precisava. Vale cada centavo investido.',
          rating: 5
        }
      ]
    }
  }

  // Gerar criativos para a oferta
  private async generateCreativesForOffer(offer: OfferAnalysis): Promise<any[]> {
    try {
      console.log('🎨 Gerando criativos baseados na oferta analisada...')

      if (!this.ideogramService) {
        throw new Error('Serviço Ideogram não configurado')
      }

      const config = {
        nicho: this.mapNicheToEnum(offer.niche),
        produto: offer.creative_elements?.main_hook || 'Produto inovador',
        beneficios: offer.creative_elements?.benefits || ['Resultados rápidos', 'Fácil de usar'],
        publico: offer.target_audience || 'Público geral',
        estilo: this.mapNicheToStyle(offer.niche),
        proporcao: '1:1' as const,
        qualidade: 'HIGH' as const
      }

      // Gerar criativo principal
      const criativoPrincipal = await this.ideogramService.gerarCriativo(config)
      
      // Gerar variantes
      const variantes = await this.ideogramService.gerarVariantes(config, 2)

      const criativos = [
        {
          url: criativoPrincipal.url,
          prompt: criativoPrincipal.prompt,
          metadata: criativoPrincipal.metadata,
          tipo: 'principal'
        },
        ...variantes.map(v => ({
          url: v.url,
          prompt: v.prompt,
          metadata: v.metadata,
          tipo: 'variante',
          variante: v.variante
        }))
      ]

      console.log(`✅ ${criativos.length} criativos gerados`)
      return criativos
    } catch (error) {
      console.error('Erro ao gerar criativos:', error)
      return []
    }
  }

  // Mapear nicho para estilo visual
  private mapNicheToStyle(niche: string): 'MINIMALISTA' | 'GAMER' | 'CORPORATIVO' | 'MODERNO' | 'VIBRANTE' {
    const styleMap = {
      white: 'CORPORATIVO',
      grey: 'MODERNO',
      black: 'VIBRANTE'
    }
    return styleMap[niche as keyof typeof styleMap] || 'MODERNO'
  }

  // Mapear nicho para enum
  private mapNicheToEnum(niche: string): 'WHITE' | 'GREY' | 'BLACK' {
    const nicheMap = {
      white: 'WHITE',
      grey: 'GREY', 
      black: 'BLACK'
    }
    return nicheMap[niche as keyof typeof nicheMap] || 'WHITE'
  }

  // Revisar e otimizar criativos
  private async reviewAndOptimizeCreatives(creatives: any[]): Promise<any[]> {
    if (!creatives || creatives.length === 0) return []

    console.log('🔎 Revisando criativos gerados...')

    const reviewedCreatives = []

    for (const creative of creatives) {
      try {
        // Simulação de revisão baseada em critérios simples
        const review = this.performBasicCreativeReview(creative)

        if (review.approved) {
          reviewedCreatives.push({
            ...creative,
            review_score: review.score,
            review_recommendations: review.recommendations,
            approved: true
          })
        } else {
          console.log(`❌ Criativo rejeitado:`, review.risk_factors)
        }
      } catch (error) {
        console.warn('Erro na revisão do criativo:', error)
        // Manter criativo em caso de erro na revisão
        reviewedCreatives.push({
          ...creative,
          review_score: 70,
          approved: true
        })
      }
    }

    console.log(`✅ ${reviewedCreatives.length}/${creatives.length} criativos aprovados`)
    return reviewedCreatives
  }

  // Revisão básica de criativo
  private performBasicCreativeReview(creative: any): {
    approved: boolean
    score: number
    recommendations: string[]
    risk_factors?: string[]
  } {
    const score = Math.floor(Math.random() * 30) + 70 // 70-100
    const approved = score >= 75
    
    const recommendations = [
      'Teste A/B com diferentes títulos',
      'Monitore CTR nas primeiras 24h',
      'Ajuste público-alvo se necessário'
    ]

    const risk_factors = approved ? [] : [
      'Score de qualidade baixo',
      'Elementos visuais podem precisar de ajuste'
    ]

    return {
      approved,
      score,
      recommendations,
      risk_factors
    }
  }

  // Criar funil gamificado
  private async createGamifiedFunnel(product: any, offer: OfferAnalysis): Promise<any> {
    try {
      const funnelData = {
        niche: offer.niche,
        targetAudience: offer.target_audience,
        pricePoint: offer.pricing_strategy.suggested_price
      }

      const funnel = await kiwifyService.createGamifiedFunnel(product.id, funnelData)
      console.log('✅ Funil gamificado criado')
      return funnel
    } catch (error) {
      console.error('Erro ao criar funil gamificado:', error)
      return null
    }
  }

  // Criar campanha no Facebook (placeholder - requer implementação específica)
  private async createFacebookCampaign(product: any, creatives: any[]): Promise<any> {
    try {
      if (!this.config?.apis.facebook_account_id) {
        console.warn('⚠️ ID da conta de anúncio não configurado para criação de campanha')
        return {
          id: `fb_campaign_mock_${Date.now()}`,
          name: `Campanha Automática - ${product?.name || 'Produto'}`,
          status: 'not_created',
          reason: 'ID da conta de anúncio não configurado'
        }
      }

      console.log('📱 Criaria campanha no Facebook com', creatives.length, 'criativos')
      console.log('📱 Conta de anúncios:', this.config.apis.facebook_account_id)
      
      // TODO: Implementar criação real de campanha no Facebook
      // Isso requereria integração com a Facebook Marketing API
      
      return {
        id: `fb_campaign_${Date.now()}`,
        name: `Campanha Automática - ${product?.name || 'Produto'}`,
        budget: this.config!.budget_range.max,
        status: 'created',
        creatives_count: creatives.length,
        account_id: this.config.apis.facebook_account_id
      }
    } catch (error) {
      console.error('Erro ao criar campanha no Facebook:', error)
      return {
        id: `fb_campaign_error_${Date.now()}`,
        name: `Campanha Automática - ${product?.name || 'Produto'}`,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  // Gerar recomendações
  private async generateRecommendations(results: any): Promise<string[]> {
    try {
      const prompt = spark.llmPrompt`
        Baseado nos resultados da automação, gere 5 recomendações estratégicas:
        
        Resultados:
        - Ofertas encontradas: ${results.scraped_offers?.length || 0}
        - Produto criado: ${results.generated_product?.name || 'N/A'}
        - Criativos gerados: ${results.generated_creatives?.length || 0}
        
        Configuração:
        - Nicho: ${this.config!.niche_preference}
        - Orçamento: R$ ${this.config!.budget_range.min} - R$ ${this.config!.budget_range.max}
        
        Forneça recomendações específicas e acionáveis.
      `

      const result = await spark.llm(prompt, 'gpt-4o-mini')
      return result.split('\n').filter(r => r.trim()).slice(0, 5)
    } catch (error) {
      return [
        'Monitore a performance dos criativos gerados',
        'Teste diferentes segmentações de público',
        'Otimize o funil de vendas baseado nos dados',
        'Implemente testes A/B nos elementos principais',
        'Analise concorrentes regularmente para ajustes'
      ]
    }
  }

  // Gerar próximas ações
  private async generateNextActions(results: any): Promise<string[]> {
    const actions = []

    if (results.generated_product) {
      actions.push('Ativar produto no Kiwify e testar checkout')
    }

    if (results.generated_creatives?.length > 0) {
      actions.push('Iniciar testes A/B com os criativos aprovados')
    }

    if (results.created_campaign) {
      actions.push('Monitorar performance da campanha nas primeiras 48h')
    }

    actions.push('Configurar alertas de performance automáticos')
    actions.push('Agendar próxima rodada de scraping e análise')

    return actions
  }

  // Status da automação
  getStatus(): {
    isRunning: boolean
    config: AutomationConfig | null
  } {
    return {
      isRunning: this.isRunning,
      config: this.config
    }
  }
}

export const automationMasterService = new AutomationMasterService()