import { Router } from 'express'
import { prisma } from '../server'
import { asyncHandler } from '../middleware/errorHandler'
import { AuthenticatedRequest } from '../middleware/auth'
import { logger } from '../utils/logger'

const router = Router()

// Buscar campanhas do usuário
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const campanhas = await prisma.campanha.findMany({
    include: {
      criativos: {
        select: {
          id: true,
          nome: true,
          tipo: true,
          status: true,
          impressoes: true,
          cliques: true,
          gasto: true,
          ctr: true
        }
      },
      _count: {
        select: {
          criativos: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  })

  // Calcular métricas agregadas
  const campanhasComMetricas = campanhas.map(campanha => {
    const totalCriativos = campanha._count.criativos
    const criativosAtivos = campanha.criativos.filter(c => c.status === 'ACTIVE').length
    
    return {
      ...campanha,
      totalCriativos,
      criativosAtivos,
      performanceScore: calcularPerformanceScore(campanha)
    }
  })

  res.json(campanhasComMetricas)
}))

// Buscar campanha específica
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params

  const campanha = await prisma.campanha.findUnique({
    where: { id },
    include: {
      criativos: true,
      insights: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  if (!campanha) {
    return res.status(404).json({
      error: 'Campanha não encontrada'
    })
  }

  res.json(campanha)
}))

// Buscar métricas de performance
router.get('/:id/metrics', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const { periodo = '30' } = req.query

  const diasAtras = parseInt(periodo as string)
  const dataInicio = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000)

  // Buscar dados históricos (simulado - em produção viria de uma tabela de métricas históricas)
  const metricas = await prisma.campanha.findUnique({
    where: { id },
    include: {
      criativos: {
        select: {
          impressoes: true,
          cliques: true,
          gasto: true,
          conversoes: true
        }
      }
    }
  })

  if (!metricas) {
    return res.status(404).json({
      error: 'Campanha não encontrada'
    })
  }

  // Agregar métricas
  const totais = metricas.criativos.reduce((acc, criativo) => ({
    impressoes: acc.impressoes + criativo.impressoes,
    cliques: acc.cliques + criativo.cliques,
    gasto: acc.gasto + criativo.gasto,
    conversoes: acc.conversoes + criativo.conversoes
  }), { impressoes: 0, cliques: 0, gasto: 0, conversoes: 0 })

  const ctr = totais.impressoes > 0 ? (totais.cliques / totais.impressoes) * 100 : 0
  const cpm = totais.impressoes > 0 ? (totais.gasto / totais.impressoes) * 1000 : 0
  const cpc = totais.cliques > 0 ? totais.gasto / totais.cliques : 0
  const roas = totais.gasto > 0 ? (totais.conversoes * metricas.receita) / totais.gasto : 0

  res.json({
    periodo: `${periodo} dias`,
    metricas: {
      ...totais,
      ctr: Number(ctr.toFixed(2)),
      cpm: Number(cpm.toFixed(2)),
      cpc: Number(cpc.toFixed(2)),
      roas: Number(roas.toFixed(2))
    },
    tendencias: {
      impressoes: Math.random() > 0.5 ? 'up' : 'down',
      cliques: Math.random() > 0.5 ? 'up' : 'down',
      ctr: Math.random() > 0.5 ? 'up' : 'down',
      gasto: Math.random() > 0.5 ? 'up' : 'down'
    }
  })
}))

// Atualizar campanha
router.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const { nome, status, orcamento } = req.body

  const campanha = await prisma.campanha.update({
    where: { id },
    data: {
      ...(nome && { nome }),
      ...(status && { status }),
      ...(orcamento && { orcamento: parseFloat(orcamento) }),
      updatedAt: new Date()
    }
  })

  // Log de auditoria
  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'UPDATE',
      resource: 'campanha',
      resourceId: id,
      newData: { nome, status, orcamento }
    }
  })

  logger.info(`Campanha atualizada: ${id}`, { userId: req.user!.id, changes: { nome, status, orcamento } })

  res.json(campanha)
}))

// Pausar/Ativar campanha
router.post('/:id/toggle', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params

  const campanha = await prisma.campanha.findUnique({
    where: { id }
  })

  if (!campanha) {
    return res.status(404).json({
      error: 'Campanha não encontrada'
    })
  }

  const novoStatus = campanha.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'

  const campanhaAtualizada = await prisma.campanha.update({
    where: { id },
    data: {
      status: novoStatus,
      updatedAt: new Date()
    }
  })

  // Log de auditoria
  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'TOGGLE_STATUS',
      resource: 'campanha',
      resourceId: id,
      oldData: { status: campanha.status },
      newData: { status: novoStatus }
    }
  })

  logger.info(`Status da campanha alterado: ${id}`, { 
    userId: req.user!.id, 
    statusAnterior: campanha.status, 
    novoStatus 
  })

  res.json({
    message: `Campanha ${novoStatus === 'ACTIVE' ? 'ativada' : 'pausada'} com sucesso`,
    campanha: campanhaAtualizada
  })
}))

// Função auxiliar para calcular score de performance
function calcularPerformanceScore(campanha: any): number {
  let score = 0
  
  // CTR (peso: 30%)
  const ctr = campanha.ctr || 0
  if (ctr > 2) score += 30
  else if (ctr > 1) score += 20
  else if (ctr > 0.5) score += 10
  
  // ROAS (peso: 40%)
  const roas = campanha.roas || 0
  if (roas > 4) score += 40
  else if (roas > 2) score += 30
  else if (roas > 1) score += 20
  else if (roas > 0.5) score += 10
  
  // Volume de impressões (peso: 20%)
  const impressoes = campanha.impressoes || 0
  if (impressoes > 100000) score += 20
  else if (impressoes > 50000) score += 15
  else if (impressoes > 10000) score += 10
  else if (impressoes > 1000) score += 5
  
  // Status ativo (peso: 10%)
  if (campanha.status === 'ACTIVE') score += 10
  
  return Math.min(score, 100)
}

export default router