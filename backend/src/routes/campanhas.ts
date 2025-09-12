import { Router } from 'express'
import { getDatabase } from '../config/database.js'
import { asyncHandler } from '../middleware/errorHandler'
import type { Request } from 'express'
// Using local AuthRequest shape consistent with auth middleware
interface AuthRequest extends Request { user?: any }
import { logger } from '../utils/logger'

const router = Router()

// Buscar campanhas do usuário
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const db = getDatabase()
  // Basic campaigns table may not exist; we simulate from campaigns_cache if present
  try {
    const rows = db.prepare('SELECT id, data, cached_at as updatedAt FROM campaigns_cache ORDER BY cached_at DESC LIMIT 50').all()
  const campanhas = (rows as any[]).map((r: any) => {
      let parsed: any = {}
      try { parsed = JSON.parse(r.data) } catch {}
      return {
        id: r.id,
        nome: parsed.name || parsed.nome || 'Campanha',
        status: parsed.status || 'ACTIVE',
        updatedAt: r.updatedAt,
        criativos: parsed.creatives || [],
        _count: { criativos: (parsed.creatives||[]).length }
      }
    })
    const campanhasComMetricas = campanhas.map(c => ({
      ...c,
      totalCriativos: c._count.criativos,
      criativosAtivos: c.criativos.filter((x:any)=> x.status==='ACTIVE').length,
      performanceScore: calcularPerformanceScore(c)
    }))
    return res.json(campanhasComMetricas)
  } catch (e) {
    return res.json([])
  }
}))

// Buscar campanha específica
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params
  const db = getDatabase()
  try {
  const row: any = db.prepare('SELECT id, data, cached_at as updatedAt FROM campaigns_cache WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Campanha não encontrada' })
  let parsed: any = {}
  try { parsed = JSON.parse(row.data || '{}') } catch {}
  return res.json({ id: row.id, ...parsed, updatedAt: row.updatedAt })
  } catch {
    return res.status(404).json({ error: 'Campanha não encontrada' })
  }
}))

router.get('/:id/metrics', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params
  const { periodo = '30' } = req.query
  const db = getDatabase()
  try {
  const row: any = db.prepare('SELECT data FROM campaigns_cache WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Campanha não encontrada' })
  let parsed: any = {}
  try { parsed = JSON.parse(row.data || '{}') } catch {}
    const criativos = parsed.creatives || []
    const totais = criativos.reduce((acc: any, c: any) => ({
      impressoes: acc.impressoes + (c.impressoes||0),
      cliques: acc.cliques + (c.cliques||0),
      gasto: acc.gasto + (c.gasto||0),
      conversoes: acc.conversoes + (c.conversoes||0)
    }), { impressoes:0, cliques:0, gasto:0, conversoes:0 })
    const ctr = totais.impressoes ? (totais.cliques / totais.impressoes) * 100 : 0
    const cpm = totais.impressoes ? (totais.gasto / totais.impressoes) * 1000 : 0
    const cpc = totais.cliques ? totais.gasto / totais.cliques : 0
    const roas = totais.gasto ? ((totais.conversoes||0) * (parsed.receita||0)) / totais.gasto : 0
    return res.json({ periodo: `${periodo} dias`, metricas: { ...totais, ctr, cpm, cpc, roas } })
  } catch {
    return res.status(404).json({ error: 'Campanha não encontrada' })
  }
}))

// Atualizar campanha
router.patch('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params
  const { nome, status } = req.body
  const db = getDatabase()
  // For cache-backed campaigns we update cached JSON if exists
  const row: any = db.prepare('SELECT data FROM campaigns_cache WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Campanha não encontrada' })
  let parsed: any = {}
  try { parsed = JSON.parse(row.data || '{}') } catch {}
  if (nome) parsed.nome = nome
  if (status) parsed.status = status
  db.prepare('UPDATE campaigns_cache SET data = ?, cached_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(parsed), id)
  logger.info(`Campanha atualizada: ${id}`, { userId: req.user?.id, changes: { nome, status } })
  res.json({ id, ...parsed })
}))

// Pausar/Ativar campanha
router.post('/:id/toggle', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params
  const db = getDatabase()
  const row: any = db.prepare('SELECT data FROM campaigns_cache WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Campanha não encontrada' })
  let parsed: any = {}
  try { parsed = JSON.parse(row.data || '{}') } catch {}
  const currentStatus = parsed.status || 'ACTIVE'
  const novoStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
  parsed.status = novoStatus
  db.prepare('UPDATE campaigns_cache SET data = ?, cached_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(parsed), id)
  logger.info(`Status da campanha alterado: ${id}`, { userId: req.user?.id, statusAnterior: currentStatus, novoStatus })
  res.json({ message: `Campanha ${novoStatus === 'ACTIVE' ? 'ativada' : 'pausada'} com sucesso`, campanha: { id, ...parsed } })
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