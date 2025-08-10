import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FileText,
  Download,
  Settings,
  Calendar,
  Loader2,
  CheckCircle,
  FileX,
  Mail,
  BarChart3,
  Lightbulb,
  Trash2
} from "lucide-react"
import { useRelatorios } from '@/hooks/useRelatorios'
import type { Usuario, MetricasCampanha, Criativo } from '@/types'
import type { RelatorioConfig, RelatorioGerado } from '@/hooks/useRelatorios'

interface RelatoriosPanelProps {
  usuario: Usuario
  campanhas: MetricasCampanha[]
  criativos: Criativo[]
}

export default function RelatoriosPanel({ usuario, campanhas, criativos }: RelatoriosPanelProps) {
  const {
    config,
    setConfig,
    relatorios,
    isGenerating,
    gerarRelatorioPDF,
    downloadRelatorio,
    removerRelatorio
  } = useRelatorios()

  const [configTemp, setConfigTemp] = useState(config)

  const handleGerarRelatorio = async () => {
    await gerarRelatorioPDF(usuario, campanhas, criativos)
  }

  const handleSalvarConfig = () => {
    setConfig(configTemp)
  }

  const formatarTamanho = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONCLUIDO':
        return 'bg-success text-success-foreground'
      case 'GERANDO':
        return 'bg-warning text-warning-foreground'
      case 'ERRO':
        return 'bg-destructive text-destructive-foreground'
      default:
        return 'bg-secondary text-secondary-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONCLUIDO':
        return <CheckCircle className="h-3 w-3" />
      case 'GERANDO':
        return <Loader2 className="h-3 w-3 animate-spin" />
      case 'ERRO':
        return <FileX className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Relatórios Automatizados
          </h2>
          <p className="text-muted-foreground">
            Gere relatórios detalhados com insights personalizados
          </p>
        </div>
        <Button 
          onClick={handleGerarRelatorio} 
          disabled={isGenerating}
          className="bg-gradient-to-r from-primary to-primary/80"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configurações */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações do Relatório
            </CardTitle>
            <CardDescription>
              Personalize o conteúdo e formato dos seus relatórios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="formato">Formato</Label>
                <Select 
                  value={configTemp.formato} 
                  onValueChange={(value: any) => setConfigTemp(prev => ({ ...prev, formato: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="HTML">HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="periodicidade">Periodicidade</Label>
                <Select 
                  value={configTemp.periodicidade} 
                  onValueChange={(value: any) => setConfigTemp(prev => ({ ...prev, periodicidade: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="DIARIO">Diário</SelectItem>
                    <SelectItem value="SEMANAL">Semanal</SelectItem>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="graficos">Incluir Gráficos</Label>
                  <p className="text-xs text-muted-foreground">
                    Adicionar visualizações ao relatório
                  </p>
                </div>
                <Switch
                  id="graficos"
                  checked={configTemp.incluirGraficos}
                  onCheckedChange={(checked) => 
                    setConfigTemp(prev => ({ ...prev, incluirGraficos: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="recomendacoes">Incluir Recomendações IA</Label>
                  <p className="text-xs text-muted-foreground">
                    Insights gerados por inteligência artificial
                  </p>
                </div>
                <Switch
                  id="recomendacoes"
                  checked={configTemp.incluirRecomendacoes}
                  onCheckedChange={(checked) => 
                    setConfigTemp(prev => ({ ...prev, incluirRecomendacoes: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="comparacao">Incluir Comparação</Label>
                  <p className="text-xs text-muted-foreground">
                    Análise comparativa com períodos anteriores
                  </p>
                </div>
                <Switch
                  id="comparacao"
                  checked={configTemp.incluirComparacao}
                  onCheckedChange={(checked) => 
                    setConfigTemp(prev => ({ ...prev, incluirComparacao: checked }))
                  }
                />
              </div>
            </div>

            {configTemp.periodicidade !== 'MANUAL' && (
              <>
                <Separator />
                <div>
                  <Label htmlFor="email">Email para Envio Automático</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={configTemp.emailDestino || ''}
                    onChange={(e) => 
                      setConfigTemp(prev => ({ ...prev, emailDestino: e.target.value }))
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Relatórios serão enviados automaticamente para este email
                  </p>
                </div>
              </>
            )}

            <Button onClick={handleSalvarConfig} className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>

        {/* Prévia do Conteúdo */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Prévia do Conteúdo
            </CardTitle>
            <CardDescription>
              O que será incluído no seu relatório
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Resumo Executivo</p>
                  <p className="text-xs text-muted-foreground">
                    Métricas principais e KPIs consolidados
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Top 5 Campanhas</p>
                  <p className="text-xs text-muted-foreground">
                    Campanhas com melhor performance por ROAS
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Análise de Criativos</p>
                  <p className="text-xs text-muted-foreground">
                    Performance detalhada dos principais criativos
                  </p>
                </div>
              </div>

              {configTemp.incluirGraficos && (
                <div className="flex items-center space-x-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <BarChart3 className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-primary">Gráficos de Performance</p>
                    <p className="text-xs text-muted-foreground">
                      Visualizações interativas dos dados
                    </p>
                  </div>
                </div>
              )}

              {configTemp.incluirRecomendacoes && (
                <div className="flex items-center space-x-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <Lightbulb className="h-4 w-4 text-accent flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-accent">Insights de IA</p>
                    <p className="text-xs text-muted-foreground">
                      Recomendações personalizadas baseadas em IA
                    </p>
                  </div>
                </div>
              )}

              {configTemp.incluirComparacao && (
                <div className="flex items-center space-x-3 p-3 bg-success/10 rounded-lg border border-success/20">
                  <Calendar className="h-4 w-4 text-success flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-success">Análise Comparativa</p>
                    <p className="text-xs text-muted-foreground">
                      Comparação com períodos anteriores
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Relatórios Gerados */}
      <Card className="gaming-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatórios Gerados
              </CardTitle>
              <CardDescription>
                Histórico de relatórios criados
              </CardDescription>
            </div>
            <Badge variant="outline">
              {relatorios.length} relatórios
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {relatorios.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhum relatório gerado</h3>
              <p className="text-muted-foreground mb-4">
                Clique em "Gerar Relatório" para criar seu primeiro relatório
              </p>
              <Button onClick={handleGerarRelatorio} disabled={isGenerating}>
                <FileText className="h-4 w-4 mr-2" />
                Gerar Primeiro Relatório
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {relatorios.map((relatorio) => (
                  <RelatorioCard 
                    key={relatorio.id} 
                    relatorio={relatorio}
                    onDownload={downloadRelatorio}
                    onRemover={removerRelatorio}
                    formatarTamanho={formatarTamanho}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RelatorioCard({ 
  relatorio, 
  onDownload, 
  onRemover, 
  formatarTamanho,
  getStatusColor,
  getStatusIcon
}: {
  relatorio: RelatorioGerado
  onDownload: (relatorio: RelatorioGerado) => void
  onRemover: (id: string) => void
  formatarTamanho: (bytes: number) => string
  getStatusColor: (status: string) => string
  getStatusIcon: (status: string) => React.ReactNode
}) {
  return (
    <Card className="border-l-4 border-l-primary/20 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium">{relatorio.titulo}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(relatorio.dataGeracao).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>Formato: {relatorio.formato}</span>
              {relatorio.tamanho > 0 && (
                <span>Tamanho: {formatarTamanho(relatorio.tamanho)}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={`text-xs ${getStatusColor(relatorio.status)}`}>
              <div className="flex items-center space-x-1">
                {getStatusIcon(relatorio.status)}
                <span>{relatorio.status}</span>
              </div>
            </Badge>
            
            {relatorio.status === 'CONCLUIDO' && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onDownload(relatorio)}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onRemover(relatorio.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}