import { Router } from 'express'
import { AdminReportingSystem } from '../services/bot/adminSystem.js'

const router = Router()

/**
 * 📊 API ENDPOINTS PARA DASHBOARD
 */

// GET /api/dashboard/metrics - Métricas gerais
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await AdminReportingSystem.getDashboardMetrics()
    res.json(metrics)
  } catch (error: any) {
    console.error('Erro ao buscar métricas:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/dashboard/sales - Vendas do período
router.get('/sales', async (req, res) => {
  try {
    const { period = 'today' } = req.query
    const sales = await AdminReportingSystem.getSalesData(period as string)
    res.json(sales)
  } catch (error: any) {
    console.error('Erro ao buscar vendas:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/dashboard/conversations - Conversas ativas
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await AdminReportingSystem.getActiveConversations()
    res.json(conversations)
  } catch (error: any) {
    console.error('Erro ao buscar conversas:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/dashboard/problems - Problemas reportados
router.get('/problems', async (req, res) => {
  try {
    const { status = 'all' } = req.query
    const problems = await AdminReportingSystem.getProblems(status as string)
    res.json(problems)
  } catch (error: any) {
    console.error('Erro ao buscar problemas:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/dashboard/performance - Performance do bot
router.get('/performance', async (req, res) => {
  try {
    const performance = await AdminReportingSystem.getBotPerformance()
    res.json(performance)
  } catch (error: any) {
    console.error('Erro ao buscar performance:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/dashboard/cities - Estatísticas por cidade
router.get('/cities', async (req, res) => {
  try {
    const cities = await AdminReportingSystem.getCitiesStats()
    res.json(cities)
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas de cidades:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/dashboard/problem/:id/resolve - Marcar problema como resolvido
router.post('/problem/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params
    const { resolution } = req.body
    
    await AdminReportingSystem.resolveProblem(id, resolution)
    res.json({ success: true, message: 'Problema resolvido' })
  } catch (error: any) {
    console.error('Erro ao resolver problema:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/dashboard/real-time - Dados em tempo real via SSE
router.get('/real-time', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  // Envia dados iniciais
  const sendUpdate = async () => {
    try {
      const realTimeData = await AdminReportingSystem.getRealTimeData()
      res.write(`data: ${JSON.stringify(realTimeData)}\n\n`)
    } catch (error) {
      console.error('Erro ao enviar dados em tempo real:', error)
    }
  }

  // Envia a cada 5 segundos
  const interval = setInterval(sendUpdate, 5000)
  sendUpdate() // Primeira chamada imediata

  // Cleanup quando cliente desconectar
  req.on('close', () => {
    clearInterval(interval)
    res.end()
  })
})

export default router
