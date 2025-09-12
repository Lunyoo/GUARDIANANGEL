import { Router } from 'express'
import { budgetAllocator } from '../services/ml/budgetAllocator.js'

const allocatorRouter = Router()

// Status do Budget Allocator
allocatorRouter.get('/status', (req: any, res: any) => {
  try {
    const metrics = budgetAllocator.getMetrics()
    const decisions = budgetAllocator.getDecisionHistory(10)
    const pending = budgetAllocator.listPendingDecisions()
    
    res.json({
      success: true,
      isActive: true,
      metrics,
      totalDecisions: decisions.length,
      pendingDecisions: pending.length,
      approvals: {
        enabled: budgetAllocator.getApprovalsMode()
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Adicionar/atualizar campanha
allocatorRouter.post('/add-campaign', (req: any, res: any) => {
  try {
    const { campaignId, name, budget = 0, totalSpent = 0, totalLeads = 0, roas = 0, active = true } = req.body
    if (!campaignId || !name) {
      return res.status(400).json({ success: false, error: 'campaignId e name são obrigatórios' })
    }
    budgetAllocator.addOrUpdateCampaign({ campaignId, name, budget, totalSpent, totalLeads, roas, active })
    res.json({ success: true, campaignId, message: 'Campanha adicionada/atualizada' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Ativar sistema de aprovações
allocatorRouter.post('/approvals/enable', (req: any, res: any) => {
  try {
    budgetAllocator.setApprovalsMode(true)
    res.json({ success: true, message: 'Sistema de aprovações ativado' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Alocar budget inteligente (gera decisões automáticas)
allocatorRouter.post('/allocate', (req: any, res: any) => {
  try {
    const { strategy = 'balanced' } = req.body
    const decision = budgetAllocator.allocateBudget(strategy)
    
    res.json({ 
      success: true, 
      decision,
      needsApproval: !!(decision as any).pendingApproval,
      message: (decision as any).pendingApproval ? 'Decisão criada - aguardando aprovação' : 'Orçamentos alocados'
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Listar aprovações pendentes
allocatorRouter.get('/pending', (req: any, res: any) => {
  try {
    const pending = budgetAllocator.listPendingDecisions()
    res.json({ success: true, pending })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Aprovar decisão
allocatorRouter.post('/decision/:id/approve', (req: any, res: any) => {
  try {
    const { id } = req.params
    const result = budgetAllocator.approveDecision(id)
    
    if (result.ok) {
      res.json({ 
        success: true, 
        message: 'Decisão aprovada - aplicando mudanças...', 
        decision: result.decision 
      })
    } else {
      res.status(404).json({ success: false, error: 'Decisão não encontrada' })
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default allocatorRouter
