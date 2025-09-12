import { Router } from 'express'
import logger from '../config/logger.js'
import axios from 'axios'
// Learning digest and WhatsApp client not restored yet; stubbing functionality
const buildLearningDigest = async (_opts:any)=>({ items:[], generatedAt:new Date().toISOString() })
const formatDigestForWhatsApp = (d:any)=>`Digest ${d.generatedAt}`
const markDigestSent = async (_d:any,_phone?:string)=>{}
const sendWhatsAppMessage = async (_to?:string,_msg?:string)=>{}

const router = Router()

// Obter notificações em cascata baseadas em dados REAIS do Facebook
router.get('/cascade', async (req: any, res) => {
  try {
    // Usar credenciais do ambiente
    const facebook_token = process.env.FACEBOOK_ACCESS_TOKEN
    const ad_account_ids = process.env.FACEBOOK_AD_ACCOUNT_IDS?.split(',') || []
    
    // Só busca dados se tiver credenciais reais do Facebook
    if (!facebook_token || ad_account_ids.length === 0) {
      return res.json({
        success: true,
        notifications: [],
        total: 0,
        message: 'No Facebook credentials configured in environment'
      })
    }

    try {
      // Usar primeira conta de anúncios disponível
      const ad_account_id = ad_account_ids[0].replace('act_', '')
      const account_id = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`

      // Buscar campanhas reais
      const campaignsResponse = await axios.get(`https://graph.facebook.com/v18.0/${account_id}/campaigns`, {
        params: {
          access_token: facebook_token,
          fields: 'id,name,status,insights{spend,ctr,frequency,actions}',
          limit: 50
        }
      })

      const campaigns = campaignsResponse.data.data || []
      const notifications: any[] = []

      // Analisar campanhas reais
      campaigns.forEach((campaign: any) => {
        const insights = campaign.insights?.data?.[0]
        if (!insights) return

        const spend = parseFloat(insights.spend || '0')
        const ctr = parseFloat(insights.ctr || '0')
        const frequency = parseFloat(insights.frequency || '0')

        // Alertas baseados em métricas reais
        if (spend > 1000) {
          notifications.push({
            id: `budget-${campaign.id}`,
            type: 'budget',
            title: `Alto gasto na campanha: ${campaign.name}`,
            message: `Gasto atual: R$ ${spend.toFixed(2)}`,
            severity: 'high',
            timestamp: new Date().toISOString(),
            campaignId: campaign.id
          })
        }

        if (ctr < 1.0 && spend > 50) {
          notifications.push({
            id: `ctr-${campaign.id}`,
            type: 'performance',
            title: `CTR baixo: ${campaign.name}`,
            message: `CTR atual: ${ctr.toFixed(2)}%`,
            severity: 'medium',
            timestamp: new Date().toISOString(),
            campaignId: campaign.id
          })
        }

        if (frequency > 4.0) {
          notifications.push({
            id: `freq-${campaign.id}`,
            type: 'creative',
            title: `Alta frequência: ${campaign.name}`,
            message: `Frequência: ${frequency.toFixed(2)}`,
            severity: 'medium',
            timestamp: new Date().toISOString(),
            campaignId: campaign.id
          })
        }
      })

      res.json({
        success: true,
        notifications: notifications.slice(0, 20),
        total: notifications.length
      })

    } catch (facebookError: any) {
      logger.error('Erro ao buscar dados reais do Facebook:', facebookError)
      
      // Se der erro na API do Facebook, retorna vazio (sem mock)
      res.json({
        success: true,
        notifications: [],
        total: 0,
        message: 'Facebook API error - no notifications available'
      })
    }

  } catch (error) {
    logger.error('Erro ao buscar notificações:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

export default router

// Learning digest manual trigger
router.post('/digest', async (req, res) => {
  try {
    const aiEnhance = req.body?.ai === true;
    const digest = await buildLearningDigest({ aiEnhance });
    if (req.body?.send === true) {
      const phone = process.env.ADMIN_PHONE || '554199509644';
      try { await sendWhatsAppMessage(`${phone}@c.us`, formatDigestForWhatsApp(digest)); await markDigestSent(digest, phone); } catch {}
    }
    res.json({ ok: true, digest });
  } catch (e:any) {
    res.status(500).json({ ok:false, error: e?.message || 'digest failed' });
  }
});

// Listar snapshots de digest
router.get('/digests', async (req, res) => {
  try {
    const take = Math.min(parseInt(String(req.query.limit||'20'))||20, 100);
    const skip = parseInt(String(req.query.skip||'0'))||0;
  res.json({ ok:true, total:0, items:[] });
  } catch (e:any) {
    res.status(500).json({ ok:false, error: e?.message||'list failed'});
  }
});
