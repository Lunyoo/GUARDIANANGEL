/*
 * outboundScheduler.ts
 * Extracted scheduling & suppression logic from inboundProcessor for clarity & reuse.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { scheduleOutboundMessage } from './messageQueue'
import { extractCityFromText, getTimeOfDay, isWeekend, replacePricePlaceholders } from './inboundUtils'
import { universalBandits, recordBanditOutcome, BanditContext } from './universalBandits'
import { isInDeliveryArea } from './pricingStrategy'
import type { PlannedMessage } from './types'
import { PrismaClient } from '@prisma/client'

export interface ScheduleParams {
  prisma: PrismaClient | any
  convo: any
  planned: PlannedMessage[]
  phoneNorm: string
  customerCtx: any
  text: string | undefined
  coverageMsgs?: PlannedMessage[]
  AI_ONLY: boolean
  forceFreshStart: boolean
}

export interface ScheduleResult { scheduledCount: number }

function variantFamilyKey(v: string): string {
  try {
    if (!v) return ''
    if (v.startsWith('media:')) return v
    return v.replace(/_v\d+$/, '')
  } catch { return v }
}

function getVariantCooldownMs(v: string): number {
  try {
    if (/^script_coverage_/.test(v)) return 1000 * 60 * 5
    if (/^script_followup/.test(v)) return 1000 * 60 * 60 * 6
    if (/^script_greeting/.test(v)) return 1000 * 60 * 10
    if (/^script_intro/.test(v)) return 1000 * 60 * 10
    if (/^script_qualify/.test(v)) return 1000 * 60 * 5
    if (/^script_confirm_fields/.test(v)) return 1000 * 60 * 10
    if (/^script_confirm_order/.test(v)) return 1000 * 60 * 15
    if (/^script_offers/.test(v)) return 1000 * 60 * 10
    if (/^script_eta/.test(v)) return 1000 * 60 * 30
    if (/^script_objection/.test(v)) return 1000 * 60 * 30
    if (/^script_mail_offer/.test(v)) return 1000 * 60 * 120
    return 0
  } catch { return 0 }
}

export async function schedulePlannedMessages(params: ScheduleParams): Promise<ScheduleResult> {
  const { prisma, convo, planned: original, phoneNorm, customerCtx, text, AI_ONLY, forceFreshStart } = params
  let planned = [...original]

  const nowTs = Date.now()
  let lastOutMsgs: any[] = []
  try { lastOutMsgs = await (prisma as any).message.findMany({ where: { conversationId: convo.id, direction: 'OUT' }, orderBy: { createdAt: 'desc' }, take: 5 }) } catch {}
  let lastOutAt: number | null = null
  try { if (lastOutMsgs[0]?.createdAt) lastOutAt = new Date(lastOutMsgs[0].createdAt).getTime() } catch {}
  let lastInAt: number | null = null
  try {
    const lastIn = await (prisma as any).message.findFirst({ where: { conversationId: convo.id, direction: 'IN' }, orderBy: { createdAt: 'desc' } })
    if (lastIn?.createdAt) lastInAt = new Date(lastIn.createdAt).getTime()
  } catch {}
  const allowDupOnUserReply = Boolean(lastInAt && (!lastOutAt || (lastInAt > lastOutAt)))

  const recentVariants = new Set<string>()
  try { for (const m of lastOutMsgs) { const v = m?.meta?.variant; if (typeof v === 'string') recentVariants.add(v) } } catch {}
  let sentRecent: Array<{ content: string; at: string }> = []
  try {
    const fresh = await (prisma as any).conversation.findUnique({ where: { id: convo.id }, select: { raw: true } })
    const raw = (fresh?.raw && typeof fresh.raw === 'object') ? fresh.raw : {}
    if (Array.isArray(raw.sent_recent)) sentRecent = raw.sent_recent
  } catch {}

  const _maxBurstEnv = (() => { try { const n = Number(process.env.BOT_MAX_BURST_PER_INBOUND || '1'); return isNaN(n) ? 1 : Math.max(1, Math.min(3, n)) } catch { return 1 } })()
  const hasAi = planned.some(p => String(p.variant) === 'gpt_dynamic_v1')
  const burstCap = hasAi ? Math.max(1, Math.min(2, _maxBurstEnv)) : _maxBurstEnv

  const cutoff12h = nowTs - 1000 * 60 * 60 * 12
  const minRepeatWindowMs = Number(process.env.BOT_MIN_REPEAT_WINDOW_MS || 1000 * 60 * 3)

  // Dedupe inside batch
  try {
    const seen = new Set<string>()
    planned = planned.filter(p => {
      const c = (p.content || '').trim()
      if (!c) return false
      if (seen.has(c)) return false
      seen.add(c)
      return true
    })
  } catch {}

  let accum = 0
  const plannedSeen = new Set<string>()
  let scheduledCount = 0
  let lastSentByVariant: Record<string, string> = {}
  try {
    const fresh = await (prisma as any).conversation.findUnique({ where: { id: convo.id }, select: { raw: true } })
    const raw = (fresh?.raw && typeof fresh.raw === 'object') ? fresh.raw : {}
    if (raw && typeof raw.last_sent_variant === 'object' && raw.last_sent_variant) {
      lastSentByVariant = { ...(raw.last_sent_variant as Record<string, string>) }
    }
  } catch {}

  for (const p of planned) {
    if (scheduledCount >= burstCap) break
    const v = String(p.variant || '')
    const fam = variantFamilyKey(v)
    // Cooldown
    try {
      const cd = getVariantCooldownMs(fam || v)
      if (cd > 0) {
        const lastIso = lastSentByVariant[fam || v]
        if (lastIso) {
          const lastTs = new Date(lastIso).getTime()
          if (!isNaN(lastTs) && (nowTs - lastTs) < cd) continue
        }
      }
    } catch {}

    const contentTrim = p.content.trim()
    const recentWindowHit = (
      lastOutMsgs.some(m => typeof m?.content === 'string' && m.content.trim() === contentTrim && m?.createdAt && new Date(m.createdAt).getTime() > (nowTs - minRepeatWindowMs))
      || sentRecent.some(r => r && typeof r.content === 'string' && r.content.trim() === contentTrim && new Date(r.at).getTime() > (nowTs - minRepeatWindowMs))
    )
    const oldDuplicate = (
      lastOutMsgs.some(m => typeof m?.content === 'string' && m.content.trim() === contentTrim)
      || sentRecent.some(r => r && typeof r.content === 'string' && r.content.trim() === contentTrim && new Date(r.at).getTime() > cutoff12h)
    )
    const allowRecentDupForAi = allowDupOnUserReply && (v === 'gpt_dynamic_v1' || v === 'ai_fallback_min' || v === 'gpt_dynamic_response')
    const effectiveRecentWindowHit = recentWindowHit && !allowRecentDupForAi
    const isDuplicate = effectiveRecentWindowHit
      || ( !(forceFreshStart || allowDupOnUserReply) && oldDuplicate )
      || plannedSeen.has(contentTrim)

  const variantRecentWindowHit = lastOutMsgs.some(m => m?.meta?.variant === v && m?.createdAt && new Date(m.createdAt).getTime() > (nowTs - minRepeatWindowMs))
    const suppressByVariant = (!allowDupOnUserReply && variantRecentWindowHit) || ( !(forceFreshStart || allowDupOnUserReply) && (
      recentVariants.has(v) || 
      (/^script_offers_/.test(v) && Array.from(recentVariants).some(x=>/^script_offers_/.test(x))) || 
      (/^script_confirm_order_/.test(v) && Array.from(recentVariants).some(x=>/^script_confirm_order_/.test(x))) || 
      (/^script_objection_/.test(v) && Array.from(recentVariants).some(x=>/^script_objection_/.test(x)))
    ))

    if (isDuplicate || suppressByVariant) continue

    plannedSeen.add(p.content.trim())
    accum += p.baseDelay + Math.floor(Math.random() * 600)

    // Final price placeholder safety substitution
    let safeContent = p.content
    try {
      const cityTmp = extractCityFromText(text || '') || (customerCtx?.city || 'unknown')
      const ctxTmp: BanditContext = {
        customerProfile: 'new',
        city: cityTmp,
        hasCodeDelivery: isInDeliveryArea(cityTmp || undefined),
        timeOfDay: getTimeOfDay(),
        dayOfWeek: isWeekend() ? 'weekend' : 'weekday',
        conversationStage: 'opening',
        messageCount: convo?.messages?.length || 1
      }
      const pricingTmp = universalBandits.getBestPricing(ctxTmp)
      recordBanditOutcome(pricingTmp.id, 'impression')
      safeContent = replacePricePlaceholders(safeContent, pricingTmp?.context?.price)
    } catch {
      safeContent = replacePricePlaceholders(safeContent, 119.90)
    }

  const meta: any = { variant: p.variant, phone: phoneNorm }
    if ((p as any).mediaItems) meta.mediaItems = (p as any).mediaItems
    const msgType = (p as any).mediaItems ? 'media' : 'text'
    await scheduleOutboundMessage({ conversationId: convo.id, content: safeContent, msgType, meta }, accum)
    scheduledCount++

    // Persist sent_recent & last_sent_variant
    try {
      const fresh = await (prisma as any).conversation.findUnique({ where: { id: convo.id }, select: { raw: true } })
      const raw = (fresh?.raw && typeof fresh.raw === 'object') ? fresh.raw : {}
      const list: Array<{ content: string; at: string }> = Array.isArray(raw.sent_recent) ? raw.sent_recent : []
      list.push({ content: p.content, at: new Date(Date.now() + accum).toISOString() })
      while (list.length > 50) list.shift()
      const key = fam || v
      const lv = (raw && typeof raw.last_sent_variant === 'object' && raw.last_sent_variant) ? { ...(raw.last_sent_variant as any) } : {}
      if (key) lv[key] = new Date(Date.now() + accum).toISOString()
      await (prisma as any).conversation.update({ where: { id: convo.id }, data: { raw: { ...(raw||{}), sent_recent: list, last_sent_variant: lv } } })
    } catch {}
  }

  return { scheduledCount }
}

export default { schedulePlannedMessages }
