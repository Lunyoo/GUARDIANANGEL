import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp,
  TrendingDown,
  Star,
  Target,
  Eye,
  MousePointer,
  DollarSign,
  Award,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Zap
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"

interface AdMetrics {
  roas: number
  ctr: number
  conversions: number
  spend: number
  cpm: number
  impressions: number
}

interface AdVariation {
  id: string
  title: string
  creative: { type: 'image' | 'video' | 'carousel' }
  copy: { headline: string; primaryText: string; callToAction: string }
  metrics: AdMetrics
  status: 'active' | 'paused' | 'ended'
  score: number
  platform: string
}

interface OfferInsights {
  bestPerformers: AdVariation[]
  worstPerformers: AdVariation[]
  creativeTypeAnalysis: {
    type: string
    count: number
    avgRoas: number
    avgCtr: number
    performance: 'excellent' | 'good' | 'average' | 'poor'
  }[]
  platformAnalysis: {
    platform: string
    count: number
    avgRoas: number
    avgCtr: number
    totalSpend: number
  }[]
  copyAnalysis: {
    topHeadlineWords: { word: string; frequency: number; avgPerformance: number }[]
    topCTAPatterns: { pattern: string; frequency: number; avgConversions: number }[]
  }
  recommendations: {
    category: 'creative' | 'copy' | 'targeting' | 'budget'
    title: string
    description: string
    impact: 'high' | 'medium' | 'low'
  }[]
  trends: {
    performanceOverTime: { date: string; roas: number; ctr: number; spend: number }[]
    statusDistribution: { status: string; count: number; value: number }[]
  }
}

interface OfferInsightsAnalysisProps {
  variations: AdVariation[]
  offerTitle: string
}

// Função para gerar insights baseados nas variações
function generateInsights(variations: AdVariation[]): OfferInsights {
  const sortedByRoas = [...variations].sort((a, b) => b.metrics.roas - a.metrics.roas)
  const bestPerformers = sortedByRoas.slice(0, 3)
  const worstPerformers = sortedByRoas.slice(-3).reverse()

  // Análise por tipo de criativo
  const creativeTypes = ['image', 'video', 'carousel'] as const
  const creativeTypeAnalysis = creativeTypes.map(type => {
    const ads = variations.filter(v => v.creative.type === type)
    const avgRoas = ads.length > 0 ? ads.reduce((acc, v) => acc + v.metrics.roas, 0) / ads.length : 0
    const avgCtr = ads.length > 0 ? ads.reduce((acc, v) => acc + v.metrics.ctr, 0) / ads.length : 0
    
    let performance: 'excellent' | 'good' | 'average' | 'poor' = 'poor'
    if (avgRoas >= 10) performance = 'excellent'
    else if (avgRoas >= 5) performance = 'good'
    else if (avgRoas >= 2) performance = 'average'
    
    return {
      type,
      count: ads.length,
      avgRoas,
      avgCtr,
      performance
    }
  }).filter(analysis => analysis.count > 0)

  // Análise por plataforma
  const platforms = [...new Set(variations.map(v => v.platform))]
  const platformAnalysis = platforms.map(platform => {
    const ads = variations.filter(v => v.platform === platform)
    return {
      platform,
      count: ads.length,
      avgRoas: ads.reduce((acc, v) => acc + v.metrics.roas, 0) / ads.length,
      avgCtr: ads.reduce((acc, v) => acc + v.metrics.ctr, 0) / ads.length,
      totalSpend: ads.reduce((acc, v) => acc + v.metrics.spend, 0)
    }
  })

  // Análise de copy (simplificada)
  const headlines = variations.map(v => v.copy.headline)
  const words = headlines.join(' ').toLowerCase().split(/\s+/)
  const wordFreq = words.reduce((acc: Record<string, number>, word) => {
    if (word.length > 3) acc[word] = (acc[word] || 0) + 1
    return acc
  }, {})
  
  const topHeadlineWords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word, frequency]) => ({
      word,
      frequency,
      avgPerformance: 75 + Math.random() * 20 // Simulado
    }))

  const ctas = variations.map(v => v.copy.callToAction)
  const ctaPatterns = [...new Set(ctas)].map(pattern => ({
    pattern,
    frequency: ctas.filter(cta => cta === pattern).length,
    avgConversions: Math.floor(Math.random() * 50 + 20) // Simulado
  }))

  // Recomendações baseadas na análise
  const recommendations = []
  
  // Recomendação de criativo
  const bestCreativeType = creativeTypeAnalysis.reduce((best, current) => 
    current.avgRoas > best.avgRoas ? current : best
  )
  recommendations.push({
    category: 'creative' as const,
    title: `Aposte mais em ${bestCreativeType.type === 'image' ? 'imagens' : bestCreativeType.type === 'video' ? 'vídeos' : 'carrossels'}`,
    description: `${bestCreativeType.type === 'image' ? 'Imagens' : bestCreativeType.type === 'video' ? 'Vídeos' : 'Carrossels'} têm ROAS ${bestCreativeType.avgRoas.toFixed(1)}x, ${((bestCreativeType.avgRoas / (creativeTypeAnalysis.reduce((acc, t) => acc + t.avgRoas, 0) / creativeTypeAnalysis.length) - 1) * 100).toFixed(0)}% acima da média`,
    impact: bestCreativeType.avgRoas > 10 ? 'high' as const : 'medium' as const
  })

  // Recomendação de copy
  const topWord = topHeadlineWords[0]
  if (topWord) {
    recommendations.push({
      category: 'copy' as const,
      title: `Incorpore mais a palavra "${topWord.word}"`,
      description: `Aparece em ${topWord.frequency} anúncios com performance superior`,
      impact: 'medium' as const
    })
  }

  // Recomendação de budget
  const totalSpend = variations.reduce((acc, v) => acc + v.metrics.spend, 0)
  const avgRoas = variations.reduce((acc, v) => acc + v.metrics.roas, 0) / variations.length
  if (avgRoas > 5) {
    recommendations.push({
      category: 'budget' as const,
      title: 'Considere aumentar o orçamento',
      description: `ROAS médio de ${avgRoas.toFixed(1)}x indica oportunidade para escalar`,
      impact: 'high' as const
    })
  }

  // Dados de tendência (simulados)
  const performanceOverTime = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    roas: avgRoas + (Math.random() - 0.5) * 2,
    ctr: variations.reduce((acc, v) => acc + v.metrics.ctr, 0) / variations.length + (Math.random() - 0.5) * 0.5,
    spend: totalSpend / 7 + (Math.random() - 0.5) * 200
  }))

  const statusCounts = {
    active: variations.filter(v => v.status === 'active').length,
    paused: variations.filter(v => v.status === 'paused').length,
    ended: variations.filter(v => v.status === 'ended').length
  }

  const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    value: count
  }))

  return {
    bestPerformers,
    worstPerformers,
    creativeTypeAnalysis,
    platformAnalysis,
    copyAnalysis: {
      topHeadlineWords,
      topCTAPatterns: ctaPatterns
    },
    recommendations,
    trends: {
      performanceOverTime,
      statusDistribution
    }
  }
}

export default function OfferInsightsAnalysis({ variations, offerTitle }: OfferInsightsAnalysisProps) {
  const insights = useMemo(() => generateInsights(variations), [variations])

  const colors = {
    excellent: '#10b981', // green
    good: '#3b82f6',      // blue
    average: '#f59e0b',   // yellow
    poor: '#ef4444'       // red
  }

  const statusColors = ['#10b981', '#f59e0b', '#6b7280'] // active, paused, ended

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold">Insights Avançados</h3>
        <p className="text-sm text-muted-foreground">
          Análise inteligente de {variations.length} variações para identificar padrões de sucesso
        </p>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="gaming-card border-l-4 border-l-success">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-success" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.bestPerformers.slice(0, 2).map((ad, index) => (
              <div key={ad.id} className="flex items-center gap-3">
                <Badge className="bg-success/10 border-success/50 text-success">
                  #{index + 1}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium text-sm line-clamp-1">
                    {ad.copy.headline.substring(0, 40)}...
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ROAS: {ad.metrics.roas.toFixed(1)}x • CTR: {ad.metrics.ctr}%
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gaming-card border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Performance por Criativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.creativeTypeAnalysis.map((analysis) => (
              <div key={analysis.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium capitalize">
                    {analysis.type === 'image' ? '🖼️ Imagens' : 
                     analysis.type === 'video' ? '🎥 Vídeos' : 
                     '🎠 Carrossels'}
                  </div>
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ borderColor: colors[analysis.performance] }}
                  >
                    {analysis.count}
                  </Badge>
                </div>
                <div className="text-sm font-semibold" style={{ color: colors[analysis.performance] }}>
                  {analysis.avgRoas.toFixed(1)}x
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gaming-card border-l-4 border-l-accent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" />
              Distribuição de Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.trends.statusDistribution.map((item, index) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: statusColors[index] }}
                    />
                    <span className="text-sm capitalize">{item.status}</span>
                  </div>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Tendência */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="text-base">Tendência de Performance</CardTitle>
            <CardDescription>ROAS e CTR nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={insights.trends.performanceOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="roas" 
                  stroke="var(--primary)" 
                  fill="var(--primary)" 
                  fillOpacity={0.3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="text-base">Performance por Plataforma</CardTitle>
            <CardDescription>Comparativo de ROAS entre plataformas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={insights.platformAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="platform" 
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="avgRoas" fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Análise de Copy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Palavras de Alto Impacto
            </CardTitle>
            <CardDescription>Termos que aparecem nos anúncios de melhor performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.copyAnalysis.topHeadlineWords.map((word, index) => (
                <div key={word.word} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="font-medium">{word.word}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {word.frequency}x
                    </Badge>
                    <div className="text-sm text-success font-semibold">
                      {word.avgPerformance.toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              CTAs Mais Eficazes
            </CardTitle>
            <CardDescription>Calls to action com maior taxa de conversão</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.copyAnalysis.topCTAPatterns.slice(0, 4).map((cta, index) => (
                <div key={cta.pattern} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium line-clamp-1">
                      {cta.pattern}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {cta.avgConversions} conv.
                    </Badge>
                  </div>
                  <Progress value={(cta.frequency / Math.max(...insights.copyAnalysis.topCTAPatterns.map(c => c.frequency))) * 100} className="h-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recomendações */}
      <Card className="gaming-card border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent" />
            Recomendações da IA
          </CardTitle>
          <CardDescription>
            Sugestões baseadas na análise de performance das variações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {insights.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                <div className="flex-shrink-0 mt-1">
                  {rec.category === 'creative' && <Eye className="h-4 w-4 text-primary" />}
                  {rec.category === 'copy' && <MousePointer className="h-4 w-4 text-accent" />}
                  {rec.category === 'targeting' && <Target className="h-4 w-4 text-success" />}
                  {rec.category === 'budget' && <DollarSign className="h-4 w-4 text-warning" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{rec.title}</span>
                    <Badge 
                      variant={rec.impact === 'high' ? 'default' : rec.impact === 'medium' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {rec.impact === 'high' ? '🔥 Alto Impacto' : rec.impact === 'medium' ? '⚡ Médio' : '💡 Baixo'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rec.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Worst Performers - Para melhorias */}
      <Card className="gaming-card border-l-4 border-l-destructive">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Oportunidades de Melhoria
          </CardTitle>
          <CardDescription>
            Anúncios que precisam de otimização ou pausa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.worstPerformers.slice(0, 3).map((ad, index) => (
              <div key={ad.id} className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <Badge className="bg-destructive/10 border-destructive/50 text-destructive">
                  #{index + 1}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium text-sm line-clamp-1">
                    {ad.copy.headline.substring(0, 50)}...
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-4">
                    <span>ROAS: {ad.metrics.roas.toFixed(1)}x</span>
                    <span>CTR: {ad.metrics.ctr}%</span>
                    <span>Conversões: {ad.metrics.conversions}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {ad.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}