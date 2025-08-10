import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useIA } from '@/hooks/useIA'
import { useKV } from '@/hooks/useKV'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from 'sonner'
import type { CriativoIA, AnalisePerformance, Criativo, ConfiguracaoApi } from '@/types'
import {
  Sparkles,
  Brain,
  Wand2,
  Image as ImageIcon,
  Video,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Download,
  Eye,
  Settings,
  Zap,
  Target,
  Lightbulb,
  Palette,
  Layers,
  Sliders,
  Award,
  Activity
} from 'lucide-react'

interface GeradorCriativoIAProps {
  campanhas: any[]
  criativos: Criativo[]
}

export default function GeradorCriativoIA({ campanhas, criativos }: GeradorCriativoIAProps) {
  const { usuarioAtual } = useAuth()
  const [configApi] = useKV<ConfiguracaoApi>('usuario-api-config', {
    facebookToken: '',
    adAccountId: '',
    kiwifyToken: '',
    ideogramToken: '',
    isValid: false
  })
  
  const { 
    isGenerating, 
    isAnalyzing, 
    temIdeogram, 
    gerarCriativo, 
    analisarPerformance, 
    verificarStatusAPIs,
    calcularCustoCreditos 
  } = useIA()
  
  const [criativosIA, setCriativosIA] = useKV<CriativoIA[]>('criativos-ia', [])
  const [analisesPerformance, setAnalisesPerformance] = useKV<AnalisePerformance[]>('analises-performance', [])
  
  // Estados do formulário
  const [configuracao, setConfiguracao] = useState({
    produto: '',
    beneficios: [''],
    publico: '',
    nicho: 'WHITE' as 'WHITE' | 'GREY' | 'BLACK',
    estilo: 'MODERNO' as 'MINIMALISTA' | 'GAMER' | 'CORPORATIVO' | 'MODERNO' | 'VIBRANTE',
    cores: ['#007bff'],
    elementos: [''],
    proporcao: '1:1' as '1:1' | '16:9' | '9:16' | '4:5',
    qualidade: 'STANDARD' as 'DRAFT' | 'STANDARD' | 'HIGH' | 'ULTRA',
    variantes: 1
  })
  
  // Estados de operação
  const [selectedCriativo, setSelectedCriativo] = useState<string>('')
  const [statusAPIs, setStatusAPIs] = useState<any>(null)

  useEffect(() => {
    if (temIdeogram) {
      verificarStatusAPI()
    }
  }, [temIdeogram])

  const verificarStatusAPI = async () => {
    try {
      const status = await verificarStatusAPIs()
      setStatusAPIs(status)
    } catch (error) {
      console.error('Erro ao verificar status da API:', error)
    }
  }

  const adicionarBeneficio = () => {
    setConfiguracao(prev => ({
      ...prev,
      beneficios: [...prev.beneficios, '']
    }))
  }

  const removerBeneficio = (index: number) => {
    setConfiguracao(prev => ({
      ...prev,
      beneficios: prev.beneficios.filter((_, i) => i !== index)
    }))
  }

  const updateBeneficio = (index: number, valor: string) => {
    setConfiguracao(prev => ({
      ...prev,
      beneficios: prev.beneficios.map((b, i) => i === index ? valor : b)
    }))
  }

  const adicionarElemento = () => {
    setConfiguracao(prev => ({
      ...prev,
      elementos: [...prev.elementos, '']
    }))
  }

  const removerElemento = (index: number) => {
    setConfiguracao(prev => ({
      ...prev,
      elementos: prev.elementos.filter((_, i) => i !== index)
    }))
  }

  const updateElemento = (index: number, valor: string) => {
    setConfiguracao(prev => ({
      ...prev,
      elementos: prev.elementos.map((e, i) => i === index ? valor : e)
    }))
  }

  const gerarCriativoCompleto = async () => {
    if (!temIdeogram) {
      toast.error('API do Ideogram não configurada')
      return
    }

    if (!configuracao.produto.trim()) {
      toast.error('Informe o produto/serviço')
      return
    }

    try {
      const config = {
        nicho: configuracao.nicho,
        produto: configuracao.produto,
        beneficios: configuracao.beneficios.filter(b => b.trim()),
        publico: configuracao.publico,
        estilo: configuracao.estilo,
        cores: configuracao.cores,
        elementos: configuracao.elementos.filter(e => e.trim()),
        proporcao: configuracao.proporcao,
        qualidade: configuracao.qualidade,
        variantes: configuracao.variantes
      }

      const criativosGerados = await gerarCriativo(config)
      
      // Adicionar à lista local
      setCriativosIA(prev => [...criativosGerados, ...prev])

      // Analisar performance do primeiro criativo automaticamente
      if (criativosGerados.length > 0) {
        analisarPerformanceCriativo(criativosGerados[0])
      }

    } catch (error) {
      console.error('Erro ao gerar criativo:', error)
    }
  }

  const analisarPerformanceCriativo = async (criativo: CriativoIA) => {
    try {
      const analise = await analisarPerformance(criativo, criativos)
      
      // Atualizar o criativo com o score
      setCriativosIA(prev => prev.map(c => 
        c.id === criativo.id 
          ? {
              ...c,
              analise: {
                ...c.analise,
                scorePreditivo: analise.metricas.engajamento,
                elementosDetectados: analise.insights.pontosFavoraveis,
                sugestoesMelhoria: analise.insights.recomendacoes
              }
            }
          : c
      ))

      // Salvar análise
      setAnalisesPerformance(prev => [analise, ...prev])
    } catch (error) {
      console.error('Erro na análise:', error)
    }
  }

  const analisarCriativoExistente = async (criativoId: string) => {
    const criativo = criativos.find(c => c.id === criativoId)
    if (!criativo) return

    try {
      const analise = await analisarPerformance(
        criativo, 
        criativos.filter(c => c.id !== criativoId)
      )
      
      setAnalisesPerformance(prev => [analise, ...prev])
      toast.success(`📊 Análise concluída para ${criativo.nome}!`)
    } catch (error) {
      console.error('Erro na análise:', error)
    }
  }

  const obterAnalise = (criativoId: string) => {
    return analisesPerformance.find(a => a.criativoId === criativoId)
  }

  const limparCriativos = () => {
    setCriativosIA([])
    setAnalisesPerformance([])
    toast.success('Histórico limpo!')
  }

  // Verificar se API está configurada
  if (!temIdeogram) {
    return (
      <Card className="gaming-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            Gerador de Criativos com IA
          </CardTitle>
          <CardDescription>
            Configure sua API do Ideogram para começar a criar criativos reais. Simulações foram desativadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Acesse as configurações para adicionar seu token do Ideogram e começar a gerar criativos profissionais com IA.
            </AlertDescription>
          </Alert>
          
          {usuarioAtual?.isAdmin && (
            <div className="mt-4 p-3 bg-muted/20 rounded text-xs">
              <strong>Debug (Admin):</strong><br />
              Token presente: {configApi.ideogramToken ? 'Sim' : 'Não'}<br />
              Token length: {configApi.ideogramToken?.length || 0}<br />
              temIdeogram: {temIdeogram ? 'true' : 'false'}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            Gerador de Criativos com IA
          </h2>
          <p className="text-muted-foreground">
            Crie criativos profissionais e analise sua performance preditiva
          </p>
        </div>

        <div className="flex items-center gap-3">
          {statusAPIs?.ideogram && (
            <Badge variant={statusAPIs.ideogram.ativo ? 'default' : 'destructive'}>
              <Activity className="h-3 w-3 mr-1" />
              API {statusAPIs.ideogram.ativo ? 'Ativa' : 'Erro'}
            </Badge>
          )}
          
          <Button variant="outline" size="sm" onClick={limparCriativos}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="gerador" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-card/50">
          <TabsTrigger value="gerador" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Gerador
          </TabsTrigger>
          <TabsTrigger value="biblioteca" className="flex items-center gap-2 relative">
            <ImageIcon className="h-4 w-4" />
            Biblioteca
            {criativosIA.length > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 text-[10px]">
                {criativosIA.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analises" className="flex items-center gap-2 relative">
            <Brain className="h-4 w-4" />
            Análises
            {analisesPerformance.length > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 text-[10px]">
                {analisesPerformance.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="existentes" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Existentes
          </TabsTrigger>
        </TabsList>

        {/* Gerador de Criativos */}
        <TabsContent value="gerador" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Configuração */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuração do Criativo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Produto/Serviço */}
                  <div className="space-y-2">
                    <Label htmlFor="produto">Produto/Serviço *</Label>
                    <Input
                      id="produto"
                      placeholder="Ex: Curso de Marketing Digital"
                      value={configuracao.produto}
                      onChange={(e) => setConfiguracao(prev => ({...prev, produto: e.target.value}))}
                    />
                  </div>

                  {/* Benefícios */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Principais Benefícios</Label>
                      <Button variant="outline" size="sm" onClick={adicionarBeneficio}>
                        <Zap className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {configuracao.beneficios.map((beneficio, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Benefício ${index + 1}`}
                            value={beneficio}
                            onChange={(e) => updateBeneficio(index, e.target.value)}
                          />
                          {configuracao.beneficios.length > 1 && (
                            <Button variant="outline" size="sm" onClick={() => removerBeneficio(index)}>
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Público-alvo */}
                  <div className="space-y-2">
                    <Label htmlFor="publico">Público-alvo</Label>
                    <Input
                      id="publico"
                      placeholder="Ex: Empreendedores de 25-45 anos"
                      value={configuracao.publico}
                      onChange={(e) => setConfiguracao(prev => ({...prev, publico: e.target.value}))}
                    />
                  </div>

                  {/* Configurações avançadas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nicho</Label>
                      <Select 
                        value={configuracao.nicho} 
                        onValueChange={(value: any) => setConfiguracao(prev => ({...prev, nicho: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WHITE">White (Ético)</SelectItem>
                          <SelectItem value="GREY">Grey (Moderado)</SelectItem>
                          <SelectItem value="BLACK">Black (Agressivo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estilo Visual</Label>
                      <Select 
                        value={configuracao.estilo} 
                        onValueChange={(value: any) => setConfiguracao(prev => ({...prev, estilo: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MINIMALISTA">Minimalista</SelectItem>
                          <SelectItem value="GAMER">Gamer</SelectItem>
                          <SelectItem value="CORPORATIVO">Corporativo</SelectItem>
                          <SelectItem value="MODERNO">Moderno</SelectItem>
                          <SelectItem value="VIBRANTE">Vibrante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Proporção</Label>
                      <Select 
                        value={configuracao.proporcao} 
                        onValueChange={(value: any) => setConfiguracao(prev => ({...prev, proporcao: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1:1">Quadrado (1:1)</SelectItem>
                          <SelectItem value="16:9">Paisagem (16:9)</SelectItem>
                          <SelectItem value="9:16">Retrato (9:16)</SelectItem>
                          <SelectItem value="4:5">Story (4:5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Qualidade</Label>
                      <Select 
                        value={configuracao.qualidade} 
                        onValueChange={(value: any) => setConfiguracao(prev => ({...prev, qualidade: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Rascunho (1 crédito)</SelectItem>
                          <SelectItem value="STANDARD">Padrão (2 créditos)</SelectItem>
                          <SelectItem value="HIGH">Alta (4 créditos)</SelectItem>
                          <SelectItem value="ULTRA">Ultra (8 créditos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview e Ação */}
            <div className="space-y-6">
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="text-lg">Geração</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Número de Variantes</Label>
                    <Select 
                      value={configuracao.variantes.toString()} 
                      onValueChange={(value) => setConfiguracao(prev => ({...prev, variantes: parseInt(value)}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Criativo</SelectItem>
                        <SelectItem value="2">2 Variantes</SelectItem>
                        <SelectItem value="3">3 Variantes</SelectItem>
                        <SelectItem value="4">4 Variantes</SelectItem>
                        <SelectItem value="5">5 Variantes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p><strong>Custo estimado:</strong></p>
                    <p>Total: {calcularCustoCreditos(configuracao.qualidade, configuracao.variantes)} créditos</p>
                  </div>

                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                    onClick={gerarCriativoCompleto}
                    disabled={isGenerating || !configuracao.produto.trim()}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Gerar Criativo
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {statusAPIs?.ideogram && !statusAPIs.ideogram.ativo && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-destructive">
                    API do Ideogram com problema: {statusAPIs.ideogram.erro}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Biblioteca de Criativos Gerados */}
        <TabsContent value="biblioteca" className="space-y-6">
          {criativosIA.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {criativosIA.map((criativo) => (
                <CriativoIACard key={criativo.id} criativo={criativo} analise={obterAnalise(criativo.id)} />
              ))}
            </div>
          ) : (
            <Card className="gaming-card">
              <CardContent className="text-center py-12">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum criativo gerado ainda</h3>
                <p className="text-muted-foreground mb-6">
                  Use o gerador para criar seus primeiros criativos com IA
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Análises de Performance */}
        <TabsContent value="analises" className="space-y-6">
          {analisesPerformance.length > 0 ? (
            <div className="space-y-4">
              {analisesPerformance.map((analise) => (
                <AnaliseCard key={analise.id} analise={analise} />
              ))}
            </div>
          ) : (
            <Card className="gaming-card">
              <CardContent className="text-center py-12">
                <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhuma análise realizada</h3>
                <p className="text-muted-foreground mb-6">
                  Gere criativos ou analise criativos existentes para ver os insights
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Análise de Criativos Existentes */}
        <TabsContent value="existentes" className="space-y-6">
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle>Analisar Criativos Existentes</CardTitle>
              <CardDescription>
                Selecione um criativo para análise preditiva de performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedCriativo} onValueChange={setSelectedCriativo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um criativo" />
                </SelectTrigger>
                <SelectContent>
                  {criativos.map((criativo) => (
                    <SelectItem key={criativo.id} value={criativo.id}>
                      {criativo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={() => analisarCriativoExistente(selectedCriativo)}
                disabled={!selectedCriativo || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analisar Performance
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {criativos.length === 0 && (
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                Nenhum criativo existente encontrado. Execute campanhas para ter dados para análise.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componentes auxiliares
function CriativoIACard({ 
  criativo, 
  analise 
}: { 
  criativo: CriativoIA
  analise?: AnalisePerformance 
}) {
  const { usuarioAtual } = useAuth()
  const [isUploading, setUploading] = useState(false)
  const [imageHash, setImageHash] = useState<string | undefined>(undefined)
  const downloadCriativo = async () => {
    if (!criativo.resultado?.url) return
    
    try {
      const response = await fetch(criativo.resultado.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `criativo-${criativo.id}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Download iniciado!')
    } catch (error) {
      toast.error('Erro no download')
    }
  }

  const uploadToFacebook = async () => {
    if (!criativo.resultado?.url) return
    if (!usuarioAtual?.configuracaoApi?.facebookToken || !usuarioAtual?.configuracaoApi?.adAccountId) {
      toast.error('Configure Facebook Token e Ad Account')
      return
    }
    try {
      setUploading(true)
      const apiBase = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001'
      const resp = await fetch(`${apiBase}/api/public/facebook/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facebook_token: usuarioAtual.configuracaoApi.facebookToken,
          ad_account_id: usuarioAtual.configuracaoApi.adAccountId,
          url: criativo.resultado.url,
          name: `ia_${criativo.id}`
        })
      })
      if (resp.ok) {
        const j = await resp.json()
        setImageHash(j.hash)
        toast.success('Imagem enviada ao Facebook (image_hash pronto)')
      } else {
        const t = await resp.text()
        toast.error('Falha ao enviar para Facebook: ' + t)
      }
    } catch (e) {
      toast.error('Erro ao enviar para Facebook')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="gaming-card overflow-hidden">
      <CardContent className="p-0">
        {criativo.resultado?.url && (
          <div className="aspect-square bg-muted/20 relative overflow-hidden">
            <img 
              src={criativo.resultado.url} 
              alt="Criativo gerado"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Badge className="bg-primary/80">
                {criativo.configuracao.qualidade}
              </Badge>
              <Badge variant="outline" className="bg-background/80">
                {criativo.configuracao.proporcao}
              </Badge>
            </div>
            <div className="absolute bottom-2 left-2">
              <Badge variant="outline" className={`
                bg-background/80 
                ${criativo.nicho === 'BLACK' ? 'text-destructive' : 
                  criativo.nicho === 'GREY' ? 'text-warning' : 
                  'text-success'}
              `}>
                {criativo.nicho}
              </Badge>
            </div>
          </div>
        )}
        
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge className="bg-accent/10 text-accent">
              {criativo.custoCreditos} créditos
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadCriativo}>
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" onClick={uploadToFacebook} disabled={isUploading}>
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {imageHash && (
            <div className="text-xs text-muted-foreground">
              image_hash: <span className="font-mono break-all">{imageHash}</span>
            </div>
          )}
          
          {criativo.analise.scorePreditivo > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Score Preditivo</span>
                <span className="font-medium">{criativo.analise.scorePreditivo.toFixed(1)}%</span>
              </div>
              <Progress value={criativo.analise.scorePreditivo} className="h-2" />
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p className="truncate" title={criativo.prompt}>
              <strong>Prompt:</strong> {criativo.prompt.substring(0, 80)}...
            </p>
          </div>

          {analise && (
            <div className="pt-2 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="block font-medium text-primary">
                    {analise.metricas.ctrPrevisto.toFixed(2)}%
                  </span>
                  <span className="text-muted-foreground">CTR Previsto</span>
                </div>
                <div>
                  <span className="block font-medium text-accent">
                    {analise.metricas.roasPrevisto.toFixed(1)}x
                  </span>
                  <span className="text-muted-foreground">ROAS Previsto</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AnaliseCard({ analise }: { analise: AnalisePerformance }) {
  return (
    <Card className="gaming-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            Análise Preditiva
          </CardTitle>
          <Badge variant="outline">
            {analise.confiabilidade.toFixed(0)}% confiança
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Métricas principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {analise.metricas.ctrPrevisto.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">CTR Previsto</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {analise.metricas.roasPrevisto.toFixed(1)}x
            </div>
            <div className="text-xs text-muted-foreground">ROAS Previsto</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {analise.metricas.engajamento.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Engajamento</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">
              {analise.metricas.conversaoEstimada.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Conversão</div>
          </div>
        </div>

        {/* Insights */}
        {analise.insights.pontosFavoraveis.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-success mb-2 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Pontos Favoráveis
            </h4>
            <ul className="space-y-1">
              {analise.insights.pontosFavoraveis.slice(0, 3).map((ponto, index) => (
                <li key={index} className="text-xs flex items-center gap-2">
                  <div className="w-1 h-1 bg-success rounded-full" />
                  {ponto}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analise.insights.recomendacoes.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-accent mb-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Recomendações
            </h4>
            <ul className="space-y-1">
              {analise.insights.recomendacoes.slice(0, 2).map((rec, index) => (
                <li key={index} className="text-xs flex items-center gap-2">
                  <div className="w-1 h-1 bg-accent rounded-full" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}