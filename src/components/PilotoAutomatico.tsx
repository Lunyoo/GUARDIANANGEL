import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bot,
  Settings,
  Activity,
  Zap,
  Target,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Lightbulb,
  Clock,
  Brain,
  Loader2,
  Check,
  X
} from "lucide-react"
import { usePilotoAutomatico } from '@/hooks/usePilotoAutomatico'
import type { MetricasCampanha, Criativo } from '@/types'
import type { PilotoAutomaticoConfig, AcaoAutomatica, SugestaoOtimizacao } from '@/hooks/usePilotoAutomatico'

interface PilotoAutomaticoProps {
  campanhas: MetricasCampanha[]
  criativos: Criativo[]
}

export default function PilotoAutomatico({ campanhas, criativos }: PilotoAutomaticoProps) {
  const {
    config,
    setConfig,
    acoes,
    sugestoes,
    isAnalyzing,
    ultimaAnalise,
    analisarCampanhas,
    aplicarSugestao,
    rejeitarSugestao,
    ativarPilotoAutomatico
  } = usePilotoAutomatico()

  const [configTemp, setConfigTemp] = useState(config)

  const handleSalvarConfig = () => {
    setConfig(configTemp)
  }

  const handleTogglePiloto = (ativo: boolean) => {
    ativarPilotoAutomatico(ativo)
    setConfigTemp(prev => ({ ...prev, ativo }))
  }

  const executarAnalise = async () => {
    await analisarCampanhas(campanhas, criativos)
  }

  const getAcaoIcon = (tipo: string) => {
    switch (tipo) {
      case 'PAUSAR_CAMPANHA':
        return <Pause className="h-4 w-4 text-destructive" />
      case 'AUMENTAR_ORCAMENTO':
        return <TrendingUp className="h-4 w-4 text-success" />
      case 'DIMINUIR_ORCAMENTO':
        return <TrendingDown className="h-4 w-4 text-warning" />
      case 'OTIMIZAR_TARGETING':
        return <Target className="h-4 w-4 text-primary" />
      case 'TROCAR_CRIATIVO':
        return <Zap className="h-4 w-4 text-accent" />
      default:
        return <Settings className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getAcaoColor = (tipo: string) => {
    switch (tipo) {
      case 'PAUSAR_CAMPANHA':
        return 'border-l-destructive bg-destructive/5'
      case 'AUMENTAR_ORCAMENTO':
        return 'border-l-success bg-success/5'
      case 'DIMINUIR_ORCAMENTO':
        return 'border-l-warning bg-warning/5'
      case 'OTIMIZAR_TARGETING':
        return 'border-l-primary bg-primary/5'
      case 'TROCAR_CRIATIVO':
        return 'border-l-accent bg-accent/5'
      default:
        return 'border-l-muted bg-muted/5'
    }
  }

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'CRITICA':
        return 'bg-destructive text-destructive-foreground'
      case 'ALTA':
        return 'bg-warning text-warning-foreground'
      case 'MEDIA':
        return 'bg-primary text-primary-foreground'
      case 'BAIXA':
        return 'bg-secondary text-secondary-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com controle principal */}
      <Card className={`gaming-card border-2 ${config.ativo ? 'border-success bg-success/5' : 'border-muted'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${config.ativo ? 'bg-success/20' : 'bg-muted/20'}`}>
                <Bot className={`h-8 w-8 ${config.ativo ? 'text-success' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Piloto Automático IA
                  {config.ativo ? (
                    <Badge className="bg-success text-success-foreground">
                      <Activity className="h-3 w-3 mr-1" />
                      ATIVO
                    </Badge>
                  ) : (
                    <Badge variant="outline">INATIVO</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {config.ativo 
                    ? 'Sistema otimizando suas campanhas automaticamente'
                    : 'Ative para receber otimizações automáticas baseadas em IA'
                  }
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {ultimaAnalise && (
                <div className="text-right text-xs text-muted-foreground">
                  <p>Última análise:</p>
                  <p>{new Date(ultimaAnalise).toLocaleString('pt-BR')}</p>
                </div>
              )}
              <Switch
                checked={config.ativo}
                onCheckedChange={handleTogglePiloto}
                className="data-[state=checked]:bg-success"
              />
            </div>
          </div>
        </CardHeader>

        {config.ativo && (
          <CardContent className="pt-0">
            <Alert className="border-success/50 bg-success/10">
              <Brain className="h-4 w-4" />
              <AlertDescription className="text-success">
                🤖 <strong>Modo Ativo:</strong> O sistema está analisando suas campanhas a cada {config.frequenciaAnalise} minutos e 
                aplicando otimizações automáticas baseadas nas configurações definidas.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visao-geral" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="acoes" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Ações ({acoes.length})
          </TabsTrigger>
          <TabsTrigger value="sugestoes" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Sugestões ({sugestoes.length})
          </TabsTrigger>
          <TabsTrigger value="configuracao" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="gaming-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Ações Executadas
                  <CheckCircle className="h-4 w-4 text-success" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{acoes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {acoes.filter(a => a.sucesso).length} bem-sucedidas
                </p>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Sugestões Pendentes
                  <Lightbulb className="h-4 w-4 text-accent" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sugestoes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {sugestoes.filter(s => s.prioridade === 'ALTA' || s.prioridade === 'CRITICA').length} alta prioridade
                </p>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Campanhas Monitoradas
                  <Target className="h-4 w-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campanhas.filter(c => c.status === 'ACTIVE').length}</div>
                <p className="text-xs text-muted-foreground">
                  de {campanhas.length} total
                </p>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Próxima Análise
                  <Clock className="h-4 w-4 text-warning" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-mono">
                  {config.ativo ? `${config.frequenciaAnalise}min` : 'Inativo'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Frequência de análise
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-center">
            <Button 
              onClick={executarAnalise} 
              disabled={isAnalyzing}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analisando Campanhas...
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5 mr-2" />
                  Executar Análise Manual
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="acoes" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Ações Automatizadas</h3>
              <p className="text-sm text-muted-foreground">
                Histórico das ações executadas pelo piloto automático
              </p>
            </div>
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-3">
              {acoes.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma ação executada</h3>
                  <p className="text-muted-foreground">
                    As ações aparecerão aqui quando o piloto automático estiver ativo
                  </p>
                </div>
              ) : (
                acoes.map((acao) => (
                  <AcaoCard 
                    key={acao.id} 
                    acao={acao} 
                    getAcaoIcon={getAcaoIcon}
                    getAcaoColor={getAcaoColor}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sugestoes" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Sugestões de Otimização</h3>
              <p className="text-sm text-muted-foreground">
                Recomendações baseadas em análise de IA
              </p>
            </div>
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-3">
              {sugestoes.length === 0 ? (
                <div className="text-center py-12">
                  <Lightbulb className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma sugestão pendente</h3>
                  <p className="text-muted-foreground">
                    Execute uma análise para receber novas recomendações
                  </p>
                </div>
              ) : (
                sugestoes.map((sugestao) => (
                  <SugestaoCard 
                    key={sugestao.id} 
                    sugestao={sugestao} 
                    onAplicar={aplicarSugestao}
                    onRejeitar={rejeitarSugestao}
                    getPrioridadeColor={getPrioridadeColor}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="configuracao" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle>Ações Automáticas</CardTitle>
                <CardDescription>
                  Configure quais otimizações o piloto pode executar automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Otimizar Orçamento</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajustar orçamentos baseado na performance
                    </p>
                  </div>
                  <Switch
                    checked={configTemp.configuracoes.otimizarOrcamento}
                    onCheckedChange={(checked) => 
                      setConfigTemp(prev => ({
                        ...prev,
                        configuracoes: { ...prev.configuracoes, otimizarOrcamento: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Pausar Campanhas com ROAS Baixo</Label>
                    <p className="text-xs text-muted-foreground">
                      Pausar automaticamente campanhas com baixo retorno
                    </p>
                  </div>
                  <Switch
                    checked={configTemp.configuracoes.pausarCampanhasBaixoRoas}
                    onCheckedChange={(checked) => 
                      setConfigTemp(prev => ({
                        ...prev,
                        configuracoes: { ...prev.configuracoes, pausarCampanhasBaixoRoas: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Aumentar Orçamento Alto ROAS</Label>
                    <p className="text-xs text-muted-foreground">
                      Investir mais em campanhas performantes
                    </p>
                  </div>
                  <Switch
                    checked={configTemp.configuracoes.aumentarOrcamentoAltoRoas}
                    onCheckedChange={(checked) => 
                      setConfigTemp(prev => ({
                        ...prev,
                        configuracoes: { ...prev.configuracoes, aumentarOrcamentoAltoRoas: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Otimizar Targeting</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajustar audiências e segmentação
                    </p>
                  </div>
                  <Switch
                    checked={configTemp.configuracoes.otimizarTargeting}
                    onCheckedChange={(checked) => 
                      setConfigTemp(prev => ({
                        ...prev,
                        configuracoes: { ...prev.configuracoes, otimizarTargeting: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Trocar Criativos</Label>
                    <p className="text-xs text-muted-foreground">
                      Pausar criativos com baixa performance
                    </p>
                  </div>
                  <Switch
                    checked={configTemp.configuracoes.trocarCriativos}
                    onCheckedChange={(checked) => 
                      setConfigTemp(prev => ({
                        ...prev,
                        configuracoes: { ...prev.configuracoes, trocarCriativos: checked }
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardHeader>
                <CardTitle>Limites e Parâmetros</CardTitle>
                <CardDescription>
                  Defina os thresholds para as otimizações automáticas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="roas-min">ROAS Mínimo</Label>
                    <Input
                      id="roas-min"
                      type="number"
                      step="0.1"
                      value={configTemp.limites.roasMinimo}
                      onChange={(e) => 
                        setConfigTemp(prev => ({
                          ...prev,
                          limites: { ...prev.limites, roasMinimo: parseFloat(e.target.value) || 0 }
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="roas-otimo">ROAS Ótimo</Label>
                    <Input
                      id="roas-otimo"
                      type="number"
                      step="0.1"
                      value={configTemp.limites.roasOtimo}
                      onChange={(e) => 
                        setConfigTemp(prev => ({
                          ...prev,
                          limites: { ...prev.limites, roasOtimo: parseFloat(e.target.value) || 0 }
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="ctr-min">CTR Mínimo (%)</Label>
                    <Input
                      id="ctr-min"
                      type="number"
                      step="0.1"
                      value={configTemp.limites.ctrMinimo}
                      onChange={(e) => 
                        setConfigTemp(prev => ({
                          ...prev,
                          limites: { ...prev.limites, ctrMinimo: parseFloat(e.target.value) || 0 }
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="gasto-max">Gasto Máximo/Dia (R$)</Label>
                    <Input
                      id="gasto-max"
                      type="number"
                      value={configTemp.limites.gastoMaximoDiario}
                      onChange={(e) => 
                        setConfigTemp(prev => ({
                          ...prev,
                          limites: { ...prev.limites, gastoMaximoDiario: parseInt(e.target.value) || 0 }
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="frequencia">Frequência de Análise (minutos)</Label>
                  <Input
                    id="frequencia"
                    type="number"
                    min="15"
                    max="1440"
                    value={configTemp.frequenciaAnalise}
                    onChange={(e) => 
                      setConfigTemp(prev => ({
                        ...prev,
                        frequenciaAnalise: parseInt(e.target.value) || 60
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mínimo: 15 minutos, Máximo: 24 horas (1440 min)
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificar sobre Ações</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber notificações quando ações forem executadas
                    </p>
                  </div>
                  <Switch
                    checked={configTemp.notificarAcoes}
                    onCheckedChange={(checked) => 
                      setConfigTemp(prev => ({ ...prev, notificarAcoes: checked }))
                    }
                  />
                </div>

                <Button onClick={handleSalvarConfig} className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AcaoCard({ acao, getAcaoIcon, getAcaoColor }: {
  acao: AcaoAutomatica
  getAcaoIcon: (tipo: string) => React.ReactNode
  getAcaoColor: (tipo: string) => string
}) {
  return (
    <Card className={`border-l-4 ${getAcaoColor(acao.tipo)}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-2">
              {getAcaoIcon(acao.tipo)}
              <div>
                <h3 className="font-medium text-sm">{acao.campanhaNome}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(acao.executadoEm).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            <p className="text-sm">{acao.descricao}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {acao.sucesso ? (
              <Badge className="bg-success text-success-foreground text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sucesso
              </Badge>
            ) : (
              <Badge className="bg-destructive text-destructive-foreground text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Erro
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SugestaoCard({ 
  sugestao, 
  onAplicar, 
  onRejeitar, 
  getPrioridadeColor 
}: {
  sugestao: SugestaoOtimizacao
  onAplicar: (id: string) => Promise<boolean>
  onRejeitar: (id: string) => void
  getPrioridadeColor: (prioridade: string) => string
}) {
  const [isApplying, setIsApplying] = useState(false)

  const handleAplicar = async () => {
    setIsApplying(true)
    await onAplicar(sugestao.id)
    setIsApplying(false)
  }

  return (
    <Card className="border-l-4 border-l-accent/20 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-4 w-4 text-accent" />
                <h3 className="font-medium text-sm">{sugestao.titulo}</h3>
                <Badge className={`text-xs ${getPrioridadeColor(sugestao.prioridade)}`}>
                  {sugestao.prioridade}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {sugestao.campanhaNome} • {new Date(sugestao.criadoEm).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <p className="text-sm">{sugestao.descricao}</p>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-primary">Impacto: {sugestao.impactoEstimado}</span>
          </div>

          <div className="bg-muted/20 p-2 rounded text-xs">
            <strong>Ação recomendada:</strong> {sugestao.acaoRecomendada}
          </div>

          <div className="flex items-center justify-end space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onRejeitar(sugestao.id)}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              Rejeitar
            </Button>
            <Button 
              size="sm"
              onClick={handleAplicar}
              disabled={isApplying}
              className="bg-accent text-accent-foreground"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Aplicar
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}