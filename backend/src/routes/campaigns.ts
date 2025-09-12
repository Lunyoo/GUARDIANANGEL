import { Router } from 'express'
import axios from 'axios'
import { getDatabase } from '../config/database.js'
import { cacheGet, cacheSet } from '../config/redis.js'
import logger from '../config/logger.js'
import { budgetAllocator } from '../services/ml/budgetAllocator.js'

const router = Router()

// Get campaigns
router.get('/', async (req: any, res, next) => {
  try {
    const user = req.user || {}
    
    // Use env credentials as fallback
    const facebook_token = user.facebook_token || process.env.FACEBOOK_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN
    // Allow multi-account via env FACEBOOK_AD_ACCOUNT_IDS (comma-separated)
    const envAccountIds = (process.env.FACEBOOK_AD_ACCOUNT_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    const singleAccount = user.ad_account_id || process.env.FACEBOOK_AD_ACCOUNT_ID || process.env.AD_ACCOUNT_ID
    const accounts = (envAccountIds.length > 0 ? envAccountIds : (singleAccount ? [singleAccount] : []))
      .map(a => a.startsWith('act_') ? a : `act_${a}`)
    
    if (!facebook_token || accounts.length === 0) {
      return res.status(401).json({ error: 'Credenciais Facebook não configuradas' })
    }
    
    const cacheKey = `campaigns:${user.id || 'default'}:${accounts.join(',')}`
    
    // Try cache first
    let campaigns = await cacheGet(cacheKey)
    
    if (!campaigns) {
      // Fetch from Facebook API for each account and aggregate
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: Facebook API demorou mais de 15 segundos')), 15000)
      )

      const results = await Promise.race([
        timeoutPromise,
        Promise.all(accounts.map(async (actId) => {
          const response = await axios.get(`https://graph.facebook.com/v18.0/${actId}/campaigns`, {
            params: {
              access_token: facebook_token,
              fields: 'id,name,status,objective,created_time,updated_time,insights{impressions,clicks,spend,actions,ctr,cpm,cost_per_action_type}',
              limit: 50 // Reduzir limite para melhorar performance
            },
            timeout: 12000 // Timeout individual de 12s
          })
          return (response.data.data || []).map((campaign: any) => {
            const insights = campaign.insights?.data?.[0] || {}
            const spend = parseFloat(insights.spend || '0')
            const purchases = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0
            return {
              id: campaign.id,
              account_id: actId,
              nome: campaign.name,
              status: campaign.status,
              objetivo: campaign.objective,
              impressoes: parseInt(insights.impressions || '0'),
              cliques: parseInt(insights.clicks || '0'),
              gasto: spend,
              conversoes: purchases,
              ctr: parseFloat(insights.ctr || '0'),
              cpm: parseFloat(insights.cpm || '0'),
              roas: purchases && spend > 0 ? (purchases * 100) / spend : 0,
              created_time: campaign.created_time,
              updated_time: campaign.updated_time
            }
          })
        }))
      ]) as any[]
      campaigns = results.flat()
      
      // Optional: auto-enroll into allocator metrics stream
      try {
        const autoEnroll = String(process.env.ALLOCATOR_AUTO_ENROLL || '').toLowerCase() === 'true'
        if (autoEnroll && Array.isArray(campaigns)) {
          const AOV = Number(process.env.ALLOCATOR_AOV_BRL || 100)
          for (const c of campaigns as any[]) {
            try {
              const spend = Number(c.gasto || 0)
              const purchases = Number(c.conversoes || 0)
              const roas = spend > 0 ? (purchases * AOV) / spend : 0
              budgetAllocator.addOrUpdateCampaign({
                campaignId: String(c.id),
                name: String(c.nome || c.id),
                totalSpent: spend,
                totalLeads: purchases,
                roas,
                active: c.status !== 'PAUSED' && c.status !== 'ARCHIVED'
              })
            } catch {}
          }
        }
      } catch {}

      // Cache for 15 minutes
      await cacheSet(cacheKey, campaigns, 900)
    }
    
    res.json({ campaigns: campaigns || [] })
  } catch (error) {
    logger.error('Error fetching campaigns:', error)
    
    // Retornar resposta de fallback em caso de timeout ou erro
    if (error instanceof Error && error.message.includes('Timeout')) {
      return res.status(200).json({ 
        campaigns: [], 
        warning: 'Facebook API timeout - tente novamente em alguns minutos',
        cached: false 
      })
    }
    
    // Para outros erros, retornar array vazio para não quebrar o frontend
    return res.status(200).json({ 
      campaigns: [], 
      error: 'Erro temporário ao buscar campanhas',
      cached: false 
    })
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
    const user = req.user || {}

    const facebook_token = user.facebook_token || process.env.FACEBOOK_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN
    const envAccountIds = (process.env.FACEBOOK_AD_ACCOUNT_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    const singleAccount = user.ad_account_id || process.env.FACEBOOK_AD_ACCOUNT_ID || process.env.AD_ACCOUNT_ID
    const accounts = (envAccountIds.length > 0 ? envAccountIds : (singleAccount ? [singleAccount] : []))
      .map(a => a.startsWith('act_') ? a : `act_${a}`)

    if (!facebook_token || accounts.length === 0) {
      return res.status(401).json({ error: 'Credenciais Facebook não configuradas' })
    }

    const cacheKey = `ads:${user.id || 'default'}:${accounts.join(',')}`

    let ads = await cacheGet(cacheKey)

    if (!ads) {
      // Implementar timeout de 15 segundos para evitar ETIMEDOUT
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: Facebook API demorou mais de 15 segundos')), 15000)
      )

      const results = await Promise.race([
        timeoutPromise,
        Promise.all(accounts.map(async (actId) => {
          const response = await axios.get(`https://graph.facebook.com/v18.0/${actId}/ads`, {
            params: {
              access_token: facebook_token,
              fields: 'id,name,status,adset_id,campaign_id,creative{object_story_spec,image_url,video_id,body,title},insights{impressions,clicks,spend,ctr,actions}',
              limit: 50 // Reduzir limite para melhorar performance
            },
            timeout: 12000 // Timeout individual de 12s
          })
          return (response.data.data || []).map((ad: any) => {
            const insights = ad.insights?.data?.[0] || {}
            const creative = ad.creative || {}
            return {
              id: ad.id,
              account_id: actId,
              nome: ad.name,
              status: ad.status,
              adset_id: ad.adset_id,
              campaign_id: ad.campaign_id,
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
        }))
      ]) as any[]

      ads = results.flat()
      await cacheSet(cacheKey, ads, 900)
    }

    res.json({ ads: ads || [] })
  } catch (error) {
    logger.error('Error fetching ads:', error)
    
    // Retornar resposta de fallback em caso de timeout ou erro
    if (error instanceof Error && error.message.includes('Timeout')) {
      return res.status(200).json({ 
        ads: [], 
        warning: 'Facebook API timeout - tente novamente em alguns minutos',
        cached: false 
      })
    }
    
    // Para outros erros, retornar array vazio para não quebrar o frontend
    return res.status(200).json({ 
      ads: [], 
      error: 'Erro temporário ao buscar anúncios',
      cached: false 
    })
  }
})

// Get KPIs
router.get('/kpis', async (req: any, res, next) => {
  try {
    const user = req.user || {}
    
    const facebook_token = user.facebook_token || process.env.FACEBOOK_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN
    const envAccountIds = (process.env.FACEBOOK_AD_ACCOUNT_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    const singleAccount = user.ad_account_id || process.env.FACEBOOK_AD_ACCOUNT_ID || process.env.AD_ACCOUNT_ID
    const accounts = (envAccountIds.length > 0 ? envAccountIds : (singleAccount ? [singleAccount] : []))
      .map(a => a.startsWith('act_') ? a : `act_${a}`)
    
    if (!facebook_token || accounts.length === 0) {
      return res.status(401).json({ error: 'Credenciais Facebook não configuradas' })
    }
    
    const cacheKey = `kpis:${user.id || 'default'}:${accounts.join(',')}`
    
    let kpis = await cacheGet(cacheKey)
    
    if (!kpis) {
      const time_range = JSON.stringify({
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        until: new Date().toISOString().split('T')[0]
      })
      const results = await Promise.all(accounts.map(async (actId) => {
        const response = await axios.get(`https://graph.facebook.com/v18.0/${actId}/insights`, {
          params: {
            access_token: facebook_token,
            fields: 'impressions,clicks,spend,actions,ctr,cpm,cost_per_action_type',
            time_range
          }
        })
        const data = response.data.data[0] || {}
        const purchases = data.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0
        const spend = parseFloat(data.spend || '0')
        return {
          impressions: parseInt(data.impressions || '0'),
          clicks: parseInt(data.clicks || '0'),
          spend,
          purchases,
          ctr: parseFloat(data.ctr || '0'),
          cpm: parseFloat(data.cpm || '0')
        }
      }))

      const agg = results.reduce((acc, r) => ({
        impressions: acc.impressions + (r.impressions || 0),
        clicks: acc.clicks + (r.clicks || 0),
        spend: acc.spend + (r.spend || 0),
        purchases: acc.purchases + (r.purchases || 0),
        ctrSum: acc.ctrSum + (r.ctr || 0),
        cpmSum: acc.cpmSum + (r.cpm || 0)
      }), { impressions: 0, clicks: 0, spend: 0, purchases: 0, ctrSum: 0, cpmSum: 0 })

      kpis = {
        impressoes_total: agg.impressions,
        cliques_total: agg.clicks,
        gasto_total: agg.spend,
        conversoes_total: agg.purchases,
        // For ctr/cpm, provide weighted averages when possible
        ctr_media: agg.clicks > 0 && agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : (results.length ? (agg.ctrSum / results.length) : 0),
        roas_media: agg.purchases > 0 && agg.spend > 0 ? (agg.purchases * 100) / agg.spend : 0,
        cpm_media: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : (results.length ? (agg.cpmSum / results.length) : 0)
      }
      
      await cacheSet(cacheKey, kpis, 900)
    }
    
    res.json({ kpis: kpis || {} })
  } catch (error) {
    logger.error('Error fetching KPIs:', error)
    next(error)
  }
})

// Get Facebook account info
router.get('/facebook/account', async (req: any, res, next) => {
  try {
    const user = req.user || {}
    
    const facebook_token = user.facebook_token || process.env.FACEBOOK_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN
    const ad_account_id = user.ad_account_id || process.env.FACEBOOK_AD_ACCOUNT_ID || process.env.AD_ACCOUNT_ID || 'act_1060618782717636'
    
    if (!facebook_token || !ad_account_id) {
      return res.status(401).json({ error: 'Credenciais Facebook não configuradas' })
    }
    
    const cacheKey = `fb_account:${user.id || 'default'}`
    
    let account = await cacheGet(cacheKey)
    
    if (!account) {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${ad_account_id}`, {
        params: {
          access_token: facebook_token,
          fields: 'id,name,account_status,currency,timezone_name,spend_cap,amount_spent,balance'
        }
      })
      
      account = {
        id: response.data.id,
        name: response.data.name,
        status: response.data.account_status,
        currency: response.data.currency,
        timezone: response.data.timezone_name,
        spend_cap: response.data.spend_cap,
        amount_spent: response.data.amount_spent,
        balance: response.data.balance
      }
      
      await cacheSet(cacheKey, account, 1800) // 30 min cache
    }
    
    res.json(account || {})
  } catch (error) {
    logger.error('Error fetching account info:', error)
    next(error)
  }
})

export default router

// -----------------------------
// 💬 AI Campaign Chat (GPT‑4)
// -----------------------------
router.post('/ai-chat', async (req: any, res, next) => {
  try {
    const input = String(req.body?.message || '').trim()
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : []
    if (!input) return res.status(400).json({ error: 'message required' })

    // Collect realtime KPIs to ground the answer (best-effort)
    let kpis: any = null
    try {
      const user = req.user || {}
      const facebook_token = user.facebook_token || process.env.FACEBOOK_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN
      const envAccountIds = (process.env.FACEBOOK_AD_ACCOUNT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)
      const singleAccount = user.ad_account_id || process.env.FACEBOOK_AD_ACCOUNT_ID || process.env.AD_ACCOUNT_ID
      const accounts = (envAccountIds.length > 0 ? envAccountIds : (singleAccount ? [singleAccount] : [])).map((a) => (a.startsWith('act_') ? a : `act_${a}`))
      if (facebook_token && accounts.length > 0) {
        const time_range = JSON.stringify({
          since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          until: new Date().toISOString().split('T')[0]
        })
        const results = await Promise.all(
          accounts.map(async (actId) => {
            const r = await axios.get(`https://graph.facebook.com/v18.0/${actId}/insights`, {
              params: { access_token: facebook_token, fields: 'impressions,clicks,spend,actions,ctr,cpm', time_range }
            })
            const d = r.data.data?.[0] || {}
            const purchases = d.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0
            const spend = parseFloat(d.spend || '0')
            return { impressions: +d.impressions || 0, clicks: +d.clicks || 0, spend, purchases, ctr: +d.ctr || 0, cpm: +d.cpm || 0 }
          })
        )
        const agg = results.reduce(
          (acc, r) => ({ impressions: acc.impressions + r.impressions, clicks: acc.clicks + r.clicks, spend: acc.spend + r.spend, purchases: acc.purchases + r.purchases, ctrSum: acc.ctrSum + r.ctr, cpmSum: acc.cpmSum + r.cpm }),
          { impressions: 0, clicks: 0, spend: 0, purchases: 0, ctrSum: 0, cpmSum: 0 }
        )
        kpis = {
          impressions: agg.impressions,
          clicks: agg.clicks,
          spend: agg.spend,
          purchases: agg.purchases,
          ctr: agg.clicks > 0 && agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : (results.length ? agg.ctrSum / results.length : 0),
          cpm: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : (results.length ? agg.cpmSum / results.length : 0)
        }
      }
    } catch (e) {
      logger.warn('ai-chat KPIs fetch failed: ' + (e as any)?.message)
    }

    const hasKey = Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY)
    if (!hasKey) {
      const base = `IA de campanhas operando no modo básico. KPIs: ${kpis ? `imp=${kpis.impressions}, cliques=${kpis.clicks}, gasto=R$ ${kpis.spend?.toFixed(2)}` : 'indisponíveis'}. Posso sugerir: realocar orçamento para criativos com CTR acima da média e criar remarketing de 7-14 dias.`
      return res.json({ reply: base })
    }

    // Compose system prompt with project context
    const sys = [
      'Você é um Assistente de Campanhas Meta Ads (GPT-4) integrado à plataforma Nexus/GuardianAngel.',
      'Contexto do sistema:',
      '- WhatsApp bot vende um produto (Calcinha Lipo Modeladora), responde em PT-BR e usa preços dinâmicos por bandits.',
      '- Sistema de Bandits Universal: otimiza preços automaticamente com 12 variantes diferentes',
      '- 73 cidades COD configuradas (São Paulo, Rio de Janeiro, Belo Horizonte, etc.)',
      '- Orquestração ML: universal bandits, allocator de orçamento com approvals, e relatórios/alertas.',
      '',
      'IMPORTANTE - Detecção de Links:',
      'Quando o usuário mencionar "link", "URL", "destino", "onde direcionar", "site", "página", ou estiver criando campanhas, SEMPRE forneça:',
      '',
      '🔗 LINKS PARA SUA CAMPANHA:',
      '• Landing Page: https://[SEU_DOMINIO]/produto/calcinha-lipo-modeladora?utm_source=facebook&utm_campaign=[NOME_CAMPANHA]&utm_content=bandit_test',
      '• WhatsApp Direto: https://wa.me/554199509644?text=Vi%20no%20Facebook%20sobre%20a%20calcinha%20lipo%20modeladora.%20Quero%20saber%20mais!',
      '• Checkout Rápido: https://[SEU_DOMINIO]/checkout?utm_source=facebook&utm_campaign=[NOME_CAMPANHA]&bandit=price_test',
      '',
      '⚙️ TODAS AS VARIANTES DE PREÇO BANDIT:',
      '• 1 unidade: price_1un_89 (R$ 89,90) | price_1un_97 (R$ 97,00)',
      '• 2 unidades: price_2un_119 (R$ 119,90) | price_2un_129 (R$ 129,90) | price_2un_139 (R$ 139,90) | price_2un_147 (R$ 147,00)',
      '• 3 unidades: price_3un_159 (R$ 159,90) | price_3un_169 (R$ 169,90) | price_3un_179 (R$ 179,90) | price_3un_187 (R$ 187,00)',
      '• 4 unidades: price_4un_239 (R$ 239,90)',
      '• 6 unidades: price_6un_359 (R$ 359,90)',
      '',
      '🎯 RECOMENDAÇÕES PRINCIPAIS:',
      '• Para teste A/B: Use price_2un_129 vs price_3un_169',
      '• Para remarketing: Use price_2un_119 (menor preço 2un)',
      '• Para lookalike: Use price_3un_169 (melhor custo-benefício)',
      '',
      '📊 PARÂMETROS UTM:',
      '• utm_source=facebook',
      '• utm_medium=cpc', 
      '• utm_campaign=[substitua pelo nome da sua campanha]',
      '• utm_content=[price_1un_89/price_2un_129/price_3un_169/etc]',
      '',
      '- Quando aconselhar, baseie-se em dados (KPIs) se disponíveis; seja conciso, prático e em PT-BR.',
      `KPIs atuais (últimos 30d): ${kpis ? JSON.stringify(kpis) : 'indisponíveis'}`
    ].join('\n')

    // Detectar se o usuário está perguntando sobre links/URLs/destinos
    const isAskingAboutLinks = /link|url|destino|onde.*direcionar|site|página|campanha.*criar|criar.*campanha|meta.*ads|facebook.*ads/i.test(input)
    const isAskingAboutBandits = /bandit|preço|precos|variante|teste.*preco|otimizar.*preco/i.test(input)

    // Prepare OpenAI call
    const { OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY })
    
    let messages = [
      { role: 'system', content: sys },
      { role: 'user', content: input }
    ] as any

    // Se o usuário está perguntando sobre links ou criação de campanha, adicionar contexto específico
    if (isAskingAboutLinks || isAskingAboutBandits) {
      const linkContext = `
CONTEXTO ADICIONAL - O usuário está perguntando sobre links/campanhas. Forneça SEMPRE estas informações específicas:

🎯 LINKS PRONTOS PARA USO:
• Landing: https://[SEU_DOMINIO]/produto/calcinha-lipo-modeladora?utm_source=facebook&utm_campaign=calcinha-lipo-2024&utm_content=price_2un_129
• WhatsApp: https://wa.me/554199509644?text=Vi%20no%20Facebook%20sobre%20a%20calcinha%20lipo%20modeladora.%20Quero%20saber%20mais!
• Checkout: https://[SEU_DOMINIO]/checkout?utm_source=facebook&utm_campaign=calcinha-lipo-2024&bandit=price_test

⚙️ TODAS AS VARIANTES DISPONÍVEIS:
🔸 1 UNIDADE: price_1un_89 (R$ 89,90) | price_1un_97 (R$ 97,00)
🔸 2 UNIDADES: price_2un_119 (R$ 119,90) | price_2un_129 (R$ 129,90) | price_2un_139 (R$ 139,90) | price_2un_147 (R$ 147,00)
🔸 3 UNIDADES: price_3un_159 (R$ 159,90) | price_3un_169 (R$ 169,90) | price_3un_179 (R$ 179,90) | price_3un_187 (R$ 187,00)
🔸 4 UNIDADES: price_4un_239 (R$ 239,90)
🔸 6 UNIDADES: price_6un_359 (R$ 359,90)

🎯 ESTRATÉGIAS RECOMENDADAS:
• TESTE A/B BÁSICO: price_2un_129 vs price_3un_169
• REMARKETING: price_2un_119 (menor preço para retorno)
• LOOKALIKE: price_3un_169 (melhor conversão)
• PREMIUM: price_4un_239 ou price_6un_359 (alto valor)

📋 PASSO A PASSO META ADS:
1. Cole o link da Landing Page no campo "Website URL"
2. Use utm_campaign=calcinha-lipo-2024 (ou substitua pelo nome da sua campanha)
3. Escolha utm_content=price_[variante] da lista acima
4. Configure Pixel para rastrear conversões em /checkout
5. Teste com orçamento R$ 50-100/dia inicial
`
      messages.splice(1, 0, { role: 'system', content: linkContext })
    }

    const model = process.env.OPENAI_MODEL_CAMPAIGN || process.env.OPENAI_MODEL || 'gpt-4o'
    const resp = await openai.chat.completions.create({ model, temperature: 0.5, messages })
    const text = resp.choices?.[0]?.message?.content?.trim() || 'Sem resposta.'
    res.json({ reply: text })
  } catch (error) {
    logger.error('ai-chat failed', error)
    next(error)
  }
})