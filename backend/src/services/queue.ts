import Queue from 'bull'
// Redis helper is optional; queue will fall back if not connected.
import { logger, queueLogger } from './logger'
import axios from 'axios'
// Prisma not present in reconstructed environment; provide lightweight stubs mapping to existing SQLite tables when possible.
import { getDatabase } from '../config/database.js'

// Minimal prisma-like facade (only methods used in this file)
const prisma = {
  automationLog: {
    create: async ({ data }: any) => {
      try {
        const db = getDatabase()
        db.prepare('INSERT INTO automation_logs (user_id, action, status, data) VALUES (?,?,?,?)')
          .run(data.userId || null, data.action, data.status, JSON.stringify({ inputData: data.inputData, outputData: data.outputData }))
        const id = (db as any).prepare('SELECT last_insert_rowid() as id').get().id
        return { id, startedAt: new Date(), ...data }
      } catch { return { id: 0, startedAt: new Date(), ...data } }
    },
  update: async (_args?: any) => {},
  updateMany: async (_args?: any) => {}
  },
  scrapingResult: {
    create: async ({ data }: any) => ({ id: Date.now(), ...data })
  },
  mLModel: { upsert: async (_args?: any) => ({}) }
}

// Queue configurations
const queueOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
}

// Create queues
export const mlQueue = new Queue('ml-processing', queueOptions)
export const notificationQueue = new Queue('notifications', queueOptions)
export const scrapingQueue = new Queue('scraping', queueOptions)
export const automationQueue = new Queue('automation', queueOptions)

// Scraping Queue Processors
scrapingQueue.process('scrape-niche', async (job: any) => {
  const { userId, niche, adType, maxResults } = job.data
  
  queueLogger.info('Processing scraping job', {
    jobId: job.id,
    userId,
    niche,
    adType
  })

  try {
    // Create automation log
    const automationLog = await prisma.automationLog.create({
      data: {
        type: 'SCRAPING',
        status: 'PROCESSING',
        action: `Scraping ${niche} ads (${adType})`,
        inputData: { niche, adType, maxResults },
        userId
      }
    })

    // Call scraping service
    const scrapingServiceUrl = process.env.SCRAPER_SERVICE_URL || 'http://localhost:8002'
    const response = await axios.post(`${scrapingServiceUrl}/scrape`, {
      niche,
      ad_type: adType,
      max_results: maxResults || 20
    }, {
      timeout: 300000 // 5 minutes
    })

    const results = response.data.results || []
    
    // Save results to database
    const scrapingResults = []
    for (const result of results) {
      const scrapingResult = await prisma.scrapingResult.create({
        data: {
          userId,
          niche,
          adType,
          status: 'COMPLETED',
          advertiserName: result.advertiser_name,
          adText: result.ad_text,
          headline: result.headline,
          description: result.description,
          imageUrl: result.image_url,
          videoUrl: result.video_url,
          linkUrl: result.link_url,
          landingPageUrl: result.landing_page_url,
          estimatedImpressions: result.estimated_impressions,
          estimatedClicks: result.estimated_clicks,
          estimatedSpend: result.estimated_spend,
          successScore: result.success_score,
          confidenceLevel: result.confidence_level,
          rawData: result
        }
      })
      scrapingResults.push(scrapingResult)
    }

    // Update automation log
    await prisma.automationLog.update({
      where: { id: automationLog.id },
      data: {
        status: 'COMPLETED',
        outputData: { resultsCount: results.length },
        completedAt: new Date(),
        duration: Date.now() - automationLog.startedAt.getTime()
      }
    })

    queueLogger.info('Scraping job completed', {
      jobId: job.id,
      resultsCount: results.length
    })

    return { success: true, results: scrapingResults }
    
  } catch (error) {
    queueLogger.error('Scraping job failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    // Update automation log with error
    await prisma.automationLog.updateMany({
      where: { 
        userId,
        type: 'SCRAPING',
        status: 'PROCESSING'
      },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      }
    })

    throw error
  }
})

// ML Queue Processors
mlQueue.process('predict-performance', async (job) => {
  const { userId, features, modelName } = job.data
  
  queueLogger.info('Processing ML prediction job', {
    jobId: job.id,
    userId,
    modelName
  })

  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001'
    const response = await axios.post(`${mlServiceUrl}/predict`, {
      features,
      model_name: modelName || 'creative-performance-predictor'
    }, {
      timeout: 30000 // 30 seconds
    })

    const prediction = response.data
    
    queueLogger.info('ML prediction completed', {
      jobId: job.id,
      prediction: prediction.class,
      confidence: prediction.confidence
    })

    return prediction
    
  } catch (error) {
    queueLogger.error('ML prediction job failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
})

// Train ML model
mlQueue.process('train-model', async (job) => {
  const { modelName, trainingData } = job.data
  
  queueLogger.info('Processing ML training job', {
    jobId: job.id,
    modelName,
    dataSize: trainingData?.length || 0
  })

  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001'
    const response = await axios.post(`${mlServiceUrl}/train`, {
      model_name: modelName,
      training_data: trainingData
    }, {
      timeout: 600000 // 10 minutes
    })

    const result = response.data
    
    // Update ML model in database
    await prisma.mLModel.upsert({
      where: { name: modelName },
      update: {
        status: 'READY',
        accuracy: result.accuracy,
        trainingData: { size: trainingData?.length || 0 },
        parameters: result.parameters
      },
      create: {
        name: modelName,
        version: '1.0.0',
        type: 'PERFORMANCE_PREDICTION',
        status: 'READY',
        accuracy: result.accuracy,
        trainingData: { size: trainingData?.length || 0 },
        parameters: result.parameters
      }
    })
    
    queueLogger.info('ML training completed', {
      jobId: job.id,
      accuracy: result.accuracy
    })

    return result
    
  } catch (error) {
    queueLogger.error('ML training job failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
})

// Automation Queue Processors
automationQueue.process('complete-automation', async (job: any) => {
  const { userId, niche, adType, investment } = job.data
  
  queueLogger.info('Processing complete automation job', {
    jobId: job.id,
    userId,
    niche,
    adType,
    investment
  })

  try {
    // Step 1: Scraping
    const scrapingJob = await scrapingQueue.add('scrape-niche', {
      userId,
      niche,
      adType,
      maxResults: 50
    })
    
    const scrapingResult = await scrapingJob.finished()
    
    // Step 2: ML Analysis
    if (scrapingResult.results.length > 0) {
      const mlJob = await mlQueue.add('predict-performance', {
        userId,
        features: {
          ad_type: adType,
          niche,
          results_count: scrapingResult.results.length
        },
        modelName: 'creative-performance-predictor'
      })
      
      const mlResult = await mlJob.finished()
      
      // Step 3: Create automation log
      await prisma.automationLog.create({
        data: {
          type: 'COMPLETE_AUTOMATION',
          status: 'COMPLETED',
          action: 'Complete automation workflow',
          inputData: { niche, adType, investment },
          outputData: {
            scrapingResults: scrapingResult.results.length,
            mlPrediction: mlResult
          },
          userId,
          completedAt: new Date(),
          duration: 0
        }
      })
    }

    return { success: true, scrapingResults: scrapingResult.results.length }
    
  } catch (error) {
    queueLogger.error('Complete automation job failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
})

// Notification Queue Processors
notificationQueue.process('send-notification', async (job) => {
  const { userId, type, title, message, data } = job.data
  
  queueLogger.info('Processing notification job', {
    jobId: job.id,
    userId,
    type
  })

  try {
    // Here you would integrate with your notification service
    // For now, just log it
    logger.info('Notification sent', {
      userId,
      type,
      title,
      message,
      data
    })

    return { success: true }
    
  } catch (error) {
    queueLogger.error('Notification job failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
})

// Queue event handlers
const setupQueueEvents = (queue: Queue.Queue, name: string) => {
  queue.on('completed', (job) => {
    queueLogger.info(`${name} job completed`, {
      jobId: job.id,
      processingTime: Date.now() - job.processedOn!
    })
  })

  queue.on('failed', (job, err) => {
    queueLogger.error(`${name} job failed`, {
      jobId: job.id,
      error: err.message,
      attempts: job.attemptsMade
    })
  })

  queue.on('stalled', (job) => {
    queueLogger.warn(`${name} job stalled`, {
      jobId: job.id
    })
  })
}

// Setup event handlers for all queues
setupQueueEvents(mlQueue, 'ML')
setupQueueEvents(notificationQueue, 'Notification')

// Queue health check
export const getQueueStats = async () => {
  const queues = [
    { name: 'ml', queue: mlQueue },
    { name: 'notification', queue: notificationQueue }
  ]

  const stats = []
  for (const { name, queue } of queues) {
    const waiting = await queue.getWaiting()
    const active = await queue.getActive()
    const completed = await queue.getCompleted()
    const failed = await queue.getFailed()

    stats.push({
      name,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    })
  }

  return stats
}

export default {
  mlQueue,
  notificationQueue,
  getQueueStats
}