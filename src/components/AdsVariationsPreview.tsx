import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Play, Pause, Calendar, GitCompare, TrendingUp, TrendingDown } from 'lucide-react'
import MultipleAdsView from './MultipleAdsView'

// Dados mockados simplificados para preview
const mockAdsPreview = [
  {
    id: '1',
    thumbnail: '/api/placeholder/80/60',
    type: 'image' as const,
    headline: '🔥 MÉDICA REVELA: Protocolo Secreto Para Perder 15kg',
    roas: 15.8,
    ctr: 3.4,
    status: 'active' as const,
    score: 94
  },
  {
    id: '2', 
    thumbnail: '/api/placeholder/80/60',
    type: 'video' as const,
    headline: 'Médica de 45 anos perdeu 18kg com este método',
    roas: 12.1,
    ctr: 3.0,
    status: 'active' as const,
    score: 87,
    duration: 45
  },
  {
    id: '3',
    thumbnail: '/api/placeholder/80/60', 
    type: 'carousel' as const,
    headline: 'Antes e Depois: Transformações REAIS',
    roas: 4.4,
    ctr: 2.2,
    status: 'paused' as const,
    score: 72
  },
  {
    id: '4',
    thumbnail: '/api/placeholder/80/60',
    type: 'image' as const,
    headline: 'URGENTE: Apenas 100 vagas restantes',
    roas: 2.8,
    ctr: 2.0,
    status: 'ended' as const,
    score: 58
  }
]

interface AdsVariationsPreviewProps {
  offerTitle?: string
  variationsCount?: number
}

export default function AdsVariationsPreview({ 
  offerTitle = 'Protocolo Detox Revolution - Perca 15kg em 30 Dias',
  variationsCount = mockAdsPreview.length 
}: AdsVariationsPreviewProps) {
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-3 w-3 text-success" />
      case 'paused': return <Pause className="h-3 w-3 text-warning" />
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

  const bestPerformer = mockAdsPreview.reduce((best, current) => 
    current.roas > best.roas ? current : best
  )

  const activeCount = mockAdsPreview.filter(ad => ad.status === 'active').length
  const avgRoas = mockAdsPreview.reduce((sum, ad) => sum + ad.roas, 0) / mockAdsPreview.length

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
                {activeCount} ativos • ROAS médio: {avgRoas.toFixed(1)}x
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
                  <MultipleAdsView offerTitle={offerTitle} />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Best Performer Highlight */}
          <div className="bg-success/5 p-3 rounded-lg border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="font-medium text-sm text-success">Melhor Performance</span>
              <Badge className="bg-success/10 border-success/50 text-success text-xs">
                ROAS {bestPerformer.roas.toFixed(1)}x
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground line-clamp-1">
              {bestPerformer.headline}
            </div>
          </div>

          {/* Mini Grid Preview */}
          <div className="grid grid-cols-2 gap-2">
            {mockAdsPreview.slice(0, 4).map((ad) => (
              <div key={ad.id} className="flex items-center gap-2 p-2 rounded bg-muted/20">
                <div className="relative flex-shrink-0">
                  <img 
                    src={ad.thumbnail}
                    alt="Ad preview"
                    className="w-8 h-6 object-cover rounded border"
                  />
                  <div className="absolute -top-1 -right-1 text-xs">
                    {getTypeEmoji(ad.type)}
                  </div>
                  {ad.type === 'video' && ad.duration && (
                    <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded-tl">
                      {ad.duration}s
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium line-clamp-1">
                    {ad.headline.substring(0, 25)}...
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(ad.status)}
                      <span className={`text-xs font-semibold ${getScoreColor(ad.score)}`}>
                        {ad.score}
                      </span>
                    </div>
                    <div className="text-xs text-success font-medium">
                      {ad.roas.toFixed(1)}x
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
                {Math.max(...mockAdsPreview.map(ad => ad.roas)).toFixed(1)}x
              </div>
              <div className="text-xs text-muted-foreground">Melhor ROAS</div>
            </div>
            <div>
              <div className="text-sm font-semibold">
                {Math.max(...mockAdsPreview.map(ad => ad.ctr))}%
              </div>
              <div className="text-xs text-muted-foreground">Melhor CTR</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-primary">
                {activeCount}
              </div>
              <div className="text-xs text-muted-foreground">Ativos</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}