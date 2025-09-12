import express from 'express'
import { whatsAppHealthMonitor } from '../services/bot/whatsappHealthMonitor.js'

const router = express.Router()

/**
 * 📊 DASHBOARD DE SAÚDE DO WHATSAPP
 * GET /api/whatsapp-health
 */
router.get('/', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7
    const stats = whatsAppHealthMonitor.getHealthStats(days)
    
    if (!stats) {
      return res.json({
        message: 'Health monitor não disponível',
        status: 'unavailable'
      })
    }

    res.json({
      success: true,
      period_days: days,
      timestamp: new Date().toISOString(),
      health: stats
    })
  } catch (error) {
    console.error('❌ Erro ao obter health stats:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

/**
 * 📈 DASHBOARD HTML INTERATIVO
 * GET /api/whatsapp-health/dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const stats = whatsAppHealthMonitor.getHealthStats(7)
    const healthScore = stats?.summary?.health_score || 0
    const stabilityRating = stats?.summary?.stability_rating || 'DESCONHECIDO'
    
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔍 Health Monitor - WhatsApp</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            .health-excellent { background: linear-gradient(135deg, #10b981, #059669); }
            .health-good { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
            .health-regular { background: linear-gradient(135deg, #f59e0b, #d97706); }
            .health-bad { background: linear-gradient(135deg, #ef4444, #dc2626); }
            .health-critical { background: linear-gradient(135deg, #7c2d12, #451a03); }
        </style>
    </head>
    <body class="bg-gray-900 text-white">
        <div class="container mx-auto px-4 py-8">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold mb-2">🔍 Health Monitor</h1>
                <p class="text-gray-400">Sistema de Monitoramento WhatsApp</p>
            </div>

            <!-- Score Principal -->
            <div class="mb-8">
                <div class="bg-gray-800 rounded-lg p-6 text-center">
                    <div class="text-6xl font-bold mb-4 health-${stabilityRating.toLowerCase() === 'excelente' ? 'excellent' : stabilityRating.toLowerCase() === 'bom' ? 'good' : stabilityRating.toLowerCase() === 'regular' ? 'regular' : stabilityRating.toLowerCase() === 'ruim' ? 'bad' : 'critical'} bg-clip-text text-transparent">
                        ${healthScore.toFixed(1)}%
                    </div>
                    <div class="text-xl font-semibold mb-2">Score de Saúde</div>
                    <div class="inline-block px-4 py-2 rounded-full bg-gray-700 text-${stabilityRating.toLowerCase() === 'excelente' ? 'green' : stabilityRating.toLowerCase() === 'bom' ? 'blue' : stabilityRating.toLowerCase() === 'regular' ? 'yellow' : 'red'}-400">
                        ${stabilityRating}
                    </div>
                </div>
            </div>

            <!-- Estatísticas -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-gray-800 rounded-lg p-6">
                    <div class="text-3xl font-bold text-blue-400">${stats?.summary?.total_events || 0}</div>
                    <div class="text-gray-400">Total de Eventos</div>
                </div>
                <div class="bg-gray-800 rounded-lg p-6">
                    <div class="text-3xl font-bold text-red-400">${stats?.summary?.error_count || 0}</div>
                    <div class="text-gray-400">Erros</div>
                </div>
                <div class="bg-gray-800 rounded-lg p-6">
                    <div class="text-3xl font-bold text-yellow-400">${stats?.summary?.reconnections || 0}</div>
                    <div class="text-gray-400">Reconexões</div>
                </div>
                <div class="bg-gray-800 rounded-lg p-6">
                    <div class="text-3xl font-bold text-purple-400">${stats?.summary?.websocket_errors || 0}</div>
                    <div class="text-gray-400">WebSocket Errors</div>
                </div>
            </div>

            <!-- Eventos Recentes -->
            <div class="bg-gray-800 rounded-lg p-6 mb-8">
                <h2 class="text-2xl font-bold mb-4">📋 Eventos Recentes (24h)</h2>
                <div class="space-y-2 max-h-64 overflow-y-auto">
                    ${stats?.recent?.slice(0, 20).map(event => `
                        <div class="flex justify-between items-center p-3 bg-gray-700 rounded">
                            <div class="flex items-center space-x-3">
                                <span class="w-3 h-3 rounded-full ${event.status === 'error' ? 'bg-red-500' : event.status === 'warning' ? 'bg-yellow-500' : event.status === 'critical' ? 'bg-red-700' : 'bg-green-500'}"></span>
                                <span class="font-medium">${event.event_type}</span>
                                ${event.error_message ? `<span class="text-gray-400 text-sm">${event.error_message}</span>` : ''}
                            </div>
                            <span class="text-gray-400 text-sm">${new Date(event.created_at).toLocaleTimeString('pt-BR')}</span>
                        </div>
                    `).join('') || '<div class="text-gray-400 text-center py-4">Nenhum evento recente</div>'}
                </div>
            </div>

            <!-- Gráfico de Tendência -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-2xl font-bold mb-4">📈 Tendência Diária</h2>
                <canvas id="healthChart" width="400" height="200"></canvas>
            </div>

            <!-- Auto-refresh -->
            <div class="text-center mt-8">
                <button onclick="location.reload()" class="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">
                    🔄 Atualizar Dados
                </button>
                <p class="text-gray-400 mt-2">Página atualiza automaticamente a cada 30 segundos</p>
            </div>
        </div>

        <script>
            // Auto-refresh
            setTimeout(() => location.reload(), 30000)

            // Gráfico
            const ctx = document.getElementById('healthChart').getContext('2d')
            const dailyData = ${JSON.stringify(stats?.daily || [])}
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dailyData.map(d => d.date).reverse(),
                    datasets: [{
                        label: 'Reconexões',
                        data: dailyData.map(d => d.total_reconnections || 0).reverse(),
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'Erros WebSocket',
                        data: dailyData.map(d => d.websocket_errors || 0).reverse(),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: '#9ca3af' }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: '#374151' },
                            ticks: { color: '#9ca3af' }
                        },
                        y: {
                            grid: { color: '#374151' },
                            ticks: { color: '#9ca3af' }
                        }
                    }
                }
            })
        </script>
    </body>
    </html>
    `
    
    res.send(html)
  } catch (error) {
    console.error('❌ Erro ao gerar dashboard:', error)
    res.status(500).send('Erro interno do servidor')
  }
})

export default router
