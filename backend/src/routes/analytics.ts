import { Router } from 'express'

const router = Router()

// 📊 Armazena clicks em memória (pode ser migrado para banco depois)
const clickStats = {
  video1: 0,
  video2: 0, 
  video3: 0,
  total: 0
}

// 📊 Track click nos links de campanha
router.post('/track-click', async (req, res) => {
  try {
    const { videoTipo, timestamp, userAgent } = req.body
    
    console.log(`🎯 CLICK RASTREADO: ${videoTipo} às ${timestamp}`)
    
    // Incrementa contador
    if (clickStats.hasOwnProperty(videoTipo)) {
      clickStats[videoTipo as keyof typeof clickStats]++
      clickStats.total++
    }
    
    console.log(`📊 Stats atuais:`, clickStats)
    
    res.json({ success: true, stats: clickStats })
  } catch (error) {
    console.error('❌ Erro tracking click:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// 📈 Relatório de clicks por vídeo
router.get('/campaign-stats', async (req, res) => {
  try {
    res.json({ 
      totalClicks: clickStats.total,
      byVideo: [
        { video: 'video1', name: 'Cliente Emagreceu', clicks: clickStats.video1 },
        { video: 'video2', name: 'Demonstração Produto', clicks: clickStats.video2 },
        { video: 'video3', name: 'Modelo Resultado', clicks: clickStats.video3 }
      ],
      stats: clickStats
    })
  } catch (error) {
    console.error('❌ Erro buscando stats:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
