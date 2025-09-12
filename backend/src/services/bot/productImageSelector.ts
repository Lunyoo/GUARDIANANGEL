/**
 * 🖼️ SISTEMA INTELIGENTE DE SELEÇÃO DE IMAGENS DE PRODUTO
 * 
 * Este módulo conecta as solicitações de imagens dos clientes
 * com o banco de imagens reais organizadas por produto/preço
 */

import * as fs from 'fs'
import * as path from 'path'

interface ProductImageInfo {
  productPath: string
  productName: string
  price: string
  quantity: string
  imageFiles: string[]
  bestImages: string[] // Melhores imagens para mostrar primeiro
}

interface ImageRequest {
  type: 'general' | 'specific_color' | 'fit_example' | 'comparison' | 'detail'
  keywords: string[]
  quantity?: number
  priceRange?: string
}

// 📁 Mapear todos os produtos disponíveis
function getAvailableProducts(): ProductImageInfo[] {
  const mediaPath = '/home/alex/GUARDIANANGEL/backend/src/media/products'
  
  try {
    const productDirs = fs.readdirSync(mediaPath).filter(dir => {
      const fullPath = path.join(mediaPath, dir)
      return fs.statSync(fullPath).isDirectory()
    })

    return productDirs.map(dir => {
      const productPath = path.join(mediaPath, dir)
      const imagesPath = path.join(productPath, 'images')
      
      let imageFiles: string[] = []
      if (fs.existsSync(imagesPath)) {
        imageFiles = fs.readdirSync(imagesPath)
          .filter(file => file.endsWith('.jpeg') || file.endsWith('.jpg') || file.endsWith('.png'))
      }

      // Extrair informações do nome da pasta
      const match = dir.match(/prod-calcinha-(\d+)un-(\d+)/)
      const quantity = match ? match[1] : '1'
      const price = match ? `R$ ${match[2]},90` : 'R$ 89,90'

      return {
        productPath,
        productName: `Calcinha Modeladora ${quantity} unidade${quantity !== '1' ? 's' : ''}`,
        price,
        quantity,
        imageFiles,
        bestImages: imageFiles.slice(0, 3) // Primeiras 3 como melhores
      }
    }).filter(product => product.imageFiles.length > 0)

  } catch (error) {
    console.error('❌ Erro ao carregar produtos:', error)
    return []
  }
}

// 🧠 Analisar solicitação do cliente
function analyzeImageRequest(customerMessage: string): ImageRequest {
  const message = customerMessage.toLowerCase()
  
  // Detectar tipo de solicitação
  let type: ImageRequest['type'] = 'general'
  let keywords: string[] = []
  let quantity: number | undefined
  let priceRange: string | undefined

  // Palavras-chave por tipo
  if (message.match(/cor|cores|preto|branco|nude|rosa|colorir/)) {
    type = 'specific_color'
    keywords.push('color')
  }

  if (message.match(/como fica|vestindo|modelo|usando|corpo/)) {
    type = 'fit_example'
    keywords.push('wearing', 'model')
  }

  if (message.match(/comparar|diferença|opções|modelos|tipos/)) {
    type = 'comparison'
    keywords.push('comparison')
  }

  if (message.match(/detalhe|close|zoom|tecido|material|qualidade/)) {
    type = 'detail'
    keywords.push('detail', 'texture')
  }

  // Detectar quantidade solicitada
  const qtyMatch = message.match(/(\d+)\s*(un|unidade|peça|kit)/i)
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1])
  }

  // Detectar faixa de preço
  if (message.match(/barato|económico|promoção|desconto/)) {
    priceRange = 'budget'
  } else if (message.match(/premium|melhor|top|qualidade/)) {
    priceRange = 'premium'
  }

  return { type, keywords, quantity, priceRange }
}

// 🎯 Selecionar melhores imagens baseado na solicitação
export function selectBestImages(customerMessage: string, maxImages: number = 3): {
  selectedImages: string[]
  productInfo: ProductImageInfo[]
  reasoning: string
} {
  const request = analyzeImageRequest(customerMessage)
  const availableProducts = getAvailableProducts()
  
  if (availableProducts.length === 0) {
    return {
      selectedImages: [],
      productInfo: [],
      reasoning: 'Nenhuma imagem de produto encontrada'
    }
  }

  let filteredProducts = availableProducts

  // Filtrar por quantidade se especificada
  if (request.quantity) {
    const qtyFiltered = filteredProducts.filter(p => parseInt(p.quantity) === request.quantity)
    if (qtyFiltered.length > 0) {
      filteredProducts = qtyFiltered
    }
  }

  // Filtrar por faixa de preço
  if (request.priceRange === 'budget') {
    filteredProducts.sort((a, b) => {
      const priceA = parseInt(a.price.replace(/\D/g, ''))
      const priceB = parseInt(b.price.replace(/\D/g, ''))
      return priceA - priceB
    })
  } else if (request.priceRange === 'premium') {
    filteredProducts.sort((a, b) => {
      const priceA = parseInt(a.price.replace(/\D/g, ''))
      const priceB = parseInt(b.price.replace(/\D/g, ''))
      return priceB - priceA
    })
  }

  // Selecionar imagens
  const selectedImages: string[] = []
  const selectedProducts: ProductImageInfo[] = []
  
  let imageCount = 0
  for (const product of filteredProducts) {
    if (imageCount >= maxImages) break
    
    const imagesToAdd = Math.min(
      product.bestImages.length,
      maxImages - imageCount,
      request.type === 'comparison' ? 1 : 2
    )
    
    for (let i = 0; i < imagesToAdd; i++) {
      if (product.bestImages[i]) {
        const fullImagePath = path.join(product.productPath, 'images', product.bestImages[i])
        selectedImages.push(fullImagePath)
        imageCount++
      }
    }
    
    selectedProducts.push(product)
  }

  // Gerar explicação
  let reasoning = `Selecionadas ${selectedImages.length} imagens`
  if (request.quantity) reasoning += ` para kit de ${request.quantity} unidades`
  if (request.priceRange) reasoning += ` (faixa ${request.priceRange})`
  reasoning += `. Tipo: ${request.type}`

  return {
    selectedImages,
    productInfo: selectedProducts,
    reasoning
  }
}

// 🏷️ Gerar legenda personalizada para as imagens
export function generateImageCaption(productInfo: ProductImageInfo[], customerRequest: string, selectedPrice?: string, selectedQuantity?: number): string {
  if (productInfo.length === 0) return 'Aqui estão nossas calcinhas modeladoras!'
  
  const request = analyzeImageRequest(customerRequest)
  let caption = '📸 '
  
  if (request.type === 'comparison') {
    caption += 'Aqui estão nossas opções de calcinha modeladora:\n\n'
  } else if (request.type === 'fit_example') {
    caption += 'Veja como fica nossa calcinha modeladora:\n\n'
  } else if (request.type === 'detail') {
    caption += 'Detalhes da nossa calcinha modeladora:\n\n'
  } else {
    caption += 'Nossa Calcinha Modeladora ShapeFit:\n\n'
  }

  // 🎯 MOSTRAR APENAS 1 PREÇO - o escolhido pela estratégia ML
  if (selectedPrice && selectedQuantity) {
    caption += `🔥 ${selectedQuantity} unidade${selectedQuantity > 1 ? 's' : ''} - ${selectedPrice}\n`
  } else {
    // Fallback: mostrar apenas o primeiro produto (não múltiplos preços)
    const firstProduct = productInfo[0]
    caption += `� ${firstProduct.productName} - ${firstProduct.price}\n`
  }

  caption += '\n✨ Reduz até 2 tamanhos\n🔥 Levanta o bumbum\n💎 Tecido premium respirável\n💳 Pagamento na entrega!'

  return caption
}

// 🔍 Debug: listar todos os produtos disponíveis
export function listAvailableProducts(): ProductImageInfo[] {
  return getAvailableProducts()
}