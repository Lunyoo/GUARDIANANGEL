/**
 * Hook para gerenciar a automação master do sistema
 */

import { useState, useCallback } from 'react'
import { useKV } from './useKV'
import { automationMasterService, type AutomationConfig, type AutomationResult } from '@/services/automationMasterService'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

export function useAutomacaoMaster() {
  const { usuarioAtual } = useAuth()
  const [isRunning, setIsRunning] = useState(false)
  const [currentResult, setCurrentResult] = useState<AutomationResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [automationHistory, setAutomationHistory] = useKV<AutomationResult[]>('automation_history', [])
  const [automationConfig, setAutomationConfigKV] = useKV<AutomationConfig>('automation_config', {
    user_id: '',
    niche_preference: 'white',
    budget_range: { min: 100, max: 1000 },
    target_audience: 'Adultos interessados em desenvolvimento',
    automation_level: 'moderate',
    apis: {}
  })

  // Configurar automação
  const configurarAutomacao = useCallback((config: Partial<AutomationConfig>) => {
    if (!usuarioAtual) return

    const newConfig: AutomationConfig = {
      ...automationConfig,
      ...config,
      user_id: usuarioAtual.id,
      apis: {
        ...automationConfig.apis,
        ...config.apis,
        facebook_token: usuarioAtual.configuracaoApi?.facebookToken,
        facebook_account_id: usuarioAtual.configuracaoApi?.adAccountId,
        kiwify_client_id: usuarioAtual.configuracaoApi?.kiwifyClientId,
        kiwify_client_secret: usuarioAtual.configuracaoApi?.kiwifyClientSecret,
        ideogram_api_key: usuarioAtual.configuracaoApi?.ideogramToken
      }
    }

    setAutomationConfigKV(newConfig)
    automationMasterService.setConfig(newConfig)
    
    toast.success('✅ Configuração da automação atualizada')
  }, [automationConfig, usuarioAtual, setAutomationConfigKV])

  // Executar automação completa
  const executarAutomacaoCompleta = useCallback(async () => {
    if (!usuarioAtual || !automationConfig) {
      toast.error('❌ Configuração necessária para executar automação')
      return
    }

    // Verificar APIs necessárias
    if (!usuarioAtual.configuracaoApi?.ideogramToken) {
      toast.error('❌ Token do Ideogram AI necessário para automação completa')
      return
    }

    try {
      setIsRunning(true)
      setProgress(0)
      setCurrentStep('Iniciando automação master...')
      
      toast.info('🚀 Iniciando automação completa do sistema')

      // Simular progresso durante a execução
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 95))
      }, 1000)

      // Executar automação
      const result = await automationMasterService.runFullAutomation()

      clearInterval(progressInterval)
      setProgress(100)
      setCurrentStep('Automação concluída!')
      setCurrentResult(result)

      // Salvar no histórico
      setAutomationHistory(prev => [result, ...prev.slice(0, 9)]) // Manter últimas 10

      if (result.success) {
        toast.success(`✅ Automação concluída! ${result.steps_completed}/${result.total_steps} etapas`, {
          description: `${result.results.generated_creatives?.length || 0} criativos gerados, produto criado`
        })
      } else {
        toast.error(`❌ Automação incompleta: ${result.errors.join(', ')}`)
      }

    } catch (error) {
      console.error('Erro na automação:', error)
      toast.error(`❌ Erro na automação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      setCurrentResult({
        success: false,
        steps_completed: 0,
        total_steps: 8,
        results: {},
        errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
        recommendations: [],
        next_actions: []
      })
    } finally {
      setIsRunning(false)
      setProgress(0)
      setCurrentStep('')
    }
  }, [usuarioAtual, automationConfig, setAutomationHistory])

  // Executar apenas scraping
  const executarScraping = useCallback(async () => {
    if (!automationConfig) {
      toast.error('❌ Configuração necessária')
      return
    }

    try {
      setIsRunning(true)
      setCurrentStep('Executando scraping de ofertas...')
      toast.info('🔍 Iniciando scraping de ofertas de sucesso')

      // Simular scraping (substitua pela implementação real)
      await new Promise(resolve => setTimeout(resolve, 3000))

      const mockResults = [
        {
          id: '1',
          advertiser_name: 'Curso de Marketing Digital',
          main_text: 'Descubra o segredo para aumentar suas vendas em 300%',
          success_score: 8.5,
          engagement: 2500,
          niche: automationConfig.niche_preference
        },
        {
          id: '2',
          advertiser_name: 'Mentoria Exclusiva',
          main_text: 'Método comprovado para ganhar R$ 10k/mês trabalhando de casa',
          success_score: 9.2,
          engagement: 3800,
          niche: automationConfig.niche_preference
        }
      ]

      toast.success(`✅ Scraping concluído! ${mockResults.length} ofertas encontradas`)
      return mockResults

    } catch (error) {
      console.error('Erro no scraping:', error)
      toast.error(`❌ Erro no scraping: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return []
    } finally {
      setIsRunning(false)
      setCurrentStep('')
    }
  }, [automationConfig])

  // Gerar criativos
  const gerarCriativos = useCallback(async (offerData?: any) => {
    if (!usuarioAtual?.configuracaoApi?.ideogramToken) {
      toast.error('❌ Token do Ideogram AI necessário')
      return []
    }

    try {
      setIsRunning(true)
      setCurrentStep('Gerando criativos com IA...')
      toast.info('🎨 Iniciando geração de criativos')

      // Simular geração de criativos
      await new Promise(resolve => setTimeout(resolve, 5000))

      const mockCreatives = [
        {
          id: 'creative_1',
          url: '/placeholder-creative-1.jpg',
          prompt: 'Professional marketing campaign image for digital success',
          score: 8.7,
          predicted_performance: 'high'
        },
        {
          id: 'creative_2',
          url: '/placeholder-creative-2.jpg',
          prompt: 'Engaging visual for online business course promotion',
          score: 9.1,
          predicted_performance: 'high'
        }
      ]

      toast.success(`✅ ${mockCreatives.length} criativos gerados com sucesso!`)
      return mockCreatives

    } catch (error) {
      console.error('Erro na geração de criativos:', error)
      toast.error(`❌ Erro na geração de criativos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return []
    } finally {
      setIsRunning(false)
      setCurrentStep('')
    }
  }, [usuarioAtual])

  // Criar produto automaticamente
  const criarProdutoAutomatico = useCallback(async (offerData: any = {}) => {
    if (!usuarioAtual?.configuracaoApi?.kiwifyToken) {
      toast.error('❌ Token do Kiwify necessário')
      return null
    }

    try {
      setIsRunning(true)
      setCurrentStep('Criando produto no Kiwify...')
      toast.info('🏭 Criando produto baseado na análise de ofertas')

      // Importar e configurar o serviço
      const { kiwifyService } = await import('@/services/kiwifyService')
      kiwifyService.setApiKey(usuarioAtual.configuracaoApi.kiwifyToken)

      // Dados do produto baseados na oferta ou padrão
      const productData = {
        name: offerData?.name || `Método Exclusivo ${automationConfig.niche_preference.toUpperCase()} - ${new Date().toLocaleDateString('pt-BR')}`,
        price: offerData?.price || 97,
        description: offerData?.description || 'Produto digital exclusivo criado através de análise de mercado e inteligência artificial.',
        category: 'ebook' as const,
        niche: automationConfig.niche_preference,
        checkout_settings: {
          headline: offerData?.headline || 'Oferta Exclusiva - Transforme Seus Resultados',
          subheadline: offerData?.subheadline || 'Método comprovado para alcançar seus objetivos',
          bullet_points: offerData?.benefits || [
            'Conteúdo exclusivo e atualizado',
            'Acesso imediato após pagamento',
            'Método passo a passo',
            'Suporte especializado',
            'Garantia de 7 dias'
          ]
        }
      }

      console.log('📦 Criando produto:', productData)
      const product = await kiwifyService.createProduct(productData)

      toast.success(`✅ Produto "${product.name}" criado no Kiwify!`, {
        description: `ID: ${product.id} | Preço: R$ ${product.price}`
      })
      
      return product

    } catch (error) {
      console.error('Erro na criação do produto:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`❌ Erro na criação do produto: ${errorMessage}`)
      return null
    } finally {
      setIsRunning(false)
      setCurrentStep('')
    }
  }, [usuarioAtual, automationConfig])

  // Analisar performance da automação
  const analisarPerformance = useCallback(() => {
    if (automationHistory.length === 0) {
      return {
        total_automations: 0,
        success_rate: 0,
        avg_creatives_generated: 0,
        avg_completion_rate: 0
      }
    }

    const successful = automationHistory.filter(a => a.success).length
    const avgCreatives = automationHistory.reduce((acc, a) => 
      acc + (a.results.generated_creatives?.length || 0), 0) / automationHistory.length
    const avgCompletion = automationHistory.reduce((acc, a) => 
      acc + (a.steps_completed / a.total_steps), 0) / automationHistory.length

    return {
      total_automations: automationHistory.length,
      success_rate: (successful / automationHistory.length) * 100,
      avg_creatives_generated: Math.round(avgCreatives),
      avg_completion_rate: Math.round(avgCompletion * 100)
    }
  }, [automationHistory])

  // Limpar histórico
  const limparHistorico = useCallback(() => {
    setAutomationHistory([])
    toast.success('✅ Histórico de automação limpo')
  }, [setAutomationHistory])

  // Verificar se pode executar automação
  const podeExecutarAutomacao = useCallback(() => {
    if (!usuarioAtual) return { pode: false, motivo: 'Usuário não logado' }
    
    const config = usuarioAtual.configuracaoApi
    if (!config?.facebookToken) return { pode: false, motivo: 'Token do Facebook necessário' }
    if (!config?.adAccountId) return { pode: false, motivo: 'ID da conta de anúncio do Facebook necessário' }
    if (!config?.ideogramToken) return { pode: false, motivo: 'Token do Ideogram necessário' }
    if (!config?.kiwifyToken) return { pode: false, motivo: 'Token do Kiwify necessário' }
    
    return { pode: true, motivo: '' }
  }, [usuarioAtual])

  return {
    // Estado
    isRunning,
    currentResult,
    progress,
    currentStep,
    automationHistory,
    automationConfig,

    // Ações
    configurarAutomacao,
    executarAutomacaoCompleta,
    executarScraping,
    gerarCriativos,
    criarProdutoAutomatico,
    
    // Análise
    analisarPerformance,
    limparHistorico,
    podeExecutarAutomacao,

    // Status
    status: automationMasterService.getStatus()
  }
}