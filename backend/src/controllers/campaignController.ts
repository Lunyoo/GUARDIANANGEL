import { Response } from 'express'
import { prisma } from '../config/database'
import { AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler, NotFoundError } from '../middleware/errorHandler'
import { cacheService } from '../services/cache'
import { logger } from '../services/logger'
import type { Campaign } from '../types'

// Get all campaigns for user
export const getCampaigns = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const status = req.query.status as string
  const skip = (page - 1) * limit

  // Build filter
  const where: any = { userId: req.user.id }
  if (status) {
    where.status = status
  }

  // Try cache first
  const cacheKey = `campaigns:${req.user.id}:${page}:${limit}:${status || 'all'}`
  const cached = await cacheService.get(cacheKey)
  
  if (cached) {
    return res.json({
      success: true,
      data: cached.campaigns,
      meta: cached.meta
    })
  }

  // Get campaigns from database
  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        creatives: {
          select: {
            id: true,
            name: true,
            status: true,
            impressions: true,
            clicks: true,
            spend: true,
            ctr: true
          }
        },
        _count: {
          select: {
            creatives: true
          }
        }
      }
    }),
    prisma.campaign.count({ where })
  ])

  const totalPages = Math.ceil(total / limit)
  const meta = {
    page,
    limit,
    total,
    totalPages
  }

  // Cache result
  await cacheService.set(cacheKey, { campaigns, meta }, { ttl: 300 })

  logger.info('Campaigns retrieved', {
    userId: req.user.id,
    count: campaigns.length,
    total
  })

  res.json({
    success: true,
    data: campaigns,
    meta
  })
})

// Get single campaign
export const getCampaign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { id } = req.params

  // Try cache first
  const cacheKey = `campaign:${id}`
  const cached = await cacheService.get(cacheKey)
  
  if (cached) {
    return res.json({
      success: true,
      data: cached
    })
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId: req.user.id
    },
    include: {
      creatives: {
        orderBy: { createdAt: 'desc' }
      },
      automationLogs: {
        where: { campaignId: id },
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  })

  if (!campaign) {
    throw new NotFoundError('Campanha não encontrada')
  }

  // Cache result
  await cacheService.set(cacheKey, campaign, { ttl: 180 })

  res.json({
    success: true,
    data: campaign
  })
})

// Create campaign
export const createCampaign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const {
    name,
    objective,
    budget,
    budgetType,
    startDate,
    endDate,
    targeting
  } = req.body

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Nome da campanha é obrigatório'
    })
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      objective: objective || 'CONVERSIONS',
      budget: budget || 0,
      budgetType: budgetType || 'DAILY',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      targeting: targeting || {},
      userId: req.user.id
    }
  })

  // Clear campaigns cache
  await cacheService.deletePattern(`campaigns:${req.user.id}:*`)

  // Log automation
  await prisma.automationLog.create({
    data: {
      type: 'CAMPAIGN_CREATION',
      status: 'COMPLETED',
      action: `Campaign created: ${name}`,
      inputData: { name, objective, budget, budgetType },
      outputData: { campaignId: campaign.id },
      userId: req.user.id,
      campaignId: campaign.id,
      completedAt: new Date(),
      duration: 0
    }
  })

  logger.info('Campaign created', {
    userId: req.user.id,
    campaignId: campaign.id,
    name
  })

  res.status(201).json({
    success: true,
    message: 'Campanha criada com sucesso',
    data: campaign
  })
})

// Update campaign
export const updateCampaign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { id } = req.params
  const updateData = req.body

  // Check if campaign exists and belongs to user
  const existingCampaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId: req.user.id
    }
  })

  if (!existingCampaign) {
    throw new NotFoundError('Campanha não encontrada')
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...updateData,
      startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
      endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
      updatedAt: new Date()
    }
  })

  // Clear caches
  await cacheService.delete(`campaign:${id}`)
  await cacheService.deletePattern(`campaigns:${req.user.id}:*`)

  logger.info('Campaign updated', {
    userId: req.user.id,
    campaignId: id,
    changes: Object.keys(updateData)
  })

  res.json({
    success: true,
    message: 'Campanha atualizada com sucesso',
    data: campaign
  })
})

// Delete campaign
export const deleteCampaign = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { id } = req.params

  // Check if campaign exists and belongs to user
  const existingCampaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId: req.user.id
    }
  })

  if (!existingCampaign) {
    throw new NotFoundError('Campanha não encontrada')
  }

  // Delete campaign and related data
  await prisma.campaign.delete({
    where: { id }
  })

  // Clear caches
  await cacheService.delete(`campaign:${id}`)
  await cacheService.deletePattern(`campaigns:${req.user.id}:*`)

  logger.info('Campaign deleted', {
    userId: req.user.id,
    campaignId: id,
    name: existingCampaign.name
  })

  res.json({
    success: true,
    message: 'Campanha deletada com sucesso'
  })
})

// Update campaign metrics (usually from Facebook API)
export const updateCampaignMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { id } = req.params
  const {
    impressions,
    clicks,
    conversions,
    spend,
    ctr,
    cpc,
    cpm,
    roas,
    insights
  } = req.body

  // Check if campaign exists and belongs to user
  const existingCampaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId: req.user.id
    }
  })

  if (!existingCampaign) {
    throw new NotFoundError('Campanha não encontrada')
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      impressions: impressions || existingCampaign.impressions,
      clicks: clicks || existingCampaign.clicks,
      conversions: conversions || existingCampaign.conversions,
      spend: spend || existingCampaign.spend,
      ctr: ctr || existingCampaign.ctr,
      cpc: cpc || existingCampaign.cpc,
      cpm: cpm || existingCampaign.cpm,
      roas: roas || existingCampaign.roas,
      insights: insights || existingCampaign.insights,
      updatedAt: new Date()
    }
  })

  // Clear caches
  await cacheService.delete(`campaign:${id}`)
  await cacheService.deletePattern(`campaigns:${req.user.id}:*`)

  logger.info('Campaign metrics updated', {
    userId: req.user.id,
    campaignId: id,
    metrics: { impressions, clicks, conversions, spend }
  })

  res.json({
    success: true,
    message: 'Métricas da campanha atualizadas com sucesso',
    data: campaign
  })
})

// Get campaign analytics/insights
export const getCampaignAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { id } = req.params
  const { period = '7d' } = req.query

  // Try cache first
  const cacheKey = `campaign:analytics:${id}:${period}`
  const cached = await cacheService.get(cacheKey)
  
  if (cached) {
    return res.json({
      success: true,
      data: cached
    })
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId: req.user.id
    },
    include: {
      creatives: true,
      automationLogs: {
        where: { campaignId: id },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!campaign) {
    throw new NotFoundError('Campanha não encontrada')
  }

  // Calculate analytics
  const analytics = {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      metrics: {
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        spend: campaign.spend,
        ctr: campaign.ctr,
        cpc: campaign.cpc,
        cpm: campaign.cpm,
        roas: campaign.roas
      }
    },
    creatives: {
      total: campaign.creatives.length,
      active: campaign.creatives.filter(c => c.status === 'ACTIVE').length,
      topPerforming: campaign.creatives
        .sort((a, b) => b.roas - a.roas)
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          name: c.name,
          roas: c.roas,
          spend: c.spend,
          conversions: c.conversions
        }))
    },
    automation: {
      logsCount: campaign.automationLogs.length,
      lastActivity: campaign.automationLogs[0]?.createdAt || null,
      recentActions: campaign.automationLogs.slice(0, 5).map(log => ({
        type: log.type,
        action: log.action,
        status: log.status,
        createdAt: log.createdAt
      }))
    }
  }

  // Cache result
  await cacheService.set(cacheKey, analytics, { ttl: 300 })

  res.json({
    success: true,
    data: analytics
  })
})