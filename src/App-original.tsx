import { useState, useEffect } from "react"
import { useAuth } from '@/hooks/useAuth'
import { useRealTime } from '@/hooks/useRealTime'
import { useFacebookApi } from '@/hooks/useFacebookApi'
import { useNotifications } from '@/hooks/useNotifications'
import { formatCurrency, formatPercentage } from '@/utils/currencyDetector'
import LoginScreen from '@/components/LoginScreen'
import ConfiguracaoApi from '@/components/ConfiguracaoApi'
import ConfiguracaoApiCompleta from '@/components/ConfiguracaoApiCompleta'
import PlayerStats from '@/components/PlayerStats'
import MetricCardGaming from '@/components/MetricCardGaming'
import NotificationPanel from '@/components/NotificationPanel'
import AnaliseComparativaPanel from '@/components/AnaliseComparativa'
import RelatoriosPanel from '@/components/RelatoriosPanel'
import PilotoAutomatico from '@/components/PilotoAutomatico'
import ScrapingPanel from '@/components/ScrapingPanel'
import ScrapingUniversal from '@/components/ScrapingUniversal'
import MachineLearningPanel from '@/components/MachineLearningPanel'
import AutomacaoMaster from '@/components/AutomacaoMaster'
import AutomacaoCompletaReal from '@/components/AutomacaoCompletaReal'
import AutomacaoCompleta from '@/components/AutomacaoCompleta'
import GeradorCriativoIA from '@/components/GeradorCriativoIA'
import SidebarMenuItem from '@/components/SidebarMenuItem'
import CampanhasCriativosTab from '@/components/CampanhasCriativosTab'
import InsightsIATab from '@/components/InsightsIATab'
import ChatIAAvancada from '@/components/ChatIAAvancada'
import ConfiguracoesModal from '@/components/ConfiguracoesModal'
import RealTimeStatus from '@/components/RealTimeStatus'
import { CampanhaCard, CriativoCard } from '@/components/CardComponents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from 'sonner'
import { Toaster } from "@/components/ui/sonner"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  DollarSign, 
  BarChart3, 
  Eye, 
  MousePointer, 
  Zap,
  Crown,
  Settings,
  LogOut,
  Activity,
  Sparkles,
  Lightbulb,
  Shield,
  Sword,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Bell,
  BellDot,
  Bot,
  FileText,
  TrendingUp as TrendingUpIcon,
  Database,
  Globe,
  Brain,
  Cpu
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { MetricasCampanha, Criativo, InsightPreditivo } from '@/types'

export default function App() {
  console.log('🚀 App inicializando...')
  
  try {
    const {
      usuarioAtual,
      isAuthenticated,
      hasValidApi,
      hasIdeogramApi,
      hasKiwifyOAuth,
      logout,
      isLoading: authLoading
    } = useAuth()
    
    // Ensure hasKiwifyOAuth is properly defined for all uses
    const hasKiwifyOAuthSafe = Boolean(hasKiwifyOAuth)
    
    console.log('📊 Estado da auth:', {
      isAuthenticated,
      hasValidApi,
      hasKiwifyOAuth: hasKiwifyOAuthSafe,
      authLoading,
      usuarioAtual: usuarioAtual?.email
    })
    
    const { testarConexaoApi } = useFacebookApi()
    const { alertasNaoVistos } = useNotifications()
    
    // Hook de tempo real para gerenciar dados
    const {
      campanhas,
      criativos,
      insights,
      isLoadingData,
      erro,
      ultimaAtualizacao,
      isAutoUpdateEnabled,
      carregarDados,
      toggleAutoUpdate
    } = useRealTime()
    
    console.log('📈 Dados carregados:', {
      campanhas: campanhas?.length || 0,
      criativos: criativos?.length || 0,
      insights: insights?.length || 0,
      isLoadingData,
      erro: erro || 'nenhum'
    })
  
    const [showNotifications, setShowNotifications] = useState(false)
    const [showChatIA, setShowChatIA] = useState(false)
    const [showConfiguracoes, setShowConfiguracoes] = useState(false)
    const [activeTab, setActiveTab] = useState('dashboard')
  
    // Carregar dados quando a API estiver configurada - agora é feito pelo useRealTime hook
    // O hook já gerencia atualizações automáticas

    const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Principal'
      case 'campanhas': return 'Campanhas & Criativos'
      case 'insights': return 'Insights de IA'
      case 'gerador-ia': return 'Gerador de Criativos'
      case 'automacao': return 'Automação Completa NEXUS'
      case 'scraping-ml': return 'Intelligence Hub'
      case 'comparativa': return 'Análise Comparativa'
      case 'relatorios': return 'Relatórios'
      case 'piloto': return 'Piloto Automático'
      default: return 'Dashboard'
    }
    }

    const getActiveTabDescription = () => {
    switch (activeTab) {
      case 'dashboard': return 'Visão geral das suas métricas e performance'
      case 'campanhas': return 'Monitore campanhas e analise criativos em detalhes'
      case 'insights': return 'Recomendações inteligentes baseadas em IA'
      case 'gerador-ia': return 'Crie criativos profissionais usando inteligência artificial'
      case 'automacao': return 'Sistema completo: Investe → IA encontra ofertas → Cria produtos → Lança campanhas'
      case 'scraping-ml': return 'Análise universal de ofertas vencedoras com IA avançada'
      case 'comparativa': return 'Compare períodos e identifique tendências'
      case 'relatorios': return 'Gere relatórios personalizados em PDF'
      case 'piloto': return 'IA autônoma para otimização de campanhas'
      default: return ''
    }
  }

    // Estados de loading
    if (authLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-lg">Carregando sistema...</span>
          </div>
        </div>
      )
    }

    // Tela de login
    if (!isAuthenticated) {
      return <LoginScreen />
    }

    // Tela de configuração de API
    if (!hasValidApi) {
      return <ConfiguracaoApiCompleta />
    }

    // Calcular métricas agregadas - garantir que campanhas seja sempre um array
    const campanhasSafe = Array.isArray(campanhas) ? campanhas : []
    const metricas = calcularMetricas(campanhasSafe)
    const dadosPerformance = gerarDadosGrafico(campanhasSafe)
  
    return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Nexus Gaming
              </h1>
              <p className="text-xs text-muted-foreground">
                Marketing IA
              </p>
            </div>
          </div>
          
          {ultimaAtualizacao && ultimaAtualizacao instanceof Date && !isNaN(ultimaAtualizacao.getTime()) && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
              </Badge>
              {isAutoUpdateEnabled && (
                <Badge variant="outline" className="text-xs bg-primary/10 border-primary/50">
                  🔄 Auto
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <SidebarMenuItem 
            icon={BarChart3} 
            label="Dashboard" 
            value="dashboard" 
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          
          <SidebarMenuItem 
            icon={Target} 
            label="Campanhas & Criativos" 
            value="campanhas" 
            active={activeTab === 'campanhas'}
            onClick={() => setActiveTab('campanhas')}
            badge={(Array.isArray(campanhas) ? campanhas.length : 0) + (Array.isArray(criativos) ? criativos.length : 0) > 0 ? (Array.isArray(campanhas) ? campanhas.length : 0) + (Array.isArray(criativos) ? criativos.length : 0) : undefined}
          />
          
          <SidebarMenuItem 
            icon={Lightbulb} 
            label="Insights de IA" 
            value="insights" 
            active={activeTab === 'insights'}
            onClick={() => setActiveTab('insights')}
            badge={Array.isArray(insights) && insights.length > 0 ? insights.length : undefined}
          />
          
          <SidebarMenuItem 
            icon={Cpu} 
            label="Gerador de Criativos" 
            value="gerador-ia" 
            active={activeTab === 'gerador-ia'}
            onClick={() => setActiveTab('gerador-ia')}
            isNew
          />
          
          <SidebarMenuItem 
            icon={Zap} 
            label="Automação Completa" 
            value="automacao" 
            active={activeTab === 'automacao'}
            onClick={() => setActiveTab('automacao')}
            isAI
          />
          
          <SidebarMenuItem 
            icon={Globe} 
            label="Intelligence Hub" 
            value="scraping-ml" 
            active={activeTab === 'scraping-ml'}
            onClick={() => setActiveTab('scraping-ml')}
          />
          
          <SidebarMenuItem 
            icon={TrendingUpIcon} 
            label="Análise Comparativa" 
            value="comparativa" 
            active={activeTab === 'comparativa'}
            onClick={() => setActiveTab('comparativa')}
          />
          
          <SidebarMenuItem 
            icon={FileText} 
            label="Relatórios" 
            value="relatorios" 
            active={activeTab === 'relatorios'}
            onClick={() => setActiveTab('relatorios')}
          />
          
          <SidebarMenuItem 
            icon={Bot} 
            label="Piloto Automático" 
            value="piloto" 
            active={activeTab === 'piloto'}
            onClick={() => setActiveTab('piloto')}
          />
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-border/50 mt-auto">
          {usuarioAtual && <PlayerStats 
            usuario={usuarioAtual}
            metricas={{
              campanhasAtivas: Array.isArray(campanhas) ? campanhas.filter(c => c.status === 'ACTIVE').length : 0,
              roasTotal: metricas.roasMedia,
              gastoTotal: metricas.gastoTotal,
              conversoes: metricas.conversoesTotal
            }}
            compact
          />}
          
          <div className="flex items-center justify-between mt-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowNotifications(true)}
              className="relative"
            >
              {(alertasNaoVistos || []).length > 0 ? (
                <>
                  <BellDot className="h-4 w-4" />
                  {(alertasNaoVistos || []).length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] bg-destructive">
                      {(alertasNaoVistos || []).length}
                    </Badge>
                  )}
                </>
              ) : (
                <Bell className="h-4 w-4" />
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowConfiguracoes(true)}
              className="hover:text-primary"
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden">
        {/* Header */}
        <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{getActiveTabTitle()}</h2>
                <p className="text-sm text-muted-foreground">
                  {getActiveTabDescription()}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {/* Status da Automação */}
                {hasKiwifyOAuthSafe && Boolean(hasIdeogramApi) && (
                  <Badge 
                    variant="outline" 
                    className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/50 text-primary animate-pulse text-xs"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    IA Ativa
                  </Badge>
                )}
                
                {/* Status Atualização Automática */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAutoUpdate}
                  className={`text-xs ${isAutoUpdateEnabled ? 'text-success' : 'text-warning'}`}
                >
                  {isAutoUpdateEnabled ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-pulse" />
                      Tempo Real
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4 mr-2" />
                      Manual
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowChatIA(true)}
                  className="relative bg-gradient-to-r from-primary/10 to-accent/10 border-primary/50 hover:border-primary"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Chat NEXUS
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] bg-accent animate-pulse">
                    IA
                  </Badge>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={carregarDados}
                  disabled={isLoadingData}
                >
                  {isLoadingData ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4 mr-2" />
                  )}
                  {isLoadingData ? 'Carregando...' : 'Atualizar'}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    try {
                      const accountInfo = await testarConexaoApi()
                      toast.success(`✅ Conexão OK! Moeda: ${accountInfo.currency}`, {
                        description: `Conta: ${accountInfo.name}`
                      })
                    } catch (error) {
                      toast.error(`❌ Erro na API: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
                    }
                  }}
                  disabled={isLoadingData}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Testar API
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-8">
          {erro && (
            <Alert className="mb-6 border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-destructive">
                {erro}
              </AlertDescription>
            </Alert>
          )}

          {/* Content based on active tab */}
          {activeTab === 'dashboard' && (
            <DashboardContent 
              campanhas={Array.isArray(campanhas) ? campanhas : []}
              criativos={Array.isArray(criativos) ? criativos : []}
              insights={Array.isArray(insights) ? insights : []}
              metricas={metricas}
              dadosPerformance={dadosPerformance}
              isLoadingData={isLoadingData}
              isAutoUpdateEnabled={isAutoUpdateEnabled}
              ultimaAtualizacao={ultimaAtualizacao}
              toggleAutoUpdate={toggleAutoUpdate}
              carregarDados={carregarDados}
              usuarioAtual={usuarioAtual}
              hasValidApi={hasValidApi}
              hasKiwifyOAuth={hasKiwifyOAuthSafe}
              hasKiwifyOAuthSafe={hasKiwifyOAuthSafe}
              erro={erro}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'campanhas' && (
            <CampanhasCriativosTab 
              campanhas={Array.isArray(campanhas) ? campanhas : []}
              criativos={Array.isArray(criativos) ? criativos : []}
              insights={Array.isArray(insights) ? insights : []}
              isLoadingData={isLoadingData}
              carregarDados={carregarDados}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsIATab 
              insights={Array.isArray(insights) ? insights : []}
              isLoadingData={isLoadingData}
              carregarDados={carregarDados}
            />
          )}

          {activeTab === 'gerador-ia' && (
            <GeradorCriativoIA 
              campanhas={Array.isArray(campanhas) ? campanhas : []} 
              criativos={Array.isArray(criativos) ? criativos : []} 
            />
          )}

          {activeTab === 'automacao' && (
            <AutomacaoCompleta />
          )}

          {activeTab === 'scraping-ml' && (
            <div className="space-y-6">
              <Tabs defaultValue="scraping" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-card/50">
                  <TabsTrigger value="scraping">Scraping Universal</TabsTrigger>
                  <TabsTrigger value="ml">Machine Learning</TabsTrigger>
                </TabsList>
                <TabsContent value="scraping">
                  <ScrapingUniversal />
                </TabsContent>
                <TabsContent value="ml">
                  <MachineLearningPanel campanhas={campanhas || []} criativos={criativos || []} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === 'comparativa' && (
            <AnaliseComparativaPanel 
              campanhas={Array.isArray(campanhas) ? campanhas : []} 
              criativos={Array.isArray(criativos) ? criativos : []} 
            />
          )}

          {activeTab === 'relatorios' && usuarioAtual && (
            <RelatoriosPanel 
              usuario={usuarioAtual} 
              campanhas={Array.isArray(campanhas) ? campanhas : []} 
              criativos={Array.isArray(criativos) ? criativos : []} 
            />
          )}

          {activeTab === 'piloto' && (
            <PilotoAutomatico 
              campanhas={Array.isArray(campanhas) ? campanhas : []} 
              criativos={Array.isArray(criativos) ? criativos : []} 
            />
          )}
        </div>
      </div>
      
      {/* Chat IA Avançada */}
      <ChatIAAvancada
        isOpen={showChatIA}
        onClose={() => setShowChatIA(false)}
        campanhas={Array.isArray(campanhas) ? campanhas : []}
        criativos={Array.isArray(criativos) ? criativos : []}
        onSystemUpdate={(action, data) => {
          console.log('System update from NEXUS:', action, data)
          if (action === 'chat-command') {
            toast.success('NEXUS executou comando', {
              description: data.comando
            })
          }
        }}
      />
      
      {/* Modal de Configurações */}
      <ConfiguracoesModal
        isOpen={showConfiguracoes}
        onClose={() => setShowConfiguracoes(false)}
        usuario={usuarioAtual}
      />
      
      {/* Painel de Notificações */}
      <NotificationPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
      
      {/* Toast Container */}
      <Toaster richColors position="bottom-right" />
    </div>
  )
  } catch (error) {
    console.error('Error in App component:', error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="text-xl font-bold">Erro no Sistema</h2>
          <p className="text-muted-foreground max-w-md">
            Ocorreu um erro inesperado. Recarregue a página para tentar novamente.
          </p>
          <Button onClick={() => window.location.reload()}>
            Recarregar Página
          </Button>
        </div>
      </div>
    )
  }
}

// Dashboard Content Component
function DashboardContent({
  campanhas,
  criativos,
  insights,
  metricas,
  dadosPerformance,
  isLoadingData,
  isAutoUpdateEnabled,
  ultimaAtualizacao,
  toggleAutoUpdate,
  carregarDados,
  usuarioAtual,
  hasValidApi,
  hasKiwifyOAuth,
  hasKiwifyOAuthSafe = false,
  erro,
  setActiveTab
}: any) {
  return (
    <div className="space-y-6">
      {/* Debug Info - Apenas para Admin */}
      {usuarioAtual?.isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Status em Tempo Real */}
          <div className="lg:col-span-2">
            <RealTimeStatus
              isAutoUpdateEnabled={isAutoUpdateEnabled}
              ultimaAtualizacao={ultimaAtualizacao}
              isLoadingData={isLoadingData}
              toggleAutoUpdate={toggleAutoUpdate}
              carregarDados={carregarDados}
              erro={erro}
            />
          </div>
          
          {/* Debug Info */}
          <Card className="gaming-card border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent" />
                Debug (Admin)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div>
                  <strong>Token FB:</strong> {usuarioAtual.configuracaoApi?.facebookToken ? '✅' : '❌'}
                </div>
                <div>
                  <strong>Conta:</strong> {usuarioAtual.configuracaoApi?.adAccountId || 'N/A'}
                </div>
                <div>
                  <strong>Kiwify OAuth:</strong> {hasKiwifyOAuthSafe ? '✅' : '❌'}
                </div>
                <div>
                  <strong>Ideogram:</strong> {usuarioAtual.configuracaoApi?.ideogramToken ? '✅' : '❌'}
                </div>
                <div className="mt-3 p-2 bg-muted/20 rounded text-xs">
                  <strong>Dados:</strong> {(Array.isArray(campanhas) ? campanhas.length : 0)} campanhas, {(Array.isArray(criativos) ? criativos.length : 0)} criativos
                </div>
                {Array.isArray(campanhas) && campanhas.length > 0 && (
                  <div className="p-2 bg-muted/20 rounded text-xs">
                    <div>Gasto Total: R$ {metricas.gastoTotal.toFixed(2)}</div>
                    <div>CTR Médio: {metricas.ctrMedia.toFixed(2)}%</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardGaming
          titulo="Impressões Totais"
          valor={metricas.impressoesTotal.toLocaleString('pt-BR')}
          tipo="impressoes"
          subtitulo="Últimos 30 dias"
          mudanca={{ percentual: 12.3, periodo: "semana passada" }}
          isLoading={isLoadingData}
        />
        <MetricCardGaming
          titulo="Taxa de Clique (CTR)"
          valor={formatPercentage(metricas.ctrMedia)}
          tipo="ctr"
          subtitulo="Acima da média do setor"
          mudanca={{ percentual: -2.1, periodo: "semana passada" }}
          isLoading={isLoadingData}
        />
        <MetricCardGaming
          titulo="Investimento Total"
          valor={formatCurrency(metricas.gastoTotal)}
          tipo="gasto"
          subtitulo="Orçamento mensal"
          mudanca={{ percentual: 8.7, periodo: "semana passada" }}
          isLoading={isLoadingData}
        />
        <MetricCardGaming
          titulo="ROAS Médio"
          valor={`${metricas.roasMedia.toFixed(1)}x`}
          tipo="roas"
          subtitulo="Retorno sobre investimento"
          mudanca={{ percentual: 15.2, periodo: "semana passada" }}
          isLoading={isLoadingData}
        />
      </div>

      {/* Gráfico de Performance */}
      <Card className="gaming-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance das Campanhas
          </CardTitle>
          <CardDescription>
            Métricas de performance das suas campanhas ativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dadosPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dadosPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="nome" 
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
                  dataKey="impressoes" 
                  stroke="var(--primary)" 
                  fill="var(--primary)" 
                  fillOpacity={0.3} 
                />
                <Area 
                  type="monotone" 
                  dataKey="conversoes" 
                  stroke="var(--accent)" 
                  fill="var(--accent)" 
                  fillOpacity={0.3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-muted-foreground">
              {isLoadingData ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando dados...
                </div>
              ) : (
                "Nenhum dado disponível"
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Campanhas */}
      <Card className="gaming-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-accent" />
                Campanhas de Elite
              </CardTitle>
              <CardDescription>
                Suas campanhas com melhor performance
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('campanhas')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Todas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(campanhas || [])
            .filter((c: any) => c.status === 'ACTIVE')
            .sort((a: any, b: any) => b.roas - a.roas)
            .slice(0, 3)
            .map((campanha: any, index: number) => (
              <CampanhaCard key={campanha.id} campanha={campanha} rank={index + 1} />
            ))}
          
          {(campanhas || []).filter((c: any) => c.status === 'ACTIVE').length === 0 && !isLoadingData && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma campanha ativa encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Funções auxiliares
function calcularMetricas(campanhas: MetricasCampanha[]) {
  if (campanhas.length === 0) {
    return {
      impressoesTotal: 0,
      cliquesTotal: 0,
      conversoesTotal: 0,
      gastoTotal: 0,
      ctrMedia: 0,
      roasMedia: 0
    }
  }

  const totais = campanhas.reduce((acc, campanha) => ({
    impressoes: acc.impressoes + campanha.impressoes,
    cliques: acc.cliques + campanha.cliques,
    conversoes: acc.conversoes + campanha.conversoes,
    gasto: acc.gasto + campanha.gasto,
    roas: acc.roas + campanha.roas
  }), { impressoes: 0, cliques: 0, conversoes: 0, gasto: 0, roas: 0 })

  return {
    impressoesTotal: totais.impressoes,
    cliquesTotal: totais.cliques,
    conversoesTotal: totais.conversoes,
    gastoTotal: totais.gasto,
    ctrMedia: totais.impressoes > 0 ? (totais.cliques / totais.impressoes) * 100 : 0,
    roasMedia: campanhas.length > 0 ? totais.roas / campanhas.length : 0
  }
}

function gerarDadosGrafico(campanhas: MetricasCampanha[]) {
  return campanhas
    .filter(c => c.status === 'ACTIVE')
    .slice(0, 10)
    .map(campanha => ({
      nome: campanha.nome.length > 15 ? 
            campanha.nome.substring(0, 15) + '...' : 
            campanha.nome,
      impressoes: campanha.impressoes,
      cliques: campanha.cliques,
      conversoes: campanha.conversoes,
      gasto: campanha.gasto
    }))
}