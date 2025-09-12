import { Router } from 'express'
import { processInbound as processInboundBasic } from '../services/bot/inboundProcessor.js'
import { processInbound as processInboundGPT } from '../services/bot/inboundProcessorGPT.js'

const router = Router()

// POST /bot/webhook - Webhook para receber mensagens
router.post('/webhook', async (req, res) => {
  try {
    const { phone, text, mediaUrl, mediaType } = req.body
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' })
    }
    
  // Prefer ConversationGPT pipeline; fallback to basic
  let result: any
  try { result = await processInboundGPT(phone, text, mediaUrl) } 
  catch { result = await processInboundBasic(phone, text, mediaUrl, mediaType) }
    res.json({ success: true, result })
    
  } catch (error: any) {
    console.error('Bot webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /bot/status - Status do bot
import { isWhatsAppReady } from '../services/bot/whatsappClient.fixed'
import { getQueueStats, getScheduled } from '../services/bot/messageQueue.js'
import { collectSystemMetrics } from '../services/metrics/metricsCollector.js'
router.get('/status', (_req, res) => {
  res.json({ 
    status: isWhatsAppReady()? 'active':'initializing',
    whatsapp: isWhatsAppReady(),
    timestamp: new Date().toISOString()
  })
})

// Queue stats (read-only, no auth since only counters; restrict in production via proxy if needed)
router.get('/queue/stats', (_req,res)=>{
  try { res.json({ ok:true, ...getQueueStats(), sample: getScheduled(5) }) } catch (e:any){ res.status(500).json({ ok:false, error:e?.message }) }
})

// ADMIN: Limpar fila de mensagens pendentes (emergência)
router.post('/queue/clear', (req, res) => {
  try {
    const { getDatabase } = require('../../config/database.js')
    const db = getDatabase()
    const result = db.prepare('DELETE FROM outbound_messages WHERE sent = 0').run()
    res.json({ ok: true, cleared: result.changes, message: 'Fila de mensagens pendentes limpa com sucesso' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message })
  }
})

// ADMIN: Controle manual do dispatcher
router.post('/queue/start-dispatcher', (req, res) => {
  try {
    const { startOutboundDispatcher } = require('../bot/messageQueue.js')
    startOutboundDispatcher()
    res.json({ ok: true, message: 'Outbound dispatcher iniciado manualmente' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message })
  }
})

// Aggregated system metrics (non-sensitive). In production protect or aggregate further.
router.get('/metrics', async (req,res)=>{
  try {
    const flag = process.env.BOT_METRICS_PUBLIC
    const isPublic = typeof flag === 'string' && flag.toLowerCase() === 'true'
    if (process.env.NODE_ENV === 'test') {
      console.log('[METRICS_ROUTE_DEBUG]', { flag, isPublic, haveKey: Boolean(process.env.BOT_METRICS_KEY) })
    }
    if (!isPublic) {
      const token = req.header('x-bot-metrics-key') || ''
      const expected = process.env.BOT_METRICS_KEY || ''
      if (process.env.NODE_ENV === 'test') {
        console.log('[METRICS_AUTH_DEBUG]', { tokenProvided: Boolean(token), expectedLen: expected.length, match: token === expected })
  console.log('[METRICS_AUTH_DEBUG_HEADERS]', req.headers)
      }
      if (!expected || token !== expected) {
        return res.status(403).json({ ok:false, error:'forbidden' })
      }
    }
    const data = await collectSystemMetrics()
    return res.json({ ok:true, ...data })
  } catch(e:any){
    return res.status(500).json({ ok:false, error:e?.message })
  }
})

// POST /bot/test-message - Endpoint de teste sem autenticação
router.post('/test-message', async (req, res) => {
  try {
    const { phone, text, campaignId, productId } = req.body
    
    if (!phone || !text) {
      return res.status(400).json({ error: 'Phone and text required' })
    }
    
    console.log('🧪 TEST MESSAGE REQUEST:', { phone, text, campaignId, productId })
    
    // Usar processamento completo com envio de mídia
  let result: any
  try { result = await processInboundGPT(phone, text) } 
  catch { result = await processInboundBasic(phone, text) }
    
    console.log('✅ TEST MESSAGE RESULT:', result)
    
    // Build a friendly output without assuming specific union fields
    const display = (typeof (result as any)?.response === 'string')
      ? (result as any).response
      : (typeof (result as any)?.status === 'string')
        ? (result as any).status
        : result
    res.json({ 
      success: true, 
      test: true,
      phone,
      text,
      result: display,
      fullResult: result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ Test message error:', error)
    res.status(500).json({ error: error.message, stack: error.stack })
  }
})

export default router
