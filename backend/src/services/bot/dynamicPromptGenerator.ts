import { universalBandits } from './universalBandits.js'

// 🎯 Interface para informações do produto dinâmico
interface ProductInfo {
  id: string
  name: string
  description: string
  basePrice: number
  smartPrice?: number
  codCities: string[]
  category: string
  images?: string[]
  mlStrategy?: string
}

// 📱 Interface para informações da campanha
interface CampaignInfo {
  id?: string
  name?: string
  videoOrigin?: string
  productId?: string
  demandLevel?: 'low' | 'medium' | 'high'
  targetAudience?: string
}

// 🧠 Gerador de prompt dinâmico baseado em produto e campanha
export class DynamicPromptGenerator {
  
  // 💰 Obter preço inteligente do produto
  async getSmartPrice(productInfo: ProductInfo, customerProfile: any): Promise<number> {
    try {
      const response = await fetch(`http://localhost:3001/api/products/${productInfo.id}/get-smart-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerProfile,
          campaignType: 'standard',
          videoOrigin: 'direct',
          demandLevel: 'medium'
        })
      })
      
      if (response.ok) {
        const data = await response.json() as any
        return data.smartPrice || productInfo.basePrice
      }
      return productInfo.basePrice
    } catch (error) {
      console.error('❌ Erro ao obter preço inteligente:', error)
      return productInfo.basePrice
    }
  }
  
  // 🎭 Gerar prompt personalizado por produto e campanha
  async generatePrompt(productInfo: ProductInfo, campaignInfo?: CampaignInfo, customerProfile?: any): Promise<string> {
    
    // 💰 Obter preço otimizado pelo ML
    const smartPrice = await this.getSmartPrice(productInfo, customerProfile || {})
    
    // 🏙️ Processar cidades COD
    const codCitiesCount = productInfo.codCities?.length || 0
    const codCitiesList = productInfo.codCities?.join(', ') || ''
    const codCitiesText = codCitiesCount > 0 
      ? `ENTREGA COD em ${codCitiesCount} cidades: ${codCitiesList}`
      : 'Apenas pagamento antecipado'
    
    // 🎯 Contexto da campanha
    let campaignContext = ''
    if (campaignInfo?.videoOrigin) {
      const videoContexts = {
        'VIDEO1': 'Cliente viu depoimento real - focar em resultados e credibilidade',
        'VIDEO2': 'Cliente viu comparação - focar em diferencial competitivo',
        'VIDEO3': 'Cliente viu demonstração - focar em como usar e benefícios',
        'direct': 'Cliente chegou direto - fazer abordagem consultiva'
      }
      campaignContext = videoContexts[campaignInfo.videoOrigin as keyof typeof videoContexts] || ''
    }
    
    // 🧠 Estratégia ML atual
    const mlContext = this.getMlStrategy(productInfo, campaignInfo)
    
    // 🎨 Gerar prompt dinâmico
    const dynamicPrompt = `Você é Larissa, vendedora da ShapeFit.

PRODUTO: ${productInfo.name} - R$ ${smartPrice.toFixed(2).replace('.', ',')}
${productInfo.description}

REGRAS CRÍTICAS:
- MENSAGENS ULTRA CURTAS (máximo 2 linhas, 15 palavras)
- Uma informação por vez
- Chame de "amiga" ou "linda"
- Seja direta e objetiva
- Use emojis com moderação (máximo 1 por mensagem)
- Tom amigável mas eficiente

⚠️ NUNCA ESCREVA TEXTOS LONGOS - CLIENTE TEM PREGUIÇA DE LER!

DIFERENCIAL: ${codCitiesText}

🎯 REGRAS PARA CIDADES:
- Reconheça variações: "SP"/"São Paulo"/"capital" = São Paulo - SP
- "RJ"/"Rio" = Rio de Janeiro - RJ
- "BH" = Belo Horizonte - MG
- E outras variações naturais
- Se a cidade estiver na lista acima: "Que bom! Fazemos entrega por motoboy e você paga quando receber"
- Se NÃO estiver: "Para sua cidade o pagamento é antecipado"

🚚 ENTREGA: Motoboy das 8h às 18h + mensagem antes da entrega

📸 FOTOS DO PRODUTO:
- Quando cliente pede foto/imagem: "Claro amiga, te envio as fotos agora 📸"
- Detecte pedidos: "foto", "imagem", "tem foto", "quero ver", "mostrar", "como fica"
- Detecte tipos específicos:
  * "cores/colorido" → "Te mostro as cores disponíveis"
  * "como fica/vestindo" → "Te envio fotos de como fica no corpo"
  * "detalhes/qualidade" → "Te mostro os detalhes do produto"
  * "kit/2 unidades" → "Te envio fotos do kit"
- SEMPRE confirme que vai enviar: "te envio", "vou enviar", "segue as fotos"

${campaignContext ? `🎯 CONTEXTO PERSONALIZADO:\n${campaignContext}\n` : ''}

${mlContext ? `🧠 ESTRATÉGIA ML:\n${mlContext}\n` : ''}

ESTRATÉGIA:
1. Descubra o problema
2. Conecte com solução  
3. Confirme interesse
4. Fale preço e entrega

Seja consultiva, não vendedora.`

    return dynamicPrompt
  }
  
  // 🧠 Obter estratégia atual do ML
  private getMlStrategy(productInfo: ProductInfo, campaignInfo?: CampaignInfo): string {
    try {
      // Pegar insights do Universal Bandits
      const pricingStats = (universalBandits as any).getStatsByCategory?.('pricing') || []
      const topArm = pricingStats.sort((a: any, b: any) => b.conversionRate - a.conversionRate)[0]
      
      if (topArm) {
        return `ML recomenda: ${topArm.variant} (${(topArm.conversionRate * 100).toFixed(1)}% conversão)`
      }
      
      return 'ML em aprendizado - usando estratégia padrão'
    } catch (error) {
      return 'Estratégia consultiva padrão'
    }
  }
}

// 🔄 Função utilitária para obter informações do produto via API
export async function getProductInfo(productId: string): Promise<ProductInfo | null> {
  try {
    const response = await fetch(`http://localhost:3001/api/products`)
    if (response.ok) {
      const data = await response.json() as any
      const product = data.products?.find((p: any) => p.id === productId)
      
      if (product) {
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          basePrice: product.price,
          codCities: JSON.parse(product.codCities || '[]'),
          category: product.category,
          images: product.images ? product.images.split(',') : []
        }
      }
    }
    return null
  } catch (error) {
    console.error('❌ Erro ao obter informações do produto:', error)
    return null
  }
}

// 📱 Função utilitária para obter informações da campanha
export async function getCampaignInfo(phone: string): Promise<CampaignInfo | null> {
  try {
    const response = await fetch(`http://localhost:3001/api/campaign-links`)
    if (response.ok) {
      const data = await response.json() as any
      
      // Buscar campanha associada ao número do cliente
      const campaignLink = data.links?.find((link: any) => 
        link.lastAccessBy === phone ||
        link.trackingData?.accessHistory?.some((access: any) => access.phone === phone)
      )
      
      if (campaignLink) {
        return {
          id: campaignLink.id,
          name: campaignLink.videoTitle,
          videoOrigin: campaignLink.videoType === 'depoimento' ? 'VIDEO1' : 
                      campaignLink.videoType === 'demonstracao' ? 'VIDEO2' :
                      campaignLink.videoType === 'modelo' ? 'VIDEO3' : 'direct',
          productId: campaignLink.linkedProductId,
          demandLevel: 'medium',
          targetAudience: campaignLink.customContext
        }
      }
    }
    return null
  } catch (error) {
    console.error('❌ Erro ao obter informações da campanha:', error)
    return null
  }
}

export const dynamicPromptGenerator = new DynamicPromptGenerator()
