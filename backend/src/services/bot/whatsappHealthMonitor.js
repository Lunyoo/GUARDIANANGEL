import { getDatabase } from '../../config/database.js'

/**
 * 📊 MONITOR DE SAÚDE DO WHATSAPP
 * Monitora a estabilidade da conexão e registra métricas
 */
class WhatsAppHealthMonitor {
  constructor() {
    this.db = null
    this.initDatabase()
    this.createHealthTables()
  }

  initDatabase() {
    try {
      this.db = getDatabase()
    } catch (error) {
      console.log('⚠️ Database não conectado para health monitor')
    }
  }

  createHealthTables() {
    try {
      if (!this.db) return

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS whatsapp_health_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          status TEXT NOT NULL,
          error_message TEXT,
          connection_uptime INTEGER,
          consecutive_failures INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS whatsapp_daily_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          total_reconnections INTEGER DEFAULT 0,
          websocket_errors INTEGER DEFAULT 0,
          uptime_minutes INTEGER DEFAULT 0,
          health_score REAL DEFAULT 100,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(date)
        )
      `)

      console.log('✅ Tabelas de health monitor criadas')
    } catch (error) {
      console.error('❌ Erro ao criar tabelas de health monitor:', error)
    }
  }

  /**
   * 📝 Registrar evento de saúde
   */
  logHealthEvent(eventType, status, errorMessage = null, metadata = {}) {
    try {
      if (!this.db) return

      this.db.prepare(`
        INSERT INTO whatsapp_health_logs (
          event_type, status, error_message, 
          connection_uptime, consecutive_failures
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        eventType,
        status,
        errorMessage,
        metadata.uptime || 0,
        metadata.consecutiveFailures || 0
      )

      // Atualizar estatísticas diárias
      this.updateDailyStats(eventType, status)
      
      console.log(`📊 Health: ${eventType} - ${status}`)
    } catch (error) {
      console.error('❌ Erro ao registrar health event:', error)
    }
  }

  /**
   * 📈 Atualizar estatísticas diárias
   */
  updateDailyStats(eventType, status) {
    try {
      if (!this.db) return

      const today = new Date().toISOString().split('T')[0]
      
      let updateField = ''
      if (eventType === 'reconnection') {
        updateField = 'total_reconnections = total_reconnections + 1'
      } else if (eventType === 'websocket_error') {
        updateField = 'websocket_errors = websocket_errors + 1'
      }

      if (updateField) {
        this.db.prepare(`
          INSERT OR REPLACE INTO whatsapp_daily_stats (
            date, ${updateField.split(' = ')[0]}
          ) VALUES (
            ?, 
            COALESCE((SELECT ${updateField.split(' = ')[0]} FROM whatsapp_daily_stats WHERE date = ?), 0) + 1
          )
        `).run(today, today)
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar daily stats:', error)
    }
  }

  /**
   * 📊 Obter estatísticas de saúde
   */
  getHealthStats(days = 7) {
    try {
      if (!this.db) return null

      const dailyStats = this.db.prepare(`
        SELECT 
          date,
          total_reconnections,
          websocket_errors,
          uptime_minutes,
          health_score
        FROM whatsapp_daily_stats 
        WHERE date >= date('now', '-${days} days')
        ORDER BY date DESC
      `).all()

      const recentEvents = this.db.prepare(`
        SELECT 
          event_type,
          status,
          error_message,
          created_at
        FROM whatsapp_health_logs 
        WHERE created_at >= datetime('now', '-24 hours')
        ORDER BY created_at DESC
        LIMIT 50
      `).all()

      const summary = this.db.prepare(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
          COUNT(CASE WHEN event_type = 'reconnection' THEN 1 END) as reconnections,
          COUNT(CASE WHEN event_type = 'websocket_error' THEN 1 END) as websocket_errors
        FROM whatsapp_health_logs 
        WHERE created_at >= datetime('now', '-${days} days')
      `).get()

      // Calcular score de saúde
      const healthScore = this.calculateHealthScore(summary)

      return {
        daily: dailyStats,
        recent: recentEvents,
        summary: {
          ...summary,
          health_score: healthScore,
          stability_rating: this.getStabilityRating(healthScore)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao obter health stats:', error)
      return null
    }
  }

  /**
   * 🎯 Calcular score de saúde (0-100)
   */
  calculateHealthScore(summary) {
    const totalEvents = summary.total_events || 1
    const errorRate = (summary.error_count / totalEvents) * 100
    const reconnectionPenalty = Math.min(summary.reconnections * 5, 50)
    const websocketPenalty = Math.min(summary.websocket_errors * 10, 30)
    
    let score = 100 - errorRate - reconnectionPenalty - websocketPenalty
    return Math.max(0, Math.min(100, score))
  }

  /**
   * 📈 Obter rating de estabilidade
   */
  getStabilityRating(score) {
    if (score >= 90) return 'EXCELENTE'
    if (score >= 80) return 'BOM'
    if (score >= 70) return 'REGULAR'
    if (score >= 50) return 'RUIM'
    return 'CRÍTICO'
  }

  /**
   * 🚨 Verificar se precisa de alerta
   */
  shouldAlert(summary) {
    const healthScore = this.calculateHealthScore(summary)
    const recentErrors = summary.error_count || 0
    const recentReconnections = summary.reconnections || 0
    
    return (
      healthScore < 70 || 
      recentErrors > 10 || 
      recentReconnections > 5
    )
  }
}

// Singleton
const whatsAppHealthMonitor = new WhatsAppHealthMonitor()

export { whatsAppHealthMonitor, WhatsAppHealthMonitor }
