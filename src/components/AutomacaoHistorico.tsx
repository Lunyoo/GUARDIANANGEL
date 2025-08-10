import { useState, useEffect } from 'react'
import { useKV } from '../hooks/useKV'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from 'sonner'
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Eye,
  BarChart3,
  Download,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Square,
  Calendar,
  Filter,
  Search,
  ExternalLink,
  FileText,
  Image,
  Globe,
  Zap,
  Target,
  Users
} from 'lucide-react'

interface AutomacaoExecucao {
  id: string
  titulo: string
  dataInicio: string
  dataFim?: string
  status: 'executando' | 'concluida' | 'pausada' | 'erro' | 'cancelada'
  investimentoTotal: number
  receitaGerada: number
  roasAtual: number
  
  // Detalhes da configuração
  configuracao: {
    amount: number
    riskLevel: 'conservative' | 'moderate' | 'aggressive'
    preferredNiches: string[]
    maxCampaigns: number
  }
  
  // Oportunidade selecionada
  oportunidadeSelecionada: {
    titulo: string
    nicho: string
    plataforma: string
    confidenceScore: number
    estimatedRevenue: number
  }
  
  // Resultados criados
  resultados: {
    produtoCriado?: {
      nome: string
      tipo: string
      preco: number
      vendas: number
    }
    landingPage?: {
      url: string
      conversaoTaxa: number
      visitantes: number
    }
    campanhas?: Array<{
      id: string
      nome: string
      plataforma: string
      orcamento: number
      gasto: number
      impressoes: number
      cliques: number
      conversoes: number
      ctr: number
      cpa: number
    }>
    criativos?: Array<{
      id: string
      tipo: 'imagem' | 'video' | 'carousel'
      performance: number
      impressoes: number
      cliques: number
    }>
  }
  
  // Timeline de execução
  timeline: Array<{
    etapa: string
    descricao: string
    timestamp: string
    status: 'concluida' | 'erro'
    detalhes?: string
  }>
  
  // Métricas de performance
  metricas: {
    impressoes: number
    cliques: number
    conversoes: number
    vendas: number
    receita: number
    lucroLiquido: number
    roiRealizado: number
    tempoExecucao: number // em minutos
  }
}

// Dados de exemplo reais baseados em automações
const exemploExecucoes: AutomacaoExecucao[] = [
  {
    id: 'auto-001',
    titulo: 'Método dos 30 Dias para Reconquista - Relacionamentos',
    dataInicio: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias atrás
    dataFim: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
    status: 'concluida',
    investimentoTotal: 1500,
    receitaGerada: 4230,
    roasAtual: 2.82,
    configuracao: {
      amount: 1500,
      riskLevel: 'moderate',
      preferredNiches: ['Relacionamentos', 'Desenvolvimento Pessoal'],
      maxCampaigns: 3
    },
    oportunidadeSelecionada: {
      titulo: 'Método dos 30 Dias para Conquistar o Ex',
      nicho: 'Relacionamentos',
      plataforma: 'Facebook Ads',
      confidenceScore: 87,
      estimatedRevenue: 8500
    },
    resultados: {
      produtoCriado: {
        nome: 'Reconquista Magnética: O Método dos 30 Dias',
        tipo: 'ebook',
        preco: 97,
        vendas: 43
      },
      landingPage: {
        url: 'https://reconquista-magnetica.com',
        conversaoTaxa: 3.2,
        visitantes: 1340
      },
      campanhas: [
        {
          id: 'camp-001',
          nome: 'Reconquista - Interesse Relacionamentos',
          plataforma: 'Facebook',
          orcamento: 500,
          gasto: 487,
          impressoes: 23450,
          cliques: 745,
          conversoes: 24,
          ctr: 3.18,
          cpa: 20.29
        },
        {
          id: 'camp-002',
          nome: 'Reconquista - Lookalike',
          plataforma: 'Facebook',
          orcamento: 400,
          gasto: 392,
          impressoes: 18920,
          cliques: 567,
          conversoes: 19,
          ctr: 3.00,
          cpa: 20.63
        }
      ],
      criativos: [
        {
          id: 'creat-001',
          tipo: 'imagem',
          performance: 85,
          impressoes: 15670,
          cliques: 498
        },
        {
          id: 'creat-002',
          tipo: 'video',
          performance: 92,
          impressoes: 26700,
          cliques: 814
        }
      ]
    },
    timeline: [
      {
        etapa: 'Scraping Inteligente',
        descricao: 'Analisou 247 ofertas em 4 plataformas',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
        status: 'concluida',
        detalhes: 'Facebook Ads, TikTok, Google Trends, Marketplaces'
      },
      {
        etapa: 'Análise de IA',
        descricao: 'Selecionou top 3 oportunidades com ML',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000).toISOString(),
        status: 'concluida'
      },
      {
        etapa: 'Criação do Produto',
        descricao: 'Gerou ebook de 47 páginas com IA',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
        status: 'concluida',
        detalhes: 'PDF + 7 vídeos explicativos + templates'
      },
      {
        etapa: 'Landing Page',
        descricao: 'Construiu página de vendas gamificada',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 67 * 60 * 1000).toISOString(),
        status: 'concluida',
        detalhes: 'Design responsivo + sistema de pagamento Kiwify'
      },
      {
        etapa: 'Campanhas Facebook',
        descricao: 'Criou 3 campanhas com 12 criativos',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 85 * 60 * 1000).toISOString(),
        status: 'concluida'
      },
      {
        etapa: 'Lançamento',
        descricao: 'Ativou todas as campanhas e iniciou vendas',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
        status: 'concluida'
      }
    ],
    metricas: {
      impressoes: 42370,
      cliques: 1312,
      conversoes: 43,
      vendas: 43,
      receita: 4171,
      lucroLiquido: 2671,
      roiRealizado: 278,
      tempoExecucao: 90
    }
  },
  {
    id: 'auto-002',
    titulo: 'Protocolo Queima Gordura - Saúde & Fitness',
    dataInicio: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
    status: 'executando',
    investimentoTotal: 2000,
    receitaGerada: 1450,
    roasAtual: 0.73, // Ainda em início
    configuracao: {
      amount: 2000,
      riskLevel: 'aggressive',
      preferredNiches: ['Saúde & Fitness', 'Beleza'],
      maxCampaigns: 5
    },
    oportunidadeSelecionada: {
      titulo: 'Protocolo Queima Gordura: Perca 10kg em 21 Dias',
      nicho: 'Saúde & Fitness',
      plataforma: 'Facebook Ads',
      confidenceScore: 94,
      estimatedRevenue: 15800
    },
    resultados: {
      produtoCriado: {
        nome: 'Protocolo Queima Gordura: 21 Dias Para Transformar Seu Corpo',
        tipo: 'ebook',
        preco: 147,
        vendas: 9
      },
      landingPage: {
        url: 'https://protocolo-queima-gordura.com',
        conversaoTaxa: 2.8,
        visitantes: 520
      },
      campanhas: [
        {
          id: 'camp-003',
          nome: 'Queima Gordura - Mulheres 25-45',
          plataforma: 'Facebook',
          orcamento: 800,
          gasto: 340,
          impressoes: 8950,
          cliques: 267,
          conversoes: 6,
          ctr: 2.98,
          cpa: 56.67
        }
      ],
      criativos: [
        {
          id: 'creat-003',
          tipo: 'video',
          performance: 78,
          impressoes: 8950,
          cliques: 267
        }
      ]
    },
    timeline: [
      {
        etapa: 'Scraping Inteligente',
        descricao: 'Analisando ofertas de fitness e emagrecimento',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000).toISOString(),
        status: 'concluida'
      },
      {
        etapa: 'Criação do Produto',
        descricao: 'Gerando protocolo de emagrecimento',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 35 * 60 * 1000).toISOString(),
        status: 'concluida'
      },
      {
        etapa: 'Campanhas Ativas',
        descricao: '1 campanha rodando, otimizando performance',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        status: 'concluida'
      }
    ],
    metricas: {
      impressoes: 8950,
      cliques: 267,
      conversoes: 9,
      vendas: 9,
      receita: 1323,
      lucroLiquido: 983,
      roiRealizado: 73,
      tempoExecucao: 1440 // 24 horas
    }
  }
]

export default function AutomacaoHistorico() {
  const [execucoes, setExecucoes] = useKV<AutomacaoExecucao[]>('automacao-execucoes', exemploExecucoes)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [execucaoSelecionada, setExecucaoSelecionada] = useState<AutomacaoExecucao | null>(null)

  // Função para pausar/retomar execução
  const toggleExecucao = (id: string) => {
    setExecucoes(prev => prev.map(exec => 
      exec.id === id 
        ? { 
            ...exec, 
            status: exec.status === 'executando' ? 'pausada' : 'executando' 
          }
        : exec
    ))
    
    const execucao = execucoes.find(e => e.id === id)
    if (execucao) {
      toast.success(
        execucao.status === 'executando' 
          ? `⏸️ Automação "${execucao.titulo}" pausada`
          : `▶️ Automação "${execucao.titulo}" retomada`
      )
    }
  }

  // Função para cancelar execução
  const cancelarExecucao = (id: string) => {
    setExecucoes(prev => prev.map(exec => 
      exec.id === id 
        ? { ...exec, status: 'cancelada', dataFim: new Date().toISOString() }
        : exec
    ))
    
    const execucao = execucoes.find(e => e.id === id)
    if (execucao) {
      toast.error(`🛑 Automação "${execucao.titulo}" cancelada`)
    }
  }

  // Filtrar execuções
  const execucoesFiltradas = execucoes.filter(exec => {
    if (filtroStatus === 'todos') return true
    return exec.status === filtroStatus
  })

  // Estatísticas gerais
  const estatisticas = {
    total: execucoes.length,
    executando: execucoes.filter(e => e.status === 'executando').length,
    concluidas: execucoes.filter(e => e.status === 'concluida').length,
    investimentoTotal: execucoes.reduce((acc, e) => acc + e.investimentoTotal, 0),
    receitaTotal: execucoes.reduce((acc, e) => acc + e.receitaGerada, 0),
    roasMedia: execucoes.length > 0 
      ? execucoes.reduce((acc, e) => acc + e.roasAtual, 0) / execucoes.length 
      : 0
  }

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <Card className="gaming-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Histórico de Automações
          </CardTitle>
          <CardDescription>
            Todas as execuções da automação completa NEXUS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{estatisticas.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{estatisticas.executando}</div>
              <div className="text-sm text-muted-foreground">Ativas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{estatisticas.concluidas}</div>
              <div className="text-sm text-muted-foreground">Concluídas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">R$ {(estatisticas.investimentoTotal / 1000).toFixed(1)}K</div>
              <div className="text-sm text-muted-foreground">Investido</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">R$ {(estatisticas.receitaTotal / 1000).toFixed(1)}K</div>
              <div className="text-sm text-muted-foreground">Receita</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{estatisticas.roasMedia.toFixed(1)}x</div>
              <div className="text-sm text-muted-foreground">ROAS Médio</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="gaming-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button
              variant={filtroStatus === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('todos')}
            >
              Todas ({execucoes.length})
            </Button>
            <Button
              variant={filtroStatus === 'executando' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('executando')}
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              Executando ({execucoes.filter(e => e.status === 'executando').length})
            </Button>
            <Button
              variant={filtroStatus === 'concluida' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('concluida')}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Concluídas ({execucoes.filter(e => e.status === 'concluida').length})
            </Button>
            <Button
              variant={filtroStatus === 'pausada' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('pausada')}
            >
              <PauseCircle className="h-4 w-4 mr-1" />
              Pausadas ({execucoes.filter(e => e.status === 'pausada').length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Execuções */}
      <div className="space-y-4">
        {execucoesFiltradas.map(execucao => (
          <Card key={execucao.id} className="gaming-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={
                    execucao.status === 'concluida' ? 'default' :
                    execucao.status === 'executando' ? 'secondary' :
                    execucao.status === 'pausada' ? 'outline' :
                    'destructive'
                  }>
                    {execucao.status === 'concluida' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {execucao.status === 'executando' && <PlayCircle className="h-3 w-3 mr-1" />}
                    {execucao.status === 'pausada' && <PauseCircle className="h-3 w-3 mr-1" />}
                    {execucao.status === 'cancelada' && <Square className="h-3 w-3 mr-1" />}
                    {execucao.status === 'erro' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {execucao.status.charAt(0).toUpperCase() + execucao.status.slice(1)}
                  </Badge>
                  
                  <div>
                    <CardTitle className="text-base">{execucao.titulo}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Iniciado em {new Date(execucao.dataInicio).toLocaleString('pt-BR')}
                      {execucao.dataFim && (
                        <> • Concluído em {new Date(execucao.dataFim).toLocaleString('pt-BR')}</>
                      )}
                    </CardDescription>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-accent">
                    {execucao.roasAtual.toFixed(1)}x
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ROAS
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Métricas Principais */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    R$ {execucao.investimentoTotal.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Investimento</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold text-success">
                    R$ {execucao.receitaGerada.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Receita</div>
                </div>
                
                {execucao.resultados.produtoCriado && (
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {execucao.resultados.produtoCriado.vendas}
                    </div>
                    <div className="text-xs text-muted-foreground">Vendas</div>
                  </div>
                )}
                
                {execucao.resultados.campanhas && execucao.resultados.campanhas.length > 0 && (
                  <>
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {execucao.resultados.campanhas.reduce((acc, c) => acc + c.impressoes, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Impressões</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-semibold text-primary">
                        {execucao.resultados.campanhas.reduce((acc, c) => acc + c.cliques, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Cliques</div>
                    </div>
                  </>
                )}
              </div>

              {/* Progress para execuções ativas */}
              {execucao.status === 'executando' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progresso da Automação</span>
                    <span className="text-sm text-muted-foreground">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    Otimizando campanhas baseado na performance atual...
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setExecucaoSelecionada(execucao)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[80vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Detalhes da Automação</DialogTitle>
                      <DialogDescription>
                        {execucao.titulo}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                      <DetalhesExecucao execucao={execucao} />
                    </div>
                  </DialogContent>
                </Dialog>

                {execucao.resultados.landingPage && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Simular preview da landing page
                      toast.info('🔗 Abrindo landing page...', {
                        description: execucao.resultados.landingPage?.url
                      })
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Landing Page
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const dataToExport = {
                      execucao: execucao,
                      exportedAt: new Date().toISOString()
                    }
                    
                    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
                      type: 'application/json' 
                    })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `automacao-${execucao.id}-${execucao.titulo.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}.json`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    
                    toast.success('📥 Dados exportados com sucesso!')
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>

                {execucao.status === 'executando' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleExecucao(execucao.id)}
                  >
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Pausar
                  </Button>
                )}

                {execucao.status === 'pausada' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleExecucao(execucao.id)}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Retomar
                  </Button>
                )}

                {(execucao.status === 'executando' || execucao.status === 'pausada') && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => cancelarExecucao(execucao.id)}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {execucoesFiltradas.length === 0 && (
        <Card className="gaming-card">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma automação encontrada</h3>
              <p className="text-muted-foreground">
                {filtroStatus === 'todos' 
                  ? 'Inicie sua primeira automação completa para ver o histórico aqui'
                  : `Nenhuma automação com status "${filtroStatus}" encontrada`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente de detalhes da execução
function DetalhesExecucao({ execucao }: { execucao: AutomacaoExecucao }) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="resumo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="text-base">Configuração Inicial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Investimento:</span>
                  <span className="font-medium">R$ {execucao.configuracao.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nível de Risco:</span>
                  <span className="font-medium">{execucao.configuracao.riskLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Campanhas:</span>
                  <span className="font-medium">{execucao.configuracao.maxCampaigns}</span>
                </div>
                <div>
                  <span>Nichos:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {execucao.configuracao.preferredNiches.map(nicho => (
                      <Badge key={nicho} variant="outline" className="text-xs">
                        {nicho}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Receita Gerada:</span>
                  <span className="font-medium text-success">R$ {execucao.receitaGerada.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>ROAS Atual:</span>
                  <span className="font-medium text-accent">{execucao.roasAtual.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Lucro Líquido:</span>
                  <span className="font-medium text-primary">
                    R$ {(execucao.receitaGerada - execucao.investimentoTotal).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant={
                    execucao.status === 'concluida' ? 'default' :
                    execucao.status === 'executando' ? 'secondary' :
                    'outline'
                  }>
                    {execucao.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {execucao.resultados.produtoCriado && (
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="text-base">Produto Criado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Nome:</span>
                  <span className="font-medium">{execucao.resultados.produtoCriado.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span className="font-medium">{execucao.resultados.produtoCriado.tipo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Preço:</span>
                  <span className="font-medium">R$ {execucao.resultados.produtoCriado.preco}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas:</span>
                  <span className="font-medium text-success">{execucao.resultados.produtoCriado.vendas}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          {execucao.timeline.map((evento, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className={`rounded-full p-2 ${
                evento.status === 'concluida' ? 'bg-success/20' : 'bg-destructive/20'
              }`}>
                {evento.status === 'concluida' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">{evento.etapa}</div>
                <div className="text-sm text-muted-foreground">{evento.descricao}</div>
                {evento.detalhes && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {evento.detalhes}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(evento.timestamp).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="campanhas" className="space-y-4">
          {execucao.resultados.campanhas?.map(campanha => (
            <Card key={campanha.id} className="gaming-card">
              <CardHeader>
                <CardTitle className="text-base">{campanha.nome}</CardTitle>
                <CardDescription>{campanha.plataforma}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-medium">R$ {campanha.gasto.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Gasto</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium">{campanha.impressoes.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Impressões</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium">{campanha.cliques}</div>
                    <div className="text-xs text-muted-foreground">Cliques</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium">{campanha.conversoes}</div>
                    <div className="text-xs text-muted-foreground">Conversões</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="resultados" className="space-y-4">
          <Alert className="border-success/50 bg-success/10">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Todos os resultados foram criados automaticamente pela IA NEXUS
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {execucao.resultados.produtoCriado && (
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Produto Digital
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Nome:</strong> {execucao.resultados.produtoCriado.nome}</div>
                  <div><strong>Tipo:</strong> {execucao.resultados.produtoCriado.tipo}</div>
                  <div><strong>Vendas:</strong> {execucao.resultados.produtoCriado.vendas}</div>
                </CardContent>
              </Card>
            )}

            {execucao.resultados.landingPage && (
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Landing Page
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Conversão:</strong> {execucao.resultados.landingPage.conversaoTaxa}%</div>
                  <div><strong>Visitantes:</strong> {execucao.resultados.landingPage.visitantes}</div>
                  <Button variant="outline" size="sm" className="mt-2">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}