import { getDatabase } from '../../config/database'
// import { getCachedLeadArms } from './inboundProcessor' // Função removida
import { recordConversion } from '../ml/conversionRecorder'
import { runAdminAssistant } from './adminAssistant'
import { isWhatsAppReady, sendWhatsAppMessage } from './whatsappClient.fixed'

interface CachedArms { pricing?:string; approach?:string; timing?:string; media?:string; closing?:string; script?:string }

class SuperAdminBotCore { 
  private admins = new Set<string>()
  
  constructor() {
    // Adicionar admin phones conhecidos (suporta múltiplos separados por vírgula/espaço)
    const env = String(process.env.ADMIN_PHONE || '').trim()
    if (env) {
      const parts = env.split(/[\s,;]+/).map(p => p.replace(/\D+/g,'')).filter(p => p && p.length > 5)
      for (const p of parts) this.admins.add(p)
    }
    // Adicionar telefones admin específicos conhecidos
    this.admins.add('554199509644') // Admin conhecido
  }
  
  isAdmin(phone:string){ 
    const cleanPhone = phone.replace(/\D+/g,'')
    return this.admins.has(cleanPhone) 
  }
  async processAdminCommand(phone:string, text:string, _mediaUrl?:string){
    const lower = (text||'').trim().toLowerCase()
    
    // 📸 SUPER ADMIN: Suporte a pedidos de foto
    if (/foto|imagem|picture|ver.*imagem|tem.*foto|quero.*ver|mostrar.*foto|enviar.*foto|pode.*mandar.*foto|foto.*da|imagem.*da|ver.*calcinha|foto.*calcinha/.test(lower)) {
      // Retorna intent para que o inboundProcessor envie a imagem
      return '📸 Enviando foto da Calcinha Lipo Modeladora...'
    }

    // Helpers
    const onlyDigits = (s:string)=> s.replace(/\D+/g,'')
    const parsePhone = (s:string)=> {
      const m = s.match(/(\+?\d{10,14})/)
      return m ? onlyDigits(m[1]) : undefined
    }
    const parseDateTime = (s:string)=> {
      // Supports: 28/08 14:30 or 28-08 14:30 or hoje 14:30
      const dm = s.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\s+(\d{1,2}):(\d{2})/)
      const hm = s.match(/\b(hoje|amanh[ãa])\b\s*(\d{1,2}):(\d{2})/)
      const now = new Date()
      if (dm) {
        const d = parseInt(dm[1],10), m = parseInt(dm[2],10)-1
        const y = dm[3]? (dm[3].length===2? 2000+parseInt(dm[3],10) : parseInt(dm[3],10)) : now.getFullYear()
        const hh = parseInt(dm[4],10), mm = parseInt(dm[5],10)
        const dt = new Date(y, m, d, hh, mm, 0, 0)
        return isNaN(dt.getTime())? undefined : dt
      }
      if (hm) {
        const dayOffset = hm[1].startsWith('amanh') ? 1 : 0
        const hh = parseInt(hm[2],10), mm = parseInt(hm[3],10)
        const dt = new Date(now)
        dt.setDate(dt.getDate()+dayOffset)
        dt.setHours(hh, mm, 0, 0)
        return isNaN(dt.getTime())? undefined : dt
      }
      return undefined
    }

    // Admin: agendar pedido e avisar cliente
    if (/\bagend(ar|ado|a)\b/.test(lower)) {
      const customerPhone = parsePhone(text || '')
      const when = parseDateTime(text || '')
      if (!customerPhone || !when) {
        return 'Informe telefone e data/hora. Ex: agendar 28/08 14:00 5511999999999'
      }
      // Persist best-effort em Prisma e/ou rewards
      try {
        const { PrismaClient } = await import('@prisma/client')
        const prisma: any = new PrismaClient()
        if (prisma?.hypeeOrder) {
          const order = await prisma.hypeeOrder.findFirst({ where: { customerPhone }, orderBy: { createdAt: 'desc' } })
          if (order) {
            await prisma.hypeeOrder.update({ where: { id: order.id }, data: { status: 'SCHEDULED', scheduledAt: when } }).catch(()=>{})
          }
        }
      } catch {}
      try {
        const db = getDatabase()
        db.prepare(`INSERT INTO rewards (phone, variant, out_at, note) VALUES (?,?,datetime('now'),?)`).run(customerPhone, 'admin:scheduled', when.toISOString())
      } catch {}
      // Avisar cliente
      try {
        if (isWhatsAppReady()) {
          const hh = String(when.getHours()).padStart(2,'0')
          const mm = String(when.getMinutes()).padStart(2,'0')
          const dd = String(when.getDate()).padStart(2,'0')
          const mo = String(when.getMonth()+1).padStart(2,'0')
          await sendWhatsAppMessage(`${customerPhone}@c.us`, `Seu pedido foi agendado para ${dd}/${mo} ${hh}:${mm}.`)
        }
      } catch {}
      return 'Agendamento registrado e cliente avisado.'
    }

    // Admin: atualizar status do pedido e avisar cliente
    if (/\bstatus\b/.test(lower)) {
      const customerPhone = parsePhone(text || '')
      const statusMatch = lower.match(/\b(created|pending|shipped|delivered|cancelado|cancelled|enviado|criado|pendente)\b/)
      if (!customerPhone || !statusMatch) return 'Uso: status 5511999999999 shipped|delivered|created|pending|cancelado'
      const map: any = { criado:'CREATED', created:'CREATED', pendente:'PENDING', pending:'PENDING', enviado:'SHIPPED', shipped:'SHIPPED', delivered:'DELIVERED', cancelado:'CANCELLED', cancelled:'CANCELLED' }
      const newStatus = map[statusMatch[1]] || statusMatch[1].toUpperCase()
      try {
        const { PrismaClient } = await import('@prisma/client')
        const prisma: any = new PrismaClient()
        if (prisma?.hypeeOrder) {
          const order = await prisma.hypeeOrder.findFirst({ where: { customerPhone }, orderBy: { createdAt: 'desc' } })
          if (order) {
            await prisma.hypeeOrder.update({ where: { id: order.id }, data: { status: newStatus } }).catch(()=>{})
          }
        }
      } catch {}
      try {
        const db = getDatabase()
        db.prepare(`INSERT INTO rewards (phone, variant, out_at, note) VALUES (?,?,datetime('now'),?)`).run(customerPhone, `admin:status:${newStatus}`, '')
      } catch {}
      try {
        if (isWhatsAppReady()) {
          await sendWhatsAppMessage(`${customerPhone}@c.us`, `Status atualizado: ${newStatus}.`)
        }
      } catch {}
      return `Status marcado: ${newStatus}`
    }
    
    // First, try the GPT-4 powered Admin Assistant if available
    try {
      const result = await runAdminAssistant(text || '')
      const db = getDatabase()
      const arms = {} as CachedArms // Função getCachedLeadArms removida - usar default vazio
      switch (result.intent?.type) {
        case 'confirm_delivery': {
          const revenue = result.intent.revenue || 0
          try {
            db.prepare(`INSERT INTO delivery_events (phone, revenue, confirmed_by) VALUES (?,?,?)`).run(phone, revenue, 'admin')
            db.prepare(`UPDATE rewards SET delivered=1, revenue=? WHERE id = (SELECT id FROM rewards WHERE phone=? ORDER BY id DESC LIMIT 1)`).run(revenue, phone)
          } catch {}
          recordConversion({ pricingArmId: arms.pricing, approachArmId: arms.approach, timingArmId: arms.timing, mediaArmId: arms.media, closingArmId: arms.closing, revenue: revenue || 0 })
          return result.reply || `📦 Entrega confirmada${revenue? ' valor R$'+revenue.toFixed(2):''}.`
        }
        case 'record_conversion': {
          const revenue = result.intent.revenue || 0
          recordConversion({ pricingArmId: arms.pricing, approachArmId: arms.approach, timingArmId: arms.timing, mediaArmId: arms.media, closingArmId: arms.closing, revenue })
          try { db.prepare(`INSERT INTO rewards (phone, variant, out_at, delivered, revenue) VALUES (?,?,datetime('now'),1,?)`).run(phone, 'admin:conversion', revenue) } catch {}
          return result.reply || `💰 Conversão registrada${revenue? ' R$'+revenue.toFixed(2):''}.`
        }
        case 'create_order': {
          // Minimal DB marker; full order creation handled elsewhere
          try { db.prepare(`INSERT INTO rewards (phone, variant, out_at, created_order) VALUES (?,?,datetime('now'),1)`).run(phone, 'admin:manual') } catch {}
          return result.reply || '✅ Pedido criado registrado.'
        }
        case 'send_message': {
          const to = (result.intent as any)?.phone
          const content = (result.intent as any)?.content
          if (to && content) {
            const digits = String(to).replace(/\D+/g,'')
            if (isWhatsAppReady()) { try { await sendWhatsAppMessage(`${digits}@c.us`, String(content)) } catch {} }
            return result.reply || 'Mensagem enviada.'
          }
          break
        }
        case 'report': {
          // Build a concise sales/ops report for today and the week using available data, enriched by dailyReporter
          try {
            // 1) Time ranges
            const now = new Date()
            const startToday = new Date(now)
            startToday.setHours(0,0,0,0)
            const startWeek = new Date(now)
            startWeek.setDate(startWeek.getDate() - 7)

            // 2) Prisma orders (if available)
            let ordersToday = 0, deliveredToday = 0, revenueToday = 0
            let pendingOrders = 0
            try {
              const { PrismaClient } = await import('@prisma/client')
              const prisma: any = new PrismaClient()
              if (prisma?.hypeeOrder) {
                ordersToday = await prisma.hypeeOrder.count({ where: { createdAt: { gte: startToday }, status: { in: ['PENDING','CREATED','SHIPPED','DELIVERED','pending','created','shipped','delivered'] } } }).catch(()=>0)
                deliveredToday = await prisma.hypeeOrder.count({ where: { updatedAt: { gte: startToday }, status: { in: ['DELIVERED','delivered'] } } }).catch(()=>0)
                pendingOrders = await prisma.hypeeOrder.count({ where: { status: { in: ['PENDING','CREATED','pending','created'] } } }).catch(()=>0)
                const deliveredRows = await prisma.hypeeOrder.findMany({ where: { updatedAt: { gte: startToday }, status: { in: ['DELIVERED','delivered'] } }, select: { value: true } }).catch(()=>[])
                revenueToday = (deliveredRows||[]).reduce((a:number,b:any)=> a + (Number(b?.value)||0), 0)
              }
            } catch {}

            // 3) SQLite rewards fallback (delivered + revenue)
            try {
              const r = db.prepare(`SELECT COUNT(1) as delivered, COALESCE(SUM(revenue),0) as revenue FROM rewards WHERE delivered=1 AND out_at >= datetime('now','-1 day')`).get() as any
              if (r) {
                if (!deliveredToday) deliveredToday = Number(r.delivered||0)
                if (!revenueToday) revenueToday = Number(r.revenue||0)
              }
            } catch {}

            // 4) Conversations/messages activity today
            let msgsToday = 0
            try {
              const m = db.prepare(`SELECT COUNT(1) as c FROM messages WHERE created_at >= datetime('now','-1 day')`).get() as any
              msgsToday = Number(m?.c||0)
            } catch {}

            // 5) Allocator status
            let approvalsEnabled = false, pendingDecisions = 0
            try {
              const { budgetAllocator } = await import('../ml/budgetAllocator')
              approvalsEnabled = !!(budgetAllocator as any).getApprovalsMode?.()
              pendingDecisions = (budgetAllocator as any).listPendingDecisions?.().length || 0
            } catch {}

            // 6) Daily reporter enrichment (best-effort)
            let allocInfo: string | null = null
            let errors5xx = 0
            let anomaliesHigh = 0
            try {
              const mod = await import('../reporting/dailyReporter')
              const rep = await mod.generateDailyReport()
              const last = rep?.allocation?.lastDecision
              if (last) allocInfo = `aloc=${(last?.allocations?.length||0)} div=${(last?.diversificationScore||0).toFixed(3)}`
              errors5xx = Number(rep?.errors?.total5xx || 0)
              anomaliesHigh = Number(rep?.anomalies?.high || 0)
            } catch {}

            // 7) Compose concise WhatsApp-friendly report
            const fmt = (n:number)=> {
              try { return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) } catch { return String(Math.round(n)) }
            }
            const money = (v:number)=> {
              try { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) } catch { return `R$ ${v.toFixed(2).replace('.',',')}` }
            }
            const lines = [
              '📊 Relatório de Vendas (hoje)',
              `Pedidos: ${fmt(ordersToday)} | Entregues: ${fmt(deliveredToday)} | Receita: ${money(revenueToday)}`,
              `Atividade: ${fmt(msgsToday)} msgs nas conversas`,
              `Orçamentos: approvals ${approvalsEnabled? 'ativadas':'desativadas'} | pendentes: ${pendingDecisions}`,
              allocInfo ? `Alocador: ${allocInfo}` : undefined,
              (errors5xx || anomaliesHigh) ? `Alertas: 5xx=${errors5xx} | anomalias altas=${anomaliesHigh}` : undefined
            ]
            return lines.filter(Boolean).join('\n')
          } catch {
            return result.reply || 'Relatório gerado.'
          }
        }
      }

      // Se a intenção for desconhecida e houver OpenAI, responder de forma generativa (assistente admin)
      if (result.intent?.type === 'unknown') {
        try {
          const hasKey = Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY)
          if (hasKey) {
            const { OpenAI } = await import('openai')
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY })
            // Admin assistant default: GPT‑4 (configurável por OPENAI_MODEL_ADMIN)
            const model = process.env.OPENAI_MODEL_ADMIN || process.env.OPENAI_MODEL || 'gpt-4o'
            const sys = `Você é Alexia, uma administradora sênior da plataforma Nexus/GuardianAngel.
Responda em PT-BR, de forma curta, objetiva e útil.
Você conhece as rotas do backend (Express/TypeScript), SSE de conversas, WhatsApp-web.js, Prisma/SQLite, filas e métricas.
Pode orientar, responder dúvidas sobre a plataforma e tomar ações administrativas em linguagem natural (descrever o que faria). Não invente resultados de comandos que não executou.`
            const completion = await openai.chat.completions.create({
              model,
              temperature: 0.7,
              messages: [
                { role: 'system', content: sys },
                { role: 'user', content: String(text || '') }
              ]
            })
            const reply = completion.choices?.[0]?.message?.content?.trim()
            if (reply) return reply
          }
        } catch {}
      }
    } catch {}
    // Patterns:
    // 1) entrega confirmada: "entregue 129.90" ou "entregue 150" (valor opcional)
    // 2) pedido criado: "pedido criado" ou "pedido 89.90"
    // 3) conversao: "conversao 149" ou "conversão 149"
    // 4) ajuda: "help" ou "?"
  if (/^(help|ajuda|\?)$/.test(lower)) {
      return 'Comandos: pedido [valor]; entregue [valor]; conversao [valor]; agendar <data hora> <fone>; status <fone> <status>.'
    }
    const db = getDatabase()
    const valueMatch = lower.match(/([0-9]+([\.,][0-9]+)?)/)
    const parseValue = ()=> valueMatch? parseFloat(valueMatch[1].replace(',','.')) : undefined
  const arms = {} as CachedArms // Função getCachedLeadArms removida - usar default vazio
    if (/pedido/.test(lower)) {
      // seed partial reward row in rewards table
      try {
        db.prepare(`INSERT INTO rewards (phone, variant, out_at, created_order) VALUES (?,?,datetime('now'),1)`).run(phone, 'admin:manual')
      } catch {}
      return '✅ Pedido criado registrado.'
    }
    if (/entregue/.test(lower)) {
      const revenue = parseValue() || 0
      try {
        db.prepare(`INSERT INTO delivery_events (phone, revenue, confirmed_by) VALUES (?,?,?)`).run(phone, revenue, 'admin')
        // mark a reward row as delivered & revenue (latest created_order row)
        db.prepare(`UPDATE rewards SET delivered=1, revenue=? WHERE id = (SELECT id FROM rewards WHERE phone=? ORDER BY id DESC LIMIT 1)`).run(revenue, phone)
      } catch {}
      // propagate to conversion systems
      recordConversion({
        pricingArmId: arms.pricing,
        approachArmId: arms.approach,
        timingArmId: arms.timing,
        mediaArmId: arms.media,
        closingArmId: arms.closing,
        revenue: revenue || 0
      })
  return `Entrega confirmada${revenue? ' valor R$'+revenue.toFixed(2):''}.`
    }
    if (/convers[aã]o/.test(lower)) {
      const revenue = parseValue() || 0
      recordConversion({
        pricingArmId: arms.pricing,
        approachArmId: arms.approach,
        timingArmId: arms.timing,
        mediaArmId: arms.media,
        closingArmId: arms.closing,
        revenue
      })
      try { db.prepare(`INSERT INTO rewards (phone, variant, out_at, delivered, revenue) VALUES (?,?,datetime('now'),1,?)`).run(phone, 'admin:conversion', revenue) } catch {}
  return `Conversão registrada${revenue? ' R$'+revenue.toFixed(2):''}.`
    }
  // Sem correspondência clara: não responder para evitar spam.
  return null as any
  }
}
export const superAdminBot = new SuperAdminBotCore()
export class SuperAdminBot extends SuperAdminBotCore {}
