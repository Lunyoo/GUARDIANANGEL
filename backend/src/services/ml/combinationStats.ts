// 📊 Combination Stats Service (restored)
import fs from 'fs'
import path from 'path'

interface CombinationEntry {
	key: string
	created: number
	conversions: number
	revenue: number
	firstAt: number
	lastAt: number
	pricing?: string
	approach?: string
	timing?: string
	media?: string
	closing?: string
	script?: string
}

class CombinationStatsService {
	private map = new Map<string, CombinationEntry>()
	private file = path.join(process.cwd(), 'data', 'combinationStats.json')
	constructor(){ this.load() }
	private buildKey(parts: Record<string, string|undefined>) {
		return [parts.pricing, parts.approach, parts.timing, parts.media, parts.closing, parts.script]
			.map(v=> v || '-')
			.join('|')
	}
	private load(){
		try {
			const raw = fs.readFileSync(this.file,'utf-8')
			const obj = JSON.parse(raw)
			if (Array.isArray(obj.entries)) {
				this.map = new Map(obj.entries.map((e: CombinationEntry)=> [e.key, e]))
			}
		} catch {}
	}
	private persist(){
		try {
			fs.mkdirSync(path.dirname(this.file), { recursive: true })
			fs.writeFileSync(this.file, JSON.stringify({ entries: Array.from(this.map.values()) }, null, 2))
		} catch {}
	}
	updateCombination(parts: Record<string,string|undefined>, revenue: number){
		const key = this.buildKey(parts)
		const now = Date.now()
		let agg = this.map.get(key)
		if (!agg){
			agg = { key, created:0, conversions:0, revenue:0, firstAt: now, lastAt: now, ...parts }
			this.map.set(key, agg)
		}
		if (revenue > 0){
			agg.conversions += 1
			agg.revenue += revenue
		} else {
			agg.created += 1
		}
		agg.lastAt = now
		this.persist()
		return agg
	}
	getTop(limit=20){
		return Array.from(this.map.values())
			.sort((a,b)=> b.revenue - a.revenue || b.conversions - a.conversions)
			.slice(0, limit)
	}
}

export const combinationStats = new CombinationStatsService()
export function updateCombinationStats(event: any){
	combinationStats.updateCombination({
		pricing: event.pricingArmId,
		approach: event.approachArmId,
		timing: event.timingArmId,
		media: event.mediaArmId,
		closing: event.closingArmId,
		script: event.scriptArmId
	}, event.revenue)
}
