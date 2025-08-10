import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { prisma } from '../server'
import { asyncHandler } from '../middleware/errorHandler'
import { AuthenticatedRequest } from '../middleware/auth'
import { automacaoQueue } from '../services/queue'
import { logger } from '../utils/logger'

const router = Router()

// Iniciar automação completa
router.post('/start', [
  body('nicho').notEmpty().withMessage('Nicho é obrigatório'),
  body('tipoNicho').isIn(['WHITE', 'GREY', 'BLACK']).withMessage('Tipo de nicho inválido'),
  body('investimento').isFloat({ min: 50, max: 10000 }).withMessage('Investimento deve estar entre R$ 50 e R$ 10.000')
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    })
  }

  const { nicho, tipoNicho, investimento } = req.body
  const userId = req.user!.id

  // Verificar se usuário tem APIs configuradas
  const config = req.user!.configuracaoApi
  if (!config?.kiwifyAccessToken) {
    return res.status(400).json({
      error: 'Configuração do Kiwify necessária para automação completa'
    })
  }

  if (!config?.ideogramToken) {
    return res.status(400).json({
      error: 'API do Ideogram necessária para geração de criativos'
    })
  }

  // Verificar se já existe uma automação em andamento
  const automacaoExistente = await prisma.automacaoExecucao.findFirst({
    where: {
      userId,
      status: {
        in: ['INICIADO', 'SCRAPING', 'ANALISANDO', 'CRIANDO_PRODUTO', 'CRIANDO_CAMPANHA']
      }
    }
  })

  if (automacaoExistente) {
    return res.status(409).json({
      error: 'Já existe uma automação em andamento',
      automacaoId: automacaoExistente.id
    })
  }

  // Criar registro de execução
  const automacaoExecucao = await prisma.automacaoExecucao.create({
    data: {
      userId,
      nicho,
      tipoNicho,
      investimento,
      status: 'INICIADO',
      logs: [{
        timestamp: new Date().toISOString(),
        message: `Automação iniciada para nicho: ${nicho}`,
        level: 'info'
      }]
    }
  })

  // Adicionar job na fila
  const job = await automacaoQueue.add('automacao-completa', {
    userId,
    automacaoId: automacaoExecucao.id,
    nicho,
    tipoNicho,
    investimento,
    config: {
      kiwifyToken: config.kiwifyAccessToken,
      ideogramToken: config.ideogramToken,
      facebookToken: config.facebookToken,
      adAccountId: config.adAccountId
    }
  }, {
    attempts: 1, // Apenas uma tentativa para automação completa
    timeout: 30 * 60 * 1000 // 30 minutos timeout
  })

  logger.info(`Automação completa iniciada: ${nicho} (${tipoNicho})`, { 
    userId, 
    jobId: job.id,
    automacaoId: automacaoExecucao.id,
    investimento 
  })

  res.json({
    message: 'Automação completa iniciada com sucesso',
    automacaoId: automacaoExecucao.id,
    jobId: job.id,
    nicho,
    tipoNicho,
    investimento,
    status: 'INICIADO'
  })
}))

// Verificar status da automação
router.get('/status/:automacaoId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { automacaoId } = req.params

  const automacao = await prisma.automacaoExecucao.findUnique({
    where: { id: automacaoId }
  })

  if (!automacao) {
    return res.status(404).json({
      error: 'Automação não encontrada'
    })
  }

  // Verificar permissão
  if (automacao.userId !== req.user!.id && !req.user!.isAdmin) {
    return res.status(403).json({
      error: 'Acesso negado'
    })
  }

  // Calcular progresso baseado no status
  let progress = 0
  switch (automacao.status) {
    case 'INICIADO': progress = 10; break
    case 'SCRAPING': progress = 30; break
    case 'ANALISANDO': progress = 50; break
    case 'CRIANDO_PRODUTO': progress = 70; break
    case 'CRIANDO_CAMPANHA': progress = 90; break
    case 'CONCLUIDO': progress = 100; break
    case 'ERRO': progress = -1; break
    default: progress = 0
  }

  res.json({
    automacaoId: automacao.id,
    status: automacao.status,
    progress,
    nicho: automacao.nicho,
    tipoNicho: automacao.tipoNicho,
    investimento: automacao.investimento,
    ofertasEncontradas: automacao.ofertasEncontradas,
    ofertaSelecionada: automacao.ofertaSelecionada,
    produtoKiwifyId: automacao.produtoKiwifyId,
    produtoNome: automacao.produtoNome,
    produtoUrl: automacao.produtoUrl,
    campanhaFbId: automacao.campanhaFbId,
    logs: automacao.logs,
    erro: automacao.erro,
    createdAt: automacao.createdAt,
    updatedAt: automacao.updatedAt,
    completedAt: automacao.completedAt
  })
}))

// Histórico de automações
router.get('/history', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '10' } = req.query
  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const offset = (pageNum - 1) * limitNum

  const [automacoes, total] = await Promise.all([
    prisma.automacaoExecucao.findMany({
      where: {
        userId: req.user!.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limitNum,
      select: {
        id: true,
        nicho: true,
        tipoNicho: true,
        investimento: true,
        status: true,
        ofertasEncontradas: true,
        produtoNome: true,
        produtoUrl: true,
        campanhaFbId: true,
        erro: true,
        createdAt: true,
        completedAt: true
      }
    }),
    prisma.automacaoExecucao.count({
      where: { userId: req.user!.id }
    })
  ])

  // Calcular estatísticas
  const stats = {
    total,
    concluidas: automacoes.filter(a => a.status === 'CONCLUIDO').length,
    emAndamento: automacoes.filter(a => !['CONCLUIDO', 'ERRO'].includes(a.status)).length,
    comErro: automacoes.filter(a => a.status === 'ERRO').length,
    investimentoTotal: automacoes
      .filter(a => a.status === 'CONCLUIDO')
      .reduce((sum, a) => sum + a.investimento, 0)
  }

  res.json({
    automacoes,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    },
    stats
  })
}))

// Detalhes completos de uma automação
router.get('/details/:automacaoId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { automacaoId } = req.params

  const automacao = await prisma.automacaoExecucao.findUnique({
    where: { id: automacaoId },
    include: {
      user: {
        select: {
          nome: true,
          email: true
        }
      }
    }
  })

  if (!automacao) {
    return res.status(404).json({
      error: 'Automação não encontrada'
    })
  }

  // Verificar permissão
  if (automacao.userId !== req.user!.id && !req.user!.isAdmin) {
    return res.status(403).json({
      error: 'Acesso negado'
    })
  }

  // Buscar dados relacionados se existirem
  let campanhaFb = null
  if (automacao.campanhaFbId) {
    campanhaFb = await prisma.campanha.findFirst({
      where: { facebookId: automacao.campanhaFbId }
    })
  }

  res.json({
    ...automacao,
    campanhaFb,
    timeline: [
      {
        etapa: 'INICIADO',
        timestamp: automacao.createdAt,
        concluida: true,
        descricao: 'Automação iniciada'
      },
      {
        etapa: 'SCRAPING',
        timestamp: automacao.updatedAt,
        concluida: ['SCRAPING', 'ANALISANDO', 'CRIANDO_PRODUTO', 'CRIANDO_CAMPANHA', 'CONCLUIDO'].includes(automacao.status),
        descricao: `${automacao.ofertasEncontradas} ofertas encontradas`
      },
      {
        etapa: 'CRIANDO_PRODUTO',
        timestamp: automacao.produtoKiwifyId ? automacao.updatedAt : null,
        concluida: !!automacao.produtoKiwifyId,
        descricao: automacao.produtoNome || 'Produto sendo criado'
      },
      {
        etapa: 'CRIANDO_CAMPANHA',
        timestamp: automacao.campanhaFbId ? automacao.updatedAt : null,
        concluida: !!automacao.campanhaFbId,
        descricao: automacao.campanhaFbId ? 'Campanha criada no Facebook' : 'Campanha sendo criada'
      },
      {
        etapa: 'CONCLUIDO',
        timestamp: automacao.completedAt,
        concluida: automacao.status === 'CONCLUIDO',
        descricao: 'Automação concluída com sucesso'
      }
    ]
  })
}))

// Cancelar automação em andamento
router.post('/cancel/:automacaoId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { automacaoId } = req.params

  const automacao = await prisma.automacaoExecucao.findUnique({
    where: { id: automacaoId }
  })

  if (!automacao) {
    return res.status(404).json({
      error: 'Automação não encontrada'
    })
  }

  // Verificar permissão
  if (automacao.userId !== req.user!.id && !req.user!.isAdmin) {
    return res.status(403).json({
      error: 'Acesso negado'
    })
  }

  // Verificar se pode ser cancelada
  if (['CONCLUIDO', 'ERRO'].includes(automacao.status)) {
    return res.status(400).json({
      error: 'Automação já foi finalizada'
    })
  }

  // Atualizar status
  const updatedAutomacao = await prisma.automacaoExecucao.update({
    where: { id: automacaoId },
    data: {
      status: 'ERRO',
      erro: 'Cancelado pelo usuário',
      logs: [
        ...automacao.logs,
        {
          timestamp: new Date().toISOString(),
          message: 'Automação cancelada pelo usuário',
          level: 'warning'
        }
      ]
    }
  })

  // TODO: Cancelar job na fila se ainda estiver rodando

  logger.info(`Automação cancelada: ${automacaoId}`, { userId: req.user!.id })

  res.json({
    message: 'Automação cancelada com sucesso',
    automacao: updatedAutomacao
  })
}))

// Estatísticas gerais
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id

  const [
    totalAutomacoes,
    automacoesConcluidas,
    automacoesErro,
    investimentoTotal,
    nichosMaisUsados,
    ultimasAutomacoes
  ] = await Promise.all([
    prisma.automacaoExecucao.count({ where: { userId } }),
    prisma.automacaoExecucao.count({ where: { userId, status: 'CONCLUIDO' } }),
    prisma.automacaoExecucao.count({ where: { userId, status: 'ERRO' } }),
    prisma.automacaoExecucao.aggregate({
      where: { userId, status: 'CONCLUIDO' },
      _sum: { investimento: true }
    }),
    prisma.automacaoExecucao.groupBy({
      by: ['nicho'],
      where: { userId },
      _count: { nicho: true },
      orderBy: { _count: { nicho: 'desc' } },
      take: 5
    }),
    prisma.automacaoExecucao.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        nicho: true,
        status: true,
        investimento: true,
        createdAt: true
      }
    })
  ])

  const taxaSucesso = totalAutomacoes > 0 ? 
    ((automacoesConcluidas / totalAutomacoes) * 100).toFixed(1) : '0'

  res.json({
    resumo: {
      totalAutomacoes,
      automacoesConcluidas,
      automacoesErro,
      emAndamento: totalAutomacoes - automacoesConcluidas - automacoesErro,
      taxaSucesso: parseFloat(taxaSucesso),
      investimentoTotal: investimentoTotal._sum.investimento || 0
    },
    nichosMaisUsados,
    ultimasAutomacoes
  })
}))

export default router