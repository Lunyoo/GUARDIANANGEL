import { Router } from 'express'
import OpenAI from 'openai'
import { superIntelligentSystem } from '../services/ml/superIntelligentSystem'
import { thompsonSampling } from '../services/ml/thomsonSampling'
import { universalBandits } from '../services/bot/universalBandits'
import { neuralOrchestrator } from '../services/ml/neuralOrchestrator'
import { visionAnalyzer } from '../services/ai/visionAnalyzer'
import { refreshKnowledgeFromDB, registerIdeaOutcome } from '../services/ml/campaignKnowledge'
import { logger } from '../utils/logger'
import ImageSelectorService from '../services/ai/imageSelector'

const router = Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const imageSelector = new ImageSelectorService()

// GET /api/ai/images/select/:productId - Select best image for conversation context
router.get('/images/select/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    const { 
      conversationContext = '', 
      customerMessage = '',
      intent = 'general',
      maxImages = 1
    } = req.query

    const context = {
      intent: intent as any,
      keywords: req.query.keywords ? String(req.query.keywords).split(',') : undefined,
      customerProfile: req.query.customerProfile as any,
      preferredStyle: req.query.preferredStyle as any,
      emotion: req.query.emotion as any,
      stage: req.query.stage as any
    }

    let selectedImages
    
    if (conversationContext || customerMessage) {
      // Use AI to analyze conversation and recommend
      const recommendation = await imageSelector.recommendImageForBot(
        productId, 
        String(conversationContext), 
        String(customerMessage)
      )
      selectedImages = recommendation ? [recommendation] : []
    } else {
      // Use manual context
      selectedImages = imageSelector.selectBestImages(productId, context, Number(maxImages))
    }

    res.json({
      success: true,
      productId,
      context,
      images: selectedImages,
      total: selectedImages.length
    })

  } catch (error: any) {
    console.error('Image selection error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to select images'
    })
  }
})

// GET /api/ai/images/stats/:productId - Get image statistics for product
router.get('/images/stats/:productId', (req, res) => {
  try {
    const { productId } = req.params
    const stats = imageSelector.getImageStats(productId)
    
    res.json({
      success: true,
      productId,
      stats
    })
  } catch (error: any) {
    console.error('Image stats error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get image stats'
    })
  }
})

// GET /api/ai/images/list/:productId - List all analyzed images for product
router.get('/images/list/:productId', (req, res) => {
  try {
    const { productId } = req.params
    const images = imageSelector.getProductImages(productId)
    
    res.json({
      success: true,
      productId,
      images,
      total: images.length
    })
  } catch (error: any) {
    console.error('Image list error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list images'
    })
  }
})

router.post('/chat', async (req, res) => {
	try {
		const { message, sessionId, context = {}, images = [] } = req.body
		if (!message && images.length === 0) return res.status(400).json({ error: 'Mensagem ou imagem necessária' })
		let imageAnalysis: any = null
		if (images.length > 0) imageAnalysis = await visionAnalyzer.analyzeImages(images)
		const mlInsights = await gatherMLInsights(context)
		const aiContext = await buildIntelligentContext({ message, context, imageAnalysis, mlInsights, sessionId })
		const aiResponse = await generateIntelligentResponse(aiContext)
		await learnFromInteraction({ message, response: aiResponse, context: aiContext, sessionId })
		res.json({ response: aiResponse.content, insights: aiResponse.insights, mlRecommendations: aiResponse.mlRecommendations, confidence: aiResponse.confidence, sessionId, timestamp: new Date().toISOString() })
	} catch (error) {
		logger.error('AI Chat error:', error)
		res.status(500).json({ error: 'Falha na resposta da IA', fallback: 'Desculpe, estou processando muitas informações. Tente novamente em alguns segundos.' })
	}
})

router.post('/analyze-campaign-idea', async (req, res) => {
	try {
		const { idea, budget, audience, objectives, images = [] } = req.body
		const mlAnalysis = await analyzeCampaignWithML({ idea, budget: parseFloat(budget) || 100, audience, objectives })
		let creativeAnalysis: any = null
		if (images.length > 0) creativeAnalysis = await visionAnalyzer.analyzeCampaignCreatives(images)
		const recommendations = await generateCampaignRecommendations({ mlAnalysis, creativeAnalysis, idea, budget, audience, objectives })
		const confidenceSources = [ mlAnalysis.mlPredictions?.thompson && 0.25, mlAnalysis.mlPredictions?.bandits && 0.25, mlAnalysis.mlPredictions?.super && 0.25, creativeAnalysis && 0.25 ].filter(Boolean) as number[]
		const confidence = confidenceSources.reduce((a,b)=>a+b,0) || 0.3
		const expectedROI = mlAnalysis.mlPredictions?.super?.expectedResults?.expectedROI || mlAnalysis.mlPredictions?.thompson?.expectedROI || 0
		const riskAssessment = confidence > 0.7 ? 'low' : confidence > 0.5 ? 'medium' : 'high'
		res.json({ analysis: mlAnalysis, creative: creativeAnalysis, recommendations, confidence, expectedROI, riskAssessment, timestamp: new Date().toISOString() })
	} catch (error) {
		logger.error('Campaign analysis error:', error)
		res.status(500).json({ error: 'Falha na análise da campanha' })
	}
})

router.post('/optimize-campaign', async (req, res) => {
	try {
		const { campaignData, performance } = req.body
		const optimization = await superIntelligentSystem.optimizeCampaign({
			campaignId: campaignData.id || 'unknown',
			currentMetrics: { impressions: performance.impressions || 0, clicks: performance.clicks || 0, conversions: performance.conversions || 0, spend: performance.spend || 0 },
			targetAudience: campaignData.audience || 'general',
			objective: campaignData.objective || 'conversions'
		})
		const insights = await generateOptimizationInsights(optimization)
		const confidence = (insights as any).confidence || 0.6
		res.json({ optimization, insights, actionPlan: optimization.optimizations || [], expectedImprovement: optimization.estimatedImpact || {}, confidence, timestamp: new Date().toISOString() })
	} catch (error) {
		logger.error('Campaign optimization error:', error)
		res.status(500).json({ error: 'Falha na otimização da campanha' })
	}
})

// Quick system decision preview (no context)
router.get('/system/decision', async (_req, res) => {
	try {
		const decision = await superIntelligentSystem.makeSuperIntelligentDecision({})
		res.json({ ok:true, decision, action: decision.finalAction?.type })
	} catch (e:any){
		res.status(500).json({ ok:false, error: e?.message || 'decision_failed' })
	}
})

router.get('/context/:sessionId', async (req,res)=>{ try { const { sessionId } = req.params; const context = await getSessionContext(sessionId); res.json({ context, sessionId }) } catch (error) { logger.error('Context retrieval error:', error); res.status(500).json({ error: 'Falha ao recuperar contexto' }) } })

async function gatherMLInsights(_context:any){ try { const thompsonInsights = thompsonSampling.getInsights(); const banditPerformance = universalBandits.getTopPerformers(10); const neuralMetrics = await neuralOrchestrator.getSystemMetrics(); const superSystemState = superIntelligentSystem.getSystemMetrics(); return { thompson: thompsonInsights, bandits: banditPerformance, neural: neuralMetrics, superSystem: superSystemState, timestamp: new Date().toISOString() } } catch (error) { logger.warn('ML insights gathering failed:', error); return { status:'limited', reason:'partial_data' } } }
async function buildIntelligentContext(params:any){ const { context, imageAnalysis, mlInsights } = params; return { conversationHistory: [], userProfile: context.userProfile || { type:'marketer', experience:'intermediate' }, mlInsights, marketData:{ imageAnalysis, currentTrends: await getCurrentMarketTrends(), competitorData: await getCompetitorInsights() } } }
async function generateIntelligentResponse(aiContext:any){ const systemPrompt = `Você é o Guardian Angel AI...\nCONTEXTO ML ATUAL:\n${JSON.stringify(aiContext.mlInsights, null, 2)}`; try { const completion = await openai.chat.completions.create({ model:'gpt-4', messages:[ { role:'system', content: systemPrompt }, { role:'user', content: `Contexto: ${JSON.stringify(aiContext, null, 2)}` } ], temperature:0.7, max_tokens:800 }); const content = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.'; return { content, insights: extractInsights(content), mlRecommendations: generateMLRecommendations(aiContext.mlInsights), confidence: calculateResponseConfidence(aiContext) } } catch (error) { logger.error('OpenAI API error:', error); throw new Error('Falha na geração de resposta') } }
async function analyzeCampaignWithML(params:any){ const { idea, budget, audience, objectives } = params; const knowledge = await refreshKnowledgeFromDB(150); const thompsonPrediction = thompsonSampling.predictCampaignPerformance({ budget, audience: audience?.demographic || 'general', objective: objectives?.[0] || 'conversions' }); const banditAnalysis = universalBandits.analyzeCampaignPotential({ budget, targetAudience: audience?.demographic || 'general', objective: objectives?.[0] || 'conversions' }); const superAnalysis = await superIntelligentSystem.analyzeCampaignIdea({ description: idea, budget, targetAudience: audience?.demographic || 'general', objective: objectives?.[0] || 'conversions' }); const result = { strategy: superAnalysis.recommendations?.[0] || 'Estratégia baseada em ML', audience:{ optimized:true, targeting: audience }, creative:{ recommendations: superAnalysis.recommendations || [] }, budget:{ optimized: budget, recommendations: superAnalysis.suggestedAdjustments || [] }, mlPredictions:{ thompson: thompsonPrediction, bandits: banditAnalysis, super: superAnalysis }, confidence: superAnalysis.expectedResults.confidence, knowledge:{ avgCPA: knowledge.aggregates.avgCPA, avgROAS: knowledge.aggregates.avgROAS, topAudiences: knowledge.aggregates.topAudiences, objectives: knowledge.aggregates.objectives } }; try { registerIdeaOutcome({ idea, objective: objectives?.[0], audience: audience?.demographic, predicted: thompsonPrediction }) } catch {}; return result }
function extractInsights(content:string){ const insights:string[] = []; if (content.includes('ROI')||content.includes('retorno')) insights.push('roi_mentioned'); if (content.includes('A/B')||content.includes('teste')) insights.push('testing_recommended'); if (content.includes('audiência')||content.includes('público')) insights.push('audience_optimization'); return insights }
function generateMLRecommendations(mlInsights:any){ const recommendations:string[] = []; if (mlInsights?.bandits?.length>0){ const topBandit = mlInsights.bandits[0]; recommendations.push(`Estratégia "${topBandit.name}" está performando melhor (${topBandit.score.toFixed(3)} score)`) } if (mlInsights?.thompson?.bestPerforming){ recommendations.push(`Thompson Sampling recomenda foco em ${mlInsights.thompson.bestPerforming.category}`) } return recommendations }
function calculateResponseConfidence(aiContext:any){ let confidence=0.5; if (aiContext.mlInsights?.thompson) confidence+=0.2; if (aiContext.mlInsights?.bandits?.length>0) confidence+=0.2; if (aiContext.mlInsights?.neural) confidence+=0.1; return Math.min(confidence,0.95) }
async function getCurrentMarketTrends(){ return { items:[], lastUpdated:new Date().toISOString() } }
async function getCompetitorInsights(){ return { competitors:[], lastUpdated:new Date().toISOString() } }
async function generateCampaignRecommendations(params:any){ const recs:any[]=[]; try { const ml = params.mlAnalysis?.mlPredictions; if (ml?.thompson?.bestPerforming) recs.push({ type:'focus_arm', detail: ml.thompson.bestPerforming.category }); if (ml?.super?.suggestedAdjustments?.length) for (const adj of ml.super.suggestedAdjustments) recs.push({ type:'adjustment', detail: adj }); if (params.creativeAnalysis?.issues?.length) recs.push({ type:'creative_issues', count: params.creativeAnalysis.issues.length }) } catch {}; return { recommendations: recs, confidence: Math.min(0.95, 0.4 + recs.length*0.1) } }
async function generateOptimizationInsights(optimization:any){ const insights:any[]=[]; try { if (optimization.estimatedImpact?.expectedROASIncrease) insights.push({ type:'roas', expectedIncrease: optimization.estimatedImpact.expectedROASIncrease }); if (Array.isArray(optimization.optimizations)) for (const opt of optimization.optimizations) if (opt?.type) insights.push({ type:'action', action: opt.type }) } catch {}; return { insights, confidence: optimization.confidence || 0.6 } }
async function getSessionContext(sessionId:string){ return { sessionId, context:null } }
async function learnFromInteraction(params:any){ logger.info('IA_INTERACTION', { session: params.sessionId, ts: Date.now(), messageLen: params.message?.length }) }

export default router
