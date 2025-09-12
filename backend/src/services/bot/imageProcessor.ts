import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { createWriteStream } from 'fs'
import https from 'https'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy'
})

/**
 * 👁️ Analisa imagem usando GPT-4 Vision
 */
export async function analyzeImage(imageUrl: string): Promise<string> {
  try {
    console.log('👁️ Analisando imagem:', imageUrl)
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Suporta vision
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analise esta imagem e responda:
              
1. O que a pessoa está mostrando?
2. Ela parece interessada em produtos de modelagem corporal?
3. Há alguma necessidade específica que você pode identificar?
4. Como nossa calcinha modeladora poderia ajudar?

Resposta em português, objetiva e consultiva.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'low' // Para economizar tokens
              }
            }
          ]
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    })
    
    const analysis = response.choices[0]?.message?.content || 'Não consegui analisar a imagem.'
    
    console.log('✅ Imagem analisada:', analysis)
    return analysis
    
  } catch (error) {
    console.error('❌ Erro na análise da imagem:', error)
    return '[Não foi possível analisar a imagem]'
  }
}

/**
 * 🔍 Detecta tipo de imagem
 */
export function detectImageType(imageUrl: string): 'product_interest' | 'body_reference' | 'question' | 'other' {
  // Análise básica por URL/contexto
  const url = imageUrl.toLowerCase()
  
  if (url.includes('product') || url.includes('calcinha')) {
    return 'product_interest'
  }
  
  if (url.includes('body') || url.includes('fit')) {
    return 'body_reference'
  }
  
  return 'other'
}

/**
 * 📸 Gera resposta contextual baseada na análise
 */
export function generateImageResponse(analysis: string, customerContext: any): string {
  // Se menciona interesse em modelagem
  if (analysis.includes('modelagem') || analysis.includes('silhueta')) {
    return 'Vi sua foto, amiga! Nossa calcinha modeladora pode te ajudar com isso. Quer saber mais?'
  }
  
  // Se mostra dúvidas sobre tamanho
  if (analysis.includes('tamanho') || analysis.includes('medida')) {
    return 'Pela sua foto, posso te ajudar com o tamanho ideal. Qual sua numeração habitual de calcinha?'
  }
  
  // Resposta padrão consultiva
  return 'Obrigada por compartilhar! Como posso te ajudar com nossa calcinha modeladora?'
}
