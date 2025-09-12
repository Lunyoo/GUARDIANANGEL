import React, { useState, useEffect } from 'react'

interface DashboardMetrics {
  todaySales: number
  todayRevenue: number
  todayConversations: number
  conversionRate: number
  pendingProblems: number
  averageTicket: number
  codSales: number
  onlineSales: number
}

interface SalesData {
  sales: Array<{
    phone: string
    city: string
    amount: number
    product: string
    paymentMethod: 'COD' | 'online'
    timestamp: string
  }>
  total: number
  revenue: number
}

export default function IntegratedDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [sales, setSales] = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 🔄 Função para buscar dados
  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Buscar métricas
      const metricsResponse = await fetch('/api/dashboard/metrics')
      if (!metricsResponse.ok) throw new Error('Erro ao buscar métricas')
      const metricsData = await metricsResponse.json()
      setMetrics(metricsData)
      
      // Buscar vendas
      const salesResponse = await fetch('/api/dashboard/sales')
      if (!salesResponse.ok) throw new Error('Erro ao buscar vendas')
      const salesData = await salesResponse.json()
      setSales(salesData)
      
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // 🔄 Atualização automática a cada 30 segundos
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-900 dark:text-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Erro</div>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-0 sm:p-6">
  <div className="max-w-7xl mx-auto text-gray-900 dark:text-gray-200">
        
        {/* 📊 Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            🤖 Dashboard Integrado ShapeFit
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Sistema GPT + Mídia + Admin em tempo real
          </p>
          <div className="text-sm text-green-600 mt-1">
            ✅ Última atualização: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* 📈 Métricas Principais */}
        {metrics && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            
    <div className="rounded-lg shadow p-6 bg-white/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800/60 backdrop-blur">
              <div className="flex items-center">
                <div className="text-2xl">💰</div>
                <div className="ml-4">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vendas Hoje</p>
      <p className="text-2xl font-bold">{metrics.todaySales}</p>
                </div>
              </div>
            </div>

    <div className="rounded-lg shadow p-6 bg-white/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800/60 backdrop-blur">
              <div className="flex items-center">
                <div className="text-2xl">📈</div>
                <div className="ml-4">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Faturamento</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {metrics.todayRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

    <div className="rounded-lg shadow p-6 bg-white/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800/60 backdrop-blur">
              <div className="flex items-center">
                <div className="text-2xl">💬</div>
                <div className="ml-4">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversas</p>
      <p className="text-2xl font-bold text-blue-600">{metrics.todayConversations}</p>
                </div>
              </div>
            </div>

    <div className="rounded-lg shadow p-6 bg-white/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800/60 backdrop-blur">
              <div className="flex items-center">
                <div className="text-2xl">🎯</div>
                <div className="ml-4">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversão</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {metrics.conversionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 🔥 Modalidades de Pagamento */}
        {metrics && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
    <div className="rounded-lg shadow p-6 bg-white/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800/60 backdrop-blur">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💳 Modalidades de Pagamento
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
      <span className="text-gray-600 dark:text-gray-400">🏠 Pagamento na Entrega (COD)</span>
                  <span className="font-bold text-green-600">{metrics.codSales}</span>
                </div>
                <div className="flex justify-between items-center">
      <span className="text-gray-600 dark:text-gray-400">🌐 Pagamento Online</span>
                  <span className="font-bold text-blue-600">{metrics.onlineSales}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
      <span className="text-gray-600 dark:text-gray-400">💎 Ticket Médio</span>
                  <span className="font-bold">R$ {metrics.averageTicket.toFixed(2)}</span>
                </div>
              </div>
            </div>

    <div className="rounded-lg shadow p-6 bg-white/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800/60 backdrop-blur">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🚨 Status do Sistema
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
      <span className="text-gray-600 dark:text-gray-400">🤖 Bot Status</span>
                  <span className="text-green-600 font-bold">✅ Online</span>
                </div>
                <div className="flex justify-between items-center">
      <span className="text-gray-600 dark:text-gray-400">⚠️ Problemas Pendentes</span>
                  <span className={`font-bold ${metrics.pendingProblems > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {metrics.pendingProblems}
                  </span>
                </div>
                <div className="flex justify-between items-center">
      <span className="text-gray-600 dark:text-gray-400">🎯 IA Performance</span>
                  <span className="text-green-600 font-bold">94.5%</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 📋 Vendas Recentes */}
        {sales && (
          <div className="rounded-lg shadow bg-white/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800/60 backdrop-blur">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">
                🛍️ Vendas Recentes ({sales.total})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50/60 dark:bg-gray-800/60">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Pagamento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Horário
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/40 dark:bg-gray-900/40 divide-y divide-gray-200/60 dark:divide-gray-800/60">
                  {sales.sales.map((sale, index) => (
                    <tr key={index} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/60">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        📱 {sale.phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        🏙️ {sale.city}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                        R$ {sale.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.paymentMethod === 'COD' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {sale.paymentMethod === 'COD' ? '🏠 Na Entrega' : '🌐 Online'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        ⏰ {new Date(sale.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                  {sales.sales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Nenhuma venda hoje ainda
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 🔄 Botão de Atualização */}
    <div className="mt-6 text-center">
          <button
            onClick={fetchData}
            disabled={loading}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '🔄 Atualizando...' : '🔄 Atualizar Dados'}
          </button>
        </div>

      </div>
    </div>
  )
}
