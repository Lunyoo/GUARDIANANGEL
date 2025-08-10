import { Router } from 'express'
import axios from 'axios'
import { getDatabase } from '../config/database.js'
import { cacheGet, cacheSet } from '../config/redis.js'
import logger from '../config/logger.js'

const router = Router()

// Get campaigns
router.get('/', async (req: any, res, next) => {
  try {
    const user = req.user
    const cacheKey = `campaigns:${user.id}`
    
    // Try cache first
    let campaigns = await cacheGet(cacheKey)
    
    if (!campaigns && user.facebook_token && user.ad_account_id) {
      // Fetch from Facebook API
      const response = await axios.get(`https://graph.facebook.com/v18.0/${user.ad_account_id}/campaigns`, {
        params: {
          access_token: user.facebook_token,
          fields: 'id,name,status,objective,created_time,updated_time,insights{impressions,clicks,spend,actions,ctr,cpm,cost_per_action_type}',
          limit: 100
        }
      })
      
      campaigns = response.data.data.map((campaign: any) => {
        const insights = campaign.insights?.data?.[0] || {}
        return {
          id: campaign.id,
          nome: campaign.name,
          status: campaign.status,
          objetivo: campaign.objective,
          impressoes: parseInt(insights.impressions || '0'),
          cliques: parseInt(insights.clicks || '0'),
          gasto: parseFloat(insights.spend || '0'),
          conversoes: insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0,
          ctr: parseFloat(insights.ctr || '0'),
          cpm: parseFloat(insights.cpm || '0'),
          roas: insights.actions?.find((a: any) => a.action_type === 'purchase') 
            ? parseFloat(insights.spend || '0') > 0 
              ? (insights.actions.find((a: any) => a.action_type === 'purchase').value * 100) / parseFloat(insights.spend)
              : 0
            : 0,
          created_time: campaign.created_time,
          updated_time: campaign.updated_time
        }
      })
      
      // Cache for 15 minutes
      await cacheSet(cacheKey, campaigns, 900)
    }
    
    res.json({ campaigns: campaigns || [] })
  } catch (error) {
    logger.error('Error fetching campaigns:', error)
    next(error)
  }
})

// Get adsets
router.get('/adsets', async (req: any, res, next) => {
  try {
    const user = req.user
    const cacheKey = `adsets:${user.id}`
    
    let adsets = await cacheGet(cacheKey)
    
    if (!adsets && user.facebook_token && user.ad_account_id) {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${user.ad_account_id}/adsets`, {
        params: {
          access_token: user.facebook_token,
          fields: 'id,name,status,campaign_id,targeting,billing_event,optimization_goal,created_time,insights{impressions,clicks,spend,ctr,cpm}',
          limit: 100
        }
      })
      
      adsets = response.data.data.map((adset: any) => {
        const insights = adset.insights?.data?.[0] || {}
        return {
          id: adset.id,
          nome: adset.name,
          status: adset.status,
          campaign_id: adset.campaign_id,
          targeting: adset.targeting,
          billing_event: adset.billing_event,
          optimization_goal: adset.optimization_goal,
          impressoes: parseInt(insights.impressions || '0'),
          cliques: parseInt(insights.clicks || '0'),
          gasto: parseFloat(insights.spend || '0'),
          ctr: parseFloat(insights.ctr || '0'),
          cpm: parseFloat(insights.cpm || '0'),
          created_time: adset.created_time
        }
      })
      
      await cacheSet(cacheKey, adsets, 900)
    }
    
    res.json({ adsets: adsets || [] })
  } catch (error) {
    logger.error('Error fetching adsets:', error)
    next(error)
  }
})

// Get ads
router.get('/ads', async (req: any, res, next) => {
  try {
    const user = req.user
    const cacheKey = `ads:${user.id}`
    
    let ads = await cacheGet(cacheKey)
    
    if (!ads && user.facebook_token && user.ad_account_id) {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${user.ad_account_id}/ads`, {
        params: {
          access_token: user.facebook_token,
          fields: 'id,name,status,adset_id,creative{object_story_spec,image_url,video_id,body,title},insights{impressions,clicks,spend,ctr,actions}',
          limit: 100
        }
      })
      
      ads = response.data.data.map((ad: any) => {
        const insights = ad.insights?.data?.[0] || {}
        const creative = ad.creative || {}
        return {
          id: ad.id,
          nome: ad.name,
          status: ad.status,
          adset_id: ad.adset_id,
          titulo: creative.title || creative.object_story_spec?.link_data?.name || '',
          descricao: creative.body || creative.object_story_spec?.link_data?.description || '',
          imagem_url: creative.image_url || creative.object_story_spec?.link_data?.picture || '',
          video_id: creative.video_id,
          impressoes: parseInt(insights.impressions || '0'),
          cliques: parseInt(insights.clicks || '0'),
          gasto: parseFloat(insights.spend || '0'),
          conversoes: insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0,
          ctr: parseFloat(insights.ctr || '0')
        }
      })
      
      await cacheSet(cacheKey, ads, 900)
    }
    
    res.json({ ads: ads || [] })
  } catch (error) {
    logger.error('Error fetching ads:', error)
    next(error)
  }
})

// Get KPIs
router.get('/kpis', async (req: any, res, next) => {
  try {
    const user = req.user
    const cacheKey = `kpis:${user.id}`
    
    let kpis = await cacheGet(cacheKey)
    
    if (!kpis && user.facebook_token && user.ad_account_id) {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${user.ad_account_id}/insights`, {
        params: {
          access_token: user.facebook_token,
          fields: 'impressions,clicks,spend,actions,ctr,cpm,cost_per_action_type',
          time_range: JSON.stringify({
            since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            until: new Date().toISOString().split('T')[0]
          })
        }
      })
      
      const data = response.data.data[0] || {}
      const purchases = data.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0
      const spend = parseFloat(data.spend || '0')
      
      kpis = {
        impressoes_total: parseInt(data.impressions || '0'),
        cliques_total: parseInt(data.clicks || '0'),
        gasto_total: spend,
        conversoes_total: purchases,
        ctr_media: parseFloat(data.ctr || '0'),
        roas_media: purchases > 0 && spend > 0 ? (purchases * 100) / spend : 0,
        cpm_media: parseFloat(data.cpm || '0')
      }
      
      await cacheSet(cacheKey, kpis, 900)
    }
    
    res.json({ kpis: kpis || {} })
  } catch (error) {
    logger.error('Error fetching KPIs:', error)
    next(error)
  }
})

export default router