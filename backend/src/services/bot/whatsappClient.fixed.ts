// Unified WhatsApp client (WhatsApp-Web.js) with stable API for the whole backend
// Clean implementation with only the functions that other modules import.

import { EventEmitter } from 'events'
import { logger } from '../../utils/logger.js'
// WhatsApp client facade now uses WhatsApp-Web.js as primary implementation for better stability.
import { waInternalEmitter as waEmitterWWJS,
  initWhatsApp as initWWJS,
  isWhatsAppReady as isReadyWWJS,
  sendWhatsAppMessage as sendMsgWWJS,
  sendWhatsAppMedia as sendMediaWWJS,
  getLatestQr as getLatestQrWWJS,
  getWhatsAppState as getStateWWJS,
  getWhatsAppRuntimeStatus as getRuntimeWWJS,
  restartWhatsApp as restartWWJS,
  forceLogout as logoutWWJS,
  isWhatsAppNumberRegistered as isRegisteredWWJS,
  getWhatsAppDebug as getDebugWWJS,
  getRecentChats as getRecentChatsWWJS,
  getRecentInboundTraces as getRecentInboundTracesWWJS
} from './whatsappClient_wwjs.js'

// Re-export a public inbound emitter (same instance from WhatsApp-Web.js)
export const waInternalEmitter = waEmitterWWJS

// Lightweight inbound trace for debugging
type InboundTrace = { at: string; phone: string; body: string; source?: string; id?: string }
const recentInbound: InboundTrace[] = []
function pushInboundTrace(t: InboundTrace) {
  recentInbound.push(t)
  if (recentInbound.length > 200) recentInbound.splice(0, recentInbound.length - 200)
}
try {
  waInternalEmitter.on('inbound-wa', (m: any) => {
    try { pushInboundTrace({ at: new Date().toISOString(), phone: m?.phone || '', body: m?.body || '', source: m?.source, id: m?.id }) } catch {}
  })
} catch {}

// Facade API mapping to WhatsApp-Web.js
export async function initWhatsApp() { return initWWJS() }
export function isWhatsAppReady() { return isReadyWWJS() }
export function getLatestQr() { return getLatestQrWWJS() as any }
export function getWhatsAppState() { return getStateWWJS() as any }
export function getWhatsAppRuntimeStatus() { return getRuntimeWWJS() as any }
export async function restartWhatsApp(forceCleanup = false) { return restartWWJS(forceCleanup) }
export async function forceLogout() { return logoutWWJS() }
export async function sendWhatsAppMessage(phone: string, content: string) { return sendMsgWWJS(phone, content) }
export async function sendWhatsAppMedia(phone: string, mediaPath: string, caption?: string) { return sendMediaWWJS(phone, mediaPath, caption) }
export async function isWhatsAppNumberRegistered(phone: string) { return isRegisteredWWJS(phone) }

export async function getRecentChats() {
  try {
    const rt = getRuntimeWWJS()
    if (!rt?.ready) return { ok: false, error: 'wa_not_ready', chats: [] }
    const chats = await getRecentChatsWWJS()
    return { ok: true, using: 'wwjs', count: chats.length, chats }
  } catch (e: any) {
    return { ok: false, error: e?.message, chats: [] }
  }
}

export async function getWhatsAppDebug() { return getDebugWWJS() }

// Compatibility functions for legacy Venom/Baileys calls
export async function scanUnreadNow() {
  try {
    const rt = getRuntimeWWJS()
    if (!rt?.ready) return { ok: false, processed: 0, ready: false, error: 'wa_not_ready' }
    
    logger.info('scanUnreadNow: WhatsApp-Web.js handles messages automatically via event listeners')
    return { ok: true, processed: 0, ready: true, note: 'WhatsApp-Web.js uses automatic message handling' }
  } catch (e: any) {
    return { ok: false, processed: 0, error: e?.message }
  }
}

export async function getChatMessages(phoneOrJid: string, limit: number = 10) {
  try {
    const rt = getRuntimeWWJS()
    if (!rt?.ready) return { ok: false, error: 'wa_not_ready' }
    
    logger.info('getChatMessages: WhatsApp-Web.js requires chat objects to fetch messages')
    return { 
      ok: false, 
      error: 'not_implemented_in_wwjs',
      note: 'WhatsApp-Web.js requires chat objects. Use getRecentChats() for chat list.'
    }
  } catch (e: any) {
    return { ok: false, error: e?.message }
  }
}

export function getRecentInboundTraces(max = 50) {
  const slice = recentInbound.slice(-Math.max(1, Math.min(200, max)))
  return { ok: true, count: slice.length, items: slice }
}

export async function forceBaileysFallback() {
  // We're using WhatsApp-Web.js now, not Baileys
  return { ok: false, usingStack: 'wwjs', note: 'Using WhatsApp-Web.js, not Baileys' }
}

// Additional compatibility exports for existing code
export async function getVenomClient() {
  try {
    const rt = getRuntimeWWJS()
    if (!rt?.ready) return null
    // WhatsApp-Web.js doesn't have a "venom client" concept
    return { note: 'Using WhatsApp-Web.js, not Venom', ready: rt.ready }
  } catch {
    return null
  }
}

export async function clearAllChats() {
  // WhatsApp-Web.js doesn't support clearing all chats
  logger.info('clearAllChats: Not supported in WhatsApp-Web.js')
  return { ok: false, reason: 'not_supported_in_wwjs' }
}

export async function forceVenomQr() {
  // Force QR regeneration by restarting
  logger.info('forceVenomQr: Restarting WhatsApp-Web.js to regenerate QR')
  try {
    await restartWhatsApp(false)
    return { ok: true, message: 'WhatsApp-Web.js restarted for QR regeneration' }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function forceFullSync() {
  // WhatsApp-Web.js handles sync automatically
  logger.info('forceFullSync: WhatsApp-Web.js manages sync automatically')
  return { ok: true, message: 'WhatsApp-Web.js handles sync automatically' }
}

export async function getActiveChats() {
  try {
    const result = await getRecentChats()
    return result.chats || []
  } catch (e: any) {
    logger.error('getActiveChats error:', e.message)
    return []
  }
}

export async function testMessageFetch(phone: string) {
  logger.info('testMessageFetch: This is a Venom-specific function, not applicable to WhatsApp-Web.js')
  return { 
    ok: false, 
    message: 'testMessageFetch is specific to Venom, WhatsApp-Web.js uses different message handling',
    alternative: 'Use getRecentChats() for chat information'
  }
}

export async function loadMessagesCorrectly(phone: string) {
  logger.info('loadMessagesCorrectly: Using WhatsApp-Web.js chat retrieval')
  try {
    const rt = getRuntimeWWJS()
    if (!rt?.ready) {
      return { ok: false, error: 'WhatsApp not ready' }
    }
    
    // WhatsApp-Web.js alternative approach
    const chatsResult = await getRecentChats()
    const chats = chatsResult.chats || []
    const targetChat = chats.find((chat: any) => chat.id.includes(phone))
    
    return {
      ok: true,
      chat: targetChat,
      method: 'whatsapp-web.js',
      note: 'WhatsApp-Web.js uses different message loading approach'
    }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function debugWhatsAppMethods() {
  const debug = await getWhatsAppDebug()
  return {
    clientType: 'WhatsApp-Web.js',
    version: '1.32.0',
    ...debug,
    note: 'This is WhatsApp-Web.js implementation, not Venom/Baileys'
  }
}

export async function deepStoreInvestigation() {
  return {
    message: 'deepStoreInvestigation is Baileys-specific',
    alternative: 'WhatsApp-Web.js manages store internally',
    client: 'whatsapp-web.js'
  }
}

export async function getWhatsAppInitState() {
  try {
    const state = getWhatsAppState()
    return {
      ready: state.ready,
      hasClient: state.hasClient,
      initState: state.ready ? 'ready' : 'initializing',
      usingStack: 'wwjs'
    }
  } catch {
    return null
  }
}

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
  getRecentChats,
  getWhatsAppDebug,
  forceBaileysFallback,
  waInternalEmitter,
  scanUnreadNow,
  getChatMessages,
  getRecentInboundTraces,
  getVenomClient,
  clearAllChats,
  forceVenomQr,
  forceFullSync,
  getActiveChats,
  testMessageFetch,
  loadMessagesCorrectly,
  debugWhatsAppMethods,
  deepStoreInvestigation,
  getWhatsAppInitState
}

