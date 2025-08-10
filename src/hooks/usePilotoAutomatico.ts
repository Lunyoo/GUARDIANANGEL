import { useState, useEffect } from 'react'
import { useKV } from './useKV'
import { toast } from 'sonner'
import { spark } from '@/lib/sparkCompat'
import type { MetricasCampanha, Criativo } from '@/types'

export interface PilotoAutomaticoConfig {
  ativo: boolean
  configuracoes: {
    otimizarOrcamento: boolean
    pausarCampanhasBaixoRoas: boolean
    aumentarOrcamentoAltoRoas: boolean
    otimizarTargeting: boolean
    trocarCriativos: boolean
  }
  limites: {
    roasMinimo: number
    roasOtimo: number
    ctrMinimo: number
    gastoMaximoDiario: number
  }
  frequenciaAnalise: number // em minutos
  notificarAcoes: boolean
}

export interface AcaoAutomatica {
  id: string
  tipo: 'PAUSAR_CAMPANHA' | 'AUMENTAR_ORCAMENTO' | 'DIMINUIR_ORCAMENTO' | 'OTIMIZAR_TARGETING' | 'TROCAR_CRIATIVO'
  campanhaId: string
  campanhaNome: string
  descricao: string
  valorAnterior?: any
  valorNovo?: any
  executadoEm: string
  sucesso: boolean
  motivo: string
}

export interface SugestaoOtimizacao {
  id: string
  tipo: 'ORCAMENTO' | 'TARGETING' | 'CRIATIVO' | 'PAUSAR' | 'ATIVAR'
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  campanhaId: string
  campanhaNome: string
  titulo: string
  descricao: string
  impactoEstimado: string
  acaoRecomendada: string
  criadoEm: string
  aplicada: boolean
}

export function usePilotoAutomatico() {
  const [config, setConfig] = useKV<PilotoAutomaticoConfig>('piloto-automatico-config', {
    ativo: false,
    configuracoes: {
      otimizarOrcamento: true,
      pausarCampanhasBaixoRoas: true,
      aumentarOrcamentoAltoRoas: true,
      otimizarTargeting: false,
      trocarCriativos: false
    },
    limites: {
      roasMinimo: 1.5,
      roasOtimo: 3.0,
      ctrMinimo: 1.0,
      gastoMaximoDiario: 500
    },
    frequenciaAnalise: 60, // 1 hora
    notificarAcoes: true
  })

  const [acoes, setAcoes] = useKV<AcaoAutomatica[]>('acoes-automaticas', [])
  const [sugestoes, setSugestoes] = useKV<SugestaoOtimizacao[]>('sugestoes-otimizacao', [])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [ultimaAnalise, setUltimaAnalise] = useKV<string>('ultima-analise-piloto', '')

  // Executar análise automática periodicamente
  useEffect(() => {
    if (!config.ativo) return

    const intervalo = setInterval(() => {
      const agora = new Date()
      const ultimaAnaliseDate = ultimaAnalise ? new Date(ultimaAnalise) : null
      
      if (!ultimaAnaliseDate || 
          (agora.getTime() - ultimaAnaliseDate.getTime()) >= config.frequenciaAnalise * 60 * 1000) {
        // Trigger análise automática - em produção isso seria chamado automaticamente
        console.log('Executando análise automática do piloto...')
      }
    }, 60000) // Verificar a cada minuto

    return () => clearInterval(intervalo)
  }, [config.ativo, config.frequenciaAnalise, ultimaAnalise])

  const analisarCampanhas = async (campanhas: MetricasCampanha[], criativos: Criativo[]) => {
    setIsAnalyzing(true)
    
    try {
      const novasAcoes: AcaoAutomatica[] = []
      const novasSugestoes: SugestaoOtimizacao[] = []
      const agora = new Date().toISOString()

      // Analisar cada campanha ativa
      for (const campanha of campanhas.filter(c => c.status === 'ACTIVE')) {
        // 1. Verificar ROAS baixo
        if (campanha.roas < config.limites.roasMinimo) {
          if (config.ativo && config.configuracoes.pausarCampanhasBaixoRoas) {
            const acao: AcaoAutomatica = {
              id: `acao-${Date.now()}-${campanha.id}`,
              tipo: 'PAUSAR_CAMPANHA',
              campanhaId: campanha.id,
              campanhaNome: campanha.nome,
              descricao: `Campanha pausada automaticamente por ROAS baixo (${campanha.roas.toFixed(2)}x < ${config.limites.roasMinimo}x)`,
              valorAnterior: 'ACTIVE',
              valorNovo: 'PAUSED',
              executadoEm: agora,
              sucesso: true, // Simular sucesso
              motivo: 'ROAS_BAIXO'
            }
            novasAcoes.push(acao)
          } else {
            // Gerar sugestão manual
            const sugestao: SugestaoOtimizacao = {
              id: `sugestao-${Date.now()}-${campanha.id}`,
              tipo: 'PAUSAR',
              prioridade: 'ALTA',
              campanhaId: campanha.id,
              campanhaNome: campanha.nome,
              titulo: 'Pausar campanha com ROAS baixo',
              descricao: `Esta campanha está com ROAS de ${campanha.roas.toFixed(2)}x, abaixo do limite mínimo de ${config.limites.roasMinimo}x`,
              impactoEstimado: 'Redução de perdas em até 30%',
              acaoRecomendada: 'Pausar campanha e revisar targeting/criativos',
              criadoEm: agora,
              aplicada: false
            }
            novasSugestoes.push(sugestao)
          }
        }

        // 2. Verificar ROAS alto para aumentar orçamento
        if (campanha.roas > config.limites.roasOtimo && campanha.gasto < config.limites.gastoMaximoDiario) {
          if (config.ativo && config.configuracoes.aumentarOrcamentoAltoRoas) {
            const novoOrcamento = Math.min(campanha.gasto * 1.2, config.limites.gastoMaximoDiario)
            const acao: AcaoAutomatica = {
              id: `acao-${Date.now()}-${campanha.id}`,
              tipo: 'AUMENTAR_ORCAMENTO',
              campanhaId: campanha.id,
              campanhaNome: campanha.nome,
              descricao: `Orçamento aumentado em 20% devido ao alto ROAS (${campanha.roas.toFixed(2)}x)`,
              valorAnterior: campanha.gasto,
              valorNovo: novoOrcamento,
              executadoEm: agora,
              sucesso: true,
              motivo: 'ROAS_ALTO'
            }
            novasAcoes.push(acao)
          } else {
            const sugestao: SugestaoOtimizacao = {
              id: `sugestao-${Date.now()}-${campanha.id}`,
              tipo: 'ORCAMENTO',
              prioridade: 'MEDIA',
              campanhaId: campanha.id,
              campanhaNome: campanha.nome,
              titulo: 'Aumentar orçamento da campanha performante',
              descricao: `Campanha com excelente ROAS de ${campanha.roas.toFixed(2)}x pode receber mais investimento`,
              impactoEstimado: 'Aumento de conversões em até 25%',
              acaoRecomendada: 'Aumentar orçamento em 20-30%',
              criadoEm: agora,
              aplicada: false
            }
            novasSugestoes.push(sugestao)
          }
        }

        // 3. Verificar CTR baixo
        if (campanha.ctr < config.limites.ctrMinimo) {
          const sugestao: SugestaoOtimizacao = {
            id: `sugestao-${Date.now()}-ctr-${campanha.id}`,
            tipo: 'CRIATIVO',
            prioridade: 'MEDIA',
            campanhaId: campanha.id,
            campanhaNome: campanha.nome,
            titulo: 'Otimizar criativos com CTR baixo',
            descricao: `CTR atual de ${campanha.ctr.toFixed(2)}% está abaixo do mínimo de ${config.limites.ctrMinimo}%`,
            impactoEstimado: 'Melhoria de CTR em até 40%',
            acaoRecomendada: 'Testar novos criativos ou ajustar targeting',
            criadoEm: agora,
            aplicada: false
          }
          novasSugestoes.push(sugestao)
        }
      }

      // Análise de criativos
      const criativosPorPerformance = criativos.sort((a, b) => b.metricas.roas - a.metricas.roas)
      const criativosBaixaPerformance = criativosPorPerformance.filter(c => c.metricas.roas < config.limites.roasMinimo)

      if (criativosBaixaPerformance.length > 0) {
        criativosBaixaPerformance.slice(0, 3).forEach(criativo => {
          const sugestao: SugestaoOtimizacao = {
            id: `sugestao-${Date.now()}-criativo-${criativo.id}`,
            tipo: 'CRIATIVO',
            prioridade: 'BAIXA',
            campanhaId: 'GERAL',
            campanhaNome: 'Otimização Geral',
            titulo: 'Substituir criativo com baixa performance',
            descricao: `Criativo "${criativo.nome}" com ROAS de ${criativo.metricas.roas.toFixed(2)}x`,
            impactoEstimado: 'Melhoria de performance geral',
            acaoRecomendada: 'Pausar ou substituir este criativo',
            criadoEm: agora,
            aplicada: false
          }
          novasSugestoes.push(sugestao)
        })
      }

      // Gerar insights avançados com IA
      const insightsIA = await gerarInsightsIA(campanhas, criativos)
      insightsIA.forEach((insight, index) => {
        const sugestao: SugestaoOtimizacao = {
          id: `ia-${Date.now()}-${index}`,
          tipo: 'ORCAMENTO',
          prioridade: 'MEDIA',
          campanhaId: 'IA_INSIGHT',
          campanhaNome: 'Insight de IA',
          titulo: insight.titulo,
          descricao: insight.descricao,
          impactoEstimado: insight.impacto,
          acaoRecomendada: insight.acao,
          criadoEm: agora,
          aplicada: false
        }
        novasSugestoes.push(sugestao)
      })

      // Salvar ações e sugestões
      if (novasAcoes.length > 0) {
        setAcoes((current: AcaoAutomatica[]) => [...novasAcoes, ...current.slice(0, 49)]) // Manter apenas 50 ações
        
        if (config.notificarAcoes) {
          toast.success(`🤖 Piloto Automático executou ${novasAcoes.length} ação(ões)`, {
            description: novasAcoes.map(a => a.descricao).join(' • ')
          })
        }
      }

      if (novasSugestoes.length > 0) {
        setSugestoes((current: SugestaoOtimizacao[]) => [...novasSugestoes, ...current.slice(0, 49)])
      }

      setUltimaAnalise(agora)
      
      if (config.ativo) {
        toast.info('🧠 Análise automática concluída', {
          description: `${novasAcoes.length} ações executadas, ${novasSugestoes.length} sugestões geradas`
        })
      }

    } catch (error) {
      console.error('Erro na análise do piloto automático:', error)
      toast.error('Erro na análise automática', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const gerarInsightsIA = async (campanhas: MetricasCampanha[], criativos: Criativo[]): Promise<Array<{
    titulo: string
    descricao: string
    impacto: string
    acao: string
  }>> => {
    const prompt = spark.llmPrompt`
      Analise estes dados de campanhas de marketing e gere 3 insights estratégicos para otimização:
      
      Campanhas (${campanhas.length}):
      ${JSON.stringify(campanhas.slice(0, 5).map(c => ({
        nome: c.nome,
        roas: c.roas,
        ctr: c.ctr,
        gasto: c.gasto,
        conversoes: c.conversoes
      })))}
      
      Criativos (${criativos.length}):
      ${JSON.stringify(criativos.slice(0, 5).map(c => ({
        nome: c.nome,
        roas: c.metricas.roas,
        ctr: c.metricas.ctr
      })))}
      
      Para cada insight, forneça:
      - titulo: Título conciso
      - descricao: Explicação detalhada 
      - impacto: Impacto estimado
      - acao: Ação específica a tomar
      
      Responda em JSON válido em português brasileiro.
    `
    
    try {
      const response = await spark.llm(prompt, 'gpt-4o-mini', true)
      const insights = JSON.parse(response)
      return Array.isArray(insights) ? insights.slice(0, 3) : []
    } catch (error) {
      console.error('Erro ao gerar insights IA:', error)
      return []
    }
  }

  const aplicarSugestao = async (sugestaoId: string): Promise<boolean> => {
    try {
      const sugestao = sugestoes.find(s => s.id === sugestaoId)
      if (!sugestao) return false

      // Simular aplicação da sugestão
      const acao: AcaoAutomatica = {
        id: `acao-manual-${Date.now()}`,
        tipo: 'OTIMIZAR_TARGETING',
        campanhaId: sugestao.campanhaId,
        campanhaNome: sugestao.campanhaNome,
        descricao: `Sugestão aplicada manualmente: ${sugestao.titulo}`,
        executadoEm: new Date().toISOString(),
        sucesso: true,
        motivo: 'MANUAL'
      }

      setAcoes((current: AcaoAutomatica[]) => [acao, ...current])
      setSugestoes((current: SugestaoOtimizacao[]) => 
        current.map(s => s.id === sugestaoId ? { ...s, aplicada: true } : s)
      )

      toast.success('Sugestão aplicada com sucesso!', {
        description: sugestao.titulo
      })

      return true
    } catch (error) {
      toast.error('Erro ao aplicar sugestão', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      return false
    }
  }

  const rejeitarSugestao = (sugestaoId: string) => {
    setSugestoes((current: SugestaoOtimizacao[]) => 
      current.filter(s => s.id !== sugestaoId)
    )
  }

  const ativarPilotoAutomatico = (ativo: boolean) => {
    setConfig((current: PilotoAutomaticoConfig) => ({ ...current, ativo }))
    
    if (ativo) {
      toast.success('🤖 Piloto Automático ativado!', {
        description: 'O sistema começará a otimizar suas campanhas automaticamente'
      })
    } else {
      toast.info('🤖 Piloto Automático desativado', {
        description: 'Você receberá apenas sugestões manuais'
      })
    }
  }

  const sugestoesNaoAplicadas = sugestoes.filter(s => !s.aplicada)
  const acoesRecentes = acoes.slice(0, 10)

  return {
    config,
    setConfig,
    acoes: acoesRecentes,
    sugestoes: sugestoesNaoAplicadas,
    isAnalyzing,
    ultimaAnalise,
    analisarCampanhas,
    aplicarSugestao,
    rejeitarSugestao,
    ativarPilotoAutomatico
  }
}