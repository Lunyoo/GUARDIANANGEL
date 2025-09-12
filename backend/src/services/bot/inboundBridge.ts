import logger from '../../config/logger.js'
// IMPORTAR SEMPRE DO FACADE para garantir MESMA instância (evitar duplicação por diferenças de sufixo .js)
import { waInternalEmitter } from './whatsappClient.fixed'
import { processInbound as processInboundBasic } from './inboundProcessor.js'
import { processInbound as processInboundGPT } from './inboundProcessorGPT.js'

let bound = false

export function bindInboundHandler(){
  if (bound) {
    logger.info('🔗 [BRIDGE] Handler já estava bound, ignorando')
    return
  }
  bound = true
  try {
  logger.info('🔗 [BRIDGE] Binding inbound handler to waInternalEmitter... (token=' + (waInternalEmitter as any)?.__token + ')')
    
    // Cache para evitar mensagens duplicadas por ID único
    const processedMessageIds = new Set<string>()
    
  // 🛡️ TIMESTAMP DO STARTUP DO BOT - usado apenas como referência para filtrar mensagens MUITO antigas.
  // Anteriormente: bloqueava qualquer mensagem >30s antes do startup. Isso era muito agressivo.
  // Novo comportamento: aceitar mensagens até 1h anteriores (útil após reinícios rápidos) e marcar warn somente se >1h sem fromSync.
  const botStartupTime = Date.now()
  logger.info(`🔗 [BRIDGE] Bot startup time: ${new Date(botStartupTime).toISOString()} (janela aceitação retroativa: 1h)`) 
    
  waInternalEmitter.on('inbound-wa', async (msg: any) => {
      logger.info(`🔥 [BRIDGE] *** EVENTO inbound-wa RECEBIDO *** - msg: ${JSON.stringify(msg)}`)
      try {
        logger.info(`[WA] 📬 BRIDGE: Event received from waInternalEmitter: ${JSON.stringify(msg)}`)
        
        // 🛡️ FILTRO ANTI-SPAM: Ignorar mensagens muito antigas (anteriores ao startup)
        const messageTime = msg?.at ? new Date(msg.at).getTime() : Date.now()
        const timeDifference = Date.now() - messageTime
        
        logger.info(`🔍 [BRIDGE] Verificando timestamp - messageTime: ${new Date(messageTime).toISOString()}, botStartup: ${new Date(botStartupTime).toISOString()}, diff: ${timeDifference}ms, fromSync: ${msg?.fromSync || false}`)
        
        // Aceitar mensagens até 1h antes do startup se não forem de sync.
        // Apenas descartar se forem mais antigas que 1h e não originadas de sincronização.
        if (messageTime < (botStartupTime - 3600000) && !msg?.fromSync) {
          logger.warn(`[WA] 🛑 BRIDGE: Mensagem muito antiga (>1h) ignorada (${Math.floor(timeDifference/1000)}s atrás, antes do startup)`) 
          return
        }
        
        // Para mensagens da sincronização, só processar se forem das últimas 24h
        if (msg?.fromSync && timeDifference > (24 * 60 * 60 * 1000)) {
          logger.warn(`[WA] 🛑 BRIDGE: Mensagem da sincronização muito antiga (${Math.floor(timeDifference/(60*60*1000))}h atrás)`)
          return
        }
        
        // ✅ DEDUPLICAÇÃO POR ID ÚNICO - Evita mensagens repetidas do Baileys
        const messageId = msg?.id
        logger.info(`🔍 [BRIDGE] Verificando duplicação - messageId: ${messageId}, já processado: ${messageId ? processedMessageIds.has(messageId) : 'N/A'}`)
        if (messageId && processedMessageIds.has(messageId)) {
          logger.warn(`[WA] 🛑 BRIDGE: Mensagem duplicada ignorada (ID: ${messageId})`)
          return
        }
        if (messageId) {
          processedMessageIds.add(messageId)
          // Limpa IDs antigos (mantém últimos 1000)
          if (processedMessageIds.size > 1000) {
            const entries = Array.from(processedMessageIds)
            entries.slice(0, 500).forEach(id => processedMessageIds.delete(id))
          }
        }
        
  const phone = (msg?.phone || '').replace(/\D+/g,'')
  const text = String((msg?.body ?? msg?.content ?? msg?.text ?? '').toString())
        
        logger.info(`[WA] 📬 BRIDGE: Extracted phone: ${phone}, text: ${text}`)
        
        // Validar número de telefone
        if (!phone) {
          logger.warn('[WA] 📬 BRIDGE: No phone found, skipping')
          return
        }
        
        // Validar se é um número válido (8-15 dígitos, padrões válidos)
        if (phone.length < 8 || phone.length > 15) {
          logger.warn(`[WA] 📬 BRIDGE: 🚫 Número inválido (${phone.length} dígitos): ${phone}`)
          return
        }
        // Observação: não bloquear mais rigorosamente números BR; aceitar variações e normalizar adiante
        
        // Rejeitar padrões inválidos óbvios
        const invalidPatterns = [
          /^(\d)\1+$/, // Todos os dígitos iguais
          /^(55)?0+/,  // Começar com zeros
          /^(55)?1{10,}/, // Muitos 1s seguidos
        ]
        
        for (const pattern of invalidPatterns) {
          if (pattern.test(phone)) {
            logger.warn(`[WA] 📬 BRIDGE: 🚫 Padrão de número inválido: ${phone}`)
            return
          }
        }
        
  logger.info(`🔥 [BRIDGE] *** INICIANDO PROCESSAMENTO *** - phone: +${phone}, text: "${text.slice(0,120)}"`)
  console.log('🧪 BRIDGE - Evento recebido (raw):', msg)
        logger.info(`[WA] Inbound recebido: +${phone} "${text.slice(0,120)}"`)
        // Prefer ConversationGPT pipeline; fallback to basic if it fails
        try {
          logger.info(`🔥 [BRIDGE] Tentando pipeline GPT...`)
          const res = await processInboundGPT(phone, text)
          logger.info(`[WA] 🤖 GPT pipeline OK: ${JSON.stringify({ ok: res?.success !== false, type: (res as any)?.type || 'gpt' })}`)
          logger.info(`🔥 [BRIDGE] *** GPT PIPELINE CONCLUÍDO *** - resultado: ${JSON.stringify(res)}`)
        } catch (e:any) {
          logger.error(`[WA] GPT pipeline falhou: ${e?.message || e}; fallback para básico`)
          logger.error(`🔥 [BRIDGE] Erro no GPT, tentando pipeline básico:`, e?.stack)
          try {
            logger.info(`🔥 [BRIDGE] Tentando pipeline básico...`)
            await processInboundBasic(phone, text)
            logger.info(`🔥 [BRIDGE] *** PIPELINE BÁSICO CONCLUÍDO ***`)
          } catch (e2: any) {
            logger.error(`🔥 [BRIDGE] *** ERRO NO PIPELINE BÁSICO ***:`, e2?.message)
            logger.error(`🔥 [BRIDGE] Stack:`, e2?.stack)
          }
        }
        logger.info(`[WA] 📬 BRIDGE: processamento concluído`)
        logger.info(`🔥 [BRIDGE] *** PROCESSAMENTO FINAL CONCLUÍDO ***`)
      } catch (e: any) {
        logger.error('[WA] Inbound handler error: ' + (e?.message || String(e)))
        logger.error('🔥 [BRIDGE] *** ERRO GERAL NO HANDLER ***:', e?.stack)
      }
    })
    logger.info('✅ Inbound WA → Bot handler bound')
    logger.info('🔥 [BRIDGE] *** HANDLER TOTALMENTE CONFIGURADO ***')
  } catch (e: any) {
    logger.error('❌ Failed to bind inbound handler: ' + (e?.message || String(e)))
    logger.error('🔥 [BRIDGE] *** ERRO AO CONFIGURAR HANDLER ***:', e?.stack)
  }
}