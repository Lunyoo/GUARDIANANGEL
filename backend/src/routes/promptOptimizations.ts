import { Router } from 'express'
import { promptOptimizer } from '../services/ml/promptOptimizer.js'

const router = Router()

// 🧠 Obter otimizações de prompt pendentes
router.get('/prompt-optimizations', (req, res) => {
  try {
    const pendingOptimizations = promptOptimizer.getPendingOptimizations()
    const history = promptOptimizer.getOptimizationHistory().slice(0, 10) // Últimas 10
    
    res.json({
      success: true,
      pendingOptimizations,
      history,
      totalPending: pendingOptimizations.length
    })
  } catch (error) {
    console.error('❌ Erro ao obter otimizações de prompt:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ✅ Aprovar otimização de prompt
router.post('/prompt-optimizations/:optimizationId/approve', (req, res) => {
  try {
    const { optimizationId } = req.params
    const { approvedBy = 'admin' } = req.body
    
    const success = promptOptimizer.approveOptimization(optimizationId, approvedBy)
    
    if (success) {
      res.json({
        success: true,
        message: 'Otimização de prompt aprovada e aplicada',
        optimizationId
      })
    } else {
      res.status(404).json({
        success: false,
        error: 'Otimização não encontrada ou já processada'
      })
    }
  } catch (error) {
    console.error('❌ Erro ao aprovar otimização:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ❌ Rejeitar otimização de prompt
router.post('/prompt-optimizations/:optimizationId/reject', (req, res) => {
  try {
    const { optimizationId } = req.params
    const { rejectedBy = 'admin' } = req.body
    
    const success = promptOptimizer.rejectOptimization(optimizationId, rejectedBy)
    
    if (success) {
      res.json({
        success: true,
        message: 'Otimização de prompt rejeitada',
        optimizationId
      })
    } else {
      res.status(404).json({
        success: false,
        error: 'Otimização não encontrada ou já processada'
      })
    }
  } catch (error) {
    console.error('❌ Erro ao rejeitar otimização:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// 🤖 Gerar otimizações automáticas
router.post('/generate-optimizations', (req, res) => {
  try {
    const generated = promptOptimizer.generateAutomaticOptimizations()
    
    res.json({
      success: true,
      message: `${generated.length} otimizações geradas`,
      optimizations: generated.map(id => promptOptimizer.getOptimization(id)),
      count: generated.length
    })
  } catch (error) {
    console.error('❌ Erro ao gerar otimizações:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// 📊 Análise de performance do prompt
router.get('/prompt-analysis/:productId?', (req, res) => {
  try {
    const { productId = 'default' } = req.params
    const analysis = promptOptimizer.analyzePromptPerformance(productId)
    
    res.json({
      success: true,
      analysis,
      productId
    })
  } catch (error) {
    console.error('❌ Erro na análise de prompt:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
