// WHATSAPP CLIENT HÍBRIDO - whatsapp-web.js (primário) + Baileys (fallback)
import EventEmitter from 'events'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../../config/logger.js'
import QRCode from 'qrcode'
import { broadcast } from './sse.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// WhatsApp-Web.js imports
let Client: any = null
let LocalAuth: any = null
let MessageMedia: any = null

// Baileys imports (fallback)
let baileys: any = null

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

export const waInternalEmitter = new EventEmitter()

const emitter = new EventEmitter()
let client: any = null
let usingStack: 'wwjs' | 'baileys' | null = null
let latestQr: { pngDataUrl?: string; ascii?: string; urlCode?: string; ts: number } | null = null
let ready = false
let isInitializing = false
let initPromise: Promise<any> | null = null

// Runtime state
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

async function initWhatsAppWebJS() {
  if (!Client) {
    try {
      const wwjs = await import('whatsapp-web.js')
      Client = wwjs.Client
      LocalAuth = wwjs.LocalAuth
      MessageMedia = wwjs.MessageMedia
      logger.info('✅ whatsapp-web.js carregado com sucesso')
    } catch (e: any) {
      throw new Error('whatsapp-web.js não disponível: ' + e?.message)
    }
  }

  const sessionPath = path.join(__dirname, '..', '..', '..', '.wwebjs_auth')
  
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionPath
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  })

  // QR Code event
  client.on('qr', async (qr: string) => {
    logger.info('📱 QR Code recebido (WhatsApp-Web.js)')
    try {
      const qrOptions = {
        type: 'image/png' as const,
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256,
        errorCorrectionLevel: 'M' as const
      }
      
      const qrDataUrl = await QRCode.toDataURL(qr, qrOptions)
      latestQr = { 
        pngDataUrl: qrDataUrl,
        ascii: '',
        urlCode: qr,
        ts: Date.now()
      }
      emitter.emit('qr', latestQr)
      broadcast('wa_qr', { dataUrl: latestQr.pngDataUrl, ts: latestQr.ts })
      logger.info(`📱 QR (WhatsApp-Web.js) emitido - escaneie agora!`)
    } catch (e: any) {
      logger.error('Erro ao gerar QR WhatsApp-Web.js:', e.message)
    }
  })

  // Ready event
  client.on('ready', () => {
    logger.info('🎉 WhatsApp-Web.js CONECTADO! Sessão autenticada e pronta.')
    ready = true
    isInitializing = false
    latestQr = null
    waRuntime.lastReadyAt = Date.now()
    waRuntime.consecutiveFailures = 0
    waRuntime.stale = false
    
    broadcast('wa_qr', { dataUrl: null, ts: Date.now() })
    broadcast('wa_status', { ready: true, hasClient: true, connected: true, ts: Date.now() })
    emitter.emit('ready')
    logger.info('📡 WhatsApp READY - broadcasting connection status')
  })

  // Message event
  client.on('message', (message: any) => {
    if (message.fromMe) return
    
    try {
      const phone = message.from.replace(/@c\.us$/, '')
      let body = message.body || ''
      let mediaType = ''
      
      if (message.hasMedia) {
        if (message.type === 'image') {
          mediaType = 'image'
          body = message.caption || '[📷 Imagem]'
        } else if (message.type === 'video') {
          mediaType = 'video'
          body = message.caption || '[🎥 Vídeo]'
        } else if (message.type === 'audio') {
          mediaType = 'audio'
          body = '[🎵 Áudio]'
        } else if (message.type === 'document') {
          mediaType = 'document'
          body = `[📄 ${message.filename || 'Documento'}]`
        }
      }
      
      const msgData = {
        id: message.id._serialized || Math.random().toString(36).slice(2),
        phone: phone,
        body: body,
        direction: 'IN' as const,
        at: new Date(message.timestamp * 1000).toISOString(),
        source: 'wwjs',
        mediaType: mediaType || undefined
      }
      
      logger.info(`📩 Mensagem WhatsApp-Web.js recebida: ${msgData.phone} -> "${msgData.body}" ${mediaType ? `(${mediaType})` : ''}`)
      emitter.emit('message', message)
      waInternalEmitter.emit('inbound-wa', msgData)
    } catch (err: any) {
      logger.warn('Erro ao processar mensagem WhatsApp-Web.js:', err?.message)
    }
  })

  // Disconnected event
  client.on('disconnected', (reason: string) => {
    logger.warn('⚡ WhatsApp-Web.js desconectado:', reason)
    ready = false
    broadcast('wa_status', { ready: false, hasClient: !!client, reason, ts: Date.now() })
    
    // Try to reconnect after a delay
    setTimeout(() => {
      if (!ready && !isInitializing) {
        logger.info('🔄 Tentando reconectar WhatsApp-Web.js...')
        safeReinit('disconnected').catch(() => {})
      }
    }, 5000)
  })

  // Auth failure event
  client.on('auth_failure', (msg: string) => {
    logger.error('❌ Falha de autenticação WhatsApp-Web.js:', msg)
    ready = false
    broadcast('wa_status', { ready: false, hasClient: false, reason: 'auth_failure', ts: Date.now() })
  })

  await client.initialize()
  usingStack = 'wwjs'
  return client
}

async function initBaileysFallback() {
  if (!baileys) {
    try {
      baileys = await import('@whiskeysockets/baileys')
      logger.info('✅ Baileys carregado como fallback')
    } catch (e: any) {
      throw new Error('Baileys fallback não disponível: ' + e?.message)
    }
  }

  const authDir = path.join(__dirname, '..', '..', '..', '.baileys_auth')
  try { fs.mkdirSync(authDir, { recursive: true }) } catch {}

  const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = baileys
  const { version: waVersion } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState(authDir)

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: { level: 'silent' } as any,
    version: waVersion,
    browser: Browsers.macOS('Desktop'),
    markOnlineOnConnect: false,
    syncFullHistory: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update
    
    if (qr) {
      logger.info('📱 QR Code recebido (Baileys Fallback)')
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { type: 'image/png' as const })
        latestQr = { pngDataUrl: qrDataUrl, urlCode: qr, ts: Date.now() }
        emitter.emit('qr', latestQr)
        broadcast('wa_qr', { dataUrl: latestQr.pngDataUrl, ts: latestQr.ts })
      } catch (e: any) {
        logger.error('Erro ao gerar QR Baileys fallback:', e.message)
      }
    }

    if (connection === 'open') {
      logger.info('🎉 Baileys Fallback CONECTADO!')
      ready = true
      isInitializing = false
      latestQr = null
      broadcast('wa_status', { ready: true, hasClient: true, ts: Date.now() })
      emitter.emit('ready')
    } else if (connection === 'close') {
      ready = false
      broadcast('wa_status', { ready: false, hasClient: !!sock, ts: Date.now() })
    }
  })

  sock.ev.on('messages.upsert', ({ messages }: any) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      
      try {
        const phone = msg.key.remoteJid?.replace(/@s\.whatsapp\.net$/, '') || ''
        const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
        
        const msgData = {
          id: msg.key.id || Math.random().toString(36).slice(2),
          phone: phone,
          body: body,
          direction: 'IN' as const,
          at: new Date(msg.messageTimestamp * 1000).toISOString(),
          source: 'baileys-fallback'
        }
        
        logger.info(`📩 Mensagem Baileys Fallback recebida: ${msgData.phone} -> "${msgData.body}"`)
        emitter.emit('message', msg)
        waInternalEmitter.emit('inbound-wa', msgData)
      } catch (err: any) {
        logger.warn('Erro ao processar mensagem Baileys fallback:', err?.message)
      }
    }
  })

  usingStack = 'baileys'
  return sock
}

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

export async function initWhatsApp() {
  if (initPromise) {
    logger.info('⏳ Aguardando inicialização em andamento...')
    return initPromise
  }

  if (ready && client) {
    logger.info('✅ WhatsApp já está conectado!')
    return client
  }

  logger.info('🔥 INICIANDO WHATSAPP HÍBRIDO - WhatsApp-Web.js (primário) + Baileys (fallback)')
  
  initPromise = (async () => {
    try {
      isInitializing = true
      ready = false
      latestQr = null
      broadcast('wa_qr', { dataUrl: null, ts: Date.now() })
      
      // Cleanup previous client
      if (client) {
        try { 
          if (typeof client.destroy === 'function') await client.destroy()
          else if (typeof client.logout === 'function') await client.logout()
        } catch {}
        client = null
      }

      // Try WhatsApp-Web.js first (more stable for QR)
      try {
        logger.info('🚀 Tentando WhatsApp-Web.js primeiro...')
        client = await initWhatsAppWebJS()
        logger.info('✅ WhatsApp-Web.js inicializado')
        return client
      } catch (e: any) {
        logger.error('❌ WhatsApp-Web.js falhou:', e?.message)
        logger.info('🔄 Fallback para Baileys...')
        
        // Fallback to Baileys
        try {
          client = await initBaileysFallback()
          logger.info('✅ Baileys fallback inicializado')
          return client
        } catch (e2: any) {
          logger.error('❌ Baileys fallback também falhou:', e2?.message)
          throw new Error('Ambos WhatsApp-Web.js e Baileys falharam')
        }
      }
      
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
  
  try {
    // Cleanup current client
    if (client) {
      try { 
        if (typeof client.destroy === 'function') await client.destroy()
        else if (typeof client.logout === 'function') await client.logout()
      } catch {}
      client = null
    }
    
    ready = false
    isInitializing = false
    latestQr = null
    initPromise = null
    broadcast('wa_qr', { dataUrl: null, ts: Date.now() })
    broadcast('wa_status', { ready: false, hasClient: false, ts: Date.now(), restarting: true })
    
    if (forceCleanup) {
      // Clean auth directories
      const authDirs = [
        path.join(__dirname, '..', '..', '..', '.wwebjs_auth'),
        path.join(__dirname, '..', '..', '..', '.baileys_auth')
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
      
      waRuntime.stale = true
      waRuntime.consecutiveFailures = 0
      waRuntime.lastReadyAt = 0
      waRuntime.reinitInFlight = null
      
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
  if (!ready || !client) {
    throw new Error('WA_NOT_CONNECTED')
  }

  try {
    let result
    if (usingStack === 'wwjs') {
      // WhatsApp-Web.js format
      const chatId = to.includes('@') ? to : `${to.replace(/\D/g, '')}@c.us`
      result = await client.sendMessage(chatId, message)
    } else if (usingStack === 'baileys') {
      // Baileys format
      const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`
      result = await client.sendMessage(jid, { text: message })
    } else {
      throw new Error('No valid client stack')
    }
    
    waRuntime.consecutiveFailures = 0
    return { ok: true, id: result?.id || result?.key?.id || null }
  } catch (err: any) {
    waRuntime.consecutiveFailures += 1
    logger.error('Erro ao enviar mensagem:', err?.message)
    
    if (waRuntime.consecutiveFailures >= 3) {
      await safeReinit('send-fail')
    }
    
    throw new Error(err?.message || 'WA_SEND_FAILED')
  }
}

export function isWhatsAppReady() {
  return ready && !!client
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

export function getWhatsAppState() {
  return {
    ready,
    hasClient: !!client,
    initializing: isInitializing,
    qr: latestQr,
    qrAttempts: 0,
    qrStopped: false,
    maxQrAttempts: 10
  }
}

export function getWhatsAppRuntimeStatus() {
  return {
    ready,
    hasClient: !!client,
    usingStack,
    consecutiveFailures: waRuntime.consecutiveFailures,
    stale: waRuntime.stale,
    lastReadyAt: waRuntime.lastReadyAt,
    reinitInFlight: !!waRuntime.reinitInFlight
  }
}

export async function forceLogout() {
  logger.info('🚪 Forçando logout...')
  
  if (client) {
    try {
      if (typeof client.destroy === 'function') await client.destroy()
      else if (typeof client.logout === 'function') await client.logout()
    } catch {}
    client = null
  }
  
  ready = false
  isInitializing = false
  latestQr = null
  initPromise = null
  
  // Clean auth directories
  const authDirs = [
    path.join(__dirname, '..', '..', '..', '.wwebjs_auth'),
    path.join(__dirname, '..', '..', '..', '.baileys_auth')
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
    hasClient: !!client,
    initializing: isInitializing,
    sessionName: 'hybrid-session',
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
  if (!ready || !client) {
    throw new Error('WA_NOT_CONNECTED')
  }

  try {
    if (usingStack === 'wwjs') {
      const media = MessageMedia.fromFilePath(mediaPath)
      const chatId = to.includes('@') ? to : `${to.replace(/\D/g, '')}@c.us`
      return await client.sendMessage(chatId, media, { caption })
    } else {
      // Baileys fallback for media (simplified)
      throw new Error('Media sending via Baileys fallback not implemented yet')
    }
  } catch (error: any) {
    logger.error('❌ Erro ao enviar mídia:', error)
    throw new Error(`Erro ao enviar mídia: ${error.message}`)
  }
}
export async function clearAllChats() {
  return { ok: false, error: 'Not implemented' }
}
export async function getRecentChats() {
  return []
}
export async function isWhatsAppNumberRegistered(number: string): Promise<boolean> {
  if (!ready || !client) return false
  try {
    if (usingStack === 'wwjs') {
      const numberId = await client.getNumberId(number)
      return !!numberId
    }
    return false
  } catch {
    return false
  }
}
