import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Brain, 
  Cpu, 
  TrendingUp, 
  Target,
  Zap,
  Activity,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Database,
  Settings
} from 'lucide-react'
import { machineLearningService, type ModeloTreinamento, type PredicaoIA, type TrendenciaIA } from '@/services/machineLearningService'
import { scrapingService } from '@/services/scrapingService'
import type { Criativo, MetricasCampanha } from '@/types'

interface MachineLearningPanelProps {
  campanhas: MetricasCampanha[]
  criativos: Criativo[]
  className?: string
}

export default function MachineLearningPanel({ 
  campanhas, 
  criativos, 
  className 
}: MachineLearningPanelProps) {
  const [modelos, setModelos] = useState<ModeloTreinamento[]>([])
  const [predicoes, setPredicoes] = useState<PredicaoIA[]>([])
  const [tendencias, setTendencias] = useState<TrendenciaIA[]>([])
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      const [modelosData, predicoesData, tendenciasData, estatisticasData] = await Promise.all([
        machineLearningService.obterModelos(),
        machineLearningService.obterPredicoes(),
        machineLearningService.obterTendencias(),
        machineLearningService.obterEstatisticas()
      ])

      setModelos(modelosData)
      setPredicoes(predicoesData)
      setTendencias(tendenciasData)
      setEstatisticas(estatisticasData)
    } catch (error) {
      console.error('Erro ao carregar dados ML:', error)
    }
  }

  const treinarNovoModelo = async () => {
    try {
      setIsLoading(true)
      
      // Buscar anúncios de sucesso para treinamento
      const anunciosSucesso = await scrapingService.obterAnuncios()
      
      const novoModelo = await machineLearningService.treinarModelo(
        campanhas,
        criativos,
        anunciosSucesso
      )
      
      await carregarDados()
      setActiveTab('modelos')
      
      console.log('✅ Modelo treinado com sucesso:', novoModelo.nome)
    } catch (error) {
      console.error('Erro ao treinar modelo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const gerarPredicoes = async () => {
    if (criativos.length === 0) {
      console.log('⚠️ Nenhum criativo disponível para predição')
      return
    }

    try {
      setIsLoading(true)
      
      const novasPredicoes = await machineLearningService.gerarPredicoes(criativos)
      await carregarDados()
      setActiveTab('predicoes')
      
      console.log(`✅ ${novasPredicoes.length} predições geradas`)
    } catch (error) {
      console.error('Erro ao gerar predições:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const analisarTendencias = async () => {
    try {
      setIsLoading(true)
      
      const anunciosSucesso = await scrapingService.obterAnuncios()
      const novasTendencias = await machineLearningService.identificarTendencias(anunciosSucesso)
      
      await carregarDados()
      setActiveTab('tendencias')
      
      console.log(`✅ ${novasTendencias.length} tendências identificadas`)
    } catch (error) {
      console.error('Erro ao analisar tendências:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Brain className="h-7 w-7 text-accent" />
            Centro de Inteligência Artificial
          </h2>
          <p className="text-muted-foreground mt-1">
            Machine Learning avançado para otimização de campanhas
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={treinarNovoModelo}
            disabled={isLoading}
          >
            {isLoading ? (
              <Activity className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Cpu className="h-4 w-4 mr-2" />
            )}
            Treinar Modelo
          </Button>
          
          <Button 
            onClick={gerarPredicoes}
            disabled={isLoading || criativos.length === 0}
            className="bg-gradient-to-r from-accent to-accent/80"
          >
            {isLoading ? (
              <Activity className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Gerar Predições
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      {estatisticas && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="gaming-card border-l-4 border-l-accent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Modelos Ativos</p>
                  <p className="text-2xl font-bold">{estatisticas.totalModelos}</p>
                  {estatisticas.modeloAtivo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {estatisticas.modeloAtivo}
                    </p>
                  )}
                </div>
                <Database className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="gaming-card border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Acurácia Média</p>
                  <p className="text-2xl font-bold">{estatisticas.acuraciaMedia.toFixed(1)}%</p>
                  <Progress 
                    value={estatisticas.acuraciaMedia} 
                    className="h-1 mt-2" 
                  />
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="gaming-card border-l-4 border-l-success">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Predições Ativas</p>
                  <p className="text-2xl font-bold">{estatisticas.predicoesRecentes}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    de {estatisticas.totalPredicoes} total
                  </p>
                </div>
                <Zap className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="gaming-card border-l-4 border-l-warning">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tendências</p>
                  <p className="text-2xl font-bold">{estatisticas.tendenciasAtivas}</p>
                  {estatisticas.ultimoTreinamento && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(() => {
                        const date = new Date(estatisticas.ultimoTreinamento)
                        return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleDateString('pt-BR')
                      })()}
                    </p>
                  )}
                </div>
                <TrendingUp className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas */}
      {modelos.length === 0 && (
        <Alert className="border-warning/50 bg-warning/10">
          <Lightbulb className="h-4 w-4" />
          <AlertDescription className="text-warning">
            Nenhum modelo ML treinado ainda. Clique em "Treinar Modelo" para começar a usar predições.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-card/50 border border-border/50">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="modelos" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Modelos ({modelos.length})
          </TabsTrigger>
          <TabsTrigger value="predicoes" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Predições ({predicoes.length})
          </TabsTrigger>
          <TabsTrigger value="tendencias" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendências ({tendencias.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab 
            estatisticas={estatisticas}
            onTreinarModelo={treinarNovoModelo}
            onGerarPredicoes={gerarPredicoes}
            onAnalisarTendencias={analisarTendencias}
            isLoading={isLoading}
            hasCriativos={criativos.length > 0}
          />
        </TabsContent>

        <TabsContent value="modelos">
          <ModelosTab modelos={modelos} />
        </TabsContent>

        <TabsContent value="predicoes">
          <PredicoesTab predicoes={predicoes} criativos={criativos} />
        </TabsContent>

        <TabsContent value="tendencias">
          <TendenciasTab 
            tendencias={tendencias} 
            onAnalisarTendencias={analisarTendencias}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componentes das abas
function OverviewTab({ 
  estatisticas, 
  onTreinarModelo, 
  onGerarPredicoes, 
  onAnalisarTendencias,
  isLoading,
  hasCriativos
}: {
  estatisticas: any
  onTreinarModelo: () => void
  onGerarPredicoes: () => void
  onAnalisarTendencias: () => void
  isLoading: boolean
  hasCriativos: boolean
}) {
  return (
    <div className="space-y-6">
      <Card className="gaming-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Sistema de IA em Tempo Real
          </CardTitle>
          <CardDescription>
            Controle central das funcionalidades de machine learning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Button 
              onClick={onTreinarModelo}
              disabled={isLoading}
              className="h-20 flex-col bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/30 hover:from-accent/30 hover:to-accent/20"
            >
              <Cpu className="h-6 w-6 mb-2" />
              <span>Treinar Novo Modelo</span>
            </Button>
            
            <Button 
              onClick={onGerarPredicoes}
              disabled={isLoading || !hasCriativos}
              className="h-20 flex-col bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 hover:from-primary/30 hover:to-primary/20"
            >
              <Zap className="h-6 w-6 mb-2" />
              <span>Gerar Predições</span>
            </Button>
            
            <Button 
              onClick={onAnalisarTendencias}
              disabled={isLoading}
              className="h-20 flex-col bg-gradient-to-br from-success/20 to-success/10 border border-success/30 hover:from-success/30 hover:to-success/20"
            >
              <TrendingUp className="h-6 w-6 mb-2" />
              <span>Analisar Tendências</span>
            </Button>
          </div>
          
          {estatisticas?.ultimoTreinamento && (
            <div className="mt-4 p-3 bg-muted/20 rounded text-sm">
              <strong>Último Treinamento:</strong> {new Date(estatisticas.ultimoTreinamento).toLocaleString('pt-BR')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ModelosTab({ modelos }: { modelos: ModeloTreinamento[] }) {
  return (
    <div className="space-y-4">
      {modelos.length > 0 ? (
        modelos.map((modelo) => (
          <Card key={modelo.id} className="gaming-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{modelo.nome}</CardTitle>
                  <CardDescription>
                    Versão {modelo.versao} • {modelo.parametros.algoritmo}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-accent">
                    {(modelo.acuracia * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Acurácia</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Dados de Treinamento</h4>
                  <div className="space-y-1 text-sm">
                    <div>Campanhas: {modelo.dadosUsados.totalCampanhas}</div>
                    <div>Criativos: {modelo.dadosUsados.totalCriativos}</div>
                    <div>Anúncios: {modelo.dadosUsados.totalAnuncios}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Features Utilizadas</h4>
                  <div className="flex flex-wrap gap-1">
                    {modelo.parametros.features.slice(0, 4).map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {modelo.parametros.features.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{modelo.parametros.features.length - 4} mais
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Treinado em: {new Date(modelo.dataTreinamento).toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="gaming-card">
          <CardContent className="text-center py-12">
            <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum modelo treinado</h3>
            <p className="text-muted-foreground">
              Treine seu primeiro modelo para começar a usar predições de IA
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PredicoesTab({ predicoes, criativos }: { predicoes: PredicaoIA[], criativos: Criativo[] }) {
  const getCriativo = (criativoId: string) => {
    return criativos.find(c => c.id === criativoId)
  }

  return (
    <div className="space-y-4">
      {predicoes.length > 0 ? (
        predicoes.slice(0, 10).map((predicao) => {
          const criativo = getCriativo(predicao.criativoId)
          
          return (
            <Card key={predicao.id} className="gaming-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {criativo?.nome || `Criativo ${predicao.criativoId.slice(-6)}`}
                    </CardTitle>
                    <CardDescription>
                      Predição gerada em {(() => {
                        const date = new Date(predicao.dataPredicao)
                        return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleDateString('pt-BR')
                      })()}
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/50">
                    {predicao.confianca.toFixed(0)}% confiança
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-3 bg-muted/20 rounded">
                    <div className="text-2xl font-bold text-primary">
                      {predicao.predicoes.ctrEstimado.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">CTR Estimado</div>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded">
                    <div className="text-2xl font-bold text-accent">
                      {predicao.predicoes.roasEstimado.toFixed(1)}x
                    </div>
                    <div className="text-sm text-muted-foreground">ROAS Estimado</div>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded">
                    <div className="text-2xl font-bold text-success">
                      {predicao.predicoes.probabilidadeSucesso.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Prob. Sucesso</div>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded">
                    <div className="text-2xl font-bold text-warning">
                      {predicao.predicoes.scoreQualidade}
                    </div>
                    <div className="text-sm text-muted-foreground">Score Qualidade</div>
                  </div>
                </div>
                
                {predicao.recomendacoes.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Recomendações
                    </h4>
                    <ul className="space-y-1">
                      {predicao.recomendacoes.slice(0, 3).map((recomendacao, index) => (
                        <li key={index} className="text-sm flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-success" />
                          {recomendacao}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      ) : (
        <Card className="gaming-card">
          <CardContent className="text-center py-12">
            <Zap className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma predição disponível</h3>
            <p className="text-muted-foreground">
              Gere predições para seus criativos usando os modelos de IA
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TendenciasTab({ 
  tendencias, 
  onAnalisarTendencias, 
  isLoading 
}: { 
  tendencias: TrendenciaIA[]
  onAnalisarTendencias: () => void
  isLoading: boolean
}) {
  const getImpactColor = (impacto: string) => {
    switch (impacto) {
      case 'alto': return 'text-destructive bg-destructive/10 border-destructive/50'
      case 'medio': return 'text-warning bg-warning/10 border-warning/50'
      case 'baixo': return 'text-success bg-success/10 border-success/50'
      default: return 'text-muted-foreground bg-muted/10 border-muted/50'
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'crescente': return <TrendingUp className="h-4 w-4 text-success" />
      case 'declinante': return <TrendingUp className="h-4 w-4 text-destructive rotate-180" />
      default: return <BarChart3 className="h-4 w-4 text-warning" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          onClick={onAnalisarTendencias}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? (
            <Activity className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <TrendingUp className="h-4 w-4 mr-2" />
          )}
          Atualizar Análise
        </Button>
      </div>

      {tendencias.length > 0 ? (
        tendencias.map((tendencia) => (
          <Card key={tendencia.id} className="gaming-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getTipoIcon(tendencia.tipo)}
                  <div>
                    <CardTitle className="text-lg">{tendencia.titulo}</CardTitle>
                    <CardDescription className="mt-1">
                      {tendencia.descricao}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={getImpactColor(tendencia.impacto)}>
                    {tendencia.impacto} impacto
                  </Badge>
                  <Badge variant="outline">
                    {tendencia.dadosSuportam.percentualMudanca > 0 ? '+' : ''}
                    {tendencia.dadosSuportam.percentualMudanca}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Setores Afetados</h4>
                  <div className="flex flex-wrap gap-1">
                    {tendencia.setor.map((setor) => (
                      <Badge key={setor} variant="outline" className="text-xs">
                        {setor}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Dados de Suporte</h4>
                  <div className="text-sm space-y-1">
                    <div>Amostras: {tendencia.dadosSuportam.amostrasAnalisadas}</div>
                    <div>Período: {tendencia.dadosSuportam.periodoAnalise}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Identificada em: {new Date(tendencia.dataIdentificacao).toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="gaming-card">
          <CardContent className="text-center py-12">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma tendência identificada</h3>
            <p className="text-muted-foreground mb-6">
              Execute a análise para identificar padrões emergentes no mercado
            </p>
            <Button onClick={onAnalisarTendencias} disabled={isLoading}>
              {isLoading ? (
                <Activity className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              Analisar Tendências
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}