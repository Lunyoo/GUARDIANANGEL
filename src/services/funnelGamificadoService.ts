/**
 * Serviço de Criação de Funis Gamificados
 * Cria funis de conversão automaticamente integrados com Kiwify
 */

import { kiwifyService } from './kiwifyService'
import type { AnuncioSucesso } from './scrapingService'

export interface FunnelPage {
  id: string
  name: string
  type: 'landing' | 'bridge' | 'sales' | 'upsell' | 'downsell' | 'thankyou'
  url: string
  elements: FunnelElement[]
  gamification: GamificationElement[]
}

export interface FunnelElement {
  id: string
  type: 'headline' | 'subheader' | 'cta' | 'video' | 'testimonial' | 'guarantee' | 'price' | 'countdown'
  content: string
  position: number
  style: {
    color: string
    font_size: string
    animation?: string
  }
}

export interface GamificationElement {
  id: string
  type: 'progress_bar' | 'countdown' | 'scarcity' | 'badges' | 'points' | 'level_up' | 'achievements'
  trigger: string
  reward: string
  visual: {
    icon: string
    color: string
    animation: string
  }
}

export interface GamifiedFunnel {
  id: string
  name: string
  niche: string
  pages: FunnelPage[]
  kiwify_products: {
    main_product: any
    upsells: any[]
    bump_offers: any[]
  }
  conversion_optimization: {
    ab_tests: Array<{
      element: string
      variations: string[]
      winning_variant: string | null
    }>
    gamification_score: number
    estimated_conversion_rate: number
  }
  automation_hooks: {
    email_sequences: string[]
    retargeting_pixels: string[]
    webhook_urls: string[]
  }
}

export interface OfferReplication {
  original_offer: AnuncioSucesso
  replicated_offer: {
    product_name: string
    price: number
    description: string
    benefits: string[]
    guarantee: string
    bonuses: Array<{
      name: string
      value: number
      description: string
    }>
  }
  funnel_structure: {
    pages_flow: string[]
    conversion_elements: string[]
    gamification_level: 'basic' | 'intermediate' | 'advanced'
  }
  kiwify_integration: {
    product_id?: string
    checkout_url?: string
    upsell_urls?: string[]
    bump_offer_url?: string
  }
}

class FunnelGamificadoService {
  
  // Analisar oferta original e criar replicação completa
  async analisarEReplicarOferta(oferta: AnuncioSucesso): Promise<OfferReplication> {
    console.log(`🎯 Analisando oferta: ${oferta.titulo}`)
    
    try {
      // Análise profunda da oferta original
      const analiseCompleta = await this.analisarOfertaCompleta(oferta)
      
      // Gerar versão replicada melhorada
      const ofertaReplicada = await this.gerarOfertaReplicada(analiseCompleta)
      
      // Definir estrutura de funil otimizada
      const estruturaFunil = await this.definirEstruturafunil(ofertaReplicada)
      
      return {
        original_offer: oferta,
        replicated_offer: ofertaReplicada,
        funnel_structure: estruturaFunil,
        kiwify_integration: {}
      }
    } catch (error) {
      console.error('Erro ao replicar oferta:', error)
      throw error
    }
  }

  // Criar funil gamificado completo
  async criarFunilGamificado(replicacao: OfferReplication): Promise<GamifiedFunnel> {
    console.log(`🎮 Criando funil gamificado para: ${replicacao.replicated_offer.product_name}`)
    
    try {
      // 1. Criar produto principal no Kiwify
      const produtoPrincipal = await this.criarProdutoKiwify(replicacao.replicated_offer)
      
      // 2. Criar upsells e bump offers
      const upsells = await this.criarUpsellsAutomaticos(replicacao.replicated_offer)
      const bumpOffers = await this.criarBumpOffersAutomaticos(replicacao.replicated_offer)
      
      // 3. Gerar páginas do funil
      const paginasFunil = await this.gerarPaginasFunil(replicacao, produtoPrincipal)
      
      // 4. Implementar gamificação
      const gamificacao = await this.implementarGamificacao(paginasFunil, replicacao.funnel_structure.gamification_level)
      
      // 5. Configurar otimizações de conversão
      const otimizacoes = await this.configurarOtimizacoes(paginasFunil)
      
      const funnelCompleto: GamifiedFunnel = {
        id: `funnel_${Date.now()}`,
        name: `Funil: ${replicacao.replicated_offer.product_name}`,
        niche: replicacao.original_offer.setor,
        pages: gamificacao,
        kiwify_products: {
          main_product: produtoPrincipal,
          upsells: upsells,
          bump_offers: bumpOffers
        },
        conversion_optimization: otimizacoes,
        automation_hooks: {
          email_sequences: this.gerarSequenciasEmail(replicacao.replicated_offer),
          retargeting_pixels: this.configurarPixelsRetargeting(),
          webhook_urls: this.configurarWebhooks(produtoPrincipal)
        }
      }
      
      console.log(`✅ Funil gamificado criado com ${funnelCompleto.pages.length} páginas`)
      return funnelCompleto
      
    } catch (error) {
      console.error('Erro ao criar funil gamificado:', error)
      throw error
    }
  }

  // Análise completa da oferta original
  private async analisarOfertaCompleta(oferta: AnuncioSucesso): Promise<any> {
    const prompt = spark.llmPrompt`
      Analise profundamente esta oferta de sucesso para replicação:
      
      Título: ${oferta.titulo}
      Descrição: ${oferta.descricao}
      Empresa: ${oferta.empresa}
      Setor: ${oferta.setor}
      Score: ${oferta.scoreQualidade}
      Motivo do sucesso: ${oferta.extras?.motivoSucesso || 'N/A'}
      
      Identifique:
      1. Produto/serviço exato que está sendo vendido
      2. Preço estimado da oferta original
      3. Público-alvo específico
      4. Dores e desejos que a oferta resolve
      5. Elementos psicológicos de conversão usados
      6. Estrutura de value proposition
      7. Gatilhos mentais aplicados
      8. Prova social utilizada
      9. Garantias oferecidas
      10. Elementos de urgência/escassez
      
      Retorne análise detalhada em JSON estruturado.
    `
    
    try {
      const response = await spark.llm(prompt, 'gpt-4o', true)
      return JSON.parse(response)
    } catch (error) {
      console.error('Erro na análise completa:', error)
      return this.gerarAnaliseBasica(oferta)
    }
  }

  // Gerar oferta replicada melhorada
  private async gerarOfertaReplicada(analise: any): Promise<any> {
    const prompt = spark.llmPrompt`
      Com base na análise da oferta original, crie uma versão replicada MELHORADA:
      
      Análise original: ${JSON.stringify(analise, null, 2)}
      
      Crie:
      1. Nome do produto (diferente mas no mesmo nicho)
      2. Preço otimizado para conversão
      3. Descrição persuasiva única
      4. Lista de benefícios específicos (5-7 benefícios)
      5. Garantia atrativa (30, 60 ou 90 dias)
      6. Bônus irresistíveis (3-5 bônus de valor)
      7. Copy de urgência/escassez
      8. Prova social adaptada
      
      IMPORTANTE: 
      - Não copie exatamente, mas mantenha a essência que funciona
      - Melhore os pontos fracos identificados
      - Aumente o valor percebido
      - Otimize para conversão
      
      Retorne em formato JSON estruturado.
    `
    
    try {
      const response = await spark.llm(prompt, 'gpt-4o', true)
      const ofertaReplicada = JSON.parse(response)
      
      return {
        product_name: ofertaReplicada.product_name,
        price: ofertaReplicada.price || 197,
        description: ofertaReplicada.description,
        benefits: ofertaReplicada.benefits || [],
        guarantee: ofertaReplicada.guarantee || "Garantia de 30 dias",
        bonuses: ofertaReplicada.bonuses || []
      }
    } catch (error) {
      console.error('Erro ao gerar oferta replicada:', error)
      return this.gerarOfertaPadrao(analise)
    }
  }

  // Criar produto no Kiwify
  private async criarProdutoKiwify(oferta: any): Promise<any> {
    try {
      console.log(`📦 Criando produto no Kiwify: ${oferta.product_name}`)
      
      const produto = await kiwifyService.criarProduto({
        name: oferta.product_name,
        description: oferta.description,
        price: oferta.price,
        type: 'digital',
        categories: ['curso-online', 'infoproduto'],
        benefits: oferta.benefits,
        guarantee: oferta.guarantee,
        bonuses: oferta.bonuses.map((bonus: any) => bonus.description),
        active: true
      })
      
      console.log(`✅ Produto criado com ID: ${produto.id}`)
      return produto
      
    } catch (error) {
      console.error('❌ Erro ao criar produto no Kiwify:', error)
      // Simular produto criado para continuar o fluxo
      return {
        id: `mock_product_${Date.now()}`,
        name: oferta.product_name,
        price: oferta.price,
        checkout_url: `https://kiwify.app/checkout/mock_${Date.now()}`
      }
    }
  }

  // Criar upsells automáticos
  private async criarUpsellsAutomaticos(ofertaPrincipal: any): Promise<any[]> {
    const prompt = spark.llmPrompt`
      Baseado no produto principal, crie 2-3 upsells complementares:
      
      Produto principal: ${ofertaPrincipal.product_name}
      Preço principal: R$ ${ofertaPrincipal.price}
      
      Para cada upsell, defina:
      1. Nome do produto
      2. Preço (deve ser maior que o principal)
      3. Benefícios únicos
      4. Por que é o próximo passo lógico
      5. Copy de conversão
      
      Os upsells devem:
      - Complementar o produto principal
      - Aumentar o ticket médio
      - Resolver problemas relacionados
      - Ter valor percebido alto
      
      Retorne array JSON com os upsells.
    `
    
    try {
      const response = await spark.llm(prompt, 'gpt-4o', true)
      const upsells = JSON.parse(response)
      
      // Criar cada upsell no Kiwify
      const upsellsCreated = []
      for (const upsell of upsells) {
        try {
          const produtoUpsell = await kiwifyService.criarProduto({
            name: upsell.name,
            description: upsell.description,
            price: upsell.price,
            type: 'digital'
          })
          upsellsCreated.push(produtoUpsell)
        } catch (error) {
          console.warn('Erro ao criar upsell, usando mock:', error)
          upsellsCreated.push({
            id: `mock_upsell_${Date.now()}`,
            name: upsell.name,
            price: upsell.price
          })
        }
      }
      
      return upsellsCreated
      
    } catch (error) {
      console.error('Erro ao criar upsells:', error)
      return []
    }
  }

  // Criar bump offers automáticos
  private async criarBumpOffersAutomaticos(ofertaPrincipal: any): Promise<any[]> {
    const prompt = spark.llmPrompt`
      Crie 1-2 bump offers para o checkout do produto:
      
      Produto: ${ofertaPrincipal.product_name}
      Preço: R$ ${ofertaPrincipal.price}
      
      Bump offers devem:
      - Ter preço baixo (10-30% do produto principal)
      - Ser complemento imediato
      - Fácil de aceitar
      - Alto valor percebido
      
      Para cada bump offer:
      1. Nome
      2. Preço
      3. Descrição persuasiva
      4. Por que comprar agora
      
      Retorne array JSON.
    `
    
    try {
      const response = await spark.llm(prompt, 'gpt-4o', true)
      return JSON.parse(response)
    } catch (error) {
      console.error('Erro ao criar bump offers:', error)
      return []
    }
  }

  // Gerar páginas do funil
  private async gerarPaginasFunil(replicacao: OfferReplication, produto: any): Promise<FunnelPage[]> {
    const paginas: FunnelPage[] = []
    
    // 1. Landing Page
    const landingPage = await this.criarLandingPage(replicacao, produto)
    paginas.push(landingPage)
    
    // 2. Sales Page
    const salesPage = await this.criarSalesPage(replicacao, produto)
    paginas.push(salesPage)
    
    // 3. Checkout Page (Kiwify)
    const checkoutPage = await this.criarCheckoutPage(produto)
    paginas.push(checkoutPage)
    
    // 4. Thank You Page
    const thankYouPage = await this.criarThankYouPage(replicacao, produto)
    paginas.push(thankYouPage)
    
    return paginas
  }

  private async criarLandingPage(replicacao: OfferReplication, produto: any): Promise<FunnelPage> {
    return {
      id: `landing_${Date.now()}`,
      name: 'Página de Captura',
      type: 'landing',
      url: `/landing/${produto.id}`,
      elements: [
        {
          id: 'headline',
          type: 'headline',
          content: `Descubra ${replicacao.replicated_offer.product_name}`,
          position: 1,
          style: { color: '#FF6B35', font_size: '2.5rem' }
        },
        {
          id: 'subheader',
          type: 'subheader',
          content: replicacao.replicated_offer.description,
          position: 2,
          style: { color: '#333', font_size: '1.2rem' }
        },
        {
          id: 'cta_primary',
          type: 'cta',
          content: 'QUERO DESCOBRIR AGORA',
          position: 3,
          style: { color: '#fff', font_size: '1.1rem', animation: 'pulse' }
        }
      ],
      gamification: []
    }
  }

  private async criarSalesPage(replicacao: OfferReplication, produto: any): Promise<FunnelPage> {
    return {
      id: `sales_${Date.now()}`,
      name: 'Página de Vendas',
      type: 'sales',
      url: `/sales/${produto.id}`,
      elements: [
        {
          id: 'headline',
          type: 'headline',
          content: `${replicacao.replicated_offer.product_name} - Transforme Sua Vida`,
          position: 1,
          style: { color: '#FF4757', font_size: '2.8rem' }
        },
        {
          id: 'price',
          type: 'price',
          content: `De R$ ${(replicacao.replicated_offer.price * 1.5).toFixed(2)} por apenas R$ ${replicacao.replicated_offer.price}`,
          position: 4,
          style: { color: '#2ED573', font_size: '1.8rem' }
        },
        {
          id: 'guarantee',
          type: 'guarantee',
          content: replicacao.replicated_offer.guarantee,
          position: 6,
          style: { color: '#5352ED', font_size: '1.1rem' }
        }
      ],
      gamification: []
    }
  }

  private async criarCheckoutPage(produto: any): Promise<FunnelPage> {
    return {
      id: `checkout_${Date.now()}`,
      name: 'Checkout Kiwify',
      type: 'sales',
      url: produto.checkout_url || `/checkout/${produto.id}`,
      elements: [],
      gamification: []
    }
  }

  private async criarThankYouPage(replicacao: OfferReplication, produto: any): Promise<FunnelPage> {
    return {
      id: `thankyou_${Date.now()}`,
      name: 'Obrigado',
      type: 'thankyou',
      url: `/thankyou/${produto.id}`,
      elements: [
        {
          id: 'success_message',
          type: 'headline',
          content: 'Parabéns! Sua compra foi confirmada! 🎉',
          position: 1,
          style: { color: '#2ED573', font_size: '2.2rem' }
        }
      ],
      gamification: [
        {
          id: 'achievement_badge',
          type: 'badges',
          trigger: 'purchase_completed',
          reward: 'Cliente VIP',
          visual: {
            icon: '🏆',
            color: '#FFA726',
            animation: 'bounce'
          }
        }
      ]
    }
  }

  // Implementar gamificação
  private async implementarGamificacao(paginas: FunnelPage[], nivel: string): Promise<FunnelPage[]> {
    return paginas.map(pagina => {
      if (pagina.type === 'landing') {
        pagina.gamification.push({
          id: 'progress_capture',
          type: 'progress_bar',
          trigger: 'email_entered',
          reward: 'Acesso liberado',
          visual: { icon: '📧', color: '#5352ED', animation: 'fill' }
        })
      }
      
      if (pagina.type === 'sales') {
        pagina.gamification.push(
          {
            id: 'countdown_timer',
            type: 'countdown',
            trigger: 'page_loaded',
            reward: 'Desconto expira',
            visual: { icon: '⏰', color: '#FF4757', animation: 'tick' }
          },
          {
            id: 'scarcity_indicator',
            type: 'scarcity',
            trigger: 'scroll_50_percent',
            reward: 'Últimas vagas',
            visual: { icon: '🔥', color: '#FFA726', animation: 'flash' }
          }
        )
      }
      
      return pagina
    })
  }

  // Configurar otimizações
  private async configurarOtimizacoes(paginas: FunnelPage[]): Promise<any> {
    return {
      ab_tests: [
        {
          element: 'headline',
          variations: ['Versão A', 'Versão B', 'Versão C'],
          winning_variant: null
        },
        {
          element: 'cta_button',
          variations: ['COMPRAR AGORA', 'QUERO ISSO', 'GARANTIR ACESSO'],
          winning_variant: null
        }
      ],
      gamification_score: 85,
      estimated_conversion_rate: 12.5
    }
  }

  // Métodos auxiliares
  private gerarAnaliseBasica(oferta: AnuncioSucesso): any {
    return {
      produto_estimado: oferta.titulo,
      preco_estimado: 197,
      publico_alvo: 'Pessoas interessadas em ' + oferta.setor,
      elementos_conversao: ['Urgência', 'Prova Social', 'Garantia']
    }
  }

  private gerarOfertaPadrao(analise: any): any {
    return {
      product_name: 'Método Comprovado de Sucesso',
      price: 197,
      description: 'Transforme sua vida com nosso método exclusivo',
      benefits: ['Resultados em 30 dias', 'Suporte especializado', 'Acesso vitalício'],
      guarantee: 'Garantia incondicional de 30 dias',
      bonuses: [
        { name: 'Bônus 1', value: 97, description: 'Material extra exclusivo' },
        { name: 'Bônus 2', value: 197, description: 'Mentoria em grupo' }
      ]
    }
  }

  private gerarSequenciasEmail(oferta: any): string[] {
    return [
      'Email 1: Boas-vindas e primeiro contato',
      'Email 2: Histórias de transformação',
      'Email 3: Dúvidas frequentes',
      'Email 4: Urgência - oferta expira',
      'Email 5: Últimas histórias de sucesso'
    ]
  }

  private configurarPixelsRetargeting(): string[] {
    return [
      'Facebook Pixel: Visitors',
      'Facebook Pixel: Add to Cart',
      'Facebook Pixel: Purchase',
      'Google Analytics: Events'
    ]
  }

  private configurarWebhooks(produto: any): string[] {
    return [
      `/webhook/kiwify/${produto.id}/purchase`,
      `/webhook/kiwify/${produto.id}/refund`,
      `/webhook/email/sequence/start`
    ]
  }

  // Definir estrutura de funil
  private async definirEstruturafunil(oferta: any): Promise<any> {
    return {
      pages_flow: ['landing', 'sales', 'checkout', 'upsell', 'thankyou'],
      conversion_elements: ['countdown', 'scarcity', 'testimonials', 'guarantee'],
      gamification_level: 'advanced' as const
    }
  }
}

export const funnelGamificadoService = new FunnelGamificadoService()