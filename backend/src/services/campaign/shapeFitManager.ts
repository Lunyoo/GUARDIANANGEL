// 🧠 SISTEMA INTEGRADO DE ML E CAMPANHAS DA SHAPEFIT
import { PrismaClient } from '@prisma/client'
import { addDecision } from '../ml/mlDecisionLogger'
import { AdminReportingSystem } from '../bot/adminSystem.js'

const prisma = new PrismaClient()

interface ShapeFitCampaign {
  id: string
  name: string
  budget: number
  roas: number
  conversionRate: number
  active: boolean
  productId: string
  lastOptimized: Date
}

interface MLInsight {
  type: 'prompt_improvement' | 'budget_adjustment' | 'audience_optimization'
  confidence: number
  recommendation: string
  data: any
  requiresApproval: boolean
}

/**
 * 🎯 MANAGER CENTRAL DA SHAPEFIT
 * Conecta ML + Campanhas + Permissões + Notificações
 */
class ShapeFitCampaignManager {
  private campaigns: Map<string, ShapeFitCampaign> = new Map()
  private mlInsights: MLInsight[] = []
  
  constructor() {
    this.initializeCampaigns()
    this.startMLAnalysis()
  }
  
  /**
   * 🚀 Inicializar campanhas da ShapeFit
   */
  private async initializeCampaigns() {
    // Campanhas padrão da ShapeFit
    const shapefitCampaigns: ShapeFitCampaign[] = [
      {
        id: 'shapefit-main',
        name: 'ShapeFit - Calcinha Modeladora Principal',
        budget: 300,
        roas: 2.5,
        conversionRate: 8.5,
        active: true,
        productId: 'calcinha-modeladora-premium',
        lastOptimized: new Date()
      },
      {
        id: 'shapefit-video1',
        name: 'ShapeFit - Vídeo Depoimento Cliente',
        budget: 150,
        roas: 3.2,
        conversionRate: 12.1,
        active: true,
        productId: 'calcinha-modeladora-premium',
        lastOptimized: new Date()
      },
      {
        id: 'shapefit-video2',
        name: 'ShapeFit - Vídeo Demonstração',
        budget: 200,
        roas: 2.8,
        conversionRate: 9.7,
        active: true,
        productId: 'calcinha-modeladora-premium',
        lastOptimized: new Date()
      }
    ]
    
    shapefitCampaigns.forEach(campaign => {
      this.campaigns.set(campaign.id, campaign)
    })
    
    console.log(`🎯 ShapeFit Campaign Manager iniciado com ${this.campaigns.size} campanhas`)
  }
  
  /**
   * 🤖 Análise ML contínua baseada em conversas reais
   */
  private startMLAnalysis() {
    // Análise a cada 30 minutos
    setInterval(() => {
      this.analyzeConversations()
      this.generateOptimizationRecommendations()
    }, 30 * 60 * 1000)
    
    // Primeira análise em 5 minutos
    setTimeout(() => {
      this.analyzeConversations()
      this.generateOptimizationRecommendations()
    }, 5 * 60 * 1000)
  }
  
  /**
   * 📊 Analisar conversas para insights de ML
   */
  private async analyzeConversations() {
    try {
      console.log('🔍 Analisando conversas para insights de ML...')
      
      // Buscar leads recentes (últimas 24h)
      const recentLeads = await prisma.lead.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })
      
      console.log(`📋 Analisando ${recentLeads.length} leads das últimas 24h`)
      
      if (recentLeads.length === 0) {
        console.log('⚠️ Nenhum lead recente para análise')
        return
      }
      
      // Análise de padrões de conversão
      const conversionPatterns = this.analyzeConversionPatterns(recentLeads)
      
      // Análise de objeções comuns
      const objectionPatterns = this.analyzeObjectionPatterns(recentLeads)
      
      // Análise de tempo de resposta
      const responseTimePatterns = this.analyzeResponseTimes(recentLeads)
      
      // Gerar insights baseados nas análises
      this.generateMLInsights(conversionPatterns, objectionPatterns, responseTimePatterns)
      
    } catch (error) {
      console.error('❌ Erro na análise de conversas:', error)
    }
  }
  
  /**
   * 🎯 Analisar padrões de conversão
   */
  private analyzeConversionPatterns(leads: any[]): any {
    const converted = leads.filter(lead => lead.status === 'CONFIRMED')
    const conversionRate = converted.length / leads.length
    
    // Analisar cidades com maior conversão
    const cityConversions = new Map<string, number>()
    converted.forEach(lead => {
      if (lead.city) {
        cityConversions.set(lead.city, (cityConversions.get(lead.city) || 0) + 1)
      }
    })
    
    // Analisar horários de maior conversão
    const hourConversions = new Map<number, number>()
    converted.forEach(lead => {
      const hour = new Date(lead.createdAt).getHours()
      hourConversions.set(hour, (hourConversions.get(hour) || 0) + 1)
    })
    
    return {
      conversionRate,
      topCities: Array.from(cityConversions.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topHours: Array.from(hourConversions.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      totalConverted: converted.length,
      totalLeads: leads.length
    }
  }
  
  /**
   * 💬 Analisar objeções comuns
   */
  private analyzeObjectionPatterns(leads: any[]): any {
    const objectionKeywords = [
      'caro', 'preço', 'muito', 'barato', 'desconto',
      'não sei', 'preciso pensar', 'depois', 'talvez',
      'não confio', 'dúvida', 'funciona mesmo', 'resultado',
      'entrega', 'demora', 'prazo', 'rapidamente'
    ]
    
    const objectionCounts = new Map<string, number>()
    
    leads.forEach(lead => {
      lead.messages?.forEach((message: any) => {
        if (message.direction === 'inbound') {
          const content = message.content.toLowerCase()
          objectionKeywords.forEach(keyword => {
            if (content.includes(keyword)) {
              objectionCounts.set(keyword, (objectionCounts.get(keyword) || 0) + 1)
            }
          })
        }
      })
    })
    
    return {
      topObjections: Array.from(objectionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      totalObjections: Array.from(objectionCounts.values()).reduce((sum, count) => sum + count, 0)
    }
  }
  
  /**
   * ⏱️ Analisar tempos de resposta
   */
  private analyzeResponseTimes(leads: any[]): any {
    const responseTimes: number[] = []
    
    leads.forEach(lead => {
      const messages = lead.messages || []
      for (let i = 1; i < messages.length; i++) {
        const prevMessage = messages[i - 1]
        const currentMessage = messages[i]
        
        if (prevMessage.direction === 'inbound' && currentMessage.direction === 'outbound') {
          const responseTime = new Date(currentMessage.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()
          responseTimes.push(responseTime)
        }
      }
    })
    
    if (responseTimes.length === 0) return { averageResponseTime: 0, fastResponses: 0 }
    
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    const fastResponses = responseTimes.filter(time => time < 30000).length // < 30s
    
    return {
      averageResponseTime: Math.round(averageResponseTime / 1000), // em segundos
      fastResponses,
      totalResponses: responseTimes.length,
      fastResponseRate: (fastResponses / responseTimes.length) * 100
    }
  }
  
  /**
   * 💡 Gerar insights de ML baseados nas análises
   */
  private generateMLInsights(conversionPatterns: any, objectionPatterns: any, responseTimePatterns: any) {
    console.log('💡 Gerando insights de ML...')
    
    // Insight 1: Otimização de prompt baseada em objeções
    if (objectionPatterns.topObjections.length > 0) {
      const topObjection = objectionPatterns.topObjections[0]
      this.mlInsights.push({
        type: 'prompt_improvement',
        confidence: 0.85,
        recommendation: `Melhorar prompt para tratar objeção "${topObjection[0]}" (${topObjection[1]} ocorrências)`,
        data: {
          objection: topObjection[0],
          count: topObjection[1],
          suggestedPromptAddition: this.generatePromptImprovement(topObjection[0])
        },
        requiresApproval: true
      })
    }
    
    // Insight 2: Ajuste de budget baseado em performance
    if (conversionPatterns.conversionRate > 0.15) { // > 15% conversão
      this.mlInsights.push({
        type: 'budget_adjustment',
        confidence: 0.9,
        recommendation: `Aumentar budget em 30% devido à alta conversão (${(conversionPatterns.conversionRate * 100).toFixed(1)}%)`,
        data: {
          currentConversionRate: conversionPatterns.conversionRate,
          recommendedBudgetIncrease: 0.3,
          reasoning: 'Alta performance de conversão detectada'
        },
        requiresApproval: true
      })
    } else if (conversionPatterns.conversionRate < 0.05) { // < 5% conversão
      this.mlInsights.push({
        type: 'budget_adjustment',
        confidence: 0.8,
        recommendation: `Reduzir budget em 20% devido à baixa conversão (${(conversionPatterns.conversionRate * 100).toFixed(1)}%)`,
        data: {
          currentConversionRate: conversionPatterns.conversionRate,
          recommendedBudgetDecrease: 0.2,
          reasoning: 'Performance de conversão abaixo do esperado'
        },
        requiresApproval: true
      })
    }
    
    // Insight 3: Otimização de audiência baseada em cidades
    if (conversionPatterns.topCities.length > 0) {
      this.mlInsights.push({
        type: 'audience_optimization',
        confidence: 0.75,
        recommendation: `Focar audiência nas cidades com melhor conversão: ${conversionPatterns.topCities.map((c: any) => c[0]).join(', ')}`,
        data: {
          topCities: conversionPatterns.topCities,
          suggestedAction: 'Aumentar budget para essas regiões'
        },
        requiresApproval: true
      })
    }
    
    this.processMLInsights()
  }
  
  /**
   * 📝 Gerar melhoria de prompt baseada na objeção
   */
  private generatePromptImprovement(objection: string): string {
    const improvements: { [key: string]: string } = {
      'caro': 'Enfatize o valor: "Por menos de R$ 3 por dia você tem resultado instantâneo"',
      'preço': 'Compare com outras soluções: "Muito mais barato que cirurgia ou academia"',
      'não sei': 'Ofereça garantia: "Garantia total - se não gostar, devolvemos seu dinheiro"',
      'pensar': 'Crie urgência suave: "Promoção válida só hoje, depois volta ao preço normal"',
      'funciona': 'Use prova social: "Mais de 10.000 mulheres já aprovaram o resultado"',
      'entrega': 'Tranquilize sobre prazo: "Entrega super rápida por motoboy no mesmo dia"'
    }
    
    return improvements[objection] || `Tratar objeção "${objection}" com mais empatia e detalhes`
  }
  
  /**
   * ⚡ Processar insights de ML e criar aprovações
   */
  private async processMLInsights() {
    if (this.mlInsights.length === 0) {
      console.log('📊 Nenhum insight novo gerado')
      return
    }
    
    console.log(`📊 Processando ${this.mlInsights.length} insights de ML`)
    
    for (const insight of this.mlInsights) {
      await this.createApprovalRequest(insight)
    }
    
    // Notificar admin sobre novos insights
    await this.notifyAdminAboutInsights()
    
    // Limpar insights processados
    this.mlInsights = []
  }
  
  /**
   * 📋 Criar solicitação de aprovação
   */
  private async createApprovalRequest(insight: MLInsight) {
    try {
      // Registrar decisão no sistema ML
      await addDecision({
        timestamp: new Date().toISOString(),
        customerId: 'ML_SYSTEM',
        conversationId: `ml_insight_${Date.now()}`,
        modelUsed: 'shapefit_analyzer',
        strategy: {
          type: insight.type,
          recommendation: insight.recommendation,
          confidence: insight.confidence,
          data: insight.data,
          requiresApproval: insight.requiresApproval
        },
        confidence: insight.confidence,
        factors: ['ml_analysis', 'conversation_patterns', insight.type],
        responseLength: insight.recommendation.length,
        messageCount: 1,
        result: { 
          responded: true,
          progressed: insight.requiresApproval,
          converted: false
        }
      })
      
      console.log(`📋 Aprovação criada para insight: ${insight.type}`)
      
    } catch (error) {
      console.error('❌ Erro ao criar aprovação:', error)
    }
  }
  
  /**
   * 🔔 Notificar admin sobre novos insights
   */
  private async notifyAdminAboutInsights() {
    const adminPhone = process.env.ADMIN_PHONE
    if (!adminPhone || this.mlInsights.length === 0) return
    
    try {
      let message = `🧠 INSIGHTS ML SHAPEFIT!\n\n`
      message += `📊 ${this.mlInsights.length} recomendações analisadas:\n\n`
      
      this.mlInsights.forEach((insight, index) => {
        message += `${index + 1}. ${insight.type.toUpperCase()}\n`
        message += `   ${insight.recommendation}\n`
        message += `   Confiança: ${(insight.confidence * 100).toFixed(1)}%\n\n`
      })
      
      message += `💡 Digite "decisões pendentes" para ver detalhes\n`
      message += `✅ Digite "aprovar todas" para aplicar`
      
      const { sendWhatsAppMessage } = await import('../bot/whatsappClient.fixed')
      await sendWhatsAppMessage(adminPhone, message)
      
      console.log(`🔔 Admin notificado sobre ${this.mlInsights.length} insights`)
      
    } catch (error) {
      console.error('❌ Erro ao notificar admin:', error)
    }
  }
  
  /**
   * 🎯 Gerar recomendações de otimização
   */
  private async generateOptimizationRecommendations() {
    console.log('🎯 Gerando recomendações de otimização...')
    
    // Verificar performance das campanhas
    for (const [campaignId, campaign] of this.campaigns) {
      if (campaign.roas < 2.0 && campaign.active) {
        console.log(`⚠️ Campanha ${campaign.name} com ROAS baixo: ${campaign.roas}`)
        
        // Sugerir redução de budget ou pausa
        this.mlInsights.push({
          type: 'budget_adjustment',
          confidence: 0.8,
          recommendation: `Pausar ou reduzir budget da campanha "${campaign.name}" (ROAS: ${campaign.roas})`,
          data: {
            campaignId,
            currentROAS: campaign.roas,
            currentBudget: campaign.budget,
            suggestedAction: campaign.roas < 1.5 ? 'pause' : 'reduce_budget'
          },
          requiresApproval: true
        })
      }
      
      if (campaign.roas > 4.0 && campaign.active) {
        console.log(`🚀 Campanha ${campaign.name} com ROAS alto: ${campaign.roas}`)
        
        // Sugerir aumento de budget
        this.mlInsights.push({
          type: 'budget_adjustment',
          confidence: 0.9,
          recommendation: `Aumentar budget da campanha "${campaign.name}" (ROAS: ${campaign.roas})`,
          data: {
            campaignId,
            currentROAS: campaign.roas,
            currentBudget: campaign.budget,
            suggestedIncrease: 0.5, // 50% de aumento
            suggestedAction: 'increase_budget'
          },
          requiresApproval: true
        })
      }
    }
  }
  
  /**
   * 📊 Registrar venda e atualizar ML
   */
  async recordSale(saleData: any) {
    console.log('💰 Registrando venda no sistema ML da ShapeFit...')
    
    try {
      // Registrar no sistema de reporting
      await AdminReportingSystem.recordSale(saleData)
      
      // Atualizar métricas das campanhas (simulado)
      this.updateCampaignMetrics(saleData)
      
      // Registrar decisão de conversão para ML
      await addDecision({
        timestamp: new Date().toISOString(),
        customerId: saleData.phone,
        conversationId: `sale_${Date.now()}`,
        modelUsed: 'shapefit_sales',
        strategy: {
          type: 'conversion',
          amount: saleData.amount,
          product: saleData.product,
          city: saleData.city,
          paymentMethod: saleData.paymentMethod
        },
        confidence: 1.0,
        factors: ['sale_completed', 'successful_conversion'],
        responseLength: 0,
        messageCount: 1,
        result: { 
          responded: true,
          progressed: true,
          converted: true,
          revenue: saleData.amount
        }
      })
      
      console.log(`✅ Venda registrada no ML: R$ ${saleData.amount}`)
      
    } catch (error) {
      console.error('❌ Erro ao registrar venda no ML:', error)
    }
  }
  
  /**
   * 📈 Atualizar métricas das campanhas
   */
  private updateCampaignMetrics(saleData: any) {
    // Simular atualização de métricas (em produção, viria dos dados reais)
    const campaignId = 'shapefit-main' // Assumir campanha principal
    const campaign = this.campaigns.get(campaignId)
    
    if (campaign) {
      // Simular melhoria nas métricas
      campaign.conversionRate += 0.1
      campaign.roas = Math.min(campaign.roas + 0.1, 5.0)
      
      console.log(`📈 Métricas atualizadas para ${campaign.name}: ROAS ${campaign.roas}, CR ${campaign.conversionRate}%`)
    }
  }
  
  /**
   * 📊 Obter status das campanhas
   */
  getCampaignStatus() {
    return Array.from(this.campaigns.values())
  }
  
  /**
   * 🔍 Obter insights pendentes
   */
  getPendingInsights() {
    return this.mlInsights
  }
}

// Instância global
export const shapeFitManager = new ShapeFitCampaignManager()

// Exportar para uso nos outros sistemas
export { ShapeFitCampaignManager }
