import { Router } from 'express'
import axios from 'axios'
import { getDatabase } from '../config/database.js'
import logger from '../config/logger.js'
import { createHash, createHmac } from 'crypto'
import { processSingleSalesEvent } from '../services/attributionForwarder.js'
import { enqueueSalesEventRetry, isQueueEnabled, getFailedJobs, retryFailedJob, retryAllFailedJobs, getQueueCounts, removeJob, findEventInQueue } from '../services/capiQueue.js'

const router = Router()

// Save scraping results (no auth; uses provided payload)
router.post('/scraping/save-results', async (req: any, res) => {
  try {
    const { nicho, keywords, results, userId } = req.body || {}
    if (!nicho || !results) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes' })
    }
    const db = getDatabase()
    const info = db.prepare(`
      INSERT INTO scraping_results (user_id, nicho, keywords, results)
      VALUES (?, ?, ?, ?)
    `).run(userId || null, nicho, JSON.stringify(keywords || [nicho]), JSON.stringify(results))
    return res.json({ status: 'success', id: info.lastInsertRowid })
  } catch (error: any) {
    logger.error('public.scraping.save-results failed:', error)
    return res.status(500).json({ error: 'Erro ao salvar resultados', details: error.message })
  }
})

// Store chosen offer for reproducible history
router.post('/automation/choose-offer', async (req: any, res) => {
  try {
    const { oferta, investimento, nicho, tipoNicho, userId } = req.body || {}
    if (!oferta || !nicho) {
      return res.status(400).json({ error: 'Oferta e nicho são obrigatórios' })
    }
    const db = getDatabase()
    // Log removido - tabela automation_logs não existe mais
    // const info = db.prepare(`
    //   INSERT INTO automation_logs (user_id, action, status, data)
    //   VALUES (?, ?, ?, ?)
    // `).run(userId || null, 'choose_offer', 'completed', JSON.stringify({ oferta, investimento, nicho, tipoNicho }))
    return res.json({ status: 'success', message: 'Oferta escolhida salva' })
  } catch (error: any) {
    logger.error('public.automation.choose-offer failed:', error)
    return res.status(500).json({ error: 'Erro ao salvar oferta escolhida', details: error.message })
  }
})

// Create Facebook Campaign using provided token and ad account id
router.post('/facebook/create-campaign', async (req: any, res) => {
  try {
    const { facebook_token, ad_account_id, name, objective = 'CONVERSIONS', status = 'PAUSED' } = req.body || {}
    if (!facebook_token || !ad_account_id || !name) {
      return res.status(400).json({ error: 'Token, ad_account_id e name são obrigatórios' })
    }
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${ad_account_id}/campaigns`,
      { name, objective, status, access_token: facebook_token }
    )
    return res.json({ status: 'success', id: response.data.id, name })
  } catch (error: any) {
    const details = error.response?.data || error.message
    logger.error('public.facebook.create-campaign failed:', details)
    return res.status(400).json({ error: 'Erro ao criar campanha', details })
  }
})

// --- Extra integrations ---
// Kiwify: create product via configurable API base
router.post('/kiwify/create-product', async (req: any, res) => {
  try {
    const { kiwify_token, client_id, client_secret, name, price, description } = req.body || {}
    if ((!kiwify_token && !(client_id && client_secret)) || !name || !price) {
      return res.status(400).json({ error: 'Forneça kiwify_token OU client_id/client_secret, além de name e price' })
    }
    const base = process.env.KIWIFY_API_BASE || 'https://api.kiwify.com.br'

    // Obtain access token if only client credentials provided
    let accessToken = kiwify_token
    if (!accessToken && client_id && client_secret) {
      try {
        const oauthResp = await axios.post(`${base}/oauth/token`, {
          client_id,
          client_secret,
          grant_type: 'client_credentials'
        })
        accessToken = oauthResp.data?.access_token
      } catch (e: any) {
        const details = e.response?.data || e.message
        return res.status(400).json({ error: 'Falha ao obter token do Kiwify', details })
      }
    }

    const response = await axios.post(`${base}/products`, {
      name,
      price,
      description: description || ''
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    return res.json({ status: 'success', product: response.data })
  } catch (error: any) {
    const details = error.response?.data || error.message
    return res.status(400).json({ error: 'Erro ao criar produto no Kiwify', details })
  }
})

// Facebook: create adset (basic)
router.post('/facebook/create-adset', async (req: any, res) => {
  try {
    const { facebook_token, ad_account_id, campaign_id, name, daily_budget = 1000, targeting } = req.body || {}
    if (!facebook_token || !ad_account_id || !campaign_id || !name) {
      return res.status(400).json({ error: 'Token, ad_account_id, campaign_id e name são obrigatórios' })
    }
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${ad_account_id}/adsets`,
      {
        name,
        campaign_id,
        daily_budget, // in minor units (cents)
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        status: 'PAUSED',
        targeting: targeting || { geo_locations: { countries: ['BR'] } },
        access_token: facebook_token
      }
    )
    return res.json({ status: 'success', id: response.data.id })
  } catch (error: any) {
    const details = error.response?.data || error.message
    return res.status(400).json({ error: 'Erro ao criar conjunto de anúncios', details })
  }
})

// Facebook: create ad creative (link ad, minimal)
router.post('/facebook/create-creative', async (req: any, res) => {
  try {
  const { facebook_token, ad_account_id, name, title, body, link_url, image_url, image_hash, page_id } = req.body || {}
    if (!facebook_token || !ad_account_id || !name || !link_url) {
      return res.status(400).json({ error: 'Token, ad_account_id, name e link_url são obrigatórios' })
    }
    const payload: any = {
      name,
      access_token: facebook_token
    }
    // object_story_spec usually requires page_id; include if provided
    if (page_id) {
      payload.object_story_spec = {
        page_id,
        link_data: {
          name: title || name,
          message: body || '',
      link: link_url,
      // Prefer image_hash when available for better compliance/delivery
      image_hash: image_hash || undefined,
      picture: image_hash ? undefined : (image_url || undefined)
        }
      }
    }
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${ad_account_id}/adcreatives`,
      payload
    )
    return res.json({ status: 'success', id: response.data.id })
  } catch (error: any) {
    const details = error.response?.data || error.message
    return res.status(400).json({ error: 'Erro ao criar creative', details })
  }
})

// Facebook: create ad using creative
router.post('/facebook/create-ad', async (req: any, res) => {
  try {
    const { facebook_token, ad_account_id, adset_id, name, creative_id } = req.body || {}
    if (!facebook_token || !ad_account_id || !adset_id || !creative_id || !name) {
      return res.status(400).json({ error: 'Token, ad_account_id, adset_id, creative_id e name são obrigatórios' })
    }
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${ad_account_id}/ads`,
      {
        name,
        adset_id,
        creative: { creative_id },
        status: 'PAUSED',
        access_token: facebook_token
      }
    )
    return res.json({ status: 'success', id: response.data.id })
  } catch (error: any) {
    const details = error.response?.data || error.message
    return res.status(400).json({ error: 'Erro ao criar anúncio', details })
  }
})

// Ideogram proxy (optional): pass-through if IDEOGRAM_API_BASE configured
router.post('/ideogram/generate', async (req: any, res) => {
  try {
    let { api_key, prompt, ratio = '1:1', quality = 'STANDARD' } = req.body || {}
    const base = process.env.IDEOGRAM_API_BASE || 'https://api.ideogram.ai'
    api_key = api_key || process.env.IDEOGRAM_API_KEY
    if (!api_key || !prompt) {
      return res.status(400).json({ error: 'api_key e prompt são obrigatórios' })
    }
    const response = await axios.post(`${base}/generate`, { prompt, ratio, quality }, {
      headers: { Authorization: `Bearer ${api_key}` }
    })
    return res.json({ status: 'success', data: response.data })
  } catch (error: any) {
    const details = error.response?.data || error.message
    return res.status(400).json({ error: 'Erro ao gerar imagem no Ideogram', details })
  }
})

router.get('/ideogram/status', async (_req, res) => {
  const configured = !!process.env.IDEOGRAM_API_KEY
  return res.json({ configured })
})

// OpenAI Chat proxy (for spark.llm)
router.post('/openai/chat', async (req: any, res) => {
  try {
    const { prompt, model = 'gpt-4o-mini', json = false } = req.body || {}
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return res.status(501).json({ error: 'OPENAI_API_KEY não configurada no backend' })
    if (!prompt) return res.status(400).json({ error: 'prompt é obrigatório' })

    const payload: any = {
      model,
      messages: [
        json ? { role: 'system', content: 'Responda em JSON válido apenas, sem texto extra.' } : null,
        { role: 'user', content: prompt }
      ].filter(Boolean)
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    const text = response.data?.choices?.[0]?.message?.content || ''
    return res.json({ status: 'success', content: text })
  } catch (error: any) {
    const details = error.response?.data || error.message
    return res.status(400).json({ error: 'Erro ao chamar OpenAI', details })
  }
})

// --- Webhooks & Attribution ---
// Helper: sha256 lowercase per Meta CAPI requirements
function sha256Lower(input?: string) {
  if (!input) return undefined
  try {
    return createHash('sha256').update(String(input).trim().toLowerCase()).digest('hex')
  } catch {
    return undefined
  }
}

// Kiwify webhook receiver with optional Meta CAPI forwarding
router.post('/webhooks/kiwify', async (req: any, res) => {
  const db = getDatabase()
  // Ensure tables exist (idempotent)
  try {
    db.prepare(`CREATE TABLE IF NOT EXISTS sales_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE,
      source TEXT,
      payload TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run()
  } catch {}
  const payload = req.body || {}
  // Try to infer event_id from common fields or embedded URLs (utm_content or event_id params)
  let eventId: string | undefined = payload.event_id || payload.id || payload.order_id || payload.transaction_id || undefined
  if (!eventId) {
    try {
      const urlFields = ['url', 'checkout_url', 'source_url', 'payment_url', 'product_url', 'landing_url']
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
      if (!eventId) {
        for (const f of urlFields) {
          const v = (payload as any)[f]
          if (typeof v === 'string') {
            try {
              const u = new URL(v)
              const evt = u.searchParams.get('event_id') || u.searchParams.get('utm_content')
              if (evt) { eventId = evt; break }
            } catch {}
          }
        }
      }
    } catch {}
  }
  const source = 'kiwify'

  try {
    // Optional: signature verification
    try {
      const secret = process.env.KIWIFY_WEBHOOK_SECRET
      const headerSig = req.headers['x-kiwify-signature'] as string | undefined
      if (secret && headerSig && req.rawBody) {
        const computed = createHmac('sha256', secret).update(req.rawBody).digest('hex')
        if (computed !== headerSig) {
          logger.warn('Kiwify webhook signature mismatch')
          return res.status(401).json({ error: 'Assinatura inválida' })
        }
      }
    } catch (e) {
      logger.warn('Kiwify webhook signature check error (continuing without blocking):', (e as any)?.message)
    }

    // Persist raw payload for auditing/deduplication
    try {
      db.prepare(`
        INSERT OR IGNORE INTO sales_events (event_id, source, payload, status)
        VALUES (?, ?, ?, ?)
      `).run(eventId || null, source, JSON.stringify(payload), 'received')
    } catch (e) {
      logger.warn('Failed to persist sales_events record (continuing):', e)
    }

    // Resolve Pixel and token
    const pixelId = (req.query.pixel_id as string) || payload.pixel_id || process.env.FB_PIXEL_ID
    const fbAccessToken = (req.query.access_token as string) || payload.access_token || process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN

    // Extract purchase info from flexible payload shapes
    const email = payload.email || payload.buyer_email || payload.buyer?.email || payload.customer?.email
    const phone = payload.phone || payload.buyer_phone || payload.buyer?.phone || payload.customer?.phone
    const valueNum = payload.value || payload.amount || payload.total || payload.total_value || payload.price
    const value = typeof valueNum === 'number' ? valueNum : parseFloat(valueNum)
    const currency = payload.currency || 'BRL'
    // Try to capture fbp/fbc from payload; fallback: parse from any URL query string
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
    const eventName = payload.event_name || payload.type || 'Purchase'
    const eventTime = Math.floor(Date.now() / 1000)

  let capiResult: any = null
    if (pixelId && fbAccessToken && !isNaN(value)) {
      try {
        const capiPayload = {
          data: [
            {
              event_name: eventName,
              event_time: eventTime,
              event_id: eventId,
              action_source: 'website',
              user_data: {
                em: email ? [sha256Lower(email)] : undefined,
                ph: phone ? [sha256Lower(phone)] : undefined,
                fbp: fbp,
                fbc: fbc,
                client_ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
                client_user_agent: req.headers['user-agent']
              },
              custom_data: {
                currency,
                value
              }
            }
          ],
          test_event_code: req.query.test_event_code || payload.test_event_code || undefined
        }
        const capiResp = await axios.post(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${fbAccessToken}`, capiPayload)
        capiResult = capiResp.data
        try {
          db.prepare(`UPDATE sales_events SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE event_id = ?`).run('forwarded', eventId || null)
        } catch {}
      } catch (err: any) {
        logger.error('Meta CAPI forward failed:', err.response?.data || err.message)
        try {
          db.prepare(`UPDATE sales_events SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE event_id = ?`).run('capi_failed', eventId || null)
        } catch {}
      }
    } else {
      logger.warn('Skipping Meta CAPI forward (missing pixel/token or invalid value).')
    }

    return res.json({ ok: true, stored: true, capi: capiResult, pixelConfigured: !!pixelId })
  } catch (error: any) {
    logger.error('public.webhooks.kiwify failed:', error)
    return res.status(500).json({ error: 'Erro ao processar webhook do Kiwify', details: error.message })
  }
})

// Attribution: list recent events for diagnostics
router.get('/attribution/events', async (req: any, res) => {
  try {
    const db = getDatabase()
    // Best-effort indexes (idempotent)
    try {
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_sales_events_created_at ON sales_events(created_at)`).run()
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_sales_events_event_id ON sales_events(event_id)`).run()
    } catch {}
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200)
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0)
    const status = String(req.query.status || '').trim()
    const q = String(req.query.q || '').trim()
    const where: string[] = []
    const params: any[] = []
    if (status && ['received','forwarded','capi_failed'].includes(status)) {
      where.push('status = ?')
      params.push(status)
    }
    if (q) {
      where.push('(event_id LIKE ? OR payload LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const rows = db.prepare(`
      SELECT event_id, source, status, created_at, updated_at, retry_count, last_error
      FROM sales_events
      ${whereSql}
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset)
    const totalRow = db.prepare(`SELECT COUNT(1) as c FROM sales_events ${whereSql}`).get(...params) as { c?: number }
    const total = totalRow?.c || 0
    return res.json({ events: rows, total, limit, offset })
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao listar eventos', details: e.message })
  }
})

// Attribution: get event details by event_id
router.get('/attribution/events/:eventId', async (req: any, res) => {
  try {
    const { eventId } = req.params
    if (!eventId) return res.status(400).json({ error: 'eventId é obrigatório' })
    const db = getDatabase()
    const row = db.prepare(`
      SELECT event_id, source, status, created_at, updated_at, retry_count, last_error, payload
      FROM sales_events
      WHERE event_id = ?
      LIMIT 1
    `).get(eventId)
    if (!row) return res.status(404).json({ error: 'Evento não encontrado' })
    return res.json({ event: row })
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao obter evento', details: e.message })
  }
})

// Retry a specific event by event_id (admin/diagnostics)
router.post('/attribution/retry/:eventId', async (req: any, res) => {
  try {
    const { eventId } = req.params
    if (!eventId) return res.status(400).json({ error: 'eventId é obrigatório' })
    if (isQueueEnabled()) {
      const r = await enqueueSalesEventRetry(eventId)
      return res.json({ ok: true, queued: r.enqueued })
    } else {
      const result = await processSingleSalesEvent(eventId)
      return res.json(result)
    }
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao reprocessar evento', details: e.message })
  }
})

// Attribution: simple KPIs from sales_events (counts per status)
router.get('/attribution/kpis', async (_req, res) => {
  try {
    const db = getDatabase()
  const rowTotal = db.prepare(`SELECT COUNT(1) as c FROM sales_events`).get() as { c?: number }
  const rowFwd = db.prepare(`SELECT COUNT(1) as c FROM sales_events WHERE status = 'forwarded'`).get() as { c?: number }
  const rowFail = db.prepare(`SELECT COUNT(1) as c FROM sales_events WHERE status = 'capi_failed'`).get() as { c?: number }
  const total = rowTotal?.c || 0
  const forwarded = rowFwd?.c || 0
  const failed = rowFail?.c || 0
    return res.json({ total, forwarded, failed })
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao obter KPIs', details: e.message })
  }
})

// Queue: status
router.get('/attribution/queue/status', async (_req: any, res) => {
  try {
    return res.json({ enabled: isQueueEnabled() })
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao obter status da fila', details: e.message })
  }
})

// Queue: counts
router.get('/attribution/queue/counts', async (_req: any, res) => {
  try {
    const r = await getQueueCounts()
    return res.json(r)
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao obter métricas da fila', details: e.message })
  }
})

// Queue: list failed jobs (DLQ)
router.get('/attribution/queue/failed', async (req: any, res) => {
  try {
  const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200)
  const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0)
  const r = await getFailedJobs(limit, offset)
    return res.json(r)
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao listar DLQ', details: e.message })
  }
})

// Queue: lookup by eventId across states (waiting/active/delayed/failed)
router.get('/attribution/queue/lookup', async (req: any, res) => {
  try {
    const eventId = String(req.query.eventId || '').trim()
    if (!eventId) return res.status(400).json({ error: 'eventId é obrigatório' })
    const r = await findEventInQueue(eventId)
    return res.json(r)
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao consultar fila', details: e.message })
  }
})

// Queue: retry a failed job by id
router.post('/attribution/queue/retry-job/:jobId', async (req: any, res) => {
  try {
    const { jobId } = req.params
    if (!jobId) return res.status(400).json({ error: 'jobId é obrigatório' })
    const r = await retryFailedJob(jobId)
    return res.json(r)
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao reprocessar job', details: e.message })
  }
})

// Queue: retry all failed jobs (DLQ)
router.post('/attribution/queue/retry-all', async (_req: any, res) => {
  try {
    if (!isQueueEnabled()) return res.status(400).json({ error: 'Fila indisponível' })
    const r = await retryAllFailedJobs(200)
    return res.json(r)
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao reprocessar DLQ', details: e.message })
  }
})

// Queue: remove a failed job
router.delete('/attribution/queue/job/:jobId', async (req: any, res) => {
  try {
    const { jobId } = req.params
    if (!jobId) return res.status(400).json({ error: 'jobId é obrigatório' })
    const r = await removeJob(jobId)
    return res.json(r)
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao remover job', details: e.message })
  }
})

// Attribution: enqueue batch of failed/received events (when queue enabled)
router.post('/attribution/retry-batch', async (_req: any, res) => {
  try {
    const db = getDatabase()
    if (!isQueueEnabled()) {
      return res.status(400).json({ error: 'Fila indisponível' })
    }
    const rows = db.prepare(`
      SELECT event_id FROM sales_events
      WHERE status IN ('received','capi_failed')
      ORDER BY datetime(created_at) DESC
      LIMIT 200
    `).all() as Array<{ event_id: string | null }>
    let enq = 0
    for (const r of rows) {
      if (!r.event_id) continue
      await enqueueSalesEventRetry(r.event_id)
      enq++
    }
    return res.json({ ok: true, enqueued: enq })
  } catch (e: any) {
    return res.status(500).json({ error: 'Erro ao enfileirar lote', details: e.message })
  }
})

// Facebook: upload image by URL and return image hash for creatives
router.post('/facebook/upload-image', async (req: any, res) => {
  try {
    const { facebook_token, ad_account_id, url, name } = req.body || {}
    if (!facebook_token || !ad_account_id || !url) {
      return res.status(400).json({ error: 'facebook_token, ad_account_id e url são obrigatórios' })
    }
    const resp = await axios.post(`https://graph.facebook.com/v18.0/${ad_account_id}/adimages`, null, {
      params: { access_token: facebook_token, url, name }
    })
    // Response contains images map; pick first hash
    const images = resp.data?.images || resp.data
    const firstKey = images ? Object.keys(images)[0] : undefined
    const hash = firstKey ? images[firstKey]?.hash : undefined
    return res.json({ status: 'success', hash, raw: resp.data })
  } catch (e: any) {
    return res.status(400).json({ error: 'Upload de imagem falhou', details: e.response?.data || e.message })
  }
})

// Facebook: account ad limits/info
router.get('/facebook/ad-limits', async (req: any, res) => {
  try {
    const { facebook_token, ad_account_id } = req.query || {}
    if (!facebook_token || !ad_account_id) {
      return res.status(400).json({ error: 'facebook_token e ad_account_id são obrigatórios' })
    }
    const resp = await axios.get(`https://graph.facebook.com/v18.0/${ad_account_id}`, {
      params: { access_token: facebook_token, fields: 'id,account_status,adtrust_dsl,disable_reason' }
    })
    return res.json({ status: 'success', data: resp.data })
  } catch (e: any) {
    return res.status(400).json({ error: 'Falha ao obter limites da conta', details: e.response?.data || e.message })
  }
})

// Scheduler: optimize adset budgets using simple rules based on yesterday's performance
router.post('/scheduler/optimize-budgets', async (req: any, res) => {
  try {
    const {
      facebook_token,
      ad_account_id,
      min_spend = 1000, // R$10.00 in cents
      target_roas = 1.5,
      scale_up = 1.2,
      scale_down = 0.8,
      floor_budget = 500, // R$5.00
      cap_budget = 200000 // R$2000.00
    } = req.body || {}

    if (!facebook_token || !ad_account_id) {
      return res.status(400).json({ error: 'facebook_token e ad_account_id são obrigatórios' })
    }

    // List adsets
    const adsetsResp = await axios.get(
      `https://graph.facebook.com/v18.0/${ad_account_id}/adsets`,
      {
        params: {
          fields: 'id,name,status,daily_budget,campaign_id',
          limit: 200,
          access_token: facebook_token
        }
      }
    )
    const adsets = adsetsResp.data?.data || []
    const changes: any[] = []

    for (const adset of adsets) {
      const adsetId = adset.id
      let dailyBudget = parseInt(adset.daily_budget || '0', 10) || 0

      // Fetch insights for yesterday
      let spend = 0
      let purchaseValue = 0
      let purchases = 0
      try {
        const ins = await axios.get(`https://graph.facebook.com/v18.0/${adsetId}/insights`, {
          params: {
            date_preset: 'yesterday',
            level: 'adset',
            fields: 'spend,actions,action_values',
            access_token: facebook_token
          }
        })
        const row = ins.data?.data?.[0]
        if (row) {
          spend = parseFloat(row.spend || '0') || 0
          const actions: Array<{ action_type: string; value: string }> = row.actions || []
          const actionValues: Array<{ action_type: string; value: string }> = row.action_values || []
          const purchaseAction = actions.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.purchase')
          const purchaseValueAction = actionValues.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.purchase')
          purchases = purchaseAction ? parseInt(purchaseAction.value || '0', 10) || 0 : 0
          purchaseValue = purchaseValueAction ? parseFloat(purchaseValueAction.value || '0') || 0 : 0
        }
      } catch (e: any) {
        logger.warn('Insights fetch failed for adset ' + adsetId + ':', e.response?.data || e.message)
      }

      // Compute ROAS
      const roas = spend > 0 ? purchaseValue / spend : 0

      // Decide action
      let action: 'pause' | 'scale_up' | 'scale_down' | 'keep' = 'keep'
      let newBudget = dailyBudget
      if (spend * 100 >= min_spend && purchases === 0) {
        action = 'pause'
      } else if (spend * 100 >= min_spend && roas < target_roas * 0.6) {
        action = 'scale_down'
        newBudget = Math.max(floor_budget, Math.floor(dailyBudget * scale_down))
      } else if (roas >= target_roas && spend * 100 >= min_spend / 2) {
        action = 'scale_up'
        newBudget = Math.min(cap_budget, Math.floor(dailyBudget * scale_up))
      }

      // Apply change
      try {
        if (action === 'pause' && adset.status !== 'PAUSED') {
          await axios.post(`https://graph.facebook.com/v18.0/${adsetId}`, {
            status: 'PAUSED',
            access_token: facebook_token
          })
          changes.push({ adsetId, action, from: dailyBudget })
        } else if ((action === 'scale_up' || action === 'scale_down') && newBudget !== dailyBudget) {
          await axios.post(`https://graph.facebook.com/v18.0/${adsetId}`, {
            daily_budget: newBudget,
            access_token: facebook_token
          })
          changes.push({ adsetId, action, from: dailyBudget, to: newBudget })
          dailyBudget = newBudget
        }
      } catch (err: any) {
        logger.error('Failed to apply change for adset ' + adsetId + ':', err.response?.data || err.message)
      }

      // Log removido - tabela automation_logs não existe mais
      // try {
      //   const db = getDatabase()
      //   db.prepare(`INSERT INTO automation_logs (user_id, action, status, data) VALUES (?, ?, ?, ?)`)
      //     .run(null, 'optimize_adset', 'completed', JSON.stringify({ adsetId, spend, purchases, purchaseValue, roas, decision: action, dailyBudget }))
      // } catch {}
    }

    return res.json({ status: 'success', reviewed: adsets.length, changes })
  } catch (error: any) {
    const details = error.response?.data || error.message
    return res.status(500).json({ error: 'Erro no scheduler de orçamentos', details })
  }
})

export default router
