import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

interface ImageAnalysis {
  category: 'product' | 'testimonial' | 'before_after' | 'lifestyle' | 'demonstration' | 'packaging' | 'other'
  subcategory: string // Ex: 'nude', 'preto', 'teste_invisibilidade', 'depoimento_real'
  colors: string[] // Cores predominantes
  features: string[] // Características detectadas
  context: string // Quando usar esta imagem
  confidence: number // Confiança da análise (0-1)
  tags: string[] // Tags para busca
  description: string // Descrição detalhada
  recommendedFor: string[] // Situações recomendadas
}

class ImageAnalysisService {
  private openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY
    })
  }

  async analyzeImage(imagePath: string, productContext?: any): Promise<ImageAnalysis> {
    try {
      // Encode image to base64
      const imageBuffer = fs.readFileSync(imagePath)
      const base64Image = imageBuffer.toString('base64')
      const mimeType = this.getMimeType(imagePath)
      
      const systemPrompt = `Você é um especialista em análise de imagens para e-commerce de lingerie/calcinha modeladora.

CONTEXTO DO PRODUTO:
- Produto: Calcinha Lipo Modeladora
- Variações: 1-6 unidades, preços R$ 89,90 - R$ 359,90
- Cores disponíveis: Nude, Preto, outras neutras
- Público: Mulheres 25-45 anos, foco em conforto e modelagem

CATEGORIAS DE IMAGEM:
- product: Foto do produto isolado (fundo neutro)
- testimonial: Pessoa real usando/mostrando resultado
- before_after: Comparação antes/depois
- lifestyle: Pessoa no dia a dia usando o produto
- demonstration: Teste de funcionalidade (invisibilidade, elasticidade)
- packaging: Embalagem, kit, apresentação
- other: Outras categorias

SUBCATEGORIAS IMPORTANTES:
- Cores: nude, preto, rose, branco
- Tamanhos: PP, P, M, G, GG, XG
- Contextos: dia_a_dia, trabalho, exercicio, festa
- Testes: invisibilidade, elasticidade, conforto, modelagem

Analise a imagem e retorne EXCLUSIVAMENTE um JSON válido, sem formatação markdown, sem explicações adicionais, apenas o objeto JSON puro:
{
  "category": "product|testimonial|before_after|lifestyle|demonstration|packaging|other",
  "subcategory": "descrição específica da subcategoria",
  "colors": ["cor1", "cor2"],
  "features": ["característica1", "característica2"],
  "context": "quando usar esta imagem",
  "confidence": 0.95,
  "tags": ["tag1", "tag2", "tag3"],
  "description": "descrição detalhada",
  "recommendedFor": ["situação1", "situação2"]
}

IMPORTANTE: Retorne APENAS o JSON, sem código markdown, sem texto adicional.`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analise esta imagem e categorize para uso no bot de vendas de calcinha modeladora. ${productContext ? `Contexto adicional: ${JSON.stringify(productContext)}` : ''}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })

      const content = response.choices[0]?.message?.content?.trim()
      if (!content) {
        throw new Error('No response from vision API')
      }

      // Parse JSON response - handle markdown formatting and other edge cases
      let jsonContent = content
      
      // Remove markdown code blocks if present
      if (content.includes('```json')) {
        const match = content.match(/```json\s*([\s\S]*?)\s*```/)
        if (match) {
          jsonContent = match[1].trim()
        }
      } else if (content.includes('```')) {
        const match = content.match(/```\s*([\s\S]*?)\s*```/)
        if (match) {
          jsonContent = match[1].trim()
        }
      }
      
      // Additional cleanup for common formatting issues
      jsonContent = jsonContent
        .replace(/^```json\s*/i, '')  // Remove leading ```json
        .replace(/\s*```$/i, '')      // Remove trailing ```
        .replace(/^```\s*/i, '')      // Remove leading ```
        .trim()
      
      let analysis: ImageAnalysis
      try {
        analysis = JSON.parse(jsonContent)
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from the response
        console.warn('Failed to parse JSON directly, attempting extraction:', parseError)
        console.log('Raw content:', content)
        console.log('Cleaned content:', jsonContent)
        
        // Try to find JSON-like structure in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            analysis = JSON.parse(jsonMatch[0])
          } catch (secondParseError: any) {
            throw new Error(`Failed to parse image analysis response: ${secondParseError.message}`)
          }
        } else {
          throw new Error(`No valid JSON found in response: ${content.substring(0, 200)}...`)
        }
      }
      
      // Validate required fields
      if (!analysis.category || !analysis.description) {
        throw new Error('Invalid analysis response - missing required fields')
      }

      return analysis
      
    } catch (error) {
      console.error('Image analysis failed:', error)
      // Fallback analysis
      return this.createFallbackAnalysis(imagePath)
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    }
    return mimeTypes[ext] || 'image/jpeg'
  }

  private createFallbackAnalysis(imagePath: string): ImageAnalysis {
    const filename = path.basename(imagePath).toLowerCase()
    
    let category: ImageAnalysis['category'] = 'other'
    let subcategory = 'unknown'
    let tags: string[] = []
    let recommendedFor: string[] = []

    // Simple filename-based categorization
    if (filename.includes('produto') || filename.includes('product')) {
      category = 'product'
      subcategory = 'produto_isolado'
      tags = ['produto', 'catalogo']
      recommendedFor = ['apresentacao_inicial', 'catalogo']
    } else if (filename.includes('teste') || filename.includes('demo')) {
      category = 'demonstration'
      subcategory = 'teste_funcionalidade'
      tags = ['teste', 'demonstracao']
      recommendedFor = ['prova_funcionalidade', 'objection_handling']
    } else if (filename.includes('depoimento') || filename.includes('review')) {
      category = 'testimonial'
      subcategory = 'depoimento_cliente'
      tags = ['depoimento', 'social_proof']
      recommendedFor = ['social_proof', 'confianca']
    }

    return {
      category,
      subcategory,
      colors: ['unknown'],
      features: ['auto_detected'],
      context: 'Análise automática baseada em nome do arquivo',
      confidence: 0.3,
      tags,
      description: `Imagem categorizada automaticamente como ${category}`,
      recommendedFor
    }
  }

  async analyzeMultipleImages(imagePaths: string[], productContext?: any): Promise<Map<string, ImageAnalysis>> {
    const results = new Map<string, ImageAnalysis>()
    
    for (const imagePath of imagePaths) {
      try {
        const analysis = await this.analyzeImage(imagePath, productContext)
        results.set(imagePath, analysis)
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`Failed to analyze ${imagePath}:`, error)
        results.set(imagePath, this.createFallbackAnalysis(imagePath))
      }
    }
    
    return results
  }
}

export default ImageAnalysisService
export type { ImageAnalysis }
