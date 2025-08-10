// Hook para integração com IA do Spark para análise de scraping
import { useState } from 'react'

interface AIScrapingAnalysis {
  keyword: string
  marketTrend: 'rising' | 'stable' | 'declining'
  competitionLevel: 'low' | 'medium' | 'high'
  suggestedOffers: {
    title: string
    description: string
    estimatedPrice: number
    successProbability: number
  }[]
  insights: string[]
}

export function useAIScrapingAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const analyzeKeywordWithAI = async (keyword: string): Promise<AIScrapingAnalysis> => {
    setIsAnalyzing(true)
    
    try {
      const prompt = spark.llmPrompt`
        Analise o nicho/palavra-chave "${keyword}" para marketing digital no Brasil e forneça:

        1. Tendência atual do mercado (rising/stable/declining)
        2. Nível de competição (low/medium/high)
        3. 3 sugestões de ofertas digitais promissoras para este nicho
        4. Insights sobre oportunidades e desafios

        Para cada oferta sugerida, inclua:
        - Título atrativo
        - Breve descrição
        - Preço estimado (R$)
        - Probabilidade de sucesso (0-100%)

        Responda no formato JSON válido.
      `
      
      const response = await spark.llm(prompt, 'gpt-4o', true)
      
      // Parse da resposta da IA
      const aiData = JSON.parse(response)
      
      return {
        keyword,
        marketTrend: aiData.marketTrend || 'stable',
        competitionLevel: aiData.competitionLevel || 'medium',
        suggestedOffers: aiData.suggestedOffers || [],
        insights: aiData.insights || []
      }
      
    } catch (error) {
      console.error('Erro na análise com IA:', error)
      
      // Fallback caso a IA falhe
      return {
        keyword,
        marketTrend: 'stable',
        competitionLevel: 'medium',
        suggestedOffers: [
          {
            title: `Curso Completo de ${keyword}`,
            description: `Aprenda tudo sobre ${keyword} do básico ao avançado`,
            estimatedPrice: Math.floor(Math.random() * 300 + 197),
            successProbability: Math.floor(Math.random() * 20 + 70)
          }
        ],
        insights: [
          `O nicho de ${keyword} apresenta oportunidades interessantes`,
          'Recomenda-se testar com orçamento baixo inicialmente',
          'Foque em audiências específicas do nicho'
        ]
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateOfferVariationsWithAI = async (baseOffer: string, count: number = 3): Promise<string[]> => {
    try {
      const prompt = spark.llmPrompt`
        Baseado na oferta "${baseOffer}", gere ${count} variações criativas e persuasivas para testes A/B.
        
        Cada variação deve:
        - Manter a essência da oferta original
        - Usar diferentes gatilhos mentais
        - Ter headlines impactantes
        - Ser adequada para o público brasileiro

        Retorne apenas um array JSON com as variações.
      `
      
      const response = await spark.llm(prompt, 'gpt-4o', true)
      const variations = JSON.parse(response)
      
      return Array.isArray(variations) ? variations : [baseOffer]
      
    } catch (error) {
      console.error('Erro ao gerar variações:', error)
      return [baseOffer]
    }
  }

  const analyzeCompetitorAd = async (adCopy: string, niche: string): Promise<{
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
    score: number
  }> => {
    try {
      const prompt = spark.llmPrompt`
        Analise este anúncio do nicho "${niche}":
        
        "${adCopy}"
        
        Forneça:
        1. Pontos fortes do anúncio
        2. Pontos fracos ou oportunidades de melhoria
        3. Sugestões específicas de otimização
        4. Score geral de 0-100 baseado em eficácia de copy

        Responda em JSON válido.
      `
      
      const response = await spark.llm(prompt, 'gpt-4o', true)
      const analysis = JSON.parse(response)
      
      return {
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        improvements: analysis.improvements || [],
        score: analysis.score || 75
      }
      
    } catch (error) {
      console.error('Erro na análise do anúncio:', error)
      return {
        strengths: ['Copy persuasiva'],
        weaknesses: ['Poderia ter mais prova social'],
        improvements: ['Adicionar depoimentos', 'Incluir garantia'],
        score: 75
      }
    }
  }

  return {
    analyzeKeywordWithAI,
    generateOfferVariationsWithAI,
    analyzeCompetitorAd,
    isAnalyzing
  }
}