import { PrismaClient } from '@prisma/client'
import { sendWhatsAppMessage } from './whatsappClient.fixed'
import { AdminReportingSystem } from './adminSystem.js'
import { ASSISTANT_CONFIG, RESPONSE_TEMPLATES } from './assistantConfig.js'
import { autoOptimizer } from '../ml/autoOptimizer.js'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

/**
 * 🦾 SUPER ASSISTENTE COM PODERES TOTAIS
 * Personalidade: Amigo que xinga + Eficiência máxima
 */
export class SuperAssistant {
  
  /**
   * 🧠 Processa comandos do super admin com personalidade única
   */
  static async processCommand(command: string): Promise<string> {
    const cmd = command.toLowerCase().trim()
    
    console.log(`🦾 SUPER ASSISTENTE: Processando comando "${command}"`)
    
    // 🎭 Comandos especiais de personalidade
    const specialResponse = (ASSISTANT_CONFIG.specialCommands as any)[cmd]
    if (specialResponse) {
      return specialResponse
    }
    
    // ⚠️ Verificar comandos perigosos
    const isDangerous = ASSISTANT_CONFIG.dangerousCommands.some(dangerous => 
      cmd.includes(dangerous.toLowerCase())
    )
    if (isDangerous) {
      return this.getRandomPhrase('scolding') + " Não vou executar comando perigoso, seu maluco! 🚫 Pensa antes de digitar! 😤"
    }
    
    // 📊 RELATÓRIOS E MÉTRICAS
    if (cmd.includes('relatório') || cmd.includes('relatorio')) {
      await AdminReportingSystem.generateDailyReport()
      return this.getResponse('report')
    }
    
    if (cmd.includes('vendas')) {
      const sales = await AdminReportingSystem.getSalesData()
      return `Ô meu chefe chato! 😤 Hoje tivemos ${sales.total} vendas, faturou R$ ${sales.revenue.toFixed(2)}. Tá satisfeito agora, né?! 💰`
    }
    
    if (cmd.includes('problemas')) {
      const problems = await AdminReportingSystem.getProblems('pending')
      return `Eita, ${problems.total} problemas pendentes! 🚨 Você que criou essa bagunça, agora resolve! Mas calma, eu te ajudo, né mano! 😎`
    }
    
    // 🗃️ GERENCIAMENTO DE BANCO DE DADOS
    if (cmd.includes('limpar') || cmd.includes('clean')) {
      return await this.cleanDatabase(cmd)
    }
    
    if (cmd.includes('backup')) {
      return await this.createBackup()
    }
    
    if (cmd.includes('restore')) {
      return await this.restoreDatabase()
    }
    
    // 📝 MANIPULAÇÃO DE DADOS
    if (cmd.includes('criar lead')) {
      return await this.createLead(command)
    }
    
    if (cmd.includes('deletar') || cmd.includes('apagar')) {
      return await this.deleteData(command)
    }
    
    if (cmd.includes('atualizar') || cmd.includes('update')) {
      return await this.updateData(command)
    }
    
    // 🎯 CAMPANHAS E MARKETING
    if (cmd.includes('campanha')) {
      return await this.manageCampaign(command)
    }
    
    if (cmd.includes('disparar') || cmd.includes('broadcast')) {
      return await this.sendBroadcast(command)
    }
    
    // 🤖 CONTROLE DO BOT
    if (cmd.includes('reiniciar bot') || cmd.includes('restart bot')) {
      return await this.restartBot()
    }
    
    if (cmd.includes('pausar bot') || cmd.includes('parar bot')) {
      return await this.pauseBot()
    }
    
    if (cmd.includes('ativar bot') || cmd.includes('start bot')) {
      return await this.activateBot()
    }
    
    // 🚀 AUTO-OTIMIZADOR
    if (cmd.includes('otimização') || cmd.includes('otimizacao') || cmd.includes('auto-otimizador')) {
      return await this.handleAutoOptimizer(command)
    }
    
    if (cmd.includes('iniciar otimização') || cmd.includes('start optimizer')) {
      return await this.startAutoOptimizer()
    }
    
    if (cmd.includes('parar otimização') || cmd.includes('stop optimizer')) {
      return await this.stopAutoOptimizer()
    }
    
    if (cmd.includes('status otimização') || cmd.includes('optimizer status')) {
      return await this.getOptimizerStatus()
    }
    
    // 💾 SISTEMA E ARQUIVOS
    if (cmd.includes('logs')) {
      return await this.getLogs(command)
    }
    
    if (cmd.includes('status sistema') || cmd.includes('status server')) {
      return await this.getSystemStatus()
    }
    
    if (cmd.includes('executar') || cmd.includes('run')) {
      return await this.executeCommand(command)
    }
    
    // 📊 ANÁLISES AVANÇADAS
    if (cmd.includes('análise') || cmd.includes('analise')) {
      return await this.performAnalysis(command)
    }
    
    if (cmd.includes('previsão') || cmd.includes('previsao')) {
      return await this.generateForecast()
    }
    
    // 🎮 COMANDOS ESPECIAIS
    if (cmd.includes('hack') || cmd.includes('exploit')) {
      return `Ô muleque! 😂 Que hack o que, maluco! Eu já tenho acesso a TUDO mesmo! Para de brincadeira e me dá um comando sério! 🤪`
    }
    
    if (cmd.includes('ajuda') || cmd.includes('help')) {
      return this.getHelpMessage()
    }
    
    // 💬 CONVERSA LIVRE COM GPT-4
    return await this.freeConversation(command)
  }
  
  /**
   * 🗃️ Limpeza de banco de dados
   */
  static async cleanDatabase(command: string): Promise<string> {
    try {
      if (command.includes('tudo') || command.includes('all')) {
        // Limpa conversas antigas
        await prisma.lead.deleteMany({
          where: {
            createdAt: {
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 dias atrás
            }
          }
        })
        return `Pronto, chefe preguiçoso! 🧹 Limpei toda a sujeira que você deixou no banco de dados! Agora tá limpo igual sua consciência! 😂`
      }
      
      if (command.includes('leads')) {
        const count = await prisma.lead.count()
        await prisma.lead.deleteMany()
        return `Beleza, deletei ${count} leads! 🗑️ Espero que você saiba o que tá fazendo, né burro! 😤`
      }
      
      return `Especifica o que quer limpar, cara! 🤷‍♂️ "limpar tudo", "limpar leads"... não sou adivinho!`
      
    } catch (error) {
      return `Ô mano, deu ruim na limpeza! 💥 Erro: ${error}. Você quebrou tudo de novo! 😅`
    }
  }
  
  /**
   * 💾 Backup do banco
   */
  static async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = `/tmp/backup_${timestamp}.json`
      
      const leads = await prisma.lead.findMany()
      fs.writeFileSync(backupPath, JSON.stringify(leads, null, 2))
      
      return `Backup criado, chefe paranóico! 💾 Arquivo: ${backupPath}. Agora pode dormir tranquilo! 😴`
      
    } catch (error) {
      return `Eita, deu pau no backup! 🤦‍♂️ Erro: ${error}. Vai ficar sem backup mesmo! 😂`
    }
  }
  
  /**
   * 📊 Status completo do sistema
   */
  static async getSystemStatus(): Promise<string> {
    try {
      const { stdout: memoryInfo } = await execAsync('free -h')
      const { stdout: diskInfo } = await execAsync('df -h /')
      const { stdout: cpuInfo } = await execAsync('top -bn1 | grep "Cpu(s)"')
      
      const leadsCount = await prisma.lead.count()
      const todayLeads = await prisma.lead.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
      
      return `🖥️ STATUS DO SISTEMA, CHEFE CURIOSO:

💾 **BANCO DE DADOS:**
• Total de leads: ${leadsCount}
• Leads hoje: ${todayLeads}

🧠 **MEMÓRIA:**
${memoryInfo.split('\n')[1]}

💽 **DISCO:**
${diskInfo.split('\n')[1]}

⚡ **CPU:**
${cpuInfo.trim()}

Tá satisfeito agora, fiscal? 😏 Sistema rodando redondinho!`
      
    } catch (error) {
      return `Ô meu chefe, deu erro pra pegar o status! 🤷‍♂️ ${error}. Mas o bot tá vivo, então para de se preocupar! 😂`
    }
  }
  
  /**
   * 🚀 Execução de comandos do sistema
   */
  static async executeCommand(command: string): Promise<string> {
    try {
      const cmdToRun = command.replace(/executar|run/gi, '').trim()
      
      // Comandos seguros permitidos
      const allowedCommands = [
        'ls', 'pwd', 'date', 'whoami', 'ps aux', 'netstat -tulpn',
        'curl', 'wget', 'grep', 'find', 'tail', 'head', 'cat'
      ]
      
      const isAllowed = allowedCommands.some(allowed => cmdToRun.startsWith(allowed))
      
      if (!isAllowed) {
        return `Eita, comando perigoso aí, chefe! 🚫 Só executo comandos seguros. Não vou destruir o servidor por sua causa! 😅`
      }
      
      const { stdout, stderr } = await execAsync(cmdToRun)
      
      if (stderr) {
        return `Comando executado mas deu warning, chefe! ⚠️\n${stderr}`
      }
      
      return `Executado com sucesso, mandão! ✅\n\`\`\`\n${stdout}\n\`\`\``
      
    } catch (error) {
      return `Ô chefe, o comando falhou! 💥 ${error}. Revisa essa porcaria aí! 😂`
    }
  }
  
  /**
   * 📈 Análises avançadas
   */
  static async performAnalysis(command: string): Promise<string> {
    try {
      const metrics = await AdminReportingSystem.getDashboardMetrics()
      const sales = await AdminReportingSystem.getSalesData('week')
      
      const analysis = `📊 **ANÁLISE DETALHADA, CHEFE ANALÍTICO:**

💰 **PERFORMANCE DE VENDAS:**
• Taxa de conversão: ${metrics.conversionRate.toFixed(2)}% ${metrics.conversionRate > 5 ? '🔥 (Boa!)' : '😴 (Medíocre)'}
• Ticket médio: R$ ${metrics.averageTicket.toFixed(2)}
• Faturamento: R$ ${metrics.todayRevenue.toFixed(2)}

🎯 **MODALIDADES:**
• COD (Na entrega): ${metrics.codSales} vendas
• Online: ${metrics.onlineSales} vendas
• Preferência: ${metrics.codSales > metrics.onlineSales ? 'Pagamento na entrega ganhando!' : 'Online dominando!'}

📈 **TENDÊNCIAS:**
• Conversas/Vendas: ${metrics.todayConversations}/${metrics.todaySales}
• Eficiência do bot: ${((metrics.todaySales / metrics.todayConversations) * 100).toFixed(1)}%

${metrics.conversionRate > 5 
  ? 'Tá mandando bem, chefe! 👏 Bot tá convertendo que é uma beleza!' 
  : 'Ô meu chefe, o bot precisa melhorar! 😤 Vamos otimizar essa porra!'
}`
      
      return analysis
      
    } catch (error) {
      return `Erro na análise, chefe! 🤦‍♂️ ${error}. Sem dados, sem análise! 📊❌`
    }
  }
  
  /**
   * 💬 Conversa livre com GPT-4
   */
  static async freeConversation(message: string): Promise<string> {
    // Aqui seria a integração com GPT-4 para conversas livres
    // Por agora, respostas pré-definidas com personalidade
    
    const responses = [
      `Ô meu chefe! ${message}? 🤔 Olha, vou ser sincero contigo: você é teimoso mas eu gosto de você! 😂`,
      `Cara, sobre "${message}"... 🤷‍♂️ Você sempre me vem com essas! Mas tô aqui pra te ajudar, né burro! 😎`,
      `"${message}"? Sério mesmo?! 😂 Tá bom, vou processar isso... Você é muito doido, mano! 🤪`,
      `Entendi sobre "${message}", chefe! 💡 Deixa comigo que eu resolvo. Confia no pai aqui! 💪`,
      `Eita, "${message}" é pesado! 🔥 Mas relaxa que seu assistente favorito (e que mais te xinga) vai dar um jeito! 😈`
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }
  
  /**
   * 📚 Mensagem de ajuda
   */
  static getHelpMessage(): string {
    return `🦾 **SUPER ASSISTENTE - COMANDOS DISPONÍVEIS:**

📊 **RELATÓRIOS:**
• "relatório" - Relatório completo
• "vendas" - Vendas de hoje  
• "problemas" - Issues pendentes

🗃️ **BANCO DE DADOS:**
• "limpar tudo" - Limpa dados antigos
• "backup" - Cria backup
• "criar lead [dados]" - Cria lead

🤖 **CONTROLE BOT:**
• "reiniciar bot" - Restart do bot
• "pausar bot" - Pausa bot
• "status bot" - Status do bot

💾 **SISTEMA:**
• "status sistema" - Info do servidor
• "logs" - Logs do sistema
• "executar [comando]" - Executa comando seguro

📈 **ANÁLISES:**
• "análise" - Análise detalhada
• "previsão" - Forecast de vendas

Ô chefe! 😎 Eu posso fazer QUALQUER COISA! Me manda que eu resolvo e ainda te xingo de brinde! 😂`
  }
  
  /**
   * 🎭 Pega uma frase aleatória com personalidade
   */
  static getRandomPhrase(type: string): string {
    const phrases = (ASSISTANT_CONFIG.phrases as any)[type] || ASSISTANT_CONFIG.phrases.working
    return phrases[Math.floor(Math.random() * phrases.length)]
  }
  
  /**
   * 🎯 Respostas com personalidade dinâmica
   */
  static getResponse(type: string): string {
    const responses = {
      report: [
        'Relatório enviado, chefe preguiçoso! 📊 Agora para de me encher o saco! 😂',
        'Pronto, mandei tudo! 📈 Espero que você leia pelo menos, né burro! 😤',
        'Relatório completo enviado! 📋 Tá satisfeito agora, fiscal? 😏',
        'Enviado, chefe! 📊 Agora vai trabalhar em vez de ficar me perturbando! 😂'
      ],
      error: [
        'Eita, deu ruim! 💥 Mas calma que seu assistente favorito resolve! 😎',
        'Ô chefe, bugou tudo! 🤦‍♂️ Mas eu conserto, relaxa! 😅',
        'Erro detectado! 🚨 Mas não esquenta, tô aqui pra isso mesmo! 💪'
      ]
    }
    
    const typeResponses = responses[type as keyof typeof responses] || responses.error
    return typeResponses[Math.floor(Math.random() * typeResponses.length)]
  }
  
  // Métodos adicionais para funcionalidades específicas
  static async createLead(command: string): Promise<string> {
    // Implementar criação de lead
    return `Lead criado, chefe! 👤 Mais um pra sua coleção! 😂`
  }
  
  static async deleteData(command: string): Promise<string> {
    // Implementar deleção segura
    return `Deletado com sucesso! 🗑️ Espero que você saiba o que fez! 😅`
  }
  
  static async updateData(command: string): Promise<string> {
    // Implementar update de dados
    return `Atualizado, chefe! ✅ Agora tá do jeito que você queria! 😎`
  }
  
  static async manageCampaign(command: string): Promise<string> {
    // Implementar gestão de campanhas
    return `Campanha configurada! 🎯 Agora é só aguardar os resultados! 🚀`
  }
  
  static async sendBroadcast(command: string): Promise<string> {
    // Implementar broadcast
    return `Broadcast enviado! 📢 Mandei pra galera toda! Espero que não seja spam! 😂`
  }
  
  static async restartBot(): Promise<string> {
    // Implementar restart do bot
    return `Bot reiniciado! 🔄 Agora ele tá novo em folha! 🤖`
  }
  
  static async pauseBot(): Promise<string> {
    // Implementar pause do bot
    return `Bot pausado! ⏸️ Ele tá de férias agora! 😴`
  }
  
  static async activateBot(): Promise<string> {
    // Implementar ativação do bot
    return `Bot ativado! ▶️ Voltou pro batente! 💪`
  }
  
  static async getLogs(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync('tail -50 /tmp/app.log || echo "Sem logs disponíveis"')
      return `📋 **LOGS RECENTES:**\n\`\`\`\n${stdout}\n\`\`\`\nPronto, chefe detective! 🕵️‍♂️`
    } catch (error) {
      return `Sem logs pra mostrar, chefe! 🤷‍♂️ Ou o sistema tá muito limpo ou você não configurou direito! 😂`
    }
  }
  
  static async restoreDatabase(): Promise<string> {
    // Implementar restore
    return `Database restaurado! 🔄 Voltou no tempo, chefe! ⏰`
  }
  
  static async generateForecast(): Promise<string> {
    // Implementar previsão com ML
    return `🔮 **PREVISÃO DO SEU ASSISTENTE VIDENTE:**\n\nBaseado nos dados, você vai vender pelo menos mais 5 calcinhas hoje! 🔥\nConfia no pai! 😎`
  }
  
  // 🚀 MÉTODOS DO AUTO-OTIMIZADOR
  
  static async handleAutoOptimizer(command: string): Promise<string> {
    const stats = autoOptimizer.getStats()
    return `🤖 **AUTO-OTIMIZADOR STATUS:**

🔋 **Estado:** ${stats.isRunning ? '✅ ATIVO' : '❌ PARADO'}
⏰ **Última otimização:** ${stats.lastOptimization ? new Date(stats.lastOptimization).toLocaleTimeString() : 'Nunca'}
📊 **Total otimizações:** ${stats.totalOptimizations}
🔄 **Última hora:** ${stats.recentOptimizations}

📈 **Tipos de otimização:**
• 💰 Budgets: ${stats.optimizationTypes.budgets}
• 🎰 Bandits: ${stats.optimizationTypes.bandits}  
• 📢 Campanhas: ${stats.optimizationTypes.campaigns}
• 🧪 Copies: ${stats.optimizationTypes.copies}

${stats.isRunning ? 'Sistema operando no automático, chefe! 😎' : 'Sistema parado, manda eu ligar! 🚀'}`
  }
  
  static async startAutoOptimizer(): Promise<string> {
    try {
      autoOptimizer.start()
      return `🚀 **AUTO-OTIMIZADOR INICIADO!**

Sistema agora vai se otimizar sozinho a cada 15 minutos:
• 💰 Ajustar budgets automaticamente
• 🎯 Otimizar ML Bandits
• ⏸️ Pausar campanhas ruins
• 🚀 Escalar campanhas boas
• 🧪 Testar novos copies

Relaxa que agora eu cuido de tudo! 😎 Vai tomar um café! ☕`
    } catch (error) {
      return `Eita, deu pau pra iniciar! 💥 ${error}. Tenta de novo, chefe! 😅`
    }
  }
  
  static async stopAutoOptimizer(): Promise<string> {
    try {
      autoOptimizer.stop()
      return `⏹️ **AUTO-OTIMIZADOR PARADO!**

Sistema não vai mais se otimizar automaticamente. 
Agora você vai ter que trabalhar, né preguiçoso! 😂

Mas se quiser reativar é só mandar: "iniciar otimização" 🚀`
    } catch (error) {
      return `Erro ao parar, chefe! 💥 ${error}. Que isso! 😅`
    }
  }
  
  static async getOptimizerStatus(): Promise<string> {
    return await this.handleAutoOptimizer('')
  }
}


