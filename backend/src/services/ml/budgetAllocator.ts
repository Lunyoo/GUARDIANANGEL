import fs from 'fs'
import path from 'path'
import { universalBandits } from '../bot/universalBandits'

interface CampaignMetrics {
	campaignId: string
	name: string
	totalSpent: number
	totalLeads: number
	roas: number
	active?: boolean
	lastUpdated: number
	budget?: number
}

interface AllocationDecision {
	id: string
	timestamp: number
	strategy: string
	allocations: { campaignId: string; from: number; to: number; delta: number; rationale: string; recommendedBudget?: number; change?: number; reasoning?: string }[]
	expectedTotalROI: number
	diversificationScore: number
	approved?: boolean
	verified?: boolean
	pendingApproval?: boolean
}

class BudgetAllocatorCore {
	private static _instance: BudgetAllocatorCore
	static getInstance(){ if(!this._instance) this._instance = new BudgetAllocatorCore(); return this._instance }

	private campaigns = new Map<string, CampaignMetrics>()
	private decisions: AllocationDecision[] = []
	private pending: Set<string> = new Set()
	private persistenceFile: string
	private enableApprovals = false

	private constructor(){
		// Enable approval workflow via env toggle (BUDGET_ALLOCATOR_APPROVALS=1)
		try { this.enableApprovals = String(process.env.BUDGET_ALLOCATOR_APPROVALS||'').trim() === '1' } catch {}
		const dir = path.join(process.cwd(),'data'); if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
		this.persistenceFile = path.join(dir,'budget-allocator-state.json')
		this.load()
	}

	setApprovalsMode(enabled: boolean){ this.enableApprovals = !!enabled }
	getApprovalsMode(){ return this.enableApprovals }
	
	// Métodos para auto-otimizador
	getAllCampaigns(){ return [...this.campaigns.values()] }
	updateCampaign(campaignId: string, updates: Partial<CampaignMetrics>){
		const existing = this.campaigns.get(campaignId)
		if (existing) {
			Object.assign(existing, updates)
			this.save()
		}
	}

	private save(){
		try { fs.writeFileSync(this.persistenceFile, JSON.stringify({ campaigns:[...this.campaigns.values()], decisions:this.decisions }, null, 2)) } catch {}
	}
	private load(){
		try {
			if (fs.existsSync(this.persistenceFile)) {
				const d = JSON.parse(fs.readFileSync(this.persistenceFile,'utf-8'))
				d.campaigns?.forEach((c:CampaignMetrics)=> this.campaigns.set(c.campaignId,c))
				this.decisions = d.decisions || []
			}
		} catch {}
	}

	addOrUpdateCampaign(data: Partial<CampaignMetrics> & { campaignId: string; name: string }){
		const existing = this.campaigns.get(data.campaignId)
		const merged: CampaignMetrics = {
			campaignId: data.campaignId,
			name: data.name || existing?.name || data.campaignId,
			totalSpent: data.totalSpent ?? existing?.totalSpent ?? 0,
			totalLeads: data.totalLeads ?? existing?.totalLeads ?? 0,
			roas: data.roas ?? existing?.roas ?? 0,
			active: data.active ?? existing?.active ?? true,
			budget: data.budget ?? existing?.budget ?? 0,
			lastUpdated: Date.now()
		}
		this.campaigns.set(data.campaignId, merged)
		this.save()
	}

	recordRealtimeSpend(campaignId: string, amount: number){
		const c = this.campaigns.get(campaignId); if(!c) return
		c.totalSpent += amount; c.lastUpdated = Date.now(); this.save()
	}

	getMetrics(){
		const list = [...this.campaigns.values()]
		const active = list.filter(c=>c.active!==false)
		const totalBudget = active.reduce((a,b)=>a+(b.budget||0),0)
		const totalSpent = active.reduce((a,b)=>a+b.totalSpent,0)
		const overallROAS = active.length? active.reduce((a,b)=>a+b.roas,0)/active.length : 0
		return {
			totalCampaigns: list.length,
			activeCampaigns: active.length,
			totalBudget,
			totalSpent,
			overallROAS: +overallROAS.toFixed(3)
		}
	}

	private scoreCampaign(c: CampaignMetrics, strategy: string){
		const base = c.roas || 0
		const efficiency = c.totalLeads>0 ? c.roas : base*0.8
		
		// Enhanced ML-based scoring using Universal Bandits insights
		let weight = efficiency
		
		// Get ML insights for budget allocation optimization
		try {
			const mlStats = universalBandits.getStatsByCategory('pricing')
			const topPerformers = universalBandits.getTopPerformers(5)
			const topPricingPerformer = topPerformers.find(arm => arm.category === 'pricing')
			
			// Boost campaigns that align with top-performing ML strategies
			if (topPricingPerformer && c.roas > 1) {
				weight *= 1.1 // 10% boost for profitable campaigns during ML optimization
			}
			
			// Consider overall ML performance for strategy adjustment
			const avgPerformance = mlStats.reduce((sum, stat) => sum + stat.conversionRate, 0) / mlStats.length
			if (avgPerformance > 0.05) { // If ML is performing well (>5% conversion)
				weight *= 1.05 // Slight boost when ML is hot
			}
		} catch (error) {
			// Fallback to original logic if ML data unavailable
		}
		
		// Apply strategy modifiers
		if (strategy === 'balanced') weight *= 1
		else if (strategy === 'growth') weight *= (1 + (Math.random()*0.2))
		else if (strategy === 'defensive') weight *= 0.9 + (c.roas>1?0.2:0)
		
		return Math.max(weight, 0.0001)
	}

	allocateBudget(strategy='balanced'){
		const campaigns = [...this.campaigns.values()].filter(c=>c.active!==false)
		if (campaigns.length === 0) return { allocations:[], expectedTotalROI:0, diversificationScore:0 }
		const totalCurrent = campaigns.reduce((a,b)=>a+(b.budget||0),0) || 1
		const scores = campaigns.map(c=>({ c, s: this.scoreCampaign(c,strategy) }))
		const scoreSum = scores.reduce((a,b)=>a+b.s,0)
		const targetTotal = totalCurrent
		const allocations = scores.map(({c,s})=>{
			const targetShare = s/scoreSum
			const targetBudget = targetTotal * targetShare
			const from = c.budget||0
			c.budget = targetBudget
			const delta = targetBudget-from
			return { campaignId: c.campaignId, from, to: targetBudget, delta, rationale: `scoreShare=${targetShare.toFixed(3)}`, recommendedBudget: targetBudget, change: delta, reasoning: delta===0? 'no-change':'rebalanced' }
		})
		const expectedTotalROI = allocations.reduce((a,b)=>a + (this.campaigns.get(b.campaignId)!.roas * (b.to||0)),0)
		const diversificationScore = 1 - Math.max(...allocations.map(a=> (a.to||0)/(targetTotal||1)))
		const decision: AllocationDecision = { id: Date.now().toString(), timestamp: Date.now(), strategy, allocations, expectedTotalROI, diversificationScore, pendingApproval: this.enableApprovals }
		this.decisions.unshift(decision)
		if (this.decisions.length>500) this.decisions.pop()
		if (decision.pendingApproval) this.pending.add(decision.id)
		this.save()
		return decision
	}

	simulateAllocation(strategy='balanced'){
		return this.previewAllocation(strategy)
	}

	previewAllocation(strategy='balanced'){
		const snapshot = JSON.parse(JSON.stringify([...this.campaigns.values()])) as CampaignMetrics[]
		const total = snapshot.reduce((a,b)=>a+(b.budget||0),0)||1
		const sc = snapshot.map(c=>({ c, s: this.scoreCampaign(c,strategy) }))
		const sum = sc.reduce((a,b)=>a+b.s,0)
		const allocations = sc.map(({c,s})=>{
			const target = total * (s/sum)
			const from = c.budget||0
			const delta = target - from
			return { campaignId: c.campaignId, from, to: target, delta, rationale:'preview', recommendedBudget: target, change: delta, reasoning: 'preview' }
		})
		const expectedTotalROI = allocations.reduce((a,b)=>a + ( (this.campaigns.get(b.campaignId)?.roas||0) * b.to ),0)
		return { allocations, expectedTotalROI, diversificationScore: 1 - Math.max(...allocations.map(a=>a.to/total)) }
	}

	recordCampaignResult(campaignId: string, cost: number, conversions: number, revenue: number){
		// Update spend & lead counts
		const c = this.campaigns.get(campaignId)
		if(!c){
			this.addOrUpdateCampaign({ campaignId, name: campaignId, totalSpent: cost, totalLeads: conversions, roas: cost>0? revenue/cost:0 })
			return
		}
		c.totalSpent += cost
		c.totalLeads += conversions
		if (cost>0) c.roas = revenue / cost
		c.lastUpdated = Date.now()
		this.save()
	}

	health(){
		const m = this.getMetrics()
		const overall = m.overallROAS*50 + (m.activeCampaigns? 50:0)
		return { overall, bottlenecks: [], lastUpdated: new Date().toISOString() }
	}

	getDecisionHistory(limit=100){ return this.decisions.slice(0,limit) }
	listPendingDecisions(){ return this.decisions.filter(d=>d.pendingApproval && !d.approved) }
	approveDecision(id:string){ const d=this.decisions.find(x=>x.id===id); if(!d) return { ok:false, error:'not_found' }; d.approved=true; this.pending.delete(id); this.save(); return { ok:true, decision:d } }
	manualVerify(id:string){ const d=this.decisions.find(x=>x.id===id); if(!d) return { ok:false, error:'not_found' }; d.verified=true; this.save(); return { ok:true, decision:d } }
	bulkReverify(limit=10){ const list=this.decisions.slice(0,limit); list.forEach(d=>d.verified=true); this.save(); return { ok:true, verified:list.length } }
	updatePendingMetrics(){ /* placeholder for metrics registry hook */ }
}

export const budgetAllocator = BudgetAllocatorCore.getInstance()
export type { AllocationDecision, CampaignMetrics }
export const _budgetAllocatorInternal = BudgetAllocatorCore
