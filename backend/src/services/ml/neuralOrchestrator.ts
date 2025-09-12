import { leadScoringEngine } from './leadScoring'
import { contextualBotPolicy } from './contextualBotPolicy'
import { intelligentQueue } from './intelligentQueue'

interface NeuralDecision { 
  leadId: string
  score: number
  segment: string
  botAction: any
  queue: any
  ts: number
  processedAt: Date
  reasoning: string[]
  actions: {
    scoring?: any
    botAction?: any
  }
}

class NeuralOrchestrator {
	private events: { leadId:string; type:string; ts:number }[] = []
	private processedCount = 0
	private lastProcessTs = 0

	async processLead(leadId: string, source='api', context?: any): Promise<NeuralDecision> {
		const scoring = await leadScoringEngine.scoreIead(leadId)
		const botAction = await contextualBotPolicy.decide(leadId)
		const queueItem = await intelligentQueue.enqueue(leadId)
		this.processedCount++; this.lastProcessTs = Date.now()
		return { 
			leadId, 
			score: scoring.score, 
			segment: scoring.segment, 
			botAction, 
			queue: queueItem, 
			ts: Date.now(), 
			processedAt: new Date(),
			reasoning: ['Lead processed successfully'],
			actions: {
				scoring,
				botAction
			}
		}
	}
	async processEvent(leadId:string, eventType:string){
		this.events.push({ leadId, type:eventType, ts: Date.now() })
		if (this.events.length>5000) this.events.shift()
	}
	async getDashboardData(){
		return {
			processed: this.processedCount,
			lastProcessTs: this.lastProcessTs,
			eventsLast100: this.events.slice(-100),
			queue: intelligentQueue.getMetrics(),
			policy: contextualBotPolicy.getMetrics(),
			scoringVersion: leadScoringEngine.modelVersion
		}
	}
	async getSystemMetrics(){
		const queueMetrics = intelligentQueue.getMetrics()
		return {
			modelVersion: leadScoringEngine.modelVersion,
			policyArms: contextualBotPolicy.getMetrics(),
			queue: queueMetrics,
			processed: this.processedCount,
			health: { overall: 80, bottlenecks: queueMetrics.queueLength>100? ['queue_backlog']:[] }
		}
	}
}

export const neuralOrchestrator = new NeuralOrchestrator()
export type { NeuralDecision }