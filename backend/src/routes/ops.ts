import { Router } from 'express'
import os from 'os'
import { budgetAllocator } from '../services/ml/budgetAllocator.js'
import { intelligentQueue } from '../services/ml/intelligentQueue.js'
import { contextualBotPolicy } from '../services/ml/contextualBotPolicy.js'
import { leadScoringEngine } from '../services/ml/leadScoring.js'
import { neuralOrchestrator } from '../services/ml/neuralOrchestrator.js'
import { PrismaClient } from '@prisma/client'
import { getDatabase } from '../config/database.js'
import logger from '../config/logger.js'

const router = Router()
const prisma = new PrismaClient() as any

// naive event loop lag measure
let lastTick = Date.now()
let eventLoopLagMs = 0
setInterval(() => {
  const now = Date.now()
  const lag = now - lastTick - 500
  eventLoopLagMs = Math.max(0, lag)
  lastTick = now
}, 500)

router.get('/dashboard', async (_req,res)=>{
  const alloc = budgetAllocator.getMetrics()
  const queue = intelligentQueue.getMetrics()
  const bot = contextualBotPolicy.getMetrics() as any
  const scoringVersion = (leadScoringEngine as any).modelVersion
  const neural = await neuralOrchestrator.getSystemMetrics() as any
  const lastDecision = (budgetAllocator as any).getDecisionHistory?.(1)?.[0]
  const diversificationScore = lastDecision?.diversificationScore ?? 0
  const mem = process.memoryUsage()
  res.json({
    health: { score: Math.min(100, (alloc.overallROAS*50)+(queue.queueLength<50?30:10)+(bot.arms.length*2)), status:'ok' },
    allocator: { ...alloc, diversificationScore },
    queue,
    botPolicy: { arms: bot.arms.length, total: bot.total },
    scoring: { modelVersion: scoringVersion },
    anomalies: { total: 0, high: 0 },
    eventLoopLagMs,
    memory: mem.rss,
    system: { load: os.loadavg(), uptime: os.uptime() }
  })
})

export default router

// Orders endpoints for Ops
router.get('/orders', async (_req,res)=>{
  try {
    if (!prisma.hypeeOrder) return res.json([])
    const orders = await prisma.hypeeOrder.findMany({ orderBy:{ createdAt: 'desc' }, take: 100 })
    res.json(orders)
  } catch(e:any){ res.status(500).json({ error: e.message }) }
})

router.get('/orders/stats', async (_req,res)=>{
  try {
    if (!prisma.hypeeOrder) return res.json({ total_orders:0, pending_orders:0, shipped_orders:0, delivered_orders:0, cancelled_orders:0, total_revenue:0, avg_order_value:0, cod_success_rate:0, delivery_success_rate:0 })
    const [total, pending, shipped, delivered, cancelled, sums] = await Promise.all([
      prisma.hypeeOrder.count(),
      prisma.hypeeOrder.count({ where:{ status: { in: ['PENDING','PENDING_ADMIN','pending'] } } }),
      prisma.hypeeOrder.count({ where:{ status: { in: ['SHIPPED','shipped'] } } }),
      prisma.hypeeOrder.count({ where:{ status: { in: ['DELIVERED','delivered'] } } }),
      prisma.hypeeOrder.count({ where:{ status: { in: ['CANCELLED','cancelled'] } } }),
      prisma.hypeeOrder.aggregate({ _sum: { totalAmount: true } })
    ])
    const totalRevenue = Number(sums?._sum?.totalAmount || 0)
    const avg = total > 0 ? totalRevenue / total : 0
    // compute COD success rate if we have COD flags
    let codSuccessRate = 0
    try {
      const [codTotal, codDelivered] = await Promise.all([
        prisma.hypeeOrder.count({ where: { paymentMethod: { in: ['COD','cod','cash_on_delivery'] } } }),
        prisma.hypeeOrder.count({ where: { paymentMethod: { in: ['COD','cod','cash_on_delivery'] }, status: { in: ['DELIVERED','delivered'] } } })
      ])
      codSuccessRate = codTotal > 0 ? codDelivered / codTotal : 0
    } catch {}
    return res.json({
      total_orders: total,
      pending_orders: pending,
      shipped_orders: shipped,
      delivered_orders: delivered,
      cancelled_orders: cancelled,
      total_revenue: totalRevenue,
      avg_order_value: avg,
      cod_success_rate: codSuccessRate,
      delivery_success_rate: delivered / Math.max(1, (shipped + delivered))
    })
  } catch(e:any){ res.status(500).json({ error: e.message }) }
})

// -------------------------------------------------------------
// 📊 Sales/Bot QA snapshot (today + last 7d)
// -------------------------------------------------------------
router.get('/sales-qa', async (_req, res) => {
  try {
    const db = getDatabase()
  const todayStart = (db.prepare(`SELECT datetime('now','start of day') as d`).get() as any).d as string
  const weekStart = (db.prepare(`SELECT datetime('now','-7 days','start of day') as d`).get() as any).d as string

    const one = (sql: string, params: any[] = []) => {
      try { return (db.prepare(sql).get(...params) as any) || {} } catch { return {} }
    }
    const all = (sql: string, params: any[] = []) => {
      try { return db.prepare(sql).all(...params) as any[] } catch { return [] }
    }

    // Messages/Leads/Conversations
    const mIn = one(`SELECT COUNT(1) c FROM messages WHERE direction = 'inbound' AND datetime(created_at) >= datetime(?)`, [todayStart]).c || 0
    const mOut = one(`SELECT COUNT(1) c FROM messages WHERE direction = 'outbound' AND datetime(created_at) >= datetime(?)`, [todayStart]).c || 0
    const leadsNew = one(`SELECT COUNT(1) c FROM leads WHERE datetime(created_at) >= datetime(?)`, [todayStart]).c || 0
    const convUpd = one(`SELECT COUNT(1) c FROM conversations WHERE datetime(updated_at) >= datetime(?)`, [todayStart]).c || 0

    // First response latency (approx median, in seconds)
    const firstInbound = all(`
      SELECT lead_id AS leadId, MIN(datetime(created_at)) AS firstIn
      FROM messages
      WHERE direction = 'inbound' AND datetime(created_at) >= datetime(?)
      GROUP BY lead_id
    `, [todayStart])
    const latencies: number[] = []
    for (const r of firstInbound) {
      try {
        const nextOut = one(
          `SELECT MIN(strftime('%s', created_at)) as ts FROM messages WHERE direction='outbound' AND lead_id = ? AND datetime(created_at) >= datetime(?)`,
          [r.leadId, r.firstIn]
        ).ts
        const tIn = one(`SELECT strftime('%s', ?) as ts`, [r.firstIn]).ts
        if (typeof nextOut === 'number' && typeof tIn === 'number' && nextOut >= tIn) {
          latencies.push(nextOut - tIn)
        }
      } catch {}
    }
    latencies.sort((a,b)=>a-b)
    const medianRespSec = latencies.length ? latencies[Math.floor(latencies.length/2)] : null

    // Sales events today and last 7d
    // Table may not exist yet; handle gracefully
    let salesToday = 0, forwardedToday = 0, failedToday = 0, revenueToday = 0
    let sales7d = 0, forwarded7d = 0, failed7d = 0, revenue7d = 0
    try {
      salesToday = one(`SELECT COUNT(1) c FROM sales_events WHERE datetime(created_at) >= datetime(?)`, [todayStart]).c || 0
      forwardedToday = one(`SELECT COUNT(1) c FROM sales_events WHERE status='forwarded' AND datetime(created_at) >= datetime(?)`, [todayStart]).c || 0
      failedToday = one(`SELECT COUNT(1) c FROM sales_events WHERE status='capi_failed' AND datetime(created_at) >= datetime(?)`, [todayStart]).c || 0
      const rowsToday = all(`SELECT payload FROM sales_events WHERE datetime(created_at) >= datetime(?)`, [todayStart])
      for (const r of rowsToday) {
        try {
          const p = JSON.parse(r.payload || '{}')
          const val = Number(p.value ?? p.amount ?? p.total ?? p.total_value ?? p.price)
          if (!isNaN(val)) revenueToday += val
        } catch {}
      }

      sales7d = one(`SELECT COUNT(1) c FROM sales_events WHERE datetime(created_at) >= datetime(?)`, [weekStart]).c || 0
      forwarded7d = one(`SELECT COUNT(1) c FROM sales_events WHERE status='forwarded' AND datetime(created_at) >= datetime(?)`, [weekStart]).c || 0
      failed7d = one(`SELECT COUNT(1) c FROM sales_events WHERE status='capi_failed' AND datetime(created_at) >= datetime(?)`, [weekStart]).c || 0
      const rows7 = all(`SELECT payload FROM sales_events WHERE datetime(created_at) >= datetime(?)`, [weekStart])
      for (const r of rows7) {
        try {
          const p = JSON.parse(r.payload || '{}')
          const val = Number(p.value ?? p.amount ?? p.total ?? p.total_value ?? p.price)
          if (!isNaN(val)) revenue7d += val
        } catch {}
      }
    } catch (e:any) {
      logger.warn('sales-qa: sales_events unavailable: ' + (e?.message || e))
    }

    // Keyword focus: "calcinha"
    const kwIn = one(`SELECT COUNT(1) c FROM messages WHERE datetime(created_at) >= datetime(?) AND LOWER(content) LIKE '%calcinha%'`, [todayStart]).c || 0
    const kwOut = one(`SELECT COUNT(1) c FROM messages WHERE datetime(created_at) >= datetime(?) AND LOWER(content) LIKE '%calcinha%' AND direction='outbound'`, [todayStart]).c || 0

    res.json({
      timeframe: { todayStart, weekStart },
      messages: { inboundToday: mIn, outboundToday: mOut, firstResponseMedianSec: medianRespSec },
      leads: { newToday: leadsNew },
      conversations: { updatedToday: convUpd },
      sales: {
        today: { events: salesToday, forwarded: forwardedToday, failed: failedToday, revenueEstimate: revenueToday },
        last7d: { events: sales7d, forwarded: forwarded7d, failed: failed7d, revenueEstimate: revenue7d }
      },
      productSignals: { keywordCalcinha: { inboundToday: kwIn, outboundToday: kwOut } }
    })
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'sales-qa failed' })
  }
})
