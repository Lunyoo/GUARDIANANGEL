import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getFBP, getFBC } from '@/utils/facebookAttribution'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface SalesEventRow {
  event_id: string | null
  source: string
  status: string
  created_at: string
  updated_at: string
  retry_count?: number
  last_error?: string | null
}

interface QueueJob {
  id: string
  name: string
  attemptsMade: number
  failedReason?: string
  data?: any
}

export default function PixelDiagnostics() {
  const [fbp, setFbp] = useState<string | undefined>()
  const [fbc, setFbc] = useState<string | undefined>()
  const [events, setEvents] = useState<SalesEventRow[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [offset, setOffset] = useState(0)
  const limit = 50
  const [kpis, setKpis] = useState<{ total: number; forwarded: number; failed: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'forwarded' | 'capi_failed' | 'received'>('all')
  const [query, setQuery] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [intervalSec, setIntervalSec] = useState<10 | 30 | 60>(30)
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
  const [detailJson, setDetailJson] = useState<string>('')
  const [queueEnabled, setQueueEnabled] = useState<boolean | null>(null)
  const [dlqJobs, setDlqJobs] = useState<QueueJob[]>([])
  const [dlqTotal, setDlqTotal] = useState<number | null>(null)
  const [dlqOffset, setDlqOffset] = useState<number>(0)
  const dlqPageSize = 50
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null)
  const [dlqLoading, setDlqLoading] = useState<boolean>(false)
  const [dlqRetryAllLoading, setDlqRetryAllLoading] = useState<boolean>(false)
  const [queueCounts, setQueueCounts] = useState<any>(null)
  const [queueLookup, setQueueLookup] = useState<Record<string, { found: boolean; presentIn: string[] }>>({})

  const refresh = async (reset = false) => {
    setLoading(true)
    try {
      setFbp(getFBP())
      setFbc(getFBC())
      const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'
      const qOffset = reset ? 0 : offset
      const statusQ = statusFilter === 'all' ? '' : `&status=${encodeURIComponent(statusFilter)}`
      const textQ = query ? `&q=${encodeURIComponent(query)}` : ''
      const [ev, kp, qs, qc] = await Promise.all([
        fetch(`${base}/api/public/attribution/events?limit=${limit}&offset=${qOffset}${statusQ}${textQ}`).then(r => r.json()),
        fetch(`${base}/api/public/attribution/kpis`).then(r => r.json()),
        fetch(`${base}/api/public/attribution/queue/status`).then(r => r.json()).catch(() => ({ enabled: false })),
        fetch(`${base}/api/public/attribution/queue/counts`).then(r => r.json()).catch(() => ({}))
      ])
      setEvents(reset ? (ev.events || []) : [...events, ...(ev.events || [])])
      setOffset(qOffset + (Array.isArray(ev.events) ? ev.events.length : 0))
      setTotal(typeof ev.total === 'number' ? ev.total : null)
      setKpis(kp)
  setQueueEnabled(!!qs?.enabled)
  setQueueCounts(qc?.counts || null)
  // If queue is enabled, fetch DLQ list as well using current limit
  await refreshDlq(qs?.enabled, base, dlqPageSize, dlqOffset)
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh(true) }, [])

  // Auto-refresh when enabled
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => {
      refresh()
    }, intervalSec * 1000)
    return () => clearInterval(id)
  }, [autoRefresh, intervalSec])

  const handleRetry = async () => {
    if (retrying) return
    setRetrying(true)
    try {
      const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'
      // If queue is enabled, enqueue a batch; otherwise, call direct batch retry
      if (queueEnabled) {
        const resp = await fetch(`${base}/api/public/attribution/retry-batch`, { method: 'POST' })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json().catch(() => ({}))
        toast.success(`Lote enfileirado: ${data.enqueued ?? '—'} eventos`)
      } else {
        const resp = await fetch(`${base}/api/public/attribution/retry`, { method: 'POST' })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json().catch(() => ({}))
        toast.success(`Reprocessamento em lote disparado (tentadas: ${data.attempted ?? '—'}, reenviadas: ${data.forwarded ?? '—'})`)
      }
      await refresh()
    } catch (e) {
  toast.error('Falha ao reprocessar falhas')
    } finally {
      setRetrying(false)
    }
  }

  const retryOne = async (eventId: string) => {
    if (!eventId) return
    setRetryingId(eventId)
    try {
      const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'
      const resp = await fetch(`${base}/api/public/attribution/retry/${encodeURIComponent(eventId)}`, { method: 'POST' })
      const data = await resp.json().catch(() => ({}))
      if (resp.ok && data?.ok) {
        toast.success(`Evento ${eventId} reprocessado`)
      } else {
        toast.error(`Falha ao reprocessar ${eventId}${data?.error ? `: ${data.error}` : ''}`)
      }
      await refresh()
    } catch {}
    setRetryingId(null)
  }

  const toggleDetails = async (eventId?: string | null) => {
    const id = eventId || null
    if (!id) return
    if (openDetailId === id) {
      setOpenDetailId(null)
      setDetailJson('')
      return
    }
    try {
      const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'
      const resp = await fetch(`${base}/api/public/attribution/events/${encodeURIComponent(id)}`)
      const data = await resp.json().catch(() => ({}))
      const pretty = (() => {
        try { return JSON.stringify(JSON.parse(data?.event?.payload || '{}'), null, 2) } catch { return String(data?.event?.payload || '') }
      })()
      setDetailJson(pretty)
      setOpenDetailId(id)
    } catch {}
  }

  const refreshDlq = async (enabled = queueEnabled, baseUrl?: string, limitOverride?: number, offsetOverride?: number) => {
    if (!enabled) { setDlqJobs([]); setDlqTotal(null); setDlqOffset(0); return }
    const base = baseUrl || ((import.meta as any).env?.VITE_API_URL || 'http://localhost:3001')
    const lim = typeof limitOverride === 'number' ? limitOverride : dlqPageSize
    const off = typeof offsetOverride === 'number' ? offsetOverride : dlqOffset
    setDlqLoading(true)
    try {
      const failed = await fetch(`${base}/api/public/attribution/queue/failed?limit=${lim}&offset=${off}`).then(r => r.json())
      setDlqJobs(Array.isArray(failed?.jobs) ? failed.jobs : [])
      setDlqTotal(typeof failed?.total === 'number' ? failed.total : null)
      setDlqOffset(typeof failed?.offset === 'number' ? failed.offset : off)
    } catch {
      setDlqJobs([])
      setDlqTotal(null)
    } finally {
      setDlqLoading(false)
    }
  }

  const checkEventInQueue = async (eventId: string) => {
    if (!eventId) return
    try {
      const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'
      const resp = await fetch(`${base}/api/public/attribution/queue/lookup?eventId=${encodeURIComponent(eventId)}`)
      const data = await resp.json().catch(() => ({}))
      if (resp.ok) {
        setQueueLookup(prev => ({ ...prev, [eventId]: { found: !!data?.found, presentIn: Array.isArray(data?.presentIn) ? data.presentIn : [] } }))
      }
    } catch {}
  }

  const retryJob = async (jobId: string) => {
    if (!jobId) return
    setRetryingJobId(jobId)
    try {
      const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'
      const resp = await fetch(`${base}/api/public/attribution/queue/retry-job/${encodeURIComponent(jobId)}`, { method: 'POST' })
      const data = await resp.json().catch(() => ({}))
      if (resp.ok && data?.ok) {
        toast.success(`Job ${jobId} reenfileirado`)
      } else if (resp.ok && (data?.enqueued || data?.retried)) {
        toast.success(`Job ${jobId} reprocessado`)
      } else {
        toast.error(`Falha ao reprocessar job${data?.error ? `: ${data.error}` : ''}`)
      }
      await refresh(true)
    } catch {
      toast.error('Erro ao reprocessar job')
    } finally {
      setRetryingJobId(null)
    }
  }

  const removeJob = async (jobId: string) => {
    if (!jobId) return
    try {
      const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'
      const resp = await fetch(`${base}/api/public/attribution/queue/job/${encodeURIComponent(jobId)}`, { method: 'DELETE' })
      const data = await resp.json().catch(() => ({}))
      if (resp.ok && data?.ok) {
        toast.success('Job removido')
      } else {
        toast.error(`Falha ao remover job${data?.error ? `: ${data.error}` : ''}`)
      }
      await refreshDlq(true)
    } catch {
      toast.error('Erro ao remover job')
    }
  }

  return (
    <Card className="gaming-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pixel Diagnostics</span>
          <div className="flex items-center gap-2">
            {queueEnabled !== null && (
              <div className="flex items-center gap-2">
                <Badge variant={queueEnabled ? 'default' : 'outline'}>
                  Fila: {queueEnabled ? 'Ativa' : 'Indisponível'}
                </Badge>
                {queueEnabled && queueCounts && (
                  <span className="text-xs text-muted-foreground">
                    w:{queueCounts.waiting ?? 0} a:{queueCounts.active ?? 0} d:{queueCounts.delayed ?? 0} f:{queueCounts.failed ?? 0}
                  </span>
                )}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => { setOffset(0); refresh(true) }} disabled={loading || retrying}>
              Atualizar
            </Button>
            <Select value={String(intervalSec)} onValueChange={(v) => setIntervalSec(Number(v) as 10 | 30 | 60)}>
              <SelectTrigger className="h-8 w-24">
                <SelectValue placeholder="Intervalo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10s</SelectItem>
                <SelectItem value="30">30s</SelectItem>
                <SelectItem value="60">60s</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant={autoRefresh ? 'default' : 'outline'} onClick={() => setAutoRefresh(!autoRefresh)} disabled={retrying}>
              {autoRefresh ? 'Auto ON' : 'Auto OFF'}
            </Button>
            <Button size="sm" onClick={handleRetry} disabled={retrying || loading}>
              {retrying ? 'Processando…' : queueEnabled ? 'Enfileirar falhas' : 'Reprocessar falhas'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                try {
                  const filtered = events
                    .filter(e => statusFilter === 'all' ? true : e.status === statusFilter)
                    .filter(e => query ? (e.event_id || '').toLowerCase().includes(query.toLowerCase()) : true)
                  const headers = ['event_id','source','status','created_at','updated_at','retry_count','last_error']
                  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
                  const rows = [headers.join(','), ...filtered.map(e => [
                    esc(e.event_id ?? ''),
                    esc(e.source),
                    esc(e.status),
                    esc(e.created_at),
                    esc(e.updated_at),
                    esc(typeof e.retry_count === 'number' ? e.retry_count : ''),
                    esc(e.last_error ?? ''),
                  ].join(','))]
                  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `sales_events_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success('CSV exportado')
                } catch {
                  toast.error('Falha ao exportar CSV')
                }
              }}
              disabled={events.length === 0}
            >
              Exportar CSV
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">_fbp</div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-sm break-all">{fbp || '—'}</div>
              <Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(fbp || '') ; toast.success('fbp copiado') } catch {} }}>
                Copiar
              </Button>
            </div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">_fbc</div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-sm break-all">{fbc || '—'}</div>
              <Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(fbc || '') ; toast.success('fbc copiado') } catch {} }}>
                Copiar
              </Button>
            </div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-xs text-muted-foreground">KPIs</div>
            <div className="text-sm">Total: {kpis?.total ?? '—'}</div>
            <div className="text-sm text-green-600">Forwarded: {kpis?.forwarded ?? '—'}</div>
            <div className="text-sm text-red-600">Failed: {kpis?.failed ?? '—'}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-muted-foreground">Eventos recentes</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtro</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="capi_failed">Falhos</SelectItem>
                <SelectItem value="forwarded">Enviados</SelectItem>
                <SelectItem value="received">Recebidos</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="h-8 w-56"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por event_id"
            />
            <Button size="sm" variant="ghost" onClick={() => { setStatusFilter('all'); setQuery(''); }}>
              Limpar
            </Button>
          </div>
        </div>
        <div className="mb-2 text-xs text-muted-foreground">
          {events
            .filter(e => statusFilter === 'all' ? true : e.status === statusFilter)
            .filter(e => query ? (e.event_id || '').toLowerCase().includes(query.toLowerCase()) : true)
            .length} eventos
          {typeof total === 'number' && (
            <span> (de {total})</span>
          )}
        </div>
        <div className="space-y-2">
          {events
            .filter(e => statusFilter === 'all' ? true : e.status === statusFilter)
            .filter(e => query ? (e.event_id || '').toLowerCase().includes(query.toLowerCase()) : true)
            .map((e) => (
            <div key={`${e.event_id}-${e.created_at}`} className="p-2 border rounded">
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-mono">{e.event_id || '—'}</div>
                  <div className="text-muted-foreground">{new Date(e.created_at).toLocaleString('pt-BR')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{e.source}</Badge>
                  <Badge className={e.status === 'forwarded' ? 'bg-green-100 text-green-700' : e.status === 'capi_failed' ? 'bg-red-100 text-red-700' : ''}>
                    {e.status}
                  </Badge>
                  {e.event_id && queueLookup[e.event_id] && (
                    queueLookup[e.event_id].found ? (
                      <Badge variant="secondary">Na fila: {queueLookup[e.event_id].presentIn.join(',') || '—'}</Badge>
                    ) : (
                      <Badge variant="outline">Fora da fila</Badge>
                    )
                  )}
                  {e.event_id && (
                    <Button size="sm" variant="ghost" onClick={() => toggleDetails(e.event_id!)}>
                      {openDetailId === e.event_id ? 'Fechar' : 'Detalhes'}
                    </Button>
                  )}
                  {e.event_id && (
                    <Button size="sm" variant="outline" disabled={retryingId === e.event_id} onClick={() => retryOne(e.event_id!)}>
                      {retryingId === e.event_id ? 'Reprocessando…' : 'Reprocessar'}
                    </Button>
                  )}
                  {e.event_id && (
                    <Button size="sm" variant="ghost" onClick={() => checkEventInQueue(e.event_id!)}>
                      Ver na fila
                    </Button>
                  )}
                  {e.event_id && (
                    <Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(e.event_id || '') ; toast.success('event_id copiado') } catch {} }}>
                      Copiar ID
                    </Button>
                  )}
                </div>
              </div>
              {(e.retry_count || e.last_error) && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {typeof e.retry_count === 'number' && <span className="mr-3">Tentativas: {e.retry_count}</span>}
                  {e.last_error && (
                    <>
                      <span className="block font-mono break-all">Erro: {e.last_error}</span>
                      <div className="mt-1">
                        <Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(e.last_error || '') ; toast.success('Erro copiado') } catch {} }}>
                          Copiar erro
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {openDetailId === e.event_id && (
                <pre className="mt-2 p-2 text-xs bg-muted/30 rounded overflow-auto max-h-64">
{detailJson}
                </pre>
              )}
            </div>
          ))}
          {typeof total === 'number' && offset < total && (
            <div className="flex justify-center mt-4">
              <Button size="sm" onClick={() => refresh(false)} disabled={loading}>
                {loading ? 'Carregando…' : 'Carregar mais'}
              </Button>
            </div>
          )}
          {queueEnabled && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">DLQ (Falhas da fila)</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">{dlqJobs.length}{typeof dlqTotal === 'number' ? ` de ${dlqTotal}` : ''} jobs</div>
                  <Button size="sm" variant="ghost" disabled={dlqLoading} onClick={() => refreshDlq(true)}>
                    {dlqLoading ? 'Atualizando…' : 'Atualizar DLQ'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={dlqRetryAllLoading} onClick={async () => {
                    setDlqRetryAllLoading(true)
                    try {
                      const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'
                      const resp = await fetch(`${base}/api/public/attribution/queue/retry-all`, { method: 'POST' })
                      const data = await resp.json().catch(() => ({}))
                      if (resp.ok && data?.ok) {
                        toast.success(`DLQ reenfileirado: tentados ${data.attempted ?? '—'}, retriados ${data.retried ?? '—'}, re-adicionados ${data.readded ?? '—'}`)
                      } else {
                        toast.error(`Falha ao reenfileirar DLQ${data?.error ? `: ${data.error}` : ''}`)
                      }
                      await refreshDlq(true)
                    } catch {
                      toast.error('Erro ao reenfileirar DLQ')
                    } finally {
                      setDlqRetryAllLoading(false)
                    }
                  }}>
                    {dlqRetryAllLoading ? 'Processando…' : 'Reenfileirar DLQ'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {dlqJobs.length === 0 && (
                  <div className="text-xs text-muted-foreground">Sem jobs com falha.</div>
                )}
                {dlqJobs.map(j => (
                  <div key={j.id} className="p-2 border rounded flex items-start justify-between gap-3">
                    <div className="text-xs">
                      <div className="font-mono">Job: {j.id}</div>
                      <div className="text-muted-foreground">Tentativas: {j.attemptsMade}</div>
                      {j?.data?.eventId && (
                        <div className="text-muted-foreground">event_id: <span className="font-mono">{j.data.eventId}</span></div>
                      )}
                      {j.failedReason && (
                        <div className="mt-1 font-mono break-all opacity-80">{j.failedReason}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {j?.data?.eventId && (
                        <Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(j.data.eventId) ; toast.success('event_id copiado') } catch {} }}>
                          Copiar ID
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={retryingJobId === j.id} onClick={() => retryJob(j.id)}>
                        {retryingJobId === j.id ? 'Reprocessando…' : 'Reprocessar job'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeJob(j.id)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center mt-3 gap-2">
                <div className="text-xs text-muted-foreground">
                  {dlqTotal ? `${Math.min(dlqTotal, dlqOffset + 1)}-${Math.min(dlqTotal, dlqOffset + dlqJobs.length)} de ${dlqTotal}` : `${dlqJobs.length} jobs`}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={dlqLoading || dlqOffset <= 0} onClick={async () => {
                    const prevOffset = Math.max(0, dlqOffset - dlqPageSize)
                    setDlqOffset(prevOffset)
                    await refreshDlq(true, undefined, dlqPageSize, prevOffset)
                  }}>
                    {dlqLoading ? 'Carregando…' : 'Anterior'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={dlqLoading || (typeof dlqTotal === 'number' && (dlqOffset + dlqJobs.length >= dlqTotal))} onClick={async () => {
                    const nextOffset = dlqOffset + dlqPageSize
                    setDlqOffset(nextOffset)
                    await refreshDlq(true, undefined, dlqPageSize, nextOffset)
                  }}>
                    {dlqLoading ? 'Carregando…' : 'Próxima'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
