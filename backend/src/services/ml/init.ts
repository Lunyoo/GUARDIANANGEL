import logger from '../../config/logger.js'
import { leadScoringEngine } from './leadScoring.js'
import { contextualBotPolicy } from './contextualBotPolicy.js'
import { intelligentQueue } from './intelligentQueue.js'
import { budgetAllocator } from './budgetAllocator.js'
import { neuralOrchestrator } from './neuralOrchestrator.js'

/**
 * Explicit ML subsystem warm-up to ensure persistence files are loaded
 * and a clear operational log line is emitted for each component.
 */
export async function initMLServices() {
  try {
    // Touch each singleton so it loads state
    const scoringVersion = leadScoringEngine.modelVersion
    logger.info(`ML init: leadScoringEngine ready (modelVersion=${scoringVersion})`)

    const policyMetrics = contextualBotPolicy.getMetrics()
    logger.info(`ML init: contextualBotPolicy ready (arms=${policyMetrics.arms.length})`)

    const qMetrics = intelligentQueue.getMetrics()
    logger.info(`ML init: intelligentQueue ready (queueLength=${qMetrics.queueLength}, agents=${qMetrics.agents.length})`)

    let allocMetrics = budgetAllocator.getMetrics()
    if (allocMetrics.totalCampaigns === 0) {
      // Minimal auto-seed for first-run environments (non-production only)
      if (process.env.NODE_ENV !== 'production') {
        const bootstrap = [
          { campaignId:'AUTO-SEED-A', name:'Auto Seed A', totalSpent:500, totalLeads:18, roas:1.8, budget:600 },
          { campaignId:'AUTO-SEED-B', name:'Auto Seed B', totalSpent:300, totalLeads:9, roas:1.5, budget:400 }
        ]
        bootstrap.forEach(c=> budgetAllocator.addOrUpdateCampaign(c))
        allocMetrics = budgetAllocator.getMetrics()
        logger.info(`ML init: budgetAllocator auto-seeded (campaigns=${allocMetrics.totalCampaigns})`)
      } else {
        logger.warn('ML init: budgetAllocator empty in production (no auto-seed applied)')
      }
    } else {
      logger.info(`ML init: budgetAllocator ready (campaigns=${allocMetrics.totalCampaigns})`)
    }

    // Lightweight orchestrator health snapshot
    const orchestration = await neuralOrchestrator.getSystemMetrics()
    logger.info(`ML init: neuralOrchestrator ready (processed=${orchestration.processed})`)
  } catch (e:any) {
    logger.error('ML init failed', { error: e?.message })
  }
}

// Ensure treated as module even if tree-shaken
export const __ml_init_module = true
