import { PrismaClient } from '@prisma/client'
import { sendWhatsAppMessage } from '../bot/whatsappClient'

const prisma = new PrismaClient()

/**
 * 🔐 SISTEMA DE APROVAÇÕES PARA AUTO-OTIMIZAÇÃO
 * Todas as decisões passam por aprovação antes de executar
 */
export class ApprovalSystem {
  private static _instance: ApprovalSystem
  static getInstance() {
    if (!this._instance) this._instance = new ApprovalSystem()
    return this._instance
  }
  
  private pendingApprovals = new Map<string, any>()
  private readonly ADMIN_PHONE = '554199509644'
  private enableNotifications = true // � Notificações de aprovação ATIVAS por padrão
  
  /**
   * 📝 Cria uma nova aprovação pendente
   */
  async createApproval(type: string, action: string, details: any, impact: string) {
    const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const approval = {
      id: approvalId,
      type,
      action,
      details,
      impact,
      timestamp: Date.now(),
      status: 'pending',
      createdBy: 'auto-optimizer'
    }
    
    this.pendingApprovals.set(approvalId, approval)
    
    // Salvar no banco de dados
    try {
      await prisma.approval.create({
        data: {
          id: approvalId,
          type,
          action,
          details: JSON.stringify(details),
          impact,
          status: 'pending',
          createdAt: new Date()
        }
      })
    } catch (error) {
      console.error('Erro ao salvar aprovação no banco:', error)
    }
    
    // Notificar admin via WhatsApp (só se notificações estiverem ativas)
    if (this.enableNotifications) {
      await this.notifyAdmin(approval)
    }
    
    console.log(`📋 Aprovação criada: ${approvalId} - ${action}`)
    return approvalId
  }
  
  /**
   * ✅ Aprova uma decisão
   */
  async approveDecision(approvalId: string, approvedBy: string = 'admin') {
    const approval = this.pendingApprovals.get(approvalId)
    
    if (!approval) {
      return { success: false, message: 'Aprovação não encontrada' }
    }
    
    if (approval.status !== 'pending') {
      return { success: false, message: 'Aprovação já processada' }
    }
    
    // Marcar como aprovada
    approval.status = 'approved'
    approval.approvedBy = approvedBy
    approval.approvedAt = Date.now()
    
    try {
      // Atualizar no banco
      await prisma.approval.update({
        where: { id: approvalId },
        data: {
          status: 'approved',
          approvedBy,
          approvedAt: new Date()
        }
      })
      
      // Executar a ação aprovada
      await this.executeApprovedAction(approval)
      
      // Notificar sucesso
      await sendWhatsAppMessage(this.ADMIN_PHONE, 
        `✅ **APROVAÇÃO EXECUTADA!**\n\n${approval.action}\n\nResultado: Sucesso! 🎯`
      )
      
      this.pendingApprovals.delete(approvalId)
      
      return { success: true, message: 'Aprovação executada com sucesso!' }
      
    } catch (error) {
      console.error('Erro ao executar aprovação:', error)
      return { success: false, message: `Erro ao executar: ${error}` }
    }
  }
  
  /**
   * ❌ Rejeita uma decisão
   */
  async rejectDecision(approvalId: string, rejectedBy: string = 'admin', reason?: string) {
    const approval = this.pendingApprovals.get(approvalId)
    
    if (!approval) {
      return { success: false, message: 'Aprovação não encontrada' }
    }
    
    approval.status = 'rejected'
    approval.rejectedBy = rejectedBy
    approval.rejectedAt = Date.now()
    approval.rejectionReason = reason
    
    try {
      await prisma.approval.update({
        where: { id: approvalId },
        data: {
          status: 'rejected',
          rejectedBy,
          rejectedAt: new Date(),
          rejectionReason: reason
        }
      })
      
      await sendWhatsAppMessage(this.ADMIN_PHONE,
        `❌ **APROVAÇÃO REJEITADA**\n\n${approval.action}\n\nMotivo: ${reason || 'Não informado'} 🚫`
      )
      
      this.pendingApprovals.delete(approvalId)
      
      return { success: true, message: 'Aprovação rejeitada!' }
      
    } catch (error) {
      console.error('Erro ao rejeitar aprovação:', error)
      return { success: false, message: `Erro ao rejeitar: ${error}` }
    }
  }
  
  /**
   * 📋 Lista aprovações pendentes
   */
  getPendingApprovals() {
    return Array.from(this.pendingApprovals.values())
      .filter(a => a.status === 'pending')
      .sort((a, b) => b.timestamp - a.timestamp)
  }
  
  /**
   * � Ativa/desativa notificações de aprovação
   */
  setNotifications(enabled: boolean) {
    this.enableNotifications = enabled
    console.log(`🔔 Notificações de aprovação: ${enabled ? 'ATIVADAS' : 'DESATIVADAS'}`)
  }
  
  /**
   * �📊 Obter aprovação por ID
   */
  getApproval(approvalId: string) {
    return this.pendingApprovals.get(approvalId)
  }
  
  /**
   * 📱 Notifica admin sobre nova aprovação
   */
  private async notifyAdmin(approval: any) {
    const message = `🔔 **NOVA APROVAÇÃO NECESSÁRIA**

📋 **ID:** ${approval.id.slice(-8)}
🎯 **Ação:** ${approval.action}
📊 **Impacto:** ${approval.impact}

**Detalhes:**
${this.formatApprovalDetails(approval)}

**Para aprovar:**
• WhatsApp: "aprovar ${approval.id.slice(-8)}"
• Dashboard: Vá em Aprovações Pendentes

⏰ Aguardando sua decisão...`

    await sendWhatsAppMessage(this.ADMIN_PHONE, message)
  }
  
  /**
   * 📄 Formata detalhes da aprovação
   */
  private formatApprovalDetails(approval: any): string {
    switch (approval.type) {
      case 'budget_increase':
        return `💰 Aumentar budget da campanha "${approval.details.campaignName}" de R$${approval.details.currentBudget} para R$${approval.details.newBudget}\n📈 ROAS atual: ${approval.details.roas.toFixed(2)}`
        
      case 'budget_decrease':
        return `💸 Diminuir budget da campanha "${approval.details.campaignName}" de R$${approval.details.currentBudget} para R$${approval.details.newBudget}\n📉 ROAS baixo: ${approval.details.roas.toFixed(2)}`
        
      case 'campaign_pause':
        return `⏸️ Pausar campanha "${approval.details.campaignName}"\n📊 ROAS: ${approval.details.roas.toFixed(2)} | Gasto: R$${approval.details.totalSpent}`
        
      case 'campaign_scale':
        return `🚀 Escalar campanha "${approval.details.campaignName}" de R$${approval.details.currentBudget} para R$${approval.details.newBudget}\n🎯 ROAS: ${approval.details.roas.toFixed(2)} | CR: ${approval.details.conversionRate.toFixed(1)}%`
        
      case 'copy_test':
        return `🧪 Testar novo copy "${approval.details.variant}" na categoria ${approval.details.category}\n📝 ${approval.details.description}`
        
      case 'bandit_reset':
        return `🔄 Resetar arm "${approval.details.variant}" na categoria ${approval.details.category}\n📊 CR baixo: ${approval.details.conversionRate.toFixed(2)}%`
        
      default:
        return JSON.stringify(approval.details, null, 2)
    }
  }
  
  /**
   * ⚡ Executa ação aprovada
   */
  private async executeApprovedAction(approval: any) {
    const { budgetAllocator } = await import('./budgetAllocator.js')
    const { universalBandits } = await import('../bot/universalBandits.js')
    
    switch (approval.type) {
      case 'budget_increase':
      case 'budget_decrease':
        budgetAllocator.updateCampaign(approval.details.campaignId, {
          budget: approval.details.newBudget
        })
        break
        
      case 'campaign_pause':
        budgetAllocator.updateCampaign(approval.details.campaignId, {
          active: false
        })
        break
        
      case 'campaign_scale':
        budgetAllocator.updateCampaign(approval.details.campaignId, {
          budget: approval.details.newBudget
        })
        break
        
      case 'copy_test':
        universalBandits.addArm({
          id: approval.details.armId,
          category: approval.details.category,
          variant: approval.details.variant,
          context: { autoGenerated: true, testStarted: Date.now() }
        })
        break
        
      case 'bandit_reset':
        universalBandits.resetArm(approval.details.armId)
        break
        
      default:
        console.log('Tipo de aprovação não reconhecido:', approval.type)
    }
  }
  
  /**
   * 🧹 Limpa aprovações antigas (mais de 24h)
   */
  async cleanupOldApprovals() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    
    for (const [id, approval] of this.pendingApprovals) {
      if (approval.timestamp < oneDayAgo && approval.status === 'pending') {
        approval.status = 'expired'
        this.pendingApprovals.delete(id)
        
        try {
          await prisma.approval.update({
            where: { id },
            data: { status: 'expired' }
          })
        } catch (error) {
          console.error('Erro ao expirar aprovação:', error)
        }
      }
    }
  }
}

export const approvalSystem = ApprovalSystem.getInstance()
