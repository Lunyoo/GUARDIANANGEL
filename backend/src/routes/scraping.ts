import { Router } from 'express'
import axios from 'axios'
import { getDatabase } from '../config/database.js'
import logger from '../config/logger.js'

const router = Router()

// Start scraping
router.post('/start', async (req: any, res, next) => {
  try {
    const { keywords, nicho, tipo_produto, limite_anuncios } = req.body
    const user = req.user
    
    // Call scraping service
    const scrapingResponse = await axios.post(`${process.env.SCRAPING_SERVICE_URL}/scrape`, {
      keywords: keywords || [nicho],
      nicho,
      tipo_produto: tipo_produto || 'infoproduto',
      limite_anuncios: limite_anuncios || 50,
      paises: ['BR']
    })
    
    // Save results to database
    const db = getDatabase()
    db.prepare(`
      INSERT INTO scraping_results (user_id, nicho, keywords, results)
      VALUES (?, ?, ?, ?)
    `).run(
      user.id,
      nicho,
      JSON.stringify(keywords || [nicho]),
      JSON.stringify(scrapingResponse.data)
    )
    
    res.json(scrapingResponse.data)
  } catch (error: any) {
    logger.error('Scraping failed:', error)
    res.status(500).json({
      error: 'Erro no scraping',
      details: error.response?.data?.detail || error.message
    })
  }
})

// Get scraping results
router.get('/results', async (req: any, res, next) => {
  try {
    const user = req.user
    const { limit = 10 } = req.query
    
    const db = getDatabase()
    const results = db.prepare(`
      SELECT * FROM scraping_results 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(user.id, limit)
    
    const parsedResults = results.map(result => ({
      ...result,
      keywords: JSON.parse(result.keywords),
      results: JSON.parse(result.results)
    }))
    
    res.json({ results: parsedResults })
  } catch (error) {
    logger.error('Error fetching scraping results:', error)
    next(error)
  }
})

// Analyze niche
router.get('/analyze/:nicho', async (req: any, res, next) => {
  try {
    const { nicho } = req.params
    const user = req.user
    
    // Call scraping service for analysis
    const analysisResponse = await axios.get(`${process.env.SCRAPING_SERVICE_URL}/analyze/${nicho}`)
    
    // Save to database
    const db = getDatabase()
    db.prepare(`
      INSERT INTO scraping_results (user_id, nicho, keywords, results)
      VALUES (?, ?, ?, ?)
    `).run(
      user.id,
      nicho,
      JSON.stringify([nicho]),
      JSON.stringify(analysisResponse.data)
    )
    
    res.json(analysisResponse.data)
  } catch (error: any) {
    logger.error('Niche analysis failed:', error)
    res.status(500).json({
      error: 'Erro na análise do nicho',
      details: error.response?.data?.detail || error.message
    })
  }
})

export default router