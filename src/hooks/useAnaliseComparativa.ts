import { useState } from 'react'
import { useKV } from './useKV'
import { spark } from '@/lib/sparkCompat'
import type { MetricasCampanha, Criativo } from '@/types'

export interface PeriodoComparacao {
  atual: {
    inicio: string
    fim: string
    campanhas: MetricasCampanha[]
    criativos: Criativo[]
  }
  anterior: {
    inicio: string
    fim: string
    campanhas: MetricasCampanha[]
    criativos: Criativo[]
  }
}

export interface MetricaComparada {
  nome: string
  valorAtual: number
  valorAnterior: number
  variacao: number
  variacaoPercentual: number
  tendencia: 'CRESCENDO' | 'DECAINDO' | 'ESTAVEL'
}

export interface AnaliseComparativa {
  periodo: string
  metricas: MetricaComparada[]
  insights: string[]
  recomendacoes: string[]
}

export function useAnaliseComparativa() {
  const [historicoCampanhas, setHistoricoCampanhas] = useKV<{[key: string]: MetricasCampanha[]}>('historico-campanhas', {})
  const [analises, setAnalises] = useKV<AnaliseComparativa[]>('analises-comparativas', [])
  const [isLoading, setIsLoading] = useState(false)

  const salvarDadosHistoricos = (campanhas: MetricasCampanha[], criativos: Criativo[]) => {
    const hoje = new Date()
    const chave = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    
    setHistoricoCampanhas((current: {[key: string]: MetricasCampanha[]}) => ({
      ...current,
      [chave]: campanhas
    }))
  }

  const compararPeriodos = async (
    tipoComparacao: 'SEMANA' | 'MES' | 'TRIMESTRE' | 'PERSONALIZADO',
    campanhasAtuais: MetricasCampanha[],
    dataInicioCustom?: string,
    dataFimCustom?: string
  ): Promise<AnaliseComparativa | null> => {
    setIsLoading(true)
    
    try {
      const hoje = new Date()
      let dataInicioAtual: Date
      let dataInicioAnterior: Date
      let periodo: string

      // Definir períodos baseado no tipo de comparação
      switch (tipoComparacao) {
        case 'SEMANA':
          dataInicioAtual = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000)
          dataInicioAnterior = new Date(hoje.getTime() - 14 * 24 * 60 * 60 * 1000)
          periodo = 'Últimas 2 semanas'
          break
        case 'MES':
          dataInicioAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          dataInicioAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
          periodo = 'Últimos 2 meses'
          break
        case 'TRIMESTRE':
          const trimestreAtual = Math.floor(hoje.getMonth() / 3)
          dataInicioAtual = new Date(hoje.getFullYear(), trimestreAtual * 3, 1)
          dataInicioAnterior = new Date(hoje.getFullYear(), (trimestreAtual - 1) * 3, 1)
          periodo = 'Últimos 2 trimestres'
          break
        case 'PERSONALIZADO':
          if (!dataInicioCustom || !dataFimCustom) return null
          dataInicioAtual = new Date(dataInicioCustom)
          const diffDias = Math.ceil((new Date(dataFimCustom).getTime() - dataInicioAtual.getTime()) / (1000 * 60 * 60 * 24))
          dataInicioAnterior = new Date(dataInicioAtual.getTime() - diffDias * 24 * 60 * 60 * 1000)
          periodo = `Período personalizado (${diffDias} dias)`
          break
        default:
          return null
      }

      // Simular dados históricos (em produção, viria da API)
      const dadosAnteriores = simularDadosHistoricos(campanhasAtuais)
      
      // Calcular métricas comparadas
      const metricas = calcularMetricasComparadas(campanhasAtuais, dadosAnteriores)
      
      // Gerar insights com IA
      const insights = await gerarInsightsComparativos(metricas)
      const recomendacoes = await gerarRecomendacoes(metricas)

      const analise: AnaliseComparativa = {
        periodo,
        metricas,
        insights,
        recomendacoes
      }

      setAnalises((current: AnaliseComparativa[]) => [analise, ...current.slice(0, 9)]) // Manter apenas 10 análises
      
      return analise
    } catch (error) {
      console.error('Erro na análise comparativa:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const calcularMetricasComparadas = (
    campanhasAtuais: MetricasCampanha[], 
    campanhasAnteriores: MetricasCampanha[]
  ): MetricaComparada[] => {
    const totaisAtuais = calcularTotais(campanhasAtuais)
    const totaisAnteriores = calcularTotais(campanhasAnteriores)

    const metricas: MetricaComparada[] = [
      {
        nome: 'Impressões',
        valorAtual: totaisAtuais.impressoes,
        valorAnterior: totaisAnteriores.impressoes,
        variacao: totaisAtuais.impressoes - totaisAnteriores.impressoes,
        variacaoPercentual: calcularVariacaoPercentual(totaisAtuais.impressoes, totaisAnteriores.impressoes),
        tendencia: determinarTendencia(totaisAtuais.impressoes, totaisAnteriores.impressoes)
      },
      {
        nome: 'Cliques',
        valorAtual: totaisAtuais.cliques,
        valorAnterior: totaisAnteriores.cliques,
        variacao: totaisAtuais.cliques - totaisAnteriores.cliques,
        variacaoPercentual: calcularVariacaoPercentual(totaisAtuais.cliques, totaisAnteriores.cliques),
        tendencia: determinarTendencia(totaisAtuais.cliques, totaisAnteriores.cliques)
      },
      {
        nome: 'CTR (%)',
        valorAtual: totaisAtuais.ctr,
        valorAnterior: totaisAnteriores.ctr,
        variacao: totaisAtuais.ctr - totaisAnteriores.ctr,
        variacaoPercentual: calcularVariacaoPercentual(totaisAtuais.ctr, totaisAnteriores.ctr),
        tendencia: determinarTendencia(totaisAtuais.ctr, totaisAnteriores.ctr)
      },
      {
        nome: 'Conversões',
        valorAtual: totaisAtuais.conversoes,
        valorAnterior: totaisAnteriores.conversoes,
        variacao: totaisAtuais.conversoes - totaisAnteriores.conversoes,
        variacaoPercentual: calcularVariacaoPercentual(totaisAtuais.conversoes, totaisAnteriores.conversoes),
        tendencia: determinarTendencia(totaisAtuais.conversoes, totaisAnteriores.conversoes)
      },
      {
        nome: 'Investimento (R$)',
        valorAtual: totaisAtuais.gasto,
        valorAnterior: totaisAnteriores.gasto,
        variacao: totaisAtuais.gasto - totaisAnteriores.gasto,
        variacaoPercentual: calcularVariacaoPercentual(totaisAtuais.gasto, totaisAnteriores.gasto),
        tendencia: determinarTendencia(totaisAtuais.gasto, totaisAnteriores.gasto)
      },
      {
        nome: 'ROAS',
        valorAtual: totaisAtuais.roas,
        valorAnterior: totaisAnteriores.roas,
        variacao: totaisAtuais.roas - totaisAnteriores.roas,
        variacaoPercentual: calcularVariacaoPercentual(totaisAtuais.roas, totaisAnteriores.roas),
        tendencia: determinarTendencia(totaisAtuais.roas, totaisAnteriores.roas)
      }
    ]

    return metricas
  }

  const calcularTotais = (campanhas: MetricasCampanha[]) => {
    return campanhas.reduce((acc, campanha) => ({
      impressoes: acc.impressoes + campanha.impressoes,
      cliques: acc.cliques + campanha.cliques,
      conversoes: acc.conversoes + campanha.conversoes,
      gasto: acc.gasto + campanha.gasto,
      ctr: campanhas.length > 0 ? (acc.cliques + campanha.cliques) / (acc.impressoes + campanha.impressoes) * 100 : 0,
      roas: campanhas.length > 0 ? (acc.roas + campanha.roas) / campanhas.length : 0
    }), { impressoes: 0, cliques: 0, conversoes: 0, gasto: 0, ctr: 0, roas: 0 })
  }

  const calcularVariacaoPercentual = (atual: number, anterior: number): number => {
    if (anterior === 0) return atual > 0 ? 100 : 0
    return ((atual - anterior) / anterior) * 100
  }

  const determinarTendencia = (atual: number, anterior: number): 'CRESCENDO' | 'DECAINDO' | 'ESTAVEL' => {
    const variacao = calcularVariacaoPercentual(atual, anterior)
    if (Math.abs(variacao) < 5) return 'ESTAVEL'
    return variacao > 0 ? 'CRESCENDO' : 'DECAINDO'
  }

  const simularDadosHistoricos = (campanhas: MetricasCampanha[]): MetricasCampanha[] => {
    // Em produção, isso viria de dados reais armazenados
    return campanhas.map(campanha => ({
      ...campanha,
      impressoes: Math.floor(campanha.impressoes * (0.8 + Math.random() * 0.4)), // Variação de -20% a +20%
      cliques: Math.floor(campanha.cliques * (0.8 + Math.random() * 0.4)),
      conversoes: Math.floor(campanha.conversoes * (0.8 + Math.random() * 0.4)),
      gasto: campanha.gasto * (0.8 + Math.random() * 0.4),
      ctr: campanha.ctr * (0.8 + Math.random() * 0.4),
      roas: campanha.roas * (0.8 + Math.random() * 0.4),
      cpa: campanha.cpa * (0.8 + Math.random() * 0.4)
    }))
  }

  const gerarInsightsComparativos = async (metricas: MetricaComparada[]): Promise<string[]> => {
    const insights: string[] = []
    
    metricas.forEach(metrica => {
      if (metrica.tendencia === 'CRESCENDO' && Math.abs(metrica.variacaoPercentual) > 10) {
        insights.push(`${metrica.nome} teve crescimento significativo de ${metrica.variacaoPercentual.toFixed(1)}%`)
      } else if (metrica.tendencia === 'DECAINDO' && Math.abs(metrica.variacaoPercentual) > 10) {
        insights.push(`${metrica.nome} apresentou queda de ${Math.abs(metrica.variacaoPercentual).toFixed(1)}%`)
      }
    })

    // Insights específicos baseados na IA
    const prompt = spark.llmPrompt`
      Analise estas métricas de campanha e gere 3 insights estratégicos:
      ${JSON.stringify(metricas.map(m => ({
        nome: m.nome,
        variacao: m.variacaoPercentual,
        tendencia: m.tendencia
      })))}
      
      Responda apenas com insights objetivos em português brasileiro.
    `
    
    try {
      const response = await spark.llm(prompt)
      const aiInsights = response.split('\n').filter(line => line.trim()).slice(0, 3)
      insights.push(...aiInsights)
    } catch (error) {
      console.error('Erro ao gerar insights:', error)
    }

    return insights.slice(0, 5)
  }

  const gerarRecomendacoes = async (metricas: MetricaComparada[]): Promise<string[]> => {
    const recomendacoes: string[] = []
    
    // Recomendações baseadas em regras
    const ctrMetrica = metricas.find(m => m.nome === 'CTR (%)')
    const roasMetrica = metricas.find(m => m.nome === 'ROAS')
    const gastoMetrica = metricas.find(m => m.nome === 'Investimento (R$)')

    if (ctrMetrica && ctrMetrica.tendencia === 'DECAINDO') {
      recomendacoes.push('Revise e otimize os criativos com CTR em queda')
    }

    if (roasMetrica && roasMetrica.tendencia === 'DECAINDO') {
      recomendacoes.push('Reavalie o targeting e palavras-chave das campanhas com ROAS baixo')
    }

    if (gastoMetrica && gastoMetrica.tendencia === 'CRESCENDO' && gastoMetrica.variacaoPercentual > 20) {
      recomendacoes.push('Monitore de perto o orçamento - gasto aumentou significativamente')
    }

    // Recomendações da IA
    const prompt = spark.llmPrompt`
      Com base nestas métricas de performance, gere 3 recomendações práticas para otimização:
      ${JSON.stringify(metricas.map(m => ({
        nome: m.nome,
        variacao: m.variacaoPercentual,
        tendencia: m.tendencia
      })))}
      
      Foque em ações específicas que o usuário pode tomar. Responda em português brasileiro.
    `
    
    try {
      const response = await spark.llm(prompt)
      const aiRecomendacoes = response.split('\n').filter(line => line.trim()).slice(0, 3)
      recomendacoes.push(...aiRecomendacoes)
    } catch (error) {
      console.error('Erro ao gerar recomendações:', error)
    }

    return recomendacoes.slice(0, 5)
  }

  return {
    isLoading,
    analises,
    compararPeriodos,
    salvarDadosHistoricos
  }
}