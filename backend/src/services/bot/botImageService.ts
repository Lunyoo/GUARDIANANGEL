import ImageSelectorService from '../ai/imageSelector'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const imageSelector = new ImageSelectorService()

export interface BotConversationContext {
  customerMessage: string
  previousMessages: string[]
  customerProfile?: {
    age?: string
    style?: string
    interests?: string[]
  }
  conversationStage: 'initial' | 'browsing' | 'interested' | 'deciding' | 'purchasing'
  productInterest?: string
  intent?: string
}

export interface BotImageRecommendation {
  productId: string
  imageUrl: string
  reason: string
  confidence: number
  category: string
  description: string
}

export class BotImageService {
  /**
   * Get smart image recommendation for WhatsApp bot response
   */
  async getImageForBotResponse(context: BotConversationContext): Promise<BotImageRecommendation | null> {
    try {
      // Get all available products if no specific product interest
      let productId = context.productInterest
      
      if (!productId) {
        const products = await prisma.product.findMany({
          select: { id: true, name: true },
          take: 1 // For now, use first product as default
        })
        
        if (products.length === 0) {
          console.log('❌ No products found in database')
          return null
        }
        
        productId = products[0].id
      }

      // Build conversation context for AI analysis
      const conversationHistory = context.previousMessages.join(' ')
      
      // Try primary productId
      let recommendation = await imageSelector.recommendImageForBot(
        productId,
        conversationHistory,
        context.customerMessage
      )

      // Fallback 1: known aliases mapping
      if (!recommendation) {
        const aliasMap: Record<string, string> = {
          'calcinha-lipo-modeladora': 'prod-calcinha-2un-139',
          'calcinha': 'prod-calcinha-2un-139',
          'lipo': 'prod-calcinha-2un-139'
        }
        const key = (context.productInterest || '').toLowerCase()
        if (aliasMap[key]) {
          const aliasId = aliasMap[key]
          recommendation = await imageSelector.recommendImageForBot(
            aliasId,
            conversationHistory,
            context.customerMessage
          )
          if (recommendation) {
            productId = aliasId
          }
        }
      }

      // Fallback 2: iterate DB products
      if (!recommendation) {
        try {
          const products = await prisma.product.findMany({ select: { id: true }, take: 10 })
          for (const p of products) {
            const tryRec = await imageSelector.recommendImageForBot(
              p.id,
              conversationHistory,
              context.customerMessage
            )
            if (tryRec) {
              recommendation = tryRec
              productId = p.id
              break
            }
          }
        } catch {}
      }

      // Fallback 3: scan filesystem media directories
      if (!recommendation) {
        // Resolve media base similar to ImageSelector
        const cwd = process.cwd()
        const candidates = [
          path.join(cwd, 'backend', 'src', 'media', 'products'),
          path.join(cwd, 'src', 'media', 'products'),
          path.join(cwd.replace(/backend\/?$/, ''), 'backend', 'src', 'media', 'products')
        ]
        const base = candidates.find(p => fs.existsSync(p)) || candidates[0]
        if (fs.existsSync(base)) {
          const dirs = fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
          for (const dir of dirs) {
            const imgs = imageSelector.selectBestImages(dir, { intent: 'product_showcase' }, 1)
            if (imgs.length > 0) {
              // Build pseudo recommendation using top image
              const top = imgs[0]
              productId = dir
              recommendation = { image: { file: path.basename(top.path), url: top.url, analysis: top.analysis, path: top.path, productId: dir, type: top.type }, score: 90 }
              break
            }
          }
        }
      }

      if (!recommendation) {
        console.log('❌ No image recommendation found (after fallbacks)')
        return null
      }

      // Build bot-friendly response
      const botRecommendation: BotImageRecommendation = {
        productId,
        imageUrl: recommendation.image.url,
        reason: this.generateReasonForBot(recommendation.image.analysis, context),
        confidence: Math.max(0, Math.min(1, recommendation.score / 100)), // Normalize and clamp to 0-1
        category: recommendation.image.analysis.category,
        description: recommendation.image.analysis.description
      }

      console.log(`🤖 Bot will send image: ${botRecommendation.imageUrl}`)
      console.log(`   Reason: ${botRecommendation.reason}`)
      console.log(`   Confidence: ${(botRecommendation.confidence * 100).toFixed(1)}%`)

      return botRecommendation

    } catch (error) {
      console.error('Bot image service error:', error)
      return null
    }
  }

  /**
   * Get multiple images for product showcase
   */
  async getProductShowcaseImages(productId?: string, maxImages: number = 3): Promise<BotImageRecommendation[]> {
    try {
      if (!productId) {
        const products = await prisma.product.findMany({
          select: { id: true },
          take: 1
        })
        
        if (products.length === 0) return []
        productId = products[0].id
      }

      const showcaseImages = imageSelector.selectBestImages(productId, {
        intent: 'product_showcase',
        preferredStyle: 'elegant'
      }, maxImages)

      return showcaseImages.map(item => ({
        productId: productId as string,
        imageUrl: item.url,
        reason: `Imagem de produto - ${item.analysis.subcategory}`,
        confidence: item.analysis.confidence,
        category: item.analysis.category,
        description: item.analysis.description
      }))

    } catch (error) {
      console.error('Showcase images error:', error)
      return []
    }
  }

  /**
   * Get testimonial images for building trust
   */
  async getTestimonialImages(productId?: string, maxImages: number = 2): Promise<BotImageRecommendation[]> {
    try {
      if (!productId) {
        const products = await prisma.product.findMany({
          select: { id: true },
          take: 1
        })
        
        if (products.length === 0) return []
        productId = products[0].id
      }

      const testimonialImages = imageSelector.selectBestImages(productId, {
        intent: 'testimonial'
      }, maxImages)

      return testimonialImages.map(item => ({
        productId: productId as string,
        imageUrl: item.url,
        reason: 'Depoimento de cliente satisfeita',
        confidence: item.analysis.confidence,
        category: item.analysis.category,
        description: item.analysis.description
      }))

    } catch (error) {
      console.error('Testimonial images error:', error)
      return []
    }
  }

  /**
   * Get before/after transformation images
   */
  async getTransformationImages(productId?: string): Promise<BotImageRecommendation[]> {
    try {
      if (!productId) {
        const products = await prisma.product.findMany({
          select: { id: true },
          take: 1
        })
        
        if (products.length === 0) return []
        productId = products[0].id
      }

      const transformationImages = imageSelector.selectBestImages(productId, {
        intent: 'before_after'
      }, 2)

      return transformationImages.map(item => ({
        productId: productId as string,
        imageUrl: item.url,
        reason: 'Resultado de transformação',
        confidence: item.analysis.confidence,
        category: item.analysis.category,
        description: item.analysis.description
      }))

    } catch (error) {
      console.error('Transformation images error:', error)
      return []
    }
  }

  /**
   * Analyze customer message to determine what type of images to send
   */
  analyzeCustomerIntent(message: string): {
    intent: string
    needsImages: boolean
    imageType: 'product' | 'testimonial' | 'transformation' | 'lifestyle' | 'mixed'
    urgency: 'low' | 'medium' | 'high'
  } {
    const lowercaseMessage = message.toLowerCase()
    
    // Check for specific intents
    if (lowercaseMessage.includes('resultado') || lowercaseMessage.includes('antes') || lowercaseMessage.includes('depois')) {
      return {
        intent: 'results_inquiry',
        needsImages: true,
        imageType: 'transformation',
        urgency: 'high'
      }
    }
    
    if (lowercaseMessage.includes('depoimento') || lowercaseMessage.includes('avaliação') || lowercaseMessage.includes('opinião')) {
      return {
        intent: 'social_proof',
        needsImages: true,
        imageType: 'testimonial',
        urgency: 'medium'
      }
    }
    
    if (lowercaseMessage.includes('produto') || lowercaseMessage.includes('modelo') || lowercaseMessage.includes('ver') || lowercaseMessage.includes('mostrar')) {
      return {
        intent: 'product_inquiry',
        needsImages: true,
        imageType: 'product',
        urgency: 'high'
      }
    }
    
    if (lowercaseMessage.includes('como usar') || lowercaseMessage.includes('vestir') || lowercaseMessage.includes('dia a dia')) {
      return {
        intent: 'usage_inquiry',
        needsImages: true,
        imageType: 'lifestyle',
        urgency: 'medium'
      }
    }

    // Default: likely needs product images if asking about the product
    const needsImages = lowercaseMessage.includes('calcinha') || 
                       lowercaseMessage.includes('lingerie') || 
                       lowercaseMessage.includes('produto') ||
                       lowercaseMessage.includes('preço') ||
                       lowercaseMessage.includes('comprar')

    return {
      intent: 'general_inquiry',
      needsImages,
      imageType: 'product',
      urgency: 'low'
    }
  }

  /**
   * Generate human-readable reason for why this image was selected
   */
  private generateReasonForBot(analysis: any, context: BotConversationContext): string {
    const reasons = []
    
    if (analysis.category === 'product') {
      reasons.push('Imagem do produto')
    } else if (analysis.category === 'testimonial') {
      reasons.push('Depoimento de cliente')
    } else if (analysis.category === 'before_after') {
      reasons.push('Resultado de transformação')
    } else if (analysis.category === 'lifestyle') {
      reasons.push('Uso no dia a dia')
    }
    
    if (analysis.subcategory) {
      reasons.push(analysis.subcategory)
    }
    
    if (analysis.confidence > 0.8) {
      reasons.push('alta qualidade')
    }
    
    if (context.conversationStage === 'deciding') {
      reasons.push('ideal para decisão de compra')
    }
    
    return reasons.join(' - ')
  }

  /**
   * Get image statistics for admin monitoring
   */
  async getImageAnalytics(productId?: string): Promise<any> {
    try {
      if (!productId) {
        const products = await prisma.product.findMany({
          select: { id: true }
        })
        
        const allStats = await Promise.all(
          products.map(p => imageSelector.getImageStats(p.id))
        )
        
        return {
          totalProducts: products.length,
          productStats: allStats,
          overallStats: this.aggregateStats(allStats)
        }
      }

      return imageSelector.getImageStats(productId)
      
    } catch (error) {
      console.error('Image analytics error:', error)
      return { error: 'Failed to get analytics' }
    }
  }

  private aggregateStats(statsList: any[]): any {
    return statsList.reduce((agg, stats) => ({
      total: agg.total + stats.total,
      highQuality: agg.highQuality + stats.byQuality.high,
      mediumQuality: agg.mediumQuality + stats.byQuality.medium,
      lowQuality: agg.lowQuality + stats.byQuality.low
    }), { total: 0, highQuality: 0, mediumQuality: 0, lowQuality: 0 })
  }
}

export const botImageService = new BotImageService()
