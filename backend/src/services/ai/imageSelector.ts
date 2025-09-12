import fs from 'fs'
import path from 'path'

interface ImageAnalysis {
  category: string
  subcategory: string
  characteristics?: string[]
  features?: string[]
  description: string
  confidence: number
  isHighQuality?: boolean
  tags: string[]
}

interface ImageMetadata {
  file: string
  url: string
  analysis: ImageAnalysis
  path: string
  productId: string
  type: string
}

interface SelectionContext {
  intent: 'product_showcase' | 'testimonial' | 'before_after' | 'lifestyle' | 'general'
  emotion?: 'confidence' | 'desire' | 'trust' | 'excitement'
  customerProfile?: 'young' | 'mature' | 'professional' | 'casual'
  stage?: 'awareness' | 'interest' | 'consideration' | 'purchase'
  keywords?: string[]
  preferredStyle?: 'elegant' | 'sexy' | 'comfortable' | 'professional'
}

export default class ImageSelectorService {
  private mediaBasePath: string

  constructor() {
    // Resolve media path robustly for different cwd scenarios (repo root vs backend/)
    const cwd = process.cwd()
    const cwdBase = path.basename(cwd).toLowerCase()
    // Prefer correct src/media path when running inside backend/, avoid duplicating "backend/backend"
    const candidates = (
      cwdBase === 'backend'
        ? [
            // Running from backend folder (preferred)
            path.join(cwd, 'src', 'media', 'products'),
            // Fallback to repo root style just in case
            path.join(cwd, '..', 'backend', 'src', 'media', 'products'),
            // Defensive: if something set cwd to repo root by mistake
            path.join(cwd, 'backend', 'src', 'media', 'products')
          ]
        : [
            // Running from repo root (preferred)
            path.join(cwd, 'backend', 'src', 'media', 'products'),
            // Running from nested environments/tests
            path.join(cwd, 'src', 'media', 'products'),
            // Defensive normalization in odd CWDs that end with backend
            path.join(cwd.replace(/backend\/?$/, ''), 'backend', 'src', 'media', 'products')
          ]
    )

    const hasProductDirs = (base: string) => {
      try {
        if (!fs.existsSync(base)) return false
        const entries = fs.readdirSync(base, { withFileTypes: true })
        return entries.some(e => e.isDirectory())
      } catch { return false }
    }

    // Prefer candidate that exists and contains product directories
  let resolved = candidates.find(p => hasProductDirs(p))
    if (!resolved) {
      // Fallback: any existing path
      resolved = candidates.find(p => fs.existsSync(p)) || candidates[1] || candidates[0]
    }

    this.mediaBasePath = resolved
    console.log(`📁 ImageSelector initialized with path: ${this.mediaBasePath}`)
  }

  /**
   * Get all analyzed images for a product with their AI analysis
   */
  public getProductImages(productId: string): ImageMetadata[] {
    const productPath = path.join(this.mediaBasePath, productId)
    console.log(`🔍 Looking for images in: ${productPath}`)
    
    if (!fs.existsSync(productPath)) {
      console.log(`❌ Product path does not exist: ${productPath}`)
      return []
    }

    const images: ImageMetadata[] = []
    const imageTypes = ['images', 'testimonials', 'before_after', 'lifestyle']

    for (const type of imageTypes) {
      const typePath = path.join(productPath, type)
      console.log(`🔍 Checking type path: ${typePath}`)
      
      if (!fs.existsSync(typePath)) {
        console.log(`❌ Type path does not exist: ${typePath}`)
        continue
      }

      const files = fs.readdirSync(typePath)
      console.log(`📁 Files in ${type}:`, files)
      
      for (const file of files) {
        if (file.endsWith('.analysis.json')) continue // Skip analysis files
        
        const analysisFile = file.replace(path.extname(file), '.analysis.json')
        const analysisPath = path.join(typePath, analysisFile)
        
        console.log(`🔍 Looking for analysis file: ${analysisPath}`)
        
        if (fs.existsSync(analysisPath)) {
          try {
            const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'))
            console.log(`✅ Found analysis for ${file}:`, analysis.category)
            
            images.push({
              file,
              url: `/media/products/${productId}/${type}/${file}`,
              analysis,
              path: path.join(typePath, file),
              productId,
              type
            })
          } catch (error) {
            console.error(`Failed to read analysis for ${file}:`, error)
          }
        } else {
          console.log(`❌ No analysis file found for ${file}`)
        }
      }
    }

    console.log(`📸 Total images found: ${images.length}`)
    return images
  }

  /**
   * Select the best image(s) based on conversation context and intent
   */
  public selectBestImages(productId: string, context: SelectionContext, maxImages: number = 1): ImageMetadata[] {
    const allImages = this.getProductImages(productId)
    if (allImages.length === 0) return []

    // Score each image based on context
    const scoredImages = allImages.map(image => ({
      ...image,
      score: this.calculateImageScore(image, context)
    })).sort((a, b) => b.score - a.score)

    // Filter by intent category first
    let candidateImages = scoredImages
    if (context.intent !== 'general') {
      const filtered = scoredImages.filter(img => this.matchesIntent(img, context.intent))
      if (filtered.length > 0) {
        candidateImages = filtered
      }
    }

    // Return top scored images
    return candidateImages.slice(0, maxImages)
  }

  /**
   * Get image recommendation for WhatsApp bot based on conversation analysis
   */
  public async recommendImageForBot(
    productId: string, 
    conversationContext: string,
    customerMessage: string
  ): Promise<{ image: ImageMetadata, score: number } | null> {
    // Analyze conversation context to determine intent
    const context = this.analyzeConversationContext(conversationContext, customerMessage)
    
    const allImages = this.getProductImages(productId)
    if (allImages.length === 0) return null

    // Score each image based on context
    const scoredImages = allImages.map(image => ({
      image,
      score: this.calculateImageScore(image, context)
    })).sort((a, b) => b.score - a.score)

    // Filter by intent category first
    let candidateImages = scoredImages
    if (context.intent !== 'general') {
      const filtered = scoredImages.filter(item => this.matchesIntent(item.image, context.intent))
      if (filtered.length > 0) {
        candidateImages = filtered
      }
    }

    // Avoid sending size-chart/table images when the user just asked for a photo/image
    try {
      const cm = (customerMessage || '').toLowerCase()
      const isPhotoRequest = /(foto|imagem|picture|ver|mostrar)/.test(cm)
      const mentionsSizes = /(tamanho|medida|tabela)/.test(cm)
      if (isPhotoRequest && !mentionsSizes) {
        const noSizeChart = candidateImages.filter(item => {
          const sub = (item.image.analysis?.subcategory || '').toLowerCase()
          const desc = (item.image.analysis?.description || '').toLowerCase()
          const tags = (item.image.analysis?.tags || []).map((t:string)=>t.toLowerCase())
          const isTable = sub.includes('tabela') || sub.includes('medida') || sub.includes('tamanho') ||
                          desc.includes('tabela') || desc.includes('medida') || desc.includes('tamanho') ||
                          tags.includes('tabela de tamanhos') || tags.includes('tabela') || tags.includes('medidas')
          return !isTable
        })
        if (noSizeChart.length > 0) {
          candidateImages = noSizeChart
        }
      }
    } catch {}
    
    if (candidateImages.length > 0) {
      const selected = candidateImages[0]
      console.log(`🤖 Bot selected image: ${selected.image.file} (${selected.image.analysis.category}/${selected.image.analysis.subcategory}) - Score: ${selected.score}`)
      console.log(`   Context: ${context.intent} | Keywords: ${context.keywords?.join(', ')}`)
      return selected
    }

    return null
  }

  /**
   * Calculate relevance score for an image based on context
   */
  private calculateImageScore(image: ImageMetadata, context: SelectionContext): number {
    let score = 0

    // Base quality score
    if (image.analysis.isHighQuality) score += 20
    score += image.analysis.confidence * 10

    // Category matching
    if (this.matchesIntent(image, context.intent)) {
      score += 30
    }

    // Keyword matching in tags and characteristics
    if (context.keywords) {
      const allText = [
        ...image.analysis.tags,
        ...(image.analysis.characteristics || image.analysis.features || []),
        image.analysis.description,
        image.analysis.subcategory
      ].join(' ').toLowerCase()

      for (const keyword of context.keywords) {
        if (allText.includes(keyword.toLowerCase())) {
          score += 15
        }
      }
    }

    // Style preference matching
    if (context.preferredStyle) {
      const tags = image.analysis.tags.map(t => t.toLowerCase())
      if (tags.includes(context.preferredStyle)) {
        score += 20
      }
    }

    // Customer profile matching
    if (context.customerProfile) {
      const characteristics = (image.analysis.characteristics || image.analysis.features || []).map(c => c.toLowerCase())
      switch (context.customerProfile) {
        case 'young':
          if (characteristics.some(c => c.includes('jovem') || c.includes('moderna') || c.includes('trendy'))) {
            score += 15
          }
          break
        case 'mature':
          if (characteristics.some(c => c.includes('elegante') || c.includes('sofisticada') || c.includes('clássica'))) {
            score += 15
          }
          break
        case 'professional':
          if (characteristics.some(c => c.includes('profissional') || c.includes('discreta') || c.includes('neutra'))) {
            score += 15
          }
          break
      }
    }

    return score
  }

  /**
   * Check if image matches the conversation intent
   */
  private matchesIntent(image: ImageMetadata, intent: string): boolean {
    const category = image.analysis.category.toLowerCase()
    
    switch (intent) {
      case 'product_showcase':
        return category === 'product' || category === 'showcase'
      case 'testimonial':
        return category === 'testimonial' || category === 'review'
      case 'before_after':
        return category === 'before_after' || category === 'transformation'
      case 'lifestyle':
        return category === 'lifestyle' || category === 'in_use'
      default:
        return true
    }
  }

  /**
   * Analyze conversation to determine image selection context
   */
  private analyzeConversationContext(conversationContext: string, customerMessage: string): SelectionContext {
    const fullText = `${conversationContext} ${customerMessage}`.toLowerCase()
    
    // Detect intent keywords
    let intent: SelectionContext['intent'] = 'general'
    
    if (fullText.includes('resultado') || fullText.includes('antes') || fullText.includes('depois') || fullText.includes('transformação')) {
      intent = 'before_after'
    } else if (fullText.includes('depoimento') || fullText.includes('opinião') || fullText.includes('avaliação') || fullText.includes('feedback')) {
      intent = 'testimonial'
    } else if (fullText.includes('como usar') || fullText.includes('vestindo') || fullText.includes('no dia a dia')) {
      intent = 'lifestyle'
    } else if (fullText.includes('produto') || fullText.includes('mostrar') || fullText.includes('ver') || fullText.includes('modelo')) {
      intent = 'product_showcase'
    }

    // Extract keywords
    const keywords: string[] = []
    const keywordPatterns = [
      'confortável', 'conforto', 'macia', 'suave',
      'sexy', 'sensual', 'sedutor', 'atraente',
      'elegante', 'sofisticada', 'clássica', 'fina',
      'jovem', 'moderna', 'trendy', 'atual',
      'profissional', 'discreta', 'neutra', 'básica',
      'cores', 'cor', 'preto', 'branco', 'nude', 'colorida',
      'tamanho', 'tam', 'p', 'm', 'g', 'gg',
      'preço', 'valor', 'barato', 'promoção', 'oferta'
    ]

    for (const pattern of keywordPatterns) {
      if (fullText.includes(pattern)) {
        keywords.push(pattern)
      }
    }

    // Detect customer profile
    let customerProfile: SelectionContext['customerProfile'] | undefined
    if (fullText.includes('jovem') || fullText.includes('nova') || fullText.includes('moderna')) {
      customerProfile = 'young'
    } else if (fullText.includes('madura') || fullText.includes('elegante') || fullText.includes('sofisticada')) {
      customerProfile = 'mature'
    } else if (fullText.includes('trabalho') || fullText.includes('profissional') || fullText.includes('escritório')) {
      customerProfile = 'professional'
    }

    // Detect preferred style
    let preferredStyle: SelectionContext['preferredStyle'] | undefined
    if (fullText.includes('elegante') || fullText.includes('sofisticada')) {
      preferredStyle = 'elegant'
    } else if (fullText.includes('sexy') || fullText.includes('sensual')) {
      preferredStyle = 'sexy'
    } else if (fullText.includes('confortável') || fullText.includes('conforto')) {
      preferredStyle = 'comfortable'
    } else if (fullText.includes('profissional') || fullText.includes('trabalho')) {
      preferredStyle = 'professional'
    }

    return {
      intent,
      keywords: keywords.length > 0 ? keywords : undefined,
      customerProfile,
      preferredStyle
    }
  }

  /**
   * Get statistics about available images for admin dashboard
   */
  public getImageStats(productId: string): any {
    const images = this.getProductImages(productId)
    
    const stats = {
      total: images.length,
      byCategory: {} as Record<string, number>,
      byQuality: {
        high: images.filter(i => i.analysis.isHighQuality === true).length,
        medium: images.filter(i => i.analysis.isHighQuality !== true && i.analysis.confidence >= 0.7).length,
        low: images.filter(i => i.analysis.isHighQuality !== true && i.analysis.confidence < 0.7).length
      },
      avgConfidence: images.length > 0 ? images.reduce((sum, i) => sum + i.analysis.confidence, 0) / images.length : 0
    }

    for (const image of images) {
      const category = image.analysis.category
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
    }

    return stats
  }
}
