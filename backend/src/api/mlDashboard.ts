// 📊 DASHBOARD DE DECISÕES ML EM TEMPO REAL
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { getDecisions } from '../services/ml/mlDecisionLogger'

const prisma = new PrismaClient()
const router = express.Router()

interface MLDecisionLog {
  timestamp: string
  customerId: string
  conversationId: string
  modelUsed: string
  strategy: any
  confidence: number
  factors: string[]
  responseLength: number
  messageCount: number
  result?: {
    responded: boolean
    progressed: boolean
    converted: boolean
  }
}

// 📊 DASHBOARD PÁGINA PRINCIPAL
router.get('/decisions', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🧠 ML Decisions Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                margin: 0; padding: 20px; background: #f5f5f5;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;
            }
            .stats-grid {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px; margin-bottom: 30px;
            }
            .stat-card {
                background: white; padding: 20px; border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .stat-value { font-size: 2em; font-weight: bold; color: #667eea; }
            .stat-label { color: #666; margin-top: 5px; }
            .decisions-table {
                background: white; border-radius: 10px; overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .table-header {
                background: #667eea; color: white; padding: 15px;
                font-weight: bold;
            }
            .decision-row {
                padding: 15px; border-bottom: 1px solid #eee;
                display: grid; grid-template-columns: 1fr 2fr 1fr 1fr;
                gap: 15px; align-items: center;
            }
            .decision-row:hover { background: #f8f9ff; }
            .model-badge {
                padding: 4px 8px; border-radius: 20px; font-size: 0.8em;
                background: #e3f2fd; color: #1976d2;
            }
            .model-badge.gpt4 { background: #f3e5f5; color: #7b1fa2; }
            .confidence-bar {
                background: #eee; height: 6px; border-radius: 3px; overflow: hidden;
            }
            .confidence-fill {
                height: 100%; background: linear-gradient(90deg, #ff5722, #ff9800, #4caf50);
                transition: width 0.3s ease;
            }
            .factors { font-size: 0.85em; color: #666; }
            .refresh-btn {
                background: #667eea; color: white; border: none; padding: 10px 20px;
                border-radius: 5px; cursor: pointer; float: right;
            }
            .real-time { color: #4caf50; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🧠 Machine Learning Decisions Dashboard</h1>
            <p>Monitoramento em tempo real das decisões de IA e estratégias de vendas</p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar</button>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="total-decisions">--</div>
                <div class="stat-label">Total de Decisões Hoje</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="gpt4-usage">--</div>
                <div class="stat-label">% Uso GPT-4</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="avg-confidence">--</div>
                <div class="stat-label">Confiança Média</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="conversion-rate">--</div>
                <div class="stat-label">Taxa de Conversão</div>
            </div>
        </div>

        <div class="decisions-table">
            <div class="table-header">
                📈 Decisões Recentes <span class="real-time">(Tempo Real)</span>
            </div>
            <div id="decisions-list">
                Carregando decisões...
            </div>
        </div>

        <script>
            async function loadDashboard() {
                try {
                    const response = await fetch('/api/ml/decisions/data');
                    const data = await response.json();
                    
                    // Atualizar estatísticas
                    document.getElementById('total-decisions').textContent = data.stats.total;
                    document.getElementById('gpt4-usage').textContent = data.stats.gpt4Percentage + '%';
                    document.getElementById('avg-confidence').textContent = (data.stats.avgConfidence * 100).toFixed(1) + '%';
                    document.getElementById('conversion-rate').textContent = data.stats.conversionRate + '%';
                    
                    // Atualizar lista de decisões
                    const decisionsHtml = data.decisions.map(decision => {
                        const modelClass = decision.modelUsed.includes('gpt-4') ? 'gpt4' : '';
                        const confidence = (decision.confidence * 100).toFixed(0);
                        const time = new Date(decision.timestamp).toLocaleTimeString('pt-BR');
                        
                        return \`
                            <div class="decision-row">
                                <div>
                                    <strong>\${time}</strong><br>
                                    <small>Cliente: \${decision.customerId.substring(0, 8)}...</small>
                                </div>
                                <div>
                                    <span class="model-badge \${modelClass}">\${decision.modelUsed}</span>
                                    <div class="factors">\${decision.factors.join(', ')}</div>
                                </div>
                                <div>
                                    <div class="confidence-bar">
                                        <div class="confidence-fill" style="width: \${confidence}%"></div>
                                    </div>
                                    <small>\${confidence}% confiança</small>
                                </div>
                                <div>
                                    <strong>\${decision.responseLength}</strong> chars<br>
                                    <small>\${decision.messageCount} msgs</small>
                                </div>
                            </div>
                        \`;
                    }).join('');
                    
                    document.getElementById('decisions-list').innerHTML = decisionsHtml;
                    
                } catch (error) {
                    console.error('Erro carregando dashboard:', error);
                    document.getElementById('decisions-list').innerHTML = 
                        '<div style="padding: 20px; text-align: center; color: #f44336;">❌ Erro carregando dados</div>';
                }
            }
            
            // Carregar dashboard
            loadDashboard();
            
            // Auto-refresh a cada 10 segundos
            setInterval(loadDashboard, 10000);
        </script>
    </body>
    </html>
  `)
})

// 📊 API DE DADOS DO DASHBOARD
router.get('/decisions/data', async (req, res) => {
  try {
    // Buscar decisões recentes do logger; se vazio, usa mock
    let decisions: MLDecisionLog[] = getDecisions(200) as any
    if (!decisions || decisions.length === 0) {
      decisions = getRecentMLDecisions()
    }
    
    // Calcular estatísticas
    const stats = calculateDashboardStats(decisions)
    
    res.json({
      stats,
      decisions: decisions.slice(0, 20) // Últimas 20 decisões
    })
    
  } catch (error) {
    console.error('Erro no dashboard de decisões:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// 📊 BUSCAR DECISÕES RECENTES (MOCK)
function getRecentMLDecisions(): MLDecisionLog[] {
  // Por enquanto, dados simulados. Depois vem do banco de dados.
  const mockDecisions: MLDecisionLog[] = []
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
    const models = ['gpt-3.5-turbo', 'gpt-4o-mini']
    const factors = [
      ['mensagem_simples', 'primeira_interacao'],
      ['cliente_interessado', 'objecoes_detectadas'], 
      ['conversa_longa', 'palavras_complexas'],
      ['cliente_frustrado', 'tamanho_duvida']
    ]
    
    mockDecisions.push({
      timestamp: timestamp.toISOString(),
      customerId: `customer_${Math.random().toString(36).substring(7)}`,
      conversationId: `conv_${Math.random().toString(36).substring(7)}`,
      modelUsed: models[Math.floor(Math.random() * models.length)],
      strategy: {
        abordagem: ['consultiva', 'amigavel', 'urgente'][Math.floor(Math.random() * 3)],
        estilo: ['profissional', 'casual'][Math.floor(Math.random() * 2)]
      },
      confidence: Math.random(),
      factors: factors[Math.floor(Math.random() * factors.length)],
      responseLength: Math.floor(Math.random() * 300) + 50,
      messageCount: Math.floor(Math.random() * 15) + 1,
      result: {
        responded: Math.random() > 0.1,
        progressed: Math.random() > 0.3,
        converted: Math.random() > 0.8
      }
    })
  }
  
  return mockDecisions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

// 📊 CALCULAR ESTATÍSTICAS
function calculateDashboardStats(decisions: MLDecisionLog[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayDecisions = decisions.filter(d => 
    new Date(d.timestamp) >= today
  )
  
  const gpt4Decisions = todayDecisions.filter(d => 
    d.modelUsed.includes('gpt-4')
  )
  
  const conversions = decisions.filter(d => 
    d.result?.converted
  ).length
  
  return {
    total: todayDecisions.length,
    gpt4Percentage: todayDecisions.length > 0 
      ? Math.round((gpt4Decisions.length / todayDecisions.length) * 100)
      : 0,
    avgConfidence: todayDecisions.length > 0
      ? todayDecisions.reduce((sum, d) => sum + d.confidence, 0) / todayDecisions.length
      : 0,
    conversionRate: decisions.length > 0
      ? Math.round((conversions / decisions.length) * 100)
      : 0
  }
}

// 📊 WEBHOOK PARA RECEBER DECISÕES EM TEMPO REAL
router.post('/decisions/log', async (req, res) => {
  try {
    const decision: MLDecisionLog = req.body
    
    // Validar dados
    if (!decision.timestamp || !decision.customerId) {
      return res.status(400).json({ error: 'Dados incompletos' })
    }
    
    // Salvar decisão (implementar depois)
    console.log('📊 Nova decisão ML recebida:', {
      model: decision.modelUsed,
      confidence: `${(decision.confidence * 100).toFixed(1)}%`,
      factors: decision.factors.join(', ')
    })
    
    // Broadcast para clientes conectados via SSE (implementar depois)
    // broadcast('ml-decision', decision)
    
    res.json({ success: true })
    
  } catch (error) {
    console.error('Erro salvando decisão ML:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
