import { Response } from 'express'
import { prisma } from '../config/database'
import { AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler, NotFoundError } from '../middleware/errorHandler'
import { cacheService } from '../services/cache'
import { scrapingQueue, automationQueue } from '../services/queue'
import { logger, logScraping } from '../services/logger'
import type { ScrapingRequest, ScrapingJobStatus } from '../types'

// Start scraping job
export const startScraping = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { niche, adType, maxResults = 20 }: ScrapingRequest = req.body

  if (!niche || !adType) {
    return res.status(400).json({
      success: false,
      message: 'Nicho e tipo de anúncio são obrigatórios'
    })
  }

  // Check if user already has a running scraping job
  const runningJob = await cacheService.get(`scraping:running:${req.user.id}`)
  if (runningJob) {
    return res.status(429).json({
      success: false,
      message: 'Você já tem um job de scraping em execução'
    })
  }

  // Create scraping job
  const job = await scrapingQueue.add('scrape-niche', {
    userId: req.user.id,
    niche,
    adType,
    maxResults
  }, {
    priority: 1,
    removeOnComplete: 5,
    removeOnFail: 3
  })

  // Cache running job
  await cacheService.set(`scraping:running:${req.user.id}`, {
    jobId: job.id,
    niche,
    adType,
    status: 'PENDING',
    startedAt: new Date()
  }, { ttl: 1800 }) // 30 minutes

  logScraping('job_started', niche, 'PENDING', {
    userId: req.user.id,
    jobId: job.id,
    adType
  })

  res.status(202).json({
    success: true,
    message: 'Job de scraping iniciado',
    data: {
      jobId: job.id,
      niche,
      adType,
      status: 'PENDING',
      estimatedTime: '2-5 minutos'
    }
  })
})

// Get scraping job status
export const getScrapingStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { jobId } = req.params

  // Check cache first
  const cacheKey = `scraping:status:${jobId}`
  const cached = await cacheService.get(cacheKey)
  
  if (cached) {
    return res.json({
      success: true,
      data: cached
    })
  }

  // Get job from queue
  const job = await scrapingQueue.getJob(jobId)
  
  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job não encontrado'
    })
  }

  let status: ScrapingJobStatus = {
    id: job.id as string,
    status: 'PENDING'
  }

  if (job.finishedOn) {
    if (job.failedReason) {
      status.status = 'FAILED'
      status.error = job.failedReason
    } else {
      status.status = 'COMPLETED'
      status.progress = 100
      
      // Get results from database
      const results = await prisma.scrapingResult.findMany({
        where: {
          userId: req.user.id,
          niche: job.data.niche,
          adType: job.data.adType,
          createdAt: {
            gte: new Date(job.timestamp)
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      status.results = results
    }
  } else if (job.processedOn) {
    status.status = 'PROCESSING'
    status.progress = job.progress()
  }

  // Cache status
  await cacheService.set(cacheKey, status, { ttl: 30 })

  res.json({
    success: true,
    data: status
  })
})

// Get scraping results
export const getScrapingResults = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const niche = req.query.niche as string
  const adType = req.query.adType as string
  const skip = (page - 1) * limit

  // Build filter
  const where: any = { userId: req.user.id }
  if (niche) where.niche = niche
  if (adType) where.adType = adType

  // Try cache first
  const cacheKey = `scraping:results:${req.user.id}:${page}:${limit}:${niche || 'all'}:${adType || 'all'}`
  const cached = await cacheService.get(cacheKey)
  
  if (cached) {
    return res.json({
      success: true,
      data: cached.results,
      meta: cached.meta
    })
  }

  const [results, total] = await Promise.all([
    prisma.scrapingResult.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.scrapingResult.count({ where })
  ])

  const totalPages = Math.ceil(total / limit)
  const meta = {
    page,
    limit,
    total,
    totalPages
  }

  // Cache result
  await cacheService.set(cacheKey, { results, meta }, { ttl: 300 })

  res.json({
    success: true,
    data: results,
    meta
  })
})

// Get single scraping result
export const getScrapingResult = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { id } = req.params

  const result = await prisma.scrapingResult.findFirst({
    where: {
      id,
      userId: req.user.id
    }
  })

  if (!result) {
    throw new NotFoundError('Resultado de scraping não encontrado')
  }

  res.json({
    success: true,
    data: result
  })
})

// Delete scraping result
export const deleteScrapingResult = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { id } = req.params

  const result = await prisma.scrapingResult.findFirst({
    where: {
      id,
      userId: req.user.id
    }
  })

  if (!result) {
    throw new NotFoundError('Resultado de scraping não encontrado')
  }

  await prisma.scrapingResult.delete({
    where: { id }
  })

  // Clear cache
  await cacheService.deletePattern(`scraping:results:${req.user.id}:*`)

  res.json({
    success: true,
    message: 'Resultado deletado com sucesso'
  })
})

// Start complete automation (scraping + analysis + campaign creation)
export const startCompleteAutomation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { niche, adType, investment } = req.body

  if (!niche || !adType || !investment) {
    return res.status(400).json({
      success: false,
      message: 'Nicho, tipo de anúncio e investimento são obrigatórios'
    })
  }

  // Check if user already has a running automation
  const runningAutomation = await cacheService.get(`automation:running:${req.user.id}`)
  if (runningAutomation) {
    return res.status(429).json({
      success: false,
      message: 'Você já tem uma automação completa em execução'
    })
  }

  // Create automation job
  const job = await automationQueue.add('complete-automation', {
    userId: req.user.id,
    niche,
    adType,
    investment
  }, {
    priority: 1,
    removeOnComplete: 3,
    removeOnFail: 2
  })

  // Cache running automation
  await cacheService.set(`automation:running:${req.user.id}`, {
    jobId: job.id,
    niche,
    adType,
    investment,
    status: 'PENDING',
    startedAt: new Date()
  }, { ttl: 3600 }) // 1 hour

  logger.info('Complete automation started', {
    userId: req.user.id,
    jobId: job.id,
    niche,
    adType,
    investment
  })

  res.status(202).json({
    success: true,
    message: 'Automação completa iniciada',
    data: {
      jobId: job.id,
      niche,
      adType,
      investment,
      status: 'PENDING',
      estimatedTime: '10-15 minutos'
    }
  })
})

// Get automation status
export const getAutomationStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { jobId } = req.params

  const job = await automationQueue.getJob(jobId)
  
  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job de automação não encontrado'
    })
  }

  let status = {
    id: job.id as string,
    status: 'PENDING',
    progress: 0
  }

  if (job.finishedOn) {
    if (job.failedReason) {
      status.status = 'FAILED'
    } else {
      status.status = 'COMPLETED'
      status.progress = 100
    }
  } else if (job.processedOn) {
    status.status = 'PROCESSING'
    status.progress = job.progress()
  }

  res.json({
    success: true,
    data: status
  })
})

// Get automation history
export const getAutomationHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const type = req.query.type as string
  const skip = (page - 1) * limit

  // Build filter
  const where: any = { userId: req.user.id }
  if (type) where.type = type

  const [logs, total] = await Promise.all([
    prisma.automationLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    }),
    prisma.automationLog.count({ where })
  ])

  const totalPages = Math.ceil(total / limit)
  const meta = {
    page,
    limit,
    total,
    totalPages
  }

  res.json({
    success: true,
    data: logs,
    meta
  })
})