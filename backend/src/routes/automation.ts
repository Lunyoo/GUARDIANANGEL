import { Router } from 'express'
import axios from 'axios'
import { getDatabase } from '../config/database.js'
import logger from '../config/logger.js'

const router = Router()

// Start complete automation
router.post('/complete', async (req: any, res, next) => {
  try {
    const { orcamento, nicho, tipo_nicho } = req.body
    const user = req.user
    
    if (!user.facebook_token || !user.ad_account_id) {
      return res.status(400).json({ error: 'Configuração do Facebook não encontrada' })
    }
    
    // Log automation start
    const db = getDatabase()
    const logId = db.prepare(`
      INSERT INTO automation_logs (user_id, action, status, data)
      VALUES (?, ?, ?, ?)
    `).run(
      user.id,
      'automation_complete_start',
      'running',
      JSON.stringify({ orcamento, nicho, tipo_nicho })
    ).lastInsertRowid
    
    try {
      // Step 1: Scraping
      logger.info(`Starting scraping for niche: ${nicho}`)
      const scrapingResponse = await axios.post(`${process.env.SCRAPING_SERVICE_URL}/scrape`, {
        keywords: [nicho, `curso ${nicho}`, `como ${nicho}`],
        nicho,
        tipo_produto: 'infoproduto',
        limite_anuncios: 20,
        paises: ['BR']
      })
      
      if (!scrapingResponse.data.anuncios?.length) {
        throw new Error('Nenhuma oferta encontrada no scraping')
      }
      
      // Step 2: ML Analysis
      logger.info('Starting ML analysis')
      const bestAds = scrapingResponse.data.anuncios
        .filter((ad: any) => ad.score_qualidade >= 0.7)
        .slice(0, 5)
      
      if (!bestAds.length) {
        throw new Error('Nenhuma oferta qualificada encontrada')
      }
      
      // Step 3: Create product suggestions
      const suggestions = bestAds.map((ad: any) => ({
        id: ad.id,
        titulo: ad.titulo,
        descricao: ad.descricao,
        anunciante: ad.anunciante,
        tipo_criativo: ad.tipo_criativo,
        score_qualidade: ad.score_qualidade,
        sugestao_produto: `Infoproduto baseado em: ${ad.titulo}`,
        preco_sugerido: Math.floor(Math.random() * 200) + 97, // R$ 97-297
        engajamento: ad.engajamento_estimado
      }))
      
      // Update log with success
      db.prepare(`
        UPDATE automation_logs 
        SET status = 'completed', data = ?
        WHERE id = ?
      `).run(
        JSON.stringify({
          orcamento,
          nicho,
          tipo_nicho,
          scraping_results: scrapingResponse.data,
          suggestions,
          total_offers: bestAds.length
        }),
        logId
      )
      
      res.json({
        status: 'success',
        message: 'Automação completa executada com sucesso',
        data: {
          orcamento,
          nicho,
          ofertas_encontradas: scrapingResponse.data.anuncios.length,
          ofertas_qualificadas: bestAds.length,
          sugestoes: suggestions,
          tempo_execucao: scrapingResponse.data.tempo_execucao
        }
      })
      
    } catch (stepError) {
      // Update log with error
      db.prepare(`
        UPDATE automation_logs 
        SET status = 'failed', data = ?
        WHERE id = ?
      `).run(
        JSON.stringify({
          error: stepError instanceof Error ? stepError.message : 'Unknown error',
          orcamento,
          nicho,
          tipo_nicho
        }),
        logId
      )
      
      throw stepError
    }
    
  } catch (error: any) {
    logger.error('Complete automation failed:', error)
    res.status(500).json({
      error: 'Erro na automação completa',
      details: error.message
    })
  }
})

// Get automation logs
router.get('/logs', async (req: any, res, next) => {
  try {
    const user = req.user
    const { limit = 10 } = req.query
    
    const db = getDatabase()
    const logs = db.prepare(`
      SELECT * FROM automation_logs 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(user.id, limit)
    
    const parsedLogs = logs.map(log => ({
      ...log,
      data: JSON.parse(log.data || '{}')
    }))
    
    res.json({ logs: parsedLogs })
  } catch (error) {
    logger.error('Error fetching automation logs:', error)
    next(error)
  }
})

// Create campaign from suggestion
router.post('/create-campaign', async (req: any, res, next) => {
  try {
    const { suggestion, budget_daily, targeting } = req.body
    const user = req.user
    
    if (!user.facebook_token || !user.ad_account_id) {
      return res.status(400).json({ error: 'Configuração do Facebook não encontrada' })
    }
    
    // Log campaign creation
    const db = getDatabase()
    const logId = db.prepare(`
      INSERT INTO automation_logs (user_id, action, status, data)
      VALUES (?, ?, ?, ?)
    `).run(
      user.id,
      'create_campaign',
      'running',
      JSON.stringify({ suggestion, budget_daily, targeting })
    ).lastInsertRowid
    
    try {
      // Create campaign via Facebook API
      const campaignData = {
        name: `Nexus AI - ${suggestion.titulo}`,
        objective: 'CONVERSIONS',
        status: 'PAUSED',
        access_token: user.facebook_token
      }
      
      const campaignResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${user.ad_account_id}/campaigns`,
        campaignData
      )
      
      // Update log with success
      db.prepare(`
        UPDATE automation_logs 
        SET status = 'completed', data = ?
        WHERE id = ?
      `).run(
        JSON.stringify({
          suggestion,
          budget_daily,
          targeting,
          campaign_id: campaignResponse.data.id,
          campaign_name: campaignData.name
        }),
        logId
      )
      
      res.json({
        status: 'success',
        message: 'Campanha criada com sucesso',
        campaign_id: campaignResponse.data.id,
        campaign_name: campaignData.name
      })
      
    } catch (apiError) {
      // Update log with error
      db.prepare(`
        UPDATE automation_logs 
        SET status = 'failed', data = ?
        WHERE id = ?
      `).run(
        JSON.stringify({
          error: apiError instanceof Error ? apiError.message : 'Unknown error',
          suggestion,
          budget_daily,
          targeting
        }),
        logId
      )
      
      throw apiError
    }
    
  } catch (error: any) {
    logger.error('Campaign creation failed:', error)
    res.status(500).json({
      error: 'Erro ao criar campanha',
      details: error.response?.data?.error?.message || error.message
    })
  }
})

export default router