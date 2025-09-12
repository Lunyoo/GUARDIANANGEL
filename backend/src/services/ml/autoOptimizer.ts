import { budgetAllocator } from './budgetAllocator.js'
import { universalBandits } from '../bot/universalBandits.js'
import { AdminReportingSystem } from '../bot/adminSystem.js'
import { sendWhatsAppMessage } from '../bot/whatsappClient'
import { approvalSystem } from './approvalSystem.js'

// Interface local para métricas de campanha
interface CampaignMetrics {
  campaignId: string
  name: string
  ctr: number
  cpm: number  
  cpc: number
  costPerLead: number
  roas: number
  totalSpent: number
  totalLeads: number
  totalSales: number
  conversions: number
  budget: number
  isActive: boolean
  dailyBudget: number
  lastUpdated: Date
}

/**
 * 🚀 AUTO-OTIMIZADOR COMPLETO 
 * Sistema que se otimiza sozinho 24/7
 */
export class AutoOptimizer {
  private static _instance: AutoOptimizer
  static getInstance() {
    if (!this._instance) this._instance = new AutoOptimizer()
    return this._instance
  }
  
  private isRunning = false
  private optimizationInterval: NodeJS.Timeout | null = null
  private lastOptimization = 0
  private optimizationHistory: Array<{
    timestamp: number
    type: string
    action: string
    result: string
    impact: number
  }> = []
  
  private readonly ADMIN_PHONE = '554199509644'
  private enableNotifications = true // � Notificações ATIVAS por padrão para aprovações
  
  /**
   * 🎯 Inicia o auto-otimizador
   */
  start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('🚀 AUTO-OTIMIZADOR INICIADO!')
    
    // Otimização a cada 15 minutos
    this.optimizationInterval = setInterval(() => {
      this.runOptimizationCycle()
    }, 15 * 60 * 1000)
    
    // Primeira otimização imediata
    setTimeout(() => this.runOptimizationCycle(), 5000)
  }
  
  /**
   * ⏹️ Para o auto-otimizador
   */
  stop() {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
      this.optimizationInterval = null
    }
    this.isRunning = false
    console.log('⏹️ AUTO-OTIMIZADOR PARADO!')
  }
  
  /**
   * 🔔 Ativa/desativa notificações do auto-otimizador
   */
  setNotifications(enabled: boolean) {
    this.enableNotifications = enabled
    console.log(`🔔 Notificações do auto-otimizador: ${enabled ? 'ATIVADAS' : 'DESATIVADAS'}`)
  }

  /**
   * 🔄 Executa ciclo completo de otimização
   */
  private async runOptimizationCycle() {
    try {
      console.log('🔄 Iniciando ciclo de otimização...')
      
      const results = await Promise.all([
        this.optimizeCampaignBudgets(),
        this.optimizeBanditsStrategies(),
        this.pauseUnderperformingCampaigns(),
        this.scaleTopPerformers()
      ])
      
      const totalOptimizations = results.reduce((sum, count) => sum + count, 0)
      
      // Relatório para admin (só se notificações estiverem ativas)
      if (totalOptimizations > 0 && this.enableNotifications) {
        await this.sendOptimizationReport(totalOptimizations)
      }
      
      this.lastOptimization = Date.now()
      console.log(`✅ Ciclo concluído: ${totalOptimizations} otimizações`)
      
    } catch (error) {
      console.error('❌ Erro no ciclo de otimização:', error)
      await sendWhatsAppMessage(this.ADMIN_PHONE, `❌ ERRO no auto-otimizador: ${error}`)
    }
  }

  /**
   * 💰 Otimiza budgets baseado em ROAS
   */
  private async optimizeCampaignBudgets(): Promise<number> {
    try {
      const campaigns = await this.getCampaignMetrics()
      if (!campaigns.length) return 0

      let budgetAdjustments = 0

      // Separar por performance
      const highPerformers = campaigns.filter(c => c.roas > 3.0 && c.totalSpent > 100)
      const underPerformers = campaigns.filter(c => c.roas < 1.5 && c.totalSpent > 50)

      // Aumentar budget das boas
      for (const campaign of highPerformers) {
        const currentBudget = campaign.budget || 100
        const newBudget = Math.min(currentBudget * 1.2, 1000) // Max 20% increase
        
        if (newBudget > currentBudget) {
          // Criar aprovação ao invés de executar diretamente
          await approvalSystem.createApproval(
            'budget_increase',
            `Aumentar budget da campanha ${campaign.name}`,
            {
              campaignId: campaign.campaignId,
              campaignName: campaign.name,
              currentBudget,
              newBudget,
              roas: campaign.roas
            },
            `ROAS alto (${campaign.roas.toFixed(2)}) justifica aumento de budget`
          )
          budgetAdjustments++
        }
      }
      
      // Diminuir budget das ruins
      for (const campaign of underPerformers) {
        const currentBudget = campaign.budget || 100
        const newBudget = Math.max(currentBudget * 0.8, 50) // Max 20% decrease, min R$50
        
        if (newBudget < currentBudget) {
          // Criar aprovação ao invés de executar diretamente
          await approvalSystem.createApproval(
            'budget_decrease',
            `Diminuir budget da campanha ${campaign.name}`,
            {
              campaignId: campaign.campaignId,
              campaignName: campaign.name,
              currentBudget,
              newBudget,
              roas: campaign.roas
            },
            `ROAS baixo (${campaign.roas.toFixed(2)}) justifica redução de budget`
          )
          budgetAdjustments++
        }
      }

      return budgetAdjustments
    } catch (error) {
      console.error('❌ Erro otimizando budgets:', error)
      return 0
    }
  }

  /**
   * 🎰 Otimiza estratégias dos bandits
   */
  private async optimizeBanditsStrategies(): Promise<number> {
    try {
      let optimizations = 0

      // Resetar braços ruins
      const badArms = universalBandits.getTopPerformers(65).slice(-5) // 5 piores
      for (const arm of badArms) {
        if (arm.conversionRate < 0.001) {
          universalBandits.resetArm(arm.id)
          optimizations++
        }
      }

      // Otimizar por estatísticas de pricing
      const stats = universalBandits.getStatsByCategory('pricing')
      if (stats.length > 5) {
        await approvalSystem.createApproval(
          'pricing_optimization',
          'Ajustar estratégia de preços',
          {
            topPerformers: stats.slice(0, 3).map(s => s.variant),
            avgConversionRate: stats.reduce((acc, s) => acc + s.conversionRate, 0) / stats.length
          },
          'Análise de performance de preços sugere ajustes'
        )
        optimizations++
      }
      
      // Detectar categorias com alta variação e otimizar
      const categories = ['pricing', 'approach', 'timing', 'media', 'closing'] as const
      let categoriesOptimized = 0
      
      for (const category of categories) {
        const categoryStats = universalBandits.getStatsByCategory(category)
        
        if (categoryStats.length > 0) {
          const avgConversion = categoryStats.reduce((sum, s) => sum + s.conversionRate, 0) / categoryStats.length
          
          // Se performance média baixa, forçar exploração
          if (avgConversion < 0.03) {
            universalBandits.increaseExploration(category, 0.2)
            categoriesOptimized++
            
            this.logOptimization('exploration_boost',
              `Aumentou exploração na categoria ${category}`,
              `CR média: ${(avgConversion * 100).toFixed(2)}%`,
              0.15
            )
          }
        }
      }

      return optimizations + categoriesOptimized
    } catch (error) {
      console.error('❌ Erro otimizando bandits:', error)
      return 0
    }
  }

  /**
   * ⏸️ Pausa campanhas com performance ruim
   */
  private async pauseUnderperformingCampaigns(): Promise<number> {
    try {
      const campaigns = await this.getCampaignMetrics()
      let pausedCount = 0

      for (const campaign of campaigns) {
        const shouldPause = 
          // Gastou muito e não converteu
          (campaign.totalSpent > 200 && campaign.conversions === 0) ||
          // Taxa de conversão muito baixa
          (campaign.totalLeads > 100 && (campaign.conversions / campaign.totalLeads) < 0.01)

        if (shouldPause && campaign.isActive) {
          await approvalSystem.createApproval(
            'campaign_pause',
            `Pausar campanha ${campaign.name}`,
            {
              campaignId: campaign.campaignId,
              campaignName: campaign.name,
              totalSpent: campaign.totalSpent,
              conversions: campaign.conversions,
              conversionRate: campaign.conversions / campaign.totalLeads
            },
            'Performance baixa justifica pausa para análise'
          )
          pausedCount++
        }
      }

      return pausedCount
    } catch (error) {
      console.error('❌ Erro pausando campanhas:', error)
      return 0
    }
  }

  /**
   * 📈 Escala as melhores campanhas
   */
  private async scaleTopPerformers(): Promise<number> {
    try {
      const campaigns = await this.getCampaignMetrics()
      let scaledCount = 0

      const topPerformers = campaigns
        .filter(c => 
          c.roas > 4.0 &&
          c.totalSpent > 500 &&
          (c.conversions / c.totalLeads) > 0.05 &&
          c.isActive
        )
        .sort((a, b) => b.roas - a.roas)
        .slice(0, 3) // Top 3

      for (const campaign of topPerformers) {
        await approvalSystem.createApproval(
          'campaign_scale',
          `Escalar campanha ${campaign.name}`,
          {
            campaignId: campaign.campaignId,
            campaignName: campaign.name,
            currentBudget: campaign.budget,
            proposedBudget: campaign.budget * 1.5,
            roas: campaign.roas,
            conversionRate: (campaign.conversions / campaign.totalLeads) * 100
          },
          `ROAS: ${campaign.roas.toFixed(2)}, CR: ${((campaign.conversions / campaign.totalLeads) * 100).toFixed(1)}%`
        )
        scaledCount++
      }

      return scaledCount
    } catch (error) {
      console.error('❌ Erro escalando campanhas:', error)
      return 0
    }
  }

  /**
   * 📊 Obtém métricas das campanhas
   */
  private async getCampaignMetrics(): Promise<CampaignMetrics[]> {
    // Mock data - aqui você conectaria com Facebook API
    return [
      {
        campaignId: 'camp_001',
        name: 'Campanha Principal',
        ctr: 2.5,
        cpm: 15.30,
        cpc: 0.85,
        costPerLead: 12.50,
        roas: 3.2,
        totalSpent: 450,
        totalLeads: 36,
        totalSales: 8,
        conversions: 8,
        budget: 100,
        isActive: true,
        dailyBudget: 50,
        lastUpdated: new Date()
      },
      {
        campaignId: 'camp_002', 
        name: 'Campanha Teste',
        ctr: 1.2,
        cpm: 22.80,
        cpc: 1.90,
        costPerLead: 28.50,
        roas: 1.1,
        totalSpent: 285,
        totalLeads: 10,
        totalSales: 1,
        conversions: 1,
        budget: 75,
        isActive: true,
        dailyBudget: 25,
        lastUpdated: new Date()
      }
    ]
  }

  /**
   * 📝 Log de otimização
   */
  private logOptimization(type: string, action: string, details: string, impact: number) {
    const optimization = {
      timestamp: Date.now(),
      type,
      action,
      result: details,
      impact
    }
    
    this.optimizationHistory.push(optimization)
    
    // Manter apenas últimas 100 otimizações
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory = this.optimizationHistory.slice(-100)
    }
    
    console.log(`📝 ${type}: ${action} | ${details}`)
  }

  /**
   * 📱 Envia relatório de otimização para admin
   */
  private async sendOptimizationReport(optimizationCount: number) {
    try {
      const recentOptimizations = this.optimizationHistory.slice(-5)
      const avgImpact = recentOptimizations.reduce((sum, opt) => sum + opt.impact, 0) / recentOptimizations.length
      
      const report = `🤖 *AUTO-OTIMIZADOR ATIVO*\n\n` +
        `✅ Otimizações realizadas: ${optimizationCount}\n` +
        `📊 Impacto médio: ${(avgImpact * 100).toFixed(1)}%\n\n` +
        `*Últimas ações:*\n` +
        recentOptimizations.map(opt => 
          `• ${opt.action}`
        ).join('\n') +
        `\n\n⏰ ${new Date().toLocaleString('pt-BR')}`
      
      await sendWhatsAppMessage(this.ADMIN_PHONE, report)
      
      // Salvar no sistema de admin também - comentado por enquanto
      // const adminSystem = new AdminReportingSystem()
      // await adminSystem.logOptimization({
      //   type: 'auto_optimization_cycle',
      //   optimizations: optimizationCount,
      //   avgImpact,
      //   details: recentOptimizations
      // })
      
    } catch (error) {
      console.error('❌ Erro enviando relatório:', error)
    }
  }

  /**
   * 📈 Estatísticas do auto-otimizador
   */
  getStats() {
    const totalOptimizations = this.optimizationHistory.length
    const avgImpact = this.optimizationHistory.reduce((sum, opt) => sum + opt.impact, 0) / totalOptimizations || 0
    const lastRun = new Date(this.lastOptimization).toLocaleString('pt-BR')
    
    // Agrupar otimizações por tipo
    const optimizationTypes = this.optimizationHistory.reduce((acc, opt) => {
      acc[opt.type] = (acc[opt.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      isRunning: this.isRunning,
      totalOptimizations,
      avgImpact: (avgImpact * 100).toFixed(2) + '%',
      lastRun,
      lastOptimization: this.lastOptimization,
      optimizationTypes,
      recentOptimizations: this.optimizationHistory.slice(-10)
    }
  }
}

// 🌟 Instância global do auto-otimizador
export const autoOptimizer = AutoOptimizer.getInstance()

// 🚀 Auto-start quando o módulo for carregado
if (process.env.NODE_ENV === 'production' || process.env.AUTO_OPTIMIZER === 'true') {
  autoOptimizer.start()
  console.log('🤖 Auto-otimizador iniciado automaticamente!')
}
