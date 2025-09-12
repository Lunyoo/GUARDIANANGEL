import { Router } from 'express'
import { universalBandits } from '../services/bot/universalBandits'
import { getCodCities } from '../services/bot/codCitiesProvider'
import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()

// Sistema de armazenamento in-memory (pode ser migrado para banco depois)
interface CampaignLink {
  id: string
  videoTitle: string
  videoDescription: string
  videoType: 'depoimento' | 'demonstracao' | 'modelo' | 'custom'
  customContext: string
  identifier: string
  generatedLink: string
  linkedProductId?: string  // 🆕 ID do produto vinculado
  productName?: string      // 🆕 Nome do produto para facilitar
  clicks: number
  createdAt: string
  lastAccessBy?: string     // 🆕 Último telefone que acessou
  trackingData?: any        // 🆕 Dados de tracking gerais
}

interface ClickData {
  linkId: string
  timestamp: string
  userAgent: string
  ip: string
}

// Prisma client (lazy)
// NOTE: Cast to any to avoid transient typing issues when Prisma client is regenerating.
const prisma: any = new PrismaClient()

/**
 * 🔗 Criar novo link de campanha
 */
router.post('/campaign-links', async (req: Request, res: Response) => {
  try {
    const incoming = req.body as any
    const linkData: CampaignLink = {
      id: incoming.id,
      videoTitle: incoming.videoTitle,
      videoDescription: incoming.videoDescription,
      videoType: incoming.videoType,
      customContext: incoming.customContext,
      identifier: incoming.identifier,
      generatedLink: incoming.generatedLink,
      linkedProductId: incoming.linkedProductId || incoming.productId, // normalize
      productName: incoming.productName,
      clicks: incoming.clicks ?? 0,
      createdAt: incoming.createdAt || new Date().toISOString(),
      lastAccessBy: undefined,
      trackingData: undefined
    }
    
    // Validações
    if (!linkData.id || !linkData.videoTitle || !linkData.identifier) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: id, videoTitle, identifier' 
      })
    }
    
    // Persistir no banco
    const exists = await prisma.campaignLink.findUnique({ where: { id: linkData.id } })
    if (exists) {
      return res.status(409).json({ error: 'Link com este ID já existe' })
    }
    const created = await prisma.campaignLink.create({
      data: {
        id: linkData.id,
        videoTitle: linkData.videoTitle,
        videoDescription: linkData.videoDescription || null,
        videoType: linkData.videoType,
        customContext: linkData.customContext || null,
        identifier: linkData.identifier,
        generatedLink: linkData.generatedLink,
        linkedProductId: linkData.linkedProductId || null,
        productName: linkData.productName || null,
        clicks: linkData.clicks,
        createdAt: new Date(linkData.createdAt),
        trackingData: linkData.trackingData as any || undefined
      }
    })

    console.log(`🔗 Novo link criado: ${created.videoTitle} (${created.identifier}) ${created.linkedProductId ? '→ produto: ' + created.productName : ''}`)
    
    res.status(201).json({
      success: true,
      link: created,
      message: 'Link de campanha criado com sucesso'
    })
    
  } catch (error) {
    console.error('❌ Erro ao criar link:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * 📋 Listar todos os links de campanha
 */
router.get('/campaign-links', async (req: Request, res: Response) => {
  try {
    const links = await prisma.campaignLink.findMany({ orderBy: { createdAt: 'desc' } })
    
    res.json({
      success: true,
      links,
      total: links.length
    })
    
  } catch (error) {
    console.error('❌ Erro ao listar links:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * 🎯 Obter link específico
 */
router.get('/campaign-links/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
  const link = await prisma.campaignLink.findUnique({ where: { id } })
    
    if (!link) {
      return res.status(404).json({ error: 'Link não encontrado' })
    }
    
    res.json({
      success: true,
      link
    })
    
  } catch (error) {
    console.error('❌ Erro ao buscar link:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * 📊 Registrar clique no link
 */
router.post('/campaign-links/:id/click', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const link = await prisma.campaignLink.findUnique({ where: { id } })
    
    if (!link) {
      return res.status(404).json({ error: 'Link não encontrado' })
    }
    
    // Incrementar contador de cliques e registrar click
    const updated = await prisma.campaignLink.update({
      where: { id },
      data: { clicks: { increment: 1 } }
    })
    await prisma.campaignLinkClick.create({
      data: {
        linkId: id,
        userAgent: (req.headers['user-agent'] as string) || null,
        ip: (req.ip || (req.connection as any)?.remoteAddress || '') || null
      }
    })
    
    console.log(`👆 Clique registrado: ${updated.videoTitle} (${updated.clicks} cliques)`)
    
    res.json({
      success: true,
      clicks: updated.clicks,
      message: 'Clique registrado'
    })
    
  } catch (error) {
    console.error('❌ Erro ao registrar clique:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * 🗑️ Deletar link de campanha
 */
router.delete('/campaign-links/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
  const exists = await prisma.campaignLink.findUnique({ where: { id } })
  if (!exists) {
      return res.status(404).json({ error: 'Link não encontrado' })
    }
  await prisma.campaignLinkClick.deleteMany({ where: { linkId: id } })
  await prisma.campaignLink.delete({ where: { id } })
  console.log(`🗑️ Link removido: ${exists.videoTitle}`)
    
    res.json({
      success: true,
      message: 'Link removido com sucesso'
    })
    
  } catch (error) {
    console.error('❌ Erro ao remover link:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * 📊 Estatísticas dos links
 */
router.get('/campaign-stats', async (req: Request, res: Response) => {
  try {
    // Buscamos apenas campos necessários e tipamos o shape
    const links = await prisma.campaignLink.findMany({
      select: { id: true, videoTitle: true, videoType: true, clicks: true }
    }) as Array<{ id: string; videoTitle: string; videoType: string; clicks: number }>

    const totalLinks = links.length
    const totalClicks = links.reduce((sum: number, link: { clicks: number }) => sum + (link.clicks || 0), 0)
    const averageClicksPerLink = totalLinks > 0 ? totalClicks / totalLinks : 0
    
    // Top performing links
    const topLinks = links
      .slice() // não mutar o original
      .sort((a: { clicks: number }, b: { clicks: number }) => b.clicks - a.clicks)
      .slice(0, 5)
      .map((link: { id: string; videoTitle: string; clicks: number; videoType: string }) => ({
        id: link.id,
        title: link.videoTitle,
        clicks: link.clicks,
        type: link.videoType
      }))
    
    // Estatísticas por tipo de vídeo
  const statsByType = links.reduce((acc: Record<string, { count: number; clicks: number }>, link: { videoType: string; clicks: number }) => {
      if (!acc[link.videoType]) {
        acc[link.videoType] = { count: 0, clicks: 0 }
      }
      acc[link.videoType].count += 1
      acc[link.videoType].clicks += link.clicks || 0
      return acc
    }, {})
    
    // Últimos cliques
  const recentClicksRaw = await prisma.campaignLinkClick.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: { link: true }
  }) as any
  const recentClicks = (recentClicksRaw as Array<any>).map((rc: any) => ({
      timestamp: rc.timestamp.toISOString(),
      linkTitle: rc.link?.videoTitle || 'Link removido',
      linkType: rc.link?.videoType || 'unknown'
    }))
    
    res.json({
      success: true,
      stats: {
        totalLinks,
        totalClicks,
        averageClicksPerLink: Math.round(averageClicksPerLink * 100) / 100,
        topLinks,
        statsByType,
        recentClicks
      }
    })
    
  } catch (error) {
    console.error('❌ Erro ao gerar estatísticas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * 🔄 Redirect handler para links de campanha
 */
router.get('/campaign-redirect', async (req: Request, res: Response) => {
  try {
    const { id, phone, msg, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.query
    
    if (!id) {
      return res.status(400).json({ error: 'ID do link é obrigatório' })
    }
    
    const link = await prisma.campaignLink.findUnique({ where: { id: id as string } })
    if (!link) {
      return res.status(404).json({ error: 'Link de campanha não encontrado' })
    }
    
    // Registrar clique (persistido)
    await prisma.$transaction([
      prisma.campaignLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } }),
      prisma.campaignLinkClick.create({
        data: {
          linkId: link.id,
          userAgent: (req.headers['user-agent'] as string) || null,
          ip: (req.ip || (req.connection as any)?.remoteAddress || '') || null
        }
      })
    ])
    
    // Atualizar contexto ML com origem de campanha e produto vinculado (best-effort)
    try {
      await universalBandits.updateDeliveryContext?.({
        lastCampaign: {
          id: link.id,
          identifier: link.identifier,
          videoType: link.videoType,
          createdAt: link.createdAt
        },
        preferredProductId: link.linkedProductId,
        preferredProductName: link.productName,
        codCities: getCodCities(),
        hasCodeDelivery: getCodCities().length > 0,
        utm: {
          source: utm_source as string,
          medium: utm_medium as string,
          campaign: utm_campaign as string,
          content: utm_content as string,
          term: utm_term as string
        },
        source: 'campaign_redirect'
      })
    } catch {}

  // Construir URL do WhatsApp (sanitiza telefone e encode da mensagem)
  const safePhone = String(phone || '').replace(/[^0-9]/g, '')
  const textParam = typeof msg === 'string' ? encodeURIComponent(msg as string) : ''
  const whatsappUrl = `https://wa.me/${safePhone}?text=${textParam}`
    
    console.log(`🔗 Redirect: ${link.videoTitle} → WhatsApp (${link.clicks} cliques)`)
    
    // Redirect para WhatsApp
    res.redirect(whatsappUrl)
    
  } catch (error) {
    console.error('❌ Erro no redirect:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * 📱 Registrar acesso de cliente por telefone
 */
router.post('/track-access', async (req: Request, res: Response) => {
  try {
    const { phone, linkId } = req.body
    
    if (!phone || !linkId) {
      return res.status(400).json({ error: 'Phone e linkId são obrigatórios' })
    }
    
    const link = await prisma.campaignLink.findUnique({ where: { id: linkId } })
    if (!link) {
      return res.status(404).json({ error: 'Link não encontrado' })
    }
    
    // Atualizar tracking no banco (merge simples)
    const current = link.trackingData as any || {}
    const updatedTracking = {
      ...current,
      lastAccess: new Date().toISOString(),
      accessHistory: [
        ...(Array.isArray(current.accessHistory) ? current.accessHistory : []),
        { phone, timestamp: new Date().toISOString() }
      ]
    }
    await prisma.campaignLink.update({
      where: { id: linkId },
      data: { lastAccessBy: phone, trackingData: updatedTracking as any }
    })

    // Atualizar contexto ML com tracking
    try {
      await universalBandits.updateDeliveryContext?.({
        lastAccess: {
          phone,
          linkId,
          at: new Date().toISOString()
        },
        preferredProductId: link.linkedProductId,
        preferredProductName: link.productName,
        codCities: getCodCities(),
        hasCodeDelivery: getCodCities().length > 0,
        source: 'campaign_track'
      })
    } catch {}
    
  console.log(`📱 Acesso rastreado: ${phone} → ${link.videoTitle}`)
    
    res.json({
      success: true,
      message: 'Acesso registrado',
      linkData: {
        id: link.id,
        productId: link.linkedProductId,
        productName: link.productName,
        videoType: link.videoType
      }
    })
    
  } catch (error) {
    console.error('❌ Erro ao rastrear acesso:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
