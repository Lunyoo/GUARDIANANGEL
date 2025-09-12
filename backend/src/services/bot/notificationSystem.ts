import { isWhatsAppReady, sendWhatsAppMessage } from './whatsappClient.fixed'
import { getDatabase } from '../../config/database.js'

// Cache para evitar notificações duplicadas
const notificationCache = new Map<string, number>()

class NotificationSystemCore { 
  async monitorHighValueLeads(leadId: string, score: number, expectedValue: number): Promise<void> { 
    console.log(`📊 High value lead monitored: ${leadId}, score: ${score}, value: ${expectedValue}`)
    try {
      const adminPhone = process.env.ADMIN_PHONE?.replace(/\D+/g,'')
      if (adminPhone && isWhatsAppReady() && (expectedValue >= 100 || score >= 0.8)) {
        const msg = `⭐ Lead de alto valor: ${leadId}\nScore: ${(score*100).toFixed(0)}% | Valor estimado: R$ ${expectedValue.toFixed(2).replace('.',',')}`
        await sendWhatsAppMessage(`${adminPhone}@c.us`, msg)
      }
    } catch {}
  } 
  async monitorBotErrors(phone: string, error: string, context?: any): Promise<void> { 
    console.log(`❌ Bot error monitored: ${phone}, error: ${error}`)
    try {
      const adminPhone = process.env.ADMIN_PHONE?.replace(/\D+/g,'')
      if (adminPhone && isWhatsAppReady()) {
        const lines = [
          '🚨 Erro no bot',
          `Lead: ${phone}`,
          `Erro: ${String(error).substring(0, 160)}`
        ]
        await sendWhatsAppMessage(`${adminPhone}@c.us`, lines.join('\n'))
      }
    } catch {}
  } 
}

// Função para notificar admin sobre pedidos finalizados
export async function notifyAdminNewOrder(customerPhone: string, customerCtx: any, lastMessage: string, conversationId?: string) {
  const adminPhone = process.env.ADMIN_PHONE?.replace(/\D+/g,'')
  
  if (!adminPhone) {
    console.log('⚠️  ADMIN_PHONE não configurado - notificação de pedido não será enviada')
    return
  }

  // Verificar se já foi notificado (evitar spam)
  const cacheKey = `order_${customerPhone}`
  if (notificationCache.has(cacheKey)) return

  // Dedupe persistente por dia
  try {
    const db = getDatabase()
    const dayKey = new Date().toISOString().slice(0,10) // YYYY-MM-DD
    const exists = db.prepare('SELECT 1 FROM admin_order_notifications WHERE phone=? AND day_key=? LIMIT 1').get(customerPhone, dayKey)
    if (exists) {
      return
    }
  } catch {}

  try {
    const message = `🛒 *PEDIDO FINALIZADO*

👤 Cliente: ${customerCtx.name || 'Nome não informado'}
📱 Telefone: ${customerPhone}
📝 Última mensagem: "${lastMessage}"

💰 Produto: Calcinha Lipo Modeladora
💵 Oferta Principal: R$ 139,90 (2 unidades)
🚚 Entrega: Pagamento NA ENTREGA

⚡ *AÇÃO NECESSÁRIA:*
Agendar entrega via Hypee`

    await sendWhatsAppMessage(`${adminPhone}@c.us`, message)
    
    // Cache por 24h para evitar duplicatas
    notificationCache.set(cacheKey, Date.now())
    setTimeout(() => notificationCache.delete(cacheKey), 24 * 60 * 60 * 1000)

    console.log(`📬 Notificação de pedido enviada para admin: ${customerPhone}`)

    // Registrar dedupe persistente e estado leve da conversa
    try {
      const db = getDatabase()
      const dayKey = new Date().toISOString().slice(0,10)
      db.prepare('INSERT OR IGNORE INTO admin_order_notifications (phone, conversation_id, day_key, info) VALUES (?,?,?,?)')
        .run(customerPhone, conversationId || null, dayKey, JSON.stringify({ name: customerCtx?.name, city: customerCtx?.city }))
      const state = { stage: 'closing', readyToBuy: true, name: customerCtx?.name, city: customerCtx?.city, lastMessage }
      db.prepare('INSERT INTO conversation_states (phone, data, updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(phone) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP')
        .run(customerPhone, JSON.stringify(state))
    } catch {}
  } catch (error) {
    console.error('❌ Erro ao notificar admin sobre pedido:', error)
  }
}
export const notificationSystem = new NotificationSystemCore()
export class NotificationSystem extends NotificationSystemCore {}
