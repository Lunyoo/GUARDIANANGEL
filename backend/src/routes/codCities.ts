/**
 * 🚚 ROTAS PARA GERENCIAMENTO DE CIDADES COD
 * 
 * Endpoints para configurar cidades com entrega COD
 * e atualizar automaticamente a inteligência do bot
 */

import { Router } from 'express'
import { getDatabase } from '../config/database.js'
import { logger } from '../utils/logger.js'
import { universalBandits } from '../services/bot/universalBandits'
import { cityService } from '../services/city/cityService'
import { COD_CITIES } from '../config/codCities'
import { broadcast } from '../services/bot/sse'
import { autoInsightSystem } from '../services/ai/autoInsightSystem.js'

const router = Router()

// Lazy load city service
cityService.load(COD_CITIES).catch(()=>{})

// GET /cod-cities - Obter cidades configuradas para COD
router.get('/cod-cities', async (req, res) => {
  try {
    const db = getDatabase()
    const result = db.prepare(`
      SELECT cities FROM cod_config WHERE id = 1
    `).get() as any

    const cities = result?.cities ? JSON.parse(result.cities) : []

    res.json({
      success: true,
      cities,
      count: cities.length,
      lastUpdated: result?.updated_at || new Date().toISOString()
    })

  } catch (error) {
    logger.error('Erro ao obter cidades COD:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Falha ao obter configuração de cidades',
      cities: [] // Fallback
    })
  }
})

// GET /cod-cities/all-flat?search=sp - lista achatada (state + city) com filtro
router.get('/cod-cities/all-flat', (_req, res) => {
  try {
    const search = String((_req.query as any)?.search || '').trim().toLowerCase()
    const flat: { city:string; state:string; label:string }[] = []
    for (const [state, cities] of Object.entries(COD_CITIES)) {
      for (const c of cities as string[]) {
        const label = `${c} - ${state}`
        if (!search || label.toLowerCase().includes(search)) flat.push({ city: c, state, label })
      }
    }
    return res.json({ success:true, total: flat.length, cities: flat })
  } catch (e:any) {
    return res.status(500).json({ success:false, error: e?.message || 'fail', cities: [] })
  }
})

// POST /update-cod-cities - Atualizar cidades COD e bot
router.post('/update-cod-cities', async (req, res) => {
  try {
  const { cities, colors, price, template, preferredMedia, images } = req.body
    
    if (!Array.isArray(cities)) {
      return res.status(400).json({
        success: false,
        error: 'Campo cities deve ser um array'
      })
    }

    const db = getDatabase()
    
    // Salvar configuração no banco
    db.prepare(`
      INSERT OR REPLACE INTO cod_config (id, cities, updated_at)
      VALUES (1, ?, datetime('now'))
    `).run(JSON.stringify(cities))

    // Atualizar inteligência do Universal Bandits
    try {
      const contextUpdate = {
        codCities: cities,
        hasCodeDelivery: cities.length > 0,
        deliveryConfig: {
          type: 'COD',
          cities,
          updatedAt: new Date().toISOString()
        },
        colors,
        price,
        template,
        preferredMedia,
        images
      }
      
      // Forçar atualização do contexto no Universal Bandits
      await universalBandits.updateDeliveryContext(contextUpdate)
      logger.info(`🚚 Universal Bandits atualizado com ${cities.length} cidades COD`)
      
    } catch (mlError) {
      logger.warn('Aviso: Erro ao atualizar ML systems:', mlError)
    }

    // Gerar insight automático sobre a mudança
    try {
      const insight = {
        id: `cod_update_${Date.now()}`,
        type: 'optimization' as const,
        priority: 'medium' as const,
        title: 'Configuração de COD Atualizada',
        description: `${cities.length} cidades foram configuradas para entrega COD`,
        suggestedAction: cities.length > 0 
          ? 'Bot configurado para vender apenas nas cidades selecionadas'
          : 'ATENÇÃO: Nenhuma cidade COD selecionada - bot pode rejeitar vendas',
        confidence: 0.95,
        potentialImpact: cities.length > 0 
          ? 'Vendas protegidas contra problemas de entrega'
          : 'Possível perda de vendas por falta de COD',
        requiredApproval: false,
        autoImplementable: true,
        createdAt: new Date(),
        data: { 
          cities, 
          cityCount: cities.length,
          type: 'cod_config_update'
        }
      }
      
  // Adicionar insight via API pública
  ;(autoInsightSystem as any).addInsight?.(insight)
      
    } catch (insightError) {
      logger.warn('Aviso: Erro ao gerar insight:', insightError)
    }

    res.json({
      success: true,
      message: `✅ ${cities.length} cidades COD configuradas e bot atualizado`,
  cities,
  colors,
  price,
  template,
  preferredMedia,
      count: cities.length,
      botUpdated: true,
      timestamp: new Date().toISOString()
    })
  try { broadcast('cod_cities:update', { cities, count: cities.length }) } catch {}

  } catch (error) {
    logger.error('Erro ao atualizar cidades COD:', error)
    res.status(500).json({
      success: false,
      error: 'Falha ao atualizar configuração de cidades'
    })
  }
})

// POST /append-cod-cities - Adicionar cidades sem sobrescrever lista atual
router.post('/append-cod-cities', async (req, res) => {
  try {
    const { cities } = req.body
    if (!Array.isArray(cities) || !cities.length) {
      return res.status(400).json({ success:false, error:'Envie cities como array não vazio' })
    }
    const db = getDatabase()
    const existingRow = db.prepare('SELECT cities FROM cod_config WHERE id=1').get() as any
    const existing = existingRow?.cities ? JSON.parse(existingRow.cities) : []
    const merged = Array.from(new Set([...existing, ...cities]))
    db.prepare(`INSERT OR REPLACE INTO cod_config (id, cities, updated_at) VALUES (1, ?, datetime('now'))`).run(JSON.stringify(merged))
    try { await universalBandits.updateDeliveryContext({ codCities: merged, hasCodeDelivery: merged.length>0 }) } catch {}
    cityService.addCODCities(cities)
    res.json({ success:true, added: cities.length, total: merged.length })
  try { broadcast('cod_cities:update', { cities: merged, count: merged.length }) } catch {}
  } catch (e:any) {
    res.status(500).json({ success:false, error: e?.message || 'Falha ao adicionar cidades' })
  }
})

// GET /cod-cities/suggest?prefix=... - autocomplete básico
router.get('/cod-cities/suggest', (req, res) => {
  const prefix = String(req.query.prefix || '').trim()
  if (!prefix) return res.json({ success:true, suggestions: [] })
  const suggestions = cityService.getSuggestion(prefix)
  res.json({ success:true, suggestions })
})

// GET /cod-status - Status da configuração COD
router.get('/cod-status', async (req, res) => {
  try {
    const db = getDatabase()
    const result = db.prepare(`
      SELECT cities, updated_at FROM cod_config WHERE id = 1
    `).get() as any

    const cities = result?.cities ? JSON.parse(result.cities) : []
    const lastUpdated = result?.updated_at

    // Verificar status do bot
    let botStatus = 'unknown'
    try {
      const context = universalBandits.getContext?.() || {}
      botStatus = context.codCities?.length > 0 ? 'configured' : 'no_cities'
    } catch {
      botStatus = 'error'
    }

    res.json({
      success: true,
      status: {
        citiesConfigured: cities.length,
        cities,
        lastUpdated,
        botStatus,
        protection: cities.length > 0 ? 'active' : 'disabled'
      },
      recommendations: cities.length === 0 ? [
        'Configure pelo menos uma cidade para ativar COD',
        'Bot pode rejeitar vendas sem cidades configuradas'
      ] : [
        'Configuração ativa e funcionando',
        'Bot protegido contra vendas fora da área de entrega'
      ]
    })

  } catch (error) {
    logger.error('Erro ao obter status COD:', error)
    res.status(500).json({
      success: false,
      error: 'Falha ao obter status'
    })
  }
})

export default router
