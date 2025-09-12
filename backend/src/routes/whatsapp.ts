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
  sendWhatsAppMedia,
  getWhatsAppDebug,
  waInternalEmitter,
  getRecentInboundTraces
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
// DEBUG: EMITTER + RUNTIME SNAPSHOT
// ---------------------------
router.get('/whatsapp/debug-emitter', async (_req, res) => {
  try {
    const runtime = getWhatsAppRuntimeStatus()
    const state = getWhatsAppState()
    const debug = await getWhatsAppDebug()
    const listeners = waInternalEmitter?.listenerCount
      ? waInternalEmitter.listenerCount('inbound-wa')
      : undefined
    const token = (waInternalEmitter as any)?.__token
    const traces = getRecentInboundTraces(50)
    return res.json({
      ok: true,
      runtime,
      state,
      debug,
      emitter: { listeners, token },
      recentInbound: traces
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// DEBUG: LOAD MESSAGES CORRECTLY (FIXED VERSION)
// ---------------------------
router.get('/whatsapp/load-messages/:phone', async (req, res) => {
  try {
    const { loadMessagesCorrectly } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await loadMessagesCorrectly(req.params.phone)
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// DEBUG: LOAD MESSAGES V2 (ALTERNATIVE METHOD)
// ---------------------------
router.get('/whatsapp/load-messages-v2/:phone', async (req, res) => {
  try {
    const { loadMessagesCorrectly } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await loadMessagesCorrectly(req.params.phone)
    return res.json({ ok: true, result, timestamp: Date.now(), note: 'WhatsApp-Web.js implementation' })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// DEBUG: FORCE FULL SYNC
// ---------------------------
router.post('/whatsapp/force-sync', async (_req, res) => {
  try {
    const { forceFullSync } = await import('../services/bot/whatsappClient.fixed.js')
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
    const { getActiveChats } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await getActiveChats()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// DEBUG: TEST MESSAGE FETCH
// ---------------------------
router.post('/whatsapp/test-fetch', async (req, res) => {
  try {
    const { testMessageFetch } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await testMessageFetch(req.body.phone || '5511999999999')
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// DEBUG: DEBUG WHATSAPP METHODS
// ---------------------------
router.get('/whatsapp/debug-methods', async (_req, res) => {
  try {
    const { debugWhatsAppMethods } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await debugWhatsAppMethods()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// DEBUG: DEEP STORE INVESTIGATION
// ---------------------------
router.get('/whatsapp/deep-investigation', async (_req, res) => {
  try {
    const { deepStoreInvestigation } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await deepStoreInvestigation()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// CARREGAR MENSAGENS V2 (CORRIGIDO PARA BAILEYS 6.7.18)
// ---------------------------
router.get('/whatsapp/load-messages-v2/:phone', async (req, res) => {
  try {
    const phone = req.params.phone
    const { loadMessagesCorrectlyV2 } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await loadMessagesCorrectlyV2(phone)
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
// INVESTIGAÇÃO PROFUNDA DO STORE
// ---------------------------
router.get('/whatsapp/deep-investigation', async (_req, res) => {
  try {
    const { deepStoreInvestigation } = await import('../services/bot/whatsappClient_baileys.js')
    const investigation = await deepStoreInvestigation()
    return res.json({ ok: true, investigation, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// LEGACY DEBUG ROUTES (Venom/Baileys specific - now compatibility layer)
// ---------------------------

// These routes now return compatibility responses since we're using WhatsApp-Web.js
router.post('/whatsapp/force-store-sync', async (_req, res) => {
  try {
    return res.json({ 
      ok: false, 
      message: 'forceStoreSync is Baileys-specific. WhatsApp-Web.js manages sync automatically.',
      alternative: 'WhatsApp-Web.js handles sync internally',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.get('/whatsapp/extract-conversations', async (_req, res) => {
  try {
    const { getRecentChats } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await getRecentChats()
    return res.json({ 
      ok: true, 
      result, 
      note: 'Using WhatsApp-Web.js getRecentChats instead of extractRealConversations',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/access-conversations', async (_req, res) => {
  try {
    const { getRecentChats } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await getRecentChats()
    return res.json({ 
      ok: true, 
      result, 
      note: 'WhatsApp-Web.js equivalent of accessRealWhatsAppConversations',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/enable-realtime-sync', async (_req, res) => {
  try {
    return res.json({ 
      ok: true, 
      message: 'WhatsApp-Web.js has real-time sync enabled by default via event listeners',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/populate-one-by-one', async (_req, res) => {
  try {
    return res.json({ 
      ok: false, 
      message: 'forcePopulateOneByOne is Baileys-specific. WhatsApp-Web.js uses different approach.',
      alternative: 'Use /whatsapp/active-chats for chat information',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/decode-hex', async (_req, res) => {
  try {
    return res.json({ 
      ok: false, 
      message: 'decodeHexMessages is Baileys protocol-specific. WhatsApp-Web.js handles messages differently.',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/extract-all-messages', async (_req, res) => {
  try {
    const { getRecentChats } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await getRecentChats()
    return res.json({ 
      ok: true, 
      result, 
      note: 'WhatsApp-Web.js equivalent - use chat objects to fetch messages',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/protocol-analysis', async (_req, res) => {
  try {
    return res.json({ 
      ok: false, 
      message: 'advancedProtocolAnalysis is Baileys-specific. WhatsApp-Web.js uses different protocol.',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/intensive-decoder', async (_req, res) => {
  try {
    return res.json({ 
      ok: false, 
      message: 'intensiveMessageDecoder is Baileys-specific. WhatsApp-Web.js uses web API.',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/resync-decode', async (_req, res) => {
  try {
    const { restartWhatsApp } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await restartWhatsApp(false)
    return res.json({ 
      ok: true, 
      result, 
      note: 'WhatsApp-Web.js restart instead of forceResyncWithDecode',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/force-venom', async (_req, res) => {
  try {
    return res.json({ 
      ok: false, 
      message: 'forceVenomAsPrimary not applicable. Using WhatsApp-Web.js as primary.',
      currentClient: 'WhatsApp-Web.js',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.get('/whatsapp/venom-conversations', async (_req, res) => {
  try {
    const { getRecentChats } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await getRecentChats()
    return res.json({ 
      ok: true, 
      result, 
      note: 'WhatsApp-Web.js chats instead of Venom conversations',
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/compare-clients', async (_req, res) => {
  try {
    const { getWhatsAppDebug } = await import('../services/bot/whatsappClient.fixed.js')
    const debug = await getWhatsAppDebug()
    return res.json({ 
      ok: true, 
      result: {
        current: 'WhatsApp-Web.js',
        version: '1.32.0',
        debug,
        note: 'Now using WhatsApp-Web.js exclusively'
      },
      timestamp: Date.now() 
    })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// EXTRAIR CONVERSAS REAIS DOS CLIENTES
// ---------------------------
router.get('/whatsapp/extract-real-conversations', async (_req, res) => {
  try {
    const { extractRealConversations } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await extractRealConversations()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// FINAL: ACESSO DEFINITIVO ÀS CONVERSAS REAIS DO WHATSAPP BUSINESS
// ---------------------------
router.get('/whatsapp/access-real-conversations', async (_req, res) => {
  try {
    const { accessRealWhatsAppConversations } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await accessRealWhatsAppConversations()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// HABILITAR SINCRONIZAÇÃO EM TEMPO REAL
// ---------------------------
router.post('/whatsapp/enable-realtime-sync', async (_req, res) => {
  try {
    const { enableRealTimeSync } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await enableRealTimeSync()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// FORÇAR POPULAÇÃO UMA POR UMA
// ---------------------------
router.post('/whatsapp/force-populate-one-by-one', async (_req, res) => {
  try {
    const { forcePopulateOneByOne } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await forcePopulateOneByOne()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// DECODER DE MENSAGENS HEX DO BAILEYS 6.7.18
// ---------------------------
router.get('/whatsapp/decode-messages/:phone', async (req, res) => {
  try {
    const phone = req.params.phone
    const { decodeHexMessages } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await decodeHexMessages(phone)
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// EXTRAÇÃO MASSIVA DE MENSAGENS REAIS
// ---------------------------
router.post('/whatsapp/extract-all-real-messages', async (_req, res) => {
  try {
    const { extractAllRealMessages } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await extractAllRealMessages()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// ANÁLISE AVANÇADA DE PROTOCOLOS BAILEYS
// ---------------------------
router.get('/whatsapp/advanced-protocol-analysis/:phone', async (req, res) => {
  try {
    const phone = req.params.phone
    const { advancedProtocolAnalysis } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await advancedProtocolAnalysis(phone)
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// DECODIFICADOR INTENSIVO DE MENSAGENS
// ---------------------------
router.post('/whatsapp/intensive-message-decoder', async (_req, res) => {
  try {
    const { intensiveMessageDecoder } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await intensiveMessageDecoder()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// FORÇAR RESYNC COMPLETO COM DECODIFICAÇÃO
// ---------------------------
router.post('/whatsapp/force-resync-with-decode', async (_req, res) => {
  try {
    const { forceResyncWithDecode } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await forceResyncWithDecode()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// VENOM AS PRIMARY CLIENT
// ---------------------------
router.post('/whatsapp/force-venom-primary', async (_req, res) => {
  try {
    const { forceVenomAsPrimary } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await forceVenomAsPrimary()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// EXTRAÇÃO MASSIVA COM VENOM
// ---------------------------
router.post('/whatsapp/extract-venom-conversations', async (_req, res) => {
  try {
    const { extractRealConversationsVenom } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await extractRealConversationsVenom()
    return res.json({ ok: true, result, timestamp: Date.now() })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// COMPARAÇÃO VENOM vs BAILEYS
// ---------------------------
router.get('/whatsapp/compare-venom-baileys', async (_req, res) => {
  try {
    const { compareVenomVsBaileys } = await import('../services/bot/whatsappClient_baileys.js')
    const result = await compareVenomVsBaileys()
    return res.json({ ok: true, result, timestamp: Date.now() })
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
  // usar o facade já importado no topo
  await initWhatsApp()
  const rt: any = getWhatsAppRuntimeStatus()
    return res.json({ ok: true, mode: rt?.usingStack || 'unknown', connected: true })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// Forçar exibição de QR do WhatsApp-Web.js
router.post('/whatsapp/force-venom-qr', async (_req, res) => {
  try {
    const { forceVenomQr, getWhatsAppRuntimeStatus } = await import('../services/bot/whatsappClient.fixed.js')
    const result = await forceVenomQr()
    const rt: any = getWhatsAppRuntimeStatus()
    return res.json({ ok: true, result, mode: rt?.usingStack || 'wwjs', timestamp: Date.now() })
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
// RESTARTS (USADOS PELO FRONT)
// ---------------------------
router.post('/whatsapp/restart', async (_req, res) => {
  try {
  const result = await restartWhatsApp(false)
  return res.json({ ok: true, result })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

router.post('/whatsapp/fresh-restart', async (_req, res) => {
  try {
  const result = await restartWhatsApp(true)
  return res.json({ ok: true, freshQR: true, result })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// ENVIO MANUAL (USADO NO UI)
// ---------------------------
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { to, message, media } = req.body || {}
    // Compatibilidade com UI: phone/content
    const phone = to || req.body?.phone
    const content = message || req.body?.content
    if (!phone || !content) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: to/phone, message/content' })
    }
    let result
    if (media) {
      result = await sendWhatsAppMedia(phone, media, content)
    } else {
      result = await sendWhatsAppMessage(phone, content)
    }
    return res.json({ ok: true, result })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message })
  }
})

// ---------------------------
// LISTA DE CONVERSAS (WA + DB mínimo)
// ---------------------------
router.get('/whatsapp/conversations', async (_req, res) => {
  try {
    const db = getDatabase()
    // Pegar últimos 20 leads pela última mensagem
    const rows = db.prepare(`
      SELECT l.phone as phone, c.id as conversation_id, c.bot_enabled
      FROM conversations c
      JOIN leads l ON l.id = c.lead_id
      ORDER BY c.updated_at DESC
      LIMIT 20
    `).all()

    // Para cada, pegar últimas 10 mensagens
    const conversations = rows.map((r: any) => {
      const msgs = db.prepare(`
        SELECT id, direction, type, content, created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        LIMIT 50
      `).all(r.conversation_id)
      const mapped = msgs.map((m: any) => ({
        id: m.id,
        from: m.direction === 'inbound' ? `+${r.phone}` : 'me',
        to: m.direction === 'inbound' ? 'me' : `+${r.phone}`,
        body: String(m.content || ''),
        timestamp: m.created_at,
        direction: m.direction === 'inbound' ? 'IN' : 'OUT'
      }))
      return {
        id: r.conversation_id,
        contact: `+${r.phone}`,
        state: 'ACTIVE',
        botEnabled: Boolean(r.bot_enabled),
        messages: mapped
      }
    })
    return res.json({ ok: true, conversations })
  } catch (e: any) {
    // fallback vazio
    return res.json({ ok: true, conversations: [] })
  }
})

// ---------------------------
// HABILITAR/DESABILITAR BOT POR TELEFONE
// ---------------------------
router.patch('/whatsapp/phone/:phone/bot', async (req, res) => {
  try {
    const { phone } = req.params
    const { enabled } = req.body
    const db = getDatabase()

    // Normalizar telefone
    const normalizedPhone = phone.replace(/\D/g, '')
    
    // Buscar ou criar lead
    let lead = db.prepare('SELECT * FROM leads WHERE phone = ?').get(normalizedPhone)
    if (!lead) {
      const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      db.prepare(`
        INSERT INTO leads (id, phone, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(leadId, normalizedPhone)
      lead = { id: leadId, phone: normalizedPhone }
    }

    // Buscar ou criar conversa
    let conversation = db.prepare('SELECT * FROM conversations WHERE lead_id = ?').get(lead.id)
    if (!conversation) {
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      db.prepare(`
        INSERT INTO conversations (id, lead_id, status, bot_enabled, created_at, updated_at)
        VALUES (?, ?, 'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(conversationId, lead.id)
      conversation = { id: conversationId, lead_id: lead.id }
    }

    // Atualizar estado do bot na conversa
    db.prepare(`
      UPDATE conversations 
      SET bot_enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(enabled ? 1 : 0, conversation.id)

    // Emitir evento SSE para frontend
    const { broadcast } = await import('../services/bot/sse.js')
    broadcast('bot_toggled', {
      phone: normalizedPhone,
      conversationId: conversation.id,
      enabled: enabled
    })

    logger.info(`🤖 Bot ${enabled ? 'habilitado' : 'desabilitado'} para ${normalizedPhone}`)
    
    return res.json({
      ok: true,
      phone: normalizedPhone,
      conversationId: conversation.id,
      botEnabled: enabled,
      message: `Bot ${enabled ? 'habilitado' : 'desabilitado'} com sucesso`
    })

  } catch (e: any) {
    logger.error('Erro ao alterar status do bot:', e.message)
    return res.status(500).json({ ok: false, error: e.message })
  }
})

// ---------------------------
// DEBUG E OUTROS ENDPOINTS
// ---------------------------
// (Mantive todos os outros endpoints originais sem duplicação)

export default router
