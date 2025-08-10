import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  TrendingUp,
  TrendingDown,
  Equal,
  BarChart3,
  Calendar,
  Target,
  Lightbulb,
  CheckCircle,
  Loader2,
  Download
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { useAnaliseComparativa } from '@/hooks/useAnaliseComparativa'
import type { MetricasCampanha, Criativo } from '@/types'
import type { AnaliseComparativa, MetricaComparada } from '@/hooks/useAnaliseComparativa'

interface AnaliseComparativaProps {
  campanhas: MetricasCampanha[]
  criativos: Criativo[]
}

export default function AnaliseComparativaPanel({ campanhas, criativos }: AnaliseComparativaProps) {
  const { isLoading, analises, compararPeriodos, salvarDadosHistoricos } = useAnaliseComparativa()
  const [tipoComparacao, setTipoComparacao] = useState<'SEMANA' | 'MES' | 'TRIMESTRE' | 'PERSONALIZADO'>('SEMANA')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [analiseAtual, setAnaliseAtual] = useState<AnaliseComparativa | null>(null)

  const executarAnalise = async () => {
    const resultado = await compararPeriodos(
      tipoComparacao,
      campanhas,
      dataInicio,
      dataFim
    )
    
    if (resultado) {
      setAnaliseAtual(resultado)
    }
  }

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'CRESCENDO':
        return <TrendingUp className="h-4 w-4 text-success" />
      case 'DECAINDO':
        return <TrendingDown className="h-4 w-4 text-destructive" />
      default:
  return <Equal className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTendenciaColor = (tendencia: string) => {
    switch (tendencia) {
      case 'CRESCENDO':
        return 'text-success'
      case 'DECAINDO':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  const formatarValor = (metrica: MetricaComparada) => {
    const nome = metrica.nome.toLowerCase()
    if (nome.includes('r$') || nome.includes('investimento')) {
      return `R$ ${metrica.valorAtual.toLocaleString('pt-BR')}`
    }
    if (nome.includes('%') || nome.includes('ctr')) {
      return `${metrica.valorAtual.toFixed(1)}%`
    }
    if (nome.includes('roas')) {
      return `${metrica.valorAtual.toFixed(1)}x`
    }
    return metrica.valorAtual.toLocaleString('pt-BR')
  }

  const gerarDadosGrafico = (metricas: MetricaComparada[]) => {
    return metricas.map(metrica => ({
      nome: metrica.nome,
      atual: metrica.valorAtual,
      anterior: metrica.valorAnterior,
      variacao: metrica.variacaoPercentual
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Análise Comparativa
          </h2>
          <p className="text-muted-foreground">
            Compare a performance entre diferentes períodos
          </p>
        </div>
        <Button onClick={() => salvarDadosHistoricos(campanhas, criativos)} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Salvar Dados
        </Button>
      </div>

      <Card className="gaming-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configurar Comparação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="tipo">Tipo de Comparação</Label>
              <Select 
                value={tipoComparacao} 
                onValueChange={(value: any) => setTipoComparacao(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMANA">Semana vs Semana Anterior</SelectItem>
                  <SelectItem value="MES">Mês vs Mês Anterior</SelectItem>
                  <SelectItem value="TRIMESTRE">Trimestre vs Trimestre Anterior</SelectItem>
                  <SelectItem value="PERSONALIZADO">Período Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoComparacao === 'PERSONALIZADO' && (
              <>
                <div>
                  <Label htmlFor="inicio">Data Início</Label>
                  <Input
                    id="inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fim">Data Fim</Label>
                  <Input
                    id="fim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <Button 
            onClick={executarAnalise} 
            disabled={isLoading || (tipoComparacao === 'PERSONALIZADO' && (!dataInicio || !dataFim))}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Executar Análise
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analiseAtual && (
        <Tabs defaultValue="metricas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="metricas" className="space-y-6">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle>Comparação de Métricas - {analiseAtual.periodo}</CardTitle>
                <CardDescription>
                  Evolução das principais métricas de performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {analiseAtual.metricas.map((metrica) => (
                    <MetricaCard key={metrica.nome} metrica={metrica} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="graficos" className="space-y-6">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle>Visualização Comparativa</CardTitle>
                <CardDescription>
                  Gráficos comparativos entre períodos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="font-medium mb-4">Comparação de Valores</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={gerarDadosGrafico(analiseAtual.metricas)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis 
                          dataKey="nome" 
                          stroke="var(--muted-foreground)" 
                          fontSize={10}
                          angle={-45}
                          textAnchor="end"
                          height={80}
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
                          dataKey="anterior" 
                          stroke="var(--muted-foreground)" 
                          fill="var(--muted)" 
                          fillOpacity={0.3}
                          name="Período Anterior"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="atual" 
                          stroke="var(--primary)" 
                          fill="var(--primary)" 
                          fillOpacity={0.3}
                          name="Período Atual"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="font-medium mb-4">Variação Percentual</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={gerarDadosGrafico(analiseAtual.metricas)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis 
                          dataKey="nome" 
                          stroke="var(--muted-foreground)" 
                          fontSize={10}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: any) => [`${value.toFixed(1)}%`, 'Variação']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="variacao" 
                          stroke="var(--accent)" 
                          strokeWidth={2}
                          dot={{ fill: 'var(--accent)', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="gaming-card border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Lightbulb className="h-5 w-5" />
                    Insights Identificados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {analiseAtual.insights.map((insight, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-muted/20 rounded-lg">
                          <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-sm">{insight}</p>
                        </div>
                      ))}
                      {analiseAtual.insights.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          Nenhum insight específico identificado neste período
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="gaming-card border-l-4 border-l-accent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <CheckCircle className="h-5 w-5" />
                    Recomendações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {analiseAtual.recomendacoes.map((recomendacao, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-accent/10 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                          <p className="text-sm">{recomendacao}</p>
                        </div>
                      ))}
                      {analiseAtual.recomendacoes.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          Nenhuma recomendação específica neste momento
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {analises.length > 0 && (
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle>Análises Anteriores</CardTitle>
            <CardDescription>
              Histórico das análises comparativas realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analises.slice(0, 5).map((analise, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setAnaliseAtual(analise)}
                >
                  <div>
                    <p className="font-medium">{analise.periodo}</p>
                    <p className="text-xs text-muted-foreground">
                      {analise.insights.length} insights • {analise.recomendacoes.length} recomendações
                    </p>
                  </div>
                  <Badge variant="outline">
                    {analise.metricas.filter(m => m.tendencia === 'CRESCENDO').length} ↑
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MetricaCard({ metrica }: { metrica: MetricaComparada }) {
  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'CRESCENDO':
        return <TrendingUp className="h-4 w-4 text-success" />
      case 'DECAINDO':
        return <TrendingDown className="h-4 w-4 text-destructive" />
      default:
  return <Equal className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTendenciaColor = (tendencia: string) => {
    switch (tendencia) {
      case 'CRESCENDO':
        return 'text-success'
      case 'DECAINDO':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  const formatarValor = (valor: number, nome: string) => {
    const nomeL = nome.toLowerCase()
    if (nomeL.includes('r$') || nomeL.includes('investimento')) {
      return `R$ ${valor.toLocaleString('pt-BR')}`
    }
    if (nomeL.includes('%') || nomeL.includes('ctr')) {
      return `${valor.toFixed(1)}%`
    }
    if (nomeL.includes('roas')) {
      return `${valor.toFixed(1)}x`
    }
    return valor.toLocaleString('pt-BR')
  }

  return (
    <Card className="border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          {metrica.nome}
          {getTendenciaIcon(metrica.tendencia)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <p className="text-lg font-semibold">
            {formatarValor(metrica.valorAtual, metrica.nome)}
          </p>
          <p className="text-xs text-muted-foreground">
            Anterior: {formatarValor(metrica.valorAnterior, metrica.nome)}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            variant="outline" 
            className={`text-xs ${getTendenciaColor(metrica.tendencia)}`}
          >
            {metrica.variacaoPercentual > 0 ? '+' : ''}
            {metrica.variacaoPercentual.toFixed(1)}%
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">
            {metrica.tendencia.toLowerCase()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}