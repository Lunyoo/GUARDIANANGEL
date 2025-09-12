interface OptimizationRecommendation { type: string; action: string; confidence: number; expectedImprovement: string }

interface SystemDecision { id: string; ts: number; finalAction: { type:string; action?:string; meta?:any }; legacyAction?:string; approvalRequired: boolean; expectedROI: number; confidence: number; reasoning: string }

export interface SystemContext { 
  market?: string
  timeframeHours?: number
  activeCampaigns?: number
  conversation?: {
    leadId: string
    customerProfile: string
    messageHistory: string[]
    currentStage: string
    timeElapsed: number
    previousActions: any[]
    customerSentiment: number
    urgencyLevel: number
    budget: number
  }
  currentBudget?: number
  dailySpent?: number
  monthlyTarget?: number
  currentROAS?: number
  activeConversations?: number
  conversionRateToday?: number
  avgTicket?: number
  maxBudgetPerDecision?: number
  approvalThreshold?: number
  riskTolerance?: 'low' | 'medium' | 'high'
}

class SuperIntelligentSystemCore {
	private ideas: any[] = []
	private optimizations: any[] = []
	private conversions: { id: string; value: number; campaignId?: string; ts: number; meta?: any }[] = []
	private decisions: SystemDecision[] = []

	async analyzeCampaignIdea(params:{ description:string; budget:number; targetAudience:string; objective:string }){
		const baseConfidence = 0.6 + Math.random()*0.3
		const idea = {
			id: Date.now().toString(36)+Math.random().toString(36).slice(2,6),
			description: params.description,
			recommendations: [ `Focar em segmentação ${params.targetAudience}`, 'Testar 3 variações criativas', 'Ajustar orçamento progressivamente' ],
			suggestedAdjustments: [ { field:'budget', change:'+15%' } ],
			expectedResults: { expectedROI: 1.4 + Math.random()*0.6, confidence: baseConfidence },
			riskLevel: baseConfidence>0.75? 'low' : baseConfidence>0.65? 'medium':'high',
			createdAt: Date.now()
		}
		this.ideas.push(idea)
		if (this.ideas.length>1000) this.ideas.shift()
		return idea
	}
	async optimizeCampaign(params:{ campaignId:string; currentMetrics:{ impressions:number; clicks:number; conversions:number; spend:number }; targetAudience:string; objective:string }){
		const recs: OptimizationRecommendation[] = []
		if (params.currentMetrics.clicks>0 && params.currentMetrics.conversions/params.currentMetrics.clicks < 0.02){
			recs.push({ type:'funnel', action:'melhorar landing page', confidence:0.7, expectedImprovement:'+10% conv' })
		}
		if (params.currentMetrics.impressions>0 && params.currentMetrics.clicks/params.currentMetrics.impressions < 0.01){
			recs.push({ type:'creative', action:'testar novo criativo', confidence:0.65, expectedImprovement:'+0.3 CTR' })
		}
		const expectedROASIncrease = 0.1 + Math.random()*0.2
		const opt = {
			id: Date.now().toString(36),
			campaignId: params.campaignId,
			currentPerformance: {
				ctr: params.currentMetrics.impressions? params.currentMetrics.clicks/params.currentMetrics.impressions : 0,
				conversionRate: params.currentMetrics.clicks? params.currentMetrics.conversions/params.currentMetrics.clicks : 0,
				cpa: params.currentMetrics.conversions? params.currentMetrics.spend/params.currentMetrics.conversions : 0,
				roas: 1 + Math.random()
			},
			optimizations: recs,
			improvementPotential: { score: recs.length? 0.6:0.3 },
			priority: recs.length>1? 'high': 'medium',
			estimatedImpact: { expectedROASIncrease },
			recommendations: recs.map(r=>r.action),
			ts: Date.now()
		}
		this.optimizations.push(opt)
		if (this.optimizations.length>2000) this.optimizations.shift()
		return opt
	}
	recordConversion(orderId: string, value: number, meta?: any){
		this.conversions.push({ id: orderId, value, campaignId: meta?.campaignId, ts: Date.now(), meta })
		if (this.conversions.length>5000) this.conversions.shift()
	}
	async makeSuperIntelligentDecision(context: SystemContext): Promise<SystemDecision>{
		const recent = this.conversions.slice(-200)
		const totalValue = recent.reduce((a,b)=>a+b.value,0)
		const avg = recent.length? totalValue/recent.length:0
		let finalType = 'hold'
		if (avg>150) finalType='scale'
		else if (avg<50) finalType='pause_low_performers'
		// Example meta reasoning expansion
		const meta = { avgConversionValue: avg, sample: recent.length }
		const decision: SystemDecision = { id: Date.now().toString(), ts: Date.now(), finalAction: { type: finalType, meta }, legacyAction: finalType, approvalRequired: finalType!=='hold', expectedROI: avg, confidence: Math.min(0.95, recent.length/200), reasoning: `avgConvValue=${avg.toFixed(2)} n=${recent.length}` }
		this.decisions.push(decision)
		if (this.decisions.length>1000) this.decisions.shift()
		return decision
	}
	getSystemMetrics(){
		const convCount = this.conversions.length
		const value = this.conversions.reduce((a,b)=>a+b.value,0)
		const avg = convCount? value/convCount:0
		return {
			ts: Date.now(),
			conversions: convCount,
			conversionValue: +value.toFixed(2),
			avgConversionValue: +avg.toFixed(2),
			ideas: this.ideas.length,
			optimizations: this.optimizations.length,
			lastDecision: this.decisions[this.decisions.length-1],
			health: { overall: Math.min(100, avg), bottlenecks: [] }
		}
	}
}

export const superIntelligentSystem = new SuperIntelligentSystemCore()