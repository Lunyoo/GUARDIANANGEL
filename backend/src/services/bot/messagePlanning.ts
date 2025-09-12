import { getDatabase } from '../../config/database.js'
import { getOptimalPricing, formatPricingMessage, CustomerProfile } from './pricingStrategy'
import { PlannedMessage } from './types'

interface VariantTemplate { variant: string; content: string }

export function pickVariant(act: string, templates: VariantTemplate[]): VariantTemplate {
  try {
    if (templates.length <= 1) return templates[0]
    const db = getDatabase()
    const placeholders = templates.map(() => '?').join(',')
    const vars = templates.map(t => t.variant)
    const rows = db.prepare(`
      SELECT variant,
             COUNT(*) AS total,
             AVG(reply_latency_sec) AS avg_latency,
             SUM(created_order) AS created_orders,
             SUM(delivered) AS delivered,
             SUM(revenue) AS revenue
      FROM rewards
      WHERE variant IN (${placeholders}) AND created_at >= datetime('now','-30 days')
      GROUP BY variant
    `).all(...vars) as Array<any>
    const byVar = new Map<string, any>(rows.map(r => [String(r.variant), r]))
    const scored = templates.map((t) => {
      const r = byVar.get(t.variant) || {}
      const avgLat = Number(r.avg_latency || 0)
      const created = Number(r.created_orders || 0)
      const delivered = Number(r.delivered || 0)
      const revenue = Number(r.revenue || 0)
      const score = (delivered * 3) + (created * 2) + (revenue * 0.001) - (avgLat * 0.01)
      return { t, score }
    })
    if (Math.random() < 0.20) {
      return templates[Math.floor(Math.random() * templates.length)]
    }
    scored.sort((a,b)=> b.score - a.score)
    return scored[0]?.t || templates[0]
  } catch {
    return templates[0]
  }
}

export function planMessages(actions: string[], customerCtx?: any, ctxFlags?: any): PlannedMessage[] {
  const planned: PlannedMessage[] = []
  for (const act of actions) {
    switch (act) {
      case 'ask_intro_question': {
        const chosen = pickVariant('ask_intro_question', [
          { variant: 'script_intro_v1', content: 'Oi, eu sou a Larissa 😉 Posso te ajudar rapidinho? Me diz sua cidade e seu tamanho pra eu ver as opções certas pra você.' },
          { variant: 'script_intro_v2', content: 'Oi! Aqui é a Larissa 😊 Pra te indicar certinho, me fala sua cidade e seu tamanho (P, M, G...)?' }
        ])
        planned.push({ content: chosen.content, baseDelay: 700, variant: chosen.variant })
        break
      }
      case 'continue_qualifying':
        planned.push({ content: 'Perfeito! Só pra ajustar certinho: qual seu NOME, CIDADE e TAMANHO (P, M, G, GG)?', baseDelay: 900, variant: 'script_qualify_v1' })
        break
      case 'present_combos': {
        if (customerCtx && ctxFlags) {
          const customerProfile: CustomerProfile = {
            city: customerCtx?.city,
            hasAskedPrice: ctxFlags.hasAskedPrice,
            hasShownInterest: ctxFlags.wantsOffers,
            objections: customerCtx?.objections || [],
            messageCount: 1,
            isReturningCustomer: false
          }
          const wantsMulti = Boolean(ctxFlags.wantsOffers)
          const rec = getOptimalPricing(customerProfile)
            const oneUnitFirst = { ...rec, quantity: 1 }
          const msg = wantsMulti ? formatPricingMessage(rec) : formatPricingMessage(oneUnitFirst)
          planned.push({ content: msg, baseDelay: 1000, variant: 'script_smart_pricing_v1' })
        } else {
          const chosen = pickVariant('present_combos', [
            { variant: 'script_offers_v1', content: 'Show! Me diz sua cidade que te passo os valores certinhos pra sua região.' },
            { variant: 'script_offers_v2', content: 'Perfeito! Qual sua cidade? Assim já te passo os valores e forma de pagamento certos pra sua região.' }
          ])
          planned.push({ content: chosen.content, baseDelay: 1000, variant: chosen.variant })
        }
        break
      }
      case 'explain_value':
        planned.push({ content: 'Produto modelador confortável e discreto. Prefere começar com 1 unidade? Posso te passar o valor.', baseDelay: 1000, variant: 'script_value_v1' })
        break
      case 'nudge_order': {
        const chosen = pickVariant('nudge_order', [
          { variant: 'script_nudge_order_v1', content: 'Posso já deixar seu pedido separado com pagamento só na entrega. Quer que eu registre pra você?' },
          { variant: 'script_nudge_order_v2', content: 'Quer que eu gere o pedido e você paga só quando receber? Posso adiantar aqui.' }
        ])
        planned.push({ content: chosen.content, baseDelay: 1200, variant: chosen.variant })
        break
      }
      case 'handle_objections':
        planned.push({ content: 'Alguma dúvida de preço, prazo ou garantia? Posso esclarecer.', baseDelay: 1100, variant: 'script_objection_v1' })
        break
      case 'post_sale_instructions':
        planned.push({ content: 'Pedido confirmado! Você receberá atualizações. Qualquer coisa é só responder aqui.', baseDelay: 1300, variant: 'script_post_sale_v1' })
        break
      case 'schedule_remarketing':
        planned.push({ content: 'Perfeito! Em breve mando vantagens extras.', baseDelay: 1400, variant: 'script_remarketing_v1' })
        break
      case 'light_touch_followup':
        planned.push({ content: 'Só passando pra lembrar: ainda temos o combo promocional. Quer garantir?', baseDelay: 1500, variant: 'script_followup_v1' })
        break
    }
  }
  return planned
}

export default { planMessages, pickVariant }
