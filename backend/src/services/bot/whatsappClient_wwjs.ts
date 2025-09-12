// WhatsApp Client usando whatsapp-web.js como cliente principal
// Implementação robusta e estável para produção

import pkg from 'whatsapp-web.js'
const { Client, LocalAuth, MessageMedia } = pkg
import { EventEmitter } from 'events'
import QRCode from 'qrcode'
import { logger } from '../../utils/logger.js'
import { broadcast } from './sse.js'

// ===== STATE MANAGEMENT =====
let client: any = null
let ready = false
let isInitializing = false
let initPromise: Promise<any> | null = null
let latestQr: { pngDataUrl?: string; ascii?: string; ts: number } | null = null
let usingStack = 'wwjs'

// Internal event emitter para inbound messages
export const waInternalEmitter = new EventEmitter()
waInternalEmitter.setMaxListeners(50)

// Runtime state tracking
interface WARuntimeState {
  ready: boolean
  hasClient: boolean
  usingStack: string
  stale: boolean
  consecutiveFailures: number
  lastReadyAt?: number
  reinitInFlight: Promise<void> | null
}

const waRuntime: WARuntimeState = {
  ready: false,
  hasClient: false,
  usingStack: 'wwjs',
  stale: false,
  consecutiveFailures: 0,
  reinitInFlight: null
}

// ===== INITIALIZATION =====
export async function initWhatsApp(): Promise<any> {
  if (initPromise) {
    logger.info('⏳ Aguardando inicialização WhatsApp-Web.js em andamento...')
    return initPromise
  }

  if (ready && client) {
    logger.info('✅ WhatsApp-Web.js já está conectado!')
    return client
  }

  console.log('🚀 INICIANDO WHATSAPP-WEB.JS COMO CLIENTE PRINCIPAL')
  logger.info('🚀 INICIANDO WHATSAPP-WEB.JS COMO CLIENTE PRINCIPAL')
  
  initPromise = (async () => {
    try {
      isInitializing = true
      ready = false
      latestQr = null
      
      // Cleanup previous client
      if (client) {
        try {
          await client.destroy()
        } catch (e) {
          logger.warn('Erro ao limpar cliente anterior:', e)
        }
        client = null
      }

      console.log('🔧 Criando cliente WhatsApp-Web.js...')
      // Initialize WhatsApp-Web.js client
      client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'nexus-wwjs-session'
        }),
        puppeteer: {
          headless: process.env.WA_HEADLESS !== 'false',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
        // Removendo webVersionCache para usar versão padrão
      })

      console.log('🔧 Cliente criado, configurando event listeners...')
      // Setup event listeners
      setupEventListeners()

      // Start client
      console.log('🔄 Inicializando cliente WhatsApp-Web.js...')
      logger.info('🔄 Inicializando cliente WhatsApp-Web.js...')
      await client.initialize()
      console.log('✅ Cliente inicializado, aguardando eventos...')

      return client
    } catch (error: any) {
      console.log('❌ Erro ao inicializar WhatsApp-Web.js:', error.message)
      logger.error('❌ Erro ao inicializar WhatsApp-Web.js:', error.message)
      isInitializing = false
      ready = false
      waRuntime.ready = false
      waRuntime.hasClient = false
      throw error
    } finally {
      initPromise = null
    }
  })()

  return initPromise
}

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
  if (!client) return

  console.log('🔗 Configurando event listeners...')

  // Loading screen event - ADICIONAL PARA DEBUG
  client.on('loading_screen', (percent: any, message: any) => {
    console.log(`⏳ LOADING: ${percent}% - ${message}`)
  })

  // Remote session saved - ADICIONAL PARA DEBUG
  client.on('remote_session_saved', () => {
    console.log('💾 SESSÃO SALVA')
  })

  // QR Code generation
  client.on('qr', async (qr: any) => {
    console.log('📱 QR CODE GERADO!')
    try {
      logger.info('📱 QR Code gerado - escaneie com WhatsApp')
      
      // Generate QR as PNG with corrected options
      const pngDataUrl = await QRCode.toDataURL(qr, {
        errorCorrectionLevel: 'M' as const,
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      latestQr = {
        pngDataUrl,
        ascii: qr,
        ts: Date.now()
      }

      // Broadcast QR via SSE
      broadcast('wa_qr', {
        dataUrl: pngDataUrl,
        ts: Date.now()
      })

      logger.info('✅ QR Code broadcastado via SSE')
    } catch (err: any) {
      logger.error('❌ Erro ao gerar QR Code:', err.message)
    }
  })

  // Ready event
  client.on('ready', () => {
    console.log('🔥🔥🔥 WHATSAPP-WEB.JS READY EVENT!!! 🔥🔥🔥')
    console.log('🎯 READY disparado - finalmente!')
    logger.info('✅ WhatsApp-Web.js conectado e pronto!')
    logger.info('🔥 [WWJS] EVENTO READY DISPARADO!!!')
    ready = true
    isInitializing = false
    waRuntime.ready = true
    waRuntime.hasClient = true
    waRuntime.lastReadyAt = Date.now()
    waRuntime.consecutiveFailures = 0
    waRuntime.stale = false

    // Clear QR
    latestQr = null
    broadcast('wa_qr', { dataUrl: null, ts: Date.now() })
    
    // Broadcast ready status
    broadcast('wa_status', {
      ready: true,
      hasClient: true,
      usingStack: 'wwjs',
      ts: Date.now()
    })

    logger.info('📡 WhatsApp READY - broadcasting connection status')
    logger.info('🔥 [WWJS] ESTADO ATUALIZADO: ready=true, hasClient=true')
    console.log('🔥🔥🔥 READY STATUS UPDATED - ready=true!!! 🔥🔥🔥')
    
    // Como o ready real disparou, não precisamos mais do poller de backup
    console.log('✅ READY real disparou - backup poller não é necessário!')
  })

  // DEBUG EXTRAS - para descobrir onde trava
  client.on('disconnected', (reason: any) => {
    console.log('⚠️ DISCONNECT:', reason)
  })

  client.on('change_state', (state: any) => {
    console.log('🔄 STATE CHANGE:', state)
  })

  client.on('connection_validate', () => {
    console.log('✅ CONNECTION VALIDATED')
  })

  // TODOS OS EVENTOS POSSÍVEIS PARA DEBUG
  client.on('message_create', (message: any) => {
    console.log('🆕 MESSAGE_CREATE:', message.from, message.body)
  })

  client.on('message_ack', (message: any, ack: any) => {
    console.log('✅ MESSAGE_ACK:', message.from, ack)
  })

  client.on('contact_changed', (message: any, oldId: any, newId: any, isContact: any) => {
    console.log('👤 CONTACT_CHANGED:', oldId, newId, isContact)
  })

  client.on('group_join', (notification: any) => {
    console.log('👥 GROUP_JOIN:', notification)
  })

  client.on('group_leave', (notification: any) => {
    console.log('👥 GROUP_LEAVE:', notification)
  })

  client.on('call', (call: any) => {
    console.log('📞 CALL:', call)
  })

  // Log ALL events
  const originalEmit = client.emit
  client.emit = function(event: string, ...args: any[]) {
    console.log(`🎯 EVENT FIRED: ${event}`, args.length > 0 ? args[0] : '')
    return originalEmit.apply(this, arguments as any)
  }

  // Authentication events
  client.on('authenticated', () => {
    console.log('🔐 AUTENTICADO COM SUCESSO!')
    logger.info('🔐 WhatsApp autenticado com sucesso')
    
    // WORKAROUND: Se ready não disparar em 10s, forçar ready
    console.log('⏰ Configurando workaround para ready event...')
    setTimeout(() => {
      if (!ready) {
        console.log('🚨 READY não disparou após 10s - FORÇANDO READY!')
        logger.warn('🚨 Evento ready não disparou - ativando workaround')
        
        // Simular evento ready
        ready = true
        isInitializing = false
        waRuntime.ready = true
        waRuntime.hasClient = true
        waRuntime.lastReadyAt = Date.now()
        waRuntime.consecutiveFailures = 0
        waRuntime.stale = false

        // Clear QR
        latestQr = null
        broadcast('wa_qr', { dataUrl: null, ts: Date.now() })
        
        // Broadcast ready status
        broadcast('wa_status', {
          ready: true,
          hasClient: true,
          usingStack: 'wwjs',
          ts: Date.now()
        })

        logger.info('🔥 [WORKAROUND] WhatsApp forçado para ready!')
        console.log('🔥🔥🔥 WORKAROUND READY ATIVADO!!! 🔥🔥🔥')
        
        // INICIAR POLLER APENAS COMO ÚLTIMO RECURSO quando ready real não disparou
        setTimeout(() => {
          console.log('⚠️ [FALLBACK] Ready real não disparou - iniciando poller como último recurso...')
          startMessagePoller()
        }, 5000)
      }
    }, 10000)
  })

  client.on('auth_failure', (msg: any) => {
    console.log('❌ FALHA NA AUTENTICAÇÃO:', msg)
    logger.error('❌ Falha na autenticação WhatsApp:', msg)
    ready = false
    waRuntime.ready = false
    broadcast('wa_status', { ready: false, error: 'auth_failure', ts: Date.now() })
  })

  // Disconnection handling
  client.on('disconnected', (reason: any) => {
    console.log('⚠️ DESCONECTADO:', reason)
    logger.warn('⚠️ WhatsApp desconectado:', reason)
    ready = false
    waRuntime.ready = false
    waRuntime.stale = true
    
    broadcast('wa_status', { 
      ready: false, 
      hasClient: false, 
      disconnected: true, 
      reason: reason,
      ts: Date.now() 
    })

    // Auto-reconnect after disconnection
    logger.info('🔄 Tentando reconexão automática em 5 segundos...')
    setTimeout(() => {
      initWhatsApp().catch(err => 
        logger.error('❌ Falha na reconexão automática:', err.message)
      )
    }, 5000)
  })

  // Message listener - CORE FUNCTIONALITY
  client.on('message', async (message: any) => {
    console.log('🔥🔥🔥 MENSAGEM RECEBIDA NO WHATSAPP-WEB.JS!!! 🔥🔥🔥')
    console.log('📨 Message from:', message.from)
    console.log('📨 Message body:', message.body)
    console.log('📨 Message type:', message.type)
    console.log('📨 Message fromMe:', message.fromMe)
    console.log('📨 Message object:', JSON.stringify(message, null, 2))
    
    try {
      // Skip group messages, status updates, and own messages
      if (message.from.includes('@g.us') || 
          message.from === 'status@broadcast' || 
          message.fromMe) {
        console.log('❌ Mensagem ignorada (grupo/status/própria)')
        return
      }

      // Skip notification templates and ciphertext (only process actual chat messages)
      if (message.type !== 'chat') {
        console.log(`❌ Mensagem ignorada (tipo: ${message.type}) - apenas processamos tipo 'chat'`)
        return
      }

      // Extract phone and message content
      const phone = message.from.replace('@c.us', '')
      const body = message.body || ''

      console.log(`📨 [WWJS] PROCESSANDO MENSAGEM de ${phone}: ${body}`)
      logger.info(`📨 [WWJS] Mensagem recebida de ${phone}: ${body.substring(0, 50)}...`)

      // Emit to inbound processor
      const messageData = {
        phone,
        body,
        timestamp: message.timestamp * 1000, // Convert to milliseconds
        id: message.id.id,
        source: 'wwjs',
        hasMedia: message.hasMedia,
        type: message.type
      }

      console.log('📤 [WWJS] EMITINDO EVENTO inbound-wa...', messageData)
      logger.info('📤 [WWJS] Emitindo evento inbound-wa...')
      waInternalEmitter.emit('inbound-wa', messageData)
      console.log('✅ [WWJS] EVENTO inbound-wa EMITIDO!!!')
      logger.info('✅ [WWJS] Evento inbound-wa emitido com sucesso')

    } catch (err: any) {
      console.log('❌ [WWJS] ERRO ao processar mensagem:', err.message)
      logger.error('❌ [WWJS] Erro ao processar mensagem:', err.message)
    }
  })

  // Group join event
  client.on('group_join', (notification: any) => {
    logger.info('👥 Usuário entrou no grupo:', notification)
  })

  // Call event
  client.on('call', (call: any) => {
    logger.info('📞 Chamada recebida:', call.from)
    // Auto-reject calls to keep bot focused
    call.reject()
  })

  logger.info('🔗 Event listeners configurados para WhatsApp-Web.js')
}

// ===== MESSAGE SENDING =====
export async function sendWhatsAppMessage(to: string, message: string) {
  if (!client || !ready) {
    throw new Error('WA_NOT_CONNECTED')
  }

  // Validação crítica: mensagem não pode estar vazia
  console.log(`🔍 TENTATIVA ENVIO - Mensagem: "${message}" (length: ${message?.length || 0})`)
  
  if (!message || message.trim().length === 0) {
    logger.error(`❌ [WWJS] MENSAGEM VAZIA DETECTADA para ${to}!`)
    logger.error(`❌ [WWJS] Conteúdo recebido: "${message}"`)
    console.error('🚨 MENSAGEM VAZIA BLOQUEADA:', { to, message })
    throw new Error('EMPTY_MESSAGE_BLOCKED')
  }

  try {
    // Format phone number
    const chatId = to.includes('@c.us') ? to : `${to.replace(/\D/g, '')}@c.us`
    
    logger.info(`📤 [WWJS] Enviando mensagem para ${chatId}`)
    logger.info(`📤 [WWJS] Conteúdo da mensagem: "${message.substring(0, 100)}..."`)
    
    // Send message
    const result = await client.sendMessage(chatId, message)
    
    waRuntime.consecutiveFailures = 0
    logger.info('✅ Mensagem enviada com sucesso via WhatsApp-Web.js')
    
    return { 
      ok: true, 
      id: result.id.id,
      timestamp: result.timestamp 
    }
  } catch (err: any) {
    waRuntime.consecutiveFailures += 1
    logger.error('❌ Erro ao enviar mensagem:', err.message)

    // Auto-restart after too many failures
    if (waRuntime.consecutiveFailures >= 5) {
      await safeReinit('send-fail')
    }

    throw new Error(err.message || 'WA_SEND_FAILED')
  }
}

// ===== MEDIA SENDING =====
export async function sendWhatsAppMedia(to: string, mediaPath: string, caption?: string) {
  if (!client || !ready) {
    throw new Error('WA_NOT_CONNECTED')
  }

  try {
    const chatId = to.includes('@c.us') ? to : `${to.replace(/\D/g, '')}@c.us`
    
    logger.info(`📤 [WWJS] Enviando mídia para ${chatId}`)
    
    // Create media from path
    const media = MessageMedia.fromFilePath(mediaPath)
    
    // Send media with optional caption
    const result = await client.sendMessage(chatId, media, { caption })
    
    waRuntime.consecutiveFailures = 0
    logger.info('✅ Mídia enviada com sucesso via WhatsApp-Web.js')
    
    return { 
      ok: true, 
      id: result.id.id,
      timestamp: result.timestamp 
    }
  } catch (err: any) {
    waRuntime.consecutiveFailures += 1
    logger.error('❌ Erro ao enviar mídia:', err.message)
    throw new Error(err.message || 'WA_MEDIA_SEND_FAILED')
  }
}

// ===== UTILITY FUNCTIONS =====
let readyCheckCount = 0
export function isWhatsAppReady(): boolean {
  const result = ready && !!client
  
  // Log apenas a cada 50 verificações para reduzir spam
  readyCheckCount++
  if (readyCheckCount % 50 === 0) {
    console.log(`🔍 isWhatsAppReady CHECK: ready=${ready}, hasClient=${!!client}, result=${result} (${readyCheckCount} checks)`)
  }
  
  return result
}

export function getLatestQr() {
  return latestQr
}

export function getWhatsAppState() {
  return {
    ready,
    hasClient: !!client,
    initializing: isInitializing,
    qr: latestQr?.pngDataUrl || null,
    usingStack: 'wwjs',
    timestamp: new Date().toISOString()
  }
}

export function getWhatsAppRuntimeStatus() {
  return {
    ...waRuntime,
    ready,
    hasClient: !!client,
    usingStack: 'wwjs'
  }
}

// ===== RESTART & CLEANUP =====
export async function restartWhatsApp(forceCleanup = false) {
  logger.info('🔄 Reiniciando WhatsApp-Web.js...')

  try {
    // Cleanup current client
    if (client) {
      try {
        await client.destroy()
      } catch (e) {
        logger.warn('Erro ao destruir cliente anterior:', e)
      }
      client = null
    }

    ready = false
    isInitializing = false
    latestQr = null
    initPromise = null
    waRuntime.ready = false
    waRuntime.hasClient = false
    waRuntime.stale = false

    broadcast('wa_qr', { dataUrl: null, ts: Date.now() })
    broadcast('wa_status', { 
      ready: false, 
      hasClient: false, 
      restarting: true, 
      ts: Date.now() 
    })

    if (forceCleanup) {
      logger.info('🧹 Limpeza forçada solicitada')
      // WhatsApp-Web.js will handle auth cleanup automatically
    }

    // Restart
    await initWhatsApp()
    logger.info('✅ Restart do WhatsApp-Web.js completado')
  } catch (error: any) {
    logger.error('❌ Erro durante restart:', error.message)
    throw error
  }
}

export async function forceLogout() {
  logger.info('🚪 Forçando logout do WhatsApp-Web.js...')
  
  if (client) {
    try {
      await client.logout()
      await client.destroy()
    } catch (e) {
      logger.warn('Erro durante logout:', e)
    }
    client = null
  }

  ready = false
  waRuntime.ready = false
  waRuntime.hasClient = false
  latestQr = null

  broadcast('wa_status', { 
    ready: false, 
    hasClient: false, 
    loggedOut: true, 
    ts: Date.now() 
  })

  logger.info('✅ Logout forçado completado')
}

// ===== SAFE REINIT =====
async function safeReinit(reason: string) {
  if (waRuntime.reinitInFlight) return waRuntime.reinitInFlight

  waRuntime.reinitInFlight = (async () => {
    logger.warn(`[WA] Reinit disparado (${reason})`)
    try {
      await restartWhatsApp(false)
      waRuntime.consecutiveFailures = 0
      waRuntime.stale = false
      logger.info(`[WA] Reinit completado com sucesso (${reason})`)
    } catch (e: any) {
      logger.error('[WA] Reinit falhou:', e?.message)
    } finally {
      waRuntime.reinitInFlight = null
    }
  })()

  return waRuntime.reinitInFlight
}

// ===== NUMBER VALIDATION =====
export async function isWhatsAppNumberRegistered(number: string): Promise<boolean> {
  if (!client || !ready) {
    throw new Error('WA_NOT_CONNECTED')
  }

  try {
    const numberId = await client.getNumberId(number.replace(/\D/g, ''))
    return !!numberId
  } catch (err: any) {
    logger.error('❌ Erro ao verificar número:', err.message)
    return false
  }
}

// ===== DEBUG FUNCTIONS =====
export function getWhatsAppDebug() {
  return {
    client: {
      exists: !!client,
      ready,
      isInitializing,
      usingStack: 'wwjs'
    },
    runtime: waRuntime,
    qr: {
      hasQr: !!latestQr,
      timestamp: latestQr?.ts
    },
    emitter: {
      listenerCount: waInternalEmitter.listenerCount('inbound-wa'),
      eventNames: waInternalEmitter.eventNames()
    }
  }
}

// ===== COMPATIBILITY EXPORTS =====
export function bindOutboundToWhatsApp() {
  // Compatibility function - not needed for WhatsApp-Web.js
}

export function emitOutboundDelivery() {
  // Compatibility function
}

export async function getRecentChats() {
  if (!client || !ready) {
    return []
  }

  try {
    const chats = await client.getChats()
    return chats.slice(0, 20).map((chat: any) => ({
      id: chat.id._serialized,
      name: chat.name,
      lastMessage: chat.lastMessage?.body?.substring(0, 100),
      timestamp: chat.lastMessage?.timestamp || 0,
      unreadCount: chat.unreadCount
    }))
  } catch (err: any) {
    logger.error('❌ Erro ao buscar chats:', err.message)
    return []
  }
}

export async function getRecentInboundTraces() {
  // Return recent inbound message traces for debugging
  return []
}

// ===== MESSAGE POLLER - BACKUP SYSTEM =====
let pollerInterval: NodeJS.Timeout | null = null
let lastCheckedTimestamp = Date.now()

function startMessagePoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval)
  }

  console.log('🔍 INICIANDO MESSAGE POLLER - verificando mensagens a cada 3s')
  logger.info('🔍 Message poller iniciado como backup')

  // Teste inicial do client
  setTimeout(async () => {
    try {
      if (!client || typeof client.getChats !== 'function') {
        console.log('❌ [POLLER] Client não está pronto para polling')
        return
      }
      
      const testChats = await client.getChats()
      console.log(`✅ [POLLER] Client testado - ${testChats.length} chats encontrados`)
      
    } catch (error: any) {
      console.log(`❌ [POLLER] Erro no teste inicial: ${error.message}`)
    }
  }, 1000)

  pollerInterval = setInterval(async () => {
    try {
      // Verificação mais rigorosa do estado do client
      if (!client || !ready) return
      
      // Verificar se o client tem os métodos necessários
      if (typeof client.getChats !== 'function') {
        console.log('⚠️ [POLLER] Client ainda não está completamente pronto')
        return
      }

      // Get all chats
      const chats = await client.getChats()
      
      for (const chat of chats) {
        // Skip groups and status
        if (chat.isGroup || chat.id._serialized === 'status@broadcast') continue

        // Get recent messages (last 5 to avoid too much processing)
        const messages = await chat.fetchMessages({ limit: 5 })
        
        for (const message of messages) {
          // Skip old messages and own messages
          if (message.timestamp * 1000 <= lastCheckedTimestamp || message.fromMe) continue

          console.log('🔍 [POLLER] Nova mensagem encontrada!')
          console.log('📨 From:', message.from)
          console.log('📨 Body:', message.body)
          console.log('📨 Timestamp:', message.timestamp)

          // Process the message (same as event handler)
          const phone = message.from.replace('@c.us', '')
          const body = message.body || ''

          const messageData = {
            phone,
            body,
            timestamp: message.timestamp * 1000,
            id: message.id.id,
            source: 'wwjs-poller',
            hasMedia: message.hasMedia,
            type: message.type
          }

          console.log('📤 [POLLER] EMITINDO EVENTO inbound-wa...', messageData)
          waInternalEmitter.emit('inbound-wa', messageData)
          console.log('✅ [POLLER] EVENTO inbound-wa EMITIDO!!!')
        }
      }

      // Update last checked timestamp
      lastCheckedTimestamp = Date.now()

    } catch (error: any) {
      console.error('❌ [POLLER] Erro:', error.message)
    }
  }, 3000) // Check every 3 seconds
}

// ===== DEFAULT EXPORT =====
export default {
  initWhatsApp,
  isWhatsAppReady,
  sendWhatsAppMessage,
  sendWhatsAppMedia,
  getLatestQr,
  getWhatsAppState,
  getWhatsAppRuntimeStatus,
  restartWhatsApp,
  forceLogout,
  isWhatsAppNumberRegistered,
  getWhatsAppDebug,
  getRecentChats,
  waInternalEmitter
}
