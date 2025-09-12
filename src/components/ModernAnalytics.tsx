import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, ShoppingCart, Target, ArrowUp, RefreshCw } from 'lucide-react'
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type OrdersStats = {
  total_orders: number
  pending_orders: number
  shipped_orders: number
  delivered_orders: number
  cancelled_orders: number
  total_revenue: number
  avg_order_value: number
  cod_success_rate: number
  delivery_success_rate: number
}

type FbKpis = {
  impressoes_total: number
  cliques_total: number
  gasto_total: number
  conversoes_total: number
  ctr_media: number
  roas_media: number
  cpm_media: number
}

const ModernAnalytics: React.FC = () => {
  const [stats, setStats] = useState<OrdersStats | null>(null)
  const [fb, setFb] = useState<FbKpis | null>(null)
  const [activeCampaigns, setActiveCampaigns] = useState<number>(0)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [kpisRes, statsRes, campsRes] = await Promise.all([
          fetch('/api/campaigns/kpis'),
          fetch('/api/ops/orders/stats'),
          fetch('/api/campaigns')
        ])
        const k = await kpisRes.json().catch(() => ({}))
        const s = await statsRes.json().catch(() => ({}))
        const c = await campsRes.json().catch(() => ({}))
        if (cancelled) return
        setFb((k?.kpis || null) as FbKpis | null)
        setStats((s || null) as OrdersStats | null)
        const list = Array.isArray(c?.campaigns) ? c.campaigns : []
        const active = list.filter((x: any) => String(x.status || '').toUpperCase() === 'ACTIVE').length
        setActiveCampaigns(active)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(id) }
  }, [timeRange])

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value || 0)

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-950 to-black">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-950 to-black p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics & Insights</h1>
          <p className="text-gray-400">Dados reais de campanhas e operações</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 bg-gray-900/60 border border-gray-800 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="1y">Último ano</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/60 rounded-xl p-6 border border-gray-800">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-green-900/30 rounded-xl flex items-center justify-center border border-green-800/40">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex items-center space-x-1 text-green-400">
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm font-medium">real</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white">{formatCurrency(stats?.total_revenue || 0)}</h3>
          <p className="text-gray-400 text-sm">Receita Total</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gray-900/60 rounded-xl p-6 border border-gray-800">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center border border-blue-800/40">
              <ShoppingCart className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white">{formatNumber(stats?.total_orders || 0)}</h3>
          <p className="text-gray-400 text-sm">Total de Pedidos</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gray-900/60 rounded-xl p-6 border border-gray-800">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-orange-900/30 rounded-xl flex items-center justify-center border border-orange-800/40">
              <Target className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white">{formatCurrency(fb?.gasto_total || 0)}</h3>
          <p className="text-gray-400 text-sm">Investimento FB ({activeCampaigns} ativas)</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gray-900/60 rounded-xl p-6 border border-gray-800">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-cyan-900/30 rounded-xl flex items-center justify-center border border-cyan-800/40">
              <Target className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white">{(fb?.roas_media || 0).toFixed(2)}x</h3>
          <p className="text-gray-400 text-sm">ROAS médio • CTR {(fb?.ctr_media || 0).toFixed(2)}%</p>
        </motion.div>
      </div>

      {/* Order Status Distribution */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/60 rounded-xl p-6 border border-gray-800 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Status dos Pedidos</h3>
        <ResponsiveContainer width="100%" height={260}>
          <RechartsPieChart>
            <Pie
              data={[
                { status: 'Pendentes', count: stats?.pending_orders || 0, color: '#F59E0B' },
                { status: 'Enviados', count: stats?.shipped_orders || 0, color: '#6366F1' },
                { status: 'Entregues', count: stats?.delivered_orders || 0, color: '#10B981' },
                { status: 'Cancelados', count: stats?.cancelled_orders || 0, color: '#EF4444' }
              ]}
              cx="50%"
              cy="50%"
              outerRadius={90}
              dataKey="count"
              label
            >
              {[
                { status: 'Pendentes', count: stats?.pending_orders || 0, color: '#F59E0B' },
                { status: 'Enviados', count: stats?.shipped_orders || 0, color: '#6366F1' },
                { status: 'Entregues', count: stats?.delivered_orders || 0, color: '#10B981' },
                { status: 'Cancelados', count: stats?.cancelled_orders || 0, color: '#EF4444' }
              ].map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#0B1220', border: '1px solid #1f2937', color: '#e5e7eb' }} />
          </RechartsPieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Pendentes', value: stats?.pending_orders || 0, color: '#F59E0B' },
            { label: 'Enviados', value: stats?.shipped_orders || 0, color: '#6366F1' },
            { label: 'Entregues', value: stats?.delivered_orders || 0, color: '#10B981' },
            { label: 'Cancelados', value: stats?.cancelled_orders || 0, color: '#EF4444' }
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm text-gray-300">{s.label}</span>
              </div>
              <span className="text-sm font-medium text-white">{s.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default ModernAnalytics
