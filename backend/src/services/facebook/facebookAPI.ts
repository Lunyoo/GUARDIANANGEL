// 🎯 FACEBOOK MARKETING API - INTEGRAÇÃO REAL SHAPEFIT
import axios from 'axios'

interface FacebookConfig {
  accessToken: string
  accountId: string
  appSecret: string
}

interface AdAccount {
  id: string
  name: string
  account_status: number
  amount_spent: string
  balance: string
  currency: string
}

interface Campaign {
  id: string
  name: string
  status: string
  objective: string
  spend: string
  impressions: string
  clicks: string
  ctr: string
  cpm: string
  cpc: string
}

interface AdCreative {
  id: string
  name: string
  status: string
  object_story_spec?: any
  image_url?: string
  video_id?: string
  body?: string
  title?: string
}

interface AdInsights {
  impressions: string
  clicks: string
  spend: string
  actions?: Array<{
    action_type: string
    value: string
  }>
  ctr: string
  cpm: string
  cpc: string
  cost_per_action_type?: Array<{
    action_type: string
    value: string
  }>
}

class FacebookMarketingAPI {
  private config: FacebookConfig
  private baseURL = 'https://graph.facebook.com/v18.0'

  constructor(config: FacebookConfig) {
    this.config = config
  }

  /**
   * 🏢 Buscar dados da conta de anúncios
   */
  async getAdAccount(): Promise<AdAccount> {
    try {
      const response = await axios.get(
        `${this.baseURL}/act_${this.config.accountId}`,
        {
          params: {
            access_token: this.config.accessToken,
            fields: 'id,name,account_status,amount_spent,balance,currency'
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('❌ Erro ao buscar conta de anúncios:', error)
      throw new Error(`Erro na API Facebook: ${(error as any)?.response?.data?.error?.message || 'Unknown error'}`)
    }
  }

  /**
   * 🎯 Buscar campanhas ativas
   */
  async getCampaigns(limit: number = 50): Promise<Campaign[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/act_${this.config.accountId}/campaigns`,
        {
          params: {
            access_token: this.config.accessToken,
            fields: 'id,name,status,objective',
            limit,
            filtering: JSON.stringify([{
              field: 'campaign.effective_status',
              operator: 'IN',
              value: ['ACTIVE', 'PAUSED']
            }])
          }
        }
      )

      // Buscar insights para cada campanha
      const campaignsWithInsights = await Promise.all(
        response.data.data.map(async (campaign: any) => {
          try {
            const insights = await this.getCampaignInsights(campaign.id)
            return {
              ...campaign,
              ...insights
            }
          } catch (error) {
            console.error(`❌ Erro ao buscar insights da campanha ${campaign.id}:`, error)
            return campaign
          }
        })
      )

      return campaignsWithInsights
    } catch (error) {
      console.error('❌ Erro ao buscar campanhas:', error)
      throw new Error(`Erro ao buscar campanhas: ${(error as any)?.response?.data?.error?.message || 'Unknown error'}`)
    }
  }

  /**
   * 📊 Buscar insights de uma campanha
   */
  async getCampaignInsights(campaignId: string, dateRange: string = 'last_7d'): Promise<AdInsights> {
    try {
      const response = await axios.get(
        `${this.baseURL}/${campaignId}/insights`,
        {
          params: {
            access_token: this.config.accessToken,
            fields: 'impressions,clicks,spend,actions,ctr,cpm,cpc,cost_per_action_type',
            date_preset: dateRange,
            level: 'campaign'
          }
        }
      )

      return response.data.data[0] || {}
    } catch (error) {
      console.error(`❌ Erro ao buscar insights da campanha ${campaignId}:`, error)
      return {} as AdInsights
    }
  }

  /**
   * 🎨 Buscar criativos da conta
   */
  async getAdCreatives(limit: number = 50): Promise<AdCreative[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/act_${this.config.accountId}/adcreatives`,
        {
          params: {
            access_token: this.config.accessToken,
            fields: 'id,name,status,object_story_spec,image_url,video_id,body,title',
            limit
          }
        }
      )

      return response.data.data
    } catch (error) {
      console.error('❌ Erro ao buscar criativos:', error)
      throw new Error(`Erro ao buscar criativos: ${(error as any)?.response?.data?.error?.message || 'Unknown error'}`)
    }
  }

  /**
   * 📈 Buscar insights de anúncios (por criativo)
   */
  async getAdInsights(dateRange: string = 'last_7d', limit: number = 50): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/act_${this.config.accountId}/insights`,
        {
          params: {
            access_token: this.config.accessToken,
            fields: 'ad_id,ad_name,adset_name,campaign_name,impressions,clicks,spend,actions,ctr,cpm,cpc,cost_per_action_type,purchase_roas',
            date_preset: dateRange,
            level: 'ad',
            limit,
            breakdowns: 'ad_format_asset'
          }
        }
      )

      return response.data.data
    } catch (error) {
      console.error('❌ Erro ao buscar insights de anúncios:', error)
      throw new Error(`Erro ao buscar insights: ${(error as any)?.response?.data?.error?.message || 'Unknown error'}`)
    }
  }

  /**
   * 🎯 Buscar insights específicos por criativo
   */
  async getCreativeInsights(creativeId: string, dateRange: string = 'last_7d'): Promise<any> {
    try {
      // Primeiro buscar anúncios que usam este criativo
      const adsResponse = await axios.get(
        `${this.baseURL}/act_${this.config.accountId}/ads`,
        {
          params: {
            access_token: this.config.accessToken,
            fields: 'id,name,creative',
            filtering: JSON.stringify([{
              field: 'ad.creative_id',
              operator: 'EQUAL',
              value: creativeId
            }])
          }
        }
      )

      if (adsResponse.data.data.length === 0) {
        return null
      }

      // Buscar insights agregados dos anúncios
      const adIds = adsResponse.data.data.map((ad: any) => ad.id)
      const insights = await Promise.all(
        adIds.map(async (adId: string) => {
          const insightResponse = await axios.get(
            `${this.baseURL}/${adId}/insights`,
            {
              params: {
                access_token: this.config.accessToken,
                fields: 'impressions,clicks,spend,actions,ctr,cpm,cpc,cost_per_action_type,purchase_roas',
                date_preset: dateRange
              }
            }
          )
          return insightResponse.data.data[0] || {}
        })
      )

      // Agregar insights
      const aggregated = insights.reduce((total, insight) => {
        return {
          impressions: (parseInt(total.impressions || '0') + parseInt(insight.impressions || '0')).toString(),
          clicks: (parseInt(total.clicks || '0') + parseInt(insight.clicks || '0')).toString(),
          spend: (parseFloat(total.spend || '0') + parseFloat(insight.spend || '0')).toFixed(2),
          ctr: insight.ctr || total.ctr || '0',
          cpm: insight.cpm || total.cpm || '0',
          cpc: insight.cpc || total.cpc || '0',
          actions: insight.actions || total.actions || [],
          purchase_roas: insight.purchase_roas || total.purchase_roas || []
        }
      }, {})

      return aggregated
    } catch (error) {
      console.error(`❌ Erro ao buscar insights do criativo ${creativeId}:`, error)
      return null
    }
  }

  /**
   * 📊 Buscar dados consolidados da conta
   */
  async getAccountSummary(dateRange: string = 'last_7d'): Promise<any> {
    try {
      const [account, insights] = await Promise.all([
        this.getAdAccount(),
        axios.get(
          `${this.baseURL}/act_${this.config.accountId}/insights`,
          {
            params: {
              access_token: this.config.accessToken,
              fields: 'impressions,clicks,spend,actions,ctr,cpm,cpc,cost_per_action_type,purchase_roas',
              date_preset: dateRange,
              level: 'account'
            }
          }
        )
      ])

      console.log('🔍 Facebook Account Data:', account)
      console.log('🔍 Facebook Insights Data:', insights.data)

      const insightData = insights.data.data[0] || {}
      
      // Calcular conversões
      const conversions = insightData.actions?.find((action: any) => 
        action.action_type === 'purchase' || action.action_type === 'offsite_conversion.fb_pixel_purchase'
      )?.value || '0'

      // Calcular ROAS
      const roas = insightData.purchase_roas?.[0]?.value || '0'

      return {
        account,
        performance: {
          ...insightData,
          conversions: parseInt(conversions),
          roas: parseFloat(roas)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar resumo da conta:', error)
      throw new Error(`Erro ao buscar resumo: ${(error as any)?.response?.data?.error?.message || 'Unknown error'}`)
    }
  }

  /**
   * 🔍 Buscar top performers
   */
  async getTopPerformers(dateRange: string = 'last_7d', metric: string = 'purchase_roas'): Promise<any[]> {
    try {
      const insights = await this.getAdInsights(dateRange, 100)
      
      // Filtrar apenas anúncios com dados do métrica
      const validInsights = insights.filter(insight => {
        if (metric === 'purchase_roas') {
          return insight.purchase_roas && parseFloat(insight.purchase_roas[0]?.value || '0') > 0
        }
        return insight[metric] && parseFloat(insight[metric]) > 0
      })

      // Ordenar por métrica
      validInsights.sort((a, b) => {
        const aValue = metric === 'purchase_roas' ? 
          parseFloat(a.purchase_roas?.[0]?.value || '0') : 
          parseFloat(a[metric] || '0')
        const bValue = metric === 'purchase_roas' ? 
          parseFloat(b.purchase_roas?.[0]?.value || '0') : 
          parseFloat(b[metric] || '0')
        
        return metric === 'cpc' || metric === 'cpm' ? aValue - bValue : bValue - aValue
      })

      return validInsights.slice(0, 10)
    } catch (error) {
      console.error('❌ Erro ao buscar top performers:', error)
      throw new Error(`Erro ao buscar top performers: ${(error as any)?.message || 'Unknown error'}`)
    }
  }
}

// 🏭 Factory para criar instância da API
export function createFacebookAPI(): FacebookMarketingAPI {
  const config: FacebookConfig = {
    accessToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
    accountId: process.env.FACEBOOK_AD_ACCOUNT_IDS?.split(',')[0] || '', // Usa o primeiro account ID
    appSecret: process.env.FACEBOOK_APP_SECRET || ''
  }

  if (!config.accessToken || !config.accountId) {
    throw new Error('❌ Configuração Facebook incompleta! Verifique FACEBOOK_ACCESS_TOKEN e FACEBOOK_AD_ACCOUNT_IDS no .env')
  }

  // Remove 'act_' prefix se presente
  if (config.accountId.startsWith('act_')) {
    config.accountId = config.accountId.substring(4)
  }

  console.log(`🔗 Facebook API inicializada para conta: ${config.accountId}`)
  
  return new FacebookMarketingAPI(config)
}

export { FacebookMarketingAPI }
export type { AdAccount, Campaign, AdCreative, AdInsights }
