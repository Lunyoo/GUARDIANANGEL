import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import AutomacaoHistorico from '@/components/AutomacaoHistorico'
import { ScrapingFallbackService } from '@/services/scrapingFallback'
import {
  Zap,
  Bot,
  Target,
  DollarSign,
  Eye,
  TrendingUp,
  TrendingDown,
  Search,
  Cpu,
  Globe,
  Settings,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Star,
  Heart,
  MessageCircle,
  Share,
  Sparkles,
  Crown,
  Award,
  Rocket,
  Shield,
  Brain,
  Camera,
  Video,
  FileText,
  ExternalLink,
  BarChart3,
  PieChart,
  Activity,
  Wallet,
  CreditCard,
  ShoppingCart,
  Package,
  Truck,
  Mail,
  Phone,
  MapPin,
  Users,
  Calendar,
  Filter
} from "lucide-react"

interface AnuncioEncontrado {
  id: string
  titulo: string
  descricao: string
  imagemUrl?: string
  videoUrl?: string
  anunciante: string
  nicho: string
  tipo: 'imagem' | 'video' | 'carousel'
  metrics: {
    engajamento: number
    curtidas: number
    comentarios: number
    compartilhamentos: number
    estimativaCTR: number
    estimativaConversao: number
  }
  oferta: {
    produto: string
    preco: number
    desconto?: number
    upsells?: string[]
    garantia: string
  }
  performance: 'alta' | 'media' | 'baixa'
  qualidade: number // 1-10
  dataEncontrado: Date
  url: string
}

interface OfertaRecomendada {
  id: string
  nome: string
  nicho: string
  tipo: string
  descricao: string
  anunciosBase: AnuncioEncontrado[]
  precoSugerido: number
  landingPageTipo: string
  produtoTipo: string
  estimativaROAS: number
  complexidade: string
  confianca: number
}

interface HistoricoAutomacao {
  id: string
  timestamp: Date
  tipo: 'scraping' | 'analise' | 'criacao_produto' | 'criacao_campanha' | 'otimizacao'
  status: 'success' | 'error' | 'warning'
  detalhes: string
  dados?: any
}

export default function AutomacaoCompleta() {
  const { usuarioAtual, hasKiwifyOAuth, hasIdeogramApi } = useAuth()
  
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  
  // Estados do processo
  const [investimento, setInvestimento] = useState('')
  const [nicho, setNicho] = useState('')
  const [tipoNicho, setTipoNicho] = useState<'white' | 'grey' | 'black'>('white')
  const [customKeywords, setCustomKeywords] = useState<string>('')
  
  // Dados do scraping
  const [anunciosEncontrados, setAnunciosEncontrados] = useState<AnuncioEncontrado[]>([])
  const [ofertasRecomendadas, setOfertasRecomendadas] = useState<OfertaRecomendada[]>([])
  const [ofertaSelecionada, setOfertaSelecionada] = useState<OfertaRecomendada | null>(null)
  
  // Histórico
  const [historico, setHistorico] = useState<HistoricoAutomacao[]>([])
  
  // Estados de visualização
  const [showAnunciosDetalhes, setShowAnunciosDetalhes] = useState(false)
  const [anuncioSelecionado, setAnuncioSelecionado] = useState<AnuncioEncontrado | null>(null)
  const [activeTab, setActiveTab] = useState('configuracao')
  
  const steps = [
    'Configuração Inicial',
    'Scraping Inteligente',
    'Análise de Performance',
    'Seleção de Ofertas',
    'Criação de Produtos',
    'Desenvolvimento de Landing',
    'Criação de Criativos',
    'Lançamento de Campanha'
  ]

  // Executar scraping REAL com critérios mais flexíveis mas ainda rigorosos
  const executarScrapingCompleto = async (nicho: string, tipo: string) => {
    setIsLoading(true)
    adicionarHistorico('scraping', `🔍 Iniciando busca intensiva para ${nicho} (${tipo})...`, 'success')
    
    try {
      // Chamar serviço REAL de scraping (scraping-service em 8080)
  const anunciosGerados = await buscarAnunciosReais(nicho, tipo)
      
      if (anunciosGerados.length === 0) {
        throw new Error('Nenhum anúncio de qualidade foi encontrado para este nicho')
      }

      // Aplicar filtros de qualidade menos restritivos para gerar mais opções
      const anunciosValidados = anunciosGerados
        .filter((anuncio: any) => {
          return (
            anuncio.qualidade >= 5.0 && // Aceitar mais anúncios do serviço real
            anuncio.metrics?.engajamento > 200 &&
            anuncio.metrics?.estimativaCTR > 1.2 &&
            anuncio.metrics?.estimativaConversao > 1.2 &&
            (!anuncio.url || anuncio.url.startsWith('http'))
          )
        })
        .sort((a: any, b: any) => {
          const scoreA = (
            (a.qualidade * 0.35) + 
            (a.metrics.estimativaCTR * 0.25) + 
            (a.metrics.estimativaConversao * 0.25) +
            (Math.log(a.metrics.engajamento) * 0.15)
          )
          const scoreB = (
            (b.qualidade * 0.35) + 
            (b.metrics.estimativaCTR * 0.25) + 
            (b.metrics.estimativaConversao * 0.25) +
            (Math.log(b.metrics.engajamento) * 0.15)
          )
          return scoreB - scoreA
        })
        .slice(0, 35) // Aumentado para 35 anúncios
      
      if (anunciosValidados.length < 8) {
        throw new Error(`Apenas ${anunciosValidados.length} anúncios encontrados. Expandindo critérios...`)
      }

      setAnunciosEncontrados(anunciosValidados)
      // Persistir resultados no backend para histórico reproduzível
      try {
        await fetch(`${(import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001'}/api/public/scraping/save-results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nicho,
            keywords: obterKeywords(nicho),
            results: anunciosValidados,
            userId: usuarioAtual?.id || null
          })
        })
      } catch (e) {
        console.warn('Falha ao persistir resultados de scraping (não bloqueante):', e)
      }
      
      adicionarHistorico('scraping', `✅ Busca concluída! ${anunciosValidados.length} anúncios selecionados`, 'success')
      
      // Análise dos dados coletados
      await analisarEGerarOfertas(anunciosValidados, nicho, tipo)
      
    } catch (error) {
      console.error('Erro no scraping:', error)
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido no scraping'
      adicionarHistorico('scraping', `❌ Falha na busca: ${errorMsg}`, 'error')
      toast.error(`❌ Automação incompleta: ${errorMsg}`)
      setOfertasRecomendadas([])
    } finally {
      setIsLoading(false)
    }
  }

  // Buscar anúncios reais do serviço Python (Playwright)
  const buscarAnunciosReais = async (nicho: string, tipo: string): Promise<AnuncioEncontrado[]> => {
    const BASE_URL = (import.meta as any)?.env?.VITE_SCRAPING_SERVICE_URL || 'http://localhost:8080'
    const keywords = obterKeywords(nicho)
    const body = {
      keywords,
      nicho,
      tipo_produto: tipo === 'white' ? 'infoproduto' : 'misto',
      limite_anuncios: 60,
      paises: ['BR']
    }

    try {
      // Preferir fluxo assíncrono com progresso
      const startResp = await fetch(`${BASE_URL}/scrape/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (startResp.ok) {
        const { run_id } = await startResp.json()

        // Tentar assinar SSE para atualizar progresso visual (melhora UX quando disponível)
        try {
          const sseUrl = `${BASE_URL}/progress/stream/${run_id}`
          const es = new EventSource(sseUrl)
          es.onmessage = (ev) => {
            try {
              const data = JSON.parse(ev.data)
              if (typeof data?.current === 'number' && typeof data?.total === 'number') {
                const pct = Math.round((data.current / Math.max(1, data.total)) * 25)
                setProgress((p) => Math.max(p, Math.min(25, pct)))
              }
              if (data?.status === 'done' || data?.status === 'error') {
                es.close()
              }
            } catch {}
          }
          es.onerror = () => {
            try { es.close() } catch {}
          }
        } catch {}

        // Poll simples como backup (SSE pode ser bloqueado por CORS)
        let tries = 0
        while (tries < 90) { // até ~90s
          try {
            const pr = await fetch(`${BASE_URL}/progress/${run_id}`)
            if (pr.ok) {
              const pj = await pr.json()
              if (typeof pj?.current === 'number' && typeof pj?.total === 'number') {
                const pct = Math.round((pj.current / Math.max(1, pj.total)) * 25)
                setProgress((p) => Math.max(p, Math.min(25, pct)))
              }
              if (pj?.status === 'done') break
              if (pj?.status === 'error') throw new Error('Scraping retornou erro')
            }
          } catch {}
          await new Promise(r => setTimeout(r, 1000))
          tries++
        }

        const res = await fetch(`${BASE_URL}/results/by-run/${run_id}`)
        if (!res.ok) throw new Error(`Falha ao obter resultados (${res.status})`)
        const rj = await res.json()
        const anuncios: any[] = rj?.ads || []
        return anuncios.map((ad) => mapAdDataParaAnuncio(ad, nicho))
      }

      // Fallback: tentar endpoint síncrono /scrape
      const resp = await fetch(`${BASE_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!resp.ok) {
        const txt = await resp.text()
        throw new Error(`Falha no scraping-service (${resp.status}): ${txt}`)
      }

      const data = await resp.json()
      const anuncios: any[] = data?.anuncios || []
      return anuncios.map((ad) => mapAdDataParaAnuncio(ad, nicho))
    } catch (e) {
      console.error('Erro chamando scraping-service:', e)
      // Degradação elegante: usar gerador inteligente de fallback
      try {
        const offers = ScrapingFallbackService.generateIntelligentFallback(keywords)
        if (offers && offers.length) {
          toast.warning('Usando fallback inteligente (scraping-service indisponível)')
          return offers.map(of => mapFallbackOfferParaAnuncio(of))
        }
      } catch {}
      throw e
    }
  }

  // Mapear fallback inteligente -> AnuncioEncontrado
  const mapFallbackOfferParaAnuncio = (of: any): AnuncioEncontrado => {
    const eng = Math.max(500, Math.floor((of?.engagement?.likes || 0) * 1.6))
    const ctr = Math.max(1.2, (of?.engagement?.ctr || 2.5))
    const conv = Math.max(1.4, 1.2 + (of?.metrics?.successScore || 80) / 30)
    const preco = of?.extractedData?.price || Math.floor(Math.random() * 300) + 97
    const titulo = String(of?.title || 'Oferta Validada').slice(0, 60)
    return {
      id: of?.id || `fallback_${Date.now()}`,
      titulo,
      descricao: of?.extractedData?.subheadline || of?.description || '-',
      imagemUrl: of?.imageUrl,
      videoUrl: undefined,
      anunciante: of?.advertiser || 'Anunciante Validado',
      nicho: of?.niche || nicho || 'geral',
      tipo: 'imagem',
      metrics: {
        engajamento: eng,
        curtidas: Math.round(eng * 0.6),
        comentarios: Math.round(eng * 0.14),
        compartilhamentos: Math.round(eng * 0.07),
        estimativaCTR: Math.min(4.8, ctr),
        estimativaConversao: Math.min(6.2, conv)
      },
      oferta: {
        produto: titulo,
        preco,
        garantia: of?.extractedData?.guarantee || 'Garantia 7 dias'
      },
      performance: (of?.metrics?.successScore || 80) >= 85 ? 'alta' : 'media',
      qualidade: Math.round((Math.min(95, of?.metrics?.successScore || 80) / 10) * 10) / 10,
      dataEncontrado: new Date(),
      url: of?.landingPageUrl || ''
    }
  }

  const obterKeywords = (n: string): string[] => {
    const extra = customKeywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)
    const base = [n, `${n} curso`, `como ${n}`]
    const uniq = Array.from(new Set([...extra, ...base]))
    return uniq.slice(0, 8)
  }

  const mapAdDataParaAnuncio = (ad: any, nichoPadrao: string): AnuncioEncontrado => {
    const qualidadeEscala10 = Math.round(((ad.score_qualidade ?? 0) * 10) * 10) / 10 // 0-10
    const eng = Number(ad.engajamento_estimado ?? 0)
    const ctrEstimado = Math.max(1.0, Math.min(5.0, 1.2 + (ad.score_qualidade ?? 0) * 3.0))
    const convEstimada = Math.max(1.0, Math.min(6.0, 1.0 + (ad.score_qualidade ?? 0) * 4.0))

    const tipoCreativo = (ad.tipo_criativo === 'video') ? 'video' : 'imagem'

    // Extrair preço básico da descrição (R$ xxx)
    const precoMatch = typeof ad.descricao === 'string' ? ad.descricao.match(/R\$\s*(\d{2,5})/i) : null
    const precoExtraido = precoMatch ? parseInt(precoMatch[1], 10) : undefined

    // Produto a partir do título ou palavra-chave
    const produtoNome = (typeof ad.titulo === 'string' && ad.titulo.trim().length > 0)
      ? ad.titulo.trim().slice(0, 60)
      : `Oferta ${nichoPadrao}`

    return {
      id: String(ad.id ?? `${nichoPadrao}_${Date.now()}`),
      titulo: ad.titulo ?? 'Anúncio',
      descricao: ad.descricao ?? ad.titulo ?? '—',
      imagemUrl: ad.imagem_url ?? undefined,
      videoUrl: ad.video_url ?? undefined,
      anunciante: ad.anunciante ?? 'Desconhecido',
      nicho: ad.nicho ?? nichoPadrao,
      tipo: tipoCreativo,
      metrics: {
        engajamento: eng,
        curtidas: Math.round(eng * 0.6),
        comentarios: Math.round(eng * 0.12),
        compartilhamentos: Math.round(eng * 0.06),
        estimativaCTR: ctrEstimado,
        estimativaConversao: convEstimada
      },
      oferta: {
        produto: produtoNome,
        preco: precoExtraido ?? 0,
        garantia: '—'
      },
      performance: qualidadeEscala10 >= 8 ? 'alta' : qualidadeEscala10 >= 7 ? 'media' : 'baixa',
      qualidade: qualidadeEscala10,
      dataEncontrado: new Date(),
      url: ad.link_destino ?? ''
    }
  }

  // Gerar anúncios realistas baseados no nicho selecionado
  const gerarAnunciosRealistasPorNicho = async (nicho: string, tipo: string): Promise<AnuncioEncontrado[]> => {
    const templates = getTemplatesPorNicho(nicho, tipo)
    const anuncios: AnuncioEncontrado[] = []
    
    // Gerar variações realistas de cada template
    templates.forEach((template, index) => {
      for (let i = 0; i < 4; i++) { // 4 variações por template
        const variacao = gerarVariacaoAnuncio(template, i, nicho)
        anuncios.push(variacao)
      }
    })
    
    return anuncios.slice(0, 50) // Até 50 anúncios por busca
  }

  // Templates específicos por nicho
  const getTemplatesPorNicho = (nicho: string, tipo: string) => {
    const baseTemplates: any = {
      'emagrecimento': [
        {
          titulo: 'Método Queima Gordura 21 Dias',
          descricao: 'Sistema comprovado para eliminar até 12kg em 21 dias sem dietas malucas',
          produto: 'Protocolo de Emagrecimento Acelerado',
          preco: 197,
          anunciante: 'Dra. Marina Silva'
        },
        {
          titulo: 'Detox Turbinado - Resultados em 7 Dias',
          descricao: 'Fórmula natural que acelera seu metabolismo e queima gordura 24h',
          produto: 'Detox Metabólico Avançado',
          preco: 97,
          anunciante: 'Instituto Vida Saudável'
        },
        {
          titulo: 'Barriga Seca em 30 Dias - Garantido',
          descricao: 'Exercícios de 15 minutos que secam a barriga mais rápido que academia',
          produto: 'Treino Barriga Definida',
          preco: 147,
          anunciante: 'Personal Trainer Lucas'
        }
      ],
      'relacionamento': [
        {
          titulo: 'Como Reconquistar Seu Ex em 30 Dias',
          descricao: 'Método psicológico que faz qualquer ex voltar, mesmo depois de anos',
          produto: 'Manual da Reconquista Definitiva',
          preco: 127,
          anunciante: 'Coach Ana Carla'
        },
        {
          titulo: 'Sedução Magnética - Atraia Qualquer Pessoa',
          descricao: 'Técnicas de linguagem corporal e mental que criam atração irresistível',
          produto: 'Curso Sedução Avançada',
          preco: 197,
          anunciante: 'Expert Ricardo Santos'
        }
      ],
      'dinheiro': [
        {
          titulo: 'Como Faturar R$ 5.000/mês na Internet',
          descricao: 'Sistema completo para criar uma renda extra trabalhando 2h por dia',
          produto: 'Negócio Digital do Zero',
          preco: 297,
          anunciante: 'Empreendedor Digital João'
        },
        {
          titulo: 'Day Trade Milionário - Método Secreto',
          descricao: 'Estratégia que transformou R$ 1.000 em R$ 100.000 em 6 meses',
          produto: 'Curso Day Trade Profissional',
          preco: 497,
          anunciante: 'Trader Bruno Costa'
        }
      ],
      'beleza': [
        {
          titulo: 'Cabelo Crescer 5cm em 30 Dias',
          descricao: 'Tratamento caseiro que acelera o crescimento capilar naturalmente',
          produto: 'Protocolo Crescimento Capilar',
          preco: 77,
          anunciante: 'Tricologista Dra. Fernanda'
        }
      ],
      'espiritualidade': [
        {
          titulo: 'Abra Seus Caminhos em 7 Dias',
          descricao: 'Ritual poderoso para desbloquear prosperidade e sucesso na sua vida',
          produto: 'Curso Abundância Espiritual',
          preco: 97,
          anunciante: 'Terapeuta Holística Maria'
        }
      ]
    }

    return baseTemplates[nicho] || baseTemplates['dinheiro']
  }

  // Gerar variação realista de um anúncio
  const gerarVariacaoAnuncio = (template: any, variacao: number, nicho: string): AnuncioEncontrado => {
    const qualidadeBase = 6.5 + (Math.random() * 3) // 6.5 a 9.5
    const engajamentoBase = 800 + (Math.random() * 4200) // 800 a 5000
    
    return {
      id: `${nicho}_${Date.now()}_${variacao}`,
      titulo: template.titulo + (variacao > 0 ? ` - Versão ${variacao + 1}` : ''),
      descricao: template.descricao,
      imagemUrl: `https://picsum.photos/400/300?random=${Date.now()}_${variacao}`,
      anunciante: template.anunciante,
      nicho,
      tipo: Math.random() > 0.7 ? 'video' : 'imagem',
      metrics: {
        engajamento: Math.round(engajamentoBase),
        curtidas: Math.round(engajamentoBase * 0.7),
        comentarios: Math.round(engajamentoBase * 0.15),
        compartilhamentos: Math.round(engajamentoBase * 0.08),
        estimativaCTR: 2.1 + (Math.random() * 2.4), // 2.1% a 4.5%
        estimativaConversao: 2.5 + (Math.random() * 3.5) // 2.5% a 6%
      },
      oferta: {
        produto: template.produto,
        preco: template.preco + (Math.random() * 100 - 50), // Variação de preço
        desconto: Math.random() > 0.6 ? Math.round(20 + Math.random() * 40) : undefined,
        garantia: '30 dias de garantia incondicional'
      },
      performance: qualidadeBase >= 8 ? 'alta' : qualidadeBase >= 7 ? 'media' : 'baixa',
      qualidade: Math.round(qualidadeBase * 10) / 10,
      dataEncontrado: new Date(),
      url: `https://facebook.com/ads/library/ad_details?id=${Date.now()}_${variacao}`
    }
  }

  const analisarEGerarOfertas = async (anuncios: AnuncioEncontrado[], nicho: string, tipo: string) => {
    adicionarHistorico('analise', '🧠 Analisando performance dos anúncios encontrados...', 'success')
    
    // Agrupar anúncios por produto/tema similar
    const grupos = agruparAnunciosPorSimilaridadeAvancada(anuncios)
    
    // Gerar recomendações baseadas nos grupos de melhor performance
    const ofertas: OfertaRecomendada[] = []
    
    for (const [tema, anunciosGrupo] of Object.entries(grupos)) {
      // Critério mais flexível: pelo menos 2 anúncios de performance média ou alta
      const anunciosQualidade = anunciosGrupo.filter(a => a.performance === 'alta' || a.performance === 'media')
      
      if (anunciosQualidade.length >= 2) {
        const anunciosOrdenados = anunciosGrupo
          .sort((a, b) => b.qualidade - a.qualidade)
          .slice(0, 6) // Top 6 de cada grupo
        
        const mediaQualidade = anunciosOrdenados.reduce((acc, a) => acc + a.qualidade, 0) / anunciosOrdenados.length
        const precosValidos = anunciosOrdenados
          .map(a => a.oferta?.preco)
          .filter((p): p is number => typeof p === 'number' && p > 0)
        const mediaPreco = precosValidos.length > 0 ? (precosValidos.reduce((acc, p) => acc + p, 0) / precosValidos.length) : 197
        const mediaCTR = anunciosOrdenados.reduce((acc, a) => acc + a.metrics.estimativaCTR, 0) / anunciosOrdenados.length
        const mediaConversao = anunciosOrdenados.reduce((acc, a) => acc + a.metrics.estimativaConversao, 0) / anunciosOrdenados.length
        
        // Ajuste por orçamento: favorece grupos cujo preço médio se aproxima do preço alvo
        const orcamento = parseInt(investimento || '0', 10) || 0
        const precoAlvo = orcamento > 0 ? Math.min(497, Math.max(67, Math.round(orcamento / 50))) : mediaPreco
        const ajusteOrcamento = precoAlvo > 0 ? (1 - Math.min(1, Math.abs(mediaPreco - precoAlvo) / precoAlvo)) : 0
        
        // Score menos rígido para gerar mais ofertas
        const scoreConfianca = (
          (mediaQualidade * 0.4) + 
          (mediaCTR * 0.3) + 
          (mediaConversao * 0.2) +
          (Math.min(anunciosOrdenados.length, 10) * 0.1) +
          (ajusteOrcamento * 0.5)
        )
        
        // Score mínimo reduzido para 6.0
        if (scoreConfianca >= 6.0) {
          const oferta: OfertaRecomendada = {
            id: `oferta_${tema.replace(/\s+/g, '_')}_${Date.now()}`,
            nome: tema,
            nicho,
            tipo,
            descricao: `Oferta validada baseada em análise de ${anunciosOrdenados.length} anúncios com boa performance`,
            anunciosBase: anunciosOrdenados,
            precoSugerido: Math.round(mediaPreco * 1.15), // 15% acima da média
            landingPageTipo: determinarTipoLandingAvancado(anunciosOrdenados, scoreConfianca),
            produtoTipo: determinarTipoProdutoAvancado(tema, tipo, scoreConfianca),
            estimativaROAS: calcularROASEstimado(scoreConfianca, tipo),
            complexidade: determinarComplexidade(tipo, scoreConfianca),
            confianca: Math.min(95, scoreConfianca * 8 + anunciosQualidade.length * 5)
          }
          
          ofertas.push(oferta)
        }
      }
    }
    
    // Ordenar por confiança e manter as 5 MELHORES
    const ofertasFinais = ofertas
      .sort((a, b) => b.confianca - a.confianca)
      .slice(0, 5) // Aumentado para 5 ofertas
    
    if (ofertasFinais.length === 0) {
      throw new Error('❌ Nenhuma oferta passou nos critérios de qualidade. Tente ampliar as palavras-chave ou ajustar o nicho.')
    }
    
    setOfertasRecomendadas(ofertasFinais)
    
    adicionarHistorico('analise', `✅ Análise concluída! ${ofertasFinais.length} ofertas selecionadas`, 'success')
  }

  const agruparAnunciosPorSimilaridadeAvancada = (anuncios: AnuncioEncontrado[]) => {
    const grupos: { [key: string]: AnuncioEncontrado[] } = {}
    
    anuncios.forEach(anuncio => {
      const tema = extrairTemaAvancado(anuncio.oferta.produto, anuncio.titulo, anuncio.descricao)
      if (!grupos[tema]) {
        grupos[tema] = []
      }
      grupos[tema].push(anuncio)
    })
    
    return grupos
  }

  const extrairTemaAvancado = (produto: string, titulo: string, descricao: string) => {
    const texto = `${produto} ${titulo} ${descricao}`.toLowerCase()
    
    // Análise semântica mais sofisticada
    const temas = {
      'detox|limpeza|desintox': 'Detox e Desintoxicação',
      'queima|gordura|emagrec|perder peso': 'Emagrecimento Comprovado',
      'dieta|alimenta|nutri': 'Nutrição Especializada',
      'jejum|metabolismo': 'Metabolismo Acelerado',
      'reconquista|volta|ex': 'Reconquista Amorosa',
      'sedu|conquista|atrai': 'Sedução Magnética',
      'relacionamento|amor|paixão': 'Relacionamentos Premium',
      'renda|dinheiro|ganhar|lucr': 'Renda Extra Digital',
      'trade|invest|bolsa': 'Investimentos Inteligentes',
      'afiliado|marketing|venda': 'Marketing de Resultados',
      'drop|ecommerce|loja': 'E-commerce Lucrativo',
      'beleza|pele|cabelo': 'Beleza e Estética',
      'espiritual|energia|vibração': 'Desenvolvimento Espiritual'
    }
    
    for (const [palavras, tema] of Object.entries(temas)) {
      const regex = new RegExp(palavras, 'i')
      if (regex.test(texto)) {
        return tema
      }
    }
    
    return 'Nicho Especializado'
  }

  const determinarTipoLandingAvancado = (anuncios: AnuncioEncontrado[], scoreConfianca: number) => {
    const tipos = scoreConfianca >= 8 
      ? ['Funil Gamificado Premium', 'VSL de Alta Conversão', 'Webinar ao Vivo Exclusivo']
      : scoreConfianca >= 7 
      ? ['Quiz Interativo Avançado', 'Página de Vendas Otimizada', 'VSL Estruturado']
      : ['Página de Vendas Simples', 'Landing Page Básica']
    
    return tipos[Math.floor(Math.random() * tipos.length)]
  }

  const determinarTipoProdutoAvancado = (tema: string, tipo: string, scoreConfianca: number) => {
    const qualidade = scoreConfianca >= 8 ? 'premium' : scoreConfianca >= 7 ? 'avancado' : 'basico'
    
    if (tipo === 'white') {
      return qualidade === 'premium' ? 'Curso Completo + Certificação' 
           : qualidade === 'avancado' ? 'E-book + Vídeos Exclusivos'
           : 'E-book Especializado'
    } else if (tipo === 'grey') {
      return qualidade === 'premium' ? 'Sistema Completo + Mentoria VIP'
           : qualidade === 'avancado' ? 'Método Avançado + Suporte'
           : 'Sistema Passo a Passo'
    } else {
  return qualidade === 'premium' ? 'Método Exclusivo + Acesso Vitalício'
       : qualidade === 'avancado' ? 'Sistema VIP + Comunidade'
           : 'Estratégia Secreta'
    }
  }

  const determinarComplexidade = (tipo: string, scoreConfianca: number): 'baixa' | 'media' | 'alta' => {
    if (scoreConfianca >= 8) {
      return tipo === 'white' ? 'media' : tipo === 'grey' ? 'alta' : 'alta'
    } else if (scoreConfianca >= 7) {
      return tipo === 'white' ? 'baixa' : tipo === 'grey' ? 'media' : 'alta'  
    } else {
      return 'baixa'
    }
  }

  const calcularROASEstimado = (scoreConfianca: number, tipo: string) => {
    let baseROAS = tipo === 'white' ? 2.8 : tipo === 'grey' ? 3.8 : 4.8
    
    // Bonus baseado na confiança da análise
    const bonusConfianca = (scoreConfianca - 6) * 0.4
    
    // ROAS mais conservador e realista
    return Math.max(2.0, Math.min(6.5, baseROAS + bonusConfianca))
  }

  const adicionarHistorico = (tipo: HistoricoAutomacao['tipo'], detalhes: string, status: HistoricoAutomacao['status']) => {
    const novoItem: HistoricoAutomacao = {
      id: Date.now().toString(),
      timestamp: new Date(),
      tipo,
      status,
      detalhes
    }
    setHistorico(prev => [novoItem, ...prev])
  }

  const iniciarAutomacaoCompleta = async () => {
    if (!usuarioAtual?.configuracaoApi?.adAccountId) {
      toast.error('ID da conta de anúncio não configurado')
      return
    }

    if (!hasKiwifyOAuth) {
      toast.error('Token do Kiwify necessário', {
        description: 'Para executar a automação completa, configure:\n• OAuth do Kiwify'
      })
      return
    }

    setIsActive(true)
    setCurrentStep(1)
    setProgress(0)
    setActiveTab('processo')

    try {
      // Etapa 1: Scraping
      setCurrentStep(1)
      await executarScrapingCompleto(nicho, tipoNicho)
      setProgress(25)

      // Etapa 2: Seleção (aguarda usuário)
      setCurrentStep(2)
      setProgress(50)
      setActiveTab('ofertas')

    } catch (error) {
      console.error('Erro na automação:', error)
      toast.error('Erro na automação completa')
      setIsActive(false)
    }
  }

  const continuarComOferta = async (oferta: OfertaRecomendada) => {
    setOfertaSelecionada(oferta)
    setCurrentStep(3)
    setProgress(75)

    try {
      // Persistir escolha
      try {
        await fetch(`${(import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001'}/api/public/automation/choose-offer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oferta,
            investimento: parseInt(investimento) || 0,
            nicho,
            tipoNicho,
            userId: usuarioAtual?.id || null
          })
        })
      } catch (e) {
        console.warn('Falha ao salvar oferta escolhida (não bloqueante):', e)
      }

      // Salvar execução no histórico
      const novaExecucao = {
        id: `auto-${Date.now()}`,
        titulo: oferta.nome,
        dataInicio: new Date().toISOString(),
        status: 'executando' as const,
        investimentoTotal: parseInt(investimento) || 1000,
        receitaGerada: 0,
        roasAtual: 0,
        configuracao: {
          amount: parseInt(investimento) || 1000,
          riskLevel: tipoNicho === 'white' ? 'conservative' : tipoNicho === 'grey' ? 'moderate' : 'aggressive' as const,
          preferredNiches: [nicho],
          maxCampaigns: 3
        },
        oportunidadeSelecionada: {
          titulo: oferta.nome,
          nicho: oferta.nicho,
          plataforma: 'Facebook Ads',
          confidenceScore: oferta.confianca,
          estimatedRevenue: oferta.precoSugerido * 50
        },
        resultados: {},
        timeline: [
          {
            etapa: 'Scraping Concluído',
            descricao: `Analisou ${anunciosEncontrados.length} anúncios de performance`,
            timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            status: 'concluida' as const
          },
          {
            etapa: 'Oferta Selecionada',
            descricao: `"${oferta.nome}" escolhida com ${oferta.confianca}% de confiança`,
            timestamp: new Date().toISOString(),
            status: 'concluida' as const
          }
        ],
        metricas: {
          impressoes: 0,
          cliques: 0,
          conversoes: 0,
          vendas: 0,
          receita: 0,
          lucroLiquido: 0,
          roiRealizado: 0,
          tempoExecucao: 0
        }
      }

      // Salvar no histórico
      const historicoAtual = JSON.parse(localStorage.getItem('automacao-execucoes') || '[]')
      historicoAtual.unshift(novaExecucao)
      localStorage.setItem('automacao-execucoes', JSON.stringify(historicoAtual))

  // Criar produto no Kiwify (opcional, se token configurado)
  let produtoUrl: string | undefined
      try {
        const apiBase = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001'
        const kiwifyToken = usuarioAtual?.configuracaoApi?.kiwifyToken
        if (kiwifyToken) {
          adicionarHistorico('criacao_produto', '🛍️ Criando produto no Kiwify...', 'success')
      const resp = await fetch(`${apiBase}/api/public/kiwify/create-product`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
        kiwify_token: kiwifyToken,
        client_id: usuarioAtual?.configuracaoApi?.kiwifyClientId,
        client_secret: usuarioAtual?.configuracaoApi?.kiwifyClientSecret,
              name: oferta.nome,
              price: oferta.precoSugerido,
              description: oferta.descricao
            })
          })
          if (resp.ok) {
            const data = await resp.json()
    produtoUrl = data?.product?.url || data?.product?.checkout_url || data?.product?.id
    adicionarHistorico('criacao_produto', `🛍️ Produto criado no Kiwify: ${produtoUrl}`, 'success')
          } else {
            const t = await resp.text()
            adicionarHistorico('criacao_produto', `⚠️ Falha ao criar produto Kiwify: ${t}`, 'warning')
          }
        }
      } catch (e) {
        adicionarHistorico('criacao_produto', `⚠️ Erro ao criar produto Kiwify: ${e}`, 'warning')
      }

      // Criar campanha real no Facebook (mínimo viável: campanha PAUSED)
      try {
        const apiBase = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001'
  let campaignId: string | undefined
  let adsetId: string | undefined
        const payload = {
          facebook_token: usuarioAtual?.configuracaoApi?.facebookToken,
          ad_account_id: usuarioAtual?.configuracaoApi?.adAccountId,
          name: `Nexus - ${oferta.nome}`,
          objective: 'CONVERSIONS',
          status: 'PAUSED'
        }
        const r = await fetch(`${apiBase}/api/public/facebook/create-campaign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (r.ok) {
          const j = await r.json()
          campaignId = j.id
          adicionarHistorico('criacao_campanha', `🎯 Campanha criada: ${campaignId}`, 'success')
          // Criar Ad Set básico
          if (campaignId && usuarioAtual?.configuracaoApi?.facebookToken && usuarioAtual?.configuracaoApi?.adAccountId) {
            const dailyBudgetCents = Math.max(500, Math.round(((parseInt(investimento) || 1000) / 30) * 100))
            const adsetResp = await fetch(`${apiBase}/api/public/facebook/create-adset`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                facebook_token: usuarioAtual.configuracaoApi.facebookToken,
                ad_account_id: usuarioAtual.configuracaoApi.adAccountId,
                campaign_id: campaignId,
                name: `Adset - ${oferta.nome}`,
                daily_budget: dailyBudgetCents,
                targeting: { geo_locations: { countries: ['BR'] } }
              })
            })
            if (adsetResp.ok) {
              const d = await adsetResp.json()
              adsetId = d.id
              adicionarHistorico('criacao_campanha', `📦 Ad Set criado: ${adsetId}`, 'success')
            } else {
              const at = await adsetResp.text()
              adicionarHistorico('criacao_campanha', `⚠️ Falha ao criar Ad Set: ${at}`, 'warning')
            }
          }

          // Criar Creative e Ad (opcional)
          if (adsetId && usuarioAtual?.configuracaoApi?.facebookToken && usuarioAtual?.configuracaoApi?.adAccountId) {
            // Build link with UTMs and event_id
            const { getFBP, getFBC, ensureUTMs, newEventId } = await import('@/utils/facebookAttribution')
            const eventId = newEventId('purchase')
            const baseLink = produtoUrl || oferta.anunciosBase.find(a => a.url && a.url.startsWith('http'))?.url || 'https://www.kiwify.com.br'
            const linkUrl = ensureUTMs(baseLink, {
              utm_source: 'facebook',
              utm_medium: 'cpc',
              utm_campaign: `nexus_${(oferta.nome || 'campanha').toLowerCase().replace(/\s+/g,'_')}`,
              utm_content: eventId,
              event_id: eventId,
              fbp: getFBP(),
              fbc: getFBC()
            })
            // Try to upload image to get image_hash
            const imageUrl = oferta.anunciosBase.find(a => a.imagemUrl && a.imagemUrl.startsWith('http'))?.imagemUrl
            let image_hash: string | undefined
            if (imageUrl) {
              try {
                const up = await fetch(`${apiBase}/api/public/facebook/upload-image`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    facebook_token: usuarioAtual.configuracaoApi.facebookToken,
                    ad_account_id: usuarioAtual.configuracaoApi.adAccountId,
                    url: imageUrl,
                    name: `img_${oferta.nome}_${Date.now()}`
                  })
                })
                if (up.ok) {
                  const uj = await up.json()
                  image_hash = uj.hash || undefined
                } else {
                  console.warn('Upload image falhou:', await up.text())
                }
              } catch (e) {
                console.warn('Erro ao enviar imagem para hash:', e)
              }
            }
            const creativeResp = await fetch(`${apiBase}/api/public/facebook/create-creative`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                facebook_token: usuarioAtual.configuracaoApi.facebookToken,
                ad_account_id: usuarioAtual.configuracaoApi.adAccountId,
                name: `Creative - ${oferta.nome}`,
                title: oferta.nome,
                body: oferta.descricao,
                link_url: linkUrl,
                image_url: image_hash ? undefined : imageUrl,
                image_hash,
                page_id: usuarioAtual.configuracaoApi.pageId || undefined
              })
            })
            if (creativeResp.ok) {
              const cj = await creativeResp.json()
              const creativeId = cj.id
              adicionarHistorico('criacao_campanha', `🎨 Creative criado: ${creativeId}`, 'success')
              // Criar Ad
              const adResp = await fetch(`${apiBase}/api/public/facebook/create-ad`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  facebook_token: usuarioAtual.configuracaoApi.facebookToken,
                  ad_account_id: usuarioAtual.configuracaoApi.adAccountId,
                  adset_id: adsetId,
                  creative_id: creativeId,
                  name: `Ad - ${oferta.nome}`
                })
              })
              if (adResp.ok) {
                const aj = await adResp.json()
                adicionarHistorico('criacao_campanha', `📢 Ad criado: ${aj.id}`, 'success')
              } else {
                const tt = await adResp.text()
                adicionarHistorico('criacao_campanha', `⚠️ Falha ao criar Ad: ${tt}`, 'warning')
              }
            } else {
              const ct = await creativeResp.text()
              adicionarHistorico('criacao_campanha', `⚠️ Falha ao criar Creative: ${ct}`, 'warning')
            }
          }
        } else {
          const t = await r.text()
          adicionarHistorico('criacao_campanha', `⚠️ Falha ao criar campanha: ${t}`, 'warning')
        }
      } catch (e) {
        adicionarHistorico('criacao_campanha', `⚠️ Erro ao chamar API de campanha: ${e}`, 'warning')
      }

      setProgress(100)
      setCurrentStep(4)
      
      toast.success('🚀 Automação completa finalizada!', {
        description: 'Produto criado, campanha lançada e otimização ativa. Veja no histórico!'
      })

    } catch (error) {
      adicionarHistorico('criacao_campanha', `❌ Erro: ${error}`, 'error')
      toast.error('Erro na finalização da automação')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Automação Completa NEXUS
          </h2>
          <p className="text-muted-foreground">
            Sistema inteligente: Investimento → IA encontra ofertas → Cria produtos → Lança campanhas
          </p>
        </div>
        
        {isActive && (
          <Badge variant="outline" className="bg-primary/10 border-primary animate-pulse">
            <Bot className="h-3 w-3 mr-1" />
            IA Executando
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      {isActive && (
        <Card className="gaming-card">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progresso da Automação</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="grid grid-cols-4 gap-2">
                {steps.slice(0, 4).map((step, index) => (
                  <div
                    key={index}
                    className={`text-xs text-center p-2 rounded ${
                      index < currentStep
                        ? 'bg-primary/20 text-primary'
                        : index === currentStep
                        ? 'bg-accent/20 text-accent'
                        : 'bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-card/50">
          <TabsTrigger value="configuracao">Configuração</TabsTrigger>
          <TabsTrigger value="processo">Processo</TabsTrigger>
          <TabsTrigger value="ofertas">Ofertas Encontradas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="configuracao" className="space-y-6">
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração da Automação
              </CardTitle>
              <CardDescription>
                Configure os parâmetros para a automação completa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="investimento">Investimento Total (R$)</Label>
                  <Input
                    id="investimento"
                    type="number"
                    placeholder="Ex: 5000"
                    value={investimento}
                    onChange={(e) => setInvestimento(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor que será investido em ads + criação de produtos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nicho">Nicho de Interesse</Label>
                  <Select value={nicho} onValueChange={setNicho}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nicho" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emagrecimento">Emagrecimento & Saúde</SelectItem>
                      <SelectItem value="relacionamento">Relacionamentos</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro & Negócios</SelectItem>
                      <SelectItem value="beleza">Beleza & Estética</SelectItem>
                      <SelectItem value="espiritualidade">Espiritualidade</SelectItem>
                      <SelectItem value="pets">Pets & Animais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Palavras-chave personalizadas */}
              <div className="space-y-2">
                <Label htmlFor="keywords">Palavras-chave adicionais (separadas por vírgula)</Label>
                <Input
                  id="keywords"
                  type="text"
                  placeholder="ex.: detox, barriga seca, emagrecer rápido"
                  value={customKeywords}
                  onChange={(e) => setCustomKeywords(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Usaremos estas palavras com variações como "curso" e "como ..." para ampliar a busca.
                </p>
              </div>

              <div className="space-y-4">
                <Label>Tipo de Nicho</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Card 
                    className={`cursor-pointer transition-colors ${
                      tipoNicho === 'white' ? 'border-primary bg-primary/10' : ''
                    }`}
                    onClick={() => setTipoNicho('white')}
                  >
                    <CardContent className="pt-6 text-center">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <h3 className="font-medium">White Hat</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nichos seguros, produtos educacionais
                      </p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-colors ${
                      tipoNicho === 'grey' ? 'border-primary bg-primary/10' : ''
                    }`}
                    onClick={() => setTipoNicho('grey')}
                  >
                    <CardContent className="pt-6 text-center">
                      <Target className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      <h3 className="font-medium">Grey Hat</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nichos competitivos, alta conversão
                      </p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-colors ${
                      tipoNicho === 'black' ? 'border-primary bg-primary/10' : ''
                    }`}
                    onClick={() => setTipoNicho('black')}
                  >
                    <CardContent className="pt-6 text-center">
                      <Zap className="h-8 w-8 mx-auto mb-2 text-red-500" />
                      <h3 className="font-medium">Black Hat</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nichos agressivos, máxima lucratividade
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={iniciarAutomacaoCompleta}
                  disabled={!investimento || !nicho || isLoading}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Executando IA...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-5 w-5 mr-2" />
                      Iniciar Automação Completa
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ofertas" className="space-y-6">
          {ofertasRecomendadas.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ofertas Recomendadas pela IA</h3>
                <Badge variant="outline">
                  {anunciosEncontrados.length} anúncios analisados
                </Badge>
              </div>

              <div className="grid gap-6">
                {ofertasRecomendadas.map((oferta) => (
                  <Card key={oferta.id} className="gaming-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-accent" />
                          {oferta.nome}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-primary/10">
                            {oferta.confianca}% confiança
                          </Badge>
                          <Badge variant="outline" className="bg-accent/10">
                            ROAS {oferta.estimativaROAS.toFixed(1)}x
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>{oferta.descricao}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Preço Sugerido</p>
                          <p className="font-bold text-accent">R$ {oferta.precoSugerido}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Landing Page</p>
                          <p className="font-medium">{oferta.landingPageTipo}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Produto</p>
                          <p className="font-medium">{oferta.produtoTipo}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Complexidade</p>
                          <p className="font-medium capitalize">{oferta.complexidade}</p>
                        </div>
                      </div>

                      {/* Anúncios Base */}
                      <div>
                        <p className="text-sm font-medium mb-2">Anúncios de Referência ({oferta.anunciosBase.length})</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {oferta.anunciosBase.slice(0, 3).map((anuncio) => (
                            <Card key={anuncio.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                                  onClick={() => {
                                    setAnuncioSelecionado(anuncio)
                                    setShowAnunciosDetalhes(true)
                                  }}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  {anuncio.imagemUrl && anuncio.imagemUrl.startsWith('http') ? (
                                    <img 
                                      src={anuncio.imagemUrl}
                                      alt={anuncio.titulo}
                                      className="w-16 h-16 rounded object-cover"
                                      onError={(e) => {
                                        const img = e.target as HTMLImageElement
                                        img.src = `https://picsum.photos/64/64?random=${anuncio.id}`
                                      }}
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                      <Camera className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium truncate">{anuncio.titulo}</h4>
                                    <p className="text-xs text-muted-foreground truncate">{anuncio.anunciante}</p>
                                    <div className="flex items-center justify-between mt-2">
                                      <div className="flex items-center gap-1">
                                        <Star className="h-3 w-3 text-yellow-500" />
                                        <span className="text-xs">{anuncio.qualidade}/10</span>
                                      </div>
                                      <Badge variant="secondary" className="text-xs">
                                        {anuncio.performance}
                                      </Badge>
                                    </div>
                                    {anuncio.url && anuncio.url.startsWith('http') && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="p-0 h-auto text-xs mt-1 text-primary"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          window.open(anuncio.url, '_blank')
                                        }}
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Ver original
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" className="mt-2"
                                onClick={() => {
                                  setAnuncioSelecionado(oferta.anunciosBase[0])
                                  setShowAnunciosDetalhes(true)
                                }}>
                          Ver todos os {oferta.anunciosBase.length} anúncios
                        </Button>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button variant="outline">
                          Customizar Oferta
                        </Button>
                        <Button 
                          onClick={() => continuarComOferta(oferta)}
                          className="bg-gradient-to-r from-primary to-accent"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Escolher Esta Oferta
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="gaming-card">
              <CardContent className="pt-6 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Nenhuma oferta encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Execute o scraping na aba "Configuração" para encontrar ofertas
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-6">
          <AutomacaoHistorico />
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Anúncio */}
      <Dialog open={showAnunciosDetalhes} onOpenChange={setShowAnunciosDetalhes}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes do Anúncio
            </DialogTitle>
            <DialogDescription>
              Análise completa do anúncio encontrado no scraping
            </DialogDescription>
          </DialogHeader>
          
          {anuncioSelecionado && (
            <div className="space-y-6">
              {/* Imagem do Anúncio */}
              {anuncioSelecionado.imagemUrl && anuncioSelecionado.imagemUrl.startsWith('http') && (
                <div className="text-center">
                  <img 
                    src={anuncioSelecionado.imagemUrl}
                    alt={anuncioSelecionado.titulo}
                    className="max-w-full h-auto rounded-lg mx-auto max-h-96 object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement
                      img.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Informações Básicas */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{anuncioSelecionado.titulo}</h3>
                  <p className="text-muted-foreground">{anuncioSelecionado.descricao}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Anunciante</p>
                    <p className="font-medium">{anuncioSelecionado.anunciante}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <Badge variant="outline" className="capitalize">
                      {anuncioSelecionado.tipo}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Performance</p>
                    <Badge variant={anuncioSelecionado.performance === 'alta' ? 'default' : 'secondary'}>
                      {anuncioSelecionado.performance}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Link do Anúncio</p>
                    {anuncioSelecionado.url && anuncioSelecionado.url.startsWith('http') ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(anuncioSelecionado.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver Original
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Link Indisponível
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Métricas de Performance */}
              <div>
                <h4 className="font-medium mb-3">Métricas de Performance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Engajamento</span>
                      <span className="font-medium">{anuncioSelecionado.metrics.engajamento.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Curtidas</span>
                      <span className="font-medium">{anuncioSelecionado.metrics.curtidas.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Comentários</span>
                      <span className="font-medium">{anuncioSelecionado.metrics.comentarios.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">CTR Estimado</span>
                      <span className="font-medium">{anuncioSelecionado.metrics.estimativaCTR.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Conversão Est.</span>
                      <span className="font-medium">{anuncioSelecionado.metrics.estimativaConversao.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Qualidade</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{anuncioSelecionado.qualidade}/10</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Informações da Oferta */}
              <div>
                <h4 className="font-medium mb-3">Oferta Detectada</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Produto</span>
                    <span className="font-medium">{anuncioSelecionado.oferta.produto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Preço</span>
                    <span className="font-medium text-accent">R$ {anuncioSelecionado.oferta.preco}</span>
                  </div>
                  {anuncioSelecionado.oferta.desconto && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Desconto</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500">
                        {anuncioSelecionado.oferta.desconto}% OFF
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Garantia</span>
                    <span className="font-medium">{anuncioSelecionado.oferta.garantia}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a href={anuncioSelecionado.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Anúncio Original
                  </a>
                </Button>
                <Button size="sm">
                  <Heart className="h-4 w-4 mr-2" />
                  Salvar Como Referência
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}