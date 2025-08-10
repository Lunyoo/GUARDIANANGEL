import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from 'sonner'
import OfferInsightsAnalysis from './OfferInsightsAnalysis'
import { 
  Eye,
  TrendingUp,
  TrendingDown,
  Copy,
  Download,
  Share2,
  BarChart3,
  Users,
  MousePointer,
  DollarSign,
  Clock,
  Star,
  Award,
  Target,
  Zap,
  GitCompare,
  Filter,
  SortDesc,
  Play,
  Pause,
  Calendar,
  Grid3x3,
  List,
  ChevronLeft,
  ChevronRight,
  Brain
} from 'lucide-react'

interface AdVariation {
  id: string
  title: string
  platform: string
  advertiser: string
  creative: {
    type: 'image' | 'video' | 'carousel'
    url: string
    thumbnailUrl?: string
    duration?: number
  }
  copy: {
    headline: string
    primaryText: string
    description?: string
    callToAction: string
  }
  metrics: {
    impressions: number
    clicks: number
    ctr: number
    cpm: number
    spend: number
    conversions: number
    costPerConversion: number
    roas: number
    frequency: number
    reach: number
  }
  status: 'active' | 'paused' | 'ended'
  startDate: Date
  score: number
}

// Dados mockados para demonstração
const mockVariations: AdVariation[] = [
  {
    id: 'var-001',
    title: 'Protocolo Detox Revolution - Variação Principal',
    platform: 'Facebook',
    advertiser: 'Dra. Sarah Wellness',
    creative: {
      type: 'image',
      url: '/api/placeholder/400/300',
      thumbnailUrl: '/api/placeholder/300/200'
    },
    copy: {
      headline: '🔥 MÉDICA REVELA: Protocolo Secreto Para Perder 15kg',
      primaryText: 'ATENÇÃO: Método revolucionário faz mulheres de 40+ perderem até 15kg em 30 dias! Sem dietas malucas, sem exercícios pesados. COMPROVADO por mais de 3.000 mulheres!',
      description: 'Protocolo desenvolvido por médica especialista em emagrecimento',
      callToAction: 'QUERO EMAGRECER AGORA'
    },
    metrics: {
      impressions: 125000,
      clicks: 4250,
      ctr: 3.4,
      cpm: 8.90,
      spend: 1112.50,
      conversions: 89,
      costPerConversion: 12.50,
      roas: 15.8,
      frequency: 1.8,
      reach: 69444
    },
    status: 'active',
    startDate: new Date('2024-01-15'),
    score: 94
  },
  {
    id: 'var-002',
    title: 'Protocolo Detox Revolution - Depoimento Médica',
    platform: 'Facebook',
    advertiser: 'Dra. Sarah Wellness',
    creative: {
      type: 'video',
      url: '/api/placeholder/400/300',
      thumbnailUrl: '/api/placeholder/300/200',
      duration: 45
    },
    copy: {
      headline: 'Médica de 45 anos perdeu 18kg com este método',
      primaryText: 'Dra. Sarah compartilha o protocolo que usou para perder 18kg e está ajudando milhares de mulheres. VEJA o vídeo completo!',
      description: 'Depoimento real da médica criadora do método',
      callToAction: 'ASSISTIR VÍDEO COMPLETO'
    },
    metrics: {
      impressions: 98000,
      clicks: 2940,
      ctr: 3.0,
      cpm: 11.20,
      spend: 1097.60,
      conversions: 67,
      costPerConversion: 16.40,
      roas: 12.1,
      frequency: 2.1,
      reach: 46667
    },
    status: 'active',
    startDate: new Date('2024-01-10'),
    score: 87
  },
  {
    id: 'var-003',
    title: 'Protocolo Detox Revolution - Antes e Depois',
    platform: 'Facebook',
    advertiser: 'Dra. Sarah Wellness',
    creative: {
      type: 'carousel',
      url: '/api/placeholder/400/300',
      thumbnailUrl: '/api/placeholder/300/200'
    },
    copy: {
      headline: 'Antes e Depois: Transformações REAIS',
      primaryText: 'VEJA as transformações IMPRESSIONANTES de mulheres que seguiram nosso protocolo. Resultados em apenas 30 dias!',
      description: 'Cases reais de sucesso do protocolo',
      callToAction: 'VER TODAS AS TRANSFORMAÇÕES'
    },
    metrics: {
      impressions: 156000,
      clicks: 3432,
      ctr: 2.2,
      cpm: 15.60,
      spend: 2433.60,
      conversions: 54,
      costPerConversion: 45.10,
      roas: 4.4,
      frequency: 2.8,
      reach: 55714
    },
    status: 'paused',
    startDate: new Date('2024-01-08'),
    score: 72
  },
  {
    id: 'var-004',
    title: 'Protocolo Detox Revolution - Urgência',
    platform: 'Instagram',
    advertiser: 'Dra. Sarah Wellness',
    creative: {
      type: 'image',
      url: '/api/placeholder/400/300',
      thumbnailUrl: '/api/placeholder/300/200'
    },
    copy: {
      headline: 'URGENTE: Apenas 100 vagas restantes',
      primaryText: '⚠️ ÚLTIMA CHANCE: Restam apenas 100 vagas para o protocolo que está transformando a vida de milhares de mulheres. NÃO PERCA!',
      description: 'Oferta por tempo limitado - vagas limitadas',
      callToAction: 'GARANTIR MINHA VAGA'
    },
    metrics: {
      impressions: 87000,
      clicks: 1740,
      ctr: 2.0,
      cpm: 18.90,
      spend: 1644.30,
      conversions: 23,
      costPerConversion: 71.49,
      roas: 2.8,
      frequency: 3.2,
      reach: 27188
    },
    status: 'ended',
    startDate: new Date('2024-01-05'),
    score: 58
  },
  {
    id: 'var-005',
    title: 'Protocolo Detox Revolution - Científico',
    platform: 'Facebook',
    advertiser: 'Dra. Sarah Wellness',
    creative: {
      type: 'video',
      url: '/api/placeholder/400/300',
      thumbnailUrl: '/api/placeholder/300/200',
      duration: 30
    },
    copy: {
      headline: 'Protocolo Aprovado por 95% das Usuárias',
      primaryText: 'PESQUISA COMPROVA: 95% das mulheres que seguiram nosso protocolo perderam mais de 10kg em 30 dias. Baseado em ciência!',
      description: 'Dados científicos comprovam eficácia',
      callToAction: 'VER PESQUISA COMPLETA'
    },
    metrics: {
      impressions: 134000,
      clicks: 2680,
      ctr: 2.0,
      cpm: 22.40,
      spend: 3001.60,
      conversions: 35,
      costPerConversion: 85.76,
      roas: 2.3,
      frequency: 2.5,
      reach: 53600
    },
    status: 'paused',
    startDate: new Date('2024-01-12'),
    score: 61
  },
  {
    id: 'var-006',
    title: 'Protocolo Detox Revolution - Prova Social',
    platform: 'TikTok',
    advertiser: 'Dra. Sarah Wellness',
    creative: {
      type: 'video',
      url: '/api/placeholder/400/300',
      thumbnailUrl: '/api/placeholder/300/200',
      duration: 60
    },
    copy: {
      headline: 'Mais de 5.000 mulheres já transformaram seus corpos',
      primaryText: 'INCRÍVEL! Protocolo médico já ajudou mais de 5.000 mulheres a perderem peso de forma saudável. Próxima pode ser você!',
      description: 'Depoimentos reais de mulheres transformadas',
      callToAction: 'COMEÇAR MINHA TRANSFORMAÇÃO'
    },
    metrics: {
      impressions: 210000,
      clicks: 8400,
      ctr: 4.0,
      cpm: 6.80,
      spend: 1428.00,
      conversions: 126,
      costPerConversion: 11.33,
      roas: 17.5,
      frequency: 1.5,
      reach: 140000
    },
    status: 'active',
    startDate: new Date('2024-01-20'),
    score: 96
  }
]

interface MultipleAdsViewProps {
  variations?: AdVariation[]
  offerTitle?: string
}

export default function MultipleAdsView({ 
  variations = mockVariations, 
  offerTitle = 'Protocolo Detox Revolution - Perca 15kg em 30 Dias' 
}: MultipleAdsViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'score' | 'roas' | 'ctr' | 'conversions'>('score')
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'paused' | 'ended'>('all')
  const [selectedAd, setSelectedAd] = useState<string | null>(null)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([])

  // Filtrar e ordenar variações
  const filteredAndSortedVariations = variations
    .filter(variation => filterBy === 'all' || variation.status === filterBy)
    .sort((a, b) => {
      switch (sortBy) {
        case 'score': return b.score - a.score
        case 'roas': return b.metrics.roas - a.metrics.roas
        case 'ctr': return b.metrics.ctr - a.metrics.ctr
        case 'conversions': return b.metrics.conversions - a.metrics.conversions
        default: return 0
      }
    })

  const toggleComparison = (adId: string) => {
    if (selectedForComparison.includes(adId)) {
      setSelectedForComparison(prev => prev.filter(id => id !== adId))
    } else if (selectedForComparison.length < 4) {
      setSelectedForComparison(prev => [...prev, adId])
    } else {
      toast.warning('Máximo 4 anúncios para comparação')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'paused': return 'secondary'  
      case 'ended': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-3 w-3" />
      case 'paused': return <Pause className="h-3 w-3" />
      case 'ended': return <Calendar className="h-3 w-3" />
      default: return null
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success'
    if (score >= 70) return 'text-accent'
    if (score >= 50) return 'text-warning'
    return 'text-destructive'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Múltiplas Variações de Anúncios</h2>
          <p className="text-sm text-muted-foreground">
            {offerTitle} • {filteredAndSortedVariations.length} variações encontradas
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {comparisonMode && selectedForComparison.length > 0 && (
            <Badge variant="outline" className="bg-primary/10 border-primary/50">
              {selectedForComparison.length} selecionados para comparação
            </Badge>
          )}
          
          <Button
            variant={comparisonMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setComparisonMode(!comparisonMode)
              if (!comparisonMode) {
                setSelectedForComparison([])
              }
            }}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            {comparisonMode ? 'Sair do Modo Comparação' : 'Modo Comparação'}
          </Button>
          
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="border-0 rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="border-0 rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="ads" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-card/50">
          <TabsTrigger value="ads" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Anúncios
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Insights da IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-4">
          {/* Filtros */}
          <Card className="gaming-card">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select 
                    value={filterBy} 
                    onChange={(e) => setFilterBy(e.target.value as any)}
                    className="px-3 py-1 rounded border bg-background text-sm"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Apenas Ativos</option>
                    <option value="paused">Pausados</option>
                    <option value="ended">Finalizados</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <SortDesc className="h-4 w-4 text-muted-foreground" />
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1 rounded border bg-background text-sm"
                  >
                    <option value="score">Ordenar por Score</option>
                    <option value="roas">Ordenar por ROAS</option>
                    <option value="ctr">Ordenar por CTR</option>
                    <option value="conversions">Ordenar por Conversões</option>
                  </select>
                </div>

                {comparisonMode && selectedForComparison.length >= 2 && (
                  <Button size="sm" variant="default">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Comparar Selecionados
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="gaming-card">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Anúncios</p>
                    <p className="text-2xl font-bold">{variations.length}</p>
                  </div>
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Melhor ROAS</p>
                    <p className="text-2xl font-bold text-success">
                      {Math.max(...variations.map(v => v.metrics.roas)).toFixed(1)}x
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Melhor CTR</p>
                    <p className="text-2xl font-bold text-accent">
                      {Math.max(...variations.map(v => v.metrics.ctr))}%
                    </p>
                  </div>
                  <MousePointer className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Investido</p>
                    <p className="text-2xl font-bold">
                      R$ {variations.reduce((acc, v) => acc + v.metrics.spend, 0).toFixed(0)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>
          </div>

      {/* Grid/List de Anúncios */}
      {viewMode === 'grid' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedVariations.map((variation) => (
            <Card 
              key={variation.id}
              className={`gaming-card cursor-pointer transition-all hover:shadow-lg ${
                comparisonMode && selectedForComparison.includes(variation.id)
                  ? 'border-primary shadow-lg shadow-primary/20'
                  : ''
              }`}
              onClick={() => {
                if (comparisonMode) {
                  toggleComparison(variation.id)
                } else {
                  setSelectedAd(variation.id)
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant={getStatusBadgeVariant(variation.status)}
                        className="text-xs"
                      >
                        {getStatusIcon(variation.status)}
                        {variation.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {variation.platform}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm line-clamp-2">
                      {variation.title}
                    </CardTitle>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(variation.score)}`}>
                      {variation.score}
                    </div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Creative Preview */}
                <div className="relative">
                  <img 
                    src={variation.creative.thumbnailUrl || variation.creative.url}
                    alt="Creative Preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      {variation.creative.type === 'image' && '🖼️'}
                      {variation.creative.type === 'video' && '🎥'}
                      {variation.creative.type === 'carousel' && '🎠'}
                    </Badge>
                  </div>
                  {variation.creative.type === 'video' && variation.creative.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {variation.creative.duration}s
                    </div>
                  )}
                </div>

                {/* Copy Preview */}
                <div className="space-y-2">
                  <div className="font-medium text-sm line-clamp-1">
                    {variation.copy.headline}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {variation.copy.primaryText}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    CTA: {variation.copy.callToAction}
                  </Badge>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <div className="text-sm font-semibold text-success">
                      {variation.metrics.roas.toFixed(1)}x
                    </div>
                    <div className="text-xs text-muted-foreground">ROAS</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      {variation.metrics.ctr}%
                    </div>
                    <div className="text-xs text-muted-foreground">CTR</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      {variation.metrics.conversions}
                    </div>
                    <div className="text-xs text-muted-foreground">Conv.</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      R$ {variation.metrics.spend.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Gasto</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedVariations.map((variation) => (
            <Card 
              key={variation.id}
              className={`gaming-card cursor-pointer transition-all ${
                comparisonMode && selectedForComparison.includes(variation.id)
                  ? 'border-primary shadow-lg shadow-primary/20'
                  : ''
              }`}
              onClick={() => {
                if (comparisonMode) {
                  toggleComparison(variation.id)
                } else {
                  setSelectedAd(variation.id)
                }
              }}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <img 
                        src={variation.creative.thumbnailUrl || variation.creative.url}
                        alt="Creative"
                        className="w-20 h-16 object-cover rounded border"
                      />
                      <div className="absolute top-0 right-0 -mt-1 -mr-1">
                        <Badge variant="secondary" className="text-xs scale-75">
                          {variation.creative.type === 'image' && '🖼️'}
                          {variation.creative.type === 'video' && '🎥'}
                          {variation.creative.type === 'carousel' && '🎠'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={getStatusBadgeVariant(variation.status)}
                            className="text-xs"
                          >
                            {getStatusIcon(variation.status)}
                            {variation.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {variation.platform}
                          </Badge>
                          <div className={`text-sm font-bold ${getScoreColor(variation.score)}`}>
                            Score: {variation.score}
                          </div>
                        </div>
                        <div className="font-medium text-sm mb-1 line-clamp-1">
                          {variation.copy.headline}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {variation.copy.primaryText}
                        </div>
                      </div>
                      
                      {/* Métricas em linha */}
                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <div className="text-sm font-semibold text-success">
                            {variation.metrics.roas.toFixed(1)}x
                          </div>
                          <div className="text-xs text-muted-foreground">ROAS</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold">
                            {variation.metrics.ctr}%
                          </div>
                          <div className="text-xs text-muted-foreground">CTR</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold">
                            {variation.metrics.conversions}
                          </div>
                          <div className="text-xs text-muted-foreground">Conv.</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold">
                            R$ {variation.metrics.spend.toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground">Gasto</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        </TabsContent>

        <TabsContent value="insights">
          <OfferInsightsAnalysis variations={variations} offerTitle={offerTitle} />
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Anúncio */}
      {selectedAd && (
        <Dialog open={!!selectedAd} onOpenChange={() => setSelectedAd(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {(() => {
              const ad = variations.find(v => v.id === selectedAd)
              if (!ad) return null
              
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>{ad.title}</DialogTitle>
                    <DialogDescription>
                      Análise detalhada da variação do anúncio
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Performance Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="gaming-card">
                        <CardContent className="pt-4 text-center">
                          <div className={`text-xl font-bold ${getScoreColor(ad.score)}`}>
                            {ad.score}
                          </div>
                          <div className="text-sm text-muted-foreground">Score Geral</div>
                        </CardContent>
                      </Card>
                      <Card className="gaming-card">
                        <CardContent className="pt-4 text-center">
                          <div className="text-xl font-bold text-success">
                            {ad.metrics.roas.toFixed(1)}x
                          </div>
                          <div className="text-sm text-muted-foreground">ROAS</div>
                        </CardContent>
                      </Card>
                      <Card className="gaming-card">
                        <CardContent className="pt-4 text-center">
                          <div className="text-xl font-bold">
                            {ad.metrics.ctr}%
                          </div>
                          <div className="text-sm text-muted-foreground">CTR</div>
                        </CardContent>
                      </Card>
                      <Card className="gaming-card">
                        <CardContent className="pt-4 text-center">
                          <div className="text-xl font-bold">
                            {ad.metrics.conversions}
                          </div>
                          <div className="text-sm text-muted-foreground">Conversões</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Creative e Copy */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle className="text-base">Creative</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <img 
                              src={ad.creative.url}
                              alt="Creative"
                              className="w-full rounded-lg border"
                            />
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {ad.creative.type}
                              </Badge>
                              {ad.creative.duration && (
                                <Badge variant="outline">
                                  {ad.creative.duration}s
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle className="text-base">Copy do Anúncio</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <div className="font-medium text-sm mb-1">Headline:</div>
                              <div className="text-sm">{ad.copy.headline}</div>
                            </div>
                            <Separator />
                            <div>
                              <div className="font-medium text-sm mb-1">Texto Principal:</div>
                              <div className="text-sm">{ad.copy.primaryText}</div>
                            </div>
                            {ad.copy.description && (
                              <>
                                <Separator />
                                <div>
                                  <div className="font-medium text-sm mb-1">Descrição:</div>
                                  <div className="text-sm">{ad.copy.description}</div>
                                </div>
                              </>
                            )}
                            <Separator />
                            <div>
                              <div className="font-medium text-sm mb-1">Call to Action:</div>
                              <Badge className="bg-primary/10 border-primary/50">
                                {ad.copy.callToAction}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Métricas Detalhadas */}
                    <Card className="gaming-card">
                      <CardHeader>
                        <CardTitle className="text-base">Métricas Completas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              {ad.metrics.impressions.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Impressões</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              {ad.metrics.clicks.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Cliques</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              {ad.metrics.reach.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Alcance</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              {ad.metrics.frequency.toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">Frequência</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              R$ {ad.metrics.cpm.toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">CPM</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              R$ {ad.metrics.costPerConversion.toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">Custo/Conv.</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              R$ {ad.metrics.spend.toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">Investido</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              {ad.startDate.toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-sm text-muted-foreground">Início</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ações */}
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(ad.copy.primaryText)
                          toast.success('Copy copiado!')
                        }}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Texto
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const data = JSON.stringify(ad, null, 2)
                          const blob = new Blob([data], { type: 'application/json' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `anuncio-${ad.id}.json`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                          toast.success('Dados exportados!')
                        }}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Dados
                      </Button>
                    </div>
                  </div>
                </>
              )
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}