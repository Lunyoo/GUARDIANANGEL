import { Router } from 'express'
import { autoOptimizer } from '../services/ml/autoOptimizer.js'
import { approvalSystem } from '../services/ml/approvalSystem.js'

const router = Router()

/**
 * 📊 Status do auto-otimizador
 */
router.get('/status', (req, res) => {
  try {
    const stats = autoOptimizer.getStats()
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * 🚀 Iniciar auto-otimizador
 */
router.post('/start', (req, res) => {
  try {
    autoOptimizer.start()
    res.json({
      success: true,
      message: '🚀 Auto-otimizador iniciado!'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * ⏹️ Parar auto-otimizador
 */
router.post('/stop', (req, res) => {
  try {
    autoOptimizer.stop()
    res.json({
      success: true,
      message: '⏹️ Auto-otimizador parado!'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * 🔄 Forçar ciclo de otimização manual
 */
router.post('/optimize-now', async (req, res) => {
  try {
    // Trigger immediate optimization cycle
    autoOptimizer['runOptimizationCycle']()
    
    res.json({
      success: true,
      message: '🔄 Ciclo de otimização iniciado manualmente!'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * 🔔 Ativar notificações do auto-otimizador
 */
router.post('/notifications/enable', (req, res) => {
  try {
    autoOptimizer.setNotifications(true)
    res.json({
      success: true,
      message: '🔔 Notificações do auto-otimizador ATIVADAS!'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * 🔕 Desativar notificações do auto-otimizador
 */
router.post('/notifications/disable', (req, res) => {
  try {
    autoOptimizer.setNotifications(false)
    res.json({
      success: true,
      message: '🔕 Notificações do auto-otimizador DESATIVADAS!'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * 🔔 Ativar notificações de aprovação
 */
router.post('/approvals/notifications/enable', (req, res) => {
  try {
    approvalSystem.setNotifications(true)
    res.json({
      success: true,
      message: '🔔 Notificações de aprovação ATIVADAS!'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * 🔕 Desativar notificações de aprovação
 */
router.post('/approvals/notifications/disable', (req, res) => {
  try {
    approvalSystem.setNotifications(false)
    res.json({
      success: true,
      message: '🔕 Notificações de aprovação DESATIVADAS!'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

export default router
