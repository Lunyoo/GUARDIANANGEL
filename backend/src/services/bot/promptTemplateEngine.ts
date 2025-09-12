import { isCODCity } from './codCitiesProvider.js'

interface TemplateContext {
  vendedor: string
  produto: string
  preco: string
  estrategia: string
  cidade: string
  entregaInfo: string
  tom: string
  banditsContext?: any
  cores?: string
  midia?: string
}

/**
 * 🎯 Template Engine para prompts de produtos
 * Injeta variáveis dinâmicas baseadas no Universal Bandits + contexto do cliente
 */
export class PromptTemplateEngine {
  
  /**
   * 📝 Gera prompt final baseado no template do produto + estratégia do bandits
   */
  static generatePrompt(
    productTemplate: string,
    banditArm: any,
    cityDetected: string | null,
  customerContext: any = {}
  ): string {
    
    // 🎰 Extrai estratégia do braço do bandit
    const estrategia = banditArm?.variant || 'Padrão'
    const preco = banditArm?.context?.price || banditArm?.context?.variant || 'R$ 89,90'
    
    // 🏙️ Determina informações de entrega baseado na cidade
    const cidade = cityDetected || 'Não informada'
    const isCOD = cityDetected ? isCODCity(cityDetected) : false
    const entregaInfo = isCOD 
      ? 'Entrega no dia seguinte com pagamento na entrega! 🚚'
      : 'Pagamento antecipado via PIX/cartão - Entrega pelos Correios 📦'
    
    // 🎭 Determina tom baseado na estratégia
    const tom = this.getTomFromStrategy(estrategia)
    
    // 📊 Contexto para injeção
    const colorsList: string[] = (customerContext.colors || customerContext.availableColors || banditArm?.context?.availableColors || []) as string[]
    const preferredMedia: string = (customerContext.preferredMedia || banditArm?.context?.preferredMedia || '') as string
    const precoOverride = customerContext.price || customerContext.basePrice || banditArm?.context?.basePrice

    const context: TemplateContext = {
      vendedor: 'Larissa',
      produto: 'Calcinha Modeladora ShapeFit Premium',
      preco: precoOverride || preco,
      estrategia,
      cidade,
      entregaInfo,
      tom,
      banditsContext: banditArm,
      cores: colorsList && colorsList.length ? colorsList.join(', ') : undefined,
      midia: preferredMedia || undefined
    }
    
    // 🔄 Substitui placeholders no template
    let finalTemplate = productTemplate || this.getDefaultTemplate()
    // Allow customerContext.template override to entirely replace or append
    if (customerContext.template && typeof customerContext.template === 'string') {
      finalTemplate = customerContext.template
    }
    let finalPrompt = finalTemplate
    
    // Substitui todos os placeholders
    Object.entries(context).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const placeholder = `{${key.toUpperCase()}}`
        finalPrompt = finalPrompt.replace(new RegExp(placeholder, 'g'), value)
      }
    })
    
  // Substituir placeholders extras se presentes
  if (context.cores) finalPrompt = finalPrompt.replace(/{CORES}/g, context.cores)
  if (context.midia) finalPrompt = finalPrompt.replace(/{MIDIA_PRIORITARIA}/g, context.midia)

  // 🎯 Adiciona instruções específicas da estratégia
    finalPrompt += '\n\n' + this.getStrategyInstructions(estrategia, banditArm)
    
    console.log(`🎯 Prompt gerado para estratégia: ${estrategia}`)
    return finalPrompt
  }
  
  /**
   * 🎭 Determina tom de voz baseado na estratégia
   */
  private static getTomFromStrategy(estrategia: string): string {
    if (estrategia.includes('urgência') || estrategia.includes('limitado')) {
      return 'urgente e persuasivo'
    }
    if (estrategia.includes('social') || estrategia.includes('depoimento')) {
      return 'confiável e empático'
    }
    if (estrategia.includes('desconto') || estrategia.includes('promoção')) {
      return 'entusiasmado e vantajoso'
    }
    if (estrategia.includes('consultoria') || estrategia.includes('tamanho')) {
      return 'consultivo e especialista'
    }
    return 'natural e persuasivo'
  }
  
  /**
   * 📋 Instruções específicas por estratégia
   */
  private static getStrategyInstructions(estrategia: string, banditArm: any): string {
    const baseInstructions = `
🎯 ESTRATÉGIA ATIVA: ${estrategia}
💰 PREÇO SUGERIDO: ${banditArm?.context?.variant || banditArm?.variant || 'R$ 89,90'}

⚠️ REGRAS CRÍTICAS:
- NUNCA mencione "link de pagamento" antes de confirmar interesse + dados completos
- SEMPRE colete nome + endereço completo antes de finalizar
- Use tom ${this.getTomFromStrategy(estrategia)}
`
    
    // Instruções específicas por tipo de estratégia
    if (estrategia.includes('urgência')) {
      return baseInstructions + `
🔥 URGÊNCIA: Enfatize que é por tempo limitado
⏰ Use frases como "só hoje", "últimas unidades", "oferta especial"
`
    }
    
    if (estrategia.includes('social')) {
      return baseInstructions + `
👥 PROVA SOCIAL: Mencione outras clientes satisfeitas
💬 Use depoimentos e resultados reais
`
    }
    
    if (estrategia.includes('desconto')) {
      return baseInstructions + `
💸 DESCONTO: Enfatize a economia
🎁 Compare com preço original
`
    }
    
    return baseInstructions
  }
  
  /**
   * 📝 Template padrão se produto não tiver
   */
  private static getDefaultTemplate(): string {
  return `Você é {VENDEDOR}, vendedora especialista em {PRODUTO}.

💰 PREÇO: {PRECO}
🏙️ PARA {CIDADE}: {ENTREGA_INFO}
🎭 TOM: {TOM}

🎨 CORES: {CORES}
📸 MÍDIA FOCO: {MIDIA_PRIORITARIA}

✨ BENEFÍCIOS:
- Modela cintura e quadris instantaneamente
- Levanta e empina o bumbum naturalmente  
- Reduz medidas visivelmente
- Tecido respirável e confortável

🎯 ESTRATÉGIA: {ESTRATEGIA}

Seja natural, persuasiva e focada nos benefícios!`
  }
}
