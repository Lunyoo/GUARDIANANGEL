import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Play, Pause, Calendar, GitCompare, TrendingUp } from 'lucide-react'
import MultipleAdsView from './MultipleAdsView'
import React, { useEffect, useMemo, useState } from 'react'

interface AdsVariationsPreviewProps {
  offerTitle?: string
}

export default function AdsVariationsPreview({ 
  offerTitle = 'Anúncios Recentes'
}: AdsVariationsPreviewProps) {
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/campaigns/ads')
        const j = await r.json()
        setAds(Array.isArray(j?.ads) ? j.ads : [])
      } catch (e) {
        setAds([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const variationsCount = ads.length
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'active': return <Play className="h-3 w-3 text-success" />
      case 'PAUSED':
      case 'paused': return <Pause className="h-3 w-3 text-warning" />
      case 'ENDED':
      case 'ARCHIVED':
      case 'ended': return <Calendar className="h-3 w-3 text-muted-foreground" />
      default: return null
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success'
    if (score >= 70) return 'text-accent'
    if (score >= 50) return 'text-warning'
    return 'text-destructive'
  }

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'carousel': return '🎠'
      default: return '📄'
    }
  }
  const computed = useMemo(() => {
    if (!ads.length) return { best: null as any, activeCount: 0, avgRoas: 0 }
    const activeCount = ads.filter((a: any) => String(a.status).toLowerCase() === 'active').length
    const roasList = ads.map((a: any) => {
      const spend = Number(a.gasto || 0)
      const conv = Number(a.conversoes || 0)
      return spend > 0 ? (conv * 100) / spend : 0
    })
    const avgRoas = roasList.length ? roasList.reduce((s, v) => s + v, 0) / roasList.length : 0
    const bestIdx = roasList.reduce((mi, v, i, arr) => (v > arr[mi] ? i : mi), 0)
    return { best: ads[bestIdx], activeCount, avgRoas }
  }, [ads])

  return (
    <Card className="gaming-card border-l-4 border-l-primary">
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GitCompare className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Múltiplas Variações</span>
                <Badge variant="outline" className="text-xs">
                  {variationsCount} anúncios
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {computed.activeCount} ativos • ROAS médio: {computed.avgRoas.toFixed(1)}x
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Todos
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Múltiplas Variações de Anúncios</DialogTitle>
                  <DialogDescription>
                    Análise comparativa das variações encontradas para: {offerTitle}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                  <MultipleAdsView offerTitle={offerTitle} variations={ads.map((a:any, idx:number)=>({
                    id: String(a.id || idx),
                    title: a.titulo || a.nome || `Ad ${idx+1}`,
                    platform: 'Facebook',
                    advertiser: a.account_id || 'Meta',
                    creative: { type: a.video_id ? 'video' : 'image', url: a.imagem_url || '', thumbnailUrl: a.imagem_url || '' },
                    copy: { headline: a.titulo || a.nome || '', primaryText: a.descricao || '', callToAction: 'Saiba mais' },
                    metrics: {
                      impressions: Number(a.impressoes || 0),
                      clicks: Number(a.cliques || 0),
                      ctr: Number(a.ctr || 0),
                      cpm: Number(a.cpm || 0),
                      spend: Number(a.gasto || 0),
                      conversions: Number(a.conversoes || 0),
                      costPerConversion: (Number(a.gasto || 0) && Number(a.conversoes || 0)) ? Number(a.gasto)/Number(a.conversoes) : 0,
                      roas: (Number(a.gasto || 0) && Number(a.conversoes || 0)) ? (Number(a.conversoes)*100)/Number(a.gasto) : 0,
                      frequency: 0,
                      reach: 0
                    },
                    status: String(a.status || 'active').toLowerCase() as any,
                    startDate: new Date(a.created_time || Date.now()),
                    score: 0
                  }))} />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Best Performer Highlight */}
          {computed.best && (
            <div className="bg-success/5 p-3 rounded-lg border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="font-medium text-sm text-success">Melhor Performance</span>
                <Badge className="bg-success/10 border-success/50 text-success text-xs">
                  ROAS {(((Number(computed.best.conversoes||0)*100)/(Number(computed.best.gasto||0)||1))).toFixed(1)}x
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {(computed.best.titulo || computed.best.nome || '—')}
              </div>
            </div>
          )}

          {/* Mini Grid Preview */}
          <div className="grid grid-cols-2 gap-2">
            {ads.slice(0, 4).map((ad:any, i:number) => (
              <div key={String(ad.id||i)} className="flex items-center gap-2 p-2 rounded bg-muted/20">
                <div className="relative flex-shrink-0">
                  <img 
                    src={ad.imagem_url || ''}
                    alt="Ad preview"
                    className="w-8 h-6 object-cover rounded border"
                  />
                  <div className="absolute -top-1 -right-1 text-xs">
                    {getTypeEmoji(ad.video_id ? 'video' : 'image')}
                  </div>
                  {ad.video_id && (
                    <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded-tl">
                      vídeo
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium line-clamp-1">
                    {(ad.titulo || ad.nome || '').toString().substring(0, 25)}{(ad.titulo||ad.nome)?'...':''}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(String(ad.status || '').toLowerCase())}
                      <span className={`text-xs font-semibold`}>
                        CTR {(Number(ad.ctr||0)).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-success font-medium">
                      {(((Number(ad.conversoes||0)*100)/(Number(ad.gasto||0)||1))).toFixed(1)}x
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-semibold text-success">
                {ads.length ? Math.max(...ads.map((ad:any)=>(((Number(ad.conversoes||0)*100)/(Number(ad.gasto||0)||1))))).toFixed(1) : '0.0'}x
              </div>
              <div className="text-xs text-muted-foreground">Melhor ROAS</div>
            </div>
            <div>
              <div className="text-sm font-semibold">
                {ads.length ? Math.max(...ads.map((ad:any)=>Number(ad.ctr||0))).toFixed(1) : '0.0'}%
              </div>
              <div className="text-xs text-muted-foreground">Melhor CTR</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-primary">
                {computed.activeCount}
              </div>
              <div className="text-xs text-muted-foreground">Ativos</div>
            </div>
          </div>

          {(!loading && ads.length === 0) && (
            <div className="text-xs text-muted-foreground">Sem anúncios disponíveis no momento.</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}