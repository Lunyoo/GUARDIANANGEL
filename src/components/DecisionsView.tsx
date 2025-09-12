import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface DecisionItem {
  timestamp: string
  customerId: string
  conversationId: string
  modelUsed: string
  confidence: number
  factors: string[]
  responseLength: number
  messageCount: number
}

interface DecisionsResponse {
  stats: {
    total: number
    gpt4Percentage: number
    avgConfidence: number
    conversionRate: number
  }
  decisions: DecisionItem[]
}

export default function DecisionsView() {
  const [data, setData] = useState<DecisionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/ml/decisions/data')
      if (!res.ok) throw new Error('Erro ao carregar decisões')
      const json: DecisionsResponse = await res.json()
      setData(json)
      setError(null)
      // success toast only for manual refresh, avoid noise during auto polling
      if (!loading) {
        toast.success('Decisões atualizadas')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      toast.error('Falha ao atualizar decisões')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-900 dark:text-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando decisões de IA...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-red-300">
          ❌ {error}
        </div>
        <button onClick={load} className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white">Tentar novamente</button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 text-gray-900 dark:text-gray-200">
      {/* Stats */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-lg p-5 bg-white/50 dark:bg-black/30 border border-emerald-500/20 backdrop-blur">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Hoje</div>
            <div className="text-3xl font-bold text-emerald-400">{data.stats.total}</div>
          </div>
          <div className="rounded-lg p-5 bg-white/50 dark:bg-black/30 border border-emerald-500/20 backdrop-blur">
            <div className="text-sm text-gray-600 dark:text-gray-400">% Uso GPT-4</div>
            <div className="text-3xl font-bold text-purple-400">{data.stats.gpt4Percentage}%</div>
          </div>
          <div className="rounded-lg p-5 bg-white/50 dark:bg-black/30 border border-emerald-500/20 backdrop-blur">
            <div className="text-sm text-gray-600 dark:text-gray-400">Confiança Média</div>
            <div className="text-3xl font-bold">{(data.stats.avgConfidence * 100).toFixed(1)}%</div>
          </div>
          <div className="rounded-lg p-5 bg-white/50 dark:bg-black/30 border border-emerald-500/20 backdrop-blur">
            <div className="text-sm text-gray-600 dark:text-gray-400">Taxa de Conversão</div>
            <div className="text-3xl font-bold text-emerald-300">{data.stats.conversionRate}%</div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl overflow-hidden border border-emerald-500/20 bg-white/50 dark:bg-black/30 backdrop-blur">
        <div className="px-6 py-3 border-b border-emerald-500/20 flex items-center justify-between">
          <div className="font-semibold">📈 Decisões Recentes</div>
          <button
            onClick={() => {
              // manual refresh triggers toast on success in load()
              load()
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
          >
            Atualizar
          </button>
        </div>
        <div className="divide-y divide-emerald-500/10">
          {data?.decisions.map((d, idx) => {
            const confidence = Math.round(d.confidence * 100)
            return (
              <div key={idx} className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-center hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                <div>
                  <div className="font-medium">{new Date(d.timestamp).toLocaleTimeString('pt-BR')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Cliente {d.customerId.slice(0,8)}...</div>
                </div>
                <div className="md:col-span-2">
                  <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full border ${d.modelUsed.includes('gpt-4') ? 'border-purple-500/40 text-purple-300' : 'border-sky-500/40 text-sky-300'}`}>
                    {d.modelUsed}
                  </span>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{d.factors.join(', ')}</div>
                </div>
                <div>
                  <div className="h-2 bg-white/20 rounded">
                    <div className="h-2 bg-gradient-to-r from-red-400 via-yellow-400 to-emerald-400 rounded" style={{ width: `${confidence}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{confidence}% confiança</div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>{d.responseLength}</strong> chars • <strong>{d.messageCount}</strong> msgs
                </div>
              </div>
            )
          })}
          {data && data.decisions.length === 0 && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">Sem decisões recentes</div>
          )}
        </div>
      </div>
    </div>
  )
}
