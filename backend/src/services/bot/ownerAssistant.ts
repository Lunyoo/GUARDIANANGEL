import { sendWhatsAppMessage, isWhatsAppReady } from './whatsappClient.fixed'

export async function notifyOwnerHandoff(
  conversationId: string,
  type: string,
  phone: string,
  context?: string,
  askOwner?: string
): Promise<void> {
  try {
    const adminPhone = process.env.ADMIN_PHONE?.replace(/\D+/g,'')
    if (!adminPhone) return
    const lines: string[] = []
    lines.push(`🛎️ *Assistente requer atenção*`)
    lines.push(`Tipo: ${type}`)
    lines.push(`Lead: ${phone}`)
    if (askOwner) lines.push(`Pergunta IA: ${askOwner}`)
    if (context) lines.push(`Contexto: ${context.substring(0,160)}`)
    lines.push(`Conversa: ${conversationId}`)
    if (isWhatsAppReady()) await sendWhatsAppMessage(`${adminPhone}@c.us`, lines.join('\n'))
  } catch (e){
    console.warn('Falha notifyOwnerHandoff', (e as any)?.message)
  }
}