import React, { useEffect, useState } from 'react'
import { Activity, Server, Cpu, AlertTriangle, CheckCircle, Settings, BarChart3, Database, Wifi, WifiOff } from 'lucide-react'

interface SystemMetrics {
  health?: { score: number; status: string }
  allocator?: { totalCampaigns: number; activeCampaigns: number; overallROAS: number; diversificationScore: number }
  queue?: { queueLength: number; agents: any[] }
  botPolicy?: { arms: number; total?: number }
  scoring?: { modelVersion: string }
  neural?: { status: string; lastUpdate?: string }
}

interface LiveEvent { id: string; type: string; ts: number; message?: string; payload?: any }
interface DriftResult { baseline?: any; evaluation?: any; status?: string; message?: string }

export default function SystemOperationStatus() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [driftBuilding, setDriftBuilding] = useState(false)
  const [driftEvaluating, setDriftEvaluating] = useState(false)
  const [driftResult, setDriftResult] = useState<DriftResult | null>(null)

  // Carregar métricas do sistema
  const loadMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ops/dashboard')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  // SSE para eventos em tempo real
  useEffect(() => {
    let es: EventSource | undefined
    function connect() {
      try {
        es = new EventSource('/api/events')
        setConnected(true)
        
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data)
            const evt: LiveEvent = {
              id: data.id || 'e' + Date.now() + Math.random().toString(36).slice(2, 7),
              type: data.type || 'message',
              ts: Date.now(),
              message: data.message || data.body || '',
              payload: data
            }
            setEvents(e => [evt, ...e].slice(0, 50))
          } catch {}
        }
        
        es.onerror = () => {
          setConnected(false)
          try { es?.close() } catch {}
          setTimeout(connect, 3000)
        }
      } catch {
        setConnected(false)
      }
    }
    
    connect()
    return () => { try { es?.close() } catch {} }
  }, [])

  // Carregar dados inicialmente e a cada 30 segundos
  useEffect(() => {
    loadMetrics()
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  // Construir baseline de drift
  const buildDriftBaseline = async () => {
    try {
      setDriftBuilding(true)
      const response = await fetch('/api/allocator/drift/baseline', { method: 'POST' })
      const result = await response.json()
      setDriftResult({ baseline: result, status: 'baseline_built', message: 'Baseline construído com sucesso' })
    } catch (error) {
      setDriftResult({ status: 'error', message: 'Erro ao construir baseline' })
    } finally {
      setDriftBuilding(false)
    }
  }

  // Avaliar drift
  const evaluateDrift = async () => {
    try {
      setDriftEvaluating(true)
      const response = await fetch('/api/allocator/drift/evaluate', { method: 'POST' })
      const result = await response.json()
      setDriftResult({ evaluation: result, status: 'drift_evaluated', message: 'Avaliação de drift concluída' })
    } catch (error) {
      setDriftResult({ status: 'error', message: 'Erro ao avaliar drift' })
    } finally {
      setDriftEvaluating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy': case 'active': case 'running': return 'text-emerald-400'
      case 'warning': case 'degraded': return 'text-yellow-400'
      case 'critical': case 'error': case 'down': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-800 border border-gray-700">
            <Server className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sistema & Operação</h2>
            <div className="flex items-center gap-2 text-sm">
              {connected ? (
                <><Wifi className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Live</span></>
              ) : (
                <><WifiOff className="w-4 h-4 text-red-400" /><span className="text-red-400">Offline</span></>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={loadMetrics} 
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-50"
        >
          <Settings className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Métricas principais do sistema */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          title="Health Score"
          value={metrics?.health?.score?.toFixed(0) || '—'}
          subtitle={metrics?.health?.status || '—'}
          color={getStatusColor(metrics?.health?.status || '')}
        />
        <MetricCard
          icon={<BarChart3 className="w-5 h-5" />}
          title="Campanhas ML"
          value={`${metrics?.allocator?.totalCampaigns ?? '—'}`}
          subtitle={`Ativas: ${metrics?.allocator?.activeCampaigns || 0}`}
          color="text-cyan-400"
        />
        <MetricCard
          icon={<Database className="w-5 h-5" />}
          title="Fila Inteligente"
          value={`${metrics?.queue?.queueLength ?? '—'}`}
          subtitle={`${metrics?.queue?.agents?.length || 0} agentes`}
          color="text-purple-400"
        />
        <MetricCard
          icon={<Cpu className="w-5 h-5" />}
          title="Neural System"
          value={metrics?.neural?.status || 'Unknown'}
          subtitle={`v${metrics?.scoring?.modelVersion || '—'}`}
          color={getStatusColor(metrics?.neural?.status || '')}
        />
      </div>

      {/* Controles de Drift e Operações */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Controles de Machine Learning */}
        <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/60">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Controles ML & Drift
          </h3>
          
          <div className="space-y-4">
            {/* Drift Controls */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  title="Constrói um baseline com distribuição e métricas atuais (ex.: últimos 30 dias) para comparar drift no futuro."
                  onClick={buildDriftBaseline}
                  disabled={driftBuilding}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium"
                >
                  {driftBuilding ? 'Construindo...' : 'Build Drift Baseline'}
                </button>
                <button
                  title="Compara o estado atual com o baseline e calcula o drift score."
                  onClick={evaluateDrift}
                  disabled={driftEvaluating}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium"
                >
                  {driftEvaluating ? 'Avaliando...' : 'Evaluate Drift'}
                </button>
              </div>
              <div className="text-[11px] text-gray-500">
                O baseline registra a distribuição de sinais e performance como referência. "Evaluate" compara o agora com essa referência e alerta desvios.
              </div>
              
              {/* Resultado do Drift */}
              {driftResult && (
                <div className={`p-3 rounded-lg border ${
                  driftResult.status === 'error' 
                    ? 'bg-red-900/20 border-red-700 text-red-300'
                    : 'bg-green-900/20 border-green-700 text-green-300'
                }`}>
                  <div className="text-sm font-medium">{driftResult.message}</div>
                  {driftResult.evaluation && (
                    <div className="text-xs mt-1">
                      Drift Score: {driftResult.evaluation.drift_score?.toFixed(4) || 'N/A'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Métricas adicionais */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gray-900/60">
                <div className="text-xs text-gray-500 uppercase">Diversificação</div>
                <div className="text-lg font-semibold text-cyan-300">
                  {metrics?.allocator?.diversificationScore != null 
                    ? (metrics.allocator.diversificationScore * 100).toFixed(1) + '%'
                    : '—'
                  }
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/60">
                <div className="text-xs text-gray-500 uppercase">ROAS Geral</div>
                <div className="text-lg font-semibold text-cyan-300">
                  {metrics?.allocator?.overallROAS?.toFixed(2) || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Log de Eventos */}
        <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/60">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Eventos do Sistema
          </h3>
          
          <div className="border border-gray-700 rounded-lg overflow-hidden max-h-80">
            <div className="max-h-72 overflow-y-auto">
              {events.length > 0 ? (
                <div className="divide-y divide-gray-700">
                  {events.map(event => (
                    <div key={event.id} className="p-3 hover:bg-gray-900/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${
                          event.type.includes('error') ? 'text-red-400' :
                          event.type.includes('warning') ? 'text-yellow-400' :
                          'text-cyan-400'
                        }`}>
                          {event.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.ts).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      {event.message && (
                        <div className="text-sm text-gray-300 line-clamp-2">
                          {event.message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">Aguardando eventos...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, title, value, subtitle, color }: { 
  icon: React.ReactNode; 
  title: string; 
  value: string; 
  subtitle: string; 
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/60">
      <div className="flex items-center gap-3 mb-2">
        <div className={`${color}`}>
          {icon}
        </div>
        <div className="text-sm font-medium text-gray-400">{title}</div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className={`text-sm ${color}`}>{subtitle}</div>
    </div>
  )
}
