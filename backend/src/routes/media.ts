import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ImageAnalysisService from '../services/ai/imageAnalysis'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()
const imageAnalysis = new ImageAnalysisService()

// Configure multer storage for product media
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const productId = String((req.params as any).productId || 'generic')
    const type = String((req.query.type || 'images'))
    const base = path.join(process.cwd(), 'backend', 'src', 'media', 'products', productId, type)
    fs.mkdirSync(base, { recursive: true })
    cb(null, base)
  },
  filename: (_req, file, cb) => {
    const ts = Date.now()
    const ext = path.extname(file.originalname) || '.bin'
    const name = `${ts}-${Math.random().toString(36).slice(2)}${ext}`
    cb(null, name)
  }
})

const upload = multer({ storage })

// POST /api/media/products/:productId/upload?type=images|videos|testimonials
router.post('/media/products/:productId/upload', upload.array('files', 10), async (req, res) => {
  try {
    const productId = String((req.params as any).productId)
    const type = String((req.query.type || 'images'))
    const files = (req.files as Express.Multer.File[]) || []
    const urls = files.map(f => `/media/products/${productId}/${type}/${path.basename(f.path)}`)
    
    // Analyze images with AI Vision if they are images
    const analyses: any[] = []
    if (type === 'images') {
      for (const file of files) {
        if (file.mimetype.startsWith('image/')) {
          try {
            const analysis = await imageAnalysis.analyzeImage(file.path, { productId })
            analyses.push({
              file: path.basename(file.path),
              url: `/media/products/${productId}/${type}/${path.basename(file.path)}`,
              analysis
            })
            
            // Save analysis to JSON file for bot to use
            const analysisPath = file.path.replace(path.extname(file.path), '.analysis.json')
            fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2))
            
          } catch (error) {
            console.error(`Image analysis failed for ${file.filename}:`, error)
            
            // Create a fallback analysis for unsupported formats
            const fallbackAnalysis = {
              category: 'product',
              subcategory: 'uploaded',
              characteristics: ['imagem enviada', 'análise pendente'],
              description: 'Imagem carregada - análise manual necessária',
              confidence: 0.5,
              isHighQuality: true,
              tags: ['upload', 'pending-analysis'],
              error: error instanceof Error ? error.message : 'Formato não suportado pela análise automática'
            }
            
            analyses.push({
              file: path.basename(file.path),
              url: `/media/products/${productId}/${type}/${path.basename(file.path)}`,
              analysis: fallbackAnalysis
            })
            
            // Save fallback analysis
            const analysisPath = file.path.replace(path.extname(file.path), '.analysis.json')
            fs.writeFileSync(analysisPath, JSON.stringify(fallbackAnalysis, null, 2))
          }
        }
      }
    }
    
    console.log(`🤖 Analyzed ${analyses.length} images for product ${productId}`)
    analyses.forEach(a => {
      if (a.analysis.category) {
        console.log(`  📸 ${a.file}: ${a.analysis.category} (${a.analysis.subcategory}) - confidence: ${a.analysis.confidence}`)
      }
    })
    
    res.json({ 
      success: true, 
      uploaded: files.length, 
      urls,
      analyses: analyses.length > 0 ? analyses : undefined
    })
    
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'upload_failed' })
  }
})

/**
 * 📸 Servir mídias dos produtos
 */
router.get('/products/:productId/images/:filename', (req, res) => {
  try {
    const { productId, filename } = req.params
    
    // Caminho para o arquivo de mídia
    const mediaPath = path.join(__dirname, '..', 'media', 'products', productId, 'images', filename)
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(mediaPath)) {
      return res.status(404).json({ error: 'Mídia não encontrada' })
    }
    
    // Verificar extensão
    const ext = path.extname(filename).toLowerCase()
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({ error: 'Formato de arquivo não suportado' })
    }
    
    // Definir Content-Type
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    }
    
    res.setHeader('Content-Type', contentTypes[ext] || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400') // Cache por 1 dia
    
    // Enviar arquivo
    res.sendFile(mediaPath)
    
  } catch (error) {
    console.error('❌ Erro ao servir mídia:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * 📋 Listar mídias de um produto
 */
router.get('/products/:productId/list', (req, res) => {
  try {
    const { productId } = req.params
    
    const imagesPath = path.join(__dirname, '..', 'media', 'products', productId, 'images')
    
    if (!fs.existsSync(imagesPath)) {
      return res.json({ images: [], videos: [] })
    }
    
    const files = fs.readdirSync(imagesPath)
    const images = files
      .filter(file => !file.endsWith('.analysis.json'))
      .filter(file => ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(path.extname(file).toLowerCase()))
      .map(file => `/api/media/products/${productId}/images/${file}`)
    
    res.json({
      success: true,
      productId,
      images,
      videos: [], // TODO: Adicionar suporte a vídeos
      total: images.length
    })
    
  } catch (error) {
    console.error('❌ Erro ao listar mídias:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
