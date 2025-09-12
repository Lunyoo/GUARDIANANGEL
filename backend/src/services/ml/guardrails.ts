// 🛡️ Guardrails simples de budget x conversões (restored)
import fs from 'fs'
import path from 'path'

interface GuardrailState {
	lastCheck: number
	frozen: boolean
	spendWindow: number
	conversionsWindow: number
	createdWindow: number
	reason?: string
}

class GuardrailsService {
	private state: GuardrailState = { lastCheck:0, frozen:false, spendWindow:0, conversionsWindow:0, createdWindow:0 }
	private file = path.join(process.cwd(), 'data', 'guardrails.json')
	private spendEvents: Array<{ ts:number; amount:number }> = []
	private conversionEvents: number[] = []
	private createdEvents: number[] = []
	constructor(){ this.load() }
	private load(){
		try {
			const raw = fs.readFileSync(this.file,'utf-8')
			this.state = JSON.parse(raw)
			if (typeof this.state.spendWindow !== 'number') this.state.spendWindow = 0
			if (typeof this.state.conversionsWindow !== 'number') this.state.conversionsWindow = 0
			if (typeof this.state.createdWindow !== 'number') this.state.createdWindow = 0
			const eventsFile = this.file.replace('.json','-events.json')
			if (fs.existsSync(eventsFile)) {
				try {
					const evRaw = JSON.parse(fs.readFileSync(eventsFile,'utf-8'))
					this.spendEvents = Array.isArray(evRaw.spend) ? evRaw.spend : []
					this.conversionEvents = Array.isArray(evRaw.conv) ? evRaw.conv : []
					this.createdEvents = Array.isArray(evRaw.created) ? evRaw.created : []
				} catch {}
			}
		} catch {}
	}
	private persist(){
		try {
			fs.mkdirSync(path.dirname(this.file), { recursive: true })
			fs.writeFileSync(this.file, JSON.stringify(this.state, null, 2))
			const eventsFile = this.file.replace('.json','-events.json')
			this.prune(Date.now())
			fs.writeFileSync(eventsFile, JSON.stringify({ spend: this.spendEvents.slice(-500), conv: this.conversionEvents.slice(-500), created: this.createdEvents.slice(-500) }))
		} catch {}
	}
	private prune(now:number){
		const cutoff = now - 24*60*60*1000
		this.spendEvents = this.spendEvents.filter(e=> e.ts >= cutoff)
		this.conversionEvents = this.conversionEvents.filter(ts=> ts >= cutoff)
		this.createdEvents = this.createdEvents.filter(ts=> ts >= cutoff)
	}
	recordSpend(amount:number){
		if (!amount || amount <= 0) return
		const now = Date.now()
		this.spendEvents.push({ ts: now, amount })
		this.prune(now)
		this.state.spendWindow = this.spendEvents.reduce((s,e)=> s+e.amount, 0)
		this.persist()
	}
	checkBudgetGuardrails(metrics: any, cfg?: { minConv?: number; maxSpendPerNoConv?: number }){
		const minConv = cfg?.minConv ?? 1
		const maxSpendPerNoConv = cfg?.maxSpendPerNoConv ?? 150
		this.state.lastCheck = Date.now()
		this.prune(this.state.lastCheck)
		this.state.spendWindow = this.spendEvents.length ? this.spendEvents.reduce((s,e)=> s+e.amount,0) : metrics.spendLast24h
		this.state.conversionsWindow = this.conversionEvents.length ? this.conversionEvents.length : metrics.conversionsLast24h
		this.state.createdWindow = this.createdEvents.length ? this.createdEvents.length : (metrics.createdLast24h ?? this.state.createdWindow)
		const spend = this.state.spendWindow
		const convs = this.state.conversionsWindow
		if (convs < minConv && spend >= maxSpendPerNoConv){
			this.state.frozen = true
			this.state.reason = `Sem conversões com gasto R$${spend}`
		} else if (this.state.frozen && convs >= minConv) {
			this.state.frozen = false
			this.state.reason = undefined
		}
		this.persist()
		return { ...this.state }
	}
	recordCreated(){ const now = Date.now(); this.createdEvents.push(now); this.prune(now); this.state.createdWindow = this.createdEvents.length; this.persist() }
	recordConversion(){ const now = Date.now(); this.conversionEvents.push(now); this.prune(now); this.state.conversionsWindow = this.conversionEvents.length; this.persist() }
	forceFreeze(reason='manual-freeze'){ this.state.frozen = true; this.state.reason = reason; this.state.lastCheck = Date.now(); this.persist(); return { ...this.state } }
	unfreeze(reason='manual-unfreeze'){ this.state.frozen = false; this.state.reason = reason; this.state.lastCheck = Date.now(); this.persist(); return { ...this.state } }
	getState(){ return { ...this.state } }
}

export const guardrails = new GuardrailsService()
