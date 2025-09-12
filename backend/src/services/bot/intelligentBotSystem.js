import OpenAI from 'openai'
import { getDatabase } from '../../../dist/config/database.js'
// import { universalBandits } from '../ml/universalBandits.js'
// import { CalcinhaMLPricing } from '../ml/calcinhaMLPricing.js'

/**
 * 🧠 SISTEMA DE BOT INTELIGENTE INTEGRADO
 * Combina ML + Histórico Completo + Métricas
 */
class IntelligentBotSystem {
  constructor() {
    this.openai = null
    this.db = null
    // this.mlPricing = new CalcinhaMLPricing()
    this.initializeOpenAI()
    this.initializeDatabase()
    this.createMetricsTables()
  }

  initializeOpenAI() {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })
      }
    } catch (error) {
      console.log('⚠️ OpenAI não configurado, usando fallback')
    }
  }

  initializeDatabase() {
    try {
      this.db = getDatabase()
    } catch (error) {
      console.log('⚠️ Database não conectado ainda')
    }
  }

  /**
   * 📊 DADOS REAIS DO PRODUTO - CALCINHA LIPO MODELADORA
   */
  getProductData() {
    return {
      names: [
        'Calcinha Lipo Modeladora Premium',
        'Calcinha Modeladora ShapeFit',
        'Calcinha Modeladora Premium',
        'Calcinha Lipo ShapeFit',
        'Calcinha ShapeFit'
      ],
      description: 'Calcinha modeladora premium com tecnologia avançada que modela a cintura, não marca a roupa e oferece máximo conforto',
      characteristics: [
        'modela a cintura e barriga',
        'não marca a roupa', 
        'tecido respirável',
        'alta compressão',
        'conforto durante todo o dia',
        'tecnologia modeladora avançada',
        'costura invisível',
        'realça curvas naturalmente',
        'fica lisinho, sem marquinha'
      ],
      colors: ['bege', 'preta'],
      sizes: ['P', 'M', 'G', 'GG'],
      benefits: [
        'modela instantaneamente',
        'uso invisível por baixo da roupa',
        'conforto o dia todo',
        'melhora a postura',
        'autoestima elevada',
        'você vai amar o resultado na cintura',
        'realça suas curvas naturalmente'
      ],
      quantities: [1, 2, 3, 4, 6],
      skus: {
        1: 'LIPO-1UN',
        2: 'LIPO-2UN', 
        3: 'LIPO-3UN',
        4: 'LIPO-4UN',
        6: 'LIPO-6UN'
      }
    }
  }

  /**
   * 🏙️ CIDADES COD REAIS
   */
  getCodCities() {
    return [
      // São Paulo e região metropolitana
      'São Paulo - SP', 'Taboão da Serra - SP', 'São Bernardo do Campo - SP', 'Osasco - SP',
      'Guarulhos - SP', 'Diadema - SP', 'Santo André - SP', 'Itapecerica da Serra - SP',
      'Carapicuíba - SP', 'Itaquaquecetuba - SP', 'Barueri - SP', 'Mauá - SP',
      'Ferraz de Vasconcelos - SP', 'São Caetano do Sul - SP', 'Suzano - SP', 'Cotia - SP',
      'Embu das Artes - SP', 'Poá - SP', 'Itapevi - SP', 'Jandira - SP', 'Mogi das Cruzes - SP',
      
      // Recife e região metropolitana
      'Recife - PE', 'Olinda - PE', 'Jaboatão dos Guararapes - PE', 'Camaragibe - PE',
      'Paulista - PE', 'Abreu e Lima - PE',
      
      // Goiânia e região metropolitana
      'Goiânia - GO', 'Senador Canedo - GO', 'Aparecida de Goiânia - GO', 'Trindade - GO', 'Goianira - GO',
      
      // Fortaleza e região metropolitana
      'Fortaleza - CE', 'Caucaia - CE', 'Maracanaú - CE', 'Eusébio - CE', 'Pacatuba - CE', 'Maranguape - CE',
      
      // Rio de Janeiro e região metropolitana
      'Rio de Janeiro - RJ', 'Niterói - RJ', 'Duque de Caxias - RJ', 'São João de Meriti - RJ',
      'Nilópolis - RJ', 'Mesquita - RJ', 'Nova Iguaçu - RJ', 'São Gonçalo - RJ', 'Queimados - RJ',
      
      // Salvador e região metropolitana
      'Salvador - BA', 'Lauro de Freitas - BA', 'Simões Filho - BA', 'Camaçari - BA',
      
      // Belo Horizonte e região metropolitana
      'Belo Horizonte - MG', 'Nova Lima - MG', 'Sarzedo - MG', 'Contagem - MG', 'Betim - MG',
      'Ribeirão das Neves - MG', 'Sabará - MG', 'Ibirité - MG', 'Santa Luzia - MG',
      
      // Porto Alegre e região metropolitana
      'Porto Alegre - RS', 'Canoas - RS', 'Esteio - RS', 'São Leopoldo - RS', 'Novo Hamburgo - RS',
      'Gravataí - RS', 'Sapucaia do Sul - RS', 'Viamão - RS', 'Cachoeirinha - RS', 'Alvorada - RS'
    ]
  }

  /**
   * 💬 BUSCA HISTÓRICO COMPLETO DA CONVERSA
   */
  async getFullConversationHistory(phone) {
    try {
      if (!this.db) return { messages: [], totalMessages: 0 }

      const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`
      
      // Buscar TODAS as mensagens da conversa
      const messages = this.db.prepare(`
        SELECT direction, content, created_at, type
        FROM messages 
        WHERE lead_id = ?
        ORDER BY created_at ASC
      `).all(normalizedPhone)

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
        messages: conversationHistory,
        totalMessages: messages.length,
        lastUserMessage,
        lastBotResponse,
        fullHistory: conversationHistory.join('\\n')
      }
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error)
      return { messages: [], totalMessages: 0, fullHistory: '' }
    }
  }

  /**
   * 🎯 ANÁLISE INTELIGENTE COM ML
   */
  async analyzeMessage(phone, userMessage, botResponse) {
    try {
      // 1. Buscar histórico completo
      const conversationData = await this.getFullConversationHistory(phone)
      
      // 2. Obter dados reais do sistema
      const productData = this.getProductData()
      const codCities = this.getCodCities()
      
      // 3. Gerar preço inteligente com ML (temporariamente desabilitado)
      let smartPrice = null
      let selectedQuantity = this.extractQuantityFromMessage(userMessage)
      
      // TODO: Reativar quando o ML estiver funcionando
      // if (selectedQuantity && this.mlPricing) {
      //   smartPrice = await this.mlPricing.getSmartPrice(
      //     selectedQuantity,
      //     customerProfile
      //   )
      // }

      // 4. Registrar métricas
      await this.recordMetrics({
        phone,
        userMessage,
        botResponse,
        smartPrice,
        conversationLength: conversationData.totalMessages
      })

      return {
        approved: true, // Sempre aprovado sem botVigia
        confidence: 100,
        reason: 'Aprovado sem validação do vigia',
        corrections: [],
        smartPrice: smartPrice,
        conversationData: conversationData,
        metrics: {
          totalMessages: conversationData.totalMessages,
          hasPrice: !!smartPrice,
          mlStrategy: smartPrice?.reasoning || 'none'
        }
      }

    } catch (error) {
      console.error('❌ Erro na análise inteligente:', error)
      return {
        approved: true, // Aprovar por segurança em caso de erro
        confidence: 0,
        reason: 'Erro no sistema - aprovado por segurança',
        corrections: [],
        metrics: { error: error.message }
      }
    }
  }
  /**
   * 📊 CRIAR TABELAS DE MÉTRICAS
   */
  createMetricsTables() {
    try {
      if (!this.db) return

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS intelligent_bot_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT NOT NULL,
          user_message TEXT NOT NULL,
          bot_response TEXT NOT NULL,
          ml_price_used REAL,
          ml_strategy TEXT,
          conversation_length INTEGER,
          processing_time_ms INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS bot_performance_daily (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          total_messages INTEGER DEFAULT 0,
          ml_price_usage INTEGER DEFAULT 0,
          avg_conversation_length REAL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(date)
        )
      `)

      console.log('✅ Tabelas de métricas criadas')
    } catch (error) {
      console.error('❌ Erro ao criar tabelas de métricas:', error)
    }
  }

  /**
   * 📈 REGISTRAR MÉTRICAS
   */
  async recordMetrics(data) {
    try {
      if (!this.db) return

      const startTime = Date.now()
      
      // Registrar métricas detalhadas
      this.db.prepare(`
        INSERT INTO intelligent_bot_metrics (
          phone, user_message, bot_response, ml_price_used, 
          ml_strategy, conversation_length, processing_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.phone,
        data.userMessage,
        data.botResponse,
        data.smartPrice?.price || null,
        data.smartPrice?.reasoning || null,
        data.conversationLength,
        Date.now() - startTime
      )

      // Atualizar métricas diárias
      const today = new Date().toISOString().split('T')[0]
      
      this.db.prepare(`
        INSERT OR REPLACE INTO bot_performance_daily (
          date, total_messages, ml_price_usage, avg_conversation_length
        ) VALUES (
          ?, 
          COALESCE((SELECT total_messages FROM bot_performance_daily WHERE date = ?), 0) + 1,
          COALESCE((SELECT ml_price_usage FROM bot_performance_daily WHERE date = ?), 0) + ?,
          (
            SELECT AVG(conversation_length) 
            FROM intelligent_bot_metrics 
            WHERE DATE(created_at) = ?
          )
        )
      `).run(
        today, today, today,
        data.smartPrice ? 1 : 0,
        today
      )

      console.log('📊 Métricas registradas')
    } catch (error) {
      console.error('❌ Erro ao registrar métricas:', error)
    }
  }

  /**
   * 📊 OBTER MÉTRICAS DE PERFORMANCE
   */
  async getPerformanceMetrics(days = 7) {
    try {
      if (!this.db) return null

      const metrics = this.db.prepare(`
        SELECT 
          date,
          total_messages,
          ml_price_usage,
          avg_conversation_length,
          ROUND((CAST(ml_price_usage AS REAL) / total_messages) * 100, 2) as ml_usage_rate
        FROM bot_performance_daily 
        WHERE date >= date('now', '-${days} days')
        ORDER BY date DESC
      `).all()

      const summary = this.db.prepare(`
        SELECT 
          COUNT(*) as total_conversations,
          AVG(conversation_length) as avg_conversation_length,
          COUNT(CASE WHEN ml_price_used IS NOT NULL THEN 1 END) as ml_price_usage
        FROM intelligent_bot_metrics 
        WHERE DATE(created_at) >= date('now', '-${days} days')
      `).get()

      return {
        daily: metrics,
        summary: summary,
        performance: {
          confidence_score: summary.avg_confidence || 0,
          rejection_rate: ((summary.total_rejections / summary.total_conversations) * 100) || 0,
          ml_usage_rate: ((summary.ml_price_usage / summary.total_conversations) * 100) || 0
        }
      }
    } catch (error) {
      console.error('❌ Erro ao obter métricas:', error)
      return null
    }
  }

  // Funções utilitárias
  extractCityFromHistory(history) {
    const cityMatches = history.match(/([A-Za-zÀ-ÿ\s]+)\s*-\s*(SP|RJ|MG|RS|PE|BA|GO|CE)/g)
    return cityMatches ? cityMatches[cityMatches.length - 1] : 'Não informada'
  }

  extractQuantityFromMessage(message) {
    const qtdMatch = message.match(/(\d+)\s*(unidade|peça|calcinha)/i)
    if (qtdMatch) {
      const qty = parseInt(qtdMatch[1])
      return [1, 2, 3, 4, 6].includes(qty) ? qty : null
    }
    return null
  }
}

// Singleton
const intelligentBotSystem = new IntelligentBotSystem()

export { intelligentBotSystem, IntelligentBotSystem }
