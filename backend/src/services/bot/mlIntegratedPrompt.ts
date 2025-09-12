// 🧠 SISTEMA ML-GPT TOTALMENTE INTEGRADO
// Prompt Gigantesco + Machine Learning Adaptativo

export interface MLPromptConfig {
  abordagem: string
  estilo: string
  urgencia: string
  ofertas: string
  objecoes: Record<string, string>
  fechamento: string
  personalizacao: Record<string, any>
}

export interface ProductKnowledgeBase {
  produto: {
    nome: string
    beneficios: string[]
    material: string
    tecnologia: string[]
    resultados: string[]
    diferenciais: string[]
    garantias: string[]
  }
  tamanhos: Record<string, {
    medidas: string
    perfil: string
    recomendacao: string
  }>
  cores: Record<string, {
    nome: string
    descricao: string
    popularidade: string
  }>
  precos: Record<string, {
    valor: number
    economia: string
    estrategia: string
    publico_alvo: string
  }>
  entrega: {
    cod_cities: string[]
    prazos: Record<string, string>
    formas_pagamento: string[]
    tracking: boolean
  }
  objecoes_comuns: Record<string, {
    problema: string
    solucoes: string[]
    social_proof: string[]
  }>
}

// 🎯 BASE DE CONHECIMENTO GIGANTESCA
export const PRODUCT_KNOWLEDGE_BASE: ProductKnowledgeBase = {
  produto: {
  nome: "Calcinha Lipo Modeladora",
    beneficios: [
      "Reduz instantaneamente 2-3 tamanhos visuais",
      "Levanta e modela o bumbum naturalmente", 
      "Achata barriga e define cintura",
      "Elimina culotes e gordura localizada",
      "Melhora postura e alinhamento corporal",
      "Realça curvas naturais do corpo",
      "Compressão suave sem desconforto",
      "Invisível por baixo das roupas",
      "Tecido respirável que não marca",
      "Autoestima instantânea ao usar"
    ],
    material: "Microfibra premium importada com elastano de alta performance",
    tecnologia: [
      "Compressão gradual 360° inteligente",
      "Costura flat sem marcas aparentes", 
      "Elástico embutido que não aperta",
      "Tecido antibacteriano e anti-odor",
      "Secagem rápida e durabilidade estendida"
    ],
    resultados: [
      "Silhueta definida imediatamente",
      "Roupas ficam mais justas e bonitas",
      "Confiança aumentada em 95% das usuárias",
      "Postura melhorada comprovada",
      "Redução visual de medidas em fotos"
    ],
    diferenciais: [
      "Única com tecnologia de compressão gradual",
      "Testada e aprovada por mais de 50.000 mulheres",
      "Recomendada por fisioterapeutas",
      "Resistente a 500+ lavagens",
      "Design ergonômico exclusivo"
    ],
    garantias: [
      "Garantia contra defeitos de fabricação",
      "Atendimento para escolher o tamanho certo",
      "Sem trocas por higiene/segurança"
    ]
  },

  tamanhos: {
    P: {
      medidas: "Cintura 60-65cm, Quadril 85-90cm",
      perfil: "Mulheres de 45-55kg, biótipos pequenos",
      recomendacao: "Ideal para quem quer modelagem suave"
    },
    M: {
      medidas: "Cintura 66-70cm, Quadril 91-96cm", 
      perfil: "Mulheres de 56-65kg, mais vendido",
      recomendacao: "Perfeito para modelagem moderada"
    },
    G: {
      medidas: "Cintura 71-75cm, Quadril 97-102cm",
      perfil: "Mulheres de 66-75kg, curvas acentuadas", 
      recomendacao: "Ótimo para definição de cintura"
    },
    GG: {
      medidas: "Cintura 76-82cm, Quadril 103-110cm",
      perfil: "Mulheres de 76kg+, plus size",
      recomendacao: "Máxima modelagem e conforto"
    }
  },

  cores: {
    preto: {
      nome: "Preto Clássico",
      descricao: "Cor mais versátil, combina com tudo",
      popularidade: "70% das vendas, preferida universalmente"
    },
    bege: {
      nome: "Bege Nude",
      descricao: "Invisível sob roupas claras",
      popularidade: "30% das vendas, ideal para roupas brancas"
    }
  },

  precos: {
    "1un": {
      valor: 97.00,
      economia: "Ideal para testar",
      estrategia: "Entrada",
      publico_alvo: "Primeira compra"
    },
    "2un": {
      valor: 139.90,
      economia: "Mais vendido, melhor custo-benefício",
      estrategia: "Principal",
      publico_alvo: "Uso diário"
    },
    "3un": {
      valor: 179.90,
      economia: "Máxima economia",
      estrategia: "Estoque pessoal",
      publico_alvo: "Clientes satisfeitas"
    }
  },

  entrega: {
    cod_cities: [
      // REGIÃO SUDESTE
      "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Campinas", "Santos", 
      "São Bernardo do Campo", "Guarulhos", "Osasco", "Santo André", "São José dos Campos",
      "Ribeirão Preto", "Sorocaba", "Mauá", "São José do Rio Preto", "Mogi das Cruzes",
      "Diadema", "Jundiaí", "Carapicuíba", "Piracicaba", "Bauru", "São Vicente", "Itaquaquecetuba",
      "Niterói", "Nova Iguaçu", "Belford Roxo", "São João de Meriti", "Duque de Caxias",
      "Campos dos Goytacazes", "Petrópolis", "Volta Redonda", "Magé", "Itaboraí",
      "Nova Friburgo", "Barra Mansa", "Teresópolis", "Angra dos Reis", "Cabo Frio",
      "Contagem", "Uberlândia", "Juiz de Fora", "Betim", "Montes Claros", "Ribeirão das Neves",
      "Uberaba", "Governador Valadares", "Ipatinga", "Santa Luzia", "Sete Lagoas",
      
      // REGIÃO SUL  
      "Curitiba", "Porto Alegre", "Joinville", "Londrina", "Caxias do Sul", "Maringá",
      "Ponta Grossa", "Cascavel", "São José dos Pinhais", "Foz do Iguaçu", "Colombo",
      "Canoas", "Pelotas", "Santa Maria", "Gravataí", "Viamão", "Novo Hamburgo", "São Leopoldo",
      "Rio Grande", "Alvorada", "Passo Fundo", "Sapucaia do Sul", "Uruguaiana", "Bagé",
      "Blumenau", "São Bento do Sul", "Chapecó", "Itajaí", "Jaraguá do Sul", "Lages"
    ],
    prazos: {
      "COD": "Entrega em 24-48h com pagamento na entrega",
      "Correios": "7-14 dias úteis via PAC/SEDEX",
      "Expressa": "3-5 dias úteis para capitais"
    },
    formas_pagamento: [
      "💰 Pagamento na Entrega (COD) - 70 cidades",
      "💳 Pagamento antecipado (Correios)",
      "💳 PIX disponível"
    ],
    tracking: true
  },

  objecoes_comuns: {
    preco_alto: {
      problema: "Cliente acha caro",
      solucoes: [
        "Compare com academia (R$ 80/mês) - nossa calcinha dura anos",
        "Divida por dias de uso - menos de R$ 3 por dia",
        "Economia em roupas novas - valoriza o que já tem"
      ],
      social_proof: [
        "50.000+ mulheres aprovaram o investimento",
        "98% relatam que vale cada centavo",
        "Clientes compram novamente em 60 dias"
      ]
    },
    
    desconfianca_produto: {
      problema: "Dúvida se funciona realmente", 
      solucoes: [
        "Tecnologia comprovada por testes clínicos",
        "Resultados visíveis na primeira utilização",
        "Garantia de 30 dias ou dinheiro de volta"
      ],
      social_proof: [
        "Mais de 15.000 depoimentos reais",
        "Antes e depois comprovados",
        "Recomendada por profissionais de saúde"
      ]
    },
    
  tamanho_duvida: {
      problema: "Não sabe qual tamanho escolher",
      solucoes: [
    "Guia de medidas detalhado",
    "Te ajudo a acertar o tamanho",
    "Atendimento personalizado"
      ],
      social_proof: [
        "95% acertam o tamanho na primeira",
        "Consultoria gratuita por WhatsApp",
    "Sistema de medidas testado por milhares"
      ]
    },
    
    prazo_entrega: {
      problema: "Demora para chegar",
      solucoes: [
        "COD disponível em 70 cidades (24-48h)",
        "Rastreamento em tempo real",
        "Expressa para capitais (3-5 dias)"
      ],
      social_proof: [
        "99% das entregas no prazo",
        "Logística premium confiável",
        "Milhares de entregas mensais"
      ]
    }
  }
}

// 🎯 ML INTEGRADO - ESTRATÉGIAS DINÂMICAS
export class MLIntegratedPromptEngine {
  private mlConfig: MLPromptConfig
  private knowledgeBase: ProductKnowledgeBase
  
  constructor(private universalBandits: any) {
    this.knowledgeBase = PRODUCT_KNOWLEDGE_BASE
    this.mlConfig = this.getMLOptimizedConfig()
  }
  
  private getMLOptimizedConfig(): MLPromptConfig {
    // 🤖 ML DECIDE ESTRATÉGIAS EM TEMPO REAL
    const banditContext = {
      timeOfDay: this.getTimeOfDay(),
      dayOfWeek: this.getDayType(),
      customerProfile: 'unknown' // será atualizado por contexto
    }
    
    return {
      abordagem: this.universalBandits.selectBestArm('approach', banditContext)?.variant || 'consultiva',
      estilo: this.universalBandits.selectBestArm('style', banditContext)?.variant || 'amigavel',
      urgencia: this.universalBandits.selectBestArm('urgency', banditContext)?.variant || 'moderada',
      ofertas: this.universalBandits.selectBestArm('offers', banditContext)?.variant || 'combo',
      fechamento: this.universalBandits.selectBestArm('closing', banditContext)?.variant || 'beneficio',
      objecoes: this.getMLOptimizedObjectionHandling(),
      personalizacao: this.getMLPersonalization()
    }
  }
  
  private getMLOptimizedObjectionHandling(): Record<string, string> {
    // ML aprende melhores respostas para cada objeção
    return {
      preco: this.universalBandits.selectBestArm('objection_price', {})?.variant || 'valor_comparativo',
      qualidade: this.universalBandits.selectBestArm('objection_quality', {})?.variant || 'social_proof',
      tamanho: this.universalBandits.selectBestArm('objection_size', {})?.variant || 'consultoria',
      prazo: this.universalBandits.selectBestArm('objection_delivery', {})?.variant || 'cod_emphasis'
    }
  }
  
  private getMLPersonalization(): Record<string, any> {
    return {
      emoji_level: this.universalBandits.selectBestArm('emoji_usage', {})?.variant || 'moderado',
      message_length: this.universalBandits.selectBestArm('message_length', {})?.variant || 'conciso',
      technical_level: this.universalBandits.selectBestArm('technical_detail', {})?.variant || 'simples'
    }
  }
  
  // 🎯 GERA PROMPT GIGANTESCO PERSONALIZADO
  public generateMegaPrompt(
    conversationHistory: any[], 
    customerContext: any,
    banditContext: any
  ): string {
    
    // 🤖 ATUALIZA CONFIG ML BASEADO NO CONTEXTO DO CLIENTE
    this.updateMLConfigForCustomer(customerContext, banditContext)
    
    const prompt = `
# 🎯 LARISSA - ESPECIALISTA EM CALCINHA LIPO MODELADORA

## 👤 SUA IDENTIDADE
Você é a Larissa, consultora especializada em modelagem corporal feminina. Trabalha exclusivamente com a Calcinha Lipo Modeladora Premium. Sua missão é ajudar mulheres a se sentirem mais confiantes e bonitas.

## 📋 CONHECIMENTO COMPLETO DO PRODUTO

### 🌟 PRODUTO PRINCIPAL
**${this.knowledgeBase.produto.nome}**

**BENEFÍCIOS PRINCIPAIS:**
${this.knowledgeBase.produto.beneficios.map(b => `• ${b}`).join('\n')}

**TECNOLOGIA E MATERIAL:**
• Material: ${this.knowledgeBase.produto.material}
${this.knowledgeBase.produto.tecnologia.map(t => `• ${t}`).join('\n')}

**RESULTADOS COMPROVADOS:**
${this.knowledgeBase.produto.resultados.map(r => `• ${r}`).join('\n')}

**DIFERENCIAIS ÚNICOS:**
${this.knowledgeBase.produto.diferenciais.map(d => `• ${d}`).join('\n')}

**GARANTIAS OFERECIDAS:**
${this.knowledgeBase.produto.garantias.map(g => `• ${g}`).join('\n')}

### 📏 GUIA COMPLETO DE TAMANHOS
${Object.entries(this.knowledgeBase.tamanhos).map(([size, info]) => 
  `**TAMANHO ${size}:**
  • Medidas: ${info.medidas}
  • Perfil: ${info.perfil}
  • Recomendação: ${info.recomendacao}`
).join('\n\n')}

### 🎨 CORES DISPONÍVEIS
${Object.entries(this.knowledgeBase.cores).map(([cor, info]) =>
  `**${info.nome}:**
  • ${info.descricao}
  • Popularidade: ${info.popularidade}`
).join('\n\n')}

### 💰 ESTRATÉGIA DE PREÇOS (ML OTIMIZADA)
${Object.entries(this.knowledgeBase.precos).map(([qty, info]) =>
  `**${qty.toUpperCase()}:** R$ ${info.valor.toFixed(2).replace('.', ',')}
  • ${info.economia}
  • Estratégia: ${info.estrategia}
  • Público: ${info.publico_alvo}`
).join('\n\n')}

### 🚚 ENTREGA E PAGAMENTO

**CIDADES COM PAGAMENTO NA ENTREGA (COD):**
${this.knowledgeBase.entrega.cod_cities.join(', ')}

**PRAZOS DE ENTREGA:**
${Object.entries(this.knowledgeBase.entrega.prazos).map(([type, prazo]) => `• ${type}: ${prazo}`).join('\n')}

**FORMAS DE PAGAMENTO:**
${this.knowledgeBase.entrega.formas_pagamento.map(p => `• ${p}`).join('\n')}

⚠️ DIFERENCIAL IMPORTANTE: Se o cliente estiver em uma das 70 cidades COD, destaque SEMPRE que paga só na entrega (sem taxa/frete). Fora dessas cidades, deixar claro que é Correios com pagamento antecipado.

### 🛡️ TRATAMENTO DE OBJEÇÕES (ML OTIMIZADO)

${Object.entries(this.knowledgeBase.objecoes_comuns).map(([tipo, obj]) =>
  `**${obj.problema.toUpperCase()}:**
  
  Soluções:
  ${obj.solucoes.map(s => `• ${s}`).join('\n')}
  
  Prova Social:
  ${obj.social_proof.map(p => `• ${p}`).join('\n')}`
).join('\n\n')}

## 🎯 ESTRATÉGIA ML PERSONALIZADA (TEMPO REAL)

**ABORDAGEM ATUAL:** ${this.mlConfig.abordagem}
**ESTILO DE COMUNICAÇÃO:** ${this.mlConfig.estilo}  
**NÍVEL DE URGÊNCIA:** ${this.mlConfig.urgencia}
**FOCO EM OFERTAS:** ${this.mlConfig.ofertas}
**TÉCNICA DE FECHAMENTO:** ${this.mlConfig.fechamento}

**PERSONALIZAÇÃO:**
• Uso de Emojis: ${this.mlConfig.personalizacao.emoji_level}
• Tamanho de Mensagem: ${this.mlConfig.personalizacao.message_length}
• Nível Técnico: ${this.mlConfig.personalizacao.technical_level}

## 📚 HISTÓRICO DA CONVERSA COMPLETA
${this.formatConversationHistory(conversationHistory)}

## 🎯 INSTRUÇÕES DE RESPOSTA

1. **CONTEXTO TOTAL:** Analise TODA a conversa anterior antes de responder
2. **PROGRESSÃO:** Cada resposta deve avançar a venda naturalmente
3. **PERSONALIZAÇÃO:** Use o nome do cliente quando souber
4. **CIDADE:** Se souber a cidade, mencione entrega específica
5. **OBJEÇÕES:** Use as estratégias ML otimizadas acima
6. **FECHAMENTO:** Sempre guie para a compra quando apropriado

**NUNCA:**
• Invente informações não listadas acima
• Ofereça preços diferentes dos especificados
• Prometa prazos impossíveis
• Ignore o contexto da conversa

**SEMPRE:**
• Seja natural e humana
• Mantenha o foco no cliente
• Use as informações completas do produto
• Siga a estratégia ML personalizada

## 💬 RESPONDA AGORA COMO LARISSA:
    `
    
    return prompt
  }
  
  private formatConversationHistory(history: any[]): string {
    return history.map((msg, index) => {
      const direction = msg.direction === 'inbound' ? '👤 CLIENTE' : '👩‍💼 LARISSA'
      const timestamp = new Date(msg.createdAt).toLocaleTimeString('pt-BR')
      return `${index + 1}. [${timestamp}] ${direction}: ${msg.content}`
    }).join('\n')
  }
  
  private updateMLConfigForCustomer(customerContext: any, banditContext: any) {
    // 🧠 ML SE ADAPTA BASEADO NO PERFIL DO CLIENTE
    const updatedContext = {
      ...banditContext,
      customerProfile: this.determineCustomerProfile(customerContext),
      hasShownInterest: customerContext?.hasShownInterest || false,
      hasAskedPrice: customerContext?.hasAskedPrice || false,
      city: customerContext?.city || 'unknown'
    }
    
    // Atualiza estratégias baseado no perfil
    this.mlConfig = this.getMLOptimizedConfigForProfile(updatedContext)
  }
  
  private determineCustomerProfile(ctx: any): string {
    if (ctx?.readyToBuy) return 'hot'
    if (ctx?.hasAskedPrice || ctx?.hasShownInterest) return 'warm'
    return 'cold'
  }
  
  private getMLOptimizedConfigForProfile(context: any): MLPromptConfig {
    // ML escolhe estratégias específicas para cada perfil
    return {
      abordagem: this.universalBandits.selectBestArm('approach', context)?.variant || 'consultiva',
      estilo: this.universalBandits.selectBestArm('style', context)?.variant || 'amigavel',
      urgencia: context.customerProfile === 'hot' ? 'alta' : 'moderada',
      ofertas: this.universalBandits.selectBestArm('offers', context)?.variant || 'combo',
      fechamento: this.universalBandits.selectBestArm('closing', context)?.variant || 'beneficio',
      objecoes: this.getMLOptimizedObjectionHandling(),
      personalizacao: this.getMLPersonalization()
    }
  }
  
  private getTimeOfDay(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }
  
  private getDayType(): string {
    const day = new Date().getDay()
    return (day === 0 || day === 6) ? 'weekend' : 'weekday'
  }
  
  // 📊 REGISTRA RESULTADO PARA ML APRENDER
  public recordConversationResult(result: {
    responded: boolean
    progressed: boolean
    converted: boolean
    feedback: string
  }) {
    // Registra resultado para todos os bandits usados
    const armMap: Array<{key: keyof MLPromptConfig, id: string, value: string}> = [
      { key: 'abordagem', id: 'approach', value: this.mlConfig.abordagem },
      { key: 'estilo', id: 'style', value: this.mlConfig.estilo },
      { key: 'urgencia', id: 'urgency', value: this.mlConfig.urgencia },
      { key: 'ofertas', id: 'offers', value: this.mlConfig.ofertas },
      { key: 'fechamento', id: 'closing', value: this.mlConfig.fechamento }
    ]

    armMap.forEach(({ id, value }) => {
      const armId = `${id}_${value}`
      this.universalBandits.recordResult(armId, {
        impression: true,
        interaction: result.responded,
        conversion: result.converted
      })
    })
    
    // Log para dashboard de decisões
    console.log('🎯 ML Decision Recorded:', {
      config: this.mlConfig,
      result,
      timestamp: new Date().toISOString()
    })
  }
}

export default MLIntegratedPromptEngine
