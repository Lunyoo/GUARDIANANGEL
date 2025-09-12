
import React, { useEffect, useState } from 'react'
import { Activity, Cpu, RefreshCw, BarChart3, PieChart, Wifi, WifiOff, MessageSquare, Power } from 'lucide-react'

interface OpsSnapshot {
	health?: { score:number; status:string }
	allocator?: { totalCampaigns:number; activeCampaigns:number; overallROAS:number; diversificationScore?:number }
	queue?: { queueLength:number; agents:any[] }
	botPolicy?: { arms:number; total?:number }
	scoring?: { modelVersion:string }
	allocatorHistory?: any[]
}

export default function CommandCenter(){
	const [data,setData]=useState<OpsSnapshot|null>(null)
	const [ts,setTs]=useState<number>(0)
	const [loading,setLoading]=useState(false)
	const [error,setError]=useState<string|null>(null)
	const [history,setHistory]=useState<any[]>([])
	const [fbKpis,setFbKpis]=useState<any>(null)
	const [campaigns,setCampaigns]=useState<any[]>([])
	const [account,setAccount]=useState<any>(null)
	const [wa,setWa]=useState<{ ready:boolean; hasQr:boolean; status:string; mode?:string }|null>(null)
	const [waBusy,setWaBusy]=useState(false)

	async function load(){
		try{
			setLoading(true); setError(null)
			const r = await fetch('/api/ops/dashboard'); if(!r.ok) throw new Error('Falha ops dashboard')
			const j = await r.json(); setData(j); setTs(Date.now())
			// Carregar histórico de decisões allocator
			const h = await fetch('/api/allocator/history?limit=20')
			if(h.ok){ const hj = await h.json(); setHistory(hj.decisions||[]) }
		} catch(e:any){ setError(e.message) } finally { setLoading(false) }
	}
	useEffect(()=>{ load(); const id=setInterval(load,15000); return ()=> clearInterval(id) },[])

		// Facebook KPIs/Campaigns/Account (from env-authenticated user)
		useEffect(()=>{ let cancelled=false
			async function loadFb(){
				try {
					const [k,c,a] = await Promise.all([
						fetch('/api/campaigns/kpis'),
						fetch('/api/campaigns'),
						fetch('/api/campaigns/facebook/account')
					])
					if(!cancelled){
						if(k.ok){ const kj=await k.json(); setFbKpis(kj.kpis||{}) }
						if(c.ok){ const cj=await c.json(); setCampaigns(cj.campaigns||[]) }
						if(a.ok){ const aj=await a.json(); setAccount(aj) }
					}
				} catch {}
			}
			loadFb(); const id=setInterval(loadFb, 30000); return ()=>{ cancelled=true; clearInterval(id) }
		},[])

	// WhatsApp status polling (non-blocking)
	useEffect(()=>{ let stop=false
		async function loadWA(){
			try{ const r=await fetch('/api/bot/whatsapp/status'); if(r.ok){ const j=await r.json(); if(!stop) setWa({ ready: !!j.whatsapp, hasQr: !!j.hasQr, status: j.status||'unknown', mode: j.mode }) } }
			catch{}
		}
		loadWA(); const id=setInterval(loadWA, 5000); return ()=>{ stop=true; clearInterval(id) }
	},[])

	async function waAction(kind:'connect'|'restart'|'disconnect'|'fresh-restart'){
		try{ 
			setWaBusy(true); 
			console.log(`WhatsApp ${kind} iniciado...`)
			
			// Para fresh-restart, usa a nova rota
			const endpoint = kind === 'fresh-restart' ? '/api/bot/whatsapp/fresh-restart' : `/api/bot/whatsapp/${kind}`
			const r = await fetch(endpoint, { method:'POST' })
			const result = await r.json().catch(()=>null)
			
			if (!r.ok) {
				console.error(`WhatsApp ${kind} falhou:`, result?.error || 'Unknown error')
				const actionName = kind === 'restart' ? 'reiniciar' : 
								  kind === 'fresh-restart' ? 'reiniciar completamente' :
								  kind === 'connect' ? 'conectar' : 'desconectar'
				alert(`Erro ao ${actionName}: ${result?.error || 'Erro desconhecido'}`)
			} else {
				console.log(`WhatsApp ${kind} concluído:`, result)
				if (kind === 'fresh-restart' && result.freshQR) {
					alert('✅ Reinício completo realizado! Novo QR code gerado.')
				}
			}
		} catch(e) { 
			console.error(`WhatsApp ${kind} exception:`, e)
			const actionName = kind === 'restart' ? 'reiniciar' : 
							  kind === 'fresh-restart' ? 'reiniciar completamente' :
							  kind === 'connect' ? 'conectar' : 'desconectar'
			alert(`Erro de conexão ao ${actionName} WhatsApp`)
		} finally{ 
			setWaBusy(false) 
		}
	}

	// Mini gráfico de ROI
	function renderROIGraph(){
		if(!history.length) return null
		const rois = history.map(d=>d.expectedTotalROI||0)
		const max = Math.max(...rois,1)
		return (
			<div className="p-2 bg-gray-900/60 rounded-xl border border-gray-800">
				<div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-cyan-400"/><span className="text-xs text-gray-400">ROI últimas decisões</span></div>
				<div className="flex gap-1 items-end h-12">
					{rois.map((v,i)=>(<div key={i} style={{height:`${Math.max(6,v/max*40)}px`}} className="w-2 bg-cyan-400/70 rounded"/>))}
				</div>
			</div>
		)
	}

	// Mini gráfico de distribuição de orçamento
	function renderBudgetPie(){
		if(!history.length) return null
		const last = history[0]
		if(!last?.allocations) return null
		const total = last.allocations.reduce((acc:any,c:any)=>acc+c.recommendedBudget,0)
		return (
			<div className="p-2 bg-gray-900/60 rounded-xl border border-gray-800">
				<div className="flex items-center gap-2 mb-1"><PieChart className="w-4 h-4 text-purple-400"/><span className="text-xs text-gray-400">Distribuição orçamento</span></div>
				<div className="flex gap-1 items-center">
					{last.allocations.map((a:any,i:number)=>(<div key={i} style={{width:`${Math.max(6,a.recommendedBudget/total*60)}px`,height:'16px',background:`hsl(${i*40},70%,60%)`}} className="rounded" title={a.campaignId}/>))}
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4 p-4">
			<div className="flex items-center gap-3">
				<div className="p-2 rounded-lg bg-gray-800 border border-gray-700"><Activity className="w-5 h-5 text-cyan-400"/></div>
				<h2 className="text-lg font-semibold">Command Center</h2>
				<button onClick={load} className="ml-auto text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 flex items-center gap-1"><RefreshCw className={`w-3 h-3 ${loading? 'animate-spin':''}`}/>Refresh</button>
			</div>
			{error && <div className="text-xs text-red-400">{error}</div>}
			<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard title="Health" value={data? data.health?.score?.toFixed(0):'—'} subtitle={data?.health?.status?.toUpperCase()||'—'} />
				<MetricCard title="Campanhas" value={campaigns.length||'—'} subtitle={`Ativas ${campaigns.filter((c:any)=> (c.status||'').toUpperCase()==='ACTIVE').length}`} />
				<MetricCard title="Investido" value={fbKpis? formatCurrency(fbKpis.gasto_total, account?.currency):'—'} subtitle="Últimos 30 dias" />
				<MetricCard title="ROAS" value={fbKpis? (fbKpis.roas_media||0).toFixed(2):'—'} subtitle="Médio" />
			</div>

			{/* WhatsApp status & KPIs */}
			<div className="grid md:grid-cols-2 gap-4">
				<div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/60">
					<div className="flex items-center gap-2 mb-3">
						{wa?.ready ? <Wifi className="w-4 h-4 text-emerald-400"/> : <WifiOff className="w-4 h-4 text-red-400"/>}
						<div className="text-sm font-medium text-gray-300">WhatsApp</div>
						<span className={`text-xs ml-2 px-2 py-0.5 rounded ${wa?.ready? 'bg-emerald-900/30 text-emerald-300 border border-emerald-800/40':'bg-red-900/30 text-red-300 border border-red-800/40'}`}>{wa?.status||'...'}</span>
						{wa?.mode && <span className="text-[10px] text-gray-500 ml-auto">modo: {wa.mode}</span>}
					</div>
					<div className="flex items-center gap-3">
						{!wa?.ready && wa?.hasQr ? <QrInline/> : <div className="text-xs text-gray-400">{wa?.ready? 'Conectado e pronto.':'Aguardando conexão...'}</div>}
					</div>
					<div className="mt-3 flex gap-2 flex-wrap">
						<button title="Conectar/Inicializar" onClick={()=>waAction('connect')} disabled={waBusy} className="px-3 py-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-xs disabled:opacity-50 flex items-center gap-1">
							<MessageSquare className="w-4 h-4"/>
							{waBusy ? 'Conectando...' : 'Conectar'}
						</button>
						<button title="Reiniciar cliente" onClick={()=>waAction('restart')} disabled={waBusy} className="px-3 py-2 rounded bg-purple-700 hover:bg-purple-600 text-white text-xs disabled:opacity-50 flex items-center gap-1">
							{waBusy ? <RefreshCw className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
							{waBusy ? 'Reiniciando...' : 'Reiniciar'}
						</button>
						<button title="Reiniciar Completo - Limpa todas as sessões e gera novo QR" onClick={()=>waAction('fresh-restart')} disabled={waBusy} className="px-3 py-2 rounded bg-orange-700 hover:bg-orange-600 text-white text-xs disabled:opacity-50 flex items-center gap-1">
							{waBusy ? <RefreshCw className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
							{waBusy ? 'Limpando...' : 'Novo QR'}
						</button>
						<button title="Desconectar" onClick={()=>waAction('disconnect')} disabled={waBusy} className="px-3 py-2 rounded bg-red-700 hover:bg-red-600 text-white text-xs disabled:opacity-50 flex items-center gap-1">
							<Power className="w-4 h-4"/>
							{waBusy ? 'Desconectando...' : 'Desconectar'}
						</button>
					</div>
				</div>
				<div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/60">
					<div className="text-gray-300 text-sm font-medium mb-2">KPIs Facebook</div>
					<ul className="text-xs text-gray-300 space-y-1">
						<li>Impressões: <b className="text-cyan-300">{fbKpis?.impressoes_total?.toLocaleString('pt-BR')??'—'}</b></li>
						<li>Cliques: <b className="text-cyan-300">{fbKpis?.cliques_total?.toLocaleString('pt-BR')??'—'}</b></li>
						<li>Conversões: <b className="text-cyan-300">{fbKpis?.conversoes_total??'—'}</b></li>
						<li>CTR médio: <b className="text-cyan-300">{fbKpis? (fbKpis.ctr_media||0).toFixed(2)+'%':'—'}</b></li>
						<li>CPM médio: <b className="text-cyan-300">{fbKpis? formatCurrency(fbKpis.cpm_media, account?.currency):'—'}</b></li>
					</ul>
				</div>
			</div>

			{/* Extras */}
			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
				<Mini title="Saldo Conta" value={account? formatCurrency(parseFloat(account.balance||'0'), account.currency):'—'} />
				<Mini title="Gasto Total" value={account? formatCurrency(parseFloat(account.amount_spent||'0'), account.currency):'—'} />
				<Mini title="Conv. Rate" value={fbKpis && fbKpis.cliques_total > 0? ((fbKpis.conversoes_total/fbKpis.cliques_total)*100).toFixed(2)+'%':'—'} />
				<Mini title="CPM Médio" value={fbKpis? formatCurrency(fbKpis.cpm_media, account?.currency):'—'} />
				<Mini title="CPC Médio" value={fbKpis && fbKpis.cliques_total > 0? formatCurrency(fbKpis.gasto_total/fbKpis.cliques_total, account?.currency):'—'} />
				<Mini title="Fila ML" value={data? data.queue?.queueLength:'—'} />
			</div>

			{/* Campanhas + gráficos */}
			<div className="grid md:grid-cols-3 gap-4">
				<div className="md:col-span-2 p-4 rounded-xl bg-gray-800/50 border border-gray-700/60">
					<div className="text-gray-300 text-sm font-medium mb-3">Top Campanhas (por gasto)</div>
					<div className="overflow-x-auto">
						<table className="w-full text-xs">
							<thead className="text-gray-500"><tr><th className="text-left py-1">Nome</th><th className="text-right py-1">Gasto</th><th className="text-right py-1">Cliques</th><th className="text-right py-1">Imp.</th><th className="text-right py-1">ROAS</th><th className="text-right py-1">Status</th></tr></thead>
							<tbody className="divide-y divide-gray-800">
								{campaigns.sort((a:any,b:any)=> (b.gasto||0)-(a.gasto||0)).slice(0,8).map((c:any)=> (
									<tr key={c.id} className="hover:bg-gray-900/40">
										<td className="py-1 pr-2 max-w-[320px] truncate">{c.nome}</td>
										<td className="py-1 text-right">{formatCurrency(c.gasto, account?.currency)}</td>
										<td className="py-1 text-right">{c.cliques?.toLocaleString('pt-BR')}</td>
										<td className="py-1 text-right">{c.impressoes?.toLocaleString('pt-BR')}</td>
										<td className="py-1 text-right">{(c.roas||0).toFixed(2)}</td>
										<td className="py-1 text-right"><span className={`px-2 py-0.5 rounded text-[10px] ${String(c.status).toUpperCase()==='ACTIVE'?'bg-emerald-600/30 text-emerald-300':'bg-gray-700/40 text-gray-300'}`}>{c.status}</span></td>
									</tr>
								))}
								{campaigns.length===0 && <tr><td colSpan={6} className="py-2 text-gray-500">Sem campanhas</td></tr>}
							</tbody>
						</table>
					</div>
				</div>
				<div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/60">
					{renderROIGraph()}
					<div className="mt-3"/>
					{renderBudgetPie()}
				</div>
			</div>

			<div className="text-[10px] text-gray-500 flex items-center gap-2"><Cpu className="w-3 h-3"/> Atualizado {ts? new Date(ts).toLocaleTimeString('pt-BR'):'—'}</div>
		</div>
	)
}

function MetricCard({ title, value, subtitle }:{ title:string; value:any; subtitle?:string }){ return (<div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/60"><div className="text-gray-400 text-xs uppercase tracking-wide mb-1">{title}</div><div className="text-2xl font-semibold text-white">{value}</div><div className="text-[11px] text-gray-500">{subtitle}</div></div>) }
function Mini({ title, value }:{ title:string; value:any }){ return (<div className="p-3 rounded-lg bg-gray-900/60 border border-gray-700/50 flex flex-col gap-1"><div className="text-[10px] text-gray-500 uppercase tracking-wide">{title}</div><div className="text-sm font-medium text-cyan-300">{value}</div></div>) }

// Helper para formatação de moeda

// Helper para formatação de moeda
function formatCurrency(value: number, currency?: string): string {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency || 'BRL',
    minimumFractionDigits: 2
  }).format(value) // valor já vem em reais/centavos corretos do Facebook
}

// Inline QR component (polls backend and shows QR image)
function QrInline(){
	const [qr,setQr]=React.useState<string|null>(null)
	useEffect(()=>{ let stop=false
		async function load(){
			try{
				const s=await fetch('/api/bot/whatsapp/status');
				const sj=await s.json();
				if(!sj.whatsapp && sj.hasQr){
					// cache-buster para evitar imagens antigas
					const r=await fetch(`/api/bot/whatsapp/qr?t=${Date.now()}`);
					if(r.ok){ const j=await r.json(); if(!stop) setQr(j.dataUrl||null) }
				}else{
					// se não há QR, limpar a imagem atual
					if(!stop) setQr(null)
				}
			}catch{}
		}
		load(); const id=setInterval(load, 4000); return ()=>{ stop=true; clearInterval(id) }
	},[])
	// Also listen to SSE QR events for instant updates
	useEffect(()=>{ let es:EventSource|undefined
		try {
			es = new EventSource('/api/bot/events');
			es.addEventListener('wa_qr',(e:any)=>{ try{ const d=JSON.parse(e.data); setQr(d?.dataUrl ?? null) }catch{} })
		} catch {}
		return ()=>{ try{ es?.close() }catch{} }
	},[])
	return (
		<div className="flex items-center gap-4">
			{qr ? (<img src={qr} alt="QR Code WhatsApp" className="w-44 h-44 bg-white p-1 rounded" />) : (<div className="w-44 h-44 flex items-center justify-center bg-gray-900 rounded text-[11px] text-gray-500">Aguardando QR...</div>)}
			<div className="text-xs text-gray-400">Abra o WhatsApp no celular › Configurações › Dispositivos conectados › Conectar um aparelho e aponte para o QR.</div>
		</div>
	)
}
