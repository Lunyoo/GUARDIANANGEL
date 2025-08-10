import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { convertFacebookCurrency, detectCurrencyIssues } from '@/utils/currencyDetector'
import type { MetricasCampanha, Criativo, InsightPreditivo, ApiResponse } from '@/types'

const BASE_URL = 'https://graph.facebook.com/v18.0'

export function useFacebookApi() {
  const { usuarioAtual, hasValidApi } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [erro, setErro] = useState<string>('')

  const makeApiCall = async <T>(endpoint: string, params: Record<string, any> = {}): Promise<T> => {
    if (!usuarioAtual?.configuracaoApi?.facebookToken) {
      throw new Error('Token de acesso não configurado')
    }

    const url = new URL(`${BASE_URL}${endpoint}`)
    url.searchParams.append('access_token', usuarioAtual.configuracaoApi.facebookToken)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    console.log('🔍 Fazendo chamada para API:', url.toString().replace(usuarioAtual.configuracaoApi.facebookToken, '***TOKEN***'))

    const response = await fetch(url.toString())
    const data = await response.json()
    
    console.log('📊 Resposta da API:', { status: response.status, dataKeys: Object.keys(data) })
    
    if (!response.ok) {
      const errorMessage = data.error?.message || `Erro na API: ${response.status}`
      console.error('❌ Erro na API Facebook:', data)
      throw new Error(errorMessage)
    }

    return data
  }

  const buscarCampanhas = async (): Promise<MetricasCampanha[]> => {
    if (!usuarioAtual?.configuracaoApi?.adAccountId) {
      throw new Error('ID da conta de anúncio não configurado')
    }

    try {
      setIsLoading(true)
      setErro('')

      console.log('🎯 Buscando campanhas para conta:', usuarioAtual.configuracaoApi.adAccountId)

      const response = await makeApiCall(`/${usuarioAtual.configuracaoApi.adAccountId}/campaigns`, {
        fields: [
          'id',
          'name', 
          'status',
          'created_time',
          'updated_time',
          'objective'
        ].join(','),
        limit: 50
      })

      const campanhas = response.data || []
      console.log(`📈 Encontradas ${campanhas.length} campanhas`)
      
      if (campanhas.length === 0) {
        console.warn('⚠️ Nenhuma campanha encontrada na conta')
        return []
      }

      // Buscar métricas para cada campanha com campos simplificados
      const campanhasComMetricas = await Promise.all(
        campanhas.map(async (campanha: any) => {
          try {
            console.log(`🔍 Buscando insights para campanha: ${campanha.name} (${campanha.id})`)
            
            const insights = await makeApiCall(`/${campanha.id}/insights`, {
              fields: [
                'impressions',
                'clicks', 
                'spend',
                'ctr',
                'cpc',
                'reach',
                'actions',
                'account_currency'
              ].join(','),
              time_range: JSON.stringify({
                since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Últimos 30 dias
                until: new Date().toISOString().split('T')[0]
              })
            })

            const metricas = insights.data?.[0] || {}
            console.log(`📊 Métricas da campanha ${campanha.name}:`, metricas)

            // Extrair conversões do campo actions se disponível
            const actions = metricas.actions || []
            const conversoes = actions.find((action: any) => 
              action.action_type === 'purchase' || 
              action.action_type === 'lead' ||
              action.action_type === 'complete_registration'
            )?.value || '0'

            const impressoes = parseInt(metricas.impressions || '0')
            const cliques = parseInt(metricas.clicks || '0')
            
            // Detectar moeda da conta e converter adequadamente
            const accountCurrency = metricas.account_currency || 'USD'
            const gastoRaw = parseFloat(metricas.spend || '0')
            const gasto = convertFacebookCurrency(gastoRaw, accountCurrency, 'spend')
            
            const ctr = parseFloat(metricas.ctr || '0')
            const cpcRaw = parseFloat(metricas.cpc || '0')
            const cpc = convertFacebookCurrency(cpcRaw, accountCurrency, 'cpc')
            const conversao = parseInt(conversoes)
            
            // Calcular métricas derivadas
            const cpa = conversao > 0 ? gasto / conversao : 0
            const roas = gasto > 0 && conversao > 0 ? (conversao * 100) / gasto : 0 // Assumindo R$100 por conversão
            
            return {
              id: campanha.id,
              nome: campanha.name,
              status: campanha.status?.toUpperCase() || 'UNKNOWN',
              impressoes,
              cliques,
              conversoes: conversao,
              gasto,
              ctr,
              cpc,
              cpa,
              roas,
              alcance: parseInt(metricas.reach || '0'),
              frequencia: impressoes > 0 && metricas.reach ? impressoes / parseInt(metricas.reach) : 0,
              criadoEm: campanha.created_time,
              atualizadoEm: campanha.updated_time
            } as MetricasCampanha
          } catch (error) {
            console.warn(`⚠️ Erro ao buscar métricas para campanha ${campanha.id}:`, error)
            return {
              id: campanha.id,
              nome: campanha.name,
              status: campanha.status?.toUpperCase() || 'UNKNOWN',
              impressoes: 0,
              cliques: 0,
              conversoes: 0,
              gasto: 0,
              ctr: 0,
              cpc: 0,
              cpa: 0,
              roas: 0,
              alcance: 0,
              frequencia: 0,
              criadoEm: campanha.created_time,
              atualizadoEm: campanha.updated_time
            } as MetricasCampanha
          }
        })
      )

      console.log('✅ Campanhas processadas:', campanhasComMetricas.length)
      
      // Detectar possíveis problemas com conversão de moeda
      const currencyIssues = detectCurrencyIssues(campanhasComMetricas)
      if (currencyIssues.length > 0) {
        console.warn('⚠️ Possíveis problemas detectados:', currencyIssues)
      }
      
      return campanhasComMetricas
    } catch (error) {
      console.error('❌ Erro ao buscar campanhas:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao buscar campanhas')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const buscarCriativos = async (campanhaId?: string): Promise<Criativo[]> => {
    if (!usuarioAtual?.configuracaoApi?.adAccountId) {
      throw new Error('ID da conta de anúncio não configurado')
    }

    try {
      setIsLoading(true)
      setErro('')

      const endpoint = campanhaId 
        ? `/${campanhaId}/ads`
        : `/${usuarioAtual.configuracaoApi.adAccountId}/ads`

      console.log('🎨 Buscando criativos:', endpoint)

      const response = await makeApiCall(endpoint, {
        fields: [
          'id',
          'name',
          'creative',
          'status',
          'created_time',
          'updated_time',
          'campaign_id'
        ].join(','),
        limit: 50
      })

      const ads = response.data || []
      console.log(`🎨 Encontrados ${ads.length} anúncios`)

      if (ads.length === 0) {
        console.warn('⚠️ Nenhum anúncio encontrado')
        return []
      }

      const criativosComMetricas = await Promise.all(
        ads.map(async (ad: any) => {
          try {
            console.log(`🔍 Processando anúncio: ${ad.name} (${ad.id})`)
            
            // Buscar detalhes do criativo de forma mais simples
            let creative: any = {}
            let creativeUrl = ''
            
            try {
              if (ad.creative?.id) {
                const creativeResponse = await makeApiCall(`/${ad.creative.id}`, {
                  fields: 'object_story_spec,image_url,video_id,name,body,thumbnail_url'
                })
                creative = creativeResponse
                creativeUrl = creative.image_url || creative.thumbnail_url || ''
              }
            } catch (error) {
              console.warn(`⚠️ Erro ao buscar criativo ${ad.creative?.id}:`, error)
            }

            // Buscar métricas do anúncio
            let metricas = { impressions: '0', clicks: '0', spend: '0', ctr: '0', cpc: '0', actions: [] }
            
            try {
              const insights = await makeApiCall(`/${ad.id}/insights`, {
                fields: [
                  'impressions',
                  'clicks',
                  'spend',
                  'ctr',
                  'cpc',
                  'actions',
                  'account_currency'
                ].join(','),
                time_range: JSON.stringify({
                  since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Últimos 30 dias
                  until: new Date().toISOString().split('T')[0]
                })
              })
              
              if (insights.data && insights.data.length > 0) {
                metricas = insights.data[0]
              }
            } catch (error) {
              console.warn(`⚠️ Erro ao buscar insights para anúncio ${ad.id}:`, error)
            }

            // Extrair conversões
            const actions = metricas.actions || []
            const conversoes = actions.find((action: any) => 
              action.action_type === 'purchase' || 
              action.action_type === 'lead' ||
              action.action_type === 'complete_registration'
            )?.value || '0'

            const impressoes = parseInt(metricas.impressions || '0')
            const cliques = parseInt(metricas.clicks || '0')
            
            // Detectar moeda da conta e converter adequadamente
            const accountCurrency = metricas.account_currency || 'USD'
            const gastoRaw = parseFloat(metricas.spend || '0')
            const gasto = convertFacebookCurrency(gastoRaw, accountCurrency, 'spend')
            
            const ctr = parseFloat(metricas.ctr || '0')
            const cpcRaw = parseFloat(metricas.cpc || '0')
            const cpc = convertFacebookCurrency(cpcRaw, accountCurrency, 'cpc')
            const conversao = parseInt(conversoes)
            
            const cpa = conversao > 0 ? gasto / conversao : 0
            const roas = gasto > 0 && conversao > 0 ? (conversao * 50) / gasto : 0 // Assumindo R$50 por conversão para anúncios
            
            const storySpec = creative.object_story_spec || {}
            
            const resultado = {
              id: ad.id,
              campanhaId: ad.campaign_id || campanhaId || '',
              nome: ad.name || `Anúncio ${ad.id}`,
              tipo: creative.video_id ? 'VIDEO' : 'IMAGE',
              urlMidia: creativeUrl,
              titulo: storySpec.link_data?.name || creative.name || '',
              descricao: storySpec.link_data?.description || '',
              textoAnuncio: creative.body || storySpec.link_data?.message || '',
              callToAction: storySpec.link_data?.call_to_action?.type || '',
              linkDestino: storySpec.link_data?.link || '',
              metricas: {
                impressoes,
                cliques,
                conversoes: conversao,
                gasto,
                ctr,
                cpc,
                cpa,
                roas
              },
              criadoEm: ad.created_time
            } as Criativo

            console.log(`✅ Criativo processado: ${resultado.nome}, Impressões: ${impressoes}, Gasto: R$${gasto}`)
            return resultado
          } catch (error) {
            console.warn(`❌ Erro ao processar criativo ${ad.id}:`, error)
            return null
          }
        })
      )

      const criativosValidos = criativosComMetricas.filter((c): c is Criativo => c !== null)
      console.log(`✅ Criativos válidos processados: ${criativosValidos.length}`)
      return criativosValidos
    } catch (error) {
      console.error('❌ Erro ao buscar criativos:', error)
      setErro(error instanceof Error ? error.message : 'Erro ao buscar criativos')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const gerarInsightsPreditivos = async (criativos: Criativo[]): Promise<InsightPreditivo[]> => {
    // Simular análise preditiva baseada nos dados reais
    const insights: InsightPreditivo[] = []

    if (criativos.length === 0) return insights

    // Análise de CTR
    const ctrMedio = criativos.reduce((acc, c) => acc + c.metricas.ctr, 0) / criativos.length
    const criativosBaixoCtr = criativos.filter(c => c.metricas.ctr < ctrMedio * 0.7)
    
    if (criativosBaixoCtr.length > 0) {
      insights.push({
        id: `insight-ctr-${Date.now()}`,
        tipo: 'OTIMIZACAO',
        titulo: 'Oportunidade de Melhoria em CTR',
        descricao: `${criativosBaixoCtr.length} criativos estão performando ${((1 - criativosBaixoCtr[0]?.metricas.ctr / ctrMedio) * 100).toFixed(1)}% abaixo da média. Considere testar novos elementos visuais ou textos.`,
        impactoEstimado: 25,
        confianca: 85,
        acoes: ['Testar novos títulos', 'Otimizar imagens', 'Ajustar call-to-action'],
        criadoEm: new Date().toISOString()
      })
    }

    // Análise de ROAS
    const roasMedio = criativos.reduce((acc, c) => acc + c.metricas.roas, 0) / criativos.length
    const criativosAltoRoas = criativos.filter(c => c.metricas.roas > roasMedio * 1.5)
    
    if (criativosAltoRoas.length > 0) {
      insights.push({
        id: `insight-roas-${Date.now()}`,
        tipo: 'OPORTUNIDADE',
        titulo: 'Escalar Criativos de Alto ROAS',
        descricao: `${criativosAltoRoas.length} criativos mostram ROAS ${((criativosAltoRoas[0]?.metricas.roas / roasMedio - 1) * 100).toFixed(1)}% acima da média. Considere aumentar o orçamento.`,
        impactoEstimado: 40,
        confianca: 92,
        acoes: ['Aumentar orçamento em 30%', 'Duplicar para novas audiências', 'Criar variações similares'],
        criadoEm: new Date().toISOString()
      })
    }

    return insights
  }

  const testarConexaoApi = async (): Promise<any> => {
    if (!usuarioAtual?.configuracaoApi?.facebookToken) {
      throw new Error('Token de acesso não configurado')
    }

    if (!usuarioAtual?.configuracaoApi?.adAccountId) {
      throw new Error('ID da conta de anúncio não configurado')
    }

    try {
      console.log('🔍 Testando conexão com a API do Facebook...')
      
      // Testar acesso à conta de anúncios e obter informações de moeda
      const response = await makeApiCall(`/${usuarioAtual.configuracaoApi.adAccountId}`, {
        fields: 'id,name,account_status,currency,timezone_name'
      })

      console.log('✅ Conexão testada com sucesso:', response)
      console.log(`💰 Moeda da conta: ${response.currency}`)
      console.log(`🌍 Timezone: ${response.timezone_name}`)
      
      if (!response.id) {
        throw new Error('Resposta inválida da API do Facebook')
      }

      console.log(`✅ Conta de anúncios válida: ${response.name} (${response.id}) - Moeda: ${response.currency}`)
      
      return response
    } catch (error) {
      console.error('❌ Erro no teste de conexão:', error)
      throw error
    }
  }

  return {
    isLoading,
    erro,
    hasValidApi,
    buscarCampanhas,
    buscarCriativos,
    gerarInsightsPreditivos,
    testarConexaoApi
  }
}