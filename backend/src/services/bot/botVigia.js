import OpenAI from 'openai'
import { getDatabase } from '../../../dist/config/database.js'
import { intelligentBotSystem } from './intelligentBotSystem.js'

let openai = null
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
} catch (error) {
  console.log('⚠️ OpenAI não configurado, usando fallback')
}

let db = null
try {
  db = getDatabase()
} catch (error) {
  console.log('⚠️ Database não conectado ainda')
}

const ADMIN_PHONE = process.env.ADMIN_PHONE || '554199509644'

/**
 * 🛡️ BOT VIGIA - Sistema anti-invenção para validar respostas
 * Detecta quando o bot inventa informações que não existem
 */
class BotVigia {
  constructor() {
    try {
      this.createVigiaTable()
    } catch (error) {
      console.log('⚠️ VIGIA: Erro ao criar tabela:', error.message)
    }
  }

  /**
   * 🔍 Análise principal: detecta se o bot está inventando informações
   */
  async validateResponse(phone, userMessage, botResponse, conversationHistory = []) {
    try {
      console.log(`🛡️ VIGIA: Analisando resposta para ${phone}`)
      
      // 1. Buscar dados reais do sistema para comparação
      const realData = await this.getRealSystemData(phone)
      
      // 2. Analisar com GPT se a resposta contém invenções
      const analysis = await this.analyzeForInventions(userMessage, botResponse, realData)
      
      console.log(`🛡️ VIGIA: ${analysis.approved ? 'APROVADO' : 'REJEITADO'} (${analysis.confidence}%)`)
      
      return analysis
      
    } catch (error) {
      console.error('❌ VIGIA: Erro na análise:', error)
      
      // Em caso de erro, notifica admin mas aprova por segurança
      await this.notifyAdmin('error', `Erro no vigia: ${error.message}`, phone)
      
      return {
        approved: true,
        confidence: 0,
        reason: 'Erro no sistema - aprovado por segurança',
        severity: 'high'
      }
    }
  }

  /**
   * 🧠 NOVA ANÁLISE INTEGRADA - Usa sistema inteligente com ML + histórico completo
   */
  async checkMessage(phone, userMessage, botResponse) {
    try {
      console.log(`🛡️ VIGIA: Iniciando análise integrada para ${phone}`)
      
      // Usar o sistema inteligente integrado
      const result = await intelligentBotSystem.analyzeMessage(phone, userMessage, botResponse)
      
      // Log da análise
      await this.logAnalysis(phone, userMessage, botResponse, result)
      
      // Se não aprovado, notificar admin
      if (!result.approved) {
        await this.notifyAdmin(phone, result, userMessage, botResponse)
      }
      
      return {
        approved: result.approved,
        confidence: result.confidence,
        reason: result.reason,
        severity: result.severity || 'medium',
        corrections: result.corrections || [],
        smartPrice: result.smartPrice,
        metrics: result.metrics
      }
      
    } catch (error) {
      console.error('❌ VIGIA: Erro na análise:', error)
      return {
        approved: true,
        confidence: 0,
        reason: 'Erro no sistema - aprovado por segurança',
        severity: 'high'
      }
    }
  }

  /**
   * 📊 Busca dados reais do sistema para validação
   */
  async getRealSystemData(phone) {
    try {
            // Buscar dados reais das cidades COD
      const codCities = await this.getRealCodCities()
      
      // Buscar dados reais do produto
      const productData = await this.getRealProductData()
      
      // Buscar dados reais da campanha
      const campaignData = await this.getRealCampaignData(phone)
      
      // Buscar informações da conversa
      const conversationContext = await this.extractConversationContext(phone)
      
      return {
        codCities,
        productData,
        campaignData,
        validDeliveryInfo: this.getValidDeliveryInfo()
      }
    } catch (error) {
      console.error('❌ VIGIA: Erro ao buscar dados reais:', error)
      return {
        codCities: [],
        productData: null,
        campaignData: null,
        validDeliveryInfo: []
      }
    }
  }

  /**
   * 🏙️ Busca cidades COD reais do sistema
   */
  async getRealCodCities() {
    try {
      // Lista das 70 cidades COD REAIS do sistema
      return [
        "São Paulo - SP", "Taboão da Serra - SP", "São Bernardo do Campo - SP", "Osasco - SP", 
        "Guarulhos - SP", "Diadema - SP", "Santo André - SP", "Itapecerica da Serra - SP",
        "Carapicuíba - SP", "Itaquaquecetuba - SP", "Barueri - SP", "Mauá - SP",
        "Ferraz de Vasconcelos - SP", "São Caetano do Sul - SP", "Suzano - SP", "Cotia - SP",
        "Embu das Artes - SP", "Poá - SP", "Itapevi - SP", "Jandira - SP", "Mogi das Cruzes - SP",
        "Recife - PE", "Olinda - PE", "Jaboatão dos Guararapes - PE", "Camaragibe - PE",
        "Paulista - PE", "Abreu e Lima - PE", "Goiânia - GO", "Senador Canedo - GO",
        "Aparecida de Goiânia - GO", "Trindade - GO", "Goianira - GO", "Fortaleza - CE",
        "Caucaia - CE", "Maracanaú - CE", "Eusébio - CE", "Pacatuba - CE", "Maranguape - CE",
        "Rio de Janeiro - RJ", "Niterói - RJ", "Duque de Caxias - RJ", "São João de Meriti - RJ",
        "Nilópolis - RJ", "Mesquita - RJ", "Nova Iguaçu - RJ", "São Gonçalo - RJ", "Queimados - RJ",
        "Salvador - BA", "Lauro de Freitas - BA", "Simões Filho - BA", "Camaçari - BA",
        "Belo Horizonte - MG", "Nova Lima - MG", "Sarzedo - MG", "Contagem - MG", "Betim - MG",
        "Ribeirão das Neves - MG", "Sabará - MG", "Ibirité - MG", "Santa Luzia - MG",
        "Porto Alegre - RS", "Canoas - RS", "Esteio - RS", "São Leopoldo - RS",
        "Novo Hamburgo - RS", "Gravataí - RS", "Sapucaia do Sul - RS", "Viamão - RS",
        "Cachoeirinha - RS", "Alvorada - RS"
      ]
    } catch (error) {
      return []
    }
  }

  /**
   * 🏷️ Busca dados reais do produto
   */
  async getRealProductData() {
    return {
      names: [
        'Calcinha Lipo Modeladora Premium',
        'Calcinha Modeladora ShapeFit',
        'Calcinha Modeladora Premium',
        'Calcinha Lipo ShapeFit'
      ],
      description: 'Calcinha modeladora premium com tecnologia avançada que modela a cintura, não marca a roupa e oferece máximo conforto',
      category: 'lingerie',
      colors: ['bege', 'preta'],
      sizes: ['P', 'M', 'G', 'GG'],
      features: [
        'modela a cintura e barriga',
        'não marca a roupa',
        'tecido respirável',
        'alta compressão',
        'conforto durante todo o dia',
        'tecnologia modeladora avançada',
        'costura invisível'
      ],
      originalPrices: {
        1: 129.90,
        2: 199.90,
        3: 259.90,
        4: 319.90,
        6: 479.90
      },
      smartPrices: {
        1: [89.90, 97.00],
        2: [119.90, 129.90, 139.90, 147.00],
        3: [159.90, 169.90, 179.90, 187.00],
        4: [239.90],
        6: [359.90]
      },
      skus: {
        1: 'LIPO-1UN',
        2: 'LIPO-2UN',
        3: 'LIPO-3UN',
        4: 'LIPO-4UN',
        6: 'LIPO-6UN'
      },
      benefits: [
        'modela instantaneamente',
        'uso invisível por baixo da roupa',
        'conforto o dia todo',
        'melhora a postura',
        'autoestima elevada'
      ],
      paymentRules: {
        codCities: 'Pagamento na entrega (sem frete)',
        otherCities: 'Pagamento antecipado - OBRIGATÓRIO pedir CPF para pagamento'
      }
    }
  }

  /**
   * 🏷️ Busca dados reais do produto
   */
  async getProductContext(phone) {
    try {
      // Buscar informações do produto baseado no lead/campanha
      const db = getDatabase()
      const leadInfo = db.prepare(`
        SELECT phone, created_at
        FROM leads
        WHERE phone = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(phone)
      
      // Sempre retorna o produto padrão por enquanto
      return 'Calcinha Modeladora ShapeFit - produto de modelagem corporal'
    } catch (error) {
      console.error('❌ VIGIA: Erro ao buscar contexto do produto:', error)
      return 'Produto não identificado'
    }
  }

  /**
   * 📈 Busca dados reais da campanha
   */
  async getRealCampaignData(phone) {
    try {
      // Simplificado para funcionar com schema atual
      return {
        name: 'Campanha ShapeFit',
        description: 'Venda de calcinha modeladora'
      }
    } catch (error) {
      return null
    }
  }

  /**
   * 🚚 Informações válidas de entrega
   */
  getValidDeliveryInfo() {
    return [
      'entrega COM pagamento na entrega APENAS para cidades COD cadastradas no sistema',
      'entrega SEM pagamento na entrega para TODAS as outras cidades (pagamento antecipado obrigatório)',
      'sempre verificar se a cidade está na lista COD antes de falar sobre pagamento',
      'nunca inventar modalidades de entrega que não estão nos dados',
      'se cidade não está na lista COD = pagamento antecipado + pedir CPF',
      'se cidade está na lista COD = pagamento na entrega sem frete com o motoboy'
    ]
  }

  /**
   * 💬 Busca TODA a thread da conversa
   */
  async extractConversationContext(phone) {
    try {
      // Usar a conexão do banco de forma segura
      const database = db || getDatabase()
      
      // Buscar TODAS as mensagens da conversa ordenadas por data
      const messages = database.prepare(`
        SELECT direction, content, created_at, type
        FROM messages 
        WHERE lead_id = ?
        ORDER BY created_at ASC
      `).all(phone)
      
      let conversationHistory = []
      let lastUserMessage = ''
      let lastBotResponse = ''
      
      for (const msg of messages) {
        const timestamp = new Date(msg.created_at).toLocaleString('pt-BR')
        const prefix = msg.direction === 'IN' ? '👤 CLIENTE' : '🤖 BOT'
        
        conversationHistory.push(`${prefix} (${timestamp}): ${msg.content || ''}`)
        
        if (msg.direction === 'IN') {
          lastUserMessage = msg.content || ''
        } else if (msg.direction === 'OUT') {
          lastBotResponse = msg.content || ''
        }
      }
      
      return {
        fullHistory: conversationHistory.join('\n'),
        totalMessages: messages.length,
        lastUserMessage,
        lastBotResponse,
        hasHistory: messages.length > 0
      }
    } catch (error) {
      console.error('❌ VIGIA: Erro ao buscar contexto da conversa:', error)
      return {
        fullHistory: 'Erro ao carregar histórico',
        totalMessages: 0,
        lastUserMessage: '',
        lastBotResponse: '',
        hasHistory: false
      }
    }
  }

  /**
   * 🧠 Analisa se o bot está inventando informações
   */
  async analyzeForInventions(userMessage, botResponse, realData) {
    const conversationContext = realData.conversationContext || {}
    
    const prompt = `Você é um DETECTOR DE INVENÇÕES especializado em identificar quando um chatbot inventa informações falsas.

DADOS REAIS DO SISTEMA:
📦 PRODUTO - NOMES PERMITIDOS: 
- Calcinha Lipo Modeladora Premium
- Calcinha Modeladora ShapeFit  
- Calcinha Modeladora Premium
- Calcinha Lipo ShapeFit
- Descrição: ${realData.productData?.description || 'Calcinha modeladora premium com tecnologia avançada'}
- Cores: ${realData.productData?.colors?.join(', ') || 'bege, preta'}
- Tamanhos: ${realData.productData?.sizes?.join(', ') || 'P, M, G, GG'}

💰 PREÇOS REAIS AUTORIZADOS (UM POR QUANTIDADE):
- 1 unidade: R$ 89,90
- 2 unidades: R$ 119,90
- 3 unidades: R$ 159,90
- 4 unidades: R$ 239,90
- 6 unidades: R$ 359,90

🏙️ CIDADES COD REAIS (70 cidades): ${realData.codCities.slice(0, 15).join(', ')}...

🚚 REGRAS DE ENTREGA CORRETAS:
- Cidades na lista COD: Pagamento na entrega (sem frete)
- Cidades FORA da lista COD: Pagamento antecipado + OBRIGATÓRIO pedir CPF
- NUNCA inventar modalidades como "motoboy", "equipe própria", etc
- Se cidade não está na lista = pagamento antecipado sempre

💬 CONTEXTO COMPLETO DA CONVERSA (${conversationContext.totalMessages || 0} mensagens):
${conversationContext.fullHistory || 'Nenhum histórico disponível'}

REGRAS CRÍTICAS - DETECTAR INVENÇÕES E REPETIÇÕES:
❌ Bot NÃO PODE inventar cidades COD que não existem
❌ Bot NÃO PODE inventar serviços de entrega (ex: "motoboy" para cidades não-COD)
❌ Bot NÃO PODE inventar preços não autorizados
❌ Bot NÃO PODE afirmar entregas em cidades não listadas
❌ Bot NÃO PODE prometer pagamento antecipado SEM pedir CPF
❌ Bot NÃO PODE repetir informações já ditas no histórico
❌ Bot DEVE considerar o contexto completo antes de responder
🚨 CRÍTICO: Bot NUNCA pode mostrar MÚLTIPLOS PREÇOS para a mesma quantidade (ex: "R$ 89,90 ou R$ 97,00")
🚨 CRÍTICO: SEMPRE mostrar APENAS UM PREÇO por quantidade (ex: "R$ 89,90" para 1 unidade)

MENSAGEM ATUAL DO CLIENTE: "${userMessage}"
RESPOSTA ATUAL DO BOT: "${botResponse}"

ANÁLISE CRÍTICA: 
1. O bot está inventando informações falsas?
2. O bot está repetindo algo já dito anteriormente?
3. O bot está mostrando múltiplos preços para a mesma quantidade? (CRÍTICO)
3. O bot está ignorando o contexto da conversa?
4. A resposta faz sentido baseada no histórico completo?

Responda APENAS o JSON válido:
{
  "approved": boolean,
  "confidence": number,
  "reason": "explicação detalhada do problema ou aprovação",
  "suggestedResponse": "versão corrigida (se necessário)",
  "severity": "low|medium|high|critical",
  "inventedInfo": ["lista de informações inventadas"],
  "repetitionDetected": boolean,
  "contextIgnored": boolean
}`

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: prompt },
          { 
            role: 'user', 
            content: 'Analise se há invenções na resposta do bot. Responda APENAS JSON válido.'
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })

      let responseText = completion.choices[0]?.message?.content || '{}'
      
      // Limpar possíveis marcadores de código e caracteres inválidos
      responseText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/`/g, '')
        .trim()
      
      // Se não começar com {, procurar o primeiro { válido
      if (!responseText.startsWith('{')) {
        const jsonStart = responseText.indexOf('{')
        if (jsonStart !== -1) {
          responseText = responseText.substring(jsonStart)
        }
      }
      
      const analysis = JSON.parse(responseText)
      
      // Validar estrutura
      if (typeof analysis.approved !== 'boolean') {
        throw new Error('Formato inválido')
      }
      
      return analysis
      
    } catch (error) {
      console.error('❌ VIGIA: Erro ao processar análise JSON:', error)
      console.error('❌ VIGIA: Erro na análise:', error)
      
      // Análise de fallback mais rigorosa
      return this.fallbackInventionDetection(userMessage, botResponse, realData)
    }
  }

  /**
   * 🔍 Detecção de fallback para invenções
   */
  fallbackInventionDetection(userMessage, botResponse, realData) {
    const responseLower = botResponse.toLowerCase()
    const userLower = userMessage.toLowerCase()
    
    let approved = true
    let confidence = 90
    let reason = 'Análise básica - sem invenções detectadas'
    let severity = 'low'
    let inventedInfo = []
    
    // Detectar invenções comuns
    
    // 1. Invenção de serviços de entrega
    if (responseLower.includes('motoboy') || responseLower.includes('entregador')) {
      approved = false
      confidence = 20
      reason = 'Bot inventou serviço de motoboy/entregador não oferecido'
      severity = 'high'
      inventedInfo.push('serviço de motoboy/entregador')
    }
    
    // 2. Invenção de cidades COD
    const cidadesInventadas = this.detectInventedCities(responseLower, realData.codCities)
    if (cidadesInventadas.length > 0) {
      approved = false
      confidence = 15
      reason = `Bot inventou entrega COD para cidades não cadastradas: ${cidadesInventadas.join(', ')}`
      severity = 'critical'
      inventedInfo.push(...cidadesInventadas)
    }
    
    // 3. Afirmações sobre entrega sem verificar cidade
    if (userLower.includes('cidade') && 
        (responseLower.includes('entregamos') || responseLower.includes('entrega')) &&
        !responseLower.includes('verificar')) {
      approved = false
      confidence = 30
      reason = 'Bot afirmou entrega sem verificar se cidade está na lista COD'
      severity = 'medium'
      inventedInfo.push('entrega não verificada')
    }
    
    return { approved, confidence, reason, severity, inventedInfo }
  }

  /**
   * 🏙️ Detecta cidades inventadas
   */
  detectInventedCities(response, realCities) {
    const cidadesMencionadas = []
    const palavrasChave = ['entregamos em', 'entrega para', 'atendemos', 'cod em']
    
    for (const palavra of palavrasChave) {
      if (response.includes(palavra)) {
        // Extrair possível nome de cidade após a palavra-chave
        const regex = new RegExp(`${palavra}\\s+([a-záêç\\s]+?)(?:,|\\.|!|\\?|$)`, 'gi')
        const matches = response.match(regex)
        
        if (matches) {
          for (const match of matches) {
            const cidade = match.replace(palavra, '').trim().toLowerCase()
            if (cidade && cidade.length > 2 && !realCities.includes(cidade)) {
              cidadesMencionadas.push(cidade)
            }
          }
        }
      }
    }
    
    return cidadesMencionadas
  }

  /**
   * 🔧 Corrige resposta quando há invenções
   */
  async correctResponse(phone, userMessage, originalResponse, analysis) {
    console.log(`🔧 VIGIA: Corrigindo invenções para ${phone}`)
    
    if (analysis.suggestedResponse) {
      return analysis.suggestedResponse
    }
    
    // Gerar correção baseada no tipo de invenção
    try {
      const realData = await this.getRealSystemData(phone)
      
      const correctionPrompt = `Você é um especialista em correção de respostas de vendas.

PROBLEMA DETECTADO: ${analysis.reason}
INFORMAÇÕES INVENTADAS: ${analysis.inventedInfo?.join(', ') || 'Não especificado'}

DADOS REAIS PARA USAR:
- Cidades COD válidas: ${realData.codCities.slice(0, 10).join(', ')}
- Produto: ${realData.productData?.name}

RESPOSTA PROBLEMÁTICA: "${originalResponse}"
PERGUNTA ORIGINAL: "${userMessage}"

INSTRUÇÕES PARA CORREÇÃO:
1. REMOVA todas as informações inventadas
2. Use APENAS dados reais do sistema
3. Se pergunta sobre cidade, diga para verificar se está na lista COD
4. NÃO invente serviços de entrega
5. Seja honesta sobre limitações

Gere uma resposta corrigida em português, natural e vendedora, mas SEM INVENÇÕES.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: correctionPrompt },
          { role: 'user', content: 'Corrija a resposta removendo as invenções.' }
        ],
        temperature: 0.3,
        max_tokens: 200
      })

      const correctedResponse = completion.choices[0]?.message?.content || originalResponse
      
      console.log(`✅ VIGIA: Resposta corrigida`)
      return correctedResponse
      
    } catch (error) {
      console.error('❌ VIGIA: Erro ao corrigir:', error)
      
      // Resposta de fallback segura
      return `Oi! Preciso verificar essa informação para você. Me fala sua cidade que eu confirmo se temos entrega aí, ok? 😊`
    }
  }

  /**
   * 🚨 Notifica admin sobre invenções detectadas
   */
  async notifyAdmin(type, message, phone) {
    try {
      const alertMessage = `🛡️ ALERTA BOT VIGIA - INVENÇÃO DETECTADA!

Tipo: ${type.toUpperCase()}
Cliente: ${phone}
Problema: ${message}
Timestamp: ${new Date().toLocaleString('pt-BR')}

⚠️ Bot estava inventando informações!
Ação tomada: Resposta corrigida automaticamente.`

      await sendWhatsAppMessage(ADMIN_PHONE, alertMessage)
      console.log(`🚨 VIGIA: Admin notificado sobre invenção`)
      
    } catch (error) {
      console.error('❌ VIGIA: Falha ao notificar admin:', error)
    }
  }

  /**
   * 📊 Salva logs de análise
   */
  saveAnalysisLog(phone, userMessage, originalResponse, analysis, finalResponse) {
    try {
      db.prepare(`
        INSERT INTO vigia_logs (
          phone, user_message, original_response, 
          analysis_result, final_response, confidence, 
          approved, invented_info, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        phone,
        userMessage,
        originalResponse,
        JSON.stringify(analysis),
        finalResponse,
        analysis.confidence,
        analysis.approved ? 1 : 0,
        JSON.stringify(analysis.inventedInfo || [])
      )
    } catch (error) {
      console.error('❌ VIGIA: Erro ao salvar log:', error)
    }
  }

  /**
   * 🎯 Método principal - valida e corrige se necessário
   */
  async processResponse(phone, userMessage, botResponse, conversationHistory = []) {
    console.log(`🛡️ VIGIA: Validando resposta para ${phone}`)
    
    // 1. Analisar se há invenções
    const analysis = await this.validateResponse(phone, userMessage, botResponse, conversationHistory)
    
    let finalResponse = botResponse
    
    // 2. Se detectou invenções, corrigir
    if (!analysis.approved) {
      console.log(`🚨 VIGIA: INVENÇÃO DETECTADA - ${analysis.reason}`)
      
      finalResponse = await this.correctResponse(phone, userMessage, botResponse, analysis)
      
      // Notificar admin sobre invenção
      await this.notifyAdmin('invention_detected', analysis.reason, phone)
    }
    
    // 3. Salvar log da análise
    this.saveAnalysisLog(phone, userMessage, botResponse, analysis, finalResponse)
    
    console.log(`✅ VIGIA: ${analysis.approved ? 'Aprovado' : 'Corrigido'} (${analysis.confidence}%)`)
    
    return finalResponse
  }

  /**
   * � Log da análise (função compatibilidade)
   */
  async logAnalysis(phone, userMessage, botResponse, result) {
    try {
      console.log(`📊 VIGIA: Log - ${phone} - ${result.approved ? 'APROVADO' : 'REJEITADO'} (${result.confidence}%)`)
      // TODO: Implementar salvamento no banco quando conectado
    } catch (error) {
      console.error('❌ VIGIA: Erro ao fazer log:', error)
    }
  }

  /**
   * 🚨 Notifica admin sobre problemas
   */
  async notifyAdmin(phone, result, userMessage, botResponse) {
    try {
      const alertMessage = `🚨 ALERTA BOT VIGIA - INVENÇÃO DETECTADA!

Tipo: INVENTION_DETECTED
Cliente: ${phone}
Problema: ${result.reason}
Timestamp: ${new Date().toLocaleString('pt-BR')}

❌ Bot estava inventando informações!
Ação tomada: Resposta corrigida automaticamente.`

      console.log(alertMessage)
      // TODO: Enviar para admin quando WhatsApp client estiver disponível
      
    } catch (error) {
      console.error('❌ VIGIA: Falha ao notificar admin:', error)
    }
  }

  /**
   * �🗄️ Criar tabela de logs
   */
  createVigiaTable() {
    try {
      // Verificar se o banco está disponível
      const database = db || getDatabase()
      if (!database) {
        console.log('⚠️ VIGIA: Database não disponível, pulando criação de tabela')
        return
      }
      
      database.exec(`
        CREATE TABLE IF NOT EXISTS vigia_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT NOT NULL,
          user_message TEXT NOT NULL,
          original_response TEXT NOT NULL,
          analysis_result TEXT NOT NULL,
          final_response TEXT NOT NULL,
          confidence INTEGER NOT NULL,
          approved BOOLEAN NOT NULL,
          invented_info TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('🛡️ VIGIA: Tabela de logs inicializada')
    } catch (error) {
      console.error('❌ VIGIA: Erro ao criar tabela:', error)
    }
  }
}

// Instância singleton
export const botVigia = new BotVigia()
export { BotVigia }
