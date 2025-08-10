/**
 * Serviço para integração com a API do Kiwify
 * Responsável por criar produtos, checkout pages e gerenciar vendas
 */

export interface KiwifyProduct {
  id: string
  name: string
  price: number
  description: string
  status: 'active' | 'inactive'
  checkout_url: string
  created_at: string
  sales_count: number
  revenue: number
}

export interface CreateProductRequest {
  name: string
  price: number
  description: string
  category: 'ebook' | 'course' | 'software' | 'service'
  niche: 'white' | 'grey' | 'black'
  checkout_settings?: {
    headline?: string
    subheadline?: string
    bullet_points?: string[]
    testimonials?: Array<{
      name: string
      text: string
      rating: number
    }>
  }
}

export interface KiwifyCheckout {
  id: string
  product_id: string
  url: string
  conversion_rate: number
  views: number
  sales: number
}

interface KiwifyOAuthResponse {
  access_token: string
  token_type: string
  expires_in: string
  scope: string
}

interface KiwifyCredentials {
  client_id: string
  client_secret: string
}

class KiwifyService {
  private baseUrl = 'https://api.kiwify.com.br/v1'
  private oauthUrl = 'https://api.kiwify.com.br'
  private accessToken: string | null = null
  private credentials: KiwifyCredentials | null = null
  private tokenExpiresAt: number | null = null

  // Configurar credenciais OAuth
  setCredentials(client_id: string, client_secret: string) {
    this.credentials = { client_id, client_secret }
    // Limpar token antigo quando credenciais mudarem
    this.accessToken = null
    this.tokenExpiresAt = null
  }

  // Gerar token OAuth Bearer
  private async generateOAuthToken(): Promise<string> {
    if (!this.credentials) {
      throw new Error('Credenciais OAuth não configuradas')
    }

    try {
      console.log('🔑 Gerando token OAuth do Kiwify...')
      
      const formData = new URLSearchParams()
      formData.append('client_id', this.credentials.client_id)
      formData.append('client_secret', this.credentials.client_secret)

      const response = await fetch(`${this.oauthUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erro ${response.status}: ${errorText}`)
      }

      const oauthData: KiwifyOAuthResponse = await response.json()
      
      this.accessToken = oauthData.access_token
      // Calcular expiração (expires_in é em segundos)
      this.tokenExpiresAt = Date.now() + (parseInt(oauthData.expires_in) * 1000)
      
      console.log('✅ Token OAuth gerado com sucesso')
      console.log(`📊 Escopo disponível: ${oauthData.scope}`)
      
      return this.accessToken
    } catch (error) {
      console.error('❌ Erro ao gerar token OAuth:', error)
      throw error
    }
  }

  // Verificar e renovar token se necessário
  private async ensureValidToken(): Promise<string> {
    // Se não temos token ou ele expirou
    if (!this.accessToken || !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt) {
      return await this.generateOAuthToken()
    }
    
    return this.accessToken
  }

  // Testar conexão com OAuth
  async testConnection(): Promise<{ success: boolean; message: string; scope?: string }> {
    try {
      if (!this.credentials) {
        return { success: false, message: 'Credenciais OAuth não configuradas' }
      }

      console.log('🧪 Testando conexão OAuth com API Kiwify...')
      
      // Gerar token primeiro
      await this.ensureValidToken()
      
      // Tentar buscar informações da conta para testar
      const response = await this.request<any>('/account')
      
      if (response) {
        console.log('✅ Conexão Kiwify OAuth OK')
        return { 
          success: true, 
          message: 'Autenticação OAuth estabelecida com sucesso',
          scope: 'stats products events sales sales_refund financial affiliates webhooks'
        }
      } else {
        throw new Error('Resposta inválida da API')
      }
    } catch (error) {
      console.error('❌ Erro ao testar Kiwify OAuth:', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro de autenticação' 
      }
    }
  }

  // Método legado para compatibilidade (converte API key para credentials se necessário)
  setApiKey(key: string) {
    // Se receber uma string no formato "client_id:client_secret"
    if (key.includes(':')) {
      const [client_id, client_secret] = key.split(':')
      this.setCredentials(client_id, client_secret)
    } else {
      // Para compatibilidade, usar como client_id (usuário deve fornecer client_secret separadamente)
      console.warn('⚠️ Formato de API key legado. Use setCredentials(client_id, client_secret) para melhor segurança.')
      // Assumir que é o client_secret que foi fornecido
      this.credentials = { 
        client_id: '7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982',
        client_secret: key
      }
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.ensureValidToken()

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,  // OAuth Bearer Token
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      
      // Se token expirou, tentar renovar uma vez
      if (response.status === 401 && !options.headers?.['X-Retry']) {
        console.log('🔄 Token expirado, renovando...')
        this.accessToken = null
        this.tokenExpiresAt = null
        
        return this.request<T>(endpoint, {
          ...options,
          headers: {
            ...options.headers,
            'X-Retry': 'true'
          }
        })
      }
      
      throw new Error(`Erro na API Kiwify: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // Criar produto automaticamente
  async createProduct(productData: CreateProductRequest): Promise<KiwifyProduct> {
    try {
      console.log('🏭 Criando produto no Kiwify:', productData.name)

      // Gerar descrição otimizada se não fornecida
      if (!productData.description && productData.name) {
        productData.description = await this.generateProductDescription(
          productData.name, 
          productData.niche
        )
      }

      const response = await this.request<KiwifyProduct>('/products', {
        method: 'POST',
        body: JSON.stringify({
          product: {
            name: productData.name,
            price: productData.price,
            description: productData.description,
            category: productData.category,
            status: 'active',
            checkout_settings: productData.checkout_settings || {}
          }
        }),
      })

      console.log('✅ Produto criado com sucesso:', response.id)
      return response
    } catch (error) {
      console.error('❌ Erro ao criar produto:', error)
      throw error
    }
  }

  // Gerar descrição de produto usando IA
  private async generateProductDescription(name: string, niche: string): Promise<string> {
    try {
      const prompt = spark.llmPrompt`
        Crie uma descrição persuasiva e detalhada para um produto digital chamado "${name}" no nicho ${niche}.
        
        A descrição deve ter:
        - Título chamativo
        - Problema que resolve
        - Benefícios específicos
        - Proposta de valor única
        - Call to action
        
        Estilo: Copywriting brasileiro, persuasivo mas não agressivo.
        Tamanho: Entre 150-300 palavras.
      `
      
      return await spark.llm(prompt, 'gpt-4o-mini')
    } catch (error) {
      console.warn('Falha ao gerar descrição IA, usando padrão')
      return `${name} - Produto exclusivo que vai revolucionar sua estratégia no nicho ${niche}. Desenvolvido com base em análises de mercado e inteligência artificial.`
    }
  }

  // Criar página de checkout otimizada
  async createCheckoutPage(productId: string, optimizationData?: any): Promise<KiwifyCheckout> {
    try {
      const checkoutSettings = await this.generateCheckoutSettings(optimizationData)
      
      const response = await this.request<KiwifyCheckout>(`/products/${productId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          checkout: checkoutSettings
        }),
      })

      console.log('✅ Página de checkout criada:', response.url)
      return response
    } catch (error) {
      console.error('❌ Erro ao criar checkout:', error)
      throw error
    }
  }

  // Gerar configurações de checkout otimizadas
  private async generateCheckoutSettings(data?: any) {
    const prompt = spark.llmPrompt`
      Crie configurações otimizadas para uma página de checkout de produto digital:
      
      ${data ? `Dados para otimização: ${JSON.stringify(data)}` : ''}
      
      Retorne um JSON com:
      - headline: Título persuasivo
      - subheadline: Subtítulo explicativo
      - bullet_points: Array com 5-7 benefícios
      - scarcity_message: Mensagem de escassez
      - guarantee_text: Texto de garantia
      
      Estilo: Copywriting brasileiro, alta conversão.
    `
    
    try {
      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      return JSON.parse(result)
    } catch (error) {
      return {
        headline: 'Oferta Exclusiva - Por Tempo Limitado!',
        subheadline: 'Aproveite esta oportunidade única e transforme seus resultados',
        bullet_points: [
          'Conteúdo exclusivo e atualizado',
          'Acesso imediato após o pagamento',
          'Suporte especializado incluído',
          'Garantia de 7 dias',
          'Bônus especiais inclusos'
        ],
        scarcity_message: 'Apenas 100 vagas disponíveis',
        guarantee_text: 'Garantia incondicional de 7 dias ou seu dinheiro de volta'
      }
    }
  }

  // Listar todos os produtos
  async listProducts(): Promise<KiwifyProduct[]> {
    try {
      const response = await this.request<{ products: KiwifyProduct[] }>('/products')
      return response.products || []
    } catch (error) {
      console.error('❌ Erro ao listar produtos:', error)
      return []
    }
  }

  // Obter estatísticas de produto
  async getProductStats(productId: string): Promise<{
    views: number
    sales: number
    revenue: number
    conversion_rate: number
  }> {
    try {
      const response = await this.request<any>(`/products/${productId}/stats`)
      return {
        views: response.views || 0,
        sales: response.sales || 0,
        revenue: response.revenue || 0,
        conversion_rate: response.conversion_rate || 0
      }
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error)
      return { views: 0, sales: 0, revenue: 0, conversion_rate: 0 }
    }
  }

  // Criar funil gamificado
  async createGamifiedFunnel(productId: string, funnelData: {
    niche: string
    targetAudience: string
    pricePoint: number
  }): Promise<{
    landing_page_url: string
    thank_you_page_url: string
    upsell_url?: string
  }> {
    try {
      console.log('🎮 Criando funil gamificado para produto:', productId)

      // Gerar elementos gamificados
      const gamificationElements = await this.generateGamificationElements(funnelData)
      
      const response = await this.request<any>(`/products/${productId}/funnel`, {
        method: 'POST',
        body: JSON.stringify({
          funnel: {
            type: 'gamified',
            elements: gamificationElements,
            ...funnelData
          }
        }),
      })

      console.log('✅ Funil gamificado criado com sucesso')
      return response.urls
    } catch (error) {
      console.error('❌ Erro ao criar funil gamificado:', error)
      throw error
    }
  }

  private async generateGamificationElements(data: any) {
    const prompt = spark.llmPrompt`
      Crie elementos de gamificação para um funil de vendas:
      
      Nicho: ${data.niche}
      Público: ${data.targetAudience}
      Preço: R$ ${data.pricePoint}
      
      Elementos necessários:
      - progress_bars: Barras de progresso
      - rewards: Sistema de recompensas
      - challenges: Desafios/missões
      - achievements: Conquistas
      - timer_elements: Elementos de tempo/urgência
      
      Retorne um JSON estruturado.
    `
    
    try {
      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      return JSON.parse(result)
    } catch (error) {
      return {
        progress_bars: ['Progresso da oferta', 'Bônus desbloqueados'],
        rewards: ['Desconto progressivo', 'Bônus exclusivos'],
        challenges: ['Complete sua jornada', 'Desbloqueie todo o conteúdo'],
        achievements: ['Primeira compra', 'Acesso VIP'],
        timer_elements: ['Oferta expira em', 'Bônus limitado']
      }
    }
  }

  // Duplicar oferta de sucesso
  async duplicateSuccessfulOffer(originalProductId: string, modifications: {
    niche?: string
    priceAdjustment?: number
    targetAudience?: string
  }): Promise<KiwifyProduct> {
    try {
      console.log('🔄 Duplicando oferta de sucesso:', originalProductId)
      
      // Buscar dados do produto original
      const originalProduct = await this.request<KiwifyProduct>(`/products/${originalProductId}`)
      
      // Gerar modificações baseadas na análise de mercado
      const modifiedProduct = await this.generateModifiedProduct(originalProduct, modifications)
      
      // Criar novo produto
      const newProduct = await this.createProduct(modifiedProduct)
      
      console.log('✅ Oferta duplicada com sucesso:', newProduct.id)
      return newProduct
    } catch (error) {
      console.error('❌ Erro ao duplicar oferta:', error)
      throw error
    }
  }

  private async generateModifiedProduct(original: KiwifyProduct, modifications: any): Promise<CreateProductRequest> {
    const prompt = spark.llmPrompt`
      Modifique este produto para criar uma nova oferta otimizada:
      
      Produto Original:
      Nome: ${original.name}
      Preço: R$ ${original.price}
      Descrição: ${original.description}
      
      Modificações Solicitadas:
      ${JSON.stringify(modifications)}
      
      Crie uma nova versão com:
      - Nome modificado mas mantendo a essência
      - Preço ajustado conforme solicitado
      - Descrição adaptada para o novo nicho/público
      - Categoria apropriada
      
      Retorne um JSON com: name, price, description, category, niche
    `
    
    try {
      const result = await spark.llm(prompt, 'gpt-4o-mini', true)
      const parsed = JSON.parse(result)
      
      return {
        name: parsed.name,
        price: parsed.price,
        description: parsed.description,
        category: parsed.category || 'ebook',
        niche: parsed.niche || 'white'
      }
    } catch (error) {
      console.error('Erro ao gerar produto modificado, usando dados padrão')
      
      return {
        name: `${original.name} - Nova Versão`,
        price: modifications.priceAdjustment 
          ? original.price + modifications.priceAdjustment 
          : original.price,
        description: original.description,
        category: 'ebook',
        niche: modifications.niche || 'white'
      }
    }
  }
}

export const kiwifyService = new KiwifyService()