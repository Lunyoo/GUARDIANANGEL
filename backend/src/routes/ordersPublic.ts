import { Router } from 'express'
import { getDatabase } from '../config/database.js'

// Lightweight, public notifications feed for recent orders/sales
// Shape: { notifications: Array<{ id: string; message: string; ts: number }> }
const router = Router()

// Try to lazy load Prisma if available (optional)
let prisma: any = null
try {
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client')
  prisma = new PrismaClient()
} catch {
  prisma = null
}

router.get('/orders/notifications', async (_req, res) => {
  try {
    const notifications: Array<{ id: string; message: string; ts: number }> = []

    if (prisma?.hypeeOrder) {
      try {
        const recent = await prisma.hypeeOrder.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, createdAt: true, customerName: true, totalAmount: true, status: true }
        })
        for (const o of recent) {
          const name = o.customerName || 'Cliente'
          const val = typeof o.totalAmount === 'number' ? o.totalAmount : Number(o.totalAmount || 0)
          const msg = `${name} fez um pedido de R$ ${val.toFixed(2)} (${String(o.status || 'novo').toLowerCase()})`
          notifications.push({ id: String(o.id), message: msg, ts: new Date(o.createdAt as any).getTime() })
        }
      } catch {
        // fall back to sales_events
      }
    }

    if (notifications.length === 0) {
      // Fallback: use sales_events table for last received/forwarded events
      try {
        const db = getDatabase()
        const rows = db.prepare(`
          SELECT id, event_id, payload, COALESCE(updated_at, created_at) as ts, status
          FROM sales_events
          WHERE status IN ('received','forwarded','capi_failed')
          ORDER BY COALESCE(updated_at, created_at) DESC
          LIMIT 5
        `).all() as Array<{ id: number; event_id?: string | null; payload?: string; ts: string; status?: string | null }>
        for (const r of rows) {
          let value: number | undefined
          let buyer: string | undefined
          try {
            const p = JSON.parse(String(r.payload || '{}'))
            const v = p?.value ?? p?.amount ?? p?.total ?? p?.total_value ?? p?.price
            value = typeof v === 'number' ? v : parseFloat(String(v))
            buyer = p?.buyer_name || p?.buyer?.name || p?.customer?.name
          } catch {}
          const vStr = typeof value === 'number' && !isNaN(value) ? ` de R$ ${value.toFixed(2)}` : ''
          const who = buyer ? `${buyer} ` : ''
          const status = (r.status || 'novo').toString()
          const msg = `${who}gerou um evento de venda${vStr} (${status})`
          notifications.push({ id: String(r.event_id || r.id), message: msg, ts: new Date(r.ts).getTime() })
        }
      } catch {
        // ignore
      }
    }

    // Return newest first, trimmed to 5
    notifications.sort((a, b) => b.ts - a.ts)
    return res.json({ notifications: notifications.slice(0, 5) })
  } catch (e: any) {
    return res.json({ notifications: [] })
  }
})

export default router
