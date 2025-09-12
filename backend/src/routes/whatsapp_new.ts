import { Router } from 'express'
import { getDatabase } from '../config/database.js'
import {
  isWhatsAppReady,
  sendWhatsAppMessage,
  getLatestQr,
  getWhatsAppState,
  getWhatsAppRuntimeStatus,
  restartWhatsApp,
  forceLogout,
  initWhatsApp,
  isWhatsAppNumberRegistered,
  getRecentChats,
  sendWhatsAppMedia
} from '../services/bot/whatsappClient.fixed'
import { sseHandler, broadcast } from '../services/bot/sse.js'
import { logger } from '../utils/logger.js'

const router = Router()

// ---------------------------
// STATUS
// ---------------------------
router.get('/whatsapp/status', async (_req, res) => {
  try {
    const info = getWhatsAppState()
    const runtime = getWhatsAppRuntimeStatus()
    const whatsapp = runtime?.ready ?? info.ready
    const status = whatsapp ? 'active' : 'initializing'
    const self = getWhatsAppState?.() || null
    return res.json({
      ok: true,
      whatsapp,
      status,
      hasQr: !!info.qr,
      mode: runtime?.usingStack || 'default',
      state: runtime?.stale ? 'stale' : 'active',
      self,
      runtime: {
        ready: runtime?.ready,
        hasClient: runtime?.hasClient,
        usingStack: runtime?.usingStack,
        stale: runtime?.stale,
        reinitInFlight: runtime?.reinitInFlight,
        lastReadyAt: runtime?.lastReadyAt,
        lastState: (runtime as any)?.lastState,
        bindings: (runtime as any)?.bindings
      },
      timestamp: new Date().toISOString()
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// CARREGAR MENSAGENS CORRETAMENTE (store.loadMessages)
// ---------------------------
router.get('/whatsapp/load-messages/:phone', async (req, res) => {
  try {
    const phone = req.params.phone
    const { loadMessagesCorrectly } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await loadMessagesCorrectly(phone)
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// FORÇAR SINCRONIZAÇÃO COMPLETA DO WHATSAPP
// ---------------------------
router.post('/whatsapp/force-sync', async (_req, res) => {
  try {
    const { forceFullSync } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await forceFullSync()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// DEBUG: CHATS ATIVOS COM MENSAGENS REAIS
// ---------------------------
router.get('/whatsapp/active-chats', async (_req, res) => {
  try {
    const { getActiveChats } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await getActiveChats()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// TESTE DE MENSAGENS PARA UM NÚMERO ESPECÍFICO
// ---------------------------
router.get('/whatsapp/test-messages/:phone', async (req, res) => {
  try {
    const phone = req.params.phone
    const { testMessageFetch } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await testMessageFetch(phone)
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// DEBUG: MÉTODOS DISPONÍVEIS DO BAILEYS
// ---------------------------
router.get('/whatsapp/debug-methods', async (_req, res) => {
  try {
    const { debugWhatsAppMethods } = await import('../services/bot/whatsappClient_baileys.js')
    const debug = await debugWhatsAppMethods()
    return res.json({ ok: true, debug, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// SSE events stream
// ---------------------------
router.get('/events', (req, res) => sseHandler(req, res))
router.get('/conversations/events', (req, res) => sseHandler(req as any, res as any))

// ---------------------------
// QR CODE
// ---------------------------
router.get('/whatsapp/qr', (_req, res) => {
  try {
    const qr = getLatestQr()
    if (!qr) return res.status(404).json({ ok: false, error: 'no_qr' })
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.send(JSON.stringify({ ok: true, dataUrl: qr.pngDataUrl, qr }))
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// CONEXÃO/DESCONEXÃO
// ---------------------------
router.post('/whatsapp/connect', async (_req, res) => {
  try {
    const { initWhatsApp } = await import('../services/bot/whatsappClient_baileys.js')
    await initWhatsApp()
    return res.json({ ok: true, mode: 'baileys', connected: true })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/disconnect', async (_req, res) => {
  try {
    await forceLogout()
    return res.json({ ok: true, disconnected: true })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// ENVIO DE MENSAGENS
// ---------------------------
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { to, message, media } = req.body
    
    if (!to || !message) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: to, message' 
      })
    }

    let result
    if (media) {
      result = await sendWhatsAppMedia(to, message, media)
    } else {
      result = await sendWhatsAppMessage(to, message)
    }

    return res.json({ ok: true, result })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// VERIFICAR NÚMERO REGISTRADO
// ---------------------------
router.get('/whatsapp/check/:number', async (req, res) => {
  try {
    const number = req.params.number
    const isRegistered = await isWhatsAppNumberRegistered(number)
    return res.json({ ok: true, number, isRegistered })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// OBTER CHATS RECENTES
// ---------------------------
router.get('/whatsapp/chats', async (_req, res) => {
  try {
    const chats = await getRecentChats()
    return res.json({ ok: true, chats })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// RESTART WHATSAPP
// ---------------------------
router.post('/whatsapp/restart', async (_req, res) => {
  try {
    await restartWhatsApp()
    return res.json({ ok: true, restarted: true })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

export default router
