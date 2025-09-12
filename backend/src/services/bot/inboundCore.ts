import { PrismaClient } from '@prisma/client'
import { AudioProcessor } from './messageProcessors/audioProcessor'
import { ImageProcessor } from './messageProcessors/imageProcessor'

export interface LeadAndConversation {
  customer: any
  conversation: any
  phoneNorm: string
}

export function normalizePhone(phoneRaw: string): string {
  const raw = String(phoneRaw || '').replace(/@c\.us$/i, '').replace(/\+/g, '')
  if (raw.length === 10 && raw.startsWith('11')) return `55${raw}`
  if (raw.length === 11 && !raw.startsWith('55')) return `55${raw}`
  return raw
}

export async function ensureLeadAndConversation(prisma: PrismaClient, phoneNorm: string): Promise<LeadAndConversation> {
  const customer = await (prisma as any).lead.upsert({
    where: { phone: phoneNorm },
    create: { phone: phoneNorm, firstContact: new Date(), lastContact: new Date() },
    update: { lastContact: new Date() }
  })
  let convo: any = null
  try {
    convo = await (prisma as any).conversation.findFirst({ where: { leadId: customer.id, status: { not: 'completed' } } })
    if (!convo) {
      convo = await (prisma as any).conversation.create({ data: { leadId: customer.id, stage: 'initial', status: 'active' } })
    }
  } catch (e) {
    // swallow errors; upstream can log
  }
  return { customer, conversation: convo, phoneNorm }
}

export interface MediaProcessResult { processedMediaText: string; mediaResponse: string }

export async function processInboundMedia(mediaUrl: string | undefined, originalText: string | undefined, leadId: any): Promise<MediaProcessResult> {
  if (!mediaUrl) return { processedMediaText: originalText || '', mediaResponse: '' }
  let processedMediaText = originalText || ''
  let mediaResponse = ''
  try {
    const isAudio = /\.(mp3|ogg|m4a|wav|aac)(\?|$)/i.test(mediaUrl) || mediaUrl.includes('audio')
    const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(mediaUrl) || mediaUrl.includes('image')
    if (isAudio) {
      const audioProcessor = new AudioProcessor()
      const audioResult = await audioProcessor.processAudio(mediaUrl, leadId)
      processedMediaText = audioResult.transcription
      mediaResponse = audioResult.response
      if (audioResult.audioResponseUrl) {
        mediaResponse += `\n\n🔊 *Resposta em áudio:* ${audioResult.audioResponseUrl}`
      }
    } else if (isImage) {
      const imageProcessor = new ImageProcessor()
      const imageResult = await imageProcessor.processImage(mediaUrl, leadId, originalText)
      mediaResponse = imageResult.response
    }
  } catch (e) {
    mediaResponse = '📱 Recebi sua mídia! Como posso ajudar você com nossa Calcinha Lipo Modeladora?'
  }
  return { processedMediaText, mediaResponse }
}

export default { normalizePhone, ensureLeadAndConversation, processInboundMedia }
