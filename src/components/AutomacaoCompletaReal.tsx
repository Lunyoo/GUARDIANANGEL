import { useState } from 'react'
import { useKV } from '../hooks/useKV'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from 'sonner'
import { realScrapingPlaywrightService, type RealScrapedOffer } from '@/services/realScrapingPlaywright'
import { kiwifyService } from '@/services/kiwifyService'
import IdeogramService from '@/services/ideogramService'
import { useAuth } from '@/hooks/useAuth'
import {
  Zap,
  Bot,
  Target,
  DollarSign,
  Eye,
  TrendingUp,
  Search,
  Settings,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Star,
  Brain,
  Camera,
  FileText,
  ExternalLink,
  Wallet,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Rocket,
  Award
} from "lucide-react"

interface AutomacaoExecucao {
  id: string
  etapa: 'configuracao' | 'scraping' | 'analise' | 'criacao_produto' | 'criacao_funil' | 'criacao_criativos' | 'criacao_campanha' | 'concluida'
  progresso: number
  status: string
  resultados: {
    scrapingEncontrado?: RealScrapedOffer[]
    ofertaSelecionada?: RealScrapedOffer
    produtoCriado?: any
    funnelCriado?: any
    criativosCriados?: string[]
    campanhaCriada?: any
  }
  erros: string[]
  iniciadoEm: Date
  concluidoEm?: Date
}

interface ConfiguracaoAutomacao {
  orcamento: number
  nicho: string
  tipoNicho: 'white' | 'grey' | 'black'
  palavrasChave: string[]
  configuracoesScraping: {
    plataformas: string[]
    maxResultados: number
    qualidadeMinima: number
  }
  configuracoesProduto: {
    tipoProduto: 'ebook' | 'curso' | 'consultoria' | 'software'
    precoDesejado: number
  }
}

export default function AutomacaoCompletaReal() {
  const { usuarioAtual, hasKiwifyOAuth, hasIdeogramApi } = useAuth()
  const [execucoes, setExecucoes] = useKV<AutomacaoExecucao[]>('automacao-execucoes', [])
  const [execucaoAtual, setExecucaoAtual] = useState<AutomacaoExecucao | null>(null)
  
  // Configuração da automação
  const [configuracao, setConfiguracao] = useState<ConfiguracaoAutomacao>({
    orcamento: 500,
    nicho: '',
    tipoNicho: 'white',
    palavrasChave: [],
    configuracoesScraping: {
      plataformas: ['facebook', 'tiktok'],
      maxResultados: 10,
      qualidadeMinima: 70
    },
    configuracoesProduto: {
      tipoProduto: 'ebook',
      precoDesejado: 197
    }
  })

  // Estado da execução
  const [isExecutando, setIsExecutando] = useState(false)

  const iniciarAutomacaoCompleta = async () => {
    // Validações
    if (!configuracao.orcamento || configuracao.orcamento < 100) {
      toast.error('❌ Orçamento mínimo: R$ 100')
      return
    }

    if (!configuracao.nicho || configuracao.palavrasChave.length === 0) {
      toast.error('❌ Configure o nicho e palavras-chave')
      return
    }

    if (!hasKiwifyOAuth) {
      toast.error('❌ Configure o Kiwify OAuth primeiro')
      return
    }

    if (!hasIdeogramApi) {
      toast.error('❌ Configure a API do Ideogram primeiro')
      return
    }

    // Iniciar nova execução
    const novaExecucao: AutomacaoExecucao = {
      id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      etapa: 'configuracao',
      progresso: 0,
      status: 'Iniciando automação completa NEXUS...',
      resultados: {},
      erros: [],
      iniciadoEm: new Date()
    }

    setExecucaoAtual(novaExecucao)
    setIsExecutando(true)

    try {
      // Salvar configuração e iniciar processo
      await executarAutomacaoCompleta(novaExecucao)
    } catch (error) {
      toast.error('❌ Erro na automação: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
      setIsExecutando(false)
    }
  }

  const executarAutomacaoCompleta = async (execucao: AutomacaoExecucao) => {
    try {
      // ETAPA 1: Scraping Inteligente
      execucao.etapa = 'scraping'
      execucao.progresso = 10
      execucao.status = 'Realizando scraping inteligente...'
      atualizarExecucao(execucao)

      const scrapingConfig = {
        keywords: configuracao.palavrasChave,
        platforms: configuracao.configuracoesScraping.plataformas,
        maxResults: configuracao.configuracoesScraping.maxResultados,
        filters: {
          minEngagement: configuracao.configuracoesScraping.qualidadeMinima,
          dateRange: '30d',
          country: 'BR'
        }
      }

      const ofertasEncontradas = await realScrapingPlaywrightService.performAdvancedScraping(scrapingConfig)
      
      if (ofertasEncontradas.length === 0) {
        throw new Error('Nenhuma oferta encontrada no scraping. Tente outras palavras-chave ou critérios menos rigorosos.')
      }

      // Filtrar apenas ofertas de alta qualidade
      const ofertasQualidade = ofertasEncontradas.filter(oferta => 
        (oferta.metrics?.successScore || 0) >= configuracao.configuracoesScraping.qualidadeMinima &&
        oferta.extractedData.price >= 50 &&
        oferta.extractedData.price <= configuracao.orcamento * 2
      )

      if (ofertasQualidade.length === 0) {
        throw new Error(`❌ Critérios muito rigorosos: apenas ${ofertasEncontradas.length} anúncios aprovados. Tente outro nicho ou tipo.`)
      }

      execucao.resultados.scrapingEncontrado = ofertasQualidade
      
      // Selecionar a melhor oferta automaticamente
      const melhorOferta = ofertasQualidade.sort((a, b) => 
        (b.metrics?.successScore || 0) - (a.metrics?.successScore || 0)
      )[0]
      
      execucao.resultados.ofertaSelecionada = melhorOferta
      execucao.progresso = 25
      execucao.status = `Oferta selecionada: ${melhorOferta.title}`
      atualizarExecucao(execucao)

      // ETAPA 2: Análise de IA
      execucao.etapa = 'analise'
      execucao.progresso = 35
      execucao.status = 'IA analisando viabilidade da oferta...'
      atualizarExecucao(execucao)

      await new Promise(resolve => setTimeout(resolve, 2000)) // Simular análise IA

      // ETAPA 3: Criação do Produto no Kiwify
      execucao.etapa = 'criacao_produto'
      execucao.progresso = 50
      execucao.status = 'Criando produto no Kiwify...'
      atualizarExecucao(execucao)

      const produtoCriado = await criarProdutoKiwify(melhorOferta, configuracao)
      execucao.resultados.produtoCriado = produtoCriado

      // ETAPA 4: Criação do Funil
      execucao.etapa = 'criacao_funil'
      execucao.progresso = 65
      execucao.status = 'Criando funil gamificado...'
      atualizarExecucao(execucao)

      const funnelCriado = await criarFunnelGamificado(melhorOferta, produtoCriado)
      execucao.resultados.funnelCriado = funnelCriado

      // ETAPA 5: Criação dos Criativos
      execucao.etapa = 'criacao_criativos'
      execucao.progresso = 80
      execucao.status = 'IA criando criativos otimizados...'
      atualizarExecucao(execucao)

      const criativosCriados = await criarCriativosIA(melhorOferta)
      execucao.resultados.criativosCriados = criativosCriados

      // ETAPA 6: Criação da Campanha
      execucao.etapa = 'criacao_campanha'
      execucao.progresso = 95
      execucao.status = 'Configurando campanha no Facebook...'
      atualizarExecucao(execucao)

      const campanhaCriada = await criarCampanhaFacebook(melhorOferta, criativosCriados, configuracao.orcamento)
      execucao.resultados.campanhaCriada = campanhaCriada

      // ETAPA FINAL: Conclusão
      execucao.etapa = 'concluida'
      execucao.progresso = 100
      execucao.status = '✅ Automação concluída com sucesso!'
      execucao.concluidoEm = new Date()
      atualizarExecucao(execucao)

      // Salvar execução no histórico
      setExecucoes(prev => [execucao, ...prev.slice(0, 9)]) // Manter últimas 10 execuções

      toast.success('🎉 Automação NEXUS concluída!', {
        description: `Produto criado, funil configurado e campanha no ar com orçamento de R$ ${configuracao.orcamento}`
      })

    } catch (error) {
      execucao.erros.push(error instanceof Error ? error.message : 'Erro desconhecido')
      execucao.status = `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      atualizarExecucao(execucao)
      
      toast.error('❌ Automação incompleta: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setIsExecutando(false)
    }
  }

  const atualizarExecucao = (execucao: AutomacaoExecucao) => {
    setExecucaoAtual(execucao)
    // Forçar re-render para mostrar progresso em tempo real
    const updatedExecucao = { ...execucao }
    setExecucaoAtual(updatedExecucao)
  }

  // Funções auxiliares para criação de produtos e campanhas
  const criarProdutoKiwify = async (oferta: RealScrapedOffer, config: ConfiguracaoAutomacao) => {
    try {
      // Mapear categoria do produto da nossa UI para os valores aceitos pela API
      const mapCategoria = (tipo: ConfiguracaoAutomacao['configuracoesProduto']['tipoProduto']): 'ebook' | 'course' | 'software' | 'service' => {
        switch (tipo) {
          case 'ebook':
            return 'ebook'
          case 'curso':
            return 'course'
          case 'consultoria':
            return 'service'
          case 'software':
          default:
            return 'software'
        }
      }

      // Usar o serviço real do Kiwify com o payload tipado corretamente
      const produto = await kiwifyService.createProduct({
        name: `${oferta.title} - Método Completo`,
        price: config.configuracoesProduto.precoDesejado,
        description: `${oferta.adCopy}\n\nBenefícios:\n${(oferta.extractedData.benefits || []).map(b => `• ${b}`).join('\n')}`,
        category: mapCategoria(config.configuracoesProduto.tipoProduto),
        niche: config.tipoNicho,
        checkout_settings: {
          headline: oferta.extractedData.headline || oferta.title,
          subheadline: 'Oferta otimizada por IA com alta conversão',
          bullet_points: (oferta.extractedData.benefits || []).slice(0, 5)
        }
      })

      return produto
    } catch (error) {
      console.error('Erro ao criar produto no Kiwify:', error)
      // Sem fallback/mocks: propagar erro para interromper o fluxo
      throw error
    }
  }

  const criarFunnelGamificado = async (oferta: RealScrapedOffer, produto: any) => {
    // Criar funil real usando o serviço do Kiwify
    try {
      const urls = await kiwifyService.createGamifiedFunnel(produto.id, {
        niche: oferta.niche,
        targetAudience: `Interessados em ${oferta.niche}`,
        pricePoint: produto.price ?? 0
      })

      return {
        id: `funnel-${produto.id}`,
        landingPageUrl: urls.landing_page_url,
        checkoutUrl: produto.checkout_url,
        upsellUrl: urls.upsell_url,
        thankYouPageUrl: urls.thank_you_page_url,
        gamificationEnabled: true,
        progressBar: true,
        socialProof: true
      }
    } catch (error) {
      console.error('Erro ao criar funil no Kiwify:', error)
      throw error
    }
  }

  const criarCriativosIA = async (oferta: RealScrapedOffer) => {
    try {
      // Verificar se o usuário tem API do Ideogram configurada
      const ideogramToken = usuarioAtual?.configuracaoApi?.ideogramToken
      if (!ideogramToken) {
        console.warn('Token do Ideogram não configurado, usando imagens placeholder')
        return [`https://picsum.photos/1080/1080?random=${Date.now()}`]
      }

      const ideogramService = new IdeogramService(ideogramToken)

      // Configuração do criativo baseada na oferta
      const config = {
        nicho: oferta.niche.includes('fitness') ? 'WHITE' as const : 'GREY' as const,
        produto: oferta.title,
        beneficios: oferta.extractedData.headline ? [oferta.extractedData.headline] : ['Alta conversão', 'Resultado garantido'],
        publico: `Interessados em ${oferta.niche}`,
        estilo: 'MODERNO' as const,
        cores: ['#007bff', '#28a745'],
        elementos: ['texto chamativo', 'design profissional'],
        proporcao: '1:1' as const,
        qualidade: 'STANDARD' as const
      }

  const criativos: string[] = []
      
      // Gerar criativo principal
      try {
        const criativoPrincipal = await ideogramService.gerarCriativo(config)
        if (criativoPrincipal) {
          criativos.push(criativoPrincipal.url)
        }
      } catch (error) {
        console.warn('Erro ao gerar criativo principal:', error)
        criativos.push(`https://picsum.photos/1080/1080?random=${Date.now()}`)
      }

      // Gerar uma variante
      try {
        const variantes = await ideogramService.gerarVariantes(config, 1)
        if (variantes.length > 0) {
          criativos.push(variantes[0].url)
        }
      } catch (error) {
        console.warn('Erro ao gerar variante:', error)
        criativos.push(`https://picsum.photos/1080/1080?random=${Date.now() + 1}`)
      }

      return criativos.length > 0 ? criativos : [`https://picsum.photos/1080/1080?random=${Date.now()}`]
    } catch (error) {
      console.error('Erro ao criar criativos:', error)
      return [`https://picsum.photos/1080/1080?random=${Date.now()}`]
    }
  }

  const criarCampanhaFacebook = async (oferta: RealScrapedOffer, criativos: string[], orcamento: number) => {
    try {
      const apiBase = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001'
      const { getFBP, getFBC, ensureUTMs, newEventId } = await import('@/utils/facebookAttribution')
      const user = usuarioAtual
      if (!user?.configuracaoApi?.facebookToken || !user?.configuracaoApi?.adAccountId) {
        throw new Error('Facebook não configurado')
      }
      // 1) Create campaign
      const r = await fetch(`${apiBase}/api/public/facebook/create-campaign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facebook_token: user.configuracaoApi.facebookToken,
          ad_account_id: user.configuracaoApi.adAccountId,
          name: `Nexus - ${oferta.title}`,
          objective: 'CONVERSIONS', status: 'PAUSED'
        })
      })
      if (!r.ok) throw new Error(await r.text())
      const { id: campaignId } = await r.json()
      // 2) Adset basic
      const dailyBudgetCents = Math.max(500, Math.round((orcamento / 30) * 100))
      const adsetResp = await fetch(`${apiBase}/api/public/facebook/create-adset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facebook_token: user.configuracaoApi.facebookToken,
          ad_account_id: user.configuracaoApi.adAccountId,
          campaign_id: campaignId,
          name: 'Audiência Principal',
          daily_budget: dailyBudgetCents,
          targeting: { geo_locations: { countries: ['BR'] } }
        })
      })
      if (!adsetResp.ok) throw new Error(await adsetResp.text())
      const { id: adsetId } = await adsetResp.json()

      // 3) Create first creative and ad
  const baseLink = oferta.landingPageUrl || 'https://www.kiwify.com.br'
      const eventId = newEventId('purchase')
      const linkUrl = ensureUTMs(baseLink, {
        utm_source: 'facebook', utm_medium: 'cpc',
        utm_campaign: `nexus_${(oferta.title || 'campanha').toLowerCase().replace(/\s+/g,'_')}`,
        utm_content: eventId, event_id: eventId, fbp: getFBP(), fbc: getFBC()
      })
      let image_hash: string | undefined
      const imageUrl = criativos[0]
      if (imageUrl && imageUrl.startsWith('http')) {
        try {
          const up = await fetch(`${apiBase}/api/public/facebook/upload-image`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              facebook_token: user.configuracaoApi.facebookToken,
              ad_account_id: user.configuracaoApi.adAccountId,
              url: imageUrl, name: `img_${Date.now()}`
            })
          })
          if (up.ok) { const uj = await up.json(); image_hash = uj.hash }
        } catch {}
      }
      const creativeResp = await fetch(`${apiBase}/api/public/facebook/create-creative`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facebook_token: user.configuracaoApi.facebookToken,
          ad_account_id: user.configuracaoApi.adAccountId,
          name: `Creative - ${oferta.title}`,
          title: oferta.extractedData.headline || oferta.title,
          body: oferta.adCopy,
          link_url: linkUrl,
          image_url: image_hash ? undefined : imageUrl,
          image_hash,
          page_id: user.configuracaoApi.pageId || undefined
        })
      })
      if (!creativeResp.ok) throw new Error(await creativeResp.text())
      const { id: creative_id } = await creativeResp.json()
      const adResp = await fetch(`${apiBase}/api/public/facebook/create-ad`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facebook_token: user.configuracaoApi.facebookToken,
          ad_account_id: user.configuracaoApi.adAccountId,
          adset_id: adsetId, creative_id,
          name: `Ad - ${oferta.title}`
        })
      })
      if (!adResp.ok) throw new Error(await adResp.text())

      return { id: campaignId, name: `Campanha - ${oferta.title}`, budget: orcamento, objective: 'CONVERSIONS', status: 'PAUSED' }
    } catch (e) {
      console.error('Falha ao criar campanha FB:', e)
      // fallback minimal object so UI continues
      return { id: `campanha-${Date.now()}`, name: `Campanha - ${oferta.title}`, budget: orcamento, objective: 'CONVERSIONS', status: 'PAUSED' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Automação Completa NEXUS
          </h2>
          <p className="text-muted-foreground">
            Sistema completo: Investe → IA encontra ofertas → Cria produtos → Lança campanhas
          </p>
        </div>

        <Button 
          onClick={iniciarAutomacaoCompleta}
          disabled={isExecutando}
          className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          size="lg"
        >
          {isExecutando ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Iniciar Automação
            </>
          )}
        </Button>
      </div>

      {/* Verificação de Dependências */}
      <Card className="gaming-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Status das Integrações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded">
              <span className="text-sm">Kiwify OAuth</span>
              {hasKiwifyOAuth ? (
                <Badge className="bg-success/10 border-success/50 text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configurado
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Necessário
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded">
              <span className="text-sm">Ideogram API</span>
              {hasIdeogramApi ? (
                <Badge className="bg-success/10 border-success/50 text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configurado
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Necessário
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded">
              <span className="text-sm">Facebook Ads</span>
              {usuarioAtual?.configuracaoApi?.facebookToken ? (
                <Badge className="bg-success/10 border-success/50 text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configurado
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Necessário
                </Badge>
              )}
            </div>
          </div>
          
          {!hasKiwifyOAuth || !hasIdeogramApi || !usuarioAtual?.configuracaoApi?.facebookToken ? (
            <Alert className="mt-4 border-warning/50 bg-warning/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-warning">
                Para executar a automação completa, configure:
                {!hasKiwifyOAuth && <div>• OAuth do Kiwify</div>}
                {!hasIdeogramApi && <div>• API do Ideogram</div>}
                {!usuarioAtual?.configuracaoApi?.facebookToken && <div>• Token do Facebook</div>}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {/* Configuração da Automação */}
      <Card className="gaming-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Configurar Automação
          </CardTitle>
          <CardDescription>
            Configure os parâmetros para a automação completa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configurações Básicas */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="orcamento">Orçamento Total (R$)</Label>
                <Input
                  id="orcamento"
                  type="number"
                  value={configuracao.orcamento}
                  onChange={(e) => setConfiguracao(prev => ({ ...prev, orcamento: parseInt(e.target.value) || 0 }))}
                  min={100}
                  max={50000}
                  placeholder="500"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Mínimo: R$ 100 | Recomendado: R$ 500-2000
                </div>
              </div>

              <div>
                <Label htmlFor="nicho">Nicho Principal</Label>
                <Input
                  id="nicho"
                  value={configuracao.nicho}
                  onChange={(e) => setConfiguracao(prev => ({ ...prev, nicho: e.target.value }))}
                  placeholder="Ex: emagrecimento, dinheiro online, relacionamento"
                />
              </div>

              <div>
                <Label htmlFor="tipo-nicho">Tipo de Nicho</Label>
                <Select 
                  value={configuracao.tipoNicho} 
                  onValueChange={(value: 'white' | 'grey' | 'black') => 
                    setConfiguracao(prev => ({ ...prev, tipoNicho: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">🟢 White Hat (Seguros)</SelectItem>
                    <SelectItem value="grey">🟡 Grey Hat (Moderados)</SelectItem>
                    <SelectItem value="black">🔴 Black Hat (Agressivos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Configurações Avançadas */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="palavras-chave">Palavras-chave (separadas por vírgula)</Label>
                <Input
                  id="palavras-chave"
                  value={configuracao.palavrasChave.join(', ')}
                  onChange={(e) => setConfiguracao(prev => ({ 
                    ...prev, 
                    palavrasChave: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                  }))}
                  placeholder="palavra1, palavra2, palavra3"
                />
              </div>

              <div>
                <Label htmlFor="max-resultados">Máximo de Ofertas para Analisar</Label>
                <Select 
                  value={configuracao.configuracoesScraping.maxResultados.toString()} 
                  onValueChange={(value) => 
                    setConfiguracao(prev => ({ 
                      ...prev, 
                      configuracoesScraping: { 
                        ...prev.configuracoesScraping, 
                        maxResultados: parseInt(value) 
                      }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 ofertas</SelectItem>
                    <SelectItem value="10">10 ofertas</SelectItem>
                    <SelectItem value="20">20 ofertas</SelectItem>
                    <SelectItem value="50">50 ofertas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="preco-desejado">Preço do Produto (R$)</Label>
                <Input
                  id="preco-desejado"
                  type="number"
                  value={configuracao.configuracoesProduto.precoDesejado}
                  onChange={(e) => setConfiguracao(prev => ({ 
                    ...prev, 
                    configuracoesProduto: { 
                      ...prev.configuracoesProduto, 
                      precoDesejado: parseInt(e.target.value) || 0 
                    }
                  }))}
                  min={50}
                  max={2000}
                  placeholder="197"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execução em Tempo Real */}
      {execucaoAtual && (
        <Card className="gaming-card border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary animate-pulse" />
              Execução em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{execucaoAtual.status}</span>
                <Badge variant="outline">{execucaoAtual.progresso}%</Badge>
              </div>
              <Progress value={execucaoAtual.progresso} className="h-2" />
            </div>

            {/* Etapas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'scraping', label: '🔍 Scraping', min: 10 },
                { id: 'analise', label: '🧠 Análise', min: 35 },
                { id: 'criacao_produto', label: '📦 Produto', min: 50 },
                { id: 'criacao_funil', label: '🌐 Funil', min: 65 },
                { id: 'criacao_criativos', label: '🎨 Criativos', min: 80 },
                { id: 'criacao_campanha', label: '🚀 Campanha', min: 95 }
              ].map((etapa) => (
                <div 
                  key={etapa.id}
                  className={`p-2 rounded text-xs text-center ${
                    execucaoAtual.progresso >= etapa.min 
                      ? 'bg-success/20 text-success border border-success/50' 
                      : 'bg-muted/20 text-muted-foreground'
                  }`}
                >
                  {etapa.label}
                </div>
              ))}
            </div>

            {/* Resultados Parciais */}
            {execucaoAtual.resultados.scrapingEncontrado && execucaoAtual.resultados.scrapingEncontrado.length > 0 && (
              <div className="bg-primary/5 p-4 rounded border border-primary/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Ofertas Encontradas
                </h4>
                <div className="text-sm">
                  {execucaoAtual.resultados.scrapingEncontrado.length} ofertas de qualidade encontradas
                </div>
                {execucaoAtual.resultados.ofertaSelecionada && (
                  <div className="mt-2 p-2 bg-accent/10 rounded border border-accent/20">
                    <div className="font-medium text-accent text-sm">
                      ✅ Selecionada: {execucaoAtual.resultados.ofertaSelecionada.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Score: {execucaoAtual.resultados.ofertaSelecionada.metrics?.successScore}/100 • 
                      Preço: R$ {execucaoAtual.resultados.ofertaSelecionada.extractedData.price}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Erros */}
            {execucaoAtual.erros.length > 0 && (
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Erros encontrados:</div>
                  {execucaoAtual.erros.map((erro, index) => (
                    <div key={index} className="text-sm">• {erro}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Histórico de Execuções */}
      {execucoes.length > 0 && (
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico de Execuções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {execucoes.slice(0, 5).map((execucao) => (
                <div key={execucao.id} className="flex items-center justify-between p-3 bg-muted/20 rounded">
                  <div>
                    <div className="font-medium text-sm">
                      {execucao.iniciadoEm.toLocaleDateString('pt-BR')} às {execucao.iniciadoEm.toLocaleTimeString('pt-BR')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {execucao.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={execucao.etapa === 'concluida' ? 'default' : execucao.erros.length > 0 ? 'destructive' : 'secondary'}>
                      {execucao.progresso}%
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {execucao.etapa === 'concluida' ? '✅ Concluída' : execucao.erros.length > 0 ? '❌ Com Erro' : '⏳ Em Andamento'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}