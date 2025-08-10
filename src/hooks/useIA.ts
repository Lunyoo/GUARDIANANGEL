/**
 * Hook personalizado para gerenciamento de IA e análise preditiva
 */

import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useKV } from './useKV'
import AnalisePreditivaService from '@/services/analisePreditivaService'
import type { CriativoIA, AnalisePerformance, Criativo, ConfiguracaoApi } from '@/types'
import IdeogramService, { CriativoConfig } from '@/services/ideogramService'
import { toast } from 'sonner'

export function useIA() {
  const { usuarioAtual } = useAuth()
  const [configApi] = useState<ConfiguracaoApi>({
    facebookToken: '',
    adAccountId: '',
    kiwifyToken: '',
    ideogramToken: '',
    isValid: false
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Inicializar serviços
  const ideogramService = configApi.ideogramToken 
    ? new IdeogramService(configApi.ideogramToken)
    : null

  const analiseService = new AnalisePreditivaService()

  // Verificar se as APIs estão configuradas
  const temIdeogram = Boolean(configApi.ideogramToken && configApi.ideogramToken.length > 10)
  const temFacebook = Boolean(configApi.facebookToken)

  /**
   * Gerar criativo com IA
   */
  const gerarCriativo = useCallback(async (config: CriativoConfig & { variantes?: number }) => {
      if (!ideogramService) {
        throw new Error('API do Ideogram não configurada')
      }

    try {
      setIsGenerating(true)
      
      console.log('🎨 Iniciando geração de criativo com IA...')
      
      // Gerar criativo principal
      const resultado = await ideogramService.gerarCriativo(config)
      
      const novoCriativo: CriativoIA = {
        id: `criativo-ia-${Date.now()}`,
        prompt: resultado.prompt,
        configuracao: {
          estilo: config.estilo,
          cores: config.cores || ['#007bff'],
          elementos: config.elementos || [],
          proporcao: config.proporcao,
          qualidade: config.qualidade
        },
        resultado: {
          url: resultado.url,
          metadata: {
            largura: config.proporcao === '16:9' ? 1920 : config.proporcao === '9:16' ? 1080 : 1080,
            altura: config.proporcao === '16:9' ? 1080 : config.proporcao === '9:16' ? 1920 : 1080,
            formato: 'PNG',
            tamanho: 0
          }
        },
        analise: {
          scorePreditivo: 0,
          elementosDetectados: [],
          sugestoesMelhoria: [],
          compatibilidadePlataforma: {
            facebook: 85,
            instagram: 90,
            google: 80
          }
        },
        status: 'CONCLUIDO',
        custoCreditos: resultado.custoCreditos,
        nicho: config.nicho,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      }

      // Gerar variantes se solicitado
      let criativosGerados = [novoCriativo]
      
      if (config.variantes && config.variantes > 1) {
        toast.info(`Gerando ${config.variantes - 1} variantes...`)
        
        try {
          const variantes = await ideogramService.gerarVariantes(config, config.variantes - 1)
          
          const criativosVariantes: CriativoIA[] = variantes.map((variante, index) => ({
            ...novoCriativo,
            id: `${novoCriativo.id}-variante-${index + 1}`,
            prompt: variante.prompt,
            resultado: {
              url: variante.url,
              metadata: { ...novoCriativo.resultado!.metadata }
            },
            custoCreditos: 1
          }))

          criativosGerados = [novoCriativo, ...criativosVariantes]
          
          toast.success(`✅ ${criativosGerados.length} criativos gerados!`)
        } catch (error) {
          console.warn('Algumas variantes falharam:', error)
          toast.warning('Criativo principal gerado, algumas variantes falharam')
        }
      } else {
        toast.success('✅ Criativo gerado com sucesso!')
      }

      console.log(`✅ ${criativosGerados.length} criativos gerados com sucesso`)
      
      return criativosGerados

    } catch (error) {
      console.error('❌ Erro ao gerar criativo:', error)
      const mensagem = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro ao gerar criativo: ${mensagem}`)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }, [ideogramService])

  /**
   * Analisar performance de criativo
   */
  const analisarPerformance = useCallback(async (
    criativo: Criativo | CriativoIA,
    historico?: Criativo[],
    dadosContexto?: {
      mediaSetor?: { ctr: number; roas: number; engajamento: number }
      dadosDemograficos?: { idade: string; genero: string; interesses: string[] }
    }
  ): Promise<AnalisePerformance> => {
    try {
      setIsAnalyzing(true)
      
      console.log('🧠 Iniciando análise preditiva de performance...')
      
      const dados = {
        criativo,
        historico,
        mediaSetor: dadosContexto?.mediaSetor || { ctr: 2.5, roas: 3.2, engajamento: 45 },
        dadosDemograficos: dadosContexto?.dadosDemograficos
      }

      const analise = await analiseService.analisarPerformance(dados)
      
      console.log('✅ Análise preditiva concluída:', {
        score: analise.metricas.engajamento.toFixed(1),
        confiabilidade: analise.confiabilidade.toFixed(0)
      })
      
      toast.success(`📊 Análise concluída! Score: ${analise.metricas.engajamento.toFixed(1)}%`)
      
      return analise

    } catch (error) {
      console.error('❌ Erro na análise preditiva:', error)
      const mensagem = error instanceof Error ? error.message : 'Erro na análise'
      toast.error(`Erro ao analisar: ${mensagem}`)
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }, [analiseService])

  /**
   * Verificar status das APIs
   */
  const verificarStatusAPIs = useCallback(async () => {
    const status = {
      ideogram: { ativo: false, erro: '' as string },
      analise: { ativo: true, info: analiseService.getModeloInfo() }
    }

  if (ideogramService) {
      try {
  const statusIdeogram = await ideogramService.verificarStatus()
  status.ideogram = { ativo: statusIdeogram.ativo, erro: statusIdeogram.erro || '' }
      } catch (error) {
        status.ideogram = {
          ativo: false,
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      }
    }

    return status
  }, [ideogramService, analiseService])

  /**
   * Gerar múltiplas análises em lote
   */
  const analisarLote = useCallback(async (
    criativos: (Criativo | CriativoIA)[],
    historico?: Criativo[]
  ): Promise<AnalisePerformance[]> => {
    try {
      setIsAnalyzing(true)
      toast.info(`Analisando ${criativos.length} criativos...`)

      const analises: AnalisePerformance[] = []
      
      for (let i = 0; i < criativos.length; i++) {
        try {
          const analise = await analiseService.analisarPerformance({
            criativo: criativos[i],
            historico,
            mediaSetor: { ctr: 2.5, roas: 3.2, engajamento: 45 }
          })
          
          analises.push(analise)
          
          // Pequeno delay entre análises
          if (i < criativos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          
        } catch (error) {
          console.warn(`Erro ao analisar criativo ${i + 1}:`, error)
        }
      }

      toast.success(`✅ ${analises.length}/${criativos.length} análises concluídas`)
      return analises

    } catch (error) {
      console.error('Erro na análise em lote:', error)
      toast.error('Erro na análise em lote')
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }, [analiseService])

  /**
   * Retreinar modelo com novos dados
   */
  const retreinarModelo = useCallback(async (novosDados: Array<{
    features: any
    resultadoReal: any
  }>) => {
    try {
      toast.info('Retreinando modelo de IA...')
      const sucesso = await analiseService.retreinarModelo(novosDados)
      
      if (sucesso) {
        toast.success('✅ Modelo retreinado com sucesso!')
      } else {
        toast.error('❌ Falha no retreinamento')
      }
      
      return sucesso
    } catch (error) {
      console.error('Erro no retreinamento:', error)
      toast.error('Erro no retreinamento do modelo')
      return false
    }
  }, [analiseService])

  return {
    // Estados
    isGenerating,
    isAnalyzing,
    temIdeogram,
    temFacebook,
    
    // Funções
    gerarCriativo,
    analisarPerformance,
    analisarLote,
    verificarStatusAPIs,
    retreinarModelo,
    
    // Informações dos serviços
    modeloInfo: analiseService.getModeloInfo(),
    
    // Utilitários
    calcularCustoCreditos: (qualidade: string, variantes: number = 1) => {
      const custoBase = {
        DRAFT: 1,
        STANDARD: 2,
        HIGH: 4,
        ULTRA: 8
      }[qualidade] || 2
      
      return custoBase + Math.max(0, variantes - 1)
    }
  }
}