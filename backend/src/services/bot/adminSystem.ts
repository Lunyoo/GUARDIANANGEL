import { sendWhatsAppMessage } from './whatsappClient.fixed'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SaleRecord {
  phone: string
  customerName?: string
  city: string
  amount: number
  product: string
  timestamp: Date
  paymentMethod: 'COD' | 'online'
  quantity?: number
}

interface ProblemReport {
  phone: string
  issue: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high'
  resolved: boolean
}

// 📊 Métricas em memória (em produção usar banco)
let dailySales: SaleRecord[] = []
let problemReports: ProblemReport[] = []
let conversationCount = 0

const ADMIN_PHONE = process.env.ADMIN_PHONE || '5511987654321'

/**
 * 👑 Sistema de relatórios para admin
 */
class AdminReportingSystem {
  
  /**
   * 💰 Registra uma venda completa e cria pedido no banco
   */
  static async recordSale(saleData: Omit<SaleRecord, 'timestamp'>) {
    const sale: SaleRecord = {
      ...saleData,
      timestamp: new Date()
    }
    
    dailySales.push(sale)
    
    console.log('💰 Venda registrada:', sale)
    
    // 🏗️ CRIAR PEDIDO REAL NO BANCO DE DADOS
    try {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      
      const order = await (prisma as any).hypeeOrder.create({
        data: {
          orderNumber,
          customerName: sale.customerName || 'Cliente',
          customerPhone: sale.phone,
          city: sale.city,
          productName: sale.product,
          quantity: sale.quantity || 1,
          unitPrice: sale.amount / (sale.quantity || 1),
          totalAmount: sale.amount,
          paymentMethod: sale.paymentMethod,
          status: sale.paymentMethod === 'COD' ? 'PENDING' : 'CONFIRMED',
          adminNotified: sale.paymentMethod === 'COD' // COD precisa notificação admin
        }
      })
      
      console.log(`✅ Pedido #${orderNumber} criado no banco:`, order.id)
      
      // Notifica admin IMEDIATAMENTE para vendas COD (precisam agendamento)
      if (sale.paymentMethod === 'COD') {
        await this.notifyAdminCODOrder(sale, orderNumber)
      }
      
    } catch (error) {
      console.error('❌ Erro ao criar pedido no banco:', error)
      // Continua com notificação mesmo se falhar o banco
      if (sale.paymentMethod === 'COD') {
        await this.notifyAdminCODOrder(sale)
      }
    }
    
    // Notifica admin se atingir threshold geral
    if (dailySales.filter(s => this.isToday(s.timestamp)).length >= 3) {
      await this.notifyAdminSales()
    }
  }
  
  /**
   * 🚨 Registra problema com cliente
   */
  static async recordProblem(problemData: Omit<ProblemReport, 'timestamp'>) {
    const problem: ProblemReport = {
      ...problemData,
      timestamp: new Date()
    }
    
    problemReports.push(problem)
    
    console.log('🚨 Problema registrado:', problem)
    
    // Notifica admin imediatamente se severity alta
    if (problem.severity === 'high') {
      await this.notifyAdminProblem(problem)
    }
  }
  
  /**
   * 📈 Incrementa contador de conversas
   */
  static incrementConversation() {
    conversationCount++
  }
  
  /**
   * 📱 Notifica admin sobre vendas
   */
  static async notifyAdminSales() {
    const todaySales = dailySales.filter(s => this.isToday(s.timestamp))
    const revenue = todaySales.reduce((sum, sale) => sum + sale.amount, 0)
    
    const message = `🎉 RELATÓRIO DE VENDAS
    
📅 Hoje: ${todaySales.length} vendas
💰 Faturamento: R$ ${revenue.toFixed(2)}
🏙️ Principais cidades: ${this.getTopCities(todaySales)}
💳 COD: ${todaySales.filter(s => s.paymentMethod === 'COD').length}
🌐 Online: ${todaySales.filter(s => s.paymentMethod === 'online').length}

🤖 Seu assistente IA`
    
    await sendWhatsAppMessage(ADMIN_PHONE, message)
  }
  
  /**
   * � Notifica admin sobre pedido COD (precisa agendamento)
   */
  static async notifyAdminCODOrder(sale: SaleRecord, orderNumber?: string) {
    const orderInfo = orderNumber ? `\n🔢 PEDIDO: #${orderNumber}` : ''
    
    const message = `🚚 NOVO PEDIDO COD - AGENDAR ENTREGA

📦 PRODUTO: ${sale.product}
💰 VALOR: R$ ${sale.amount.toFixed(2)}
📱 CLIENTE: ${sale.phone}
🏙️ CIDADE: ${sale.city}
💳 PAGAMENTO: ${sale.paymentMethod}${orderInfo}

⏰ AÇÃO NECESSÁRIA: 
• Agendar entrega
• Confirmar endereço com cliente
• Preparar produto para envio

� INFORMAR AO CLIENTE:
• Motoboy entrega das 8h às 18h
• Motoboy enviará mensagem antes da entrega
• Ter dinheiro trocado em mãos
• Estar disponível no endereço informado

�🕐 Pedido: ${sale.timestamp.toLocaleString()}
🤖 Seu assistente IA`
    
    await sendWhatsAppMessage(ADMIN_PHONE, message)
  }

  /**
   * �🚨 Notifica admin sobre problema
   */
  static async notifyAdminProblem(problem: ProblemReport) {
    const message = `🚨 PROBLEMA REPORTADO
    
📱 Cliente: ${problem.phone}
❗ Severidade: ${problem.severity.toUpperCase()}
🔍 Problema: ${problem.issue}
⏰ Agora: ${problem.timestamp.toLocaleTimeString()}

🤖 Requer sua atenção!`
    
    await sendWhatsAppMessage(ADMIN_PHONE, message)
  }
  
  /**
   * 📊 Gera relatório diário para admin
   */
  static async generateDailyReport() {
    const todaySales = dailySales.filter(s => this.isToday(s.timestamp))
    const todayProblems = problemReports.filter(p => this.isToday(p.timestamp))
    const revenue = todaySales.reduce((sum, sale) => sum + sale.amount, 0)
    
    const report = `📊 RELATÓRIO DIÁRIO - ${new Date().toLocaleDateString()}

💼 VENDAS:
• Total: ${todaySales.length} vendas
• Faturamento: R$ ${revenue.toFixed(2)}
• Ticket médio: R$ ${todaySales.length > 0 ? (revenue / todaySales.length).toFixed(2) : '0.00'}

🗣️ CONVERSAS:
• Total: ${conversationCount} conversas hoje
• Taxa conversão: ${todaySales.length > 0 ? ((todaySales.length / conversationCount) * 100).toFixed(1) : '0'}%

🚨 PROBLEMAS:
• Total: ${todayProblems.length}
• Resolvidos: ${todayProblems.filter(p => p.resolved).length}
• Pendentes: ${todayProblems.filter(p => !p.resolved).length}

🏆 TOP CIDADES:
${this.getTopCities(todaySales)}

🤖 Seu assistente IA trabalhando 24/7!`

    await sendWhatsAppMessage(ADMIN_PHONE, report)
  }
  
  /**
   * 📈 MÉTODOS PARA DASHBOARD FRONTEND
   */
  
  /**
   * 📊 Métricas gerais para dashboard
   */
  static async getDashboardMetrics() {
    const todaySales = dailySales.filter(s => this.isToday(s.timestamp))
    const todayProblems = problemReports.filter(p => this.isToday(p.timestamp))
    const revenue = todaySales.reduce((sum, sale) => sum + sale.amount, 0)
    
    return {
      todaySales: todaySales.length,
      todayRevenue: revenue,
      todayConversations: conversationCount,
      conversionRate: conversationCount > 0 ? ((todaySales.length / conversationCount) * 100) : 0,
      pendingProblems: todayProblems.filter(p => !p.resolved).length,
      averageTicket: todaySales.length > 0 ? (revenue / todaySales.length) : 0,
      codSales: todaySales.filter(s => s.paymentMethod === 'COD').length,
      onlineSales: todaySales.filter(s => s.paymentMethod === 'online').length
    }
  }
  
  /**
   * 💰 Dados de vendas por período
   */
  static async getSalesData(period: string = 'today') {
    let filteredSales = dailySales
    
    if (period === 'today') {
      filteredSales = dailySales.filter(s => this.isToday(s.timestamp))
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filteredSales = dailySales.filter(s => s.timestamp >= weekAgo)
    }
    
    return {
      sales: filteredSales,
      total: filteredSales.length,
      revenue: filteredSales.reduce((sum, sale) => sum + sale.amount, 0),
      byCity: this.groupSalesByCity(filteredSales),
      byHour: this.groupSalesByHour(filteredSales)
    }
  }
  
  /**
   * 💬 Conversas ativas (simulado - em produção viria do cache)
   */
  static async getActiveConversations() {
    return {
      total: conversationCount,
      active: Math.floor(conversationCount * 0.3), // 30% ativas
      avgDuration: '4min 32s',
      topIntents: [
        { intent: 'interest', count: Math.floor(conversationCount * 0.4) },
        { intent: 'questions', count: Math.floor(conversationCount * 0.3) },
        { intent: 'price', count: Math.floor(conversationCount * 0.2) },
        { intent: 'objection', count: Math.floor(conversationCount * 0.1) }
      ]
    }
  }
  
  /**
   * 🚨 Problemas reportados
   */
  static async getProblems(status: string = 'all') {
    let filteredProblems = problemReports
    
    if (status === 'pending') {
      filteredProblems = problemReports.filter(p => !p.resolved)
    } else if (status === 'resolved') {
      filteredProblems = problemReports.filter(p => p.resolved)
    }
    
    return {
      problems: filteredProblems,
      total: filteredProblems.length,
      bySeverity: {
        high: filteredProblems.filter(p => p.severity === 'high').length,
        medium: filteredProblems.filter(p => p.severity === 'medium').length,
        low: filteredProblems.filter(p => p.severity === 'low').length
      }
    }
  }
  
  /**
   * ⚡ Performance do bot
   */
  static async getBotPerformance() {
    const todaySales = dailySales.filter(s => this.isToday(s.timestamp))
    const todayProblems = problemReports.filter(p => this.isToday(p.timestamp))
    
    return {
      responseTime: '1.2s',
      successRate: conversationCount > 0 ? ((conversationCount - todayProblems.length) / conversationCount * 100) : 100,
      conversionRate: conversationCount > 0 ? (todaySales.length / conversationCount * 100) : 0,
      customerSatisfaction: 4.6,
      messagesProcessed: conversationCount * 4, // Média de 4 mensagens por conversa
      aiAccuracy: 94.5
    }
  }
  
  /**
   * 🏙️ Estatísticas por cidade
   */
  static async getCitiesStats() {
    const cityStats = dailySales.reduce((acc, sale) => {
      if (!acc[sale.city]) {
        acc[sale.city] = {
          city: sale.city,
          sales: 0,
          revenue: 0,
          paymentMethod: sale.paymentMethod
        }
      }
      acc[sale.city].sales++
      acc[sale.city].revenue += sale.amount
      return acc
    }, {} as Record<string, any>)
    
    return Object.values(cityStats).sort((a: any, b: any) => b.sales - a.sales)
  }
  
  /**
   * 🔴 Resolver problema
   */
  static async resolveProblem(problemId: string, resolution: string) {
    const problemIndex = problemReports.findIndex((p, index) => index.toString() === problemId)
    if (problemIndex !== -1) {
      problemReports[problemIndex].resolved = true
      console.log(`✅ Problema ${problemId} resolvido: ${resolution}`)
    }
  }
  
  /**
   * ⚡ Dados em tempo real
   */
  static async getRealTimeData() {
    const metrics = await this.getDashboardMetrics()
    return {
      ...metrics,
      timestamp: new Date().toISOString(),
      status: 'online',
      lastUpdate: new Date().toLocaleTimeString(),
      activeUsers: Math.floor(Math.random() * 10) + 1 // Simulado
    }
  }
  
  /**
   * 🎯 Processa comandos do admin
   */
  static async processAdminCommand(command: string): Promise<string> {
    const cmd = command.toLowerCase().trim()
    
    if (cmd.includes('relatório') || cmd.includes('relatorio')) {
      await this.generateDailyReport()
      return 'Relatório enviado, chefe! 📊'
    }
    
    if (cmd.includes('vendas')) {
      const todaySales = dailySales.filter(s => this.isToday(s.timestamp))
      return `Hoje tivemos ${todaySales.length} vendas, chefe! 💰`
    }
    
    if (cmd.includes('problemas')) {
      const todayProblems = problemReports.filter(p => this.isToday(p.timestamp))
      const pending = todayProblems.filter(p => !p.resolved).length
      return `${pending} problemas pendentes hoje, chefe! 🚨`
    }
    
    if (cmd.includes('reset')) {
      conversationCount = 0
      return 'Contador resetado, chefe! ♻️'
    }
    
    return 'Comando não reconhecido. Tente: relatório, vendas, problemas, reset'
  }
  
  // 🔧 Funções auxiliares
  private static isToday(date: Date): boolean {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }
  
  private static getTopCities(sales: SaleRecord[]): string {
    const cityCount = sales.reduce((acc, sale) => {
      acc[sale.city] = (acc[sale.city] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(cityCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([city, count]) => `${city}: ${count}`)
      .join('\n') || 'Nenhuma venda ainda'
  }
  
  private static groupSalesByCity(sales: SaleRecord[]) {
    return sales.reduce((acc, sale) => {
      if (!acc[sale.city]) {
        acc[sale.city] = { count: 0, revenue: 0 }
      }
      acc[sale.city].count++
      acc[sale.city].revenue += sale.amount
      return acc
    }, {} as Record<string, { count: number, revenue: number }>)
  }
  
  private static groupSalesByHour(sales: SaleRecord[]) {
    return sales.reduce((acc, sale) => {
      const hour = sale.timestamp.getHours()
      if (!acc[hour]) {
        acc[hour] = 0
      }
      acc[hour]++
      return acc
    }, {} as Record<number, number>)
  }
}

export { AdminReportingSystem }
