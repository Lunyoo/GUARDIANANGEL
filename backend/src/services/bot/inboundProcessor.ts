import { getDatabase } from '../../config/database'
import { sendWhatsAppMessage, isWhatsAppReady } from './whatsappClient.fixed.js'

// Tipo das mensagens processadas
interface InboundMessage {
  phone: string
  text: string
  mediaUrl?: string
  mediaType?: string
}

export async function processInbound(phone: string, text: string = '', mediaUrl?: string, mediaType?: string) {
  const cleanPhone = (phone || '').replace(/\D/g, '')
  const msgId = `wa_${Date.now()}_${Math.floor(Math.random() * 10000)}`

  try {
    const db = getDatabase()

    // 1. Verifica duplicação
    const existing = db.prepare('SELECT id FROM messages WHERE id = ?').get(msgId)
    if (existing) {
      return { status: 'duplicate' }
    }

    // 2. Cria ou busca lead
    let lead = db.prepare('SELECT id FROM leads WHERE phone = ?').get(cleanPhone) as any
    if (!lead) {
      const leadId = `lead_${cleanPhone}`
      db.prepare('INSERT INTO leads (id, phone, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(leadId, cleanPhone)
      lead = { id: leadId }
    }

    // 3. Cria ou busca conversa
    let conversation = db.prepare('SELECT id, bot_enabled FROM conversations WHERE lead_id = ? AND status = ?').get(lead.id, 'active') as any
    if (!conversation) {
      const conversationId = `conv_${Date.now()}`
      db.prepare('INSERT INTO conversations (id, lead_id, status, bot_enabled, created_at, updated_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(conversationId, lead.id, 'active')
      conversation = { id: conversationId, bot_enabled: 1 }
    }

    // 4. Salva inbound
    db.prepare(`
      INSERT INTO messages (id, lead_id, conversation_id, direction, type, content, created_at)
      VALUES (?, ?, ?, 'inbound', 'text', ?, CURRENT_TIMESTAMP)
    `).run(msgId, lead.id, conversation.id, text)
    console.log(`📥 Inbound salvo: ${msgId}`)

    // 5. Verifica se o bot está habilitado para esta conversa
    if (!conversation.bot_enabled) {
      console.log(`🤖 Bot desabilitado para conversa ${conversation.id} - pulando resposta automática`)
      return { success: true, response: null, botEnabled: false }
    }

    // 6. Gera resposta do bot (MAIS HUMANO e NATURAL)
    const buildBotResponse = (raw: string) => {
      const t = String(raw || '').toLowerCase().normalize('NFD').replace(/[^\w\s]/g, '')
      const trimmed = (raw || '').trim()
      
      if (!trimmed) return 'Oi! Tudo bem? Em que posso te ajudar hoje? 😊'
      
      if (/\b(oi|ola|opa|e ai|e aí|bom dia|boa tarde|boa noite)\b/.test(t)) {
        const greetings = [
          'Oi! Tudo bem? 😊 Em que posso te ajudar?',
          'Olá! Como posso te ajudar hoje? 💙',
          'Oi! Bem-vinda! No que posso te ajudar?'
        ]
        return greetings[Math.floor(Math.random() * greetings.length)]
      }
      
      if (/(preco|preço|valor|custa|quanto)/.test(t)) {
        return '💰 Oi! Temos algumas promoções bem legais rolando. Quer dar uma olhada nos nossos produtos? Te mando as opções! 😉'
      }
      
      if (/(entrega|frete|prazo|envio|correio|sedex)/.test(t)) {
        return '🚚 Sobre entrega, atendemos todo Brasil! Se me passar seu CEP, posso calcular certinho o prazo e valor para você.'
      }
      
      if (/(produto|calcinha|modeladora|lingerie)/.test(t)) {
        return '✨ Ah, você quer saber dos nossos produtos! Temos calcinhas modeladoras incríveis. Qual seu interesse? Modelagem, conforto, ou algum modelo específico?'
      }
      
      if (/(tamanho|tam|size)/.test(t)) {
        return '📏 Sobre tamanhos, trabalhamos do P ao GG! Quer que eu te ajude a escolher o tamanho ideal? Me conta sua numeração atual!'
      }
      
      // Resposta padrão mais natural
      return `Entendi! ${trimmed.length > 20 ? 'Sobre isso que você falou' : 'Sobre sua pergunta'}, posso te ajudar sim! Me conta mais detalhes do que você procura? 😊`
    }
    const botResponse = buildBotResponse(text)

    // 7. Salva outbound
    const outMsgId = `${msgId}_out`
    db.prepare(`
      INSERT INTO messages (id, lead_id, conversation_id, direction, type, content, created_at)
      VALUES (?, ?, ?, 'outbound', 'text', ?, CURRENT_TIMESTAMP)
    `).run(outMsgId, lead.id, conversation.id, botResponse)
    console.log(`📤 Outbound salvo: ${outMsgId}`)

    // 8. Envia via WhatsApp (Baileys facade)
    try {
      const ready = isWhatsAppReady()
      if (!ready) {
        console.warn('⚠️ WhatsApp não está pronto para envio (isWhatsAppReady=false)')
      }
      await sendWhatsAppMessage(cleanPhone, botResponse)
      console.log(`✅ Resposta enviada: ${botResponse.substring(0, 40)}...`)
    } catch (sendErr: any) {
      console.error('❌ Falha ao enviar resposta via WhatsApp:', sendErr?.message || sendErr)
      return { success: false, response: botResponse, error: 'wa_send_failed' }
    }

    return { success: true, response: botResponse }
  } catch (err) {
    console.error('❌ Erro crítico em processInbound:', err)
    return { success: false }
  }
}
