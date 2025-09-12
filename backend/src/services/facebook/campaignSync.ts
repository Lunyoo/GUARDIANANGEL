import axios from 'axios'
import { budgetAllocator } from '../ml/budgetAllocator.js'
import logger from '../../config/logger.js'

interface FacebookCampaign {
  id: string
  name: string
  status: string
  objective: string
  daily_budget?: number
  lifetime_budget?: number
  spend?: number
  impressions?: number
  clicks?: number
  actions?: Array<{ action_type: string; value: string }>
  action_values?: Array<{ action_type: string; value: string }>
}

interface FacebookAdset {
  id: string
  name: string
  campaign_id: string
  status: string
  daily_budget: number
  spend?: number
  actions?: Array<{ action_type: string; value: string }>
  action_values?: Array<{ action_type: string; value: string }>
}

export class FacebookCampaignSync {
  private facebookToken: string
  private adAccountId: string

  constructor(facebookToken: string, adAccountId: string) {
    this.facebookToken = facebookToken
    this.adAccountId = adAccountId
  }

  async syncAllCampaigns() {
    try {
      logger.info('🔄 Iniciando sincronização de campanhas do Facebook...')
      
      // 1. Buscar campanhas ativas
      const campaigns = await this.fetchCampaigns()
      logger.info(`📊 Encontradas ${campaigns.length} campanhas`)

      // 2. Buscar ad sets para cada campanha
      const campaignsWithAdsets = await Promise.all(
        campaigns.map(async (campaign) => {
          const adsets = await this.fetchAdsets(campaign.id)
          return { ...campaign, adsets }
        })
      )

      // 3. Sincronizar com Budget Allocator
      let syncedCount = 0
      for (const campaign of campaignsWithAdsets) {
        try {
          await this.syncCampaignToBudgetAllocator(campaign)
          
          // Sincronizar ad sets como campanhas individuais também
          for (const adset of campaign.adsets) {
            await this.syncAdsetToBudgetAllocator(adset, campaign.name)
          }
          
          syncedCount++
        } catch (error: any) {
          logger.error(`❌ Erro ao sincronizar campanha ${campaign.id}:`, error.message)
        }
      }

      logger.info(`✅ Sincronização concluída: ${syncedCount}/${campaigns.length} campanhas`)
      
      return {
        success: true,
        syncedCampaigns: syncedCount,
        totalCampaigns: campaigns.length,
        campaigns: campaignsWithAdsets
      }
    } catch (error: any) {
      logger.error('❌ Erro na sincronização:', error.message)
      throw error
    }
  }

  private async fetchCampaigns(): Promise<FacebookCampaign[]> {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${this.adAccountId}/campaigns`,
      {
        params: {
          fields: 'id,name,status,objective,daily_budget,lifetime_budget',
          limit: 100,
          access_token: this.facebookToken
        }
      }
    )

    // Buscar insights para cada campanha
    const campaignsWithInsights = await Promise.all(
      response.data.data.map(async (campaign: any) => {
        try {
          const insights = await this.fetchCampaignInsights(campaign.id)
          return { ...campaign, ...insights }
        } catch (error) {
          logger.warn(`⚠️ Não foi possível buscar insights para campanha ${campaign.id}`)
          return campaign
        }
      })
    )

    return campaignsWithInsights
  }

  private async fetchAdsets(campaignId: string): Promise<FacebookAdset[]> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${campaignId}/adsets`,
        {
          params: {
            fields: 'id,name,status,daily_budget',
            access_token: this.facebookToken
          }
        }
      )

      // Buscar insights para cada ad set
      const adsetsWithInsights = await Promise.all(
        response.data.data.map(async (adset: any) => {
          try {
            const insights = await this.fetchAdsetInsights(adset.id)
            return { ...adset, campaign_id: campaignId, ...insights }
          } catch (error) {
            return { ...adset, campaign_id: campaignId }
          }
        })
      )

      return adsetsWithInsights
    } catch (error) {
      logger.warn(`⚠️ Não foi possível buscar ad sets para campanha ${campaignId}`)
      return []
    }
  }

  private async fetchCampaignInsights(campaignId: string) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${campaignId}/insights`,
        {
          params: {
            fields: 'spend,impressions,clicks,actions,action_values',
            date_preset: 'lifetime',
            access_token: this.facebookToken
          }
        }
      )

      const data = response.data.data[0] || {}
      return {
        spend: parseFloat(data.spend || '0'),
        impressions: parseInt(data.impressions || '0'),
        clicks: parseInt(data.clicks || '0'),
        actions: data.actions || [],
        action_values: data.action_values || []
      }
    } catch (error) {
      return {}
    }
  }

  private async fetchAdsetInsights(adsetId: string) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${adsetId}/insights`,
        {
          params: {
            fields: 'spend,actions,action_values',
            date_preset: 'lifetime',
            access_token: this.facebookToken
          }
        }
      )

      const data = response.data.data[0] || {}
      return {
        spend: parseFloat(data.spend || '0'),
        actions: data.actions || [],
        action_values: data.action_values || []
      }
    } catch (error) {
      return {}
    }
  }

  private async syncCampaignToBudgetAllocator(campaign: FacebookCampaign & { adsets: FacebookAdset[] }) {
    // Calcular métricas agregadas dos ad sets
    const totalBudget = campaign.adsets.reduce((sum, adset) => sum + (adset.daily_budget || 0), 0)
    const totalSpent = campaign.spend || 0
    
    // Calcular conversões e receita
    const purchases = this.extractActionValue(campaign.actions, 'purchase') || 
                    this.extractActionValue(campaign.actions, 'offsite_conversion.purchase') || 0
    const purchaseValue = this.extractActionValue(campaign.action_values, 'purchase') || 
                         this.extractActionValue(campaign.action_values, 'offsite_conversion.purchase') || 0
    
    const roas = totalSpent > 0 ? purchaseValue / totalSpent : 0

    budgetAllocator.addOrUpdateCampaign({
      campaignId: campaign.id,
      name: campaign.name,
      budget: totalBudget,
      totalSpent,
      totalLeads: purchases,
      roas,
      active: campaign.status === 'ACTIVE'
    })

    logger.info(`📊 Sincronizada campanha: ${campaign.name} (Budget: R$${(totalBudget/100).toFixed(2)}, ROAS: ${roas.toFixed(2)})`)
  }

  private async syncAdsetToBudgetAllocator(adset: FacebookAdset, campaignName: string) {
    const totalSpent = adset.spend || 0
    
    // Calcular conversões e receita do ad set
    const purchases = this.extractActionValue(adset.actions, 'purchase') || 
                    this.extractActionValue(adset.actions, 'offsite_conversion.purchase') || 0
    const purchaseValue = this.extractActionValue(adset.action_values, 'purchase') || 
                         this.extractActionValue(adset.action_values, 'offsite_conversion.purchase') || 0
    
    const roas = totalSpent > 0 ? purchaseValue / totalSpent : 0

    budgetAllocator.addOrUpdateCampaign({
      campaignId: `adset_${adset.id}`,
      name: `${campaignName} - ${adset.name}`,
      budget: adset.daily_budget || 0,
      totalSpent,
      totalLeads: purchases,
      roas,
      active: adset.status === 'ACTIVE'
    })

    logger.info(`📊 Sincronizado ad set: ${adset.name} (Budget: R$${((adset.daily_budget||0)/100).toFixed(2)}, ROAS: ${roas.toFixed(2)})`)
  }

  private extractActionValue(actions: Array<{ action_type: string; value: string }> | undefined, actionType: string): number {
    if (!actions) return 0
    const action = actions.find(a => a.action_type === actionType)
    return action ? parseFloat(action.value) : 0
  }

  // Método para sync contínuo (pode ser chamado por cron)
  static async autoSync() {
    const facebookToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN
    const adAccountId = process.env.AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID

    if (!facebookToken || !adAccountId) {
      logger.warn('⚠️ Token do Facebook ou Ad Account ID não configurados para auto-sync')
      return { success: false, error: 'missing_credentials' }
    }

    try {
      const sync = new FacebookCampaignSync(facebookToken, adAccountId)
      return await sync.syncAllCampaigns()
    } catch (error: any) {
      logger.error('❌ Erro no auto-sync:', error.message)
      return { success: false, error: error.message }
    }
  }
}

export const facebookCampaignSync = FacebookCampaignSync
