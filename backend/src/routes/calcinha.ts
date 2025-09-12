import { Router } from 'express'
import { calcinhaMLPricing } from '../services/ml/calcinhaMLPricing.js'

const router = Router()

/**
 * GET /calcinha/smart-price - Preço inteligente baseado em ML
 * Query params:
 * - kit: 1|2|3|4|6 (quantidade)
 * - phone: telefone do cliente  
 * - location: cidade do cliente
 * - campaignId: ID da campanha (opcional)
 * - interactions: número de interações (opcional)
 * - previousPurchases: compras anteriores (opcional)
 */
router.get('/smart-price', async (req, res) => {
  try {
    const { kit, phone, location, campaignId, interactions, previousPurchases } = req.query

    if (!kit || !phone || !location) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: kit, phone, location'
      })
    }

    const kitNumber = parseInt(kit as string) as 1 | 2 | 3 | 4 | 6
    
    if (![1, 2, 3, 4, 6].includes(kitNumber)) {
      return res.status(400).json({
        error: 'Kit deve ser 1, 2, 3, 4 ou 6'
      })
    }

    const customerProfile = {
      phone: phone as string,
      location: location as string,
      previousPurchases: previousPurchases ? parseInt(previousPurchases as string) : 0,
      interactions: interactions ? parseInt(interactions as string) : 0
    }

    const result = await calcinhaMLPricing.getSmartPrice(
      kitNumber,
      customerProfile, 
      campaignId as string
    )

    console.log(`💰 Preço ML calculado: Kit ${kitNumber} = R$ ${result.price} (${result.reasoning})`)

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
      mlVersion: '2.0'
    })

  } catch (error: any) {
    console.error('❌ Erro na API de preço inteligente:', error)
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    })
  }
})

/**
 * GET /calcinha/all-prices - Todas as opções de preço disponíveis
 */
router.get('/all-prices', async (req, res) => {
  try {
    const allPrices = {
      1: [89.9, 97.0],
      2: [119.9, 129.9, 139.9, 147.0],
      3: [159.9, 169.9, 179.9, 187.0],
      4: [239.9],
      6: [359.9]
    }

    const descriptions = {
      1: "1 Calcinha Modeladora",
      2: "Kit 2 Calcinhas Modeladoras", 
      3: "Kit 3 Calcinhas Modeladoras",
      4: "Kit 4 Calcinhas Modeladoras",
      6: "Kit 6 Calcinhas Modeladoras"
    }

    const response = Object.entries(allPrices).map(([kit, prices]) => ({
      kit: parseInt(kit),
      description: descriptions[parseInt(kit) as keyof typeof descriptions],
      availablePrices: prices,
      priceCount: prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices)
    }))

    res.json({
      success: true,
      kits: response,
      totalOptions: Object.values(allPrices).flat().length,
      colors: ['bege', 'preta'],
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Erro na API de preços:', error)
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    })
  }
})

/**
 * POST /calcinha/update-cities - Atualizar cidades COD
 * Body: { newCities: string[], removedCities: string[] }
 */
router.post('/update-cities', async (req, res) => {
  try {
    const { newCities = [], removedCities = [] } = req.body

    if (!Array.isArray(newCities) || !Array.isArray(removedCities)) {
      return res.status(400).json({
        error: 'newCities e removedCities devem ser arrays'
      })
    }

    await calcinhaMLPricing.updateCodCities(newCities, removedCities)

    console.log(`🏙️ Cidades atualizadas: +${newCities.length}, -${removedCities.length}`)

    res.json({
      success: true,
      message: 'Cidades COD atualizadas com sucesso',
      changes: {
        added: newCities.length,
        removed: removedCities.length,
        newCities,
        removedCities
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Erro ao atualizar cidades:', error)
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    })
  }
})

/**
 * GET /calcinha/variants - Variantes disponíveis (cores e kits)
 */
router.get('/variants', async (req, res) => {
  try {
    const variants = {
      colors: [
        { name: 'bege', label: 'Bege', hex: '#F5F5DC' },
        { name: 'preta', label: 'Preta', hex: '#000000' }
      ],
      kits: [
        { quantity: 1, label: '1 Unidade', popular: false },
        { quantity: 2, label: 'Kit 2 Unidades', popular: true },
        { quantity: 3, label: 'Kit 3 Unidades', popular: true },
        { quantity: 4, label: 'Kit 4 Unidades', popular: false },
        { quantity: 6, label: 'Kit 6 Unidades', popular: false }
      ]
    }

    res.json({
      success: true,
      ...variants,
      totalCombinations: variants.colors.length * variants.kits.length,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Erro na API de variantes:', error)
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    })
  }
})

export default router
