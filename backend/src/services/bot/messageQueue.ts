interface OutboundMsg { id:string; conversationId:string; content:string; msgType:'text'|'media'|'audio'; meta?:any; scheduleAt:number; sent?:boolean; attempts:number }
let dispatcherStarted = false

import { getDatabase } from '../../config/database.js'
import { isWhatsAppReady, sendWhatsAppMessage } from './whatsappClient.fixed'
import { broadcast } from './sse.js'

export async function scheduleOutboundMessage(msg:{ conversationId:string; content:string; msgType:string; meta?:any }, delayMs:number){
  const scheduleAt = Date.now()+delayMs
  const id = Math.random().toString(36).slice(2)
  const db = getDatabase()
  const metaWithDefaults = { ...(msg.meta||{}), phone: (msg.meta?.phone||'') }
  const metaStr = JSON.stringify(metaWithDefaults)
  db.prepare(`INSERT INTO outbound_messages (id, conversation_id, content, msg_type, meta, schedule_at) VALUES (?,?,?,?,?,?)`).run(id, msg.conversationId, msg.content, (msg.msgType||'text'), metaStr, scheduleAt)
  return { ok:true, scheduleAt, id }
}

export function getScheduled(limit=50){
  try {
    const db = getDatabase()
    const rows = db.prepare(`SELECT id, conversation_id as conversationId, content, msg_type as msgType, meta, schedule_at as scheduleAt, sent, attempts FROM outbound_messages WHERE sent=0 ORDER BY schedule_at ASC LIMIT ?`).all(limit) as any[]
    return rows.map(r=>({ ...r, meta: r.meta? JSON.parse(r.meta): undefined }))
  } catch { return [] }
}

export function getQueueStats(){
  try {
    const db = getDatabase()
    const row = db.prepare(`SELECT SUM(CASE WHEN sent=0 THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN sent=1 THEN 1 ELSE 0 END) as sent, COUNT(*) as size FROM outbound_messages`).get() as any
    return { pending: row?.pending||0, sent: row?.sent||0, size: row?.size||0 }
  } catch { return { pending:0, sent:0, size:0 } }
}

// Dispatcher with persistence
export function startOutboundDispatcher(intervalMs=1000){
  if (dispatcherStarted) return
  dispatcherStarted = true
  setInterval(async ()=>{
    if (!isWhatsAppReady()) return
    const db = getDatabase()
    const now = Date.now()
    const due = db.prepare(`SELECT id, conversation_id as conversationId, content, msg_type as msgType, meta FROM outbound_messages WHERE sent=0 AND schedule_at <= ? ORDER BY schedule_at ASC LIMIT 15`).all(now) as any[]
    if (!due.length) return
    for (const row of due){
      try {
        const meta = row.meta? JSON.parse(row.meta): {}
        const target = meta.phone || meta.to || meta.leadPhone || meta.phoneNumber || meta.waId || ''
        // Mirror to messages first (idempotent) so UI shows planned OUT even if WA send fails; reuse queue id for dedupe
        try {
          const type = String(row.msgType || 'text')
          const msgId = `out_${row.id}`
          let leadId: string | null = null
          try {
            const r = db.prepare(`SELECT lead_id FROM conversations WHERE id = ?`).get(row.conversationId) as any
            if (r && typeof r.lead_id === 'string') leadId = r.lead_id
          } catch {}
          db.prepare(`INSERT OR IGNORE INTO messages (id, lead_id, conversation_id, direction, type, content, created_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)`).run(
            msgId,
            leadId,
            row.conversationId,
            'outbound',
            type === 'media' ? 'media' : 'text',
            String(row.content || '')
          )
          db.prepare(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(row.conversationId)
        } catch {}
        // Try to send via WhatsApp
        await sendWhatsAppMessage(target, row.content)
        // Mark queue item as sent
        db.prepare(`UPDATE outbound_messages SET sent=1, sent_at=? WHERE id=?`).run(Date.now(), row.id)
        // Best-effort SSE broadcast for realtime UIs
        try {
          const phoneDigits = String(target || '').replace(/@c\.us$/i,'').replace(/\D+/g,'')
          const phonePretty = phoneDigits ? ('+' + phoneDigits) : undefined
          const at = new Date().toISOString()
          broadcast('wa_message', { conversationId: row.conversationId, phone: phonePretty, direction: 'OUT', body: String(row.content || ''), at })
          broadcast('conversation_updated', { conversationId: row.conversationId, phone: phonePretty, lastMessage: String(row.content || ''), timestamp: at })
        } catch {}
      } catch (e){
        db.prepare(`UPDATE outbound_messages SET attempts = attempts + 1, sent = CASE WHEN attempts+1 > 3 THEN 1 ELSE 0 END WHERE id=?`).run(row.id)
      }
    }
  }, intervalMs)
}
