import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Globe, 
  Search, 
  TrendingUp, 
  Eye,
  Target,
  Clock,
  Star,
  Zap,
  Activity,
  BarChart3,
  Lightbulb,
  Sparkles,
  Trophy,
  CheckCircle,
  AlertTriangle,
  TrendingUpIcon,
  Brain,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { scrapingService, type AnuncioSucesso } from '@/services/scrapingService'
import { toast } from 'sonner'

interface ScrapingPanelProps {
  className?: string
  campanhas?: any[]
  criativos?: any[]
}

export default function ScrapingPanel({ className, campanhas = [], criativos = [] }: ScrapingPanelProps) {
  const [anuncios, setAnuncios] = useState<AnuncioSucesso[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [setorSelecionado, setSetorSelecionado] = useState('todos')
  const [tendencias, setTendencias] = useState<any>(null)
  const [comparacao, setComparacao] = useState<any>(null)
  const [insightsPorSetor, setInsightsPorSetor] = useState<any>(null)
  const [erro, setErro] = useState<string>('')
  const [filtroScore, setFiltroScore] = useState<'todos' | 'premium' | 'bom'>('todos')

  const setoresDisponiveis = [
    { value: 'todos', label: 'Todos os Setores' },
    { value: 'e-commerce', label: 'E-commerce' },
    { value: 'educacao', label: 'Educação Online' },
    { value: 'saude', label: 'Saúde & Bem-estar' },
    { value: 'tecnologia', label: 'Tecnologia & SaaS' },
    { value: 'financas', label: 'Finanças & Investimentos' },
    { value: 'entretenimento', label: 'Entretenimento' },
    { value: 'servicos', label: 'Serviços Profissionais' }
  ]

  useEffect(() => {
    carregarDadosCompletos()
  }, [])

  useEffect(() => {
    if (anuncios.length > 0) {
      analisarComparacao()
      obterInsightsPorSetor()
    }
  }, [setorSelecionado, campanhas, criativos])

  const carregarDadosCompletos = async () => {
    try {
      const anunciosExistentes = await scrapingService.obterAnuncios()
      setAnuncios(anunciosExistentes)
      
      if (anunciosExistentes.length > 0) {
        const tendenciasData = await scrapingService.analisarTendencias()
        setTendencias(tendenciasData)
        
        console.log(`📊 Base de conhecimento: ${anunciosExistentes.length} anúncios de sucesso`)
        console.log(`⭐ Score médio: ${tendenciasData.scoreMedio}`)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const analisarComparacao = async () => {
    if (campanhas.length > 0 || criativos.length > 0) {
      try {
        const dados = [...campanhas, ...criativos]
        const comparacaoData = await scrapingService.compararComSucesso(dados)
        setComparacao(comparacaoData)
      } catch (error) {
        console.error('Erro na análise comparativa:', error)
      }
    }
  }

  const obterInsightsPorSetor = async () => {
    try {
      const insights = await scrapingService.obterInsightsPorSetor(setorSelecionado)
      setInsightsPorSetor(insights)
    } catch (error) {
      console.error('Erro ao obter insights por setor:', error)
    }
  }

  const executarScraping = async () => {
    try {
      setIsLoading(true)
      setErro('')

      console.log(`🕷️ Iniciando coleta inteligente para: ${setorSelecionado}`)
      toast.info(`🔍 Analisando anúncios de alta performance...`)
      
      const novosAnuncios = await scrapingService.coletarAnunciosSucesso(setorSelecionado)
      
      // Recarregar todos os dados
      await carregarDadosCompletos()
      
      const validados = novosAnuncios.filter(a => a.extras?.validado)
      
      if (validados.length > 0) {
        toast.success(`✅ ${validados.length} anúncios de ALTA PERFORMANCE coletados!`)
      } else {
        toast.warning('⚠️ Nenhum anúncio atendeu aos critérios rigorosos de sucesso')
      }

      console.log(`✅ Coleta concluída: ${novosAnuncios.length} anúncios processados`)
    } catch (error) {
      console.error('Erro no scraping:', error)
      setErro(error instanceof Error ? error.message : 'Erro desconhecido no scraping')
      toast.error('❌ Erro na coleta de anúncios')
    } finally {
      setIsLoading(false)
    }
  }

  const formatarData = (data: Date) => {
    return new Date(data).toLocaleString('pt-BR')
  }

  const anunciosFiltrados = anuncios.filter(anuncio => {
    const passaSetor = setorSelecionado === 'todos' || anuncio.setor === setorSelecionado
    const passaScore = filtroScore === 'todos' || 
                      (filtroScore === 'premium' && anuncio.scoreQualidade > 85) ||
                      (filtroScore === 'bom' && anuncio.scoreQualidade >= 75 && anuncio.scoreQualidade <= 85)
    return passaSetor && passaScore
  })

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Globe className="h-7 w-7 text-primary" />
            Central de Inteligência Competitiva
          </h2>
          <p className="text-muted-foreground mt-1">
            Sistema avançado de coleta e análise de anúncios de alta performance
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={setorSelecionado} onValueChange={setSetorSelecionado}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar setor" />
            </SelectTrigger>
            <SelectContent>
              {setoresDisponiveis.map(setor => (
                <SelectItem key={setor.value} value={setor.value}>
                  {setor.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={executarScraping}
            disabled={isLoading}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            {isLoading ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Coletar Inteligência
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Estatísticas Avançadas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="gaming-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Base de Conhecimento</p>
                <p className="text-2xl font-bold">{anuncios.length}</p>
                <p className="text-xs text-muted-foreground">anúncios analisados</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Score Médio</p>
                <p className="text-2xl font-bold text-accent">{tendencias?.scoreMedio || 0}</p>
                <p className="text-xs text-muted-foreground">qualidade premium</p>
              </div>
              <Star className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Anúncios Premium</p>
                <p className="text-2xl font-bold text-success">
                  {tendencias?.estatisticas?.anunciosPremium || 0}
                </p>
                <p className="text-xs text-muted-foreground">score {'>'} 85</p>
              </div>
              <Trophy className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Setores Ativos</p>
                <p className="text-2xl font-bold">{tendencias?.setoresEmDestaque?.length || 0}</p>
                <p className="text-xs text-muted-foreground">em análise</p>
              </div>
              <BarChart3 className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="gaming-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Última Coleta</p>
                <p className="text-sm font-bold">
                  {anuncios.length > 0 
                    ? formatarData(anuncios[anuncios.length - 1].dataColeta).split(' ')[1]
                    : 'N/A'
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  {anuncios.length > 0 
                    ? formatarData(anuncios[anuncios.length - 1].dataColeta).split(' ')[0]
                    : 'nunca'
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Erro */}
      {erro && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-destructive">
            {erro}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs com diferentes análises */}
      <Tabs defaultValue="anuncios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="anuncios" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Anúncios ({anunciosFiltrados.length})
          </TabsTrigger>
          <TabsTrigger value="tendencias" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendências
          </TabsTrigger>
          <TabsTrigger value="comparacao" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Benchmark
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Insights IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anuncios" className="space-y-6">
          {/* Filtros */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Select 
                value={filtroScore} 
                onValueChange={(value: string) => setFiltroScore(value as 'todos' | 'premium' | 'bom')}
              >
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="premium">Premium (85+)</SelectItem>
                  <SelectItem value="bom">Bom (75-85)</SelectItem>
                </SelectContent>
              </Select>
              
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {anunciosFiltrados.length} anúncios
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={carregarDadosCompletos}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Lista de Anúncios */}
          <Card className="gaming-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Anúncios de Alta Performance
                  </CardTitle>
                  <CardDescription>
                    Base de conhecimento com critérios rigorosos de sucesso
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex space-x-4 animate-pulse">
                      <div className="w-24 h-16 bg-muted/20 rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted/20 rounded w-3/4" />
                        <div className="h-3 bg-muted/20 rounded w-1/2" />
                        <div className="flex gap-2">
                          <div className="h-6 bg-muted/20 rounded w-16" />
                          <div className="h-6 bg-muted/20 rounded w-16" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : anunciosFiltrados.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {anunciosFiltrados.slice(0, 20).map((anuncio) => (
                    <AnuncioCard key={anuncio.id} anuncio={anuncio} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    {anuncios.length === 0 ? 'Nenhum anúncio coletado ainda' : 'Nenhum anúncio atende aos filtros'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {anuncios.length === 0 
                      ? 'Execute a coleta para começar a construir sua base de inteligência competitiva'
                      : 'Ajuste os filtros para ver mais resultados'
                    }
                  </p>
                  {anuncios.length === 0 && (
                    <Button 
                      onClick={executarScraping}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-primary to-primary/80"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Começar Coleta Inteligente
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tendencias">
          <TendenciasTab tendencias={tendencias} />
        </TabsContent>

        <TabsContent value="comparacao">
          <ComparacaoTab comparacao={comparacao} campanhas={campanhas} criativos={criativos} />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsTab insightsPorSetor={insightsPorSetor} setorSelecionado={setorSelecionado} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componente para exibir cada anúncio com informações avançadas
function AnuncioCard({ anuncio }: { anuncio: AnuncioSucesso }) {
  const isValidado = anuncio.extras?.validado
  const scoreColor = anuncio.scoreQualidade > 85 ? 'success' : 
                     anuncio.scoreQualidade > 75 ? 'warning' : 'secondary'

  return (
    <Card className={`gaming-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ${
      isValidado ? 'border-success/30' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Imagem do anúncio */}
          <div className="w-20 h-16 bg-muted/20 rounded overflow-hidden flex-shrink-0 relative">
            {anuncio.imageUrl ? (
              <img 
                src={anuncio.imageUrl} 
                alt={anuncio.titulo}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = 'none'
                  // Mostrar placeholder quando falhar
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <svg class="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        ${isValidado ? '<div class="absolute top-1 right-1"><svg class="h-3 w-3 text-success" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg></div>' : ''}
                      </div>
                    `
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                <Eye className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            {isValidado && (
              <div className="absolute top-1 right-1">
                <CheckCircle className="h-3 w-3 text-success" />
              </div>
            )}
          </div>
          
          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm truncate pr-2">
                {anuncio.titulo}
              </h4>
              <div className="flex items-center gap-1">
                <Badge 
                  className={`text-xs ${
                    scoreColor === 'success' ? 'bg-success/10 text-success border-success/50' :
                    scoreColor === 'warning' ? 'bg-warning/10 text-warning border-warning/50' :
                    'bg-secondary'
                  }`}
                >
                  {anuncio.scoreQualidade}
                </Badge>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {anuncio.descricao}
            </p>
            
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">
                <strong>{anuncio.empresa}</strong> • {anuncio.setor}
              </div>
              <Badge variant="outline" className="text-xs capitalize">
                {anuncio.elementos.tipoEmocao}
              </Badge>
            </div>
            
            {/* Métricas */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div>
                <span className="text-muted-foreground">CTR:</span>
                <span className="ml-1 font-medium text-primary">
                  {anuncio.metricas.ctr.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Alcance:</span>
                <span className="ml-1 font-medium text-accent">
                  {anuncio.metricas.alcance.toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Engaj:</span>
                <span className="ml-1 font-medium text-success">
                  {anuncio.metricas.engajamento.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Relev:</span>
                <span className="ml-1 font-medium text-warning">
                  {anuncio.metricas.relevancia.toFixed(1)}
                </span>
              </div>
            </div>
            
            {/* Elementos visuais e técnicas */}
            <div className="flex gap-1 flex-wrap">
              {anuncio.elementos.temImagem && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">IMG</Badge>
              )}
              {anuncio.elementos.temVideo && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">VID</Badge>
              )}
              {anuncio.elementos.temCTA && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">CTA</Badge>
              )}
              {anuncio.elementos.temPessoas && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">PPL</Badge>
              )}
              {anuncio.extras?.copyTecnicas?.length && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  {anuncio.extras.copyTecnicas.length}T
                </Badge>
              )}
            </div>
            
            {/* Motivo de sucesso */}
            {anuncio.extras?.motivoSucesso && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-[10px] text-success flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  {anuncio.extras.motivoSucesso}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Tab de Tendências
function TendenciasTab({ tendencias }: { tendencias: any }) {
  if (!tendencias) {
    return (
      <Card className="gaming-card">
        <CardContent className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Colete dados para ver tendências</h3>
          <p className="text-muted-foreground">
            Execute a coleta de anúncios para gerar análises inteligentes
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="gaming-card border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Análise Avançada de Tendências
          </CardTitle>
          <CardDescription>
            Padrões identificados nos {tendencias.estatisticas?.totalAnuncios || 0} anúncios de alta performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estatísticas rápidas */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <p className="text-2xl font-bold text-success">{tendencias.estatisticas?.anunciosPremium || 0}</p>
              <p className="text-sm text-muted-foreground">Anúncios Premium</p>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <p className="text-2xl font-bold text-accent">{tendencias.scoreMedio}</p>
              <p className="text-sm text-muted-foreground">Score Médio</p>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <p className="text-2xl font-bold text-primary">{tendencias.estatisticas?.scoreMaximo || 0}</p>
              <p className="text-sm text-muted-foreground">Score Máximo</p>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-lg">
              <p className="text-2xl font-bold text-warning">{tendencias.setoresEmDestaque?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Setores Ativos</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Emoções Mais Efetivas */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Emoções de Alta Performance
              </h4>
              <div className="space-y-3">
                {tendencias.emocoesMaisEfetivas?.map((emocao: string, index: number) => (
                  <div key={emocao} className="flex items-center justify-between p-2 bg-muted/10 rounded">
                    <Badge variant="outline" className="capitalize">
                      {emocao}
                    </Badge>
                    <div className="text-right">
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <p className="text-xs text-muted-foreground">mais eficaz</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Elementos de Sucesso */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Elementos Críticos
              </h4>
              <div className="space-y-2">
                {tendencias.elementosComuns?.map((elemento: string) => (
                  <div key={elemento} className="flex items-center gap-2 p-2 bg-success/5 rounded">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm">{elemento}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights da IA */}
          {tendencias.insights && tendencias.insights.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-accent" />
                Insights da Inteligência Artificial
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                {tendencias.insights.map((insight: string, index: number) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-accent/5 border border-accent/20 rounded">
                    <Lightbulb className="h-4 w-4 text-accent mt-0.5" />
                    <span className="text-sm">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paleta de Cores */}
          {tendencias.coresMaisUsadas?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-warning" />
                Paleta de Cores de Sucesso
              </h4>
              <div className="flex flex-wrap gap-2">
                {tendencias.coresMaisUsadas.map((cor: string, index: number) => (
                  <div 
                    key={cor} 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20 border hover:shadow-md transition-shadow"
                  >
                    <div 
                      className="w-5 h-5 rounded border-2 border-white shadow-sm" 
                      style={{ backgroundColor: cor }}
                    />
                    <span className="text-xs font-mono font-medium">{cor}</span>
                    <Badge variant="outline" className="text-[10px]">#{index + 1}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Tab de Comparação/Benchmark
function ComparacaoTab({ comparacao, campanhas, criativos }: { comparacao: any, campanhas: any[], criativos: any[] }) {
  if (!comparacao && (campanhas.length === 0 && criativos.length === 0)) {
    return (
      <Card className="gaming-card">
        <CardContent className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Sem dados para comparação</h3>
          <p className="text-muted-foreground">
            Configure campanhas para comparar com anúncios de sucesso
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="gaming-card border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Benchmark vs. Anúncios de Sucesso
          </CardTitle>
          <CardDescription>
            Compare suas campanhas com os melhores performers do mercado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {comparacao && (
            <>
              {/* Score geral */}
              <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border">
                <h3 className="text-2xl font-bold mb-2">
                  Pontuação Geral: {comparacao.pontuacao}%
                </h3>
                <Progress value={comparacao.pontuacao} className="w-full mb-3" />
                <p className="text-sm text-muted-foreground">
                  Sua performance em relação aos anúncios de elite
                </p>
              </div>

              {/* Recomendações */}
              {comparacao.recomendacoes?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-success" />
                    Recomendações Principais
                  </h4>
                  <div className="grid gap-3">
                    {comparacao.recomendacoes.map((recomendacao: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm">{recomendacao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Melhorias específicas */}
              {comparacao.melhorias?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUpIcon className="h-4 w-4 text-accent" />
                    Oportunidades de Melhoria
                  </h4>
                  <div className="space-y-4">
                    {comparacao.melhorias.map((melhoria: any, index: number) => (
                      <Card key={index} className="gaming-card">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-accent">{melhoria.area}</h5>
                            <Badge className="bg-accent/10 text-accent">{melhoria.impactoEstimado}</Badge>
                          </div>
                          <p className="text-sm text-destructive mb-2">{melhoria.problema}</p>
                          <p className="text-sm text-success">{melhoria.solucao}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Tab de Insights por Setor
function InsightsTab({ insightsPorSetor, setorSelecionado }: { insightsPorSetor: any, setorSelecionado: string }) {
  if (!insightsPorSetor) {
    return (
      <Card className="gaming-card">
        <CardContent className="text-center py-12">
          <Lightbulb className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Gerando insights...</h3>
          <p className="text-muted-foreground">
            Colete dados do setor para insights personalizados
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="gaming-card border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            Insights Específicos: {setorSelecionado === 'todos' ? 'Todos os Setores' : setorSelecionado}
          </CardTitle>
          <CardDescription>
            Análise detalhada com {insightsPorSetor.anunciosSetor?.length || 0} anúncios do setor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score do setor */}
          <div className="text-center p-4 bg-accent/10 rounded-lg">
            <h3 className="text-2xl font-bold text-accent">{insightsPorSetor.scoreMedio}</h3>
            <p className="text-sm text-muted-foreground">Score médio do setor</p>
          </div>

          {/* Melhores práticas */}
          {insightsPorSetor.melhoresPraticas?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-success" />
                Melhores Práticas do Setor
              </h4>
              <div className="grid gap-2">
                {insightsPorSetor.melhoresPraticas.map((pratica: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded">
                    <Trophy className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">{pratica}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exemplos de destaque */}
          {insightsPorSetor.exemplosDestaque?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-accent" />
                Top 3 Anúncios do Setor
              </h4>
              <div className="grid gap-4">
                {insightsPorSetor.exemplosDestaque.slice(0, 3).map((anuncio: AnuncioSucesso, index: number) => (
                  <div key={anuncio.id} className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded">
                    <div className="flex-shrink-0 w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium truncate">{anuncio.titulo}</h5>
                      <p className="text-sm text-muted-foreground">{anuncio.empresa}</p>
                    </div>
                    <Badge className="bg-accent/10 text-accent">
                      {anuncio.scoreQualidade}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}