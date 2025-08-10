import axios from 'axios'
import logger from '../config/logger.js'
import { getDatabase } from '../config/database.js'

type SalesEventRow = {
  id: number
  event_id: string | null
  source: string | null
  payload: string
  status: string | null
  created_at: string
  updated_at?: string
  retry_count?: number
  last_attempt_at?: string | null
  last_error?: string | null
}

function sha256Lower(input?: string) {
  if (!input) return undefined
  try {
    // Lazy import crypto only when needed
    const { createHash } = require('crypto') as typeof import('crypto')
    return createHash('sha256').update(String(input).trim().toLowerCase()).digest('hex')
  } catch {
    return undefined
  }
}

// Ensure optional retry columns exist; ignore errors if already present
function ensureRetryColumns() {
  const db = getDatabase()
  try { db.prepare(`ALTER TABLE sales_events ADD COLUMN retry_count INTEGER DEFAULT 0`).run() } catch {}
  try { db.prepare(`ALTER TABLE sales_events ADD COLUMN last_attempt_at DATETIME`).run() } catch {}
  try { db.prepare(`ALTER TABLE sales_events ADD COLUMN last_error TEXT`).run() } catch {}
}

function isDue(row: SalesEventRow, now = Date.now()) {
  const retry = Math.max(0, row.retry_count || 0)
  const baseDelayMs = 60_000 // 1 minute
  const delay = Math.min(60 * 60 * 1000, baseDelayMs * Math.pow(2, Math.min(retry, 6))) // cap at 1h
  const last = row.last_attempt_at ? new Date(row.last_attempt_at).getTime() : 0
  return last === 0 || now - last >= delay
}

function extractFromPayload(payload: any) {
  // Try to infer event_id
  let eventId: string | undefined = payload.event_id || payload.id || payload.order_id || payload.transaction_id || undefined
  if (!eventId) {
    try {
      for (const key of Object.keys(payload)) {
        const v = (payload as any)[key]
        if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) {
          try {
            const u = new URL(v)
            const evt = u.searchParams.get('event_id') || u.searchParams.get('utm_content')
            if (evt) { eventId = evt; break }
          } catch {}
        }
      }
    } catch {}
  }

  // fbp/fbc from payload or any URL fields
  let fbp = payload.fbp
  let fbc = payload.fbc
  if (!fbp || !fbc) {
    try {
      for (const key of Object.keys(payload)) {
        const v = (payload as any)[key]
        if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) {
          try {
            const u = new URL(v)
            fbp = fbp || u.searchParams.get('fbp') || undefined
            fbc = fbc || u.searchParams.get('fbc') || undefined
          } catch {}
        }
      }
    } catch {}
  }

  const email = payload.email || payload.buyer_email || payload.buyer?.email || payload.customer?.email
  const phone = payload.phone || payload.buyer_phone || payload.buyer?.phone || payload.customer?.phone
  const valueNum = payload.value || payload.amount || payload.total || payload.total_value || payload.price
  const value = typeof valueNum === 'number' ? valueNum : parseFloat(valueNum)
  const currency = payload.currency || 'BRL'
  const eventName = payload.event_name || payload.type || 'Purchase'

  return { eventId, fbp, fbc, email, phone, value, currency, eventName }
}

export async function processPendingSalesEvents(limit = 50) {
  const db = getDatabase()
  ensureRetryColumns()

  // Fetch recent candidates to evaluate due/backoff in JS
  const rows = db.prepare(
    `SELECT id, event_id, source, payload, status, created_at, updated_at,
            retry_count, last_attempt_at, last_error
     FROM sales_events
     WHERE status IN ('received', 'capi_failed')
     ORDER BY COALESCE(updated_at, created_at) ASC
     LIMIT ?`
  ).all(limit) as SalesEventRow[]

  let attempted = 0
  let forwarded = 0
  for (const row of rows) {
    if (!isDue(row)) continue
    attempted++
    let payload: any
    try { payload = JSON.parse(row.payload) } catch { payload = {} }

    const { eventId, fbp, fbc, email, phone, value, currency, eventName } = extractFromPayload(payload)

    const pixelId = payload.pixel_id || process.env.FB_PIXEL_ID
    const fbAccessToken = payload.access_token || process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN

    if (!pixelId || !fbAccessToken || isNaN(value as any)) {
      // Skip but record attempt so backoff increases
      try {
        db.prepare(`UPDATE sales_events SET last_attempt_at = CURRENT_TIMESTAMP, retry_count = COALESCE(retry_count,0) + 1, last_error = ? WHERE id = ?`)
          .run('missing pixel/token/value', row.id)
      } catch {}
      continue
    }

    try {
      const capiPayload = {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId || row.event_id || undefined,
            action_source: 'website',
            user_data: {
              em: email ? [sha256Lower(email)] : undefined,
              ph: phone ? [sha256Lower(phone)] : undefined,
              fbp: fbp,
              fbc: fbc
            },
            custom_data: { currency, value }
          }
        ]
      }
      await axios.post(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${fbAccessToken}`,
        capiPayload,
        { timeout: 15_000 }
      )
      forwarded++
      try {
        db.prepare(`UPDATE sales_events SET status = 'forwarded', updated_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = ?`).run(row.id)
      } catch {}
    } catch (e: any) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'unknown error')
      logger.error('CAPI retry failed:', msg)
      try {
        db.prepare(`UPDATE sales_events SET status = 'capi_failed', last_attempt_at = CURRENT_TIMESTAMP, retry_count = COALESCE(retry_count,0) + 1, last_error = ? WHERE id = ?`).run(msg, row.id)
      } catch {}
    }
  }

  if (attempted > 0) {
    logger.info(`Attribution forwarder: attempted=${attempted} forwarded=${forwarded}`)
  }

  return { attempted, forwarded }
}

export function scheduleAttributionForwarder() {
  // Simple timer every minute; node-cron is already used elsewhere, but avoid extra dep coupling here
  const interval = setInterval(() => {
    processPendingSalesEvents().catch((e) => logger.warn('Attribution forwarder tick error:', e?.message))
  }, 60_000)
  // Expose a simple stopper if needed in future
  return () => clearInterval(interval)
}

// Process a single event by event_id immediately (ignores backoff schedule)
export async function processSingleSalesEvent(eventId: string) {
  const db = getDatabase()
  // Ensure columns exist
  try { db.prepare(`ALTER TABLE sales_events ADD COLUMN retry_count INTEGER DEFAULT 0`).run() } catch {}
  try { db.prepare(`ALTER TABLE sales_events ADD COLUMN last_attempt_at DATETIME`).run() } catch {}
  try { db.prepare(`ALTER TABLE sales_events ADD COLUMN last_error TEXT`).run() } catch {}

  const row = db.prepare(
    `SELECT id, event_id, payload FROM sales_events WHERE event_id = ? ORDER BY updated_at DESC LIMIT 1`
  ).get(eventId) as any
  if (!row) return { ok: false, reason: 'not_found' }

  try {
    const payload = JSON.parse(row.payload || '{}')
    const { eventId: ev, fbp, fbc, email, phone, value, currency, eventName } = extractFromPayload(payload)
    const pixelId = payload.pixel_id || process.env.FB_PIXEL_ID
    const fbAccessToken = payload.access_token || process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN
    if (!pixelId || !fbAccessToken || isNaN(value as any)) {
      db.prepare(`UPDATE sales_events SET last_attempt_at = CURRENT_TIMESTAMP, retry_count = COALESCE(retry_count,0) + 1, last_error = ? WHERE id = ?`).run('missing pixel/token/value', row.id)
      return { ok: false, reason: 'invalid_config' }
    }
    const capiPayload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: ev,
          action_source: 'website',
          user_data: {
            em: email ? [
              // hash lower-case email
              ((): string | undefined => { try { const { createHash } = require('crypto'); return createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex') } catch { return undefined } })()
            ] : undefined,
            ph: phone ? [
              ((): string | undefined => { try { const { createHash } = require('crypto'); return createHash('sha256').update(String(phone).trim().toLowerCase()).digest('hex') } catch { return undefined } })()
            ] : undefined,
            fbp,
            fbc
          },
          custom_data: { currency, value }
        }
      ]
    }
    await axios.post(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${fbAccessToken}`, capiPayload, { timeout: 15_000 })
    db.prepare(`UPDATE sales_events SET status = 'forwarded', last_attempt_at = CURRENT_TIMESTAMP, retry_count = COALESCE(retry_count,0) + 1, last_error = NULL WHERE id = ?`).run(row.id)
    return { ok: true }
  } catch (e: any) {
    const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'unknown error')
    logger.error('CAPI single retry failed:', msg)
    db.prepare(`UPDATE sales_events SET status = 'capi_failed', last_attempt_at = CURRENT_TIMESTAMP, retry_count = COALESCE(retry_count,0) + 1, last_error = ? WHERE id = ?`).run(msg, row.id)
    return { ok: false, reason: 'capi_failed', error: msg }
  }
}
