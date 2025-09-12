import { Router } from 'express'
import { intelligentBotSystem } from '../services/bot/intelligentBotSystem.js'

const router = Router()

/**
 * 📊 DASHBOARD DE MÉTRICAS DO BOT INTELIGENTE
 */
router.get('/metrics', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7
    const metrics = await intelligentBotSystem.getPerformanceMetrics(days)
    
    if (!metrics) {
      return res.status(500).json({ error: 'Erro ao obter métricas' })
    }

    // Calcular estatísticas adicionais
    const stats = {
      ...metrics,
      trends: {
        confidence_trend: calculateTrend(metrics.daily, 'avg_confidence'),
        rejection_trend: calculateTrend(metrics.daily, 'rejection_rate'),
        ml_usage_trend: calculateTrend(metrics.daily, 'ml_usage_rate')
      },
      health_score: calculateHealthScore(metrics.summary)
    }

    res.json(stats)
  } catch (error) {
    console.error('❌ Erro ao obter métricas:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 📈 HTML Dashboard simples
 */
router.get('/dashboard', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7
    const metrics = await intelligentBotSystem.getPerformanceMetrics(days)
    
    if (!metrics) {
      return res.status(500).send('Erro ao carregar métricas')
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Dashboard Bot Inteligente</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #666; margin-top: 5px; }
        .daily-metrics { margin-top: 30px; }
        .table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .table th { background: #f8f9fa; font-weight: bold; }
        .status-good { color: #16a34a; }
        .status-warning { color: #ea580c; }
        .status-error { color: #dc2626; }
        .refresh-btn { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 20px; }
        .refresh-btn:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Dashboard Bot Inteligente</h1>
            <p>Monitoramento em tempo real - Últimos ${days} dias</p>
            <button class="refresh-btn" onclick="window.location.reload()">🔄 Atualizar</button>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${metrics.summary.total_conversations || 0}</div>
                <div class="metric-label">Total de Conversas</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value ${getConfidenceClass(metrics.summary.avg_confidence)}">${(metrics.summary.avg_confidence || 0).toFixed(1)}%</div>
                <div class="metric-label">Confiança Média</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value ${getRejectionClass(metrics.performance.rejection_rate)}">${metrics.performance.rejection_rate.toFixed(1)}%</div>
                <div class="metric-label">Taxa de Rejeições</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value status-good">${metrics.performance.ml_usage_rate.toFixed(1)}%</div>
                <div class="metric-label">Uso do ML</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">${(metrics.summary.avg_conversation_length || 0).toFixed(1)}</div>
                <div class="metric-label">Mensagens por Conversa</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value ${getHealthClass(calculateHealthScore(metrics.summary))}">${calculateHealthScore(metrics.summary).toFixed(0)}%</div>
                <div class="metric-label">Score de Saúde</div>
            </div>
        </div>

        <div class="daily-metrics">
            <h2>📈 Métricas Diárias</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Mensagens</th>
                        <th>Rejeições</th>
                        <th>Taxa Rejeição</th>
                        <th>Uso ML</th>
                        <th>Confiança</th>
                    </tr>
                </thead>
                <tbody>
                    ${metrics.daily.map(day => `
                        <tr>
                            <td>${formatDate(day.date)}</td>
                            <td>${day.total_messages || 0}</td>
                            <td>${(day.ml_usage_rate || 0).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        function formatDate(dateStr) {
            return new Date(dateStr).toLocaleDateString('pt-BR');
        }
        
        function getConfidenceClass(confidence) {
            return confidence >= 80 ? 'status-good' : confidence >= 60 ? 'status-warning' : 'status-error';
        }
        
        function getRejectionClass(rate) {
            return rate <= 5 ? 'status-good' : rate <= 15 ? 'status-warning' : 'status-error';
        }
        
        function getHealthClass(score) {
            return score >= 80 ? 'status-good' : score >= 60 ? 'status-warning' : 'status-error';
        }
        
        function calculateHealthScore(summary) {
            const confidence = summary.avg_confidence || 0;
            const rejectionRate = ((summary.total_rejections / summary.total_conversations) * 100) || 0;
            const mlUsage = ((summary.ml_price_usage / summary.total_conversations) * 100) || 0;
            
            let score = confidence;
            score -= rejectionRate * 2; // Penalizar rejeições
            score += mlUsage * 0.5; // Bonificar uso do ML
            
            return Math.max(0, Math.min(100, score));
        }
        
        // Auto-refresh a cada 30 segundos
        setTimeout(() => window.location.reload(), 30000);
    </script>
</body>
</html>`

    res.send(html)
  } catch (error) {
    console.error('❌ Erro ao gerar dashboard:', error)
    res.status(500).send('Erro ao carregar dashboard')
  }
})

function calculateTrend(daily, field) {
  if (!daily || daily.length < 2) return 0
  
  const recent = daily.slice(0, 3).reduce((sum, day) => sum + (day[field] || 0), 0) / 3
  const older = daily.slice(-3).reduce((sum, day) => sum + (day[field] || 0), 0) / 3
  
  return recent - older
}

function calculateHealthScore(summary) {
  const confidence = summary.avg_confidence || 0
  const rejectionRate = ((summary.total_rejections / summary.total_conversations) * 100) || 0
  const mlUsage = ((summary.ml_price_usage / summary.total_conversations) * 100) || 0
  
  let score = confidence
  score -= rejectionRate * 2 // Penalizar rejeições
  score += mlUsage * 0.5 // Bonificar uso do ML
  
  return Math.max(0, Math.min(100, score))
}

function getConfidenceClass(confidence) {
  return confidence >= 80 ? 'status-good' : confidence >= 60 ? 'status-warning' : 'status-error'
}

function getRejectionClass(rate) {
  return rate <= 5 ? 'status-good' : rate <= 15 ? 'status-warning' : 'status-error'
}

function getHealthClass(score) {
  return score >= 80 ? 'status-good' : score >= 60 ? 'status-warning' : 'status-error'
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export default router
