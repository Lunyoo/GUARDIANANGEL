import { useState, useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { useFacebookApi } from './useFacebookApi'
import { useNotifications } from './useNotifications'
import { toast } from 'sonner'
import type { MetricasCampanha, Criativo, InsightPreditivo } from '@/types'

export function useRealTime() {
  const { isAuthenticated, hasValidApi } = useAuth()
  const { buscarCampanhas, buscarCriativos, gerarInsightsPreditivos, testarConexaoApi } = useFacebookApi()
  const { analisarMetricas } = useNotifications()
  
  const [campanhas, setCampanhas] = useState<MetricasCampanha[]>([])
  const [criativos, setCriativos] = useState<Criativo[]>([])
  const [insights, setInsights] = useState<InsightPreditivo[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [erro, setErro] = useState<string>('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)
  const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState(true)
  
  const intervalRef = useRef<NodeJS.Timeout>()
  const isLoadingRef = useRef(false)

  const carregarDados = async (isAutoUpdate = false) => {
    if (!hasValidApi || isLoadingRef.current) return
    
    try {
      isLoadingRef.current = true
      if (!isAutoUpdate) {
        setIsLoadingData(true)
      }
      setErro('')
      
      if (!isAutoUpdate) {
        console.log('🔍 Testando conexão com API...')
        await testarConexaoApi()
        console.log('✅ Conexão API testada com sucesso')
      }
      
      // Carregar campanhas
      console.log('🎯 Carregando campanhas...')
      const campanhasData = await buscarCampanhas()
      setCampanhas(campanhasData)
      
      // Carregar criativos
      console.log('🎨 Carregando criativos...')
      const todosCriativos = await buscarCriativos()
      setCriativos(todosCriativos)
      
      // Gerar insights preditivos
      if (todosCriativos.length > 0) {
        console.log('🧠 Gerando insights preditivos...')
        const insightsPreditivos = await gerarInsightsPreditivos(todosCriativos)
        setInsights(insightsPreditivos)
      }
      
      setUltimaAtualizacao(new Date())
      
      // Analisar métricas para alertas
      analisarMetricas(campanhasData)
      
      if (!isAutoUpdate) {
        toast.success('✅ Dados atualizados com sucesso!', {
          description: `${campanhasData.length} campanhas, ${todosCriativos.length} criativos`
        })
      }
      
      console.log(`✅ Dados carregados: ${campanhasData.length} campanhas, ${todosCriativos.length} criativos`)
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados'
      setErro(errorMessage)
      
      if (!isAutoUpdate) {
        toast.error(`❌ Erro ao carregar dados: ${errorMessage}`)
      }
    } finally {
      isLoadingRef.current = false
      setIsLoadingData(false)
    }
  }

  // Configurar atualização automática
  useEffect(() => {
    if (!isAuthenticated || !hasValidApi || !isAutoUpdateEnabled) {
      return
    }

    // Carregar dados inicialmente
    carregarDados(false)

    // Configurar intervalo de atualização (a cada 2 minutos)
    intervalRef.current = setInterval(() => {
      console.log('🔄 Atualização automática iniciada...')
      carregarDados(true)
    }, 2 * 60 * 1000) // 2 minutos

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isAuthenticated, hasValidApi, isAutoUpdateEnabled])

  // Limpar interval quando componente desmonta
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const toggleAutoUpdate = () => {
    setIsAutoUpdateEnabled(prev => {
      const newValue = !prev
      toast.info(
        newValue ? '🔄 Atualização automática ativada' : '⏸️ Atualização automática pausada',
        {
          description: newValue ? 'Dados serão atualizados a cada 2 minutos' : 'Clique em "Atualizar" para carregar dados'
        }
      )
      return newValue
    })
  }

  const forceUpdate = async () => {
    await carregarDados(false)
  }

  return {
    campanhas,
    criativos,
    insights,
    isLoadingData,
    erro,
    ultimaAtualizacao,
    isAutoUpdateEnabled,
    carregarDados: forceUpdate,
    toggleAutoUpdate
  }
}