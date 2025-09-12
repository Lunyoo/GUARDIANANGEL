interface Insight { id: string; type: string; message: string; severity: 'low'|'medium'|'high'; ts: number; meta?: any }

class AutoInsightSystem {
	private insights: Insight[] = []
	record(event: { type:string; data:any }){
		const severity = event.type.includes('error')? 'high' : event.type.includes('warn')? 'medium':'low'
		this.insights.unshift({ id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), type: event.type, message: JSON.stringify(event.data).slice(0,200), severity, ts: Date.now(), meta: event.data })
		if (this.insights.length>500) this.insights.pop()
	}
	addInsight(raw: any){
		// Accept extended shape { title, description, suggestedAction, confidence, potentialImpact, priority, ... }
		const id = raw.id || Date.now().toString(36)+Math.random().toString(36).slice(2,6)
		const message = raw.description || raw.message || raw.title || 'insight'
		const severity: 'low'|'medium'|'high' = raw.priority==='high' || raw.severity==='high'? 'high' : raw.priority==='medium' || raw.severity==='medium'? 'medium':'low'
		const insight: Insight = { id, type: raw.type || 'system', message, severity, ts: raw.createdAt? new Date(raw.createdAt).getTime(): Date.now(), meta: raw }
		this.insights.unshift(insight)
		if (this.insights.length>500) this.insights.pop()
		return insight
	}
	list(limit=50){ return this.insights.slice(0,limit) }
	summarize(){
		const counts = this.insights.reduce((a,i)=>{ a[i.severity]=(a[i.severity]||0)+1; return a },{} as Record<string,number>)
		return { total: this.insights.length, counts }
	}
}

export const autoInsightSystem = new AutoInsightSystem()
export default autoInsightSystem
