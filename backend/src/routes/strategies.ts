// Rota para estatísticas das estratégias adaptativas
import { Router } from 'express'
import { adaptiveStrategyManager } from '../services/bot/adaptiveStrategies'

const router = Router()

// GET /api/strategies/stats - Obter estatísticas das estratégias
router.get('/stats', async (req, res) => {
  try {
    const stats = adaptiveStrategyManager.getStrategyStats()
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalStrategies: stats.length,
      strategies: stats
    })
  } catch (error: any) {
    console.error('❌ Erro ao obter estatísticas:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/strategies/reset - Reset das métricas
router.post('/reset', async (req, res) => {
  try {
    adaptiveStrategyManager.resetMetrics()
    
    res.json({
      success: true,
      message: 'Métricas das estratégias resetadas com sucesso',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Erro ao resetar métricas:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
