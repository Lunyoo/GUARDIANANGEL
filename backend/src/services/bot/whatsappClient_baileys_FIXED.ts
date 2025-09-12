// WHATSAPP CLIENT HÍBRIDO - Baileys (primário) + Venom (fallback)
import EventEmitter from 'events'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../../config/logger.js'
import QRCode from 'qrcode'
import { broadcast } from './sse.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Imports dinâmicos
let baileys: any = null
let venom: any = null

export const waInternalEmitter = new EventEmitter()

// Estado global
let client: any = null
let usingStack: 'baileys' | 'venom' | null = null
let latestQr: { pngDataUrl?: string; ascii?: string; urlCode?: string; ts: number } | null = null
let ready = false
let isInitializing = false
let initPromise: Promise<any> | null = null

// Log inicial do emitter
logger.info('🔥 [EMITTER] waInternalEmitter criado - listeners ativos:', waInternalEmitter.listenerCount('inbound-wa'))

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

// 🚀 FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
export async function initWhatsApp(): Promise<void> {
  logger.info('🔥 INICIANDO WHATSAPP HÍBRIDO - Baileys (primário) + Venom (fallback)')
  
  if (isInitializing && initPromise) {
    logger.info('⏳ Inicialização já em andamento...')
    return initPromise
  }

  isInitializing = true
  ready = false

  initPromise = (async () => {
    try {
      logger.info('🚀 Tentando Baileys primeiro...')
      await initBaileys()
      usingStack = 'baileys'
      logger.info('✅ Baileys inicializado')
      
      // 📱 SINCRONIZAR CHATS EXISTENTES após conexão
      setTimeout(() => {
        syncExistingChats().catch(e => {
          logger.error('❌ Erro na sincronização automática:', e)
        })
      }, 3000) // Aguarda 3 segundos para estabilizar
      
    } catch (e: any) {
      logger.error('❌ Baileys falhou:', e?.message)
      logger.info('🔄 Tentando fallback para Venom...')
      
      try {
        await initVenom()
        usingStack = 'venom'
        logger.info('✅ Venom inicializado (fallback)')
      } catch (venomError: any) {
        logger.error('❌ Venom também falhou:', venomError?.message)
        throw new Error('Ambos Baileys e Venom falharam')
      }
    } finally {
      isInitializing = false
    }
  })()

  return initPromise
}

// 🤖 FUNÇÃO BAILEYS (PRIMÁRIO)
async function initBaileys() {
  if (!baileys) {
    try {
      baileys = await import('@whiskeysockets/baileys')
      logger.info('✅ Baileys carregado com sucesso')
    } catch (e: any) {
      logger.error('❌ Erro ao carregar Baileys:', e?.message)
      throw new Error('Baileys não disponível: ' + e?.message)
    }
  }

  const authPath = path.join(__dirname, '..', '..', '..', '.baileys_auth')

  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true })
  }

  const { state, saveCreds } = await baileys.useMultiFileAuthState(authPath)

  client = baileys.default({
    auth: state,
    printQRInTerminal: false,
    browser: ['Nexus Bot', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false
  })

  logger.info('🔧 Configurando event listeners do Baileys...')

  // QR Code event
  client.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      logger.info('📱 QR Code recebido (Baileys)')
      try {
        const qrDataUrl = await QRCode.toDataURL(qr)
        latestQr = {
          pngDataUrl: qrDataUrl,
          ascii: qr,
          urlCode: qr,
          ts: Date.now()
        }
        logger.info('📱 QR (Baileys) emitido - escaneie agora!')
        broadcast('qr', { qr: qrDataUrl })
      } catch (e: any) {
        logger.error('❌ Erro ao gerar QR:', e?.message)
      }
    }

    if (connection === 'close') {
      logger.warn('🔌 Conexão Baileys fechada')
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== 401
      if (shouldReconnect) {
        logger.info('🔄 Tentando reconectar Baileys...')
        setTimeout(() => {
          if (!ready) {
            initBaileys().catch(e => logger.error('❌ Erro na reconexão:', e))
          }
        }, 5000)
      } else {
        logger.error('❌ Dispositivo desconectado - necessário novo QR')
        ready = false
        client = null
      }
    } else if (connection === 'open') {
      logger.info('✅ Baileys conectado com sucesso!')
      ready = true
      usingStack = 'baileys'
      waRuntime.lastReadyAt = Date.now()
      waRuntime.stale = false
      broadcast('whatsapp_ready', { ready: true, stack: 'baileys' })
    }
  })

  // Credenciais atualizadas
  client.ev.on('creds.update', saveCreds)

  // 🔥 Event listener para mensagens recebidas (Baileys)
  client.ev.on('messages.upsert', async (msgUpdate: any) => {
    logger.info('🔥 [BAILEYS] messages.upsert disparado:', {
      type: msgUpdate.type,
      messageCount: msgUpdate.messages?.length
    })

    if (msgUpdate.type !== 'notify') {
      logger.info('🔥 [BAILEYS] Ignorando upsert type:', msgUpdate.type)
      return
    }

    for (const message of msgUpdate.messages || []) {
      logger.info('🔥 [BAILEYS] Processando mensagem individual:', {
        messageId: message.key?.id,
        fromMe: message.key?.fromMe,
        remoteJid: message.key?.remoteJid
      })

      if (message.key?.fromMe) {
        logger.info('📤 [BAILEYS] Mensagem própria - ignorando')
        continue
      }

      const phone = message.key?.remoteJid?.replace('@s.whatsapp.net', '') || ''
      const content = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     '[Mídia não suportada]'

      logger.info('🔥 [BAILEYS] Dados extraídos da mensagem:', {
        phone,
        content: content.substring(0, 100),
        messageData: JSON.stringify(message, null, 2).substring(0, 500)
      })

      const messageData = {
        phone,
        content,
        timestamp: Date.now(),
        messageId: message.key?.id,
        stack: 'baileys'
      }

      logger.info('📤 [BAILEYS] Emitindo evento inbound-wa:', messageData)
      waInternalEmitter.emit('inbound-wa', messageData)
      logger.info('🔥 [BAILEYS] ✅ Evento inbound-wa emitido com sucesso')
    }
  })

  return client
}

// 📱 FUNÇÃO PARA SINCRONIZAR CHATS EXISTENTES
export async function syncExistingChats(): Promise<{ synced: number; error?: string }> {
  if (!client || usingStack !== 'baileys') {
    logger.warn('⚠️ Não é possível sincronizar - Baileys não está ativo')
    return { synced: 0, error: 'Baileys não está ativo' }
  }

  try {
    logger.info('📱 Iniciando sincronização de chats existentes...')
    
    // Buscar chats recentes usando a API correta do Baileys
    const chats = await client.getOrderedChats(20)
    logger.info(`📱 Encontrados ${chats?.length || 0} chats para sincronizar`)
    
    if (!chats || chats.length === 0) {
      logger.info('📱 Nenhum chat encontrado para sincronizar')
      return { synced: 0 }
    }

    let syncedCount = 0
    for (const chat of chats) {
      try {
        const jid = chat.id
        
        // Pular grupos e status
        if (jid.includes('@g.us') || jid.includes('status@broadcast')) {
          continue
        }

        const phone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '')
        if (!phone || phone.length < 8) continue

        // Buscar mensagens recentes do chat
        const messages = await client.fetchMessageHistory(jid, 10)
        
        if (messages && messages.length > 0) {
          logger.info(`📱 Sincronizando ${messages.length} mensagens do chat ${phone}`)
          
          for (const message of messages) {
            // Só processar mensagens não enviadas por nós
            if (!message.key?.fromMe) {
              const content = message.message?.conversation || 
                             message.message?.extendedTextMessage?.text || 
                             '[Mídia]'
              
              // Só sincronizar mensagens das últimas 24 horas
              const messageTime = message.messageTimestamp 
                ? new Date(Number(message.messageTimestamp) * 1000) 
                : new Date()
              
              const hoursAgo = (Date.now() - messageTime.getTime()) / (1000 * 60 * 60)
              if (hoursAgo > 24) continue
              
              // Emitir como mensagem inbound para ser processada
              const messageData = {
                phone,
                content,
                timestamp: messageTime.getTime(),
                messageId: message.key?.id,
                stack: 'baileys',
                fromSync: true // Flag para identificar que veio da sincronização
              }
              
              logger.info(`📱 Sincronizando mensagem: ${phone} -> "${content.substring(0, 50)}..."`)
              waInternalEmitter.emit('inbound-wa', messageData)
              
              // Pequeno delay para não sobrecarregar
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          }
          syncedCount++
        }
      } catch (chatError: any) {
        logger.error(`❌ Erro ao sincronizar chat individual:`, chatError?.message)
      }
    }
    
    logger.info(`✅ Sincronização concluída! ${syncedCount} chats processados`)
    return { synced: syncedCount }
  } catch (error: any) {
    logger.error('❌ Erro na sincronização de chats:', error?.message)
    return { synced: 0, error: error.message }
  }
}

// 🐍 FUNÇÃO VENOM (FALLBACK)
async function initVenom() {
  if (!venom) {
    try {
      venom = await import('venom-bot')
      logger.info('✅ Venom carregado com sucesso')
    } catch (e: any) {
      logger.error('❌ Erro ao carregar Venom:', e?.message)
      throw new Error('Venom não disponível: ' + e?.message)
    }
  }

  const sessionPath = path.join(__dirname, '..', '..', '..', 'tmp', 'wa-venom')

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true })
  }

  client = await venom.create({
    session: 'nexus-session',
    folderNameToken: sessionPath,
    headless: true,
    useChrome: true,
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    logQR: false,
    disableWelcome: true,
    updatesLog: false
  })

  logger.info('🔧 Configurando event listeners do Venom...')

  // QR Code event para Venom
  client.onStateChange((state: string) => {
    logger.info('🔄 Venom estado:', state)
    if (state === 'CONNECTED') {
      logger.info('✅ Venom conectado com sucesso!')
      ready = true
      usingStack = 'venom'
      waRuntime.lastReadyAt = Date.now()
      waRuntime.stale = false
      broadcast('whatsapp_ready', { ready: true, stack: 'venom' })
    }
  })

  // Event listener para mensagens recebidas (Venom)
  client.onMessage(async (message: any) => {
    logger.info('📤 [VENOM] Mensagem recebida:', {
      fromMe: message.fromMe,
      from: message.from,
      body: message.body?.substring(0, 100)
    })

    if (message.fromMe) {
      logger.info('📤 [VENOM] Mensagem própria - ignorando')
      return
    }

    const phone = message.from.replace('@c.us', '')
    const content = message.body || '[Mídia não suportada]'

    const messageData = {
      phone,
      content,
      timestamp: Date.now(),
      messageId: message.id,
      stack: 'venom'
    }

    logger.info('🔥 [VENOM] Emitindo evento inbound-wa:', messageData)
    waInternalEmitter.emit('inbound-wa', messageData)
    logger.info('🔥 [VENOM] ✅ Evento inbound-wa emitido com sucesso')
  })

  return client
}

// 📨 FUNÇÃO DE ENVIO DE MENSAGENS
export async function sendWhatsAppMessage(to: string, message: string) {
  if (!ready || !client) {
    throw new Error('WA_NOT_CONNECTED')
  }

  try {
    let result
    if (usingStack === 'baileys') {
      // Baileys format
      const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`
      result = await client.sendMessage(jid, { text: message })
    } else if (usingStack === 'venom') {
      // Venom format
      const chatId = to.includes('@') ? to : `${to.replace(/\D/g, '')}@c.us`
      result = await client.sendText(chatId, message)
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

// 🔄 FUNÇÃO DE REINICIALIZAÇÃO SEGURA
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

// 🔄 FUNÇÃO DE RESTART
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
    broadcast('qr', { qr: null })
    broadcast('whatsapp_ready', { ready: false, stack: null })
    
    if (forceCleanup) {
      // Clean auth directories
      const authDirs = [
        path.join(__dirname, '..', '..', '..', '.baileys_auth'),
        path.join(__dirname, '..', '..', '..', 'tmp', 'wa-venom')
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

// 🚪 FUNÇÃO DE LOGOUT FORÇADO
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
  
  broadcast('whatsapp_ready', { ready: false, stack: null })
  logger.info('✅ Logout completo!')
}

// 📊 FUNÇÕES DE STATUS E DEBUG
export function isWhatsAppReady() {
  return ready && !!client
}

export function getLatestQr() {
  return latestQr
}

export function getWhatsAppState() {
  return {
    ready,
    hasClient: !!client,
    initializing: isInitializing,
    qr: latestQr,
    usingStack,
    qrAttempts: 0,
    qrStopped: false,
    maxQrAttempts: 10
  }
}

export function getWhatsAppInitState() {
  return getWhatsAppState()
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

// 🎯 FUNÇÕES DE COMPATIBILIDADE E MÍDIA
export async function sendWhatsAppMedia(to: string, mediaPath: string, caption?: string) {
  if (!ready || !client) {
    throw new Error('WA_NOT_CONNECTED')
  }

  try {
    if (usingStack === 'venom') {
      const chatId = to.includes('@') ? to : `${to.replace(/\D/g, '')}@c.us`
      return await client.sendFile(chatId, mediaPath, 'file', caption)
    } else if (usingStack === 'baileys') {
      // Baileys media sending (simplified)
      const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`
      const media = fs.readFileSync(mediaPath)
      return await client.sendMessage(jid, { 
        image: media, 
        caption 
      })
    } else {
      throw new Error('No valid client stack for media')
    }
  } catch (error: any) {
    logger.error('❌ Erro ao enviar mídia:', error)
    throw new Error(`Erro ao enviar mídia: ${error.message}`)
  }
}

export async function isWhatsAppNumberRegistered(number: string): Promise<boolean> {
  if (!ready || !client) return false
  try {
    if (usingStack === 'venom') {
      const numberId = await client.getNumberProfile(number)
      return !!numberId
    }
    return false
  } catch {
    return false
  }
}

// Exports de compatibilidade
export function bindOutboundToWhatsApp() {}
export function emitOutboundDelivery() {}
export async function clearAllChats() { return { ok: false, error: 'Not implemented' } }
export async function getRecentChats() { return [] }
export function getVenomClient() { return client }
