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
  Calendar
} from 'lucide-react'

interface AdVariation {
  id: string
  creative: {
    type: 'image' | 'video' | 'carousel'
    url: string
    thumbnailUrl?: string
    duration?: number // para vídeos
  }
  copy: {
    headline: string
    primaryText: string
    description?: string
    callToAction: string
  }
  targeting: {
    age: string
    gender: string
    interests: string[]
    locations: string[]
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
  endDate?: Date
  platform: string
}

interface OfferComparison {
  offerId: string
  offerTitle: string
  advertiser: string
  niche: string
  totalVariations: number
  bestPerforming: AdVariation
  worstPerforming: AdVariation
  averageMetrics: {
    ctr: number
    cpm: number
    roas: number
    costPerConversion: number
  }
  variations: AdVariation[]
  insights: {
    topPerformingElements: string[]
    commonFailures: string[]
    recommendations: string[]
    trendsIdentified: string[]
  }
}

// Dados mockados para demonstração
const mockOfferComparison: OfferComparison = {
  offerId: 'offer-001',
  offerTitle: 'Protocolo Detox Revolution - Perca 15kg em 30 Dias',
  advertiser: 'Dra. Sarah Wellness',
  niche: 'Saúde & Fitness',
  totalVariations: 8,
  bestPerforming: {} as AdVariation, // Será preenchido abaixo
  worstPerforming: {} as AdVariation, // Será preenchido abaixo
  averageMetrics: {
    ctr: 2.8,
    cpm: 12.50,
    roas: 3.2,
    costPerConversion: 45.60
  },
  variations: [
    {
      id: 'var-001',
      creative: {
        type: 'image',
        url: '/api/placeholder/400/300',
        thumbnailUrl: '/api/placeholder/200/150'
      },
      copy: {
        headline: '🔥 MÉDICA REVELA: Protocolo Secreto Para Perder 15kg',
        primaryText: 'ATENÇÃO: Método revolucionário faz mulheres de 40+ perderem até 15kg em 30 dias! Sem dietas malucas, sem exercícios pesados. COMPROVADO por mais de 3.000 mulheres!',
        description: 'Protocolo desenvolvido por médica especialista em emagrecimento',
        callToAction: 'QUERO EMAGRECER AGORA'
      },
      targeting: {
        age: '35-55',
        gender: 'Mulheres',
        interests: ['Emagrecimento', 'Saúde', 'Bem-estar'],
        locations: ['Brasil', 'Regiões Metropolitanas']
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
      platform: 'Facebook'
    },
    {
      id: 'var-002',
      creative: {
        type: 'video',
        url: '/api/placeholder/400/300',
        thumbnailUrl: '/api/placeholder/200/150',
        duration: 45
      },
      copy: {
        headline: 'Médica de 45 anos perdeu 18kg com este método',
        primaryText: 'Dra. Sarah compartilha o protocolo que usou para perder 18kg e está ajudando milhares de mulheres. VEJA o vídeo completo!',
        description: 'Depoimento real da médica criadora do método',
        callToAction: 'ASSISTIR VÍDEO COMPLETO'
      },
      targeting: {
        age: '35-55',
        gender: 'Mulheres',
        interests: ['Emagrecimento', 'Saúde', 'Medicina Natural'],
        locations: ['Brasil']
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
      platform: 'Facebook'
    },
    {
      id: 'var-003',
      creative: {
        type: 'carousel',
        url: '/api/placeholder/400/300',
        thumbnailUrl: '/api/placeholder/200/150'
      },
      copy: {
        headline: 'Antes e Depois: Transformações REAIS',
        primaryText: 'VEJA as transformações IMPRESSIONANTES de mulheres que seguiram nosso protocolo. Resultados em apenas 30 dias!',
        description: 'Cases reais de sucesso do protocolo',
        callToAction: 'VER TODAS AS TRANSFORMAÇÕES'
      },
      targeting: {
        age: '30-60',
        gender: 'Mulheres',
        interests: ['Perda de peso', 'Transformação corporal'],
        locations: ['Brasil', 'Capitais']
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
      endDate: new Date('2024-01-22'),
      platform: 'Facebook'
    },
    {
      id: 'var-004',
      creative: {
        type: 'image',
        url: '/api/placeholder/400/300',
        thumbnailUrl: '/api/placeholder/200/150'
      },
      copy: {
        headline: 'URGENTE: Apenas 100 vagas restantes',
        primaryText: '⚠️ ÚLTIMA CHANCE: Restam apenas 100 vagas para o protocolo que está transformando a vida de milhares de mulheres. NÃO PERCA!',
        description: 'Oferta por tempo limitado - vagas limitadas',
        callToAction: 'GARANTIR MINHA VAGA'
      },
      targeting: {
        age: '35-55',
        gender: 'Mulheres',
        interests: ['Emagrecimento', 'Saúde'],
        locations: ['Brasil']
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
      endDate: new Date('2024-01-12'),
      platform: 'Facebook'
    },
    {
      id: 'var-005',
      creative: {
        type: 'video',
        url: '/api/placeholder/400/300',
        thumbnailUrl: '/api/placeholder/200/150',
        duration: 30
      },
      copy: {
        headline: 'Protocolo Aprovado por 95% das Usuárias',
        primaryText: 'PESQUISA COMPROVA: 95% das mulheres que seguiram nosso protocolo perderam mais de 10kg em 30 dias. Baseado em ciência!',
        description: 'Dados científicos comprovam eficácia',
        callToAction: 'VER PESQUISA COMPLETA'
      },
      targeting: {
        age: '25-50',
        gender: 'Mulheres',
        interests: ['Ciência', 'Saúde', 'Pesquisa'],
        locations: ['Brasil', 'Pessoas com ensino superior']
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
      endDate: new Date('2024-01-20'),
      platform: 'Facebook'
    }
  ],
  insights: {
    topPerformingElements: [
      'Headlines com urgência e exclusividade performam 40% melhor',
      'Imagens de transformação real aumentam CTR em 25%',
      'Vídeos curtos (30-45s) têm melhor engajamento',
      'CTAs diretos como "QUERO EMAGRECER AGORA" convertem mais'
    ],
    commonFailures: [
      'Excesso de urgência artificial reduz credibilidade',
      'Imagens muito polidas parecem menos autênticas',
      'Textos muito longos diminuem a taxa de leitura',
      'Segmentação muito ampla dilui a mensagem'
    ],
    recommendations: [
      'Focar em depoimentos reais e transformações autênticas',
      'Testar headlines com benefícios específicos vs. gerais',
      'Criar variações de vídeo com diferentes durações',
      'Segmentar por faixa etária mais específica (5-10 anos)'
    ],
    trendsIdentified: [
      'Anúncios com autoridade médica têm 60% mais credibilidade',
      'Conteúdo educacional performa melhor que promocional',
      'Público 35-45 anos tem maior taxa de conversão',
      'Horário 19h-22h apresenta melhor engajamento'
    ]
  }
}

// Definir melhor e pior performance
mockOfferComparison.bestPerforming = mockOfferComparison.variations[0] // Maior ROAS
mockOfferComparison.worstPerforming = mockOfferComparison.variations[4] // Menor ROAS

interface OfferAdsComparisonProps {
  offer?: OfferComparison
}

export default function OfferAdsComparison({ offer = mockOfferComparison }: OfferAdsComparisonProps) {
  const [selectedVariations, setSelectedVariations] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'roas' | 'ctr' | 'conversions' | 'spend'>('roas')
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'paused' | 'ended'>('all')
  
  // Filtrar e ordenar variações
  const filteredAndSortedVariations = offer.variations
    .filter(variation => filterBy === 'all' || variation.status === filterBy)
    .sort((a, b) => {
      switch (sortBy) {
        case 'roas': return b.metrics.roas - a.metrics.roas
        case 'ctr': return b.metrics.ctr - a.metrics.ctr
        case 'conversions': return b.metrics.conversions - a.metrics.conversions
        case 'spend': return b.metrics.spend - a.metrics.spend
        default: return 0
      }
    })

  const toggleVariationSelection = (variationId: string) => {
    setSelectedVariations(prev => 
      prev.includes(variationId) 
        ? prev.filter(id => id !== variationId)
        : [...prev, variationId]
    )
  }

  const getPerformanceColor = (value: number, type: 'roas' | 'ctr' | 'cpm') => {
    const avg = offer.averageMetrics[type === 'roas' ? 'roas' : type === 'ctr' ? 'ctr' : 'cpm']
    if (type === 'cpm') {
      return value < avg ? 'text-success' : value > avg * 1.5 ? 'text-destructive' : 'text-warning'
    }
    return value > avg * 1.2 ? 'text-success' : value < avg * 0.8 ? 'text-destructive' : 'text-warning'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-primary" />
            Análise Comparativa de Anúncios
          </h2>
          <p className="text-muted-foreground mt-1">
            {offer.offerTitle} • {offer.advertiser} • {offer.totalVariations} variações
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-accent/10 border-accent/50">
            {offer.niche}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const data = {
                offer: offer,
                selectedVariations: selectedVariations.length > 0 
                  ? offer.variations.filter(v => selectedVariations.includes(v.id))
                  : offer.variations,
                exportedAt: new Date().toISOString()
              }
              
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `analise-anuncios-${offer.offerTitle.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}.json`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
              
              toast.success('📊 Relatório exportado com sucesso!')
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Análise
          </Button>
        </div>
      </div>

      {/* Métricas Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="gaming-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Variações</p>
                <p className="text-2xl font-bold">{offer.totalVariations}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CTR Médio</p>
                <p className="text-2xl font-bold text-accent">{offer.averageMetrics.ctr}%</p>
              </div>
              <MousePointer className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ROAS Médio</p>
                <p className="text-2xl font-bold text-success">{offer.averageMetrics.roas.toFixed(1)}x</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CPM Médio</p>
                <p className="text-2xl font-bold">R$ {offer.averageMetrics.cpm.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="gaming-card border-l-4 border-l-success">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-success" />
              Melhor Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">{offer.bestPerforming.copy.headline}</div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-success/10 border-success/50 text-success">
                  ROAS: {offer.bestPerforming.metrics.roas.toFixed(1)}x
                </Badge>
                <Badge className="bg-success/10 border-success/50 text-success">
                  CTR: {offer.bestPerforming.metrics.ctr}%
                </Badge>
                <Badge className="bg-success/10 border-success/50 text-success">
                  {offer.bestPerforming.metrics.conversions} conversões
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Tipo: {offer.bestPerforming.creative.type} • Status: {offer.bestPerforming.status}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gaming-card border-l-4 border-l-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Necessita Melhoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">{offer.worstPerforming.copy.headline}</div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-destructive/10 border-destructive/50 text-destructive">
                  ROAS: {offer.worstPerforming.metrics.roas.toFixed(1)}x
                </Badge>
                <Badge className="bg-destructive/10 border-destructive/50 text-destructive">
                  CTR: {offer.worstPerforming.metrics.ctr}%
                </Badge>
                <Badge className="bg-destructive/10 border-destructive/50 text-destructive">
                  CPConv: R$ {offer.worstPerforming.metrics.costPerConversion.toFixed(2)}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Tipo: {offer.worstPerforming.creative.type} • Status: {offer.worstPerforming.status}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="variations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50">
          <TabsTrigger value="variations">Variações dos Anúncios</TabsTrigger>
          <TabsTrigger value="insights">Insights da IA</TabsTrigger>
          <TabsTrigger value="comparison">Comparação Detalhada</TabsTrigger>
        </TabsList>

        <TabsContent value="variations" className="space-y-4">
          {/* Filtros e Ordenação */}
          <Card className="gaming-card">
            <CardContent className="pt-6">
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
                    <option value="roas">Ordenar por ROAS</option>
                    <option value="ctr">Ordenar por CTR</option>
                    <option value="conversions">Ordenar por Conversões</option>
                    <option value="spend">Ordenar por Investimento</option>
                  </select>
                </div>

                {selectedVariations.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {selectedVariations.length} selecionados
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedVariations([])}
                    >
                      Limpar Seleção
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grid de Variações */}
          <div className="grid gap-4">
            {filteredAndSortedVariations.map((variation) => (
              <Card 
                key={variation.id} 
                className={`gaming-card cursor-pointer transition-all ${
                  selectedVariations.includes(variation.id) 
                    ? 'border-primary shadow-lg shadow-primary/20' 
                    : ''
                }`}
                onClick={() => toggleVariationSelection(variation.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Creative Preview */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <img 
                          src={variation.creative.thumbnailUrl || variation.creative.url}
                          alt="Creative Preview"
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <div className="absolute top-1 right-1">
                          <Badge variant="secondary" className="text-xs">
                            {variation.creative.type === 'image' && '🖼️'}
                            {variation.creative.type === 'video' && '🎥'}
                            {variation.creative.type === 'carousel' && '🎠'}
                          </Badge>
                        </div>
                        {variation.creative.type === 'video' && variation.creative.duration && (
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                            {variation.creative.duration}s
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium line-clamp-1">
                            {variation.copy.headline}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {variation.copy.primaryText}
                          </div>
                          <div className="flex items-center gap-2">
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
                            <div className="text-xs text-muted-foreground">
                              {variation.startDate instanceof Date && !isNaN(variation.startDate.getTime()) ? 
                                variation.startDate.toLocaleDateString('pt-BR') : 'Data inválida'}
                              {variation.endDate && variation.endDate instanceof Date && !isNaN(variation.endDate.getTime()) && 
                                ` - ${variation.endDate.toLocaleDateString('pt-BR')}`}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="text-center">
                          <div className={`text-sm font-semibold ${getPerformanceColor(variation.metrics.roas, 'roas')}`}>
                            {variation.metrics.roas.toFixed(1)}x
                          </div>
                          <div className="text-xs text-muted-foreground">ROAS</div>
                        </div>
                        
                        <div className="text-center">
                          <div className={`text-sm font-semibold ${getPerformanceColor(variation.metrics.ctr, 'ctr')}`}>
                            {variation.metrics.ctr}%
                          </div>
                          <div className="text-xs text-muted-foreground">CTR</div>
                        </div>
                        
                        <div className="text-center">
                          <div className={`text-sm font-semibold ${getPerformanceColor(variation.metrics.cpm, 'cpm')}`}>
                            R$ {variation.metrics.cpm.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">CPM</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-sm font-semibold">
                            {variation.metrics.conversions}
                          </div>
                          <div className="text-xs text-muted-foreground">Conversões</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-sm font-semibold">
                            R$ {variation.metrics.spend.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">Investido</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-sm font-semibold">
                            {variation.metrics.frequency.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">Frequência</div>
                        </div>
                      </div>

                      {/* CTA Preview */}
                      <div className="bg-muted/20 p-2 rounded text-sm">
                        <strong>CTA:</strong> {variation.copy.callToAction}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detalhes da Variação</DialogTitle>
                            <DialogDescription>
                              Análise completa da performance e configurações
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6">
                            {/* Métricas Detalhadas */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <h4 className="font-medium">Performance</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span>Impressões:</span>
                                    <span>{variation.metrics.impressions.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Alcance:</span>
                                    <span>{variation.metrics.reach.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Cliques:</span>
                                    <span>{variation.metrics.clicks.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Custo por Conversão:</span>
                                    <span>R$ {variation.metrics.costPerConversion.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-medium">Segmentação</h4>
                                <div className="space-y-1 text-sm">
                                  <div><strong>Idade:</strong> {variation.targeting.age}</div>
                                  <div><strong>Gênero:</strong> {variation.targeting.gender}</div>
                                  <div><strong>Interesses:</strong> {variation.targeting.interests.join(', ')}</div>
                                  <div><strong>Locais:</strong> {variation.targeting.locations.join(', ')}</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Copy Completo */}
                            <div className="space-y-2">
                              <h4 className="font-medium">Copy Completo</h4>
                              <div className="bg-muted/20 p-4 rounded space-y-2">
                                <div><strong>Headline:</strong> {variation.copy.headline}</div>
                                <div><strong>Texto Principal:</strong> {variation.copy.primaryText}</div>
                                {variation.copy.description && (
                                  <div><strong>Descrição:</strong> {variation.copy.description}</div>
                                )}
                                <div><strong>Call to Action:</strong> {variation.copy.callToAction}</div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(variation.copy.primaryText)
                          toast.success('Copy copiado!')
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            {/* Top Performing Elements */}
            <Card className="gaming-card border-l-4 border-l-success">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-success" />
                  Elementos de Alto Desempenho
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {offer.insights.topPerformingElements.map((element, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-success mt-2 flex-shrink-0" />
                      <span className="text-sm">{element}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Common Failures */}
            <Card className="gaming-card border-l-4 border-l-destructive">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Falhas Comuns Identificadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {offer.insights.commonFailures.map((failure, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                      <span className="text-sm">{failure}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="gaming-card border-l-4 border-l-accent">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  Recomendações da IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {offer.insights.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Trends */}
            <Card className="gaming-card border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Tendências Identificadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {offer.insights.trendsIdentified.map((trend, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-sm">{trend}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {selectedVariations.length >= 2 ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium">Comparação Detalhada</h3>
                <p className="text-sm text-muted-foreground">
                  Comparando {selectedVariations.length} variações selecionadas
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Métrica</th>
                      {selectedVariations.map(id => {
                        const variation = offer.variations.find(v => v.id === id)!
                        return (
                          <th key={id} className="text-center p-2 min-w-32">
                            <div className="text-xs">{variation.copy.headline.substring(0, 30)}...</div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'roas', label: 'ROAS', format: (v: number) => `${v.toFixed(1)}x` },
                      { key: 'ctr', label: 'CTR', format: (v: number) => `${v}%` },
                      { key: 'cpm', label: 'CPM', format: (v: number) => `R$ ${v.toFixed(2)}` },
                      { key: 'conversions', label: 'Conversões', format: (v: number) => v.toString() },
                      { key: 'spend', label: 'Investimento', format: (v: number) => `R$ ${v.toFixed(2)}` },
                      { key: 'costPerConversion', label: 'Custo/Conv.', format: (v: number) => `R$ ${v.toFixed(2)}` }
                    ].map(metric => (
                      <tr key={metric.key} className="border-b">
                        <td className="p-2 font-medium">{metric.label}</td>
                        {selectedVariations.map(id => {
                          const variation = offer.variations.find(v => v.id === id)!
                          const value = variation.metrics[metric.key as keyof typeof variation.metrics] as number
                          const allValues = selectedVariations.map(selId => {
                            const selVar = offer.variations.find(v => v.id === selId)!
                            return selVar.metrics[metric.key as keyof typeof selVar.metrics] as number
                          })
                          const isMax = value === Math.max(...allValues)
                          const isMin = value === Math.min(...allValues)
                          
                          return (
                            <td 
                              key={id} 
                              className={`text-center p-2 ${
                                isMax && metric.key !== 'cpm' && metric.key !== 'costPerConversion' 
                                  ? 'bg-success/20 text-success font-semibold'
                                  : isMin && (metric.key === 'cpm' || metric.key === 'costPerConversion')
                                  ? 'bg-success/20 text-success font-semibold'
                                  : isMin && metric.key !== 'cpm' && metric.key !== 'costPerConversion'
                                  ? 'bg-destructive/20 text-destructive'
                                  : ''
                              }`}
                            >
                              {metric.format(value)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <Card className="gaming-card">
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <GitCompare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecione pelo menos 2 variações</h3>
                  <p className="text-muted-foreground mb-6">
                    Clique nas variações que deseja comparar na aba "Variações dos Anúncios"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}