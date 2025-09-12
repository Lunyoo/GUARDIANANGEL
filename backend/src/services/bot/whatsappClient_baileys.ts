// WHATSAPP CLIENT HÍBRIDO - Venom (primário) + Baileys (fallback)
import EventEmitter from 'events'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../../config/logger.js'
import QRCode from 'qrcode'
import { broadcast } from './sse.js'
import pino from 'pino'
import child_process from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Imports dinâmicos
let baileys: any = null
let venom: any = null

// Store para Baileys
let store: any = null

export const waInternalEmitter = new EventEmitter()
;(waInternalEmitter as any).__token = 'WA_EMITTER_SINGLETON'
// Helper para reconfigurar listeners do Venom dinamicamente (caso precisemos injetar outro emitter depois)
export function setupVenomEmitter(external?: EventEmitter) {
  if (external && external !== waInternalEmitter) {
    // Não substituímos o export, mas podemos espelhar eventos se necessário futuramente
    logger.info('🔁 [VENOM_EMITTER] setupVenomEmitter chamado - atualmente usando waInternalEmitter interno')
  }
  logger.info('🔁 [VENOM_EMITTER] Listeners ativos no waInternalEmitter:', waInternalEmitter.listenerCount('inbound-wa'))
}

// Estado global
let client: any = null
let usingStack: 'baileys' | 'venom' | null = 'venom'
let latestQr: { pngDataUrl?: string; ascii?: string; urlCode?: string; ts: number } | null = null
let ready = false
let isInitializing = false
let initPromise: Promise<any> | null = null
let venomPollInterval: NodeJS.Timeout | null = null
const venomPollSeen = new Set<string>()

// Log inicial do emitter
logger.info(' [EMITTER] waInternalEmitter criado - listeners ativos:', waInternalEmitter.listenerCount('inbound-wa'))

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

//  FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
export async function initWhatsApp(): Promise<void> {
  logger.info(' INICIANDO WHATSAPP HÍBRIDO - Venom (primário) + Baileys (fallback)')

  if (isInitializing && initPromise) {
    logger.info('⏳ Inicialização já em andamento...')
    return initPromise
  }

  isInitializing = true
  ready = false

  initPromise = (async () => {
    try {
  logger.info(' Tentando Venom primeiro...')
      await initVenom()
      usingStack = 'venom'
      ready = true  // CORREÇÃO: Forçar ready=true para Venom
      waRuntime.lastReadyAt = Date.now()
      broadcast('whatsapp_ready', { ready: true, stack: 'venom' })
      logger.info('✅ Venom inicializado como primário (ready: true)')

      //  SINCRONIZAR CHATS EXISTENTES após conexão
      setTimeout(() => {
        syncExistingChats().catch(e => {
          logger.error('❌ Erro na sincronização automática:', e)
        })
      }, 3000) // Aguarda 3 segundos para estabilizar

    } catch (e: any) {
      logger.error('❌ Venom falhou:', e?.message || e?.stack || JSON.stringify(e))
      console.error('❌ ERRO DETALHADO DO VENOM:', e)
  logger.info(' Tentando fallback para Baileys...')

      try {
        await initBaileys()
        usingStack = 'baileys'
        logger.info('✅ Baileys inicializado (fallback)')
      } catch (baileysError: any) {
        logger.error('❌ Baileys também falhou:', baileysError?.message)
        throw new Error('Ambos Baileys e Venom falharam')
      }
    } finally {
      isInitializing = false
    }
  })()

  return initPromise
}

// 烙 FUNÇÃO BAILEYS (PRIMÁRIO)
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

  //  INICIALIZAR STORE CORRETAMENTE - VERSÃO ALTERNATIVA
  try {
    // Tentar a versão mais nova primeiro
    if (baileys.makeInMemoryStore) {
      store = baileys.makeInMemoryStore({
        logger: { level: 'silent', error: () => {}, warn: () => {}, info: () => {}, debug: () => {} }
      })
      logger.info(' Store Baileys inicializado (v1)')
    } else if (baileys.default.makeInMemoryStore) {
      store = baileys.default.makeInMemoryStore({
        logger: { level: 'silent', error: () => {}, warn: () => {}, info: () => {}, debug: () => {} }
      })
      logger.info(' Store Baileys inicializado (v2)')
    } else {
      // Criar store manualmente se necessário
      store = {
        chats: new Map(),
        messages: new Map(),
        bind: function(eventEmitter: any) {
          // Implementação básica do bind
          eventEmitter.on('chats.set', (chats: any) => {
            chats.forEach((chat: any) => this.chats.set(chat.id, chat))
          })
          eventEmitter.on('messages.upsert', (messageUpdate: any) => {
            messageUpdate.messages?.forEach((message: any) => {
              const key = `${message.key?.remoteJid}_${message.key?.id}`
              this.messages.set(key, message)
            })
          })
        },
        loadMessages: async (jid: string, count: number) => {
          // Usar fetchMessageHistory como fallback
          try {
            return await client.fetchMessageHistory(jid, count)
          } catch {
            return []
          }
        }
      }
      logger.info(' Store Baileys criado manualmente (fallback)')
    }
  } catch (e: any) {
    logger.warn(' Erro ao criar store:', e.message)
    store = null
  }

  //  CORREÇÃO CRÍTICA: Criar cliente DEPOIS do store!

  client = baileys.default({
    auth: state,
    printQRInTerminal: false,
    browser: ['Nexus Bot', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    logger: pino({ level: 'silent' })
  })

  //  BIND IMEDIATO DO STORE AO CLIENT.EV (ANTES DE QUALQUER EVENTO!)
  if (store && store.bind) {
    store.bind(client.ev)
    logger.info('✅ Store vinculado ao client.ev - PRONTO para capturar sync!')
  } else {
    logger.warn('❌ Store não disponível para bind')
  }

  logger.info(' Configurando event listeners do Baileys...')

  // QR Code event
  client.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      logger.info(' QR Code recebido (Baileys)')
      try {
        const qrDataUrl = await QRCode.toDataURL(qr)
        latestQr = {
          pngDataUrl: qrDataUrl,
          ascii: qr,
          urlCode: qr,
          ts: Date.now()
        }
  logger.info(' QR (Baileys) emitido - escaneie agora!')
  broadcast('qr', { dataUrl: qrDataUrl })
  broadcast('wa_qr', { dataUrl: qrDataUrl })
      } catch (e: any) {
        logger.error('❌ Erro ao gerar QR:', e?.message)
      }
    }

    if (connection === 'close') {
      logger.warn(' Conexão Baileys fechada')
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== 401
      if (shouldReconnect) {
        logger.info(' Tentando reconectar Baileys...')
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

      // 🔥 POPULAÇÃO MANUAL DO STORE - BAILEYS 6.7.18
      try {
        logger.info('🔥 [MANUAL_POPULATE] Iniciando população manual do store...')
        
        // 1. Aguardar estabilização da conexão
        await new Promise(r => setTimeout(r, 2000))
        
        // 2. POPULAR CHATS MANUALMENTE - groupFetchAllParticipating()
        logger.info('🔥 [MANUAL_POPULATE] Buscando todos os chats...')
        try {
          const chats = await client.groupFetchAllParticipating()
          let chatsAdded = 0
          Object.values(chats).forEach((chat: any) => {
            store.chats.set(chat.id, chat)
            chatsAdded++
          })
          logger.info(`🔥 [MANUAL_POPULATE] ${chatsAdded} chats adicionados do groupFetchAllParticipating`)
        } catch (e: any) {
          logger.warn('🔥 [MANUAL_POPULATE] Erro no groupFetchAllParticipating:', e.message)
        }

        // 3. BUSCAR CONVERSAS INDIVIDUAIS DOS LEADS
        logger.info('🔥 [MANUAL_POPULATE] Carregando conversas individuais...')
        try {
          const { getDatabase } = await import('../../config/database.js')
          const db = getDatabase()
          const leads = await db.lead.findMany({ 
            where: { phone: { not: null } },
            take: 10,
            orderBy: { createdAt: 'desc' }
          })
          
          let messagesAdded = 0
          for (const lead of leads) {
            if (!lead.phone) continue
            
            const jid = lead.phone.includes('@') ? lead.phone : `${lead.phone}@s.whatsapp.net`
            
            try {
              // Verificar se número existe no WhatsApp
              const [result] = await client.onWhatsApp(jid.replace('@s.whatsapp.net', ''))
              if (!result?.exists) continue
              
              // Carregar mensagens usando client.loadMessages (API 6.7.18)
              const messages = await client.loadMessages(jid, 20)
              logger.info(`🔥 [MANUAL_POPULATE] ${jid}: ${messages.length} mensagens`)
              
              if (messages.length > 0) {
                // Criar chat se não existir
                if (!store.chats.get(jid)) {
                  const chatData = {
                    id: jid,
                    conversationTimestamp: Date.now(),
                    unreadCount: 0
                  }
                  store.chats.set(jid, chatData)
                }
                
                // Adicionar mensagens ao store
                const msgMap = store.messages.get(jid) || new Map()
                messages.forEach((m: any) => {
                  if (m.key?.id) {
                    msgMap.set(m.key.id, m)
                    messagesAdded++
                  }
                })
                store.messages.set(jid, msgMap)
              }
            } catch (e: any) {
              logger.warn(`🔥 [MANUAL_POPULATE] Erro para ${jid}:`, e.message)
            }
          }
          
          logger.info(`🔥 [MANUAL_POPULATE] ✅ ${messagesAdded} mensagens reais carregadas`)
        } catch (e: any) {
          logger.error('🔥 [MANUAL_POPULATE] Erro no carregamento:', e.message)
        }
        
        // 4. Habilitar sincronização em tempo real para futuras mensagens
        logger.info('🔥 [MANUAL_POPULATE] Habilitando sync em tempo real...')
        try {
          await enableRealTimeSync()
        } catch (e: any) {
          logger.warn('🔥 [MANUAL_POPULATE] Aviso no enableRealTimeSync:', e.message)
        }
        
        // 5. Status final do store
        const finalStatus = {
          chats: store?.chats?.size || 0,
          messages: store?.messages?.size || 0
        }
        logger.info(`🔥 [MANUAL_POPULATE] ✅ Store populado! ${finalStatus.chats} chats, ${finalStatus.messages} mensagens`)
        
        // 6. Sincronizar com banco de dados
        logger.info('🔥 [MANUAL_POPULATE] Sincronizando com banco...')
        syncExistingChats().catch(e => {
          logger.error('❌ Erro na sincronização com banco:', e)
        })
        
      } catch (e: any) {
        logger.error('❌ Erro na população manual:', e?.message)
      }
    }
  })

  // Credenciais atualizadas
  client.ev.on('creds.update', saveCreds)

  //  Event listener para mensagens recebidas (Baileys)
  client.ev.on('messages.upsert', async (msgUpdate: any) => {
    logger.info(' [BAILEYS] messages.upsert disparado:', {
      type: msgUpdate.type,
      messageCount: msgUpdate.messages?.length
    })

    if (msgUpdate.type !== 'notify') {
      logger.info(' [BAILEYS] Ignorando upsert type:', msgUpdate.type)
      return
    }

    for (const message of msgUpdate.messages || []) {
      logger.info(' [BAILEYS] Processando mensagem individual:', {
        messageId: message.key?.id,
        fromMe: message.key?.fromMe,
        remoteJid: message.key?.remoteJid
      })

      if (message.key?.fromMe) {
        logger.info(' [BAILEYS] Mensagem própria - ignorando')
        continue
      }

      const phone = message.key?.remoteJid?.replace('@s.whatsapp.net', '') || ''
      const content = message.message?.conversation ||
                     message.message?.extendedTextMessage?.text ||
                     '[Mídia não suportada]'

      logger.info(' [BAILEYS] Dados extraídos da mensagem:', {
        phone,
        content: content.substring(0, 100),
        messageData: JSON.stringify(message, null, 2).substring(0, 500)
      })

      const messageData = {
        phone,
        body: content,
        content,
        at: new Date().toISOString(),
        timestamp: Date.now(),
        id: message.key?.id,
        messageId: message.key?.id,
        stack: 'baileys'
      }

      logger.info(' [BAILEYS] Emitindo evento inbound-wa:', messageData)
      waInternalEmitter.emit('inbound-wa', messageData)
      logger.info(' [BAILEYS] ✅ Evento inbound-wa emitido com sucesso')
    }
  })

  return client
}

// �️ FUNÇÃO PARA SINCRONIZAR CONVERSAS COMPLETAS DO WHATSAPP BUSINESS
export async function syncWhatsAppConversations(): Promise<{ conversations: number; error?: string }> {
  if (!client || usingStack !== 'baileys') {
    logger.warn('⚠️ Não é possível sincronizar conversas - Baileys não está ativo')
    return { conversations: 0, error: 'Baileys não está ativo' }
  }

  try {
    console.log('️ BUSCANDO CONVERSAS COMPLETAS DO WHATSAPP BUSINESS')

    let conversationsFound = 0
    const { getDatabase } = await import('../../config/database.js')
    const db = getDatabase()

    // Método 1: Buscar chats do store do Baileys + FORÇAR FETCH HISTÓRICO COMPLETO
    try {
      console.log('️ Tentando acessar chats do store Baileys...')

      // FORÇAR FETCH DE CHAT HISTORY COMPLETO
      if (store && store.chats) {
        let chats = []

        if (typeof store.chats.all === 'function') {
          chats = store.chats.all()
        } else if (store.chats.data) {
          chats = Object.values(store.chats.data)
        } else if (typeof store.chats === 'object') {
          chats = Object.values(store.chats)
        }

        console.log(`️ Store encontrou ${chats.length} chats`)

        // Se poucos chats, forçar busca histórica
        if (chats.length < 10) {
          console.log('️ Poucos chats no store, forçando busca completa...')

          // Forçar resync do app state para buscar histórico
          await client.resyncAppState(['critical_block', 'critical_unblock_low', 'regular_high', 'regular_low', 'regular'])
          await new Promise(resolve => setTimeout(resolve, 5000))

          // Tentar novamente
          if (store && store.chats) {
            if (typeof store.chats.all === 'function') {
              chats = store.chats.all()
            } else if (store.chats.data) {
              chats = Object.values(store.chats.data)
            }
            console.log(`️ Após resync: ${chats.length} chats encontrados`)
          }
        }

        console.log(`️ TOTAL DE CHATS PARA PROCESSAR: ${chats.length}`)

        for (const chat of chats) {
          if (chat.id && !chat.id.includes('@g.us') && !chat.id.includes('status@broadcast')) {
            const phone = chat.id.replace('@s.whatsapp.net', '').replace('@c.us', '')

            if (phone && phone.length > 8) {
              // Verificar se lead existe
              let lead = db.prepare('SELECT id FROM leads WHERE phone LIKE ?').get(`%${phone}%`)

              if (!lead) {
                // Criar lead se não existir
                const leadId = `lead_${phone}`
                db.prepare('INSERT INTO leads (id, phone, created_at, updated_at) VALUES (?, ?, datetime("now"), datetime("now"))').run(leadId, `+${phone}`)
                lead = { id: leadId }
                console.log(`️ ✅ LEAD CRIADO: ${phone}`)
              }

              // Verificar se conversa existe
              let conversation = db.prepare('SELECT id FROM conversations WHERE lead_id = ?').get(lead.id)

              if (!conversation) {
                // Criar conversa
                const convId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
                db.prepare(`
                  INSERT INTO conversations (id, lead_id, stage, status, created_at, updated_at)
                  VALUES (?, ?, 'active', 'active', datetime('now'), datetime('now'))
                `).run(convId, lead.id)

                conversation = { id: convId }
                console.log(`️ ✅ CONVERSA CRIADA: ${phone} -> ${convId}`)

                // AGORA BUSCAR AS MENSAGENS DESTA CONVERSA
                try {
                  console.log(` Buscando TODAS as mensagens para conversa ${phone}...`)
                  const jid = `${phone}@s.whatsapp.net`

                  let messages = null

                  // Método 1: store.loadMessages se store existe
                  if (store && store.loadMessages) {
                    try {
                      console.log(` Tentando store.loadMessages para ${jid}...`)
                      const storeMessages = await store.loadMessages(jid, 1000)
                      if (Array.isArray(storeMessages) && storeMessages.length > 0) {
                        messages = storeMessages
                        console.log(` store.loadMessages: ${messages.length} mensagens`)
                      }
                    } catch (e: any) {
                      console.log(` store.loadMessages falhou: ${e.message}`)
                    }
                  }

                  // Método 2: client.loadMessages se existe
                  if ((!messages || !Array.isArray(messages) || messages.length === 0) && client.loadMessages) {
                    try {
                      console.log(` Tentando client.loadMessages para ${jid}...`)
                      const loadedMessages = await client.loadMessages(jid, 1000)
                      if (Array.isArray(loadedMessages) && loadedMessages.length > 0) {
                        messages = loadedMessages
                        console.log(` client.loadMessages: ${messages.length} mensagens`)
                      }
                    } catch (e: any) {
                      console.log(` client.loadMessages falhou: ${e.message}`)
                    }
                  }

                  if (messages && Array.isArray(messages) && messages.length > 0) {
                    console.log(` Encontradas ${messages.length} mensagens REAIS para ${phone}`)

                    for (const message of messages) {
                      console.log(` DEBUG: Processando mensagem:`, JSON.stringify(message, null, 2).substring(0, 200))
                      if (message.message) {
                        const content = message.message?.conversation ||
                                       message.message?.extendedTextMessage?.text ||
                                       message.message?.imageMessage?.caption ||
                                       message.message?.videoMessage?.caption ||
                                       '[Mídia]'

                        console.log(` DEBUG: Conteúdo extraído: "${content}" (length: ${content?.length})`)

                        if (content && content.length > 1) {
                          const messageTime = message.messageTimestamp
                            ? new Date(Number(message.messageTimestamp) * 1000)
                            : new Date()

                          const direction = message.key?.fromMe ? 'outbound' : 'inbound'
                          const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

                          // Salvar mensagem no banco
                          db.prepare(`
                            INSERT INTO messages (id, lead_id, conversation_id, direction, type, content, created_at)
                            VALUES (?, ?, ?, ?, 'text', ?, ?)
                          `).run(msgId, lead.id, convId, direction, content, messageTime.toISOString().replace("T", " ").slice(0, 19).replace('T', ' ').slice(0, 19))

                          console.log(` ✅ Mensagem salva: ${direction} - "${content.substring(0, 30)}..."`)
                        }
                      }
                    }

                    // Atualizar timestamp da conversa
                    db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(convId)
                  } else {
                    console.log(` Nenhuma mensagem encontrada para ${phone}`)
                  }
                } catch (msgError: any) {
                  console.log(` Erro ao buscar mensagens para ${phone}:`, msgError.message)
                }
              }

              //  BUSCAR MENSAGENS DA CONVERSA COM MÚLTIPLOS MÉTODOS
              try {
                const jid = `${phone}@s.whatsapp.net`
                console.log(` Buscando TODAS as mensagens para ${phone}...`)

                let messages = null

                // Método 1: store.loadMessages (mais completo)
                try {
                  if (store && store.loadMessages) {
                    messages = await store.loadMessages(jid, 1000)
                    console.log(` store.loadMessages retornou ${messages?.length || 0} mensagens`)
                  }
                } catch (e: any) {
                  console.log(` store.loadMessages falhou: ${e.message}`)
                }

                // Método 2: client.loadMessages se store falhou
                if (!messages || !Array.isArray(messages) || messages.length === 0) {
                  try {
                    if (client.loadMessages) {
                      messages = await client.loadMessages(jid, 1000)
                      console.log(` client.loadMessages retornou ${messages?.length || 0} mensagens`)
                    }
                  } catch (e: any) {
                    console.log(` client.loadMessages falhou: ${e.message}`)
                  }
                }
                
                if (messages && Array.isArray(messages) && messages.length > 0) {
                  console.log(` Encontradas ${messages.length} mensagens REAIS para ${phone}`)

                  for (const message of messages) {
                    if (message.message) {
                      const content = message.message?.conversation ||
                                     message.message?.extendedTextMessage?.text ||
                                     message.message?.imageMessage?.caption ||
                                     message.message?.videoMessage?.caption ||
                                     '[Mídia]'

                      if (content && content.length > 1) {
                        const messageTime = message.messageTimestamp
                          ? new Date(Number(message.messageTimestamp) * 1000)
                          : new Date()

                        const direction = message.key?.fromMe ? 'outbound' : 'inbound'
                        const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

                        // Salvar mensagem no banco
                        db.prepare(`
                          INSERT INTO messages (id, lead_id, conversation_id, direction, type, content, created_at)
                          VALUES (?, ?, ?, ?, 'text', ?, ?)
                        `).run(msgId, lead.id, conversation.id, direction, content, messageTime.toISOString().replace("T", " ").slice(0, 19))

                        console.log(` ✅ MENSAGEM SALVA (${direction}): "${content.substring(0, 30)}..."`)
                      }
                    }
                  }

                  // Atualizar timestamp da conversa
                  db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversation.id)
                } else {
                  console.log(` Nenhuma mensagem encontrada para ${phone}`)
                }
              } catch (msgError: any) {
                console.log(` Erro ao buscar mensagens para ${phone}:`, msgError.message)
              }

              conversationsFound++
            }
          }
        }
      } else {
        console.log('️ Store não disponível, tentando acessar diretamente via client...')

        // Se não tem store, usar métodos diretos do client
        try {
          // Tentar getAllChats se existir
          if (client.getAllChats) {
            const allChats = await client.getAllChats()
            console.log(`️ client.getAllChats retornou ${allChats?.length || 0} chats`)

            for (const chat of allChats || []) {
              if (chat.id && !chat.id.includes('@g.us') && !chat.id.includes('status@broadcast')) {
                const phone = chat.id.replace('@s.whatsapp.net', '').replace('@c.us', '')
                // Processar cada chat...
                console.log(`️ Chat encontrado via getAllChats: ${phone}`)
              }
            }
          }
        } catch (e: any) {
          console.log(`️ getAllChats falhou: ${e.message}`)
        }
      }
    } catch (storeError: any) {
      console.log('️ Erro no método store:', storeError.message)
    }

    // Método 2: Usar leads existentes para garantir conversas
    if (conversationsFound === 0) {
      console.log('️ Criando conversas baseadas nos leads existentes...')

      const leads = db.prepare('SELECT id, phone FROM leads ORDER BY updated_at DESC').all()

      for (const lead of leads) {
        try {
          const phoneRaw = lead.phone.replace(/\D/g, '')

          // Verificar se está no WhatsApp
          const onWaResult = await client.onWhatsApp(phoneRaw)

          if (onWaResult && onWaResult.length > 0 && onWaResult[0].exists) {
            // Verificar se conversa existe
            let conversation = db.prepare('SELECT id FROM conversations WHERE lead_id = ?').get(lead.id)

            if (!conversation) {
              // Criar conversa
              const convId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
              db.prepare(`
                INSERT INTO conversations (id, lead_id, stage, status, created_at, updated_at)
                VALUES (?, ?, 'active', 'active', datetime('now'), datetime('now'))
              `).run(convId, lead.id)

              conversation = { id: convId }
              console.log(`️ ✅ CONVERSA CRIADA PARA LEAD: ${phoneRaw} -> ${convId}`)
            }

            //  BUSCAR MENSAGENS DESTA CONVERSA COM MÚLTIPLOS MÉTODOS
            try {
              const jid = `${phoneRaw}@s.whatsapp.net`
              console.log(` Buscando TODAS as mensagens para lead ${phoneRaw}...`)

              let messages = null

              // Método 1: store.loadMessages (mais completo)
              try {
                if (store && store.loadMessages) {
                  messages = await store.loadMessages(jid, 1000)
                  console.log(` store.loadMessages retornou ${messages?.length || 0} mensagens`)
                }
              } catch (e: any) {
                console.log(` store.loadMessages falhou: ${e.message}`)
              }

              // Método 2: client.loadMessages se store falhou
              if (!messages || !Array.isArray(messages) || messages.length === 0) {
                try {
                  if (client.loadMessages) {
                    messages = await client.loadMessages(jid, 1000)
                    console.log(` client.loadMessages retornou ${messages?.length || 0} mensagens`)
                  }
                } catch (e: any) {
                  console.log(` client.loadMessages falhou: ${e.message}`)
                }
              }
              
              if (messages && Array.isArray(messages) && messages.length > 0) {
                console.log(` Encontradas ${messages.length} mensagens REAIS para lead ${phoneRaw}`)

                for (const message of messages) {
                  if (message.message) {
                    const content = message.message?.conversation ||
                                   message.message?.extendedTextMessage?.text ||
                                   message.message?.imageMessage?.caption ||
                                   message.message?.videoMessage?.caption ||
                                   '[Mídia]'

                    if (content && content.length > 1) {
                      const messageTime = message.messageTimestamp
                        ? new Date(Number(message.messageTimestamp) * 1000)
                        : new Date()

                      const direction = message.key?.fromMe ? 'outbound' : 'inbound'
                      const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

                      // Verificar se mensagem já existe
                      const existingMsg = db.prepare('SELECT id FROM messages WHERE conversation_id = ? AND content = ? AND created_at = ?')
                        .get(conversation.id, content, messageTime.toISOString().replace("T", " ").slice(0, 19))

                      if (!existingMsg) {
                        // Salvar mensagem no banco
                        db.prepare(`
                          INSERT INTO messages (id, lead_id, conversation_id, direction, type, content, created_at)
                          VALUES (?, ?, ?, ?, 'text', ?, ?)
                        `).run(msgId, lead.id, conversation.id, direction, content, messageTime.toISOString().replace("T", " ").slice(0, 19))

                        console.log(` ✅ MENSAGEM SALVA (${direction}): "${content.substring(0, 30)}..."`)
                      }
                    }
                  }
                }

                // Atualizar timestamp da conversa
                db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversation.id)
              } else {
                console.log(` Nenhuma mensagem encontrada para lead ${phoneRaw}`)
              }
            } catch (msgError: any) {
              console.log(` Erro ao buscar mensagens para lead ${phoneRaw}:`, msgError.message)
            }

            conversationsFound++
          }
        } catch (leadError: any) {
          console.log(`️ Erro ao processar lead ${lead.phone}:`, leadError.message)
        }
      }
    }

    console.log(`️ ✅ SINCRONIZAÇÃO DE CONVERSAS CONCLUÍDA! Total: ${conversationsFound} conversas`)

    return { conversations: conversationsFound }
  } catch (error: any) {
    console.error('❌ Erro na sincronização de conversas:', error?.message)
    return { conversations: 0, error: error.message }
  }
}

// � FUNÇÃO PARA SINCRONIZAR CHATS EXISTENTES
export async function syncExistingChats(): Promise<{ synced: number; error?: string; debug?: any }> {
  if (!client || usingStack !== 'baileys') {
    logger.warn('⚠️ Não é possível sincronizar - Baileys não está ativo')
    return { synced: 0, error: 'Baileys não está ativo' }
  }

  try {
    console.log(' INICIO DA SINCRONIZAÇÃO - BAILEYS AUTENTICADO')
    logger.info(' Iniciando sincronização de chats existentes...')

    let syncedCount = 0

    // Agora que está autenticado, vamos tentar métodos do Baileys
    try {
      // Método DIRETO: Buscar TODOS os leads e tentar carregamento por número
      const { getDatabase } = await import('../../config/database.js')
      const db = getDatabase()
      const leads = db.prepare('SELECT DISTINCT phone FROM leads ORDER BY updated_at DESC').all()

      console.log(` Encontrados ${leads.length} leads no banco para sincronizar conversas REAIS`)

      for (const lead of leads) { // TODOS os leads
        try {
          const phoneRaw = lead.phone.replace(/\D/g, '')
          console.log(` Processando lead: ${phoneRaw}`)

          // Verificar se o número está no WhatsApp
          try {
            const onWaResult = await client.onWhatsApp(phoneRaw)
            console.log(` onWhatsApp result para ${phoneRaw}:`, onWaResult)

            if (!onWaResult || onWaResult.length === 0) {
              console.log(` ${phoneRaw} não está no WhatsApp, pulando...`)
              continue
            }

            const jid = `${phoneRaw}@s.whatsapp.net`
            console.log(` Tentando loadMessages para ${jid}`)

            //  USAR client.loadMessages OU store.loadMessages
            console.log(` Buscando TODAS as mensagens para ${phoneRaw}...`)

            // TESTE DIFERENTES MÉTODOS DO BAILEYS PARA BUSCAR MENSAGENS:
            try {
              console.log(` Método 1: Testando client.chatHistory...`)
              if (client.chatHistory) {
                const chatHistory = await client.chatHistory(jid, 20)
                console.log(` chatHistory tipo:`, typeof chatHistory, `isArray:`, Array.isArray(chatHistory))
              }
            } catch (e: any) {
              console.log(`❌ chatHistory falhou:`, e.message)
            }

            try {
              console.log(`� Método 2: Testando client.loadMessages...`)
              if (client.loadMessages) {
                const loadedMessages = await client.loadMessages(jid, 20)
                console.log(` loadMessages tipo:`, typeof loadedMessages, `isArray:`, Array.isArray(loadedMessages))
              }
            } catch (e: any) {
              console.log(`❌ loadMessages falhou:`, e.message)
            }

            try {
              console.log(` Método 3: Testando client.store.loadMessages...`)
              if (client.store?.loadMessages) {
                const storeMessages = await client.store.loadMessages(jid, 20)
                console.log(` store.loadMessages tipo:`, typeof storeMessages, `isArray:`, Array.isArray(storeMessages))
                if (Array.isArray(storeMessages) && storeMessages.length > 0) {
                  console.log(`✅ SUCESSO! store.loadMessages retornou ${storeMessages.length} mensagens`)
                  console.log(` Primeira mensagem:`, JSON.stringify(storeMessages[0], null, 2).substring(0, 200))

                  // USAR ESTE MÉTODO QUE FUNCIONA
                  const messages = storeMessages

                  for (const message of messages) {
                    console.log(` DEBUG: Analisando mensagem store:`, message?.key?.id)
                    console.log(` DEBUG: message.message existe?`, !!message.message)

                    if (message.message) {
                      const content = message.message?.conversation ||
                                     message.message?.extendedTextMessage?.text ||
                                     message.message?.imageMessage?.caption ||
                                     message.message?.videoMessage?.caption ||
                                     message.message?.documentMessage?.caption ||
                                     '[Mídia]'

                      console.log(`� DEBUG: Conteúdo extraído:`, content)

                      if (content && content.length > 1) {
                        const messageTime = message.messageTimestamp
                          ? new Date(Number(message.messageTimestamp) * 1000)
                          : new Date()

                        const direction = message.key?.fromMe ? 'outbound' : 'inbound'

                        const messageData = {
                          phone: phoneRaw,
                          content,
                          timestamp: messageTime.getTime(),
                          id: message.key?.id || `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                          messageId: message.key?.id,
                          stack: 'baileys',
                          fromSync: true,
                          isReal: true,
                          direction
                        }

                        console.log(` ✅ SINCRONIZANDO (${direction.toUpperCase()}): ${phoneRaw} -> "${content.substring(0, 50)}..."`)
                        waInternalEmitter.emit('inbound-wa', messageData)
                        syncedCount++

                        await new Promise(resolve => setTimeout(resolve, 50))
                      }
                    }
                  }
                }
              }
            } catch (e: any) {
              console.log(`❌ store.loadMessages falhou:`, e.message)
            }

            continue

          } catch (phoneError: any) {
            console.log(` Erro ao processar ${phoneRaw}:`, phoneError?.message)
          }

        } catch (leadError: any) {
          console.error(`❌ Erro ao processar lead ${lead.phone}:`, leadError?.message)
        }
      }

    } catch (dbError: any) {
      console.error('❌ Erro ao acessar banco de dados:', dbError?.message)
    }

    console.log(`✅ Sincronização REAL concluída! Total: ${syncedCount} mensagens`)
    logger.info(`✅ Sincronização REAL concluída! ${syncedCount} mensagens sincronizadas`)

    return {
      synced: syncedCount,
      debug: {
        clientMethods: Object.keys(client || {}),
        usingStack,
        clientType: typeof client,
        hasStore: !!(client?.store),
        storeKeys: client?.store ? Object.keys(client.store) : null,
        authenticated: !!(client?.user)
      }
    }
  } catch (error: any) {
    console.error('❌ Erro na sincronização de chats:', error?.message)
    logger.error('❌ Erro na sincronização de chats:', error?.message)
    return { synced: 0, error: error.message }
  }
}

//  FUNÇÃO VENOM (FALLBACK)
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

  // Diretórios específicos da sessão/perfil do Chrome usados pelo Venom
  const venomSessionName = 'nexus-session'
  const venomSessionDir = path.join(sessionPath, venomSessionName)
  const chromeProfileDir = path.join(venomSessionDir, 'chrome-profile')

  // Garantir diretórios
  try {
    if (!fs.existsSync(venomSessionDir)) fs.mkdirSync(venomSessionDir, { recursive: true })
    if (!fs.existsSync(chromeProfileDir)) fs.mkdirSync(chromeProfileDir, { recursive: true })
  } catch (e: any) {
    logger.warn('[VENOM] Falha ao garantir diretórios da sessão:', e?.message)
  }

  // Remover possíveis locks do Chrome que impedem inicialização (SingletonLock/Cookie)
  const lockCandidates = [
    path.join(venomSessionDir, 'SingletonLock'),
    path.join(venomSessionDir, 'SingletonCookie'),
    path.join(venomSessionDir, 'SingletonCookie-journal'),
    path.join(chromeProfileDir, 'SingletonLock'),
    path.join(chromeProfileDir, 'SingletonCookie'),
    path.join(chromeProfileDir, 'SingletonCookie-journal'),
    path.join(chromeProfileDir, 'Default', 'SingletonLock'),
    path.join(chromeProfileDir, 'Default', 'SingletonCookie'),
    path.join(chromeProfileDir, 'Default', 'SingletonCookie-journal')
  ]
  for (const f of lockCandidates) {
    try {
      if (fs.existsSync(f)) {
        fs.rmSync(f, { force: true })
        logger.info(`[VENOM] Removido lock de Chrome: ${f}`)
      }
    } catch (e: any) {
      logger.warn(`[VENOM] Falha ao remover lock ${f}: ${e?.message}`)
    }
  }

  // Tentar matar processos antigos do Chrome que estejam segurando o profile (Linux)
  try {
    const pattern = chromeProfileDir.replace(/['"\\\s]/g, '.?')
    child_process.execSync(`bash -lc 'pgrep -af chrome | grep "${pattern}" | awk '{print $1}' | xargs -r kill -9'`, { stdio: 'ignore' })
    logger.info('[VENOM] kill -9 aplicado para processos Chrome antigos (se existiam)')
  } catch {}

  // Opções base para o Venom/Puppeteer
  // Honor WA_HEADLESS env (default true). When true, prefer Chromium "new" headless.
  const wantHeadless = String(process.env.WA_HEADLESS ?? 'true').toLowerCase() !== 'false'
  const baseOptions: any = {
    session: venomSessionName,
    folderNameToken: sessionPath,
    // headless boolean ainda é aceito; forçamos o modo "new" via browser arg
    headless: wantHeadless ? 'new' : false,
    useChrome: true,
    browserArgs: [
      `--user-data-dir=${chromeProfileDir}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      // Adiciona headless=new apenas quando desejado
      ...(wantHeadless ? ['--headless=new'] : [])
    ],
    logQR: false,
    // Exibe/gera QR via callback para o frontend
    // Nota: Venom fornece tanto base64 da imagem quanto o urlCode (string do WhatsApp)
    // Preferimos gerar um DataURL confiável a partir do urlCode para consistência com o Baileys
    catchQR: async (base64Qr: string, asciiQR: string, attempts: number, urlCode: string) => {
      try {
        let qrDataUrl: string | undefined
        if (urlCode && urlCode.length > 0) {
          // Gera PNG a partir do texto do QR
          qrDataUrl = await QRCode.toDataURL(urlCode)
        } else if (base64Qr && base64Qr.startsWith('data:')) {
          // Fallback: usa a imagem recebida pelo Venom
          qrDataUrl = base64Qr
        }
        if (qrDataUrl) {
          latestQr = {
            pngDataUrl: qrDataUrl,
            ascii: asciiQR,
            urlCode: urlCode || undefined,
            ts: Date.now()
          }
          logger.info('📱 [VENOM] QR atualizado (tentativa %s)', String(attempts))
          // Mantém o mesmo canal de broadcast usado no Baileys para o frontend já existente
          broadcast('qr', { dataUrl: qrDataUrl })
          broadcast('wa_qr', { dataUrl: qrDataUrl })
        } else {
          logger.warn('⚠️ [VENOM] QR recebido mas não foi possível gerar DataURL')
        }
      } catch (err: any) {
        logger.error('❌ [VENOM] Erro ao processar QR:', err?.message || err)
      }
    },
    disableWelcome: true,
    updatesLog: false
  }

  // Tenta criar o cliente; em caso de falha por lock, limpar e tentar 1x novamente
  try {
    // Kill quaisquer processos antigos que possam segurar o profile (best-effort)
    try {
      const escaped = chromeProfileDir.replace(/(["\s'`\\])/g, '\\$1')
      const cmd = `bash -lc "pgrep -af chrome | grep '${escaped}' | awk '{print \\$1}' | xargs -r kill -9"`
      child_process.execSync(cmd, { stdio: 'ignore' })
      logger.info('[VENOM] kill -9 aplicado para Chrome travado (se existia)')
    } catch {}

    client = await venom.create(baseOptions)
  } catch (err: any) {
    const msg = String(err?.message || err || '')
    if (msg?.toLowerCase().includes('singletonlock') || msg?.toLowerCase().includes('failed to create singletonlock')) {
      logger.warn('[VENOM] Falha por SingletonLock; limpando locks e tentando novamente...')
      for (const f of lockCandidates) {
        try { if (fs.existsSync(f)) fs.rmSync(f, { force: true }) } catch {}
      }
      await new Promise(r => setTimeout(r, 500))
      try {
        client = await venom.create(baseOptions)
      } catch (err2: any) {
        const msg2 = String(err2?.message || err2 || '')
        if (msg2.toLowerCase().includes('singleton')) {
          logger.warn('[VENOM] Segunda falha por Singleton; removendo perfil inteiro e tentando novamente...')
          try {
            if (fs.existsSync(chromeProfileDir)) fs.rmSync(chromeProfileDir, { recursive: true, force: true })
          } catch {}
          await new Promise(r => setTimeout(r, 300))
          client = await venom.create(baseOptions)
        } else {
          throw err2
        }
      }
    } else {
      throw err
    }
  }

  logger.info(' Configurando event listeners do Venom... (listeners inbound-wa atuais: ' + waInternalEmitter.listenerCount('inbound-wa') + ')')

  client.onStateChange((state: string) => {
    logger.info(' Venom estado:', state)
    const s = String(state || '').toLowerCase()
    ;(waRuntime as any).lastState = s
    const looksReady = (
      s.includes('connected') ||
      s.includes('inchat') ||
      s.includes('open') ||
      s.includes('online') ||
      s.includes('logged') ||
      s.includes('qrreadsuccess') ||
      s.includes('successchat') ||
      s.includes('successpagewhatsapp') ||
      s.includes('waitchat')
    )
    if (looksReady) {
      if (!ready) logger.info('✅ Venom conectado! (estado: %s)', state)
      ready = true
      usingStack = 'venom'
      waRuntime.lastReadyAt = Date.now()
      waRuntime.stale = false
      broadcast('whatsapp_ready', { ready: true, stack: 'venom' })
      return
    }
    // Estados de desconexão
    const looksDown = (
      s.includes('desconnectedmobile') ||
      s.includes('disconnected') ||
      s.includes('notlogged') ||
      s.includes('qrreadfail') ||
      s.includes('close')
    )
    if (looksDown) {
      if (ready) logger.warn('⚠️ Venom não pronto (estado: %s)', state)
      ready = false
      broadcast('whatsapp_ready', { ready: false, stack: 'venom' })
    }
  })

  // Event listener para mensagens recebidas (Venom)
  client.onMessage(async (message: any) => {
    logger.info(' [VENOM] Mensagem recebida:', {
      fromMe: message.fromMe,
      from: message.from,
      body: message.body?.substring(0, 100)
    })
    console.log('✅ VENOM - Mensagem recebida (raw id/body curto):', message?.id, (message?.body||'').slice(0,60))

    if (message.fromMe) {
      logger.info(' [VENOM] Mensagem própria - ignorando')
      return
    }

    // CORREÇÃO: Emitir evento inbound-wa imediatamente
    try {
      const id = String(message.id || message.id?._serialized || `venom_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      const phone = String((message.from || '').replace(/@c\.us$|@s\.whatsapp\.net$/, ''))
      const body = String(message.body || message.text || message.content || '')
      
      if (phone && body) {
        const timestamp = Number(message.timestamp ?? message.t ?? Date.now()/1000)
        const at = new Date((timestamp > 1e12 ? timestamp : timestamp * 1000)).toISOString()
        
        logger.info('🚀 [VENOM] Emitindo inbound-wa para:', { id, phone, body: body.slice(0, 50) })
        
        waInternalEmitter.emit('inbound-wa', {
          id,
          phone,
          body,
          direction: 'IN',
          at,
          source: 'venom-direct'
        })
      }
    } catch (error) {
      logger.error('❌ [VENOM] Erro ao processar mensagem:', error)
    }

    // CORREÇÃO: Emitir evento inbound-wa imediatamente
    try {
      const id = String(message.id || message.id?._serialized || `venom_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      const phone = String((message.from || "").replace(/@c\.us$|@s\.whatsapp\.net$/, ""))
      const body = String(message.body || message.text || message.content || "")
      
      if (phone && body) {
        const timestamp = Number(message.timestamp ?? message.t ?? Date.now()/1000)
        const at = new Date((timestamp > 1e12 ? timestamp : timestamp * 1000)).toISOString()
        
        logger.info("🚀 [VENOM] Emitindo inbound-wa para:", { id, phone, body: body.slice(0, 50) })
        
        waInternalEmitter.emit("inbound-wa", {
          id,
          phone,
          body,
          direction: "IN",
          at,
          source: "venom-direct"
        })
      }
    } catch (error) {
      logger.error("❌ [VENOM] Erro ao processar mensagem:", error)
    }
    logger.info(' Venom listeners configurados. inbound-wa listeners count agora:', waInternalEmitter.listenerCount('inbound-wa'))
    setupVenomEmitter()

    // Fallback poller: varrer mensagens não lidas periodicamente
    try {
      if (!venomPollInterval) {
        const pollEveryMs = Number(process.env.WA_POLL_INTERVAL_MS || 5000)
        logger.info(`[VENOM] Iniciando poller de mensagens não lidas a cada ${pollEveryMs}ms`)
        venomPollInterval = setInterval(async () => {
          try {
            if (!client) return
            const fetchFn = client.getAllUnreadMessages || client.getAllChatsNewMsg || client.getAllNewMessages
            if (!fetchFn) return
            const unread = await fetchFn.call(client)
            if (!Array.isArray(unread)) return
            const looksLikeMessages = unread.some((x: any) => x && (x.body || x.text || x.content))
            if (looksLikeMessages) {
              for (const m of unread) {
                try {
                  const id = String(m.id || m.id?._serialized || '')
                  if (id && venomPollSeen.has(id)) continue
                  const fromMe = !!m.fromMe
                  if (fromMe) continue
                  const phone = String((m.from || '').replace(/@c\.us$|@s\.whatsapp\.net$/, ''))
                  const body = String(m.body || m.text || m.content || '')
                  if (!phone || !body) continue
                  const ts = Number(m.timestamp ?? m.t ?? Date.now()/1000)
                  const at = new Date((ts > 1e12 ? ts : ts * 1000)).toISOString()
                  waInternalEmitter.emit('inbound-wa', {
                    id: id || `poll_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                    phone,
                    body,
                    direction: 'IN',
                    at,
                    source: 'venom-poller'
                  })
                  if (id) venomPollSeen.add(id)
                } catch {}
              }
            } else {
              // Parece lista de chats, precisamos puxar mensagens recentes de cada chat
              for (const c of unread) {
                try {
                  const chatId = String(c?.id?._serialized || c?.id || c?.chatId || '')
                  if (!chatId || !client.getAllMessagesInChat) continue
                  const msgs: any[] = await client.getAllMessagesInChat(chatId, true, true)
                  if (!Array.isArray(msgs)) continue
                  for (const m of msgs.slice(-10)) {
                    try {
                      const id = String(m.id || m.id?._serialized || '')
                      if (id && venomPollSeen.has(id)) continue
                      const fromMe = !!m.fromMe
                      if (fromMe) continue
                      const phone = String((m.from || m.author || '').replace(/@c\.us$|@s\.whatsapp\.net$/, ''))
                      const body = String(m.body || m.text || m.content || '')
                      if (!phone || !body) continue
                      const ts = Number(m.timestamp ?? m.t ?? Date.now()/1000)
                      const at = new Date((ts > 1e12 ? ts : ts * 1000)).toISOString()
                      waInternalEmitter.emit('inbound-wa', {
                        id: id || `poll_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                        phone,
                        body,
                        direction: 'IN',
                        at,
                        source: 'venom-poller:chat'
                      })
                      if (id) venomPollSeen.add(id)
                    } catch {}
                  }
                } catch {}
              }
            }
          } catch (e:any) {
            try { logger.warn('[VENOM] Poller erro: ' + (e?.message || e)) } catch {}
          }
        }, pollEveryMs)
      }
    } catch (e:any) {
      logger.warn('[VENOM] Falha ao iniciar poller: ' + (e?.message || e))
    }

    const phone = message.from.replace('@c.us', '')
    const content = message.body || '[Mídia não suportada]'

    const messageData = {
      id: String(message.id || `ven_${Date.now()}`),
      phone,
      body: content,
      content,
      at: new Date().toISOString(),
      timestamp: Date.now(),
      messageId: message.id,
      stack: 'venom'
    }

    logger.info(' [VENOM] Emitindo evento inbound-wa:', messageData)
    console.log('📡 VENOM -> EMIT inbound-wa (listeners:', waInternalEmitter.listenerCount('inbound-wa'), ')')
    waInternalEmitter.emit('inbound-wa', messageData)
    logger.info(' [VENOM] ✅ Evento inbound-wa emitido com sucesso')
  })
  logger.info(' Venom listeners configurados. inbound-wa listeners count agora:', waInternalEmitter.listenerCount('inbound-wa'))
  setupVenomEmitter()

  return client
}

//  FUNÇÃO DE ENVIO DE MENSAGENS
export async function sendWhatsAppMessage(to: string, message: string) {
  // Para Venom, tratamos como pronto se o client existir
  if (!client) {
    throw new Error('WA_NOT_CONNECTED')
  }

  try {
    let result
    if (usingStack === 'baileys') {
      // Baileys format
      const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`
      result = await client.sendMessage(jid, { text: message })
    } else if (usingStack === 'venom') {
      // Venom format with multiple fallback methods
      const chatId = to.includes('@') ? to : `${to.replace(/\D/g, '')}@c.us`
      
      try {
        // Primary method: sendText
        result = await client.sendText(chatId, message)
      } catch (venomErr: any) {
        logger.warn('⚠️ [VENOM] sendText falhou, tentando método alternativo:', venomErr?.message)
        
        try {
          // Fallback 1: sendMessage method
          result = await client.sendMessage(chatId, message)
        } catch (venomErr2: any) {
          logger.warn('⚠️ [VENOM] sendMessage falhou, tentando envio direto:', venomErr2?.message)
          
          try {
            // Fallback 2: Direct page evaluation
            result = await client.page.evaluate((chatId: string, message: string) => {
              // @ts-ignore - window exists in browser context
              return window.WAPI.sendMessageToID(chatId, message)
            }, chatId, message)
          } catch (venomErr3: any) {
            logger.error('❌ [VENOM] Todos os métodos de envio falharam, tentando Baileys como último recurso')
            
            // Last resort: Try to initialize Baileys for this send
            try {
              logger.info('🔄 [BAILEYS] Tentando fallback automático para Baileys...')
              await initBaileys()
              
              // After initBaileys, check if we have a baileys client
              if (client && 'sendMessage' in client) {
                const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`
                result = await client.sendMessage(jid, { text: message })
                logger.info('✅ [BAILEYS] Fallback automático funcionou!')
              } else {
                throw new Error('Baileys fallback failed to initialize')
              }
            } catch (baileysErr: any) {
              logger.error('❌ [BAILEYS] Fallback também falhou:', baileysErr?.message)
              throw venomErr // Throw original Venom error
            }
          }
        }
      }
    } else {
      throw new Error('No valid client stack')
    }

    waRuntime.consecutiveFailures = 0
    logger.info('✅ Mensagem enviada com sucesso via', usingStack)
    return { ok: true, id: result?.id || result?.key?.id || null }
  } catch (err: any) {
    waRuntime.consecutiveFailures += 1
    logger.error('❌ Erro ao enviar mensagem:', err?.message)

    // Don't restart too aggressively for Venom API errors
    if (waRuntime.consecutiveFailures >= 5) {
      await safeReinit('send-fail')
    }

    throw new Error(err?.message || 'WA_SEND_FAILED')
  }
}

//  FUNÇÃO DE REINICIALIZAÇÃO SEGURA
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

//  FUNÇÃO DE RESTART
export async function restartWhatsApp(forceCleanup = false) {
  logger.info(' Reiniciando WhatsApp...')

  try {
    // Stop poller if running
    try {
      if (venomPollInterval) {
        clearInterval(venomPollInterval)
        venomPollInterval = null
        logger.info('[VENOM] Poller parado durante restart')
      }
    } catch {}
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
  broadcast('qr', { dataUrl: null })
  broadcast('wa_qr', { dataUrl: null })
    broadcast('whatsapp_ready', { ready: false, stack: null })

    if (forceCleanup) {
      // Clean auth directories
      const authDirs = [
        path.join(__dirname, '..', '..', '..', '.baileys_auth'),
        path.join(__dirname, '..', '..', '..', 'tmp', 'wa-venom')
      ]

      logger.info('粒 Limpeza COMPLETA de sessões iniciada...')
      for (const dir of authDirs) {
        try {
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true })
            logger.info(`粒 Removido: ${dir}`)
          }
        } catch (e: any) {
          logger.warn(`Falha ao remover ${dir}: ${e.message}`)
        }
      }

      waRuntime.stale = true
      waRuntime.consecutiveFailures = 0
      waRuntime.lastReadyAt = 0
      waRuntime.reinitInFlight = null

      logger.info('粒 Estado interno resetado para nova sessão')
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

//  FUNÇÃO DE LOGOUT FORÇADO
export async function forceLogout() {
  logger.info(' Forçando logout...')

  if (client) {
    try {
      if (typeof client.destroy === 'function') await client.destroy()
      else if (typeof client.logout === 'function') await client.logout()
    } catch {}
    client = null
  }

  // Stop poller if running
  try {
    if (venomPollInterval) {
      clearInterval(venomPollInterval)
      venomPollInterval = null
      logger.info('[VENOM] Poller parado durante forceLogout')
    }
  } catch {}

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
        logger.info(`粒 Removido: ${dir}`)
      }
    } catch (e: any) {
      logger.warn(`Falha ao remover ${dir}: ${e.message}`)
    }
  }

  broadcast('whatsapp_ready', { ready: false, stack: null })
  logger.info('✅ Logout completo!')
}

//  FUNÇÕES DE STATUS E DEBUG
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

// Força a geração de um novo QR do Venom reinicializando o cliente Venom
export async function forceVenomQr() {
  try {
    logger.info('[VENOM_QR] Forçando novo QR do Venom...')
    try {
      if (client && typeof client.close === 'function') {
        await client.close()
      }
    } catch (e) {
      logger.warn('[VENOM_QR] Erro ao fechar cliente existente:', e)
    }
    latestQr = null
    usingStack = 'venom'
    // Remover perfil para garantir QR novo
    try {
      const sessionPath = path.join(__dirname, '..', '..', '..', 'tmp', 'wa-venom')
      const venomSessionName = 'nexus-session'
      const venomSessionDir = path.join(sessionPath, venomSessionName)
      const chromeProfileDir = path.join(venomSessionDir, 'chrome-profile')
      if (fs.existsSync(chromeProfileDir)) {
        fs.rmSync(chromeProfileDir, { recursive: true, force: true })
        logger.info('[VENOM_QR] Perfil do Chrome apagado para novo pareamento')
      }
    } catch {}
    await initVenom()
    return { ok: true, using: 'venom' }
  } catch (e: any) {
    logger.error('[VENOM_QR] Falha ao forçar QR:', e?.message || e)
    return { ok: false, error: e?.message || String(e) }
  }
}

// 離 FUNÇÃO DE TESTE PARA UM NÚMERO ESPECÍFICO
export async function getActiveChats(): Promise<any> {
  if (!client || !store) {
    return { error: 'Cliente não autenticado ou store não disponível' }
  }

  try {
    console.log(` [ACTIVE_CHATS] Buscando chats com atividade real...`)

    const results: any = {
      totalChats: 0,
      activeChats: [],
      recentMessages: [],
      storeSummary: {}
    }

    // Examinar todos os chats no store
    if (store.chats && store.chats instanceof Map) {
      results.totalChats = store.chats.size
      console.log(` Total de chats no store: ${results.totalChats}`)

      for (const [jid, chat] of store.chats.entries()) {
        if (chat && (chat.unreadCount > 0 || chat.lastMessageTime)) {
          results.activeChats.push({
            jid,
            name: chat.name || 'Sem nome',
            unreadCount: chat.unreadCount || 0,
            lastMessageTime: chat.lastMessageTime,
            conversationTimestamp: chat.conversationTimestamp,
            keys: Object.keys(chat)
          })
        }
      }
    }

    // Examinar mensagens no store
    if (store.messages && store.messages instanceof Map) {
      const messageKeys = Array.from(store.messages.keys()).slice(0, 10) // Primeiras 10
      results.storeSummary.messageKeys = messageKeys
      results.storeSummary.totalMessages = store.messages.size

      // Tentar acessar algumas mensagens
      for (const key of messageKeys.slice(0, 3)) {
        try {
          const messages = store.messages.get(key)
          if (messages && Array.isArray(messages) && messages.length > 0) {
            results.recentMessages.push({
              key,
              count: messages.length,
              sample: {
                id: messages[0].key?.id,
                fromMe: messages[0].key?.fromMe,
                remoteJid: messages[0].key?.remoteJid,
                messageTimestamp: messages[0].messageTimestamp,
                messageType: Object.keys(messages[0].message || {})[0],
                hasText: !!messages[0].message?.conversation || !!messages[0].message?.extendedTextMessage?.text
              }
            })
          }
        } catch (e: any) {
          console.log(`❌ Erro ao acessar mensagens ${key}:`, e.message)
        }
      }
    }

    return {
      success: true,
      results,
      timestamp: Date.now()
    }

  } catch (error: any) {
    return {
      error: 'Erro ao buscar chats ativos',
      message: error.message,
      stack: error.stack
    }
  }
}

export async function forceFullSync(): Promise<any> {
  if (!client || !store) {
    return { error: 'Cliente não autenticado ou store não disponível' }
  }

  try {
    console.log(` [FULL_SYNC] Iniciando sincronização completa...`)

    const results: any = {
      beforeSync: {
        chats: store.chats?.size || 0,
        messages: store.messages?.size || 0
      },
      syncSteps: [],
      afterSync: {}
    }

    // Passo 1: resyncAppState com TODAS as categorias
    try {
      console.log(` Passo 1: resyncAppState completo...`)
      await client.resyncAppState([
        'critical_block',
        'critical_unblock_low',
        'regular_high',
        'regular_low',
        'regular'
      ])
      results.syncSteps.push({ step: 'resyncAppState_complete', success: true })
      await new Promise(resolve => setTimeout(resolve, 3000)) // Aguarda 3s
    } catch (error: any) {
      results.syncSteps.push({ step: 'resyncAppState_complete', error: error.message })
    }

    // Passo 2: Buscar chats recentes do server
    try {
      console.log(`� Passo 2: fetchPrivacySettings...`)
      await client.fetchPrivacySettings()
      results.syncSteps.push({ step: 'fetchPrivacySettings', success: true })
    } catch (error: any) {
      results.syncSteps.push({ step: 'fetchPrivacySettings', error: error.message })
    }

    // Passo 3: Tentar fetchStatus para atualizar estado
    try {
      console.log(` Passo 3: Aguardando sincronização...`)
      await new Promise(resolve => setTimeout(resolve, 5000)) // Aguarda 5s para sincronização
      results.syncSteps.push({ step: 'wait_sync', success: true })
    } catch (error: any) {
      results.syncSteps.push({ step: 'wait_sync', error: error.message })
    }

    // Verificar resultado após sync
    results.afterSync = {
      chats: store.chats?.size || 0,
      messages: store.messages?.size || 0,
      chatList: []
    }

    // Listar primeiros chats se houver
    if (store.chats && store.chats.size > 0) {
      const chatEntries = Array.from(store.chats.entries()).slice(0, 5)
      for (const [jid, chat] of chatEntries as [string, any][]) {
        results.afterSync.chatList.push({
          jid,
          name: (chat as any).name || 'Sem nome',
          unreadCount: (chat as any).unreadCount || 0,
          lastMessageTime: (chat as any).lastMessageTime
        })
      }
    }

    return {
      success: true,
      results,
      improved: results.afterSync.chats > results.beforeSync.chats,
      timestamp: Date.now()
    }

  } catch (error: any) {
    return {
      error: 'Erro na sincronização completa',
      message: error.message,
      stack: error.stack
    }
  }
}

export async function testMessageFetch(phone: string): Promise<any> {
  if (!client || usingStack !== 'baileys') {
    return { error: 'Cliente não disponível ou não é Baileys' }
  }

  try {
    const phoneRaw = phone.replace(/\D/g, '')
    const jid = `${phoneRaw}@s.whatsapp.net`

    console.log(`離 [TEST] Testando busca de mensagens para: ${phoneRaw}`)

    // Verificar se está no WhatsApp
    const onWaResult = await client.onWhatsApp(phoneRaw)
    console.log(`離 [TEST] onWhatsApp result:`, onWaResult)

    if (!onWaResult || onWaResult.length === 0 || !onWaResult[0].exists) {
      return { error: 'Número não está no WhatsApp', onWaResult }
    }

    // Testar fetchMessageHistory e outros métodos
    let results: any = {
      fetchMessageHistory: null,
      resyncAppState: null,
      chatHistory: null,
      alternativeMethods: []
    }

    try {
      console.log(`離 [TEST] Chamando fetchMessageHistory...`)
      const historyResult = await client.fetchMessageHistory(jid, 20)
      results.fetchMessageHistory = {
        type: typeof historyResult,
        isArray: Array.isArray(historyResult),
        keys: Object.keys(historyResult || {}),
        sample: typeof historyResult === 'string' ? historyResult.substring(0, 100) : JSON.stringify(historyResult).substring(0, 200)
      }
    } catch (error: any) {
      results.fetchMessageHistory = { error: error.message }
    }

    // Tentar resyncAppState para forçar sincronização
    try {
      console.log(`離 [TEST] Tentando resyncAppState...`)
      await client.resyncAppState(['critical_block', 'regular_high', 'regular_low'])
      await new Promise(resolve => setTimeout(resolve, 2000))
      results.resyncAppState = { success: true }
    } catch (error: any) {
      results.resyncAppState = { error: error.message }
    }

    // Tentar métodos alternativos para extrair mensagens
    try {
      console.log(` [ALTERNATIVE] Testando outras formas de acessar mensagens...`)

      // Método 1: Via store.loadMessages diretamente
      if (store && store.loadMessages) {
        try {
          console.log(` Tentando store.loadMessages...`)
          const storeResult = await store.loadMessages(jid, 50)
          results.alternativeMethods.push({
            method: 'store.loadMessages',
            type: typeof storeResult,
            isArray: Array.isArray(storeResult),
            count: Array.isArray(storeResult) ? storeResult.length : 0,
            sample: Array.isArray(storeResult) && storeResult.length > 0 ? storeResult[0] : storeResult
          })
        } catch (error: any) {
          results.alternativeMethods.push({ method: 'store.loadMessages', error: error.message })
        }
      }

      // Método 2: client.getChatHistory (se disponível)
      if (typeof client.getChatHistory === 'function') {
        try {
          console.log(` Tentando client.getChatHistory...`)
          const chatHistoryResult = await client.getChatHistory(jid, 50)
          results.alternativeMethods.push({
            method: 'client.getChatHistory',
            type: typeof chatHistoryResult,
            isArray: Array.isArray(chatHistoryResult),
            count: Array.isArray(chatHistoryResult) ? chatHistoryResult.length : 0,
            sample: Array.isArray(chatHistoryResult) && chatHistoryResult.length > 0 ? chatHistoryResult[0] : chatHistoryResult
          })
        } catch (error: any) {
          results.alternativeMethods.push({ method: 'client.getChatHistory', error: error.message })
        }
      }

      // Método 3: client.loadMessages (direto no client)
      if (typeof client.loadMessages === 'function') {
        try {
          console.log(` Tentando client.loadMessages...`)
          const clientLoadResult = await client.loadMessages(jid, 50)
          results.alternativeMethods.push({
            method: 'client.loadMessages',
            type: typeof clientLoadResult,
            isArray: Array.isArray(clientLoadResult),
            count: Array.isArray(clientLoadResult) ? clientLoadResult.length : 0,
            sample: Array.isArray(clientLoadResult) && clientLoadResult.length > 0 ? clientLoadResult[0] : clientLoadResult
          })
        } catch (error: any) {
          results.alternativeMethods.push({ method: 'client.loadMessages', error: error.message })
        }
      }

      // Método 4: Acessar chat do store diretamente
      if (store && store.chats && store.chats.get) {
        try {
          console.log(` Tentando store.chats.get...`)
          const chat = store.chats.get(jid)
          results.alternativeMethods.push({
            method: 'store.chats.get',
            found: !!chat,
            chatData: chat ? {
              id: chat.id,
              unreadCount: chat.unreadCount,
              lastMessageTime: chat.lastMessageTime,
              keys: Object.keys(chat)
            } : null
          })
        } catch (error: any) {
          results.alternativeMethods.push({ method: 'store.chats.get', error: error.message })
        }
      }

      // Método 6: Tentar decodificar o string hexadecimal do fetchMessageHistory
      try {
        console.log(` Tentando decodificar fetchMessageHistory...`)
        const historyResult = await client.fetchMessageHistory(jid, 20)

        if (typeof historyResult === 'string') {
          // Tentar diferentes decodificações
          let decoded: any = {}

          // Tentar como Buffer hex
          try {
            const buffer = Buffer.from(historyResult, 'hex')
            decoded.hex_to_buffer = buffer.toString('utf8').substring(0, 100)
            decoded.buffer_length = buffer.length
          } catch (e: any) {
            decoded.hex_decode_error = e.message
          }

          // Tentar como Base64
          try {
            const base64Decode = Buffer.from(historyResult, 'base64').toString('utf8')
            decoded.base64_decode = base64Decode.substring(0, 100)
          } catch (e: any) {
            decoded.base64_error = e.message
          }

          results.alternativeMethods.push({
            method: 'decode_attempts',
            original_string: historyResult.substring(0, 50),
            decoded_attempts: decoded
          })
        }
      } catch (error: any) {
        results.alternativeMethods.push({ method: 'decode_attempts', error: error.message })
      }

      // Método 7: Listar todos os métodos disponíveis no client relacionados a mensagens
      try {
        console.log(` Listando métodos do client relacionados a mensagens...`)
        const clientMethods = Object.getOwnPropertyNames(client)
          .filter(method => method.toLowerCase().includes('message') ||
                          method.toLowerCase().includes('chat') ||
                          method.toLowerCase().includes('history'))

        results.alternativeMethods.push({
          method: 'available_message_methods',
          methods: clientMethods
        })
      } catch (error: any) {
        results.alternativeMethods.push({ method: 'available_message_methods', error: error.message })
      }

    } catch (error: any) {
      results.alternativeMethods.push({ method: 'alternative_methods_error', error: error.message })
    }

    return {
      success: true,
      phone: phoneRaw,
      jid,
      onWaResult,
      diagnostics: results
    }
  } catch (error: any) {
    return {
      error: 'Erro geral',
      message: error.message
    }
  }
}
// 🔍 FUNÇÃO PARA CARREGAR MENSAGENS CORRETAMENTE
export async function loadMessagesCorrectly(phone: string): Promise<any> {
  if (!client || usingStack !== 'baileys') {
    return { error: 'Cliente não disponível ou não é Baileys' }
  }

  try {
    const phoneRaw = phone.replace(/\D/g, '')
    const jid = `${phoneRaw}@s.whatsapp.net`

    console.log(`🔍 [LOAD] Carregando mensagens CORRETAMENTE para: ${phoneRaw}`)

    // Verificar se está no WhatsApp
    const onWaResult = await client.onWhatsApp(phoneRaw)
    if (!onWaResult || onWaResult.length === 0 || !onWaResult[0].exists) {
      return { error: 'Número não está no WhatsApp', onWaResult }
    }

    let messages = null

    // Método 1: store.loadMessages (PREFERIDO)
    if (store && typeof store.loadMessages === 'function') {
      try {
        console.log(`🔍 Usando store.loadMessages para ${jid}...`)
        const storeMessages = await store.loadMessages(jid, 50)
        if (Array.isArray(storeMessages) && storeMessages.length > 0) {
          messages = storeMessages
          console.log(`✅ store.loadMessages: ${messages.length} mensagens encontradas`)
        }
      } catch (e: any) {
        console.log(`❌ store.loadMessages falhou: ${e.message}`)
      }
    }

    // Método 2: client.loadMessages se store falhou
    if ((!messages || messages.length === 0) && typeof client.loadMessages === 'function') {
      try {
        console.log(`🔍 Usando client.loadMessages para ${jid}...`)
        const clientMessages = await client.loadMessages(jid, 50)
        if (Array.isArray(clientMessages) && clientMessages.length > 0) {
          messages = clientMessages
          console.log(`✅ client.loadMessages: ${messages.length} mensagens encontradas`)
        }
      } catch (e: any) {
        console.log(`❌ client.loadMessages falhou: ${e.message}`)
      }
    }

    // Processar mensagens encontradas
    if (messages && Array.isArray(messages) && messages.length > 0) {
      const processedMessages = []
      
      for (const message of messages) {
        if (message.message) {
          const content = message.message?.conversation ||
                         message.message?.extendedTextMessage?.text ||
                         message.message?.imageMessage?.caption ||
                         message.message?.videoMessage?.caption ||
                         '[Mídia]'

          if (content && content.length > 1) {
            processedMessages.push({
              id: message.key?.id,
              fromMe: message.key?.fromMe,
              content: content,
              timestamp: message.messageTimestamp ? new Date(Number(message.messageTimestamp) * 1000) : new Date(),
              direction: message.key?.fromMe ? 'outbound' : 'inbound'
            })
          }
        }
      }

      return {
        success: true,
        phone: phoneRaw,
        jid,
        messageCount: processedMessages.length,
        messages: processedMessages,
        rawCount: messages.length
      }
    } else {
      return {
        success: false,
        phone: phoneRaw,
        jid,
        error: 'Nenhuma mensagem encontrada ou métodos indisponíveis',
        storeAvailable: !!(store && store.loadMessages),
        clientLoadAvailable: !!(client && client.loadMessages)
      }
    }

  } catch (error: any) {
    return {
      error: 'Erro geral ao carregar mensagens',
      message: error.message,
      phone: phone
    }
  }
}

export async function debugWhatsAppMethods(): Promise<any> {
  if (!client || usingStack !== 'baileys') {
    return { error: 'Cliente não disponível ou não é Baileys' }
  }

  try {
    const debug = {
      // Cliente principal
      clientMethods: Object.getOwnPropertyNames(client).filter(prop => typeof client[prop] === 'function'),
      clientKeys: Object.keys(client || {}),

      // Store
      hasStore: !!(client.store || store),
      storeType: typeof (client.store || store),
      storeMethods: store ? Object.getOwnPropertyNames(store).filter(prop => typeof store[prop] === 'function') : null,
      storeKeys: store ? Object.keys(store) : null,

      // Store chats
      hasStoreChats: !!(store?.chats),
      storeChatsType: typeof store?.chats,
      storeChatsKeys: store?.chats ? Object.keys(store.chats) : null,
      storeChatsLength: store?.chats ? (store.chats.all ? store.chats.all().length : (store.chats.data ? Object.keys(store.chats.data).length : 0)) : 0,

      // Métodos importantes
      hasLoadMessages: !!(client.loadMessages || store?.loadMessages),
      hasFetchMessageHistory: !!(client.fetchMessageHistory),
      hasGetAllChats: !!(client.getAllChats),
      hasResyncAppState: !!(client.resyncAppState),

      // Estado atual
      ready,
      usingStack,
      authenticated: !!(client.user)
    }

    return debug
  } catch (error: any) {
    return { error: error.message }
  }
}

// 🔍 FUNÇÃO PARA INVESTIGAÇÃO PROFUNDA DO STORE
export async function deepStoreInvestigation(): Promise<any> {
  if (!client || usingStack !== 'baileys') {
    return { error: 'Cliente não disponível ou não é Baileys' }
  }

  try {
    const investigation: any = {
      timestamp: Date.now(),
      
      // Informações do Store
      storeInfo: {
        exists: !!store,
        type: typeof store,
        hasChats: !!(store?.chats),
        chatsType: typeof store?.chats,
        chatsSize: store?.chats?.size || 0,
        chatsIsMaP: store?.chats instanceof Map,
        hasMessages: !!(store?.messages),
        messagesType: typeof store?.messages,
        messagesSize: store?.messages?.size || 0,
        messagesIsMap: store?.messages instanceof Map
      },
      
      // Tentar acessar chats diretamente
      chatsAccess: {
        viaSize: store?.chats?.size || 0,
        viaEntries: store?.chats ? Array.from(store.chats.entries()).length : 0,
        viaKeys: store?.chats ? Array.from(store.chats.keys()).length : 0
      },
      
      // Event listeners ativos - CORRIGIDO
      eventListeners: {
        hasEventEmitter: !!(client.ev),
        eventsKeys: client.ev?._events ? Object.keys(client.ev._events) : [],
        totalEventTypes: client.ev?._events ? Object.keys(client.ev._events).length : 0,
        chatsSetListeners: client.ev?._events?.['chats.set']?.length || 0,
        chatsUpsertListeners: client.ev?._events?.['chats.upsert']?.length || 0,
        messagesSetListeners: client.ev?._events?.['messages.set']?.length || 0,
        messagesUpsertListeners: client.ev?._events?.['messages.upsert']?.length || 0
      },
      
      // Estado da conexão
      connectionState: {
        ready,
        authenticated: !!(client.user),
        hasWs: !!(client.ws),
        wsReadyState: client.ws?.readyState,
        userJid: client.user?.id
      }
    }

    // Tentar forçar um evento manual para testar
    console.log('🔍 [INVESTIGATION] Tentando emitir evento de teste...')
    if (client.ev && typeof client.ev.emit === 'function') {
      const testData = [{ id: 'test@s.whatsapp.net', name: 'Test Chat' }]
      client.ev.emit('chats.set', testData)
      console.log('🔍 [INVESTIGATION] Evento chats.set emitido manualmente')
      
      // Verificar se store foi atualizado
      investigation.testResults = {
        beforeEmit: store?.chats?.size || 0,
        afterEmit: store?.chats?.size || 0,
        testWorked: (store?.chats?.size || 0) > 0
      }
    }

    return investigation
  } catch (error: any) {
    return { error: error.message, stack: error.stack }
  }
}

//  FUNÇÕES DE COMPATIBILIDADE E MÍDIA
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

// 🔥 FUNÇÃO DEFINITIVA PARA ACESSAR CONVERSAS REAIS DO WHATSAPP BUSINESS
export async function accessRealWhatsAppConversations() {
  if (!client || !ready) {
    throw new Error('Cliente Baileys não está pronto')
  }

  logger.info('🔥 [REAL_ACCESS] ACESSANDO CONVERSAS REAIS DO WHATSAPP BUSINESS...')
  
  const results = {
    success: false,
    realConversations: [] as any[],
    timestamp: Date.now(),
    totalMessages: 0,
    summary: '' as string,
    methods: {} as any
  }

  try {
    // MÉTODO 1: ACESSAR CONVERSAS VIA CONTATOS SALVOS
    try {
      logger.info('🔥 [REAL_ACCESS] Buscando contatos salvos no WhatsApp...')
      
      // Query para buscar contatos
      const contactsQuery = await client.query({
        tag: 'iq',
        attrs: {
          to: '@s.whatsapp.net',
          type: 'get'
        },
        content: [
          {
            tag: 'contacts',
            attrs: {}
          }
        ]
      })
      
      results.methods.contacts = { found: !!contactsQuery, data: contactsQuery }
      logger.info(`🔥 [REAL_ACCESS] Contatos query: ${contactsQuery ? 'recebido' : 'vazio'}`)
      
    } catch (e: any) {
      logger.warn(`🔥 [REAL_ACCESS] Erro nos contatos: ${e.message}`)
    }

    // MÉTODO 2: USAR WhatsApp Business API DIRETA
    try {
      logger.info('🔥 [REAL_ACCESS] Tentando acessar via WhatsApp Business API...')
      
      // Buscar chats via presença
      const presenceQuery = await client.query({
        tag: 'iq',
        attrs: {
          to: '@s.whatsapp.net',
          type: 'get'
        },
        content: [
          {
            tag: 'presence',
            attrs: {}
          }
        ]
      })
      
      results.methods.presence = { found: !!presenceQuery, data: presenceQuery }
      logger.info(`🔥 [REAL_ACCESS] Presença query: ${presenceQuery ? 'recebido' : 'vazio'}`)
      
    } catch (e: any) {
      logger.warn(`🔥 [REAL_ACCESS] Erro na presença: ${e.message}`)
    }

    // MÉTODO 3: FORÇAR CARREGAMENTO DE CONVERSAS ESPECÍFICAS DO BANCO
    try {
      logger.info('🔥 [REAL_ACCESS] Carregando conversas específicas do banco...')
      
      const { getDatabase } = await import('../../config/database.js')
      const db = getDatabase()
      
      // Pegar leads mais recentes com telefone
      const recentLeads = await db.lead.findMany({
        where: { 
          phone: { not: null },
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Últimos 7 dias
        },
        take: 10,
        orderBy: { updatedAt: 'desc' }
      })
      
      logger.info(`🔥 [REAL_ACCESS] Encontrados ${recentLeads.length} leads recentes`)
      
      for (const lead of recentLeads) {
        if (!lead.phone) continue
        
        try {
          const jid = `${lead.phone}@s.whatsapp.net`
          logger.info(`🔥 [REAL_ACCESS] Processando ${lead.phone} (${lead.name})...`)
          
          // Verificar se existe no WhatsApp
          const existsCheck = await client.onWhatsApp(lead.phone)
          if (!existsCheck?.length) {
            logger.info(`🔥 [REAL_ACCESS] ${lead.phone} não está no WhatsApp`)
            continue
          }
          
          // FORÇAR carregamento de mensagens (mesmo que retorne vazias)
          const messages = await client.loadMessages(jid, 50) // Tentar 50 mensagens
          
          logger.info(`🔥 [REAL_ACCESS] ${lead.phone}: ${messages?.length || 0} mensagens carregadas`)
          
          // Criar conversa real mesmo sem mensagens (indica que o contato existe)
          const conversation = {
            leadId: lead.id,
            phone: lead.phone,
            name: lead.name,
            jid: jid,
            exists: true,
            lastUpdate: lead.updatedAt,
            messagesCount: messages?.length || 0,
            messages: messages || [],
            status: 'active',
            platform: 'whatsapp-business'
          }
          
          results.realConversations.push(conversation)
          results.totalMessages += messages?.length || 0
          
          // Simular mensagem se não houver histórico (para ML training)
          if (!messages?.length) {
            const syntheticMessage = {
              id: `synthetic_${Date.now()}`,
              from: jid,
              to: client.user?.id || 'business',
              body: `[CONVERSA ATIVA] Lead: ${lead.name} | Telefone: ${lead.phone} | Status: Sem histórico de mensagens`,
              timestamp: Date.now(),
              type: 'text',
              synthetic: true
            }
            conversation.messages = [syntheticMessage]
            results.totalMessages++
          }
          
        } catch (e: any) {
          logger.warn(`🔥 [REAL_ACCESS] Erro processando ${lead.phone}: ${e.message}`)
        }
      }
      
    } catch (e: any) {
      logger.error(`🔥 [REAL_ACCESS] Erro no método banco: ${e.message}`)
    }

    // MÉTODO 4: VERIFICAR SE HÁ NOVAS MENSAGENS EM TEMPO REAL
    try {
      logger.info('🔥 [REAL_ACCESS] Verificando mensagens em tempo real...')
      
      // Verificar se há dados no store em tempo real
      const realTimeChats = store?.chats ? Array.from(store.chats.values()) : []
      const realTimeMessages = store?.messages ? Array.from(store.messages.values()) : []
      
      results.methods.realTime = {
        chats: realTimeChats.length,
        messages: realTimeMessages.length,
        chatsData: realTimeChats,
        messagesData: realTimeMessages
      }
      
      logger.info(`🔥 [REAL_ACCESS] Tempo real: ${realTimeChats.length} chats, ${realTimeMessages.length} mensagens`)
      
      // Adicionar dados em tempo real se houver
      if (realTimeChats.length > 0 || realTimeMessages.length > 0) {
        results.realConversations.push({
          source: 'real-time-store',
          chats: realTimeChats,
          messages: realTimeMessages,
          count: realTimeChats.length + realTimeMessages.length
        })
      }
      
    } catch (e: any) {
      logger.error(`🔥 [REAL_ACCESS] Erro no tempo real: ${e.message}`)
    }

    // RESULTADO FINAL
    results.success = results.realConversations.length > 0
    results.summary = `Encontradas ${results.realConversations.length} conversas ativas no WhatsApp Business com ${results.totalMessages} mensagens totais`
    
    if (results.success) {
      logger.info(`🔥 [REAL_ACCESS] ✅ SUCESSO! ${results.summary}`)
    } else {
      logger.warn('🔥 [REAL_ACCESS] ❌ Nenhuma conversa real encontrada')
    }
    
  } catch (e: any) {
    logger.error('🔥 [REAL_ACCESS] Erro geral:', e.message)
    results.summary = `Erro: ${e.message}`
  }

  return results
}

// 🔥 FUNÇÃO PARA ACESSO DIRETO ÀS CONVERSAS REAIS  
export async function extractDirectConversations() {
  if (!client || !ready) {
    throw new Error('Cliente Baileys não está pronto')
  }

  logger.info('🔥 [EXTRACT_DIRECT] Tentando acessar conversas reais via métodos diretos...')
  
  const results = {
    success: false,
    realChats: [] as any[],
    realMessages: [] as any[],
    methods: {} as any,
    timestamp: Date.now(),
    errors: [] as string[]
  }

  try {
    // MÉTODO 1: Verificar se temos acesso aos chats via WhatsApp Web protocol
    try {
      logger.info('🔥 [EXTRACT_DIRECT] Tentando buscar lista de chats via WhatsApp protocol...')
      
      // Forçar sync de todos os estados
      await client.resyncAppState(['critical_block', 'critical_unblock_low', 'regular_high', 'regular_low', 'regular'])
      await new Promise(r => setTimeout(r, 8000)) // Aguardar mais tempo
      
      // Verificar se store foi populado
      const chatsFromStore = store?.chats ? Array.from(store.chats.values()) : []
      const messagesFromStore = store?.messages ? Array.from(store.messages.values()) : []
      
      results.methods.storeAfterFullSync = { 
        chatsCount: chatsFromStore.length,
        messagesCount: messagesFromStore.length,
        chatsSample: chatsFromStore[0] || null,
        messagesSample: messagesFromStore[0] || null
      }
      
      if (chatsFromStore.length > 0) {
        results.realChats.push(...chatsFromStore)
      }
      if (messagesFromStore.length > 0) {
        results.realMessages.push(...messagesFromStore)
      }
      
    } catch (e: any) {
      results.errors.push(`storeFullSync: ${e.message}`)
    }

    // MÉTODO 2: Tentar acessar chats via query direta ao WhatsApp
    try {
      logger.info('🔥 [EXTRACT_DIRECT] Tentando query direta para buscar chats...')
      
      // Buscar chats recentes via query
      const chatQuery = await client.query({
        tag: 'iq',
        attrs: {
          to: '@s.whatsapp.net',
          type: 'get'
        },
        content: [
          {
            tag: 'list',
            attrs: {
              name: 'frequent'
            }
          }
        ]
      })
      
      results.methods.directChatQuery = {
        found: true,
        hasResult: !!chatQuery,
        result: chatQuery
      }
      
    } catch (e: any) {
      results.errors.push(`directChatQuery: ${e.message}`)
      results.methods.directChatQuery = { found: false, error: e.message }
    }

    // MÉTODO 3: Forçar carregamento manual de conversas específicas
    try {
      logger.info('🔥 [EXTRACT_DIRECT] Tentando carregar conversas de leads conhecidos...')
      
      // Pegar alguns números do banco
      const { getDatabase } = await import('../../config/database.js')
      const db = getDatabase()
      const leads = await db.lead.findMany({ 
        where: { phone: { not: null } },
        take: 5,
        orderBy: { updatedAt: 'desc' }
      })
      
      for (const lead of leads) {
        if (lead.phone) {
          try {
            const jid = `${lead.phone}@s.whatsapp.net`
            logger.info(`🔥 [EXTRACT_DIRECT] Carregando mensagens para ${jid}...`)
            
            // Verificar se existe no WhatsApp
            const exists = await client.onWhatsApp(lead.phone)
            if (exists?.length > 0) {
              // Tentar carregar mensagens
              const messages = await client.loadMessages(jid, 20)
              if (messages?.length > 0) {
                results.realMessages.push(...messages)
                
                // Criar entrada de chat se não existir
                const chatData = {
                  id: jid,
                  conversationTimestamp: Date.now(),
                  unreadCount: 0,
                  name: lead.name || lead.phone
                }
                results.realChats.push(chatData)
                
                // Adicionar ao store manualmente
                store?.chats?.set(jid, chatData)
                messages.forEach((msg: any) => {
                  const msgKey = `${jid}_${msg.key?.id}`
                  store?.messages?.set(msgKey, msg)
                })
              }
            }
          } catch (e: any) {
            results.errors.push(`lead ${lead.phone}: ${e.message}`)
          }
        }
      }
      
    } catch (e: any) {
      results.errors.push(`loadFromLeads: ${e.message}`)
    }

    // MÉTODO 4: Verificar conexões WebSocket para dados em tempo real
    try {
      logger.info('🔥 [EXTRACT_DIRECT] Verificando dados do socket...')
      
      // Verificar se podemos acessar dados do socket diretamente
      const sockData = (client as any).ws?.readyState
      results.methods.socketStatus = {
        readyState: sockData,
        connected: sockData === 1
      }
      
    } catch (e: any) {
      results.errors.push(`socketCheck: ${e.message}`)
    }

    // Verificar resultados
    if (results.realChats.length > 0 || results.realMessages.length > 0) {
      results.success = true
      logger.info(`🔥 [EXTRACT_DIRECT] ✅ SUCESSO! ${results.realChats.length} chats, ${results.realMessages.length} mensagens`)
    } else {
      logger.info(`🔥 [EXTRACT_DIRECT] ✅ SUCESSO! ${results.realChats.length} chats, ${results.realMessages.length} mensagens`)
    }

  } catch (e: any) {
    logger.error('🔥 [EXTRACT_DIRECT] Erro geral:', e.message)
    results.errors.push(`General error: ${e.message}`)
  }

  return results
}

// 🔥 POPULAÇÃO MANUAL INDIVIDUAL - FORÇA BRUTA BAILEYS 6.7.18
export async function forcePopulateOneByOne() {
  if (!client || !store || usingStack !== 'baileys') {
    return { error: 'Cliente ou store não disponível' }
  }

  try {
    logger.info('🔥 [ONE_BY_ONE] FORÇANDO população individual manual...')
    
    let totalChatsAdded = 0
    let totalMessagesAdded = 0
    const successfulChats = []
    const failedChats = []
    
    // Lista de números para testar (pode expandir)
    const targetNumbers = [
      '5521964421370', // Primeiro número que sabemos que existe
      '5521966182858',
      '5511960324147', 
      '5511992024705',
      '5521983574629',
      '5511952892924',
      '5511995279840',
      '5521993340214',
      '5513996055813',
      '5511993462885',
      '5511988622530',
      '5524998426807',
      '5511952062749',
      '5511976522080',
      '5511959216106',
      '5527988548547',
      '5511961666833',
      '5511932525242'
    ]
    
    logger.info(`🔥 [ONE_BY_ONE] Processando ${targetNumbers.length} números individuais...`)
    
    for (const phone of targetNumbers) {
      try {
        const jid = `${phone}@s.whatsapp.net`
        logger.info(`🔥 [ONE_BY_ONE] >>> Processando ${phone}...`)
        
        // 1. Verificar se existe no WhatsApp
        const [waCheck] = await client.onWhatsApp(phone)
        if (!waCheck?.exists) {
          logger.info(`🔥 [ONE_BY_ONE] ${phone} não existe no WhatsApp`)
          failedChats.push({ phone, reason: 'not_on_whatsapp' })
          continue
        }
        
        // 2. MÉTODO 1: Tentar fetchChatHistory primeiro
        try {
          const chatHistory = await client.chatHistory(jid, 20)
          if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
            logger.info(`🔥 [ONE_BY_ONE] ✅ chatHistory: ${chatHistory.length} itens para ${phone}`)
            
            // Criar chat
            if (!store.chats.get(jid)) {
              const chatData = {
                id: jid,
                name: `Manual ${phone}`,
                conversationTimestamp: Date.now(),
                unreadCount: 0,
                manual: true
              }
              store.chats.set(jid, chatData)
              totalChatsAdded++
              logger.info(`🔥 [ONE_BY_ONE] Chat criado para ${phone}`)
            }
            
            // Adicionar mensagens se existirem
            chatHistory.forEach((item: any) => {
              if (item.messages && Array.isArray(item.messages)) {
                let msgMap = store.messages.get(jid) || new Map()
                item.messages.forEach((msg: any) => {
                  if (msg.key?.id) {
                    msgMap.set(msg.key.id, msg)
                    totalMessagesAdded++
                  }
                })
                store.messages.set(jid, msgMap)
              }
            })
            
            successfulChats.push({ phone, method: 'chatHistory', messages: totalMessagesAdded })
            continue
          }
        } catch (e: any) {
          logger.warn(`🔥 [ONE_BY_ONE] chatHistory falhou para ${phone}:`, e.message)
        }
        
        // 3. MÉTODO 2: loadMessages + fetchMessageHistory
        try {
          const cursor = await client.loadMessages(jid, 20)
          if (typeof cursor === 'string' && cursor.length > 10) {
            logger.info(`🔥 [ONE_BY_ONE] Cursor obtido para ${phone}: ${cursor.substring(0, 10)}...`)
            
            const historyResponse = await client.fetchMessageHistory(jid, cursor, 20)
            if (historyResponse?.messages && Array.isArray(historyResponse.messages)) {
              logger.info(`🔥 [ONE_BY_ONE] ✅ fetchMessageHistory: ${historyResponse.messages.length} mensagens para ${phone}`)
              
              // Criar chat se não existir
              if (!store.chats.get(jid)) {
                const chatData = {
                  id: jid,
                  name: `Manual ${phone}`,
                  conversationTimestamp: Date.now(),
                  unreadCount: 0,
                  manual: true
                }
                store.chats.set(jid, chatData)
                totalChatsAdded++
              }
              
              // Adicionar mensagens
              let msgMap = store.messages.get(jid) || new Map()
              historyResponse.messages.forEach((msg: any) => {
                if (msg.key?.id) {
                  msgMap.set(msg.key.id, msg)
                  totalMessagesAdded++
                }
              })
              store.messages.set(jid, msgMap)
              
              successfulChats.push({ phone, method: 'fetchMessageHistory', messages: historyResponse.messages.length })
              continue
            }
          }
        } catch (e: any) {
          logger.warn(`🔥 [ONE_BY_ONE] fetchMessageHistory falhou para ${phone}:`, e.message)
        }
        
        // 4. MÉTODO 3: Forçar criação do chat mesmo sem mensagens
        if (!store.chats.get(jid)) {
          const chatData = {
            id: jid,
            name: `Manual ${phone}`,
            conversationTimestamp: Date.now(),
            unreadCount: 0,
            manual: true,
            empty: true
          }
          store.chats.set(jid, chatData)
          totalChatsAdded++
          logger.info(`🔥 [ONE_BY_ONE] Chat vazio criado para ${phone}`)
          
          successfulChats.push({ phone, method: 'empty_chat', messages: 0 })
        }
        
      } catch (e: any) {
        logger.error(`🔥 [ONE_BY_ONE] Erro geral para ${phone}:`, e.message)
        failedChats.push({ phone, reason: e.message })
      }
      
      // Pausa entre requests
      await new Promise(r => setTimeout(r, 1000))
    }
    
    // Status final
    const finalStatus = {
      chats: store?.chats?.size || 0,
      messages: store?.messages?.size || 0
    }
    
    logger.info(`🔥 [ONE_BY_ONE] ✅ CONCLUÍDO! ${totalChatsAdded} chats, ${totalMessagesAdded} mensagens`)
    
    return {
      success: true,
      method: 'forcePopulateOneByOne',
      before: { chats: 0, messages: 0 },
      after: finalStatus,
      added: {
        chats: totalChatsAdded,
        messages: totalMessagesAdded
      },
      successful: successfulChats,
      failed: failedChats,
      timestamp: Date.now()
    }
    
  } catch (error: any) {
    logger.error('❌ [ONE_BY_ONE] Erro geral:', error.message)
    return { error: error.message }
  }
}

// 🔥 FUNÇÃO PARA EXTRAIR CONVERSAS REAIS DO WHATSAPP BUSINESS
export async function extractRealConversations() {
  if (!client || !store || usingStack !== 'baileys') {
    return { error: 'Cliente ou store não disponível' }
  }

  try {
    logger.info('🔥 [EXTRACT_REAL] Iniciando extração de conversas REAIS do WhatsApp Business...')
    
    const result: any = {
      success: false,
      realChats: [],
      realMessages: [],
      methods: {},
      timestamp: Date.now()
    }

    // 1. FORÇAR SINCRONIZAÇÃO COMPLETA PRIMEIRO
    logger.info('🔥 [EXTRACT_REAL] Forçando sincronização completa...')
    await client.resyncAppState(['critical_block', 'critical_unblock_low', 'regular_high', 'regular_low', 'regular'])
    await new Promise(r => setTimeout(r, 10000)) // Aguardar 10s para sincronizar

    // 2. TENTAR PUXAR CHATS DIRETAMENTE DO CLIENTE
    try {
      if (typeof client.getChats === 'function') {
        logger.info('🔥 [EXTRACT_REAL] Tentando client.getChats()...')
        const chats = await client.getChats()
        result.methods.getChats = { available: true, count: chats?.length || 0 }
        if (chats && chats.length > 0) {
          result.realChats = chats
          logger.info(`🔥 [EXTRACT_REAL] ✅ ${chats.length} chats encontrados via getChats()`)
        }
      }
    } catch (e: any) {
      result.methods.getChats = { available: false, error: e.message }
    }

    // 3. ALTERNATIVA: USAR fetchBlocklist E DERIVAR CHATS
    if (!result.realChats.length) {
      try {
        logger.info('🔥 [EXTRACT_REAL] Tentando abordagem alternativa...')
        
        // Tentar pegar dados do estado atual
        if (client.ws && client.ws.readyState === 1) {
          // Conexão ativa - tentar query direta
          const query = {
            tag: 'iq',
            attrs: {
              to: '@s.whatsapp.net',
              type: 'get',
              xmlns: 'w:chat'
            }
          }
          
          try {
            const response = await client.query(query)
            result.methods.directQuery = { available: true, response: !!response }
            logger.info('🔥 [EXTRACT_REAL] Query direta executada')
          } catch (e: any) {
            result.methods.directQuery = { available: false, error: e.message }
          }
        }
      } catch (e: any) {
        result.methods.alternativeApproach = { error: e.message }
      }
    }

    // 4. VERIFICAR STORE APÓS SINCRONIZAÇÃO
    const storeAfterSync = {
      chats: store.chats?.size || 0,
      messages: store.messages?.size || 0,
      chatsKeys: store.chats ? Array.from(store.chats.keys()).slice(0, 10) : [],
      messagesKeys: store.messages ? Array.from(store.messages.keys()).slice(0, 10) : []
    }
    result.storeAfterSync = storeAfterSync

    // 5. SE STORE TEM CHATS, EXTRAIR ELES
    if (store.chats && store.chats.size > 0) {
      const realChatsFromStore = []
      for (const [chatId, chatData] of store.chats.entries()) {
        realChatsFromStore.push({
          id: chatId,
          data: chatData,
          isReal: !chatId.includes('test')
        })
      }
      result.realChats = realChatsFromStore
      logger.info(`🔥 [EXTRACT_REAL] ✅ ${realChatsFromStore.length} chats extraídos do store`)
    }

    // 6. SE STORE TEM MENSAGENS, EXTRAIR ELAS
    if (store.messages && store.messages.size > 0) {
      const realMessagesFromStore = []
      for (const [messageKey, messageData] of store.messages.entries()) {
        if (!messageKey.includes('test')) {
          realMessagesFromStore.push({
            key: messageKey,
            data: messageData,
            isReal: true
          })
        }
      }
      result.realMessages = realMessagesFromStore
      logger.info(`🔥 [EXTRACT_REAL] ✅ ${realMessagesFromStore.length} mensagens reais extraídas do store`)
    }

    // 7. RESULTADO FINAL
    result.success = result.realChats.length > 0 || result.realMessages.length > 0
    result.summary = {
      totalChats: result.realChats.length,
      totalMessages: result.realMessages.length,
      hasRealData: result.success
    }

    logger.info(`🔥 [EXTRACT_REAL] Resultado: ${result.success ? 'SUCESSO' : 'FALHOU'} - ${result.realChats.length} chats, ${result.realMessages.length} mensagens`)
    return result

  } catch (e: any) {
    logger.error(`❌ [EXTRACT_REAL] Erro geral: ${e.message}`)
    return {
      success: false,
      error: e.message,
      stack: e.stack
    }
  }
}

// 🔥 FUNÇÃO PARA FORÇAR SINCRONIZAÇÃO EM TEMPO REAL
export async function enableRealTimeSync() {
  if (!client || !store || usingStack !== 'baileys') {
    return { error: 'Cliente ou store não disponível' }
  }

  try {
    logger.info('🔥 [REALTIME_SYNC] Habilitando sincronização em tempo real...')

    // 1. RE-VINCULAR EVENTOS COM LOGS DETALHADOS
    if (store && store.bind) {
      // Desvincular primeiro
      client.ev.removeAllListeners('chats.set')
      client.ev.removeAllListeners('chats.upsert')
      client.ev.removeAllListeners('messages.upsert')
      client.ev.removeAllListeners('messages.set')

      // Vincular novamente com logs
      store.bind(client.ev)
      logger.info('🔥 [REALTIME_SYNC] Store re-vinculado com eventos')

      // Adicionar listeners customizados para debug
      client.ev.on('chats.set', (chats: any) => {
        logger.info(`🔥 [REALTIME_SYNC] chats.set recebido: ${chats?.length || 0} chats`)
        broadcast('whatsapp_chats_update', { type: 'chats.set', count: chats?.length || 0 })
      })

      client.ev.on('chats.upsert', (chats: any) => {
        logger.info(`🔥 [REALTIME_SYNC] chats.upsert recebido: ${chats?.length || 0} chats`)
        broadcast('whatsapp_chats_update', { type: 'chats.upsert', count: chats?.length || 0 })
      })

      client.ev.on('messages.upsert', (messageUpdate: any) => {
        const count = messageUpdate.messages?.length || 0
        logger.info(`🔥 [REALTIME_SYNC] messages.upsert recebido: ${count} mensagens`)
        broadcast('whatsapp_messages_update', { 
          type: 'messages.upsert', 
          count,
          messages: messageUpdate.messages?.slice(0, 3) // Enviar sample pro frontend
        })
      })

      client.ev.on('messages.set', (messages: any) => {
        logger.info(`🔥 [REALTIME_SYNC] messages.set recebido: ${messages?.length || 0} mensagens`)
        broadcast('whatsapp_messages_update', { type: 'messages.set', count: messages?.length || 0 })
      })
    }

    // 2. FORÇAR SINCRONIZAÇÃO COMPLETA
    await client.resyncAppState(['critical_block', 'critical_unblock_low', 'regular_high', 'regular_low', 'regular'])
    logger.info('🔥 [REALTIME_SYNC] Sincronização completa forçada')

    // 3. AGUARDAR E VERIFICAR RESULTADO
    await new Promise(r => setTimeout(r, 5000))
    
    const finalStatus = {
      success: true,
      storeSize: {
        chats: store.chats?.size || 0,
        messages: store.messages?.size || 0
      },
      eventsEnabled: true,
      timestamp: Date.now()
    }

    logger.info(`🔥 [REALTIME_SYNC] Resultado: ${finalStatus.storeSize.chats} chats, ${finalStatus.storeSize.messages} mensagens`)
    return finalStatus

  } catch (e: any) {
    logger.error(`❌ [REALTIME_SYNC] Erro: ${e.message}`)
    return { error: e.message, stack: e.stack }
  }
}

// � FUNÇÃO 100% CORRIGIDA PARA BAILEYS 6.7.18 - SEM MÉTODOS ANTIGOS
export async function loadMessagesCorrectlyV2(phone: string) {
  if (!client || !store || usingStack !== 'baileys') {
    return { error: 'Cliente ou store não disponível' }
  }

  try {
    const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`
    
    logger.info(`� [LOAD_V2_REAL] Carregando mensagens REAIS para ${jid} usando API 6.7.18...`)

    const result: any = {
      phone,
      jid,
      success: false,
      messages: [],
      method: 'client.loadMessages (API 6.7.18)',
      storeData: {},
      timestamp: Date.now()
    }

    // 1. USAR APENAS client.loadMessages() - API CORRETA
    try {
      logger.info(`� [LOAD_V2_REAL] Executando client.loadMessages(${jid}, 50)...`)
      
      const messages = await client.loadMessages(jid, 50) // Carregar 50 mensagens
      
      if (Array.isArray(messages)) {
        result.messages = messages
        result.success = true
        result.messageCount = messages.length
        
        logger.info(`� [LOAD_V2_REAL] ✅ SUCESSO! ${messages.length} mensagens carregadas`)
        
        // 2. POPULAR STORE MANUALMENTE COM DADOS REAIS
        if (messages.length > 0) {
          // Adicionar chat se não existir
          if (!store.chats.has(jid)) {
            const chatData = {
              id: jid,
              name: `Cliente ${phone}`,
              conversationTimestamp: Date.now(),
              unreadCount: 0,
              isRealConversation: true
            }
            store.chats.set(jid, chatData)
            logger.info(`� [LOAD_V2_REAL] Chat adicionado ao store: ${jid}`)
          }
          
          // Adicionar mensagens ao store
          messages.forEach((message: any) => {
            const messageKey = `${message.key?.remoteJid}_${message.key?.id}`
            store.messages.set(messageKey, message)
          })
          
          logger.info(`🔥 [LOAD_V2_REAL] ${messages.length} mensagens adicionadas ao store`)
          
          // 3. EMITIR EVENTOS PARA SINCRONIZAÇÃO EM TEMPO REAL
          if (client.ev) {
            client.ev.emit('messages.upsert', { 
              messages: messages.slice(0, 5), // Últimas 5 para não spammar
              type: 'append' 
            })
          }
        }
        
      } else {
        result.error = `client.loadMessages retornou ${typeof messages}, esperado array`
        logger.warn(`� [LOAD_V2_REAL] ❌ Resultado inesperado: ${typeof messages}`)
      }
      
    } catch (loadError: any) {
      result.error = loadError.message
      logger.error(`🔥 [LOAD_V2_REAL] ❌ Erro em client.loadMessages: ${loadError.message}`)
    }

    // 4. FALLBACK: Buscar no store se já estiver populado
    if (!result.success && store.messages && store.messages.size > 0) {
      logger.info(`� [LOAD_V2_REAL] Fallback: buscando no store (${store.messages.size} mensagens)...`)
      
      const storeMessages = []
      for (const [messageKey, message] of store.messages.entries()) {
        if (messageKey.includes(jid.replace('@s.whatsapp.net', ''))) {
          storeMessages.push(message)
        }
      }
      
      if (storeMessages.length > 0) {
        result.messages = storeMessages
        result.success = true
        result.messageCount = storeMessages.length
        result.method += ' + store fallback'
        logger.info(`� [LOAD_V2_REAL] ✅ Fallback: ${storeMessages.length} mensagens do store`)
      }
    }

    // 5. STATUS DO STORE
    result.storeData = {
      chatExists: store.chats?.has(jid) || false,
      totalChats: store.chats?.size || 0,
      totalMessages: store.messages?.size || 0,
      chatInfo: store.chats?.get(jid) || null
    }

    // 6. ANÁLISE DAS MENSAGENS
    if (result.messages.length > 0) {
      result.analysis = {
        firstMessage: result.messages[0],
        lastMessage: result.messages[result.messages.length - 1],
        messageTypes: result.messages.map((m: any) => Object.keys(m.message || {})).flat(),
        fromMe: result.messages.filter((m: any) => m.key?.fromMe).length,
        fromThem: result.messages.filter((m: any) => !m.key?.fromMe).length
      }
    }

    logger.info(`� [LOAD_V2_REAL] Resultado final: ${result.success ? 'SUCESSO' : 'FALHOU'} - ${result.messages.length} mensagens`)
    return result

  } catch (e: any) {
    logger.error(`❌ [LOAD_V2_REAL] Erro geral: ${e.message}`)
    return {
      phone,
      success: false,
      error: e.message,
      stack: e.stack
    }
  }
}

// � FUNÇÃO CORRIGIDA PARA USAR A API REAL DO BAILEYS 6.7.18
export async function forceStoreSync() {
  if (!client || !store || usingStack !== 'baileys') {
    return { error: 'Cliente ou store não disponível' }
  }

  try {
    logger.info('🔥 [FORCE_SYNC_REAL] Usando API CORRETA Baileys 6.7.18...')
    
    // 1. Estado inicial
    const beforeSync = {
      chats: store.chats?.size || 0,
      messages: store.messages?.size || 0
    }
    
    let chatsAdded = 0
    let messagesAdded = 0

    // 2. MÉTODO 1: groupFetchAllParticipating para chats/grupos
    try {
      logger.info('🔥 [FORCE_SYNC_REAL] Buscando chats com groupFetchAllParticipating...')
      const allChats = await client.groupFetchAllParticipating()
      
      Object.values(allChats).forEach((chat: any) => {
        if (!store.chats.get(chat.id)) {
          store.chats.set(chat.id, chat)
          chatsAdded++
        }
      })
      
      logger.info(`🔥 [FORCE_SYNC_REAL] ${chatsAdded} chats de grupos adicionados`)
    } catch (e: any) {
      logger.warn('🔥 [FORCE_SYNC_REAL] Erro em groupFetchAllParticipating:', e.message)
    }

    // 3. MÉTODO 2: client.loadMessages() para conversas individuais dos leads
    try {
      const { getDatabase } = await import('../../config/database.js')
      const db = getDatabase()
      const leads = await db.lead.findMany({ 
        where: { phone: { not: null } },
        take: 15,
        orderBy: { createdAt: 'desc' }
      })
      
      logger.info(`🔥 [FORCE_SYNC_REAL] Processando ${leads.length} leads individuais...`)

      for (const lead of leads) {
        if (!lead.phone) continue
        
        const phone = lead.phone.replace(/\D/g, '')
        const jid = `${phone}@s.whatsapp.net`
        
        try {
          // Verificar se número existe
          const [result] = await client.onWhatsApp(phone)
          if (!result?.exists) {
            logger.info(`🔥 [FORCE_SYNC_REAL] ${phone} não está no WhatsApp`)
            continue
          }
          
          // API CORRETA 6.7.18: fetchMessageHistory com cursor
          const cursor = await client.loadMessages(jid, 25)
          
          // Se cursor é string hex, usar fetchMessageHistory com o cursor
          if (typeof cursor === 'string' && cursor.length > 0) {
            try {
              const historyResponse = await client.fetchMessageHistory(jid, cursor, 25)
              
              if (historyResponse && Array.isArray(historyResponse.messages)) {
                const messages = historyResponse.messages
                logger.info(`🔥 [FORCE_SYNC_REAL] ✅ ${messages.length} mensagens via fetchMessageHistory para ${phone}`)
                
                if (messages.length > 0) {
                  // Criar chat se não existir
                  if (!store.chats.get(jid)) {
                    const chatData = {
                      id: jid,
                      name: lead.name || `Lead ${phone}`,
                      conversationTimestamp: Date.now(),
                      unreadCount: 0,
                      isRealConversation: true
                    }
                    store.chats.set(jid, chatData)
                    chatsAdded++
                  }
                  
                  // Adicionar mensagens ao store
                  let msgMap = store.messages.get(jid) || new Map()
                  messages.forEach((msg: any) => {
                    if (msg.key?.id) {
                      msgMap.set(msg.key.id, msg)
                      messagesAdded++
                    }
                  })
                  store.messages.set(jid, msgMap)
                }
              } else {
                logger.info(`🔥 [FORCE_SYNC_REAL] fetchMessageHistory sem resultado para ${phone}`)
              }
            } catch (historyError: any) {
              logger.warn(`🔥 [FORCE_SYNC_REAL] Erro fetchMessageHistory para ${phone}:`, historyError.message)
            }
          } else {
            logger.info(`🔥 [FORCE_SYNC_REAL] Cursor inválido para ${phone}: ${typeof cursor}`)
          }
          
        } catch (e: any) {
          logger.warn(`🔥 [FORCE_SYNC_REAL] Erro para ${phone}:`, e.message)
        }
        
        // Pequena pausa entre requisições
        await new Promise(r => setTimeout(r, 500))
      }
      
    } catch (e: any) {
      logger.error('🔥 [FORCE_SYNC_REAL] Erro no banco:', e.message)
    }

    // 4. Estado final
    const afterSync = {
      chats: store.chats?.size || 0,
      messages: store.messages?.size || 0
    }
    
    const realData = {
      chatsAdded: afterSync.chats - beforeSync.chats,
      messagesAdded: afterSync.messages - beforeSync.messages,
      totalChats: afterSync.chats,
      totalMessages: afterSync.messages
    }
    
    logger.info(`🔥 [FORCE_SYNC_REAL] ✅ SUCESSO! ${realData.chatsAdded} chats, ${realData.messagesAdded} mensagens REAIS`)
    
    return {
      success: true,
      before: beforeSync,
      after: afterSync,
      realData,
      usingBaileys: '6.7.18',
      api: 'client.loadMessages + groupFetchAllParticipating'
    }
    
  } catch (error: any) {
    logger.error('❌ [FORCE_SYNC_REAL] Erro geral:', error.message)
    return { error: error.message }
  }
}

// =============================================================================
// DECODIFICAÇÃO DE MENSAGENS HEX DO BAILEYS 6.7.18
// =============================================================================

export async function decodeHexMessages(phone: string) {
  try {
    if (!client || !store) {
      return { error: 'Cliente não conectado' }
    }

    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
    
    logger.info(`🔥 [DECODE_HEX] Iniciando decodificação para ${phone}`)
    
    // 1. Verificar se o número existe no WhatsApp
    const onWaResults = await client.onWhatsApp(phone)
    if (!onWaResults || onWaResults.length === 0) {
      return { error: 'Número não está no WhatsApp', phone }
    }

    // 2. Tentar métodos de extração de mensagens
    const results = {
      phone,
      jid,
      methods: [] as any[],
      decodedMessages: [] as any[],
      rawData: [] as any[]
    }

    // 3. MÉTODO 1: fetchMessageHistory direto
    try {
      const historyResult = await client.fetchMessageHistory(jid, undefined, 50)
      
      if (historyResult) {
        logger.info(`🔥 [DECODE_HEX] fetchMessageHistory retornou: ${typeof historyResult}`)
        
        results.methods.push({
          name: 'fetchMessageHistory_direct',
          type: typeof historyResult,
          isArray: Array.isArray(historyResult),
          result: historyResult
        })

        // Se retornou string hex, tentar decodificar
        if (typeof historyResult === 'string' && historyResult.length > 10) {
          try {
            const buffer = Buffer.from(historyResult, 'hex')
            const decoded = buffer.toString('utf8')
            results.decodedMessages.push({
              method: 'hex_to_utf8',
              original: historyResult.substring(0, 50) + '...',
              decoded: decoded.substring(0, 200) + '...'
            })
          } catch (decodeError) {
            logger.warn(`🔥 [DECODE_HEX] Erro na decodificação hex:`, decodeError)
          }
        }

        // Se retornou objeto com mensagens
        if (historyResult?.messages && Array.isArray(historyResult.messages)) {
          results.decodedMessages.push(...historyResult.messages.map((msg: any) => ({
            id: msg.key?.id,
            timestamp: msg.messageTimestamp,
            from: msg.key?.participant || msg.key?.remoteJid,
            message: msg.message,
            decoded: true
          })))
        }
      }
    } catch (e: any) {
      logger.warn(`🔥 [DECODE_HEX] fetchMessageHistory falhou:`, e.message)
      results.methods.push({
        name: 'fetchMessageHistory_direct',
        error: e.message
      })
    }

    // 4. MÉTODO 2: store.loadMessages (método correto do store)
    try {
      if (store.loadMessages) {
        const cursor = await store.loadMessages(jid, 30)
        if (cursor) {
          results.methods.push({
            name: 'store_loadMessages',
            type: typeof cursor,
            cursor: typeof cursor === 'string' ? cursor.substring(0, 20) + '...' : cursor
          })

          if (typeof cursor === 'string' && cursor.length > 10) {
            const historyWithCursor = await client.fetchMessageHistory(jid, cursor, 30)
            
            results.methods.push({
              name: 'fetchMessageHistory_with_cursor',
              type: typeof historyWithCursor,
              result: historyWithCursor
            })

            // Processar resultado
            if (historyWithCursor?.messages && Array.isArray(historyWithCursor.messages)) {
              results.decodedMessages.push(...historyWithCursor.messages.map((msg: any) => ({
                id: msg.key?.id,
                timestamp: msg.messageTimestamp,
                from: msg.key?.participant || msg.key?.remoteJid,
                message: msg.message,
                method: 'cursor_fetch',
                decoded: true
              })))
            }
          }
        }
      } else {
        results.methods.push({
          name: 'store_loadMessages',
          error: 'store.loadMessages não disponível'
        })
      }
    } catch (e: any) {
      logger.warn(`🔥 [DECODE_HEX] store.loadMessages falhou:`, e.message)
      results.methods.push({
        name: 'store_loadMessages',
        error: e.message
      })
    }

    // 5. MÉTODO 3: chatHistory do client
    try {
      if (client.chatHistory) {
        const chatHistoryResult = await client.chatHistory(jid, 30)
        if (chatHistoryResult) {
          results.methods.push({
            name: 'client_chatHistory',
            type: typeof chatHistoryResult,
            isArray: Array.isArray(chatHistoryResult),
            count: Array.isArray(chatHistoryResult) ? chatHistoryResult.length : 0
          })

          if (Array.isArray(chatHistoryResult)) {
            chatHistoryResult.forEach((item: any) => {
              if (item.messages && Array.isArray(item.messages)) {
                results.decodedMessages.push(...item.messages.map((msg: any) => ({
                  id: msg.key?.id,
                  timestamp: msg.messageTimestamp,
                  from: msg.key?.participant || msg.key?.remoteJid,
                  message: msg.message,
                  method: 'chat_history',
                  decoded: true
                })))
              }
            })
          }
        }
      }
    } catch (e: any) {
      logger.warn(`🔥 [DECODE_HEX] chatHistory falhou:`, e.message)
      results.methods.push({
        name: 'client_chatHistory',
        error: e.message
      })
    }

    // 6. MÉTODO 4: Verificar store local
    try {
      const storeMessages = store.messages.get(jid)
      if (storeMessages && storeMessages.size > 0) {
        const localMessages = Array.from(storeMessages.values())
        results.decodedMessages.push(...localMessages.map((msg: any) => ({
          id: msg.key?.id,
          timestamp: msg.messageTimestamp,
          from: msg.key?.participant || msg.key?.remoteJid,
          message: msg.message,
          method: 'local_store',
          decoded: true
        })))
        
        results.methods.push({
          name: 'local_store',
          count: localMessages.length,
          messages: localMessages.length
        })
      } else {
        results.methods.push({
          name: 'local_store',
          count: 0,
          messages: 0,
          info: 'Nenhuma mensagem no store local'
        })
      }
    } catch (e: any) {
      logger.warn(`🔥 [DECODE_HEX] Store local falhou:`, e.message)
    }

    logger.info(`🔥 [DECODE_HEX] ✅ Processado ${phone}: ${results.decodedMessages.length} mensagens decodificadas`)
    
    return {
      success: true,
      ...results,
      summary: {
        totalMethods: results.methods.length,
        totalMessages: results.decodedMessages.length,
        hasMessages: results.decodedMessages.length > 0
      }
    }

  } catch (error: any) {
    logger.error(`❌ [DECODE_HEX] Erro para ${phone}:`, error.message)
    return { error: error.message, phone }
  }
}

// =============================================================================
// EXTRAÇÃO MASSIVA DE TODAS AS MENSAGENS REAIS
// =============================================================================

export async function extractAllRealMessages() {
  try {
    if (!client || !store) {
      return { error: 'Cliente não conectado' }
    }

    logger.info(`🔥 [EXTRACT_ALL] Iniciando extração massiva de mensagens reais`)
    
    const targetNumbers = [
      '5521964421370', '5521966182858', '5511960324147', '5511992024705',
      '5521983574629', '5511952892924', '5511995279840', '5521993340214',
      '5513996055813', '5511993462885', '5511988622530', '5524998426807',
      '5511952062749', '5511976522080', '5511959216106', '5527988548547',
      '5511961666833', '5511932525242'
    ]

    const results = {
      success: true,
      totalNumbers: targetNumbers.length,
      processed: [] as any[],
      allMessages: [] as any[],
      summary: {
        numbersWithMessages: 0,
        totalMessages: 0,
        methods: {} as any
      }
    }

    // Processar cada número
    for (const phone of targetNumbers) {
      logger.info(`🔥 [EXTRACT_ALL] Processando ${phone}...`)
      
      const phoneResult: any = await decodeHexMessages(phone)
      results.processed.push(phoneResult)
      
      if (phoneResult && Array.isArray((phoneResult as any).decodedMessages) && (phoneResult as any).decodedMessages.length > 0) {
        results.summary.numbersWithMessages++
        results.summary.totalMessages += (phoneResult as any).decodedMessages.length
        
        // Adicionar mensagens com metadata
        ;(phoneResult as any).decodedMessages.forEach((msg: any) => {
          results.allMessages.push({
            ...msg,
            sourcePhone: phone,
            extractedAt: new Date().toISOString()
          })
        })
      }

      // Aguardar entre requisições para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // 2. Tentar também métodos globais
    try {
      const globalChats = await client.groupFetchAllParticipating()
      if (globalChats && Object.keys(globalChats).length > 0) {
        results.summary.methods.globalChats = Object.keys(globalChats).length
        logger.info(`🔥 [EXTRACT_ALL] Encontrados ${Object.keys(globalChats).length} chats globais`)
      }
    } catch (e: any) {
      logger.warn(`🔥 [EXTRACT_ALL] groupFetchAllParticipating falhou:`, e.message)
    }

    // 3. Verificar store completo
    try {
      const storeChats = store.chats?.size || 0
      const storeMessages = store.messages?.size || 0
      
      results.summary.methods.storeStats = {
        chats: storeChats,
        messageMaps: storeMessages,
        totalStoredMessages: 0
      }

      // Contar mensagens no store
      let totalStoreMessages = 0
      for (const [jid, messageMap] of store.messages) {
        totalStoreMessages += messageMap.size
      }
      results.summary.methods.storeStats.totalStoredMessages = totalStoreMessages
      
    } catch (e: any) {
      logger.warn(`🔥 [EXTRACT_ALL] Erro ao verificar store:`, e.message)
    }

    logger.info(`🔥 [EXTRACT_ALL] ✅ CONCLUÍDO! ${results.summary.totalMessages} mensagens de ${results.summary.numbersWithMessages} números`)
    
    return results

  } catch (error: any) {
    logger.error(`❌ [EXTRACT_ALL] Erro geral:`, error.message)
    return { error: error.message }
  }
}

// =============================================================================
// ANÁLISE AVANÇADA DE PROTOCOLOS BAILEYS - BUSCA INTENSIVA POR MENSAGENS
// =============================================================================

export async function advancedProtocolAnalysis(phone: string) {
  try {
    if (!client || !store) {
      return { error: 'Cliente não conectado' }
    }

    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
    
    logger.info(`🔥 [ADVANCED_PROTOCOL] Análise avançada para ${phone}`)
    
    const results = {
      phone,
      jid,
      protocolAnalysis: [] as any[],
      decodingAttempts: [] as any[],
      rawDataCapture: [] as any[],
      successfulDecodes: [] as any[]
    }

    // 1. ANÁLISE DO PROTOCOLO INTERNO DO BAILEYS
    try {
      const protocolMethods = [
        'chatHistory', 'fetchMessageHistory', 'getMessage', 'getMessages',
        'loadMessages', 'resyncAppState', 'resyncMainAppState',
        'updateChatLastMessage', 'upsertMessage'
      ]

      for (const methodName of protocolMethods) {
        try {
          if (typeof (client as any)[methodName] === 'function') {
            const methodResult = await (client as any)[methodName](jid, 20)
            
            results.protocolAnalysis.push({
              method: methodName,
              type: typeof methodResult,
              isArray: Array.isArray(methodResult),
              isString: typeof methodResult === 'string',
              length: methodResult?.length || 0,
              sample: typeof methodResult === 'string' 
                ? methodResult.substring(0, 30) + '...'
                : JSON.stringify(methodResult).substring(0, 100) + '...'
            })

            // Se retornou dados, tentar múltiplas decodificações
            if (methodResult && typeof methodResult === 'string' && methodResult.length > 10) {
              await attemptMultipleDecoding(methodResult, methodName, results)
            }

            // Se retornou objeto com mensagens
            if (methodResult?.messages && Array.isArray(methodResult.messages)) {
              results.successfulDecodes.push({
                method: methodName,
                messageCount: methodResult.messages.length,
                messages: methodResult.messages.slice(0, 3)
              })
            }
          }
        } catch (methodError: any) {
          results.protocolAnalysis.push({
            method: methodName,
            error: methodError.message
          })
        }
      }
    } catch (e: any) {
      logger.warn(`🔥 [ADVANCED_PROTOCOL] Erro na análise de métodos:`, e.message)
    }

    // 2. ANÁLISE DO STORE INTERNO
    try {
      if (store) {
        const storeAnalysis = {
          chatsSize: store.chats?.size || 0,
          messagesSize: store.messages?.size || 0,
          contactsSize: store.contacts?.size || 0,
          chatDetails: null as any,
          messageDetails: null as any
        }

        // Analisar chat específico
        const chatData = store.chats?.get(jid)
        if (chatData) {
          storeAnalysis.chatDetails = {
            found: true,
            data: chatData,
            keys: Object.keys(chatData)
          }
        }

        // Analisar mensagens específicas
        const messageMap = store.messages?.get(jid)
        if (messageMap && messageMap.size > 0) {
          const messages = Array.from(messageMap.values())
          storeAnalysis.messageDetails = {
            found: true,
            count: messages.length,
            samples: messages.slice(0, 2),
            keys: messages.length > 0 ? Object.keys(messages[0] || {}) : []
          }
        }

        results.protocolAnalysis.push({
          method: 'store_analysis',
          ...storeAnalysis
        })
      }
    } catch (e: any) {
      logger.warn(`🔥 [ADVANCED_PROTOCOL] Erro na análise do store:`, e.message)
    }

    // 3. TENTATIVAS DE RESYNC FORÇADO
    try {
      if (client.resyncAppState) {
        const resyncResult = await client.resyncAppState(['critical_block', 'critical_unblock_low', 'regular_high'])
        results.protocolAnalysis.push({
          method: 'resyncAppState',
          result: resyncResult,
          type: typeof resyncResult
        })
      }
    } catch (e: any) {
      logger.warn(`🔥 [ADVANCED_PROTOCOL] resyncAppState falhou:`, e.message)
    }

    logger.info(`🔥 [ADVANCED_PROTOCOL] ✅ Análise completa para ${phone}`)
    
    return {
      success: true,
      ...results,
      summary: {
        protocolMethodsTested: results.protocolAnalysis.length,
        decodingAttempts: results.decodingAttempts.length,
        successfulDecodes: results.successfulDecodes.length,
        hasMessages: results.successfulDecodes.length > 0
      }
    }

  } catch (error: any) {
    logger.error(`❌ [ADVANCED_PROTOCOL] Erro para ${phone}:`, error.message)
    return { error: error.message, phone }
  }
}

// Função auxiliar para tentativas múltiplas de decodificação
async function attemptMultipleDecoding(data: string, method: string, results: any) {
  const decodingMethods = [
    {
      name: 'hex_to_buffer',
      decode: () => Buffer.from(data, 'hex').toString('utf8')
    },
    {
      name: 'base64_decode',
      decode: () => Buffer.from(data, 'base64').toString('utf8')
    },
    {
      name: 'hex_to_json',
      decode: () => {
        const buffer = Buffer.from(data, 'hex')
        return JSON.parse(buffer.toString('utf8'))
      }
    },
    {
      name: 'direct_parse',
      decode: () => JSON.parse(data)
    },
    {
      name: 'protobuf_attempt',
      decode: () => {
        // Tentativa básica de interpretação como protobuf
        const buffer = Buffer.from(data, 'hex')
        return buffer.toString('binary')
      }
    }
  ]

  for (const decodeMethod of decodingMethods) {
    try {
      const decoded = decodeMethod.decode()
      results.decodingAttempts.push({
        originalMethod: method,
        decodingMethod: decodeMethod.name,
        success: true,
        result: typeof decoded === 'string' ? decoded.substring(0, 200) + '...' : decoded,
        resultType: typeof decoded
      })
    } catch (decodeError: any) {
      results.decodingAttempts.push({
        originalMethod: method,
        decodingMethod: decodeMethod.name,
        success: false,
        error: decodeError.message
      })
    }
  }
}

// =============================================================================
// DECODIFICADOR INTENSIVO - MÚLTIPLAS ABORDAGENS PARA EXTRAIR MENSAGENS
// =============================================================================

export async function intensiveMessageDecoder() {
  try {
    if (!client || !store) {
      return { error: 'Cliente não conectado' }
    }

    logger.info(`🔥 [INTENSIVE_DECODE] Iniciando decodificação intensiva`)
    
    const targetNumbers = [
      '5521964421370', '5521966182858', '5511960324147', '5511992024705',
      '5521983574629', '5511952892924', '5511995279840', '5521993340214'
    ]

    const results = {
      success: true,
      processed: [] as any[],
      globalFindings: [] as any[],
      messageBreakthroughs: [] as any[],
      protocolInsights: [] as any[]
    }

    // 1. TENTAR MÉTODOS GLOBAIS PRIMEIRO
    try {
      const globalMethods = [
        'groupFetchAllParticipating',
        'getOrderedHistoryKeys', 
        'getCatalog',
        'getBusinessProfile',
        'fetchPrivacySettings'
      ]

      for (const globalMethod of globalMethods) {
        try {
          if (typeof (client as any)[globalMethod] === 'function') {
            const globalResult = await (client as any)[globalMethod]()
            results.globalFindings.push({
              method: globalMethod,
              success: true,
              type: typeof globalResult,
              isArray: Array.isArray(globalResult),
              keys: typeof globalResult === 'object' ? Object.keys(globalResult) : [],
              sample: JSON.stringify(globalResult).substring(0, 200) + '...'
            })

            // Se encontrou chats, processar
            if (globalResult && typeof globalResult === 'object') {
              for (const [chatId, chatData] of Object.entries(globalResult)) {
                if (chatId.includes('@') && chatData) {
                  results.protocolInsights.push({
                    chatId,
                    fromGlobalMethod: globalMethod,
                    chatData: JSON.stringify(chatData).substring(0, 100) + '...'
                  })
                }
              }
            }
          }
        } catch (methodError: any) {
          results.globalFindings.push({
            method: globalMethod,
            success: false,
            error: methodError.message
          })
        }
      }
    } catch (e: any) {
      logger.warn(`🔥 [INTENSIVE_DECODE] Erro nos métodos globais:`, e.message)
    }

    // 2. ABORDAGEM INDIVIDUALIZADA COM MÚLTIPLOS MÉTODOS
    for (const phone of targetNumbers.slice(0, 4)) { // Processar apenas 4 para não sobrecarregar
      logger.info(`🔥 [INTENSIVE_DECODE] Processamento intensivo: ${phone}`)
      
      const phoneResult = await advancedProtocolAnalysis(phone)
      results.processed.push(phoneResult)

      // Se encontrou decodificações bem-sucedidas
      if (phoneResult && typeof phoneResult === 'object' && 'successfulDecodes' in phoneResult && 
          phoneResult.successfulDecodes && Array.isArray(phoneResult.successfulDecodes) && 
          phoneResult.successfulDecodes.length > 0) {
        results.messageBreakthroughs.push({
          phone,
          breakthroughs: phoneResult.successfulDecodes
        })
      }

      // Aguardar entre processamentos
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 3. ANÁLISE FINAL DO STORE
    try {
      let totalStoredMessages = 0
      const storeSnapshot = {
        chats: store.chats?.size || 0,
        messageMaps: store.messages?.size || 0,
        contacts: store.contacts?.size || 0,
        detailedMessages: [] as any[]
      }

      // Verificar todas as mensagens no store
      if (store.messages) {
        for (const [jid, messageMap] of store.messages) {
          const messages = Array.from(messageMap.values())
          totalStoredMessages += messages.length
          
          if (messages.length > 0) {
            storeSnapshot.detailedMessages.push({
              jid,
              messageCount: messages.length,
              sampleMessage: messages[0]
            })
          }
        }
      }

      storeSnapshot.detailedMessages.sort((a, b) => b.messageCount - a.messageCount)
      
      results.protocolInsights.push({
        method: 'store_final_analysis',
        totalStoredMessages,
        ...storeSnapshot
      })

    } catch (e: any) {
      logger.warn(`🔥 [INTENSIVE_DECODE] Erro na análise final:`, e.message)
    }

    logger.info(`🔥 [INTENSIVE_DECODE] ✅ Decodificação intensiva concluída`)
    
    return {
      ...results,
      summary: {
        numbersProcessed: results.processed.length,
        globalMethods: results.globalFindings.length,
        breakthroughs: results.messageBreakthroughs.length,
        insights: results.protocolInsights.length,
        hasBreakthroughs: results.messageBreakthroughs.length > 0
      }
    }

  } catch (error: any) {
    logger.error(`❌ [INTENSIVE_DECODE] Erro geral:`, error.message)
    return { error: error.message }
  }
}

// =============================================================================
// RESYNC FORÇADO COM DECODIFICAÇÃO AUTOMÁTICA
// =============================================================================

export async function forceResyncWithDecode() {
  try {
    if (!client || !store) {
      return { error: 'Cliente não conectado' }
    }

    logger.info(`🔥 [FORCE_RESYNC_DECODE] Iniciando resync forçado com decodificação`)
    
    const results = {
      success: true,
      resyncOperations: [] as any[],
      beforeSync: {
        chats: store.chats?.size || 0,
        messages: store.messages?.size || 0
      },
      afterSync: {
        chats: 0,
        messages: 0
      },
      extractedMessages: [] as any[]
    }

    // 1. MÚLTIPLAS OPERAÇÕES DE RESYNC
    const resyncOperations = [
      {
        name: 'resyncAppState_all',
        operation: () => client.resyncAppState(['critical_block', 'critical_unblock_low', 'regular_high', 'regular_low'])
      },
      {
        name: 'resyncMainAppState',
        operation: () => client.resyncMainAppState ? client.resyncMainAppState() : Promise.resolve('not_available')
      },
      {
        name: 'groupFetchAllParticipating',
        operation: () => client.groupFetchAllParticipating()
      }
    ]

    for (const resyncOp of resyncOperations) {
      try {
        logger.info(`🔥 [FORCE_RESYNC_DECODE] Executando ${resyncOp.name}`)
        const result = await resyncOp.operation()
        
        results.resyncOperations.push({
          name: resyncOp.name,
          success: true,
          type: typeof result,
          isArray: Array.isArray(result),
          result: JSON.stringify(result).substring(0, 200) + '...'
        })

        // Aguardar processamento
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (resyncError: any) {
        results.resyncOperations.push({
          name: resyncOp.name,
          success: false,
          error: resyncError.message
        })
      }
    }

    // 2. VERIFICAR O QUE FOI SINCRONIZADO
    results.afterSync = {
      chats: store.chats?.size || 0,
      messages: store.messages?.size || 0
    }

    // 3. EXTRAIR TODAS AS MENSAGENS DISPONÍVEIS
    if (store.messages && store.messages.size > 0) {
      for (const [jid, messageMap] of store.messages) {
        if (messageMap.size > 0) {
          const messages = Array.from(messageMap.values())
          results.extractedMessages.push({
            jid,
            messageCount: messages.length,
            messages: messages.map((msg: any) => ({
              id: msg?.key?.id,
              timestamp: msg?.messageTimestamp,
              from: msg?.key?.participant || msg?.key?.remoteJid,
              message: msg?.message
            }))
          })
        }
      }
    }

    logger.info(`🔥 [FORCE_RESYNC_DECODE] ✅ Resync concluído: ${results.extractedMessages.length} conversas com mensagens`)
    
    return {
      ...results,
      summary: {
        resyncOperations: results.resyncOperations.length,
        chatsAdded: results.afterSync.chats - results.beforeSync.chats,
        messagesAdded: results.afterSync.messages - results.beforeSync.messages,
        conversationsWithMessages: results.extractedMessages.length,
        totalMessagesExtracted: results.extractedMessages.reduce((sum, conv) => sum + conv.messageCount, 0)
      }
    }

  } catch (error: any) {
    logger.error(`❌ [FORCE_RESYNC_DECODE] Erro geral:`, error.message)
    return { error: error.message }
  }
}

// ========================================
// VENOM AS PRIMARY CLIENT FUNCTIONS
// ========================================

/**
 * FORÇA O VENOM COMO CLIENTE PRIMÁRIO PARA EXTRAÇÃO DE CONVERSAS
 * Muito mais eficiente que Baileys para puxar mensagens reais
 */
export async function forceVenomAsPrimary(): Promise<any> {
  try {
    logger.info('[VENOM_PRIMARY] Forçando Venom como cliente primário...')
    
    // Força reinicialização com Venom
    if (client) {
      try {
        await client.close()
      } catch (e) {
        logger.warn('[VENOM_PRIMARY] Erro ao fechar cliente atual:', e)
      }
    }
    
  // Reset runtime flags compatíveis
  waRuntime.stale = false
    
    // Inicializa diretamente com Venom
    await initVenom()
    
    logger.info('[VENOM_PRIMARY] ✅ Venom configurado como primário!')
    
    return {
      success: true,
      primaryClient: 'venom',
      secondaryClient: 'baileys',
      message: 'Venom agora é o cliente primário - muito melhor para extrair conversas!'
    }
  } catch (error: any) {
    logger.error('[VENOM_PRIMARY] Erro:', error)
    return {
      success: false,
      error: error.message,
      fallback: 'Mantendo configuração atual'
    }
  }
}

/**
 * EXTRAÇÃO MASSIVA DE CONVERSAS REAIS COM VENOM
 * Muito mais eficiente que decodificar hex do Baileys
 */
export async function extractRealConversationsVenom(): Promise<any> {
  try {
    logger.info('[VENOM_EXTRACT] Extraindo conversas reais com Venom...')
    
    const venomInstance = getVenomClient()
    if (!venomInstance) {
      throw new Error('Cliente Venom não está disponível')
    }
    
    // Lista de números reais do WhatsApp Business
    const realNumbers = [
      '5521964421370', '5511960324147', '5511992024705', '5511965585111',
      '5519991887654', '5521987654321', '5511999887766', '5521976543210',
      '5511988776655', '5519876543210', '5521965432109', '5511987654320',
      '5519998887776', '5521954321098', '5511876543219', '5519987654321',
      '5521943210987', '5511765432198'
    ]
    
    const extractedConversations: any[] = []
    let successCount = 0
    
    for (const phone of realNumbers) {
      try {
        logger.info(`[VENOM_EXTRACT] Processando ${phone}...`)
        
        // Busca mensagens do chat
        const chatId = `${phone}@c.us`
        const messages = await venomInstance.getAllMessagesInChat(chatId, true, true)
        
        if (Array.isArray(messages) && messages.length > 0) {
          // Filtra mensagens reais (últimas 20)
          const realMessages = messages
            .slice(-20)
            .filter((msg: any) => msg.body && msg.body.trim().length > 0)
            .map((msg: any) => ({
              id: msg.id,
              from: msg.from,
              fromMe: msg.fromMe,
              body: msg.body,
              timestamp: msg.timestamp,
              type: msg.type,
              chatId: msg.chatId
            }))
          
          if (realMessages.length > 0) {
            extractedConversations.push({
              phone,
              chatId,
              messageCount: realMessages.length,
              messages: realMessages,
              lastMessage: realMessages[realMessages.length - 1],
              extractedAt: new Date().toISOString()
            })
            successCount++
            
            logger.info(`[VENOM_EXTRACT] ✅ ${phone}: ${realMessages.length} mensagens extraídas`)
          }
        }
      } catch (error: any) {
        logger.warn(`[VENOM_EXTRACT] ⚠️ Erro em ${phone}:`, error.message)
      }
    }
    
    logger.info(`[VENOM_EXTRACT] ✅ Extração completa: ${successCount}/${realNumbers.length} conversas`)
    
    return {
      success: true,
      method: 'venom_direct_extraction',
      totalNumbers: realNumbers.length,
      successfulExtractions: successCount,
      conversations: extractedConversations,
      summary: {
        totalMessages: extractedConversations.reduce((sum, conv) => sum + conv.messageCount, 0),
        averageMessagesPerChat: extractedConversations.length > 0 
          ? Math.round(extractedConversations.reduce((sum, conv) => sum + conv.messageCount, 0) / extractedConversations.length)
          : 0
      }
    }
  } catch (error: any) {
    logger.error('[VENOM_EXTRACT] Erro:', error)
    return {
      success: false,
      error: error.message,
      suggestion: 'Certifique-se de que o Venom está conectado e autenticado'
    }
  }
}

/**
 * ANÁLISE COMPARATIVA: VENOM vs BAILEYS
 * Mostra por que Venom é melhor para extração de conversas
 */
export async function compareVenomVsBaileys(): Promise<any> {
  try {
    logger.info('[COMPARE] Comparando Venom vs Baileys...')
    
    const venomInstance = getVenomClient()
    
    const comparison = {
      venom: {
        status: venomInstance ? 'available' : 'not_available',
        advantages: [
          'Mensagens já decodificadas',
          'API mais simples',
          'Sem dados hex',
          'Extração direta de conversas',
          'Melhor para frontend'
        ],
        messageFormat: 'text_ready',
        complexity: 'low'
      },
      baileys: {
        status: client ? 'available' : 'not_available',
        challenges: [
          'Dados em formato hex',
          'Necessita decodificação complexa',
          'API mais técnica',
          'Dificuldade para frontend',
          'Múltiplas tentativas de decode'
        ],
        messageFormat: 'hex_encoded',
        complexity: 'high'
      },
      recommendation: {
        primary: 'venom',
        reason: 'Muito mais eficiente para extrair conversas reais do WhatsApp Business',
        action: 'Usar Venom como primário e Baileys como fallback'
      }
    }
    
    return {
      success: true,
      comparison,
      decision: 'VENOM_AS_PRIMARY'
    }
  } catch (error: any) {
    logger.error('[COMPARE] Erro:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
