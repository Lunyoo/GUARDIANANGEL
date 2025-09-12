// 🧠 SMART GPT RESPONDER - ML INTEGRADO COM PROMPT GIGANTESCO
import { OpenAI } from 'openai'
import MLIntegratedPromptEngine from './mlIntegratedPrompt'
import { universalBandits } from '../ml/universalBandits'
import { PrismaClient } from '@prisma/client'
import { getDeliveryInfo } from './deliveryZones'

const prisma = new PrismaClient()

interface ConversationContext {
  customerId: string
  conversationId: string
  messageHistory: any[]
  customerContext: any
  banditContext: any
}

interface MLDecision {
  modelUsed: 'gpt-3.5-turbo' | 'gpt-4o-mini'
  strategy: any
  confidence: number
  reasoning: string[]
}

export class SmartGptResponder {
  private openai: OpenAI
  private promptEngine: MLIntegratedPromptEngine
  
  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
    })
    this.promptEngine = new MLIntegratedPromptEngine(universalBandits)
  }
  
  /**
   * 🎯 MÉTODO PRINCIPAL - RESPOSTA INTELIGENTE
   */
  public async generateSmartReply(context: ConversationContext): Promise<{
    response: string
    mlDecision: MLDecision
    tokensUsed: number
  }> {
    
    // 🧠 ETAPA 1: DETERMINAR COMPLEXIDADE E MODELO
    const complexityAnalysis = this.analyzeComplexity(
      context.messageHistory,
      context.customerContext
    )
    
  const modelToUse = this.selectOptimalModel(complexityAnalysis)
    
    console.log(`🤖 Complexidade: ${complexityAnalysis.level} | Modelo: ${modelToUse}`)
    
    // 🎯 ETAPA 2: GERAR PROMPT GIGANTESCO PERSONALIZADO
    const megaPrompt = this.promptEngine.generateMegaPrompt(
      context.messageHistory,
      context.customerContext,
      context.banditContext
    )
    
    console.log(`📋 Prompt gerado: ${megaPrompt.length} caracteres`)
    
    // 🚀 ETAPA 3: EXECUTAR GPT COM FALLBACK
  const result = await this.executeWithFallback(
      megaPrompt,
      modelToUse,
      complexityAnalysis
    )

    // Pós-processamento determinístico para robustez de UX
  const outboundMsgs = (context.messageHistory || []).filter(m => m.direction === 'outbound')
  const isFirstInteraction = outboundMsgs.length === 0
  // Buscar nome no contexto, que pode estar aninhado
  const customerName: string | undefined = context.customerContext?.name || 
                                           context.customerContext?.info?.name ||
                                           context.customerContext?.info?.info?.name
  const usedNameBefore = Boolean(customerName && outboundMsgs.some(m => new RegExp(`\\b${customerName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(String(m.content || ''))))
    // Build simple state flags from customer context for deterministic sequencing
    const cc = context.customerContext || {}
    const state = {
      hasName: Boolean(customerName), // Usar o nome encontrado, não cc.name
      hasAddress: Boolean(cc.address),
      hasComplement: typeof cc.complement !== 'undefined',
      hasCep: Boolean(cc.cep),
      hasCity: Boolean(cc.city),
      awaitingConfirmation: Boolean(cc.awaitingConfirmation),
      dataConfirmed: Boolean(cc.dataConfirmed)
    }

    result.response = this.postProcessResponse(
      result.response,
      { isFirstInteraction, customerName, usedNameBefore },
      state
    )
    // Enforce short replies consistently (máximo 2 linhas)
    result.response = this.validateResponseLength(result.response)
    
    // 📊 ETAPA 4: REGISTRAR DECISÃO ML
    const mlDecision: MLDecision = {
      modelUsed: result.modelUsed as 'gpt-3.5-turbo' | 'gpt-4o-mini',
      strategy: this.promptEngine['mlConfig'], // Acesso à config ML
      confidence: complexityAnalysis.confidence,
      reasoning: complexityAnalysis.factors
    }
    
    // 💾 ETAPA 5: SALVAR DECISÃO PARA ANALYTICS
    await this.logMLDecision(context, mlDecision, result.response)
    
    return {
  response: result.response,
      mlDecision,
      tokensUsed: result.tokensUsed
    }
  }
  
  /**
   * 🔍 ANÁLISE DE COMPLEXIDADE INTELIGENTE
   */
  private analyzeComplexity(messageHistory: any[], customerContext: any): {
    level: 'simple' | 'moderate' | 'complex'
    confidence: number
    factors: string[]
    scores: Record<string, number>
  } {
    
    const factors: string[] = []
    const scores: Record<string, number> = {}
    
    // Última mensagem do cliente
    const lastMessage = messageHistory.filter(m => m.direction === 'inbound').slice(-1)[0]
    const messageText = lastMessage?.content || ''
    
    // 🔥 FATORES DE COMPLEXIDADE
    
    // 1. Tamanho da mensagem
    const messageLength = messageText.length
    scores.messageLength = Math.min(messageLength / 200, 1) // 0-1
    if (messageLength > 150) factors.push('mensagem_longa')
    
    // 2. Palavras complexas
    const complexWords = [
      'problema', 'reclama', 'defeito', 'troca', 'devolve', 'cancelar',
      'não gostei', 'estragou', 'jurídico', 'advogado', 'processo',
      'reembolso', 'garantia', 'prazo', 'nota fiscal', 'cupom',
      'desconto', 'promoção', 'concorrente', 'comparar'
    ]
    
    const hasComplexWords = complexWords.some(word => 
      messageText.toLowerCase().includes(word)
    )
    scores.complexWords = hasComplexWords ? 1 : 0
    if (hasComplexWords) factors.push('palavras_complexas')
    
    // 3. Histórico longo
    const conversationLength = messageHistory.length
    scores.conversationLength = Math.min(conversationLength / 20, 1)
    if (conversationLength > 10) factors.push('conversa_longa')
    
    // 4. Objeções detectadas
    const objectionPatterns = [
      /muito caro|caro demais|não tenho dinheiro/i,
      /não confio|desconfio|suspeito|golpe/i,
      /demora muito|prazo longo|urgente/i,
      /tamanho errado|não serve|pequeno|grande/i
    ]
    
    const hasObjections = objectionPatterns.some(pattern => 
      pattern.test(messageText)
    )
    scores.objections = hasObjections ? 1 : 0
    if (hasObjections) factors.push('objecoes_detectadas')
    
    // 5. Cliente frustrado
    const frustrationWords = [
      'irritado', 'chateado', 'decepcionado', 'péssimo',
      'horrível', 'nunca mais', 'cancelar tudo'
    ]
    
    const isFrustrated = frustrationWords.some(word =>
      messageText.toLowerCase().includes(word)
    )
    scores.frustration = isFrustrated ? 1 : 0
    if (isFrustrated) factors.push('cliente_frustrado')
    
    // 6. Contexto do cliente
    scores.customerStage = 0
    if (customerContext?.hasShownInterest) {
      scores.customerStage = 0.3
      factors.push('cliente_interessado')
    }
    if (customerContext?.readyToBuy) {
      scores.customerStage = 0.7
      factors.push('cliente_pronto_comprar')
    }
    
    // 7. Primeira interação
    const isFirstInteraction = conversationLength <= 2
    scores.firstInteraction = isFirstInteraction ? 0.2 : 0
    if (isFirstInteraction) factors.push('primeira_interacao')
    
    // 🧮 CÁLCULO FINAL
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
    const maxScore = Object.keys(scores).length
    const complexityRatio = totalScore / maxScore
    
    let level: 'simple' | 'moderate' | 'complex'
    if (complexityRatio < 0.3) {
      level = 'simple'
    } else if (complexityRatio < 0.6) {
      level = 'moderate'  
    } else {
      level = 'complex'
    }
    
    const confidence = Math.min(0.5 + complexityRatio, 1)
    
    console.log(`🔍 Análise de complexidade:`, {
      level,
      confidence: `${(confidence * 100).toFixed(1)}%`,
      scores,
      factors
    })
    
    return { level, confidence, factors, scores }
  }
  
  /**
   * 🎯 SELEÇÃO INTELIGENTE DE MODELO
   */
  private selectOptimalModel(analysis: any): 'gpt-3.5-turbo' | 'gpt-4o-mini' {
    
    // ⚡ GPT-3.5 para casos simples (BARATO)
    if (analysis.level === 'simple') {
      console.log('⚡ GPT-3.5 selecionado: caso simples')
      return 'gpt-3.5-turbo'
    }
    
    // 🧠 GPT-4 para casos moderados/complexos (INTELIGENTE)
    if (analysis.level === 'complex' || analysis.confidence > 0.7) {
      console.log('🧠 GPT-4 selecionado: caso complexo')
      return 'gpt-4o-mini'
    }
    
    // 🎯 DECISÃO ML para casos moderados
    // Contexto mínimo válido para o bandit; evite propriedades inexistentes
    const mlDecision = universalBandits.selectBestArm('approach', {
      customerProfile: 'new',
      city: '',
      hasCodeDelivery: false,
      timeOfDay: 'afternoon',
      dayOfWeek: 'weekday',
      conversationStage: 'opening',
      messageCount: 1
    })
    
    const selectedModel = mlDecision?.variant?.includes('gpt-4') ? 'gpt-4o-mini' : 'gpt-3.5-turbo'
    
    console.log(`🎯 ML decidiu: ${selectedModel} (arm: ${mlDecision?.id})`)
    
    return selectedModel
  }
  
  /**
   * 🚀 EXECUÇÃO COM FALLBACK INTELIGENTE
   */
  private async executeWithFallback(
    prompt: string,
    primaryModel: string,
    analysis: any
  ): Promise<{
    response: string
    modelUsed: string
    tokensUsed: number
  }> {
    
    try {
      // 🎯 TENTATIVA PRINCIPAL
      console.log(`🚀 Tentando ${primaryModel}...`)
      
      const completion = await this.openai.chat.completions.create({
        model: primaryModel,
        temperature: 0.7,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ]
      })
      
      const response = completion.choices[0]?.message?.content?.trim()
      const tokensUsed = completion.usage?.total_tokens || 0
      
      if (response && response.length > 10) {
        console.log(`✅ ${primaryModel} sucesso: ${response.length} chars`)
        return {
          response,
          modelUsed: primaryModel,
          tokensUsed
        }
      }
      
      throw new Error('Resposta muito curta ou vazia')
      
    } catch (error) {
      const msg = (error as any)?.message || String(error)
      console.error(`❌ ${primaryModel} falhou:`, msg)
      
      // 🔄 FALLBACK AUTOMÁTICO
      const fallbackModel = primaryModel === 'gpt-4o-mini' ? 'gpt-3.5-turbo' : 'gpt-4o-mini'
      
      console.log(`🔄 Tentando fallback: ${fallbackModel}`)
      
      try {
        const completion = await this.openai.chat.completions.create({
          model: fallbackModel,
          temperature: 0.8,
          max_tokens: 400,
          messages: [
            {
              role: 'system', 
              content: prompt
            }
          ]
        })
        
        const response = completion.choices[0]?.message?.content?.trim()
        const tokensUsed = completion.usage?.total_tokens || 0
        
        if (response && response.length > 10) {
          console.log(`✅ Fallback ${fallbackModel} sucesso`)
          return {
            response,
            modelUsed: fallbackModel,
            tokensUsed
          }
        }
        
      } catch (fallbackError) {
        const fmsg = (fallbackError as any)?.message || String(fallbackError)
        console.error(`❌ Fallback também falhou:`, fmsg)
      }
      
      // 🆘 FALLBACK FINAL - RESPOSTA ESTRUTURADA
      return {
        response: this.generateEmergencyResponse(analysis),
        modelUsed: 'fallback',
        tokensUsed: 0
      }
    }
  }
  
  /**
   * 🆘 RESPOSTA DE EMERGÊNCIA
   */
  private generateEmergencyResponse(analysis: any): string {
    const factors = analysis.factors || []
    
    if (factors.includes('objecoes_detectadas')) {
      return 'Entendo sua preocupação! Nossa Calcinha Lipo tem garantia de 30 dias. Posso esclarecer suas dúvidas?'
    }
    
    if (factors.includes('cliente_frustrado')) {
      return 'Peço desculpas pelo inconveniente. Vou resolver isso agora mesmo. Pode me explicar o que aconteceu?'
    }
    
    if (factors.includes('primeira_interacao')) {
      return 'Oi! Sou a Larissa, gerente comercial da ShapeFit Brasil. Trabalho com a Calcinha Lipo Modeladora.'
    }
    
    return 'Obrigada por entrar em contato!'
  }
  
  /**
   * 📊 LOG DE DECISÕES ML
   */
  private async logMLDecision(
    context: ConversationContext,
    decision: MLDecision,
    response: string
  ) {
    
    const decisionLog = {
      timestamp: new Date().toISOString(),
      customerId: context.customerId,
      conversationId: context.conversationId,
      modelUsed: decision.modelUsed,
      strategy: decision.strategy,
      confidence: decision.confidence,
      factors: decision.reasoning,
      responseLength: response.length,
      messageCount: context.messageHistory.length
    }
    
    // 📝 LOG CONSOLE PARA DEBUG
    console.log('📊 ML Decision Log:', JSON.stringify(decisionLog, null, 2))
    
    // 💾 SALVAR NO BANCO (OPTIONAL)
    try {
      await (prisma as any).mlDecision?.create({
        data: {
          customerId: context.customerId,
          conversationId: context.conversationId,
          modelUsed: decision.modelUsed,
          strategy: JSON.stringify(decision.strategy),
          confidence: decision.confidence,
          factors: JSON.stringify(decision.reasoning),
          responseGenerated: response.substring(0, 500), // Primeira parte
          timestamp: new Date()
        }
      })
    } catch (error) {
      const msg = (error as any)?.message || String(error)
      console.log('⚠️ Erro salvando ML decision (tabela pode não existir):', msg)
    }
    
    // 🎯 BROADCAST PARA DASHBOARD
    const g: any = global as any
    if (g && typeof g.broadcast === 'function') {
      g.broadcast('ml-decision', decisionLog)
    }
  }
  
  /**
   * 📈 REGISTRAR RESULTADO DA CONVERSA
   */
  public async recordConversationResult(
    conversationId: string,
    result: {
      responded: boolean
      progressed: boolean  
      converted: boolean
      customerSatisfaction?: number
    }
  ) {
    
    // Registra no prompt engine para ML aprender
    this.promptEngine.recordConversationResult({
      responded: result.responded,
      progressed: result.progressed,
      converted: result.converted,
      feedback: result.customerSatisfaction ? `satisfaction:${result.customerSatisfaction}` : 'none'
    })
    
    console.log(`📈 Resultado registrado para conversa ${conversationId}:`, result)
  }

  /**
   * 🎭 GERAÇÃO DE RESPOSTA COM ESTRATÉGIA ADAPTATIVA
   */
  public async generateAdaptiveReply(
    context: ConversationContext,
    strategy: any
  ): Promise<string> {
    console.log(`🎭 Gerando resposta com estratégia: ${strategy.name}`)
    
    try {
      // Construir prompt adaptado com a estratégia
      const basePrompt = this.buildBasePrompt(context)
      
      // Aplicar modificações da estratégia
      const adaptedPrompt = this.adaptPromptWithStrategy(basePrompt, strategy, context)
      
      // Selecionar modelo baseado na complexidade e estratégia
      const modelToUse = strategy.approach === 'direct' ? 'gpt-3.5-turbo' : 'gpt-4o-mini'
      
      console.log(`🤖 Usando modelo: ${modelToUse} para estratégia: ${strategy.approach}`)
      
      // Gerar resposta
      const completion = await this.openai.chat.completions.create({
        model: modelToUse,
        messages: [{ role: 'user', content: adaptedPrompt }],
        max_tokens: 150, // Limite para respostas curtas
        temperature: strategy.tone === 'casual' ? 0.8 : 0.6,
        top_p: 0.9
      })
      
      const response = completion.choices[0]?.message?.content?.trim() || ''
      
  // Pós-processamento e validação (regras UX + feminino + 2 linhas)
  const outboundMsgs = (context.messageHistory || []).filter(m => m.direction === 'outbound')
  const isFirstInteraction = outboundMsgs.length === 0
  const customerName: string | undefined = context.customerContext?.name
  const usedNameBefore = Boolean(customerName && outboundMsgs.some(m => new RegExp(`\\b${customerName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(String(m.content || ''))))

      const cc = context.customerContext || {}
      const state = {
        hasName: Boolean(cc.name),
        hasAddress: Boolean(cc.address),
        hasComplement: typeof cc.complement !== 'undefined',
        hasCep: Boolean(cc.cep),
        hasCity: Boolean(cc.city),
        awaitingConfirmation: Boolean(cc.awaitingConfirmation),
        dataConfirmed: Boolean(cc.dataConfirmed)
      }

      let processed = this.postProcessResponse(response, { isFirstInteraction, customerName, usedNameBefore }, state)
  processed = this.validateResponseLength(processed)

  console.log(`✅ Resposta gerada (${processed.split('\n').length} linhas): "${processed.substring(0, 50)}..."`)

  return processed
      
    } catch (error: any) {
      console.error('❌ Erro na geração adaptativa:', error.message)
      return 'Não entendi. Pode repetir?'
    }
  }
  
  /**
   * 🏗️ CONSTRUIR PROMPT BASE COM HISTÓRICO COMPLETO
   */
  private buildBasePrompt(context: ConversationContext): string {
    const lastMessage = context.messageHistory[context.messageHistory.length - 1]?.content || ''
    const customerName = context.customerContext.name || ''
    const city = context.customerContext.city || ''
  const delivery = city ? getDeliveryInfo(city) : undefined
  const outboundCount = context.messageHistory.filter(m => m.direction === 'outbound').length
  const isFirstInteraction = outboundCount === 0
  const hasGreetedBefore = context.messageHistory.some(m => m.direction === 'outbound' && /sou a\s*larissa|shapefit\s*brasil/i.test(String(m.content || '')))
    
    // 📚 CONSTRUIR HISTÓRICO COMPLETO DA CONVERSA
    const conversationHistory = context.messageHistory
      .slice(-40) // Últimas 40 mensagens para mais contexto
      .map((msg, index) => {
        const direction = msg.direction === 'inbound' ? 'CLIENTE' : 'LARISSA'
        return `${direction}: ${msg.content}`
      })
      .join('\n')
    
  return `Você é a Larissa, assistente comercial da ShapeFit Brasil, vendedora especialista em Calcinha Lipo Modeladora.

PRODUTO: Calcinha Lipo Modeladora - Produção Própria (Pedro e Luiza)
PREÇOS OFICIAIS: 
- 2 unidades: R$ 139,90 (PROMOÇÃO PRINCIPAL)
- 3 unidades: R$ 179,90 (MELHOR OFERTA)
- 1 unidade: R$ 97,00 (fora da promoção)

QUALIDADE:
- Tecido Cetinete de alta compressão
- Cintura alta, não marca e nem enrola
- Tamanhos: P/M (34-42) e G/GG (44-50)
- Cores: Preto e Bege

ENTREGA - MUITO IMPORTANTE:
- 70 CIDADES COM PAGAMENTO NA ENTREGA: São Paulo, Rio de Janeiro, Belo Horizonte, Porto Alegre, Salvador, Recife, Fortaleza, Goiânia e regiões metropolitanas
- SEMPRE perguntar cidade ANTES de falar sobre pagamento
- Se cidade estiver na lista de pagamento na entrega: "Pagamento NA ENTREGA com nossa equipe (sem taxa/frete)"
- Se cidade NÃO estiver: "Entrega via CORREIOS com pagamento ANTECIPADO"
- Nunca prometa pagamento na entrega sem verificar se a cidade está na lista

DIFERENCIAIS:
- Produção exclusiva nossa
- Não temos site/insta - venda humanizada só no WhatsApp
- Sem trocas (questão de higiene/segurança)
- Pode verificar qualidade antes de pagar (só nas cidades com pagamento na entrega)

SINAIS DE CONTEXTO (não escreva isso para o cliente, use apenas para decidir o tom):
- FIRST_INTERACTION: ${isFirstInteraction ? 'SIM' : 'NÃO'}
- HAS_GREETED_BEFORE: ${hasGreetedBefore ? 'SIM' : 'NÃO'}
- CUSTOMER_NAME: ${customerName || 'desconhecido'}

APRESENTAÇÃO INICIAL:
- OBRIGATÓRIO: Se FIRST_INTERACTION=SIM, SEMPRE inicie com: "Oi! Sou a Larissa, gerente comercial da ShapeFit Brasil. Trabalho com a Calcinha Lipo Modeladora, que modela o corpo e realça suas curvas."
- IMPORTANTE: A apresentação DEVE incluir quem você é (GERENTE COMERCIAL), empresa, produto - NÃO terminar com pergunta "como posso ajudar"
- Se FIRST_INTERACTION=NÃO, não se apresente novamente e não use saudações como "Oi" ou "Olá" no começo
- NÃO repita o nome do cliente se já disse antes

COMPORTAMENTO (tom humano e vendas):
- Seja CONSULTIVA e EDUCATIVA (explique benefícios do produto)
- SEMPRE apresente diferenciais e qualidade quando perguntada sobre produto
- Se cliente só cumprimenta ("oi", "olá"), apresente o produto com benefícios
- Adapte o tom ao cliente, mas sempre mantenha o foco em vendas
- Explique como a calcinha modela, levanta o bumbum e afina a cintura
- Mencione o tecido de compressão e qualidade superior
- SEM EMOJIS - linguagem natural e profissional
- Linguagem SEMPRE no feminino (ex.: interessada, pronta, bem-vinda, obrigada)

FLUXO DE FECHAMENTO (quando cliente confirma compra):
IMPORTANTE: Pedir UM DADO POR VEZ, nunca múltiplos dados numa mensagem!

SEQUÊNCIA OBRIGATÓRIA:
1. Se não tem NOME: pedir apenas "Qual seu nome completo?"
2. Se não tem RUA+NÚMERO: pedir apenas "Qual seu endereço com rua e número?"
3. Se não tem COMPLEMENTO: perguntar apenas "Tem complemento? (apartamento, condomínio, etc.)"
4. Se não tem CEP: pedir apenas "Qual o CEP?"
5. Se não tem CIDADE+UF: pedir apenas "Qual cidade e estado?"
6. **CONFIRMAÇÃO OBRIGATÓRIA**: Quando tiver TODOS os dados, SEMPRE confirmar:
   "Vou confirmar seus dados:
   Nome: [NOME]
   Produto: [QUANTIDADE] Calcinha(s) Lipo [COR]
   Endereço: [ENDEREÇO COMPLETO]
   [TIPO DE PAGAMENTO]
   
   Está tudo correto? (Digite 'sim' para confirmar)"

7. Só APÓS confirmação do cliente: "Perfeito! Pedido confirmado, [NOME]! Vou agendar sua entrega e te envio os detalhes em breve. Obrigada pela compra!"

REGRA CRÍTICA: Se falta algum dado da lista acima, pedir APENAS ESSE DADO específico na próxima mensagem.
NUNCA pedir múltiplos dados numa mensagem!
NUNCA pular etapas da sequência!
NUNCA finalizar sem confirmação do cliente!
Após confirmação, SEMPRE finalizar com informação sobre próximos passos!

DADOS OBRIGATÓRIOS PARA FINALIZAR VENDA (coletar UM POR VEZ):
1. Nome completo 
2. Rua/Av + número   
3. Complemento (se tiver)
4. CEP 
5. Cidade + UF 
6. Produto + quantidade + cor confirmados

REGRA CRÍTICA: Pedir apenas 1 dado por mensagem!
Se falta algum dado da lista, pedir SOMENTE esse dado.
NUNCA pedir múltiplos dados numa mensagem!

OBJEÇÕES PRINCIPAIS:
- "Tá caro": Tecido cetinete de altíssima qualidade, vale cada centavo
- "Se não gostar": (Pagamento na entrega) pode verificar antes de pagar / (Correios) qualidade garantida
- "Tem troca": Não trocamos por higiene/segurança
- "Enrola/marca": Não enrola nem marca pelo tecido de alta compressão

=== HISTÓRICO COMPLETO DA CONVERSA ===
${conversationHistory}

=== CONTEXTO DO CLIENTE ===
${customerName ? `NOME: ${customerName}` : 'Nome: não informado'}
${city ? `CIDADE: ${city}` : 'Cidade: não informada'}
${delivery ? `ENTREGA DETECTADA: ${delivery.type === 'COD' ? 'Pagamento na entrega (sem taxa/frete nas 70 cidades)' : 'Correios com pagamento antecipado'}` : 'ENTREGA DETECTADA: não informada'}
${context.customerContext.size ? `TAMANHO: ${context.customerContext.size}` : ''}
${context.customerContext.color ? `COR: ${context.customerContext.color}` : ''}
${context.customerContext.address ? `ENDEREÇO: ${context.customerContext.address}` : ''}
${context.customerContext.complement ? `COMPLEMENTO: ${context.customerContext.complement}` : ''}
${context.customerContext.cep ? `CEP: ${context.customerContext.cep}` : ''}
${context.customerContext.awaitingConfirmation ? `🔔 AGUARDANDO CONFIRMAÇÃO DOS DADOS` : ''}
${context.customerContext.dataConfirmed ? `✅ DADOS CONFIRMADOS PELO CLIENTE` : ''}

ÚLTIMA MENSAGEM DO CLIENTE: "${lastMessage}"

REGRAS CRÍTICAS:
1. Se é PRIMEIRO CONTATO (histórico vazio), SEMPRE inicie com: "Oi! Sou a Larissa, gerente comercial da ShapeFit Brasil."
2. Se NÃO é primeiro contato, não se apresente novamente
3. NUNCA repita cumprimentos se já cumprimentou antes
4. Um dado por vez: nome → endereço → complemento → CEP → cidade → confirmação
5. NUNCA peça "endereço completo", apenas "Qual seu endereço com rua e número?"

IMPORTANTE: 
- Mantenha conversa NATURAL e objetiva
- NÃO force fechamento de vendas
- Responda o que foi perguntado
- Seja consultiva, não vendedora agressiva
- Máximo 2 linhas por resposta (curto e direto)
- SEM EMOJIS - linguagem profissional e natural
- ANALISE TODO O HISTÓRICO DA CONVERSA antes de responder
- Se é primeiro contato, SEMPRE se apresente como Larissa da ShapeFit Brasil
- Se o cliente já informou dados (nome, quantidade, cor), NÃO peça novamente
- NUNCA peça múltiplos dados numa mensagem
- SEQUÊNCIA: nome → endereço → complemento → CEP → cidade → confirmação → finalização
- Para complemento: pergunte se tem, se não tiver pule para próximo dado

CHECKLIST ANTES DE FINALIZAR PEDIDO:
- Tenho o nome completo? Se não, pedir APENAS o nome.
- Tenho rua + número? Se não, pedir APENAS o endereço.
- Perguntei sobre complemento? Se não, perguntar APENAS sobre complemento.
- Tenho o CEP? Se não, pedir APENAS o CEP.
- Tenho cidade + estado? Se não, pedir APENAS cidade e estado.
- Se tenho TODOS os dados: fazer CONFIRMAÇÃO obrigatória antes de finalizar
- Só finalizar APÓS cliente confirmar dados com "sim", "correto", etc.

REGRA ABSOLUTA: UM DADO POR MENSAGEM! 
- NUNCA peça "endereço completo"
- NUNCA peça múltiplos dados numa frase
- SEMPRE peça apenas o próximo dado necessário da sequência
- Se falta endereço: "Qual seu endereço com rua e número?"
- Se falta complemento: "Tem complemento? (apartamento, etc.)"
- Se falta CEP: "Qual o CEP?"
- NUNCA diga "endereço completo" ou similares!
- NÃO cumprimente o cliente novamente se já cumprimentou
- NÃO termine mensagens com "como posso ajudar" ou "em que posso te ajudar"
- Só finalizar quando tiver TODOS os dados!

Responda de forma natural, mantendo o contexto da conversa anterior.`
  }
  
  /**
   * 🎯 ADAPTAR PROMPT COM ESTRATÉGIA
   */
  private adaptPromptWithStrategy(basePrompt: string, strategy: any, context: ConversationContext): string {
    const modifications = strategy.promptModifications.join('\n')
    
    return `${basePrompt}

=== ESTRATÉGIA ATIVA: ${strategy.name.toUpperCase()} ===
${modifications}

REGRAS CRÍTICAS DE RESPOSTA:
- MÁXIMO 2 LINHAS (nunca mais que isso)
- Tom: ${strategy.tone}
- Abordagem: ${strategy.approach}
- Estilo: ${strategy.messageStyle}

CONTEXTO ESPECÍFICO:
- Cidade: ${context.customerContext.city || 'não informada'}
- Perfil: ${context.banditContext.customerProfile || 'novo'}
- Estágio: ${context.banditContext.conversationStage || 'inicial'}
- Mensagens: ${context.messageHistory.length}

IMPORTANTE: Resposta deve ser direta, útil e NUNCA passar de 2 linhas.`
  }
  
  /**
   * ✂️ VALIDAR E AJUSTAR TAMANHO DA RESPOSTA
   */
  private validateResponseLength(response: string): string {
    const lines = response.split('\n').filter(line => line.trim().length > 0)
    
    if (lines.length > 2) {
      console.log(`✂️ Truncando resposta de ${lines.length} para 2 linhas`)
      return lines.slice(0, 2).join('\n')
    }
    
    return response
  }

  /**
   * 🔧 Pós-processamento determinístico para garantir regras de UX
   */
  private postProcessResponse(
    response: string,
    opts: { isFirstInteraction: boolean; customerName?: string; usedNameBefore?: boolean },
    state?: { hasName?: boolean; hasAddress?: boolean; hasComplement?: boolean; hasCep?: boolean; hasCity?: boolean; awaitingConfirmation?: boolean; dataConfirmed?: boolean }
  ): string {
    if (!response) return response
    let r = response.trim()

    // 1) Nunca pedir "endereço completo"
    r = this.avoidEnderecoCompleto(r)

  // 2) Limpar emojis e frases desnecessárias o quanto antes
    r = this.removeEmojisAndAnnoyingPhrases(r)

  // 3) Garantir UM dado por mensagem (heurística por palavras-chave)
    r = this.enforceOneFieldOnly(r)

    // 5) Enforce sequência determinística dos dados APENAS se GPT não está seguindo ordem
    //    Importante: não sobrescrever a apresentação da primeira mensagem
    if (!opts.isFirstInteraction && state && this.needsSequenceEnforcement(r, state)) {
      r = this.enforceDataSequence(r, state)
    }

    // 6) Evitar uso forçado do nome do cliente em perguntas de dados
    if (opts.customerName) {
      r = this.sanitizeNameInDataQuestions(r, opts.customerName)
    }

    // 6) Forçar linguagem no feminino em termos comuns
  r = this.ensureFeminineLanguage(r)

    // 7) Cumprimento: garantir apresentação no primeiro contato e evitar repetir depois
  r = this.fixGreeting(r, opts)

    return r
  }

  private fixGreeting(response: string, opts: { isFirstInteraction: boolean, customerName?: string, usedNameBefore?: boolean }): string {
    let r = response
    const greetingRegex = /^(ol[áa]|oi|boa\s*(tarde|noite|dia))[,!\s]*([A-Za-zÀ-ÿ'`\- ]+)?[,!\s]*/i
    
    if (opts.isFirstInteraction) {
      // Garantir apresentação completa da Larissa como GERENTE COMERCIAL
      if (!/sou a\s*larissa/i.test(r)) {
        const completeIntro = 'Oi! Sou a Larissa, gerente comercial da ShapeFit Brasil. Trabalho com a Calcinha Lipo Modeladora, que modela o corpo e realça suas curvas.'
        r = completeIntro
      }
      // Se já tem apresentação mas não menciona GERENTE COMERCIAL, corrigir
      else if (!/gerente\s+comercial/i.test(r)) {
        r = r.replace(/assistente\s+comercial/i, 'gerente comercial')
      }
      // Se já tem apresentação mas não menciona produto, adicionar
      else if (!/calcinha|lipo|modela/i.test(r)) {
        const lines = r.split('\n')
        lines[0] = lines[0] + ' Trabalho com a Calcinha Lipo Modeladora, que modela o corpo e realça suas curvas.'
        r = lines.join('\n')
      }
    } else {
      // Remover cumprimentos repetidos e nome do cliente no começo
      r = r.replace(greetingRegex, '')
      r = r.trim()

      // Remover autoapresentações em interações contínuas de forma mais robusta
      const introPatterns = [
        /oi!\s*sou a\s*larissa[^.?!]*[.?!]?\s*/gi,
        /sou a\s*larissa[^.?!]*[.?!]?\s*/gi,
        /meu nome é\s*larissa[^.?!]*[.?!]?\s*/gi,
        /(assistente|gerente)\s+comercial[^.?!]*[.?!]?\s*/gi,
        /da\s*shapefit\s*brasil[^.?!]*[.?!]?\s*/gi,
        /trabalho\s+com\s+a\s+calcinha\s+lipo[^.?!]*[.?!]?\s*/gi,
        /que\s+modela\s+o\s+corpo[^.?!]*[.?!]?\s*/gi
      ]
      
      introPatterns.forEach(pattern => {
        r = r.replace(pattern, ' ')
      })
      
      r = r.replace(/\s{2,}/g, ' ').trim()

      // Personalizar com nome do cliente uma única vez, de forma natural (não adicionar em perguntas de dados)
      const isDataAsk = /(nome completo|endere[çc]o|rua|n[uú]mero|complemento|apartamento|cep|cidade|estado|uf)/i.test(r)
      if (!isDataAsk && opts.customerName && !opts.usedNameBefore) {
        const softOpeners = [
          'Perfeito',
          'Certo',
          'Legal',
          'Combinado'
        ]
        const opener = softOpeners[Math.floor(Math.random()*softOpeners.length)]
        // Só adiciona o nome se a frase não começar com ele já
        if (!new RegExp(`^${opts.customerName}\\b`, 'i').test(r) && r.length > 0) {
          r = `${opener}, ${opts.customerName}! ${r}`
        }
      }

      // Se não temos nome e estamos pedindo o nome, manter pergunta direta sem apresentação
      if (!opts.customerName && /(qual\s*seu\s*nome\s*completo|preciso\s*do\s*seu\s*nome\s*completo)/i.test(r)) {
        r = 'Qual seu nome completo?'
      }
    }
    return r
  }

  private avoidEnderecoCompleto(response: string): string {
    let r = response
    // Substituir pedidos vagos por direcionados (rua e número)
    if (/endere[çc]o\s*completo|endere[çc]o\s*inteiro/i.test(r)) {
      r = r.replace(/.*endere[çc]o.*completo.*$/i, 'Pode me informar seu endereço com rua e número?')
    }
    // Evitar listar muitos campos de uma vez
    if (/(rua|n[uú]mero).*(complemento|cep|cidade|estado)/i.test(r)) {
      r = 'Pode me informar seu endereço com rua e número?'
    }
    return r
  }

  private enforceOneFieldOnly(response: string): string {
    let r = response
    const fields = [
      { key: 'rua_numero', regex: /(rua|avenida|av\.|r\.|n[uú]mero)/i, prompt: 'Pode me informar seu endereço com rua e número?' },
      { key: 'complemento', regex: /(complemento|apartamento|apto|bloco|casa|condom[ií]nio|torre)/i, prompt: 'Tem complemento? (apartamento, condomínio, etc.)' },
      { key: 'cep', regex: /(cep)/i, prompt: 'Qual o CEP?' },
      { key: 'cidade', regex: /(cidade|estado|uf)/i, prompt: 'Qual cidade e estado?' }
    ]

    // Se a resposta contém menção a 2 ou mais tipos de campos, reduzir para o primeiro da lista
    const matched = fields.filter(f => f.regex.test(r))
    if (matched.length >= 2) {
      r = matched[0].prompt
    }
    return r
  }

  private needsSequenceEnforcement(response: string, state: { hasName?: boolean; hasAddress?: boolean; hasComplement?: boolean; hasCep?: boolean; hasCity?: boolean }): boolean {
    // Só forçar sequência se GPT está pedindo dado fora de ordem ou múltiplos dados
    const isAskingMultipleFields = (response.match(/(nome|endere[çc]o|rua|complemento|cep|cidade)/gi) || []).length > 1
    
    // Se está pedindo nome mas já tem nome, precisa de enforcement
    const askingName = /nome.*completo|qual.*nome/i.test(response)
    const wrongNameAsk = askingName && Boolean(state.hasName)
    
    return isAskingMultipleFields || wrongNameAsk
  }

  private enforceDataSequence(response: string, state: { hasName?: boolean; hasAddress?: boolean; hasComplement?: boolean; hasCep?: boolean; hasCity?: boolean; awaitingConfirmation?: boolean; dataConfirmed?: boolean }): string {
    const hasName = Boolean(state.hasName)
    const hasAddress = Boolean(state.hasAddress)
    const hasComplement = Boolean(state.hasComplement)
    const hasCep = Boolean(state.hasCep)
    const hasCity = Boolean(state.hasCity)

    // Determine próximo dado necessário
    if (!hasName) return 'Qual seu nome completo?'
    if (!hasAddress) return 'Pode me informar seu endereço com rua e número?'
    if (!hasComplement) return 'Tem complemento? (apartamento, condomínio, etc.)'
    if (!hasCep) return 'Qual o CEP?'
    if (!hasCity) return 'Qual cidade e estado?'

    // Se tudo preenchido, deixa a resposta seguir (confirmação será conduzida pela lógica do modelo/fluxo)
    return response
  }

  private sanitizeNameInDataQuestions(response: string, customerName: string): string {
    let r = response
    const dataAskRegex = /(nome completo|endere[çc]o|rua|n[uú]mero|complemento|apartamento|cep|cidade|estado|uf)/i
    if (dataAskRegex.test(r)) {
      // Remover padrões ", Nome" ou "Nome," e uso isolado do nome no fim
      const nameEsc = customerName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      r = r.replace(new RegExp(`[,\n\s]*${nameEsc}[.!?]?$`, 'i'), '')
      r = r.replace(new RegExp(`^\s*${nameEsc}[,\s:]+`, 'i'), '')
      r = r.replace(new RegExp(`\b${nameEsc}\b`, 'g'), '').replace(/\s{2,}/g, ' ').trim()
    }
    return r
  }

  private ensureFeminineLanguage(response: string): string {
    let r = response

    // Helper to preserve capitalization of first letter
    const replacePreserveCase = (text: string, pattern: RegExp, replacement: string) => {
      return text.replace(pattern, (match) => {
        const isCapitalized = match[0] === match[0].toUpperCase()
        if (!isCapitalized) return replacement
        return replacement.charAt(0).toUpperCase() + replacement.slice(1)
      })
    }

    // Obrigado -> Obrigada
    r = replacePreserveCase(r, /\bobrigado\b/gi, 'obrigada')
    // Bem-vindo -> Bem-vinda (aceita com espaço ou hífen)
    r = replacePreserveCase(r, /\bbem[\- ]vindo\b/gi, 'bem-vinda')
    // Interessado -> Interessada
    r = replacePreserveCase(r, /\binteressado\b/gi, 'interessada')

    // "pronto" é tricky (evitar mudar "pedido pronto"). Trocar quando relacionado à pessoa
    // Casos: "se estiver pronto", "quando estiver pronto", "tá pronto?", "está pronto"
    r = r.replace(/\b(se|quando|se\s+estiver|quando\s+estiver|est(a|á)|t(a|á))\s+pronto\b/gi, (m) => m.replace(/pronto/i, (mm) => mm[0] === mm[0].toUpperCase() ? 'Pronta' : 'pronta'))

    return r
  }

  private removeEmojisAndAnnoyingPhrases(response: string): string {
    let r = response
    
    // Remover emojis
    r = r.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    
    // Remover frases desnecessárias no final
    r = r.replace(/[.!]*\s*(em que posso te ajudar|como posso te ajudar|como posso ajudar|posso te ajudar)\??[.!]*$/gi, '')
    r = r.replace(/[.!]*\s*(em que mais posso ajudar|como mais posso ajudar)\??[.!]*$/gi, '')
    
    // Limpar espaços duplos e pontuação duplicada
    r = r.replace(/\s+/g, ' ').replace(/[.!]{2,}/g, '.').trim()
    
    // Garantir que termine com ponto se for afirmação
    if (r && !r.match(/[.!?]$/)) {
      r += '.'
    }
    
    return r
  }
}

// 🎯 FUNÇÃO WRAPPER PARA COMPATIBILIDADE
export async function generateBotReply(
  conversationId: string,
  messageText: string,
  options: any = {}
): Promise<string> {
  
  try {
    const responder = new SmartGptResponder()
    
    // Buscar histórico e contexto
    const messageHistory = await getMessageHistory(conversationId)
    const customerContext = options.customerContext || {}
    const banditContext = options.banditContext || {}
    
    const context: ConversationContext = {
      customerId: options.customerId || 'unknown',
      conversationId,
      messageHistory: [...messageHistory, {
        direction: 'inbound',
        content: messageText,
        createdAt: new Date()
      }],
      customerContext,
      banditContext
    }
    
    // 🎯 APLICAR ESTRATÉGIA ADAPTATIVA
    let result: any
    if (options.adaptiveStrategy) {
      console.log(`🎭 Aplicando estratégia: ${options.adaptiveStrategy.name}`)
      const response = await responder.generateAdaptiveReply(context, options.adaptiveStrategy)
      result = { response, mlDecision: { modelUsed: 'gpt-3.5-turbo' }, tokensUsed: 0 }
    } else {
      result = await responder.generateSmartReply(context)
    }
    
    console.log(`🎯 Smart GPT Response: ${result.response.length} chars, Model: ${result.mlDecision?.modelUsed || 'unknown'}`)
    
    return result.response
    
  } catch (error: any) {
    console.error('❌ Erro no Smart GPT Responder:', error.message)
    
    // Fallback para função original se houver
    try {
      const { generateBotReply: originalFunction } = await import('./gptResponder')
      return originalFunction(conversationId, messageText, options)
    } catch {
      return 'Não entendi. Pode repetir?'
    }
  }
}

// 🔍 HELPER: BUSCAR HISTÓRICO DE MENSAGENS
async function getMessageHistory(conversationId: string): Promise<any[]> {
  try {
    const messages = await (prisma as any).message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
  take: 80 // Aumentado para incluir mais contexto da conversa
    })
    
    return messages || []
  } catch (error: any) {
    console.error('❌ Erro buscando histórico:', error.message)
    return []
  }
}

export default SmartGptResponder
