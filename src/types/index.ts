export interface Usuario {
  id: string
  email: string
  nome: string
  nivel: number
  experiencia: number
  isAdmin: boolean
  avatarUrl?: string
  configuracaoApi?: ConfiguracaoApi
  configuracaoAutomacao?: ConfiguracaoAutomacao
  criadoEm: string
}

export interface RealScrapedOffer {
  id: string
  title: string
  niche: string
  platform: string
  advertiser: string
  adCopy: string
  imageUrl?: string
  videoUrl?: string
  landingPageUrl: string
  estimatedBudget: number
  engagement: {
    ctr?: number
    comments?: number
    shares?: number
    likes?: number
  }
  extractedData: {
    headline: string
    benefits: string[]
    price: number
    guarantee?: string
    urgency?: string
    socialProof?: string
  }
  metrics?: {
    successScore: number
    potentialRevenue: number
    competitionLevel: 'low' | 'medium' | 'high'
    trendScore: number
  }
  metadata?: {
    scrapedAt: string
    dataQuality: 'high' | 'medium' | 'low'
    confidence: number
  }
}

export interface MetricasCampanha {
  id: string
  nome: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
  impressoes: number
  cliques: number
  conversoes: number
  gasto: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
  alcance: number
  frequencia: number
  nicho?: 'BLACK' | 'GREY' | 'WHITE'
  automatizada?: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface Criativo {
  id: string
  campanhaId: string
  nome: string
  tipo: 'IMAGE' | 'VIDEO' | 'CAROUSEL'
  urlMidia: string
  titulo?: string
  descricao?: string
  textoAnuncio?: string
  callToAction?: string
  linkDestino?: string
  metricas: {
    impressoes: number
    cliques: number
    conversoes: number
    gasto: number
    ctr: number
    cpc: number
    cpa: number
    roas: number
  }
  scorePreditivo?: number
  insights?: string[]
  geradoPorIA?: boolean
  ofertaOrigem?: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED'
  criadoEm: string
}

export interface InsightPreditivo {
  id: string
  tipo: 'OTIMIZACAO' | 'ALERTA' | 'OPORTUNIDADE'
  titulo: string
  descricao: string
  impactoEstimado: number
  confianca: number
  acoes: string[]
  criadoEm: string
}

export interface CriativoIA {
  id: string
  prompt: string
  configuracao: {
    estilo: 'MINIMALISTA' | 'GAMER' | 'CORPORATIVO' | 'MODERNO' | 'VIBRANTE'
    cores: string[]
    elementos: string[]
    proporcao: '1:1' | '16:9' | '9:16' | '4:5'
    qualidade: 'DRAFT' | 'STANDARD' | 'HIGH' | 'ULTRA'
  }
  resultado?: {
    url: string
    urlThumb?: string
    metadata: {
      largura: number
      altura: number
      formato: string
      tamanho: number
    }
  }
  analise: {
    scorePreditivo: number
    elementosDetectados: string[]
    sugestoesMelhoria: string[]
    compatibilidadePlataforma: {
      facebook: number
      instagram: number
      google: number
    }
  }
  status: 'PENDENTE' | 'GERANDO' | 'CONCLUIDO' | 'ERRO'
  tempoGeracao?: number
  custoCreditos: number
  nicho?: 'BLACK' | 'GREY' | 'WHITE'
  campanhaDestino?: string
  criadoEm: string
  atualizadoEm: string
}

export interface AnalisePerformance {
  id: string
  criativoId: string
  metricas: {
    engajamento: number
    conversaoEstimada: number
    ctrPrevisto: number
    roasPrevisto: number
    qualidadeVisual: number
    apelEmocional: number
  }
  comparativo: {
    mediaSetor: number
    mediaUsuario: number
    melhorPerformance: number
  }
  insights: {
    pontosFavoraveis: string[]
    areasRisco: string[]
    recomendacoes: string[]
  }
  tendencias: {
    sazonal: number
    nicho: number
    demografica: Record<string, number>
  }
  confiabilidade: number
  atualizadoEm: string
}

export interface GeradorCriativo {
  id: string
  nome: string
  descricao: string
  nicho: 'BLACK' | 'GREY' | 'WHITE'
  configuracao: {
    templateBase: string
    variantes: number
    testesAB: boolean
    otimizacaoAutomatica: boolean
  }
  regras: {
    palavrasChave: string[]
    elementosObrigatorios: string[]
    estiloVisual: string[]
    restricoes: string[]
  }
  historico: {
    criativosGerados: number
    taxaSucesso: number
    melhorPerformance: number
    economia: number
  }
  ativo: boolean
  criadoEm: string
}

export interface ConfiguracaoApi {
  facebookToken: string
  adAccountId: string
  pageId?: string
  kiwifyClientId?: string
  kiwifyClientSecret?: string
  kiwifyToken?: string // Para compatibilidade - será usado como client_secret
  kiwifyVendorId?: string
  ideogramToken?: string
  isValid?: boolean
  ultimaValidacao?: string
}

export interface ConfiguracaoAutomacao {
  id: string
  usuario: string
  nichos: ('BLACK' | 'GREY' | 'WHITE')[]
  orcamentoDiario: number
  limiteMensal: number
  criteriosParada: {
    roasMinimo: number
    cpaMaximo: number
    duracaoMaximaCampanha: number
  }
  aprovacaoManual: {
    produtos: boolean
    criativos: boolean
    campanhas: boolean
  }
  notificacoes: {
    email: boolean
    whatsapp: boolean
    telegram?: string
  }
}

export interface DadosGamificacao {
  nivel: number
  experiencia: number
  experienciaProximoNivel: number
  conquistas: Conquista[]
  ranking?: number
}

export interface Conquista {
  id: string
  nome: string
  descricao: string
  icone: string
  desbloqueadoEm?: string
  progresso?: number
  meta?: number
}

export interface ApiResponse<T> {
  data: T
  sucesso: boolean
  mensagem?: string
  erro?: string
}

export interface AlertaNotificacao {
  id: string
  tipo: 'PERFORMANCE' | 'ORCAMENTO' | 'SISTEMA' | 'OPORTUNIDADE'
  titulo: string
  mensagem: string
  severidade: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  lido: boolean
  dataCreated: Date
  campanhaId?: string
  acaoRecomendada?: string
}

// Re-export automacao types
export * from './automacao'