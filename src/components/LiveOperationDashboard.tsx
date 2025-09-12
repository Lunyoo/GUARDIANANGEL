import React, { useEffect, useState } from 'react'

// Painel de operação ao vivo: consome eventos e snapshot de /api/ops/dashboard
// Mostra fluxo recente de eventos (SSE) e métricas essenciais.

interface LiveEvent { id:string; type:string; ts:number; message?:string; payload?:any }

export default function LiveOperationDashboard(){
	const [ops,setOps]=useState<any>(null)
	const [events,setEvents]=useState<LiveEvent[]>([])
	const [connected,setConnected]=useState(false)
	const [lag,setLag]=useState<number|null>(null)

	// Snapshot periódico
	useEffect(()=>{
		let cancelled=false
		const load=async()=>{ try { const r=await fetch('/api/ops/dashboard'); if(!r.ok) return; const j=await r.json(); if(!cancelled) setOps(j) } catch {} }
		load(); const id=setInterval(load,15000); return ()=>{ cancelled=true; clearInterval(id) }
	},[])

	// SSE eventos gerais (/api/events ou /api/bot/events fallback)
	useEffect(()=>{
		let es:EventSource|undefined
		function connect(){
			try { es = new EventSource('/api/events'); setConnected(true) } catch { try { es = new EventSource('/api/bot/events'); setConnected(true) } catch { setConnected(false) } }
			if(!es) return
			es.onmessage = ev => {
				try {
					const data = JSON.parse(ev.data)
					const evt:LiveEvent = { id: data.id||'e'+Date.now()+Math.random().toString(36).slice(2,7), type: data.type||'message', ts: Date.now(), message: data.message||data.body||'', payload: data }
					setEvents(e=>{ const next=[evt,...e]; return next.slice(0,100) })
				} catch {}
			}
			es.onerror = ()=>{ setConnected(false); try{ es?.close() }catch{}; setTimeout(connect,3000) }
		}
		connect();
		return ()=>{ try{ es?.close() }catch{} }
	},[])

	// Lag calculado (diferença de ts de evento)
	useEffect(()=>{ if(events.length<2) return; const l = events[0].ts - events[1].ts; setLag(l) },[events])

	return (
		<div className="space-y-6 p-2">
			<header className="flex items-center gap-3">
				<h2 className="text-xl font-semibold">Operação em Tempo Real</h2>
				<span className={`text-[10px] px-2 py-1 rounded ${connected? 'bg-green-600/30 text-green-300':'bg-red-600/30 text-red-300'}`}>{connected? 'LIVE':'OFF'}</span>
				{lag!=null && <span className="text-[10px] text-gray-400">Δ {lag} ms</span>}
			</header>
			{ops && (
				<div className="grid md:grid-cols-4 gap-3">
					<OpMetric label="Campanhas" value={ops.allocator?.totalCampaigns} />
					<OpMetric label="Queue" value={ops.queue?.size} />
						<OpMetric label="Diversificação" value={ops.allocator?.diversificationScore!=null ? (ops.allocator.diversificationScore*100).toFixed(1)+'%':'n/a'} />
					<OpMetric label="Health" value={ops.health?.status} />
				</div>
			)}
			<div className="border border-gray-800 rounded-xl overflow-hidden">
				<div className="px-4 py-2 text-xs font-semibold bg-gray-900/70 border-b border-gray-800">Eventos Recentes</div>
				<ul className="max-h-[60vh] overflow-y-auto divide-y divide-gray-800 text-xs">
					{events.map(e=> (
						<li key={e.id} className="px-3 py-2 hover:bg-gray-900/50">
							<div className="flex items-center justify-between">
								<span className="font-medium text-cyan-300">{e.type}</span>
								<span className="text-[9px] text-gray-500">{new Date(e.ts).toLocaleTimeString()}</span>
							</div>
							{e.message && <div className="text-gray-400 mt-0.5 line-clamp-2">{e.message}</div>}
						</li>
					))}
					{!events.length && <li className="px-3 py-4 text-gray-500">Aguardando eventos...</li>}
				</ul>
			</div>
		</div>
	)
}

function OpMetric({ label, value }: { label:string; value:any }){
	return (
		<div className="p-3 rounded-lg bg-gray-900/50 border border-gray-800">
			<div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">{label}</div>
			<div className="text-lg font-semibold text-cyan-300">{value!=null? value: '—'}</div>
		</div>
	)
}

