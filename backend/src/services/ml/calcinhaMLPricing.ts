import { universalBandits } from '../ml/universalBandits.js'
import type { BanditContext } from '../ml/universalBandits.js'

interface CalcinhaVariant {
  color: 'bege' | 'preta'
  kit: 1 | 2 | 3 | 4 | 6
  price: number
  originalPrice: number
  sku: string
}

interface CustomerProfile {
  phone: string
  location: string
  previousPurchases?: number
  campaignSource?: string
  timeOnSite?: number
  interactions?: number
}

export class CalcinhaMLPricing {
  // Opções de preço REAIS para cada quantidade - ML escolhe entre elas
  private priceOptions = {
    1: [89.9, 97.0],           // Kit 1 unidade: 2 opções de preço
    2: [119.9, 129.9, 139.9, 147.0],  // Kit 2 unidades: 4 opções de preço
    3: [159.9, 169.9, 179.9, 187.0],  // Kit 3 unidades: 4 opções de preço
    4: [239.9],                // Kit 4 unidades: 1 opção
    6: [359.9]                 // Kit 6 unidades: 1 opção
  }
  
  // Metadados dos kits com preços originais estimados
  private kitData = {
    1: { originalPrice: 129.9, sku: "LIPO-1UN", description: "1 Calcinha Modeladora" },
    2: { originalPrice: 199.9, sku: "LIPO-2UN", description: "Kit 2 Calcinhas Modeladoras" },
    3: { originalPrice: 259.9, sku: "LIPO-3UN", description: "Kit 3 Calcinhas Modeladoras" },
    4: { originalPrice: 319.9, sku: "LIPO-4UN", description: "Kit 4 Calcinhas Modeladoras" },
    6: { originalPrice: 479.9, sku: "LIPO-6UN", description: "Kit 6 Calcinhas Modeladoras" }
  }

  constructor() {
    // Não precisa inicializar nada, usa o singleton global
  }

  /**
   * Calcula preço inteligente baseado no perfil do cliente
   */
  async getSmartPrice(
    kit: 1 | 2 | 3 | 4 | 6, 
    customerProfile: CustomerProfile,
    campaignId?: string
  ): Promise<{
    price: number
    originalPrice: number
    discount: number
    reasoning: string
    variant: CalcinhaVariant
    availablePrices: number[]
    selectedIndex: number
  }> {
    try {
      // Contexto para ML
      const context: BanditContext = {
        customerProfile: customerProfile.previousPurchases ? 'returning' : 'new',
        city: customerProfile.location.split(' - ')[0] || customerProfile.location,
        hasCodeDelivery: true, // calcinha tem COD
        timeOfDay: this.getTimeOfDay(),
        dayOfWeek: this.getDayOfWeek(),
        conversationStage: 'presenting',
        messageCount: 1,
        trafficSource: campaignId ? 'ads' : 'organic'
      }

      // Usar ML para selecionar preço
      const priceOptions = this.priceOptions[kit]
      const selectedArm = universalBandits.selectBestArm('pricing', context)
      
      // Mapear arm para preço
      const selectedPriceIndex = Math.abs(selectedArm.id.charCodeAt(0)) % priceOptions.length
      const selectedPrice = priceOptions[selectedPriceIndex]
      
      const originalPrice = this.kitData[kit].originalPrice
      const discount = Math.round(((originalPrice - selectedPrice) / originalPrice) * 100)

      // Cor baseada em preferência regional (exemplo)
      const preferredColor = this.getPreferredColorByRegion(customerProfile.location)

      const variant: CalcinhaVariant = {
        color: preferredColor,
        kit,
        price: selectedPrice,
        originalPrice,
        sku: `${this.kitData[kit].sku}-${preferredColor.toUpperCase()}`
      }

      // Reasoning para transparência
      const reasoning = this.generatePriceReasoning(selectedPrice, originalPrice, customerProfile, context)

      // Registrar uso do arm
      universalBandits.recordResult(selectedArm.id, {
        conversion: false, // Será atualizado quando houver venda real
        revenue: selectedPrice,
        responseTime: 1000
      })

      return {
        price: selectedPrice,
        originalPrice,
        discount,
        reasoning,
        variant,
        availablePrices: priceOptions,
        selectedIndex: selectedPriceIndex
      }

    } catch (error) {
      console.error('❌ Erro no ML pricing:', error)
      
      // Fallback para preço padrão
      const fallbackPrice = this.priceOptions[kit][0] // Primeiro preço disponível
      return {
        price: fallbackPrice,
        originalPrice: this.kitData[kit].originalPrice,
        discount: Math.round(((this.kitData[kit].originalPrice - fallbackPrice) / this.kitData[kit].originalPrice) * 100),
        reasoning: "Preço padrão aplicado",
        variant: {
          color: 'bege',
          kit,
          price: fallbackPrice,
          originalPrice: this.kitData[kit].originalPrice,
          sku: `${this.kitData[kit].sku}-BEGE`
        },
        availablePrices: this.priceOptions[kit],
        selectedIndex: 0
      }
    }
  }

    /**
   * Cor preferida baseada na região
   */
  private getPreferredColorByRegion(location: string): 'bege' | 'preta' {
    const prefs = {
      'SP': 'bege', 'RJ': 'preta', 'MG': 'bege', 'RS': 'preta',
      'PE': 'preta', 'BA': 'preta', 'GO': 'bege', 'CE': 'preta'
    }
    
    const state = location.split(' - ')[1] || location.substring(location.length - 2).toUpperCase()
    const color = prefs[state as keyof typeof prefs]
    return (color as 'bege' | 'preta') || 'bege'
  }

  /**
   * Obter hora do dia
   */
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours()
    if (hour < 6) return 'night'
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  /**
   * Obter dia da semana
   */
  private getDayOfWeek(): 'weekday' | 'weekend' {
    const day = new Date().getDay()
    return (day === 0 || day === 6) ? 'weekend' : 'weekday'
  }

  /**
   * Gera explicação do preço para transparência
   */
  private generatePriceReasoning(
    price: number, 
    originalPrice: number, 
    customerProfile: CustomerProfile,
    context: any
  ): string {
    const discount = Math.round(((originalPrice - price) / originalPrice) * 100)
    
    const reasons = []
    
    if (discount > 30) {
      reasons.push("Desconto especial para primeira compra")
    }
    
    if (context.campaign !== 'organic') {
      reasons.push("Preço promocional da campanha")
    }
    
    if (customerProfile.location.includes('SP')) {
      reasons.push("Preço otimizado para São Paulo")
    }
    
    if (customerProfile.previousPurchases && customerProfile.previousPurchases > 0) {
      reasons.push("Desconto cliente fiel")
    }

    const baseReason = reasons.length > 0 ? reasons.join(", ") : "Preço otimizado por IA"
    
    return `${baseReason} - ${discount}% off do preço original`
  }

  /**
   * Calcula reward esperado para ML
   */
  private calculateExpectedReward(
    price: number, 
    originalPrice: number, 
    customerProfile: CustomerProfile
  ): number {
    let reward = 0.5 // Base neutral
    
    // Desconto atrativo aumenta probabilidade de conversão
    const discount = (originalPrice - price) / originalPrice
    reward += discount * 0.3
    
    // Localização premium
    if (customerProfile.location.includes('SP') || customerProfile.location.includes('RJ')) {
      reward += 0.1
    }
    
    // Cliente engajado
    if (customerProfile.interactions && customerProfile.interactions > 5) {
      reward += 0.1
    }
    
    // Preço não muito baixo (margem)
    if (price > originalPrice * 0.6) {
      reward += 0.1
    }
    
    return Math.min(1.0, Math.max(0.0, reward))
  }

  /**
   * Atualiza lista de cidades COD dinamicamente
   */
  async updateCodCities(newCities: string[], removed: string[] = []): Promise<void> {
    try {
      console.log('🏙️ Atualizando cidades COD...')
      console.log('➕ Adicionadas:', newCities.length)
      console.log('➖ Removidas:', removed.length)
      
      // Aqui você atualizaria o banco de dados
      // E dispararia evento para regenerar prompts do bot
      
      await this.regenerateBotPrompts()
      
    } catch (error) {
      console.error('❌ Erro ao atualizar cidades:', error)
    }
  }

  /**
   * Regenera prompts do bot quando cidades mudam
   */
  private async regenerateBotPrompts(): Promise<void> {
    try {
      // Importar função correta
      const { getProductInfo } = await import('../bot/dynamicPromptGenerator.js')
      
            console.log('🤖 Regenerando prompts do bot com novas cidades...')
      
      // Aqui você salvaria o novo prompt ou invalidaria cache
      
    } catch (error) {
      console.error('❌ Erro ao regenerar prompts:', error)
    }
  }
}

export const calcinhaMLPricing = new CalcinhaMLPricing()
