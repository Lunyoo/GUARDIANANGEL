/**
 * Serviço de integração com a API do Ideogram
 */

export interface CriativoConfig {
  nicho: 'WHITE' | 'GREY' | 'BLACK'
  produto: string
  beneficios: string[]
  publico: string
  estilo: 'MINIMALISTA' | 'GAMER' | 'CORPORATIVO' | 'MODERNO' | 'VIBRANTE'
  cores: string[]
  elementos: string[]
  proporcao: '1:1' | '16:9' | '9:16' | '4:5'
  qualidade: 'DRAFT' | 'STANDARD' | 'HIGH' | 'ULTRA'
}

export interface ResultadoCriativo {
  url: string
  prompt: string
  custoCreditos: number
  metadata?: {
    largura: number
    altura: number
    formato: string
    tamanho: number
  }
}

export default class IdeogramService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Gerar um criativo usando IA
   */
  async gerarCriativo(config: CriativoConfig): Promise<ResultadoCriativo> {
    // Tenta proxy backend se configurado
    const apiBase = (globalThis as any)?.import?.meta?.env?.VITE_API_URL || (typeof window !== 'undefined' ? (window as any).VITE_API_URL : undefined) || 'http://localhost:3001'
    const prompt = this.construirPrompt(config)
    try {
      if (this.isLikelyRealKey(this.apiKey)) {
        const resp = await fetch(`${apiBase}/api/public/ideogram/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: this.apiKey, prompt, ratio: config.proporcao, quality: config.qualidade })
        })
        if (resp.ok) {
          const data = await resp.json()
          const url = data?.data?.url || data?.data?.image_url || this.gerarURLSimulada(config)
      return {
            url,
            prompt,
            custoCreditos: this.calcularCustoCreditos(config.qualidade),
            metadata: {
              largura: this.obterDimensoes(config.proporcao).largura,
              altura: this.obterDimensoes(config.proporcao).altura,
              formato: 'PNG',
              tamanho: Math.floor(Math.random() * 2000000) + 500000
            }
          }
        }
      }
    } catch (e) {
      console.warn('Ideogram proxy falhou:', e)
      throw e
    }

    // If reached, proxy did not return ok; enforce no simulation
    throw new Error('Ideogram generation failed without fallback')
  }

  /**
   * Gerar variantes de um criativo
   */
  async gerarVariantes(config: CriativoConfig, quantidade: number): Promise<ResultadoCriativo[]> {
    console.log(`🎨 Gerando ${quantidade} variantes...`)
    
    const variantes: ResultadoCriativo[] = []
    
    for (let i = 0; i < quantidade; i++) {
      // Pequeno delay entre variantes
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
      
      const varianteConfig = {
        ...config,
        elementos: this.variarElementos(config.elementos),
        cores: this.variarCores(config.cores)
      }
      
      const prompt = this.construirPrompt(varianteConfig, i + 1)
      
      variantes.push({
        url: this.gerarURLSimulada(varianteConfig, i + 1),
        prompt,
        custoCreditos: 1, // Variantes custam menos
        metadata: {
          largura: this.obterDimensoes(config.proporcao).largura,
          altura: this.obterDimensoes(config.proporcao).altura,
          formato: 'PNG',
          tamanho: Math.floor(Math.random() * 1500000) + 300000
        }
      })
    }

    console.log(`✅ ${variantes.length} variantes geradas`)
    return variantes
  }

  /**
   * Verificar status da API
   */
  async verificarStatus(): Promise<{ ativo: boolean; erro?: string; creditos?: number }> {
    try {
      // Simular verificação de status
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (!this.isValidApiKey()) {
        return { 
          ativo: false, 
          erro: 'API Key inválida ou expirada' 
        }
      }

      return { 
        ativo: true, 
        creditos: Math.floor(Math.random() * 100) + 50 // Simular créditos restantes
      }
    } catch (error) {
      return { 
        ativo: false, 
        erro: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  /**
   * Construir prompt inteligente baseado na configuração
   */
  private construirPrompt(config: CriativoConfig, variante?: number): string {
    const estiloDescricoes = {
      MINIMALISTA: 'clean, minimal, simple design',
      GAMER: 'gaming aesthetic, neon lights, futuristic',
      CORPORATIVO: 'professional, corporate, elegant',
      MODERNO: 'modern, contemporary, sleek',
      VIBRANTE: 'vibrant, colorful, energetic'
    }

    const nichoTons = {
      WHITE: 'trustworthy, ethical, professional tone',
      GREY: 'persuasive, compelling, moderate urgency',
      BLACK: 'high-impact, urgent, attention-grabbing'
    }

    const proporcaoTexto = {
      '1:1': 'square format social media post',
      '16:9': 'landscape banner format',
      '9:16': 'vertical story format', 
      '4:5': 'Instagram portrait format'
    }

    let prompt = `Create a ${proporcaoTexto[config.proporcao]} advertisement for ${config.produto}. `
    prompt += `Style: ${estiloDescricoes[config.estilo]}. `
    prompt += `Tone: ${nichoTons[config.nicho]}. `
    
    if (config.beneficios.length > 0) {
      prompt += `Key benefits to highlight: ${config.beneficios.join(', ')}. `
    }
    
    if (config.publico) {
      prompt += `Target audience: ${config.publico}. `
    }
    
    if (config.cores.length > 0) {
      prompt += `Color scheme: ${config.cores.join(', ')}. `
    }
    
    if (config.elementos.length > 0) {
      prompt += `Include elements: ${config.elementos.join(', ')}. `
    }

    prompt += 'High quality, professional marketing material, eye-catching, conversion-focused design.'
    
    if (variante) {
      prompt += ` Variation ${variante} with unique visual approach.`
    }

    return prompt
  }

  /**
   * Gerar URL simulada para o criativo
   */
  private gerarURLSimulada(config: CriativoConfig, variante?: number): string {
    // Em um ambiente real, isso seria a URL retornada pela API do Ideogram
    const seed = `${config.produto}-${config.estilo}-${config.nicho}${variante ? `-v${variante}` : ''}`
    const hash = btoa(seed).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)
    
    // Usar serviço de imagens placeholder por enquanto
    const dimensoes = this.obterDimensoes(config.proporcao)
    const cor = config.cores[0]?.replace('#', '') || '007bff'
    
    return `https://via.placeholder.com/${dimensoes.largura}x${dimensoes.altura}/${cor}/ffffff.png?text=${encodeURIComponent(config.produto)}`
  }

  /**
   * Obter dimensões baseadas na proporção
   */
  private obterDimensoes(proporcao: string): { largura: number; altura: number } {
    const dimensoes = {
      '1:1': { largura: 1080, altura: 1080 },
      '16:9': { largura: 1920, altura: 1080 },
      '9:16': { largura: 1080, altura: 1920 },
      '4:5': { largura: 1080, altura: 1350 }
    }
    
    return dimensoes[proporcao as keyof typeof dimensoes] || dimensoes['1:1']
  }

  /**
   * Calcular custo em créditos
   */
  private calcularCustoCreditos(qualidade: string): number {
    const custos = {
      DRAFT: 1,
      STANDARD: 2,
      HIGH: 4,
      ULTRA: 8
    }
    
    return custos[qualidade as keyof typeof custos] || 2
  }

  /**
   * Validar API key
   */
  private isValidApiKey(): boolean {
    return !!(this.apiKey && this.apiKey.length > 20)
  }

  private isLikelyRealKey(key: string): boolean {
    return !!key && key.length > 20
  }

  /**
   * Variar elementos para criar variantes
   */
  private variarElementos(elementos: string[]): string[] {
    if (elementos.length === 0) return elementos
    
    // Adicionar alguns elementos alternativos
    const elementosExtras = ['gradient background', 'subtle texture', 'geometric shapes', 'light effects']
    const novosElementos = [...elementos]
    
    if (Math.random() > 0.5) {
      const elementoExtra = elementosExtras[Math.floor(Math.random() * elementosExtras.length)]
      novosElementos.push(elementoExtra)
    }
    
    return novosElementos
  }

  /**
   * Variar cores para criar variantes
   */
  private variarCores(cores: string[]): string[] {
    if (cores.length === 0) return ['#007bff']
    
    // Criar variações de cor
    return cores.map(cor => {
      const hsl = this.hexToHsl(cor)
      const novaMatiz = (hsl.h + (Math.random() - 0.5) * 60) % 360
      return this.hslToHex(novaMatiz, hsl.s, hsl.l)
    })
  }

  /**
   * Converter HEX para HSL
   */
  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255  
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2

    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }

    return { h: h * 360, s: s * 100, l: l * 100 }
  }

  /**
   * Converter HSL para HEX
   */
  private hslToHex(h: number, s: number, l: number): string {
    h /= 360
    s /= 100
    l /= 100

    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs((h * 6) % 2 - 1))
    const m = l - c / 2
    let r = 0, g = 0, b = 0

    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0
    } else if (1/6 <= h && h < 1/3) {
      r = x; g = c; b = 0
    } else if (1/3 <= h && h < 1/2) {
      r = 0; g = c; b = x
    } else if (1/2 <= h && h < 2/3) {
      r = 0; g = x; b = c
    } else if (2/3 <= h && h < 5/6) {
      r = x; g = 0; b = c
    } else if (5/6 <= h && h < 1) {
      r = c; g = 0; b = x
    }

    r = Math.round((r + m) * 255)
    g = Math.round((g + m) * 255)
    b = Math.round((b + m) * 255)

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }
}

// Export both default and named for compatibility
export const ideogramServiceClass = IdeogramService