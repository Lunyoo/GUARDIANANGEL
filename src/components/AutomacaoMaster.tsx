/**
 * Componente de Automação Master
 * Sistema completo de automação com IA integrado com todas as APIs
 */

import { useState, useEffect } from 'react'
import { useAutomacaoMaster } from '@/hooks/useAutomacaoMaster'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Zap, 
  Bot, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  TrendingUp,
  Target,
  Sparkles,
  Brain,
  Cpu,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Loader2,
  Globe,
  ShoppingCart,
  Palette,
  FileText,
  Eye,
  Rocket,
  Lightbulb,
  Award,
  Trash2,
  Download,
  ExternalLink,
  Wand2,
  Search,
  Database,
  Image,
  Package,
  Gem
} from 'lucide-react'
import type { MetricasCampanha, Criativo } from '@/types'
import { formatCurrency } from '@/utils/currencyDetector'
import ProdutosKiwify from '@/components/ProdutosKiwify'

interface AutomacaoMasterProps {
  campanhas: MetricasCampanha[]
  criativos: Criativo[]
}

export default function AutomacaoMaster({ campanhas, criativos }: AutomacaoMasterProps) {
  const { usuarioAtual } = useAuth()
  const {
    isRunning,
    currentResult,
    progress,
    currentStep,
    automationHistory,
    automationConfig,
    configurarAutomacao,
    executarAutomacaoCompleta,
    executarScraping,
    gerarCriativos,
    criarProdutoAutomatico,
    analisarPerformance,
    limparHistorico,
    podeExecutarAutomacao
  } = useAutomacaoMaster()

  const [configuracao, setConfiguracao] = useState({
    niche_preference: automationConfig.niche_preference || 'white',
    budget_range: {
      min: automationConfig.budget_range?.min || 100,
      max: automationConfig.budget_range?.max || 1000
    },
    target_audience: automationConfig.target_audience || 'Adultos interessados em desenvolvimento',
    automation_level: automationConfig.automation_level || 'moderate'
  })

  const [activeTab, setActiveTab] = useState('overview')
  const performance = analisarPerformance()
  const { pode, motivo } = podeExecutarAutomacao()

  const salvarConfiguracao = () => {
    configurarAutomacao(configuracao)
  }

  const iniciarAutomacaoCompleta = async () => {
    salvarConfiguracao()
    await executarAutomacaoCompleta()
  }

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary via-accent to-primary rounded-xl shadow-lg">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Automação Master
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                  <Gem className="h-3 w-3 mr-1" />
                  Sistema Completo
                </Badge>
                <Badge variant="outline" className="text-xs bg-accent/10 text-accent">
                  <Brain className="h-3 w-3 mr-1" />
                  IA Avançada
                </Badge>
              </div>
            </div>
          </h2>
          <p className="text-muted-foreground mt-2">
            Automatização completa: Scraping → ML → Criação de Produtos → Geração de Criativos → Campanhas
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <div className="font-semibold">{performance.total_automations} execuções</div>
            <div className="text-muted-foreground">{performance.success_rate.toFixed(1)}% sucesso</div>
          </div>
          
          {!pode && (
            <Alert className="w-64">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {motivo}
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            onClick={iniciarAutomacaoCompleta}
            disabled={isRunning || !pode}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 px-6 py-3"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5 mr-2" />
                Executar Automação Completa
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status de Execução */}
      {isRunning && (
        <Card className="gaming-card border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              Automação em Execução
            </CardTitle>
            <CardDescription>{currentStep}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso Geral</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{progress > 12.5 ? '✓' : '○'}</div>
                <div className="text-xs text-muted-foreground">Scraping</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{progress > 37.5 ? '✓' : '○'}</div>
                <div className="text-xs text-muted-foreground">Análise ML</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{progress > 62.5 ? '✓' : '○'}</div>
                <div className="text-xs text-muted-foreground">Criativos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{progress > 87.5 ? '✓' : '○'}</div>
                <div className="text-xs text-muted-foreground">Produtos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado da Última Execução */}
      {currentResult && !isRunning && (
        <Card className={`gaming-card border-l-4 ${currentResult.success ? 'border-l-success' : 'border-l-destructive'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentResult.success ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              Resultado da Automação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-semibold text-primary">
                  {currentResult.steps_completed}/{currentResult.total_steps}
                </div>
                <div className="text-muted-foreground">Etapas Concluídas</div>
              </div>
              <div>
                <div className="font-semibold text-accent">
                  {currentResult.results.scraped_offers?.length || 0}
                </div>
                <div className="text-muted-foreground">Ofertas Coletadas</div>
              </div>
              <div>
                <div className="font-semibold text-success">
                  {currentResult.results.generated_creatives?.length || 0}
                </div>
                <div className="text-muted-foreground">Criativos Gerados</div>
              </div>
              <div>
                <div className="font-semibold text-warning">
                  {currentResult.results.generated_product ? 1 : 0}
                </div>
                <div className="text-muted-foreground">Produtos Criados</div>
              </div>
            </div>

            {currentResult.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erros encontrados:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {currentResult.errors.map((erro, i) => (
                      <li key={i} className="text-xs">{erro}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {currentResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recomendações:</h4>
                <ul className="space-y-1">
                  {currentResult.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Lightbulb className="h-3 w-3 mt-0.5 text-accent" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 bg-card/50">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="scraping" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Scraping</span>
          </TabsTrigger>
          <TabsTrigger value="criativos" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Criativos</span>
          </TabsTrigger>
          <TabsTrigger value="produtos" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="gaming-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Automações</p>
                    <p className="text-2xl font-bold text-primary">{performance.total_automations}</p>
                  </div>
                  <Bot className="h-8 w-8 text-primary opacity-70" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="gaming-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                    <p className="text-2xl font-bold text-success">{performance.success_rate.toFixed(1)}%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-success opacity-70" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="gaming-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Criativos/Rodada</p>
                    <p className="text-2xl font-bold text-accent">{performance.avg_creatives_generated}</p>
                  </div>
                  <Sparkles className="h-8 w-8 text-accent opacity-70" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="gaming-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completude Média</p>
                    <p className="text-2xl font-bold text-warning">{performance.avg_completion_rate}%</p>
                  </div>
                  <Target className="h-8 w-8 text-warning opacity-70" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status das APIs */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Status das Integrações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="font-medium">Facebook API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={usuarioAtual?.configuracaoApi?.facebookToken ? "default" : "secondary"}>
                      Token: {usuarioAtual?.configuracaoApi?.facebookToken ? "OK" : "Pendente"}
                    </Badge>
                    <Badge variant={usuarioAtual?.configuracaoApi?.adAccountId ? "default" : "secondary"}>
                      Conta: {usuarioAtual?.configuracaoApi?.adAccountId ? "OK" : "Pendente"}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-accent" />
                    <span className="font-medium">Ideogram AI</span>
                  </div>
                  <Badge variant={usuarioAtual?.configuracaoApi?.ideogramToken ? "default" : "secondary"}>
                    {usuarioAtual?.configuracaoApi?.ideogramToken ? "Configurada" : "Pendente"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-success" />
                    <span className="font-medium">Kiwify</span>
                  </div>
                  <Badge variant={usuarioAtual?.configuracaoApi?.kiwifyToken ? "default" : "secondary"}>
                    {usuarioAtual?.configuracaoApi?.kiwifyToken ? "Configurada" : "Pendente"}
                  </Badge>
                </div>
              </div>
              
              {!pode && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Para executar a automação completa, configure:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      {!usuarioAtual?.configuracaoApi?.facebookToken && (
                        <li>• Token do Facebook Ads</li>
                      )}
                      {!usuarioAtual?.configuracaoApi?.adAccountId && (
                        <li>• ID da Conta de Anúncios do Facebook</li>
                      )}
                      {!usuarioAtual?.configuracaoApi?.ideogramToken && (
                        <li>• Token do Ideogram AI</li>
                      )}
                      {!usuarioAtual?.configuracaoApi?.kiwifyToken && (
                        <li>• OAuth do Kiwify</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuração */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nicho Preferencial</Label>
                  <Select 
                    value={configuracao.niche_preference} 
                    onValueChange={(value: any) => setConfiguracao({...configuracao, niche_preference: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White Hat (Seguro)</SelectItem>
                      <SelectItem value="grey">Grey Hat (Moderado)</SelectItem>
                      <SelectItem value="black">Black Hat (Agressivo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Orçamento por Campanha</Label>
                  <div className="px-3">
                    <Slider
                      value={[configuracao.budget_range.max]}
                      onValueChange={([value]) => setConfiguracao({
                        ...configuracao, 
                        budget_range: {...configuracao.budget_range, max: value}
                      })}
                      max={5000}
                      min={100}
                      step={50}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>R$ 100</span>
                      <span className="font-semibold">{formatCurrency(configuracao.budget_range.max)}</span>
                      <span>R$ 5.000</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Público-Alvo</Label>
                  <Textarea
                    placeholder="Descreva seu público ideal..."
                    value={configuracao.target_audience}
                    onChange={(e) => setConfiguracao({...configuracao, target_audience: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Configurações de IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nível de Automação</Label>
                  <Select 
                    value={configuracao.automation_level} 
                    onValueChange={(value: any) => setConfiguracao({...configuracao, automation_level: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservador - Aprovação Manual</SelectItem>
                      <SelectItem value="moderate">Moderado - Supervisão Mínima</SelectItem>
                      <SelectItem value="aggressive">Agressivo - Totalmente Automático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/20 rounded-lg space-y-2">
                    <h4 className="font-medium">Fluxo de Automação Ativo:</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-success" />
                        Scraping de ofertas de sucesso
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-success" />
                        Análise com Machine Learning
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-success" />
                        Criação automática de produtos
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-success" />
                        Geração de criativos IA
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-success" />
                        Funis gamificados
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button 
            onClick={salvarConfiguracao}
            className="w-full bg-gradient-to-r from-primary to-accent"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Salvar Configuração
          </Button>
        </TabsContent>

        {/* Scraping */}
        <TabsContent value="scraping">
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Sistema de Scraping Inteligente
              </CardTitle>
              <CardDescription>
                Coleta automatizada de ofertas de sucesso da Biblioteca de Anúncios do Facebook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button 
                  onClick={executarScraping} 
                  disabled={isRunning}
                  variant="outline"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Executar Scraping
                </Button>
              </div>
              
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  O sistema coleta automaticamente anúncios de alta performance, analisa engajamento, 
                  identifica padrões de sucesso e alimenta o Machine Learning para otimizar futuras campanhas.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Criativos */}
        <TabsContent value="criativos">
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Geração de Criativos com IA
              </CardTitle>
              <CardDescription>
                Criação automática de criativos otimizados usando Ideogram AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button 
                  onClick={() => gerarCriativos()} 
                  disabled={isRunning || !usuarioAtual?.configuracaoApi?.ideogramToken}
                  variant="outline"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Gerar Criativos
                </Button>
              </div>
              
              {!usuarioAtual?.configuracaoApi?.ideogramToken && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Configure seu token do Ideogram AI para usar esta funcionalidade.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Produtos */}
        <TabsContent value="produtos">
          <div className="space-y-6">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Criação Automática de Produtos
                </CardTitle>
                <CardDescription>
                  Sistema integrado para criação de produtos e funis no Kiwify
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button 
                    onClick={() => criarProdutoAutomatico({})} 
                    disabled={isRunning || !usuarioAtual?.configuracaoApi?.kiwifyToken}
                    variant="outline"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Criar Produto
                  </Button>
                </div>
                
                {!usuarioAtual?.configuracaoApi?.kiwifyToken && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Configure sua API do Kiwify para usar esta funcionalidade.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Lista de Produtos Criados */}
            <ProdutosKiwify />
          </div>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico">
          <Card className="gaming-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Histórico de Automações
                </CardTitle>
                <Button 
                  onClick={limparHistorico}
                  variant="outline"
                  size="sm"
                  disabled={automationHistory.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {automationHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma execução ainda</p>
                    <p className="text-sm">Execute uma automação para ver o histórico aqui</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {automationHistory.map((result, index) => (
                      <div key={index} className="p-4 bg-muted/20 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="font-medium">
                              Execução #{automationHistory.length - index}
                            </span>
                          </div>
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.steps_completed}/{result.total_steps} etapas
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>Ofertas: {result.results.scraped_offers?.length || 0}</div>
                          <div>Criativos: {result.results.generated_creatives?.length || 0}</div>
                          <div>Produtos: {result.results.generated_product ? 1 : 0}</div>
                        </div>
                        
                        {result.errors.length > 0 && (
                          <div className="text-xs text-destructive">
                            Erros: {result.errors.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}