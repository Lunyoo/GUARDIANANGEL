export interface OfertaScrapada {
  id: string
  nicho: 'BLACK' | 'GREY' | 'WHITE'
  produto: string
  preco: number
  copy: string
  urlImagem?: string
  urlVideo?: string
  engajamento: number
  conversaoEstimada: number
  tendencia: 'ALTA' | 'MEDIA' | 'BAIXA'
  palavrasChave: string[]
  demografiaAlvo: {
    idade: [number, number]
    genero: string[]
    interesses: string[]
  }
  metricas: {
    likes: number
    comentarios: number
    compartilhamentos: number
    impressoesEstimadas: number
  }
  dataColeta: Date
  fonte: string
  scorePotencial: number // 0-100
}

export interface ProdutoGerado {
  id: string
  nome: string
  descricao: string
  preco: number
  tipo: 'EBOOK' | 'CURSO' | 'MENTORIA' | 'SOFTWARE' | 'TEMPLATE'
  conteudo: {
    capitulos?: string[]
    modulos?: string[]
    ferramentas?: string[]
  }
  funil: FunilGameficado
  kiwifyProductId?: string
  status: 'RASCUNHO' | 'CRIADO' | 'ATIVO' | 'PAUSADO'
}

export interface FunilGameficado {
  id: string
  nome: string
  etapas: EtapaFunil[]
  pontuacao: {
    visitaLandingPage: number
    preencheuEmail: number
    assistiuVideo: number
    comprou: number
  }
  recompensas: {
    nivel: number
    descricao: string
    premio: string
  }[]
}

export interface EtapaFunil {
  id: string
  nome: string
  tipo: 'LANDING_PAGE' | 'VIDEO_SALES' | 'CHECKOUT' | 'UPSELL' | 'DOWNSELL'
  conteudo: string
  elementos: ElementoGamificado[]
  conversaoEsperada: number
}

export interface ElementoGamificado {
  id: string
  tipo: 'CONTADOR_TEMPO' | 'BARRA_PROGRESSO' | 'BADGE' | 'PONTUACAO' | 'NIVEL'
  configuracao: Record<string, any>
  posicao: { x: number, y: number }
}

export interface CriativoIA {
  id: string
  tipo: 'IMAGEM' | 'VIDEO' | 'CARROSSEL'
  prompt: string
  urlGerada?: string
  revisao: RevisaoIA
  variantes: string[] // IDs de variantes geradas
  performance: {
    ctr: number
    engagement: number
    conversoes: number
    score: number
  }
  status: 'GERANDO' | 'REVISAO' | 'APROVADO' | 'REJEITADO' | 'ATIVO'
  ofertaOrigem: string // ID da oferta que inspirou
}

export interface RevisaoIA {
  aprovado: boolean
  pontuacao: number // 0-100
  sugestoes: string[]
  problemas: string[]
  melhorias: string[]
  nichoCompatibilidade: number // 0-100
  compliance: {
    black: boolean
    grey: boolean  
    white: boolean
  }
}

export interface CampanhaAutomatizada {
  id: string
  nome: string
  nicho: 'BLACK' | 'GREY' | 'WHITE'
  produto: ProdutoGerado
  criativos: CriativoIA[]
  targeting: {
    idade: [number, number]
    genero: string[]
    interesses: string[]
    comportamentos: string[]
    localizacao: string[]
  }
  orcamento: {
    diario: number
    total: number
    tipo: 'CPC' | 'CPM' | 'CPA'
  }
  otimizacao: {
    objetivo: string
    bidStrategy: string
    placementStrategy: string
  }
  automacao: {
    pausarSeRoasMenorQue: number
    aumentarOrcamentoSeRoasMaiorQue: number
    criarNovasVariantesSeNecessario: boolean
    otimizarTargetingAutomaticamente: boolean
  }
  status: 'RASCUNHO' | 'REVISAO' | 'APROVADA' | 'ATIVA' | 'PAUSADA' | 'FINALIZADA'
  performance: {
    roas: number
    cpa: number
    ctr: number
    conversoes: number
    faturamento: number
  }
}

export interface AnaliseNicho {
  nicho: 'BLACK' | 'GREY' | 'WHITE'
  descricao: string
  ofertas: OfertaScrapada[]
  tendencias: {
    palavrasChaveEmAlta: string[]
    precoMedio: number
    melhorHorarioPublicacao: string[]
    melhorDiasSemana: string[]
  }
  oportunidades: {
    lacunas: string[]
    nichosSaturados: string[]
    novosNichos: string[]
  }
  riscos: {
    compliance: string[]
    concorrencia: string[]
    sazonalidade: string[]
  }
  scorePotencial: number // 0-100
  atualizadoEm: Date
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
    duracaoMaximaCampanha: number // dias
  }
  aprovacaoManual: {
    produtos: boolean
    criativos: boolean
    campanhas: boolean
  }
  apis: {
    kiwify: {
      token: string
      vendorId: string
    }
    ideogram: {
      token: string
    }
  }
  notificacoes: {
    email: boolean
    whatsapp: boolean
    telegram?: string
  }
}

export interface FluxoAutomacao {
  id: string
  nome: string
  etapas: {
    scraping: boolean
    analiseML: boolean
    geracaoProduto: boolean
    criacaoFunil: boolean
    geracaoCreatives: boolean
    revisaoIA: boolean
    criacaoCampanha: boolean
    lancamento: boolean
    otimizacao: boolean
  }
  progresso: number // 0-100
  status: 'EXECUTANDO' | 'PAUSADO' | 'CONCLUIDO' | 'ERRO'
  logs: {
    timestamp: Date
    etapa: string
    mensagem: string
    tipo: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  }[]
  resultado?: {
    produtosCriados: string[]
    campanhasLancadas: string[]
    faturamentoProjetado: number
  }
}