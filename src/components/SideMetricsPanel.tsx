import React, { useEffect, useState } from 'react'

interface Props { open: boolean }

// Painel lateral de métricas usando /api/ops/dashboard como fonte única.
export default function SideMetricsPanel({ open }: Props) {
	const [data, setData] = useState<any>(null)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!open) return
		let cancelled = false
		const load = async () => {
			try {
				setLoading(true)
				setError(null)
				const res = await fetch('/api/ops/dashboard')
				if (!res.ok) throw new Error('Falha ao carregar ops')
				const j = await res.json()
				if (!cancelled) setData(j)
			} catch (e: any) {
				if (!cancelled) setError(e.message)
			} finally { if (!cancelled) setLoading(false) }
		}
		load()
		const id = setInterval(load, 15000)
		return () => { cancelled = true; clearInterval(id) }
	}, [open])

	if (!open) return null

	return (
		<div className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-gray-800 z-[150] flex flex-col">
			<div className="p-4 border-b border-gray-800">
				<h3 className="text-sm font-semibold tracking-wide text-gray-200">Métricas em Tempo Real</h3>
			</div>
			<div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
				{loading && <div className="text-gray-500">Atualizando...</div>}
				{error && <div className="text-red-400 bg-red-900/30 px-2 py-1 rounded border border-red-800">{error}</div>}
				{data && (
					<>
						<Section title="Allocator">
							<KV k="Campanhas" v={data.allocator?.totalCampaigns} />
							<KV k="Diversificação" v={data.allocator?.diversificationScore != null ? (data.allocator.diversificationScore * 100).toFixed(1) + '%' : 'n/a'} />
							<KV k="ROI Esperado" v={data.allocator?.expectedROI != null ? data.allocator.expectedROI.toFixed(2) : 'n/a'} />
						</Section>
						<Section title="Queue">
							<KV k="Tamanho" v={data.queue?.size ?? 0} />
							<KV k="Processando" v={data.queue?.processing ?? 0} />
						</Section>
						<Section title="Health">
							<KV k="Score" v={data.health?.score != null ? data.health.score + '%' : 'n/a'} />
							<KV k="Status" v={data.health?.status} />
							<KV k="Lag" v={data.eventLoopLagMs + 'ms'} />
						</Section>
						<Section title="Recursos">
							<KV k="Memória" v={data.memory ? (data.memory / 1024 / 1024).toFixed(1) + ' MB' : 'n/a'} />
						</Section>
					</>
				)}
				{!loading && !data && !error && <div className="text-gray-500">Sem dados.</div>}
			</div>
			<div className="p-2 text-[10px] text-gray-600 border-t border-gray-800 tracking-wide">Atualiza a cada 15s</div>
		</div>
	)
}

function Section({ title, children }: any) {
	return (
		<div>
			<h4 className="text-xs uppercase tracking-wide text-cyan-400 mb-1">{title}</h4>
			<div className="space-y-1">{children}</div>
		</div>
	)
}

function KV({ k, v }: { k: any; v: any }) {
	return (
		<div className="flex justify-between">
			<span className="text-gray-500">{k}</span>
			<span className="text-gray-300 font-medium">{v == null ? '—' : v}</span>
		</div>
	)
}

