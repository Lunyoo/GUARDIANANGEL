// NOVO WHATSAPP CLIENT - BAILEYS + VENOM FALLBACK 🔥
import EventEmitter from 'events'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../../config/logger.js'
import QRCode from 'qrcode'
import { broadcast } from './sse.js'

// Global error handling for unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('🚨 Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
    service: 'nexus-backend'
  })
  
  // Don't crash the process, just log the error
  if (reason?.message?.includes('WhatsApp') || reason?.message?.includes('Baileys')) {
    logger.warn('🔄 WhatsApp-related unhandled rejection detected - continuing operation')
  }
})

// Global error handling for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('🚨 Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    service: 'nexus-backend'
  })
  
  // Don't crash on WhatsApp errors
  if (error.message?.includes('WhatsApp') || error.message?.includes('Baileys')) {
    logger.warn('🔄 WhatsApp-related uncaught exception detected - continuing operation')
    return
  }
  
  // For non-WhatsApp errors, exit gracefully
  process.exit(1)
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Baileys imports
let baileys: any = null
let venomBot: any = null

// Ack map helper
export type WAckStatus = 'pending' | 'server' | 'delivered' | 'read' | 'played'
function mapAck(n: number | undefined): WAckStatus | undefined {
  switch(n){
    case 0: return 'pending'
    case 1: return 'server'
    case 2: return 'delivered'
    case 3: return 'read'
    case 4: return 'played'
    default: return undefined
  }
}

// Internal emitter for ack/status events
export const waInternalEmitter = new EventEmitter()

const emitter = new EventEmitter()
let client: any = null
let sock: any = null // Baileys socket
let usingStack: 'baileys' | 'venom' | null = null
let latestQr: { pngDataUrl?: string; ascii?: string; urlCode?: string; ts: number } | null = null
let ready = false
let isInitializing = false
let qrAttempts = 0
let sessionName = 'guardian-baileys'
let initPromise: Promise<any> | null = null
let watchdogInterval: NodeJS.Timeout | null = null
let lastRestartAt = 0

// Runtime resilience state
interface WARuntimeState {
  consecutiveFailures: number
  stale: boolean
  lastReadyAt?: number
  reinitInFlight?: Promise<void> | null
}

const waRuntime: WARuntimeState = {
  consecutiveFailures: 0,
  stale: false,
  lastReadyAt: undefined,
  reinitInFlight: null
}

async function initBaileys() {
  if (!baileys) {
    try {
      baileys = await import('@whiskeysockets/baileys')
      logger.info('✅ Baileys carregado com sucesso')
    } catch (e: any) {
      throw new Error('Baileys não disponível: ' + e?.message)
    }
  }

  const authDir = path.join(__dirname, '..', '..', '..', '.baileys_auth')
  try { fs.mkdirSync(authDir, { recursive: true }) } catch {}

  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys
  // Negociar automaticamente a versão suportada do WhatsApp Web (corrige erros 405 de handshake)
  const { version: waVersion, isLatest } = await fetchLatestBaileysVersion()
  logger.info(`🔧 Usando versão WhatsApp Web: ${waVersion.join('.')} (latest: ${isLatest})`)
  const { state, saveCreds } = await useMultiFileAuthState(authDir)

  const baileyLogger = {
    level: 'silent',
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    trace: () => {},
    fatal: () => {},
    child: () => baileyLogger
  }

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: baileyLogger as any,
    version: waVersion,
    browser: Browsers.macOS('Desktop'),
    markOnlineOnConnect: false,
    syncFullHistory: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update: any) => {
    try {
      const { connection, lastDisconnect, qr, isOnline, isNewLogin } = update
      
      logger.info(`🔄 Connection update: ${connection}, isOnline: ${isOnline}, isNewLogin: ${isNewLogin}`)
      
      // Helper: detect Baileys stream conflict (another session logged in elsewhere)
      const isConflict = (err: any) => {
        try {
          if (!err) return false
          const code = err?.output?.statusCode || err?.data?.statusCode
          const msg = (err?.message || '').toLowerCase()
          const tag = err?.data?.content?.[0]?.tag || err?.data?.tag
          const innerTag = err?.data?.content?.[0]?.attrs?.type
          return code === 440 || msg.includes('conflict') || tag === 'stream:error' && (innerTag === 'replaced' || innerTag === 'conflict')
        } catch { return false }
      }

      if (qr) {
        // throttle QR emission to avoid rapid refresh loops on unstable networks
        const prevTs = latestQr?.ts || 0
        const nowTs = Date.now()
        if (nowTs - prevTs < 3000) {
          logger.debug('⏳ QR recebido muito rápido – suprimindo atualização')
        } else {
        logger.info('📱 QR Code recebido (Baileys)')
        try {
          // Validar se o QR é válido antes de processar
          if (!qr || typeof qr !== 'string' || qr.length < 20) {
            logger.warn('⚠️ QR code inválido recebido, ignorando...')
            return
          }
          
          // Configurações otimizadas para QR mais compatível
          const qrOptions = {
            type: 'image/png' as const,
            quality: 0.9,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            width: 400,  // Tamanho menor para melhor compatibilidade
            errorCorrectionLevel: 'H' as const  // Máxima correção de erro
          }
          
          const qrDataUrl = await QRCode.toDataURL(qr, qrOptions)
          latestQr = { 
            pngDataUrl: qrDataUrl,
            ascii: '',
            urlCode: qr,
            ts: nowTs
          }
          emitter.emit('qr', latestQr)
          broadcast('wa_qr', { dataUrl: latestQr.pngDataUrl, ts: latestQr.ts })
          logger.info(`📱 QR (Baileys) emitido - válido por ~45s. Escaneie AGORA!`)
          logger.info(`🔍 QR URL length: ${qr.length}, Format válido: ${qr.startsWith('2@') || qr.startsWith('1@')}`)
        } catch (e: any) {
          logger.error('Erro ao gerar QR Baileys:', e.message)
        }
        }
      }

    if (connection === 'close') {
      const err: any = lastDisconnect?.error
      const loggedOut = (err as any)?.output?.statusCode === DisconnectReason.loggedOut
      const restartRequired = (err as any)?.output?.statusCode === DisconnectReason.restartRequired
      const badSession = (err as any)?.output?.statusCode === DisconnectReason.badSession
      const conflict = isConflict(err)
      const qrTimeout = (err as any)?.output?.statusCode === 408 || /QR refs attempts ended/i.test(err?.message || '')
      const shouldReconnect = !loggedOut
      logger.warn('⚡ Desconectado (Baileys):', err)
      if (badSession) {
        logger.warn('🧼 Sessão inválida (badSession) – limpando credenciais e reiniciando')
        try { await forceLogout() } catch {}
        setTimeout(() => { safeReinit('bad-session').catch(()=>{}) }, 500)
        return
      }

      if (restartRequired) {
        logger.warn('🔁 Restart required – reiniciando conexão preservando credenciais')
        setTimeout(() => { safeReinit('restart-required').catch(()=>{}) }, 500)
        return
      }
      ready = false
      usingStack = 'baileys'
      broadcast('wa_status', { ready: false, hasClient: !!sock, reason: lastDisconnect?.error, ts: Date.now() })
      
      // If conflict, force full logout + guarded re-init to get fresh QR
      if (conflict) {
        logger.warn('🧨 Conflito de sessão detectado – forçando logout e reset de credenciais')
        try { await forceLogout() } catch {}
        setTimeout(() => { safeReinit('conflict').catch(()=>{}) }, 500)
        return
      }

      if (loggedOut) {
        logger.warn('🔐 Sessão deslogada – limpando e aguardando novo pareamento')
        try { await forceLogout() } catch {}
        setTimeout(() => { safeReinit('logged-out').catch(()=>{}) }, 800)
        return
      }

      if (qrTimeout) {
  logger.warn('⏱️ QR timeout – reinicializando sessão (guarded) para novo QR')
  setTimeout(() => { safeReinit('qr-timeout').catch(()=>{}) }, 1000)
        return
      }

      if (shouldReconnect) {
        // Use guarded reinit to avoid multiple concurrent sockets causing stream conflicts
        logger.info('🔄 Reconectando Baileys via safeReinit...')
        try {
          await safeReinit('conn-close')
        } catch (reconError) {
          logger.error('Erro na safeReinit:', (reconError as any)?.message || reconError)
          waRuntime.consecutiveFailures++
        }
      }
    } else if (connection === 'open') {
      logger.info('🎉 Baileys CONECTADO! Sessão autenticada e pronta.')
      ready = true
      isInitializing = false
      latestQr = null
      waRuntime.lastReadyAt = Date.now()
      waRuntime.consecutiveFailures = 0
      waRuntime.stale = false
      
      // Broadcast para frontend que está realmente conectado
      broadcast('wa_qr', { dataUrl: null, ts: Date.now() })
      broadcast('wa_status', { ready: true, hasClient: true, connected: true, ts: Date.now() })
      emitter.emit('ready')
      logger.info('📡 WhatsApp READY - broadcasting connection status')
      
      // Start watchdog
      try { startWatchdog() } catch {}
    } else if (connection === 'connecting') {
      logger.info('🔄 Baileys conectando... aguarde')
      broadcast('wa_status', { ready: false, hasClient: true, connecting: true, ts: Date.now() })
    } else if (connection === 'close') {
      const err: any = lastDisconnect?.error
      const loggedOut = (err as any)?.output?.statusCode === DisconnectReason.loggedOut
      const restartRequired = (err as any)?.output?.statusCode === DisconnectReason.restartRequired
      const badSession = (err as any)?.output?.statusCode === DisconnectReason.badSession
      const conflict = isConflict(err)
      const qrTimeout = (err as any)?.output?.statusCode === 408 || /QR refs attempts ended/i.test(err?.message || '')
      const shouldReconnect = !loggedOut
      logger.warn('⚡ Desconectado (Baileys):', err)
      if (badSession) {
        logger.warn('🧼 Sessão inválida (badSession) – limpando credenciais e reiniciando')
        try { await forceLogout() } catch {}
        setTimeout(() => { safeReinit('bad-session').catch(()=>{}) }, 500)
        return
      }

      if (restartRequired) {
        logger.warn('🔁 Restart required – reiniciando conexão preservando credenciais')
        setTimeout(() => { safeReinit('restart-required').catch(()=>{}) }, 500)
        return
      }
      ready = false
      usingStack = 'baileys'
      broadcast('wa_status', { ready: false, hasClient: !!sock, reason: lastDisconnect?.error, ts: Date.now() })
      
      // If conflict, force full logout + guarded re-init to get fresh QR
      if (conflict) {
        logger.warn('🧨 Conflito de sessão detectado – forçando logout e reset de credenciais')
        try { await forceLogout() } catch {}
        setTimeout(() => { safeReinit('conflict').catch(()=>{}) }, 500)
        return
      }

      if (loggedOut) {
        logger.warn('🔐 Sessão deslogada – limpando e aguardando novo pareamento')
        try { await forceLogout() } catch {}
        setTimeout(() => { safeReinit('logged-out').catch(()=>{}) }, 800)
        return
      }

      if (qrTimeout) {
        logger.warn('⏱️ QR timeout – reinicializando sessão (guarded) para novo QR')
        setTimeout(() => { safeReinit('qr-timeout').catch(()=>{}) }, 1000)
        return
      }

      if (shouldReconnect) {
        // Use guarded reinit to avoid multiple concurrent sockets causing stream conflicts
        logger.info('🔄 Reconectando Baileys via safeReinit...')
        try {
          await safeReinit('conn-close')
        } catch (reconError) {
          logger.error('Erro na safeReinit:', (reconError as any)?.message || reconError)
          waRuntime.consecutiveFailures++
        }
      }
    }
    } catch (connectionError: any) {
      logger.error('🚨 Error in connection.update handler:', {
        message: connectionError.message,
        stack: connectionError.stack,
        service: 'nexus-backend'
      })
      
      // Try to recover gracefully
      ready = false
      broadcast('wa_status', { ready: false, hasClient: !!sock, reason: 'connection-handler-error', ts: Date.now() })
    }
  })

  sock.ev.on('messages.upsert', ({ messages }: any) => {
    // If messages arrive, connection is genuinely alive
    if (!ready) {
      ready = true
      broadcast('wa_status', { ready: true, hasClient: true, ts: Date.now(), source: 'messages.upsert' })
    }
    for (const msg of messages) {
      if (msg.key.fromMe) continue // Skip outbound messages
      
      try {
        const phone = msg.key.remoteJid?.replace(/@s\.whatsapp\.net$/, '') || ''
        
        // Detectar tipo de mídia e montar body apropriado
        let body = ''
        let mediaType = ''
        
        if (msg.message?.conversation) {
          body = msg.message.conversation
        } else if (msg.message?.extendedTextMessage?.text) {
          body = msg.message.extendedTextMessage.text
        } else if (msg.message?.imageMessage) {
          mediaType = 'image'
          body = msg.message.imageMessage.caption || '[📷 Imagem]'
          // TODO: Baixar e salvar a imagem, por enquanto placeholder
          if (!msg.message.imageMessage.caption) {
            body = `https://temp-media-placeholder.com/image/${msg.key.id}.jpg`
          }
        } else if (msg.message?.videoMessage) {
          mediaType = 'video'
          body = msg.message.videoMessage.caption || '[🎥 Vídeo]'
          if (!msg.message.videoMessage.caption) {
            body = `https://temp-media-placeholder.com/video/${msg.key.id}.mp4`
          }
        } else if (msg.message?.audioMessage) {
          mediaType = 'audio'
          body = '[🎵 Áudio]'
          body = `https://temp-media-placeholder.com/audio/${msg.key.id}.mp3`
        } else if (msg.message?.documentMessage) {
          mediaType = 'document'
          body = `[📄 ${msg.message.documentMessage.fileName || 'Documento'}]`
        }
        
        const msgData = {
          id: msg.key.id || Math.random().toString(36).slice(2),
          phone: phone,
          body: body,
          direction: 'IN' as const,
          at: new Date(msg.messageTimestamp * 1000).toISOString(),
          source: 'baileys',
          mediaType: mediaType || undefined
        }
        
        logger.info(`📩 Mensagem Baileys recebida: ${msgData.phone} -> "${msgData.body}" ${mediaType ? `(${mediaType})` : ''}`)
        emitter.emit('message', msg)
        waInternalEmitter.emit('inbound-wa', msgData)
      } catch (err: any) {
        logger.warn('Erro ao processar mensagem Baileys:', err?.message)
      }
    }
  })

  usingStack = 'baileys'
  return sock
}

async function initVenom() {
  // Venom-bot removido - usando apenas Baileys
  throw new Error('Venom-bot não está mais disponível - sistema usa apenas Baileys')
}

async function startVenomSession() {
  const backendRoot = path.resolve(__dirname, '../../../')
  const USER_DATA_DIR = path.join(backendRoot, 'tmp', 'wa-venom')
  try { fs.mkdirSync(USER_DATA_DIR, { recursive: true }) } catch {}

  const config = {
    session: sessionName,
    headless: 'new',
    devtools: false,
    useChrome: false,
    debug: false,
    disableSpins: true,
    disableWelcome: true,
    updatesLog: false,
    browserArgs: [
      `--user-data-dir=${USER_DATA_DIR}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    waitForLogin: true,
    qrTimeout: 45000,
    restartOnCrash: false,
    autoClose: 0
  }

  const qrCallback = async (base64Qr: string) => {
    logger.info('📱 QR Code recebido (Venom)')
    latestQr = {
      pngDataUrl: base64Qr,
      ascii: '',
      urlCode: base64Qr,
      ts: Date.now()
    }
    emitter.emit('qr', latestQr)
    broadcast('wa_qr', { dataUrl: latestQr.pngDataUrl, ts: latestQr.ts })
  }

  const statusCallback = (status: string) => {
    logger.info(`📊 Venom Status: ${status}`)
    if (status === 'isLogged') {
      ready = true
      isInitializing = false
      latestQr = null
      waRuntime.lastReadyAt = Date.now()
      waRuntime.consecutiveFailures = 0
      waRuntime.stale = false
      
      broadcast('wa_qr', { dataUrl: null, ts: Date.now() })
      broadcast('wa_status', { ready: true, hasClient: true, ts: Date.now() })
      emitter.emit('ready')
      logger.info('📡 Venom ready emitido via SSE')
      
      // Start watchdog
      try { startWatchdog() } catch {}
    }
  }

  const venomClient = await venomBot.create(config, qrCallback, statusCallback)
  
  venomClient.onMessage((message: any) => {
    if (message.fromMe) return
    
    try {
      const msgData = {
        id: message.id || Math.random().toString(36).slice(2),
        phone: message.from.replace(/@c\.us$/, ''),
        body: message.body || '',
        direction: 'IN' as const,
        at: new Date(message.timestamp * 1000).toISOString(),
        source: 'venom'
      }
      
      logger.info(`📩 Mensagem Venom recebida: ${msgData.phone} -> "${msgData.body}"`)
      emitter.emit('message', message)
      waInternalEmitter.emit('inbound-wa', msgData)
    } catch (err: any) {
      logger.warn('Erro ao processar mensagem Venom:', err?.message)
    }
  })

  return venomClient
}

// Watchdog para auto-recovery (TEMPORARIAMENTE DESABILITADO)
function startWatchdog() {
  if (watchdogInterval) return
  logger.info('🛡️ Watchdog do WhatsApp DESABILITADO (evitando conflitos)')
  
  // Desabilitando watchdog temporariamente para evitar ciclos de reinit
  // watchdogInterval = setInterval(async () => {
  //   try {
  //     if (isInitializing || waRuntime.reinitInFlight) return
  //     const healthy = await deepHealthCheck()
  //     if (!healthy) {
  //       logger.warn('[WA:watchdog] não saudável – disparando reinit')
  //       await safeReinit('watchdog')
  //     }
  //   } catch (e: any) {
  //     logger.warn('[WA:watchdog] erro: ' + (e?.message || e))
  //   }
  // }, 15000)
}

async function deepHealthCheck(): Promise<boolean> {
  if (!ready) return false
  try {
    if (usingStack === 'baileys' && sock) {
  const wsOk = !sock.ws || sock.ws.readyState === 1
      const hasUser = Boolean(sock.user?.id)
      return wsOk && hasUser
    }
    if (usingStack === 'venom' && client) {
      return true // Venom doesn't have easy health check
    }
    return false
  } catch {
    return false
  }
}

async function safeReinit(reason: string) {
  const MIN_INTERVAL_MS = 60000 // Increased from 35s to 60s to reduce aggressive reinits
  const now = Date.now()
  ;(waRuntime as any).lastReinitAttempt = (waRuntime as any).lastReinitAttempt || 0
  const lastAttempt = (waRuntime as any).lastReinitAttempt
  const recentlyTried = (now - lastAttempt) < MIN_INTERVAL_MS
  
  if (waRuntime.reinitInFlight) return waRuntime.reinitInFlight
  if (recentlyTried) {
    logger.debug(`[WA] Reinit suprimido (intervalo) reason=${reason}`)
    return Promise.resolve()
  }
  
  ;(waRuntime as any).lastReinitAttempt = now
  waRuntime.stale = true
  // Prevent repeated QR churn triggering multiple re-inits in a short window
  if ((waRuntime as any).lastReason === 'qr-timeout' && reason === 'qr-timeout' && recentlyTried) {
    logger.debug('[WA] Ignorando reinit duplicado por qr-timeout (cooldown)')
    return Promise.resolve()
  }
  ;(waRuntime as any).lastReason = reason
  waRuntime.reinitInFlight = (async () => {
    logger.warn(`[WA] Reinit disparado (${reason}) - aguardando cleanup completo`)
    try {
      // Ensure thorough cleanup before restart to prevent session conflicts
      if (sock?.ws) {
        try {
          sock.ws.close()
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for socket cleanup
        } catch (cleanupErr) {
          logger.debug('[WA] Socket cleanup warning:', cleanupErr)
        }
      }
      
      await restartWhatsApp(false)
      waRuntime.consecutiveFailures = 0
      waRuntime.lastReadyAt = Date.now()
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

export async function initWhatsApp() {
  if (initPromise) {
    logger.info('⏳ Aguardando inicialização em andamento...')
    return initPromise
  }

  if (ready && (client || sock)) {
    logger.info('✅ WhatsApp já está conectado!')
    return client || sock
  }

  logger.info('🔥 INICIANDO WHATSAPP - BAILEYS + VENOM!')
  
  initPromise = (async () => {
    try {
      isInitializing = true
      ready = false
      latestQr = null
      qrAttempts = 0
      broadcast('wa_qr', { dataUrl: null, ts: Date.now() })
      
    // Cleanup previous clients safely
      if (sock) {
        try { 
      if (sock.ws && sock.ws.readyState === 1) { try { sock.end() } catch {} }
      try { await new Promise(r=>setTimeout(r, 100)) } catch {}
        } catch (e) {
          logger.debug('Erro ao fechar sock anterior:', e)
        }
        sock = null
      }
  if (client) {
        try { 
          if (client.isConnected && client.isConnected()) {
    try { client.logout?.() } catch {}
    client.close() 
          }
        } catch (e) {
          logger.debug('Erro ao fechar client anterior:', e)
        }
        client = null
      }

      // Try Baileys first
      const preferBaileys = (process.env.WHATSAPP_STACK || 'baileys').toLowerCase() !== 'venom'
      
      if (preferBaileys) {
        logger.info('🚀 Tentando Baileys primeiro...')
        usingStack = 'baileys'
        try {
          sock = await initBaileys()
          logger.info('✅ Baileys inicializado')
          return sock
        } catch (e: any) {
          logger.error('❌ Baileys falhou:', e?.message)
          logger.info('🔄 Fallback para Venom...')
          usingStack = 'venom'
        }
      }

      // Fallback to Venom
      if (usingStack === 'venom' || !preferBaileys) {
        logger.info('🚀 Inicializando Venom...')
        usingStack = 'venom'
        client = await initVenom()
        logger.info('✅ Venom inicializado')
        return client
      }

      throw new Error('Ambos Baileys e Venom falharam')
      
    } catch (error: any) {
      logger.error('❌ Erro ao inicializar WhatsApp:', error.message)
      isInitializing = false
      ready = false
      throw error
    } finally {
      initPromise = null
    }
  })()
  
  return initPromise
}

export async function restartWhatsApp(forceCleanup = false) {
  logger.info('🔄 Reiniciando WhatsApp...')
  // Cooldown: avoid thrashing
  if (waRuntime.reinitInFlight) {
    logger.info('⏳ Reinício em andamento – ignorando novo pedido')
    return { ok: true, mode: 'restart', already: true, inFlight: true }
  }
  const now = Date.now()
  if (now - lastRestartAt < 15000) {
    logger.info('🛑 Reinício recente (<15s) – ignorando')
    return { ok: true, mode: 'restart', already: true, tooSoon: true }
  }
  lastRestartAt = now
  
  try {
    // Cleanup current clients safely
    if (sock) {
      try { 
        if (sock.ws && sock.ws.readyState === 1) {
          sock.end() 
        }
      } catch (e) {
        logger.debug('Erro ao fechar sock durante restart:', e)
      }
      sock = null
    }
    if (client) {
      try { 
        if (client.isConnected && client.isConnected()) {
          client.close() 
        }
      } catch (e) {
        logger.debug('Erro ao fechar client durante restart:', e)
      }
      client = null
    }
    
    ready = false
    isInitializing = false
    latestQr = null
    initPromise = null
    broadcast('wa_qr', { dataUrl: null, ts: Date.now() })
    broadcast('wa_status', { ready: false, hasClient: false, ts: Date.now(), restarting: true, forceCleanup })
    
    if (forceCleanup) {
      // Clean auth directories - mais completo
      const authDirs = [
        path.join(__dirname, '..', '..', '..', '.baileys_auth'),
        path.join(__dirname, '..', '..', '..', 'tmp', 'wa-venom'),
        path.join(__dirname, '..', '..', '..', 'auth_info_baileys'),
        path.join(__dirname, '..', '..', '..', 'baileys_auth_info'),
        path.join(__dirname, '..', '..', '..', 'session_data')
      ]
      
      logger.info('🧹 Limpeza COMPLETA de sessões iniciada...')
      for (const dir of authDirs) {
        try {
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true })
            logger.info(`🧹 Removido: ${dir}`)
          }
        } catch (e: any) {
          logger.warn(`Falha ao remover ${dir}: ${e.message}`)
        }
      }
      
      // Reset completo das variáveis de estado
      waRuntime.stale = true
      waRuntime.consecutiveFailures = 0
      waRuntime.lastReadyAt = 0
      waRuntime.reinitInFlight = null
      ;(waRuntime as any).lastReinitAttempt = 0
      ;(waRuntime as any).lastReason = null
      
      logger.info('🧹 Estado interno resetado para nova sessão')
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Start new initialization
    setTimeout(() => {
      initWhatsApp().catch(e => {
        logger.error('Erro na inicialização async:', e.message)
      })
    }, 100)
    
    return { ok: true, mode: 'restart', async: true }
    
  } catch (error: any) {
    logger.error('Erro no restart:', error?.message || String(error))
    throw error
  }
}

export async function sendWhatsAppMessage(to: string, message: string) {
  const start = Date.now()
  const normalized = normalizeNumber(to)

  const healthy = await deepHealthCheck()
  if (!healthy) {
    await safeReinit('pre-send')
    throw new Error('WA_NOT_CONNECTED')
  }

  if (!ready || (!client && !sock)) {
    throw new Error('WA_NOT_CONNECTED')
  }

  let lastErr: any
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (usingStack === 'baileys' && sock) {
        const result = await sock.sendMessage(normalized, { text: message })
        waRuntime.consecutiveFailures = 0
        return { ok: true, attempt, elapsedMs: Date.now() - start, id: result?.key?.id || null }
      }

      if (usingStack === 'venom' && client) {
        const result = await client.sendText(normalized, message)
        waRuntime.consecutiveFailures = 0
        return { ok: true, attempt, elapsedMs: Date.now() - start, id: result?.id || null }
      }

      throw new Error('No valid client available')
    } catch (err: any) {
      lastErr = err
      waRuntime.consecutiveFailures += 1
      logger.warn(`[WA SEND] Erro tentativa ${attempt}: ${err?.message}`)
      if (waRuntime.consecutiveFailures >= 2) {
        await safeReinit('send-fail')
        break
      }
      if (attempt < 2) await new Promise(r => setTimeout(r, 600 * attempt))
    }
  }
  
  logger.error('Erro ao enviar mensagem (excedeu tentativas):', lastErr?.message)
  throw new Error(lastErr?.message || 'WA_SEND_FAILED')
}

function normalizeNumber(n: string) {
  const s = String(n)
  // If already a JID, return as-is
  if (/@s\.whatsapp\.net$/.test(s) || /@c\.us$/.test(s)) return s
  const digits = s.replace(/\D+/g,'')
  if (!digits) return s
  // Prefer Baileys jid; Venom path is disabled
  return `${digits}@s.whatsapp.net`
}

export function isWhatsAppReady() {
  return ready && (!!client || !!sock)
}

export async function isWhatsAppNumberRegistered(number: string): Promise<boolean> {
  if (!ready) return false
  try {
    if (usingStack === 'baileys' && sock) {
      const result = await sock.onWhatsApp(number)
      return result.length > 0
    }
    if (usingStack === 'venom' && client) {
      const result = await client.getNumberProfile(number)
      return !!result
    }
    return false
  } catch {
    return false
  }
}

export function getLatestQr() {
  return latestQr
}

export function onWhatsAppEvent(ev: 'qr' | 'ready' | 'auth_failure' | 'message', cb: (...args: any[]) => void) {
  emitter.on(ev, cb)
  return () => {
    try { emitter.off(ev, cb) } catch {}
  }
}

export function getWhatsAppInitState() {
  return {
    ready,
    hasClient: !!(client || sock),
    initializing: isInitializing,
    qr: latestQr,
    qrAttempts,
    qrStopped: false,
    maxQrAttempts: 10
  }
}

export function getWhatsAppRuntimeStatus() {
  return {
    ready,
    hasClient: !!(client || sock),
    usingStack,
    consecutiveFailures: waRuntime.consecutiveFailures,
    stale: waRuntime.stale,
    lastReadyAt: waRuntime.lastReadyAt,
    reinitInFlight: !!waRuntime.reinitInFlight
  }
}

export async function forceLogout() {
  logger.info('🚪 Forçando logout...')
  
  if (sock) {
    try {
      // Tentar logout apenas se disponível
      if (typeof sock.logout === 'function') {
        try { await sock.logout() } catch {}
      }
      // Evitar fechar websocket se ainda está CONNECTING (evita "WebSocket was closed before the connection was established")
      const ws: any = (sock as any).ws || (sock as any).socket || undefined
      const OPEN = 1
      if (typeof (sock as any).end === 'function') {
        if (ws && typeof ws.readyState === 'number') {
          if (ws.readyState === OPEN) {
            try { await sock.end() } catch {}
          } else {
            // Skip hard close when not open; just drop references
          }
        } else {
          // If we can't detect state, try-catch the end() safely
          try { await sock.end() } catch {}
        }
      }
      // Best-effort: remover listeners para evitar vazamentos
      try { sock.ev?.removeAllListeners?.() } catch {}
      try { (sock as any).ws?.removeAllListeners?.() } catch {}
    } catch {}
    sock = null
  }
  if (client) {
    try { client.logout() } catch {}
    try { client.close() } catch {}
    client = null
  }
  
  ready = false
  isInitializing = false
  latestQr = null
  qrAttempts = 0
  initPromise = null
  
  // Clean auth directories
  const authDirs = [
    path.join(__dirname, '..', '..', '..', '.baileys_auth'),
    path.join(__dirname, '..', '..', '..', 'tmp', 'wa-venom')
  ]
  for (const dir of authDirs) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true })
        logger.info(`🧹 Removido: ${dir}`)
      }
    } catch (e: any) {
      logger.warn(`Falha ao remover ${dir}: ${e.message}`)
    }
  }
  
  broadcast('wa_status', { ready: false, hasClient: false, ts: Date.now(), loggedOut: true })
  logger.info('✅ Logout completo!')
}

export function getWhatsAppDebug() {
  return {
    ready,
    hasClient: !!(client || sock),
    initializing: isInitializing,
    qrAttempts,
    sessionName,
    usingStack,
    latestQr: latestQr ? {
      hasPng: !!latestQr.pngDataUrl,
      hasAscii: !!latestQr.ascii,
      hasUrlCode: !!latestQr.urlCode,
      ts: latestQr.ts
    } : null,
    timestamp: new Date().toISOString()
  }
}

// Compatibility exports
export function bindOutboundToWhatsApp() {}
export function emitOutboundDelivery() {}
export async function sendWhatsAppMedia(to: string, mediaPath: string, caption?: string) {
  if (!ready || !sock) {
    throw new Error('WA_NOT_CONNECTED')
  }

  try {
    // Normalizar JID para Baileys
    const targetJid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`
    console.log(`📸 Enviando mídia: ${mediaPath} para ${targetJid}`)
    
    // Verificar se o arquivo existe
    const fs = await import('fs')
    const path = await import('path')
    
    if (!fs.existsSync(mediaPath)) {
      throw new Error(`Arquivo não encontrado: ${mediaPath}`)
    }

    // Determinar tipo de mídia baseado na extensão
    const ext = path.extname(mediaPath).toLowerCase()
    let messageType: 'image' | 'video' | 'audio' | 'document' = 'document'
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      messageType = 'image'
    } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
      messageType = 'video'
    } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
      messageType = 'audio'
    }

    const messagePayload: any = {
      [messageType]: {
        url: mediaPath // Baileys pode usar path local diretamente
      }
    }

    if (caption && messageType === 'image') {
      messagePayload[messageType].caption = caption
    }

    console.log(`📤 Enviando ${messageType} via Baileys para ${targetJid}`)
    
    const result = await sock.sendMessage(targetJid, messagePayload)
    
    console.log(`✅ Mídia enviada com sucesso: ${result.key.id}`)
    return result

  } catch (error: any) {
    console.error('❌ Erro ao enviar mídia:', error)
    throw new Error(`Erro ao enviar mídia: ${error.message}`)
  }
}
export async function clearAllChats() {
  return { ok: false, error: 'Not implemented for Baileys/Venom yet' }
}
export async function getRecentChats() {
  return []
}
export function getWhatsAppState() {
  return getWhatsAppInitState()
}
