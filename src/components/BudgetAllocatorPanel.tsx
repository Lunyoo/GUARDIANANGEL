import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, TrendingUp, DollarSign, Target, AlertTriangle, Bot, Zap, Eye, Brain, MessageSquare, MapPin, BarChart3 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface AllocationDecision {
  id: string
  timestamp: number
  strategy: string
  allocations: Array<{
    campaignId: string
    from: number
    to: number
    delta: number
    rationale: string
    recommendedBudget?: number
    change?: number
    reasoning?: string
  }>
  expectedTotalROI: number
  diversificationScore: number
  approved?: boolean
  rejectedBy?: string
  approvedBy?: string
  autoApproved?: boolean
}

interface PromptOptimization {
  id: string
  type: 'pricing' | 'messaging' | 'cities' | 'strategy'
  currentValue: string
  suggestedValue: string
  reasoning: string
  expectedImprovement: number
  confidence: number
  createdAt: string
  status: 'pending' | 'approved' | 'rejected' | 'testing'
  approvedBy?: string
}

interface CampaignMetrics {
  campaignId: string
  name: string
  totalSpent: number
  totalLeads: number
  roas: number
  active?: boolean
  lastUpdated: number
  budget?: number
}

interface BudgetAllocatorStatus {
  metrics: {
    totalCampaigns: number
    activeCampaigns: number
    totalBudget: number
    totalSpent: number
    overallROAS: number
  }
  decisions: AllocationDecision[]
  approvals: {
    enabled: boolean
  }
}

const BudgetAllocatorPanel: React.FC = () => {
  const [status, setStatus] = useState<BudgetAllocatorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingDecisions, setPendingDecisions] = useState<AllocationDecision[]>([])
  const [approvalsMode, setApprovalsMode] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  
  // 🧠 Estados para otimizações de prompt
  const [promptOptimizations, setPromptOptimizations] = useState<PromptOptimization[]>([])
  const [activeTab, setActiveTab] = useState<'permissoes'>('permissoes')
  const [permFilter, setPermFilter] = useState<'todas' | 'orcamento' | 'prompt'>('todas')
  const [promptAnalysis, setPromptAnalysis] = useState<any>(null)

  // Carregar dados do status
  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/allocator/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        setApprovalsMode(data.approvals?.enabled || false)
        
        // Filtrar decisões pendentes (removendo pendingApproval que não existe)
        const pending = data.decisions?.filter((d: AllocationDecision) => 
          !d.approved && !d.rejectedBy
        ) || []
        setPendingDecisions(pending)
      }
    } catch (error) {
      console.error('Erro ao carregar dados do Budget Allocator:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  // 🧠 Carregar otimizações de prompt
  const loadPromptOptimizations = async () => {
    try {
      const response = await fetch('/api/prompt-optimizations')
      if (response.ok) {
        const data = await response.json()
        setPromptOptimizations(data.pendingOptimizations || [])
      }
    } catch (error) {
      console.error('Erro ao carregar otimizações de prompt:', error)
    }
  }

  // 📊 Carregar análise de prompt
  const loadPromptAnalysis = async () => {
    try {
      const response = await fetch('/api/prompt-analysis')
      if (response.ok) {
        const data = await response.json()
        setPromptAnalysis(data.analysis)
      }
    } catch (error) {
      console.error('Erro ao carregar análise de prompt:', error)
    }
  }

  // Aprovar decisão
  const approveDecision = async (decisionId: string) => {
    try {
      setProcessing(decisionId)
      const response = await fetch(`/api/allocator/dev/decision/${decisionId}/approve`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('Decisão aprovada!')
        loadData() // Recarregar dados
      } else {
        toast.error('Erro ao aprovar decisão')
      }
    } catch (error) {
      toast.error('Erro ao aprovar decisão')
    } finally {
      setProcessing(null)
    }
  }

  // Rejeitar/ignorar decisão
  const rejectDecision = async (decisionId: string) => {
    try {
      setProcessing(decisionId)
      // Para "rejeitar", vamos marcar como approved=false ou simplesmente remover do pending
      toast.success('Decisão rejeitada')
      setPendingDecisions(prev => prev.filter(d => d.id !== decisionId))
    } catch (error) {
      toast.error('Erro ao rejeitar decisão')
    } finally {
      setProcessing(null)
    }
  }

  // Executar nova alocação
  const triggerAllocation = async (strategy: 'balanced' | 'growth' | 'defensive') => {
    try {
      setProcessing('allocation')
      const response = await fetch('/api/allocator/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy })
      })
      
      if (response.ok) {
        toast.success(`Nova alocação ${strategy} criada!`)
        loadData()
      } else {
        toast.error('Erro ao criar alocação')
      }
    } catch (error) {
      toast.error('Erro ao criar alocação')
    } finally {
      setProcessing(null)
    }
  }

  // Alternar modo de aprovações
  const toggleApprovalsMode = async () => {
    try {
      const newMode = !approvalsMode
      const endpoint = newMode ? '/api/allocator/dev/approvals/enable' : '/api/allocator/dev/approvals/disable'
      
      const response = await fetch(endpoint, { method: 'POST' })
      if (response.ok) {
        setApprovalsMode(newMode)
        toast.success(`Modo de aprovações ${newMode ? 'ativado' : 'desativado'}`)
        loadData()
      }
    } catch (error) {
      toast.error('Erro ao alterar modo de aprovações')
    }
  }

  // 🧠 Aprovar otimização de prompt
  const approvePromptOptimization = async (optimizationId: string) => {
    try {
      setProcessing(optimizationId)
      const response = await fetch(`/api/prompt-optimizations/${optimizationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'admin' })
      })
      
      if (response.ok) {
        toast.success('Otimização aprovada e aplicada!')
        loadPromptOptimizations()
      } else {
        toast.error('Erro ao aprovar otimização')
      }
    } catch (error) {
      console.error('Erro ao aprovar otimização:', error)
      toast.error('Erro ao aprovar otimização')
    } finally {
      setProcessing(null)
    }
  }

  // 🧠 Rejeitar otimização de prompt
  const rejectPromptOptimization = async (optimizationId: string) => {
    try {
      setProcessing(optimizationId)
      const response = await fetch(`/api/prompt-optimizations/${optimizationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy: 'admin' })
      })
      
      if (response.ok) {
        toast.success('Otimização rejeitada')
        loadPromptOptimizations()
      } else {
        toast.error('Erro ao rejeitar otimização')
      }
    } catch (error) {
      console.error('Erro ao rejeitar otimização:', error)
      toast.error('Erro ao rejeitar otimização')
    } finally {
      setProcessing(null)
    }
  }

  // 🤖 Gerar novas otimizações automaticamente
  const generateOptimizations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/generate-optimizations', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success(`${data.count} otimizações geradas!`)
        loadPromptOptimizations()
      } else {
        toast.error('Erro ao gerar otimizações')
      }
    } catch (error) {
      console.error('Erro ao gerar otimizações:', error)
      toast.error('Erro ao gerar otimizações')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // sempre carregar otimizações e análise para unificação em Permissões
    loadPromptOptimizations()
    loadPromptAnalysis()
    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      loadData()
      loadPromptOptimizations()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString('pt-BR')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Permissões
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Central de aprovações e permissões (orçamento, prompt, ML)
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleApprovalsMode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
              approvalsMode 
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}
          >
            {approvalsMode ? <Clock className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            <span>{approvalsMode ? 'Aprovações ON' : 'Auto-Execute'}</span>
          </button>
          
          <button
            onClick={() => loadData()}
            className="flex items-center space-x-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-4 py-2 rounded-xl font-medium transition-all"
          >
            <Eye className="w-4 h-4" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Filtro de Permissões */}
      <div className="flex items-center justify-between mb-8 bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg rounded-2xl p-2 border border-purple-500/20">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Filtrar:</span>
          <button onClick={() => setPermFilter('todas')} className={`px-3 py-1 rounded-lg text-sm ${permFilter==='todas'?'bg-purple-500 text-white':'hover:bg-purple-500/10 text-gray-600 dark:text-gray-400'}`}>Todas</button>
          <button onClick={() => setPermFilter('orcamento')} className={`px-3 py-1 rounded-lg text-sm ${permFilter==='orcamento'?'bg-green-600 text-white':'hover:bg-green-500/10 text-gray-600 dark:text-gray-400'}`}>Orçamento</button>
          <button onClick={() => setPermFilter('prompt')} className={`px-3 py-1 rounded-lg text-sm ${permFilter==='prompt'?'bg-blue-600 text-white':'hover:bg-blue-500/10 text-gray-600 dark:text-gray-400'}`}>Prompt</button>
        </div>
        <div className="pr-2 text-xs text-gray-500">
          Pendentes: <span className="text-orange-500 font-medium">{pendingDecisions.length + promptOptimizations.length}</span>
        </div>
      </div>

      {/* Conteúdo das Abas */}
  {activeTab === 'permissoes' && (
        <>
          {/* Métricas Principais */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Campanhas Ativas</p>
                <p className="text-2xl font-bold text-green-400">{status.metrics.activeCampaigns}</p>
                <p className="text-xs text-gray-500">de {status.metrics.totalCampaigns} total</p>
              </div>
              <Target className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Budget Total</p>
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(status.metrics.totalBudget)}</p>
                <p className="text-xs text-gray-500">alocado</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gasto Total</p>
                <p className="text-2xl font-bold text-purple-400">{formatCurrency(status.metrics.totalSpent)}</p>
                <p className="text-xs text-gray-500">executado</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">ROAS Médio</p>
                <p className="text-2xl font-bold text-yellow-400">{status.metrics.overallROAS.toFixed(2)}x</p>
                <p className="text-xs text-gray-500">retorno</p>
              </div>
              <div className="text-2xl">📈</div>
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendentes</p>
                <p className="text-2xl font-bold text-orange-400">{pendingDecisions.length}</p>
                <p className="text-xs text-gray-500">aprovações</p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>
      )}

  {/* Decisões Pendentes - Orçamento */}
  {(permFilter==='todas' || permFilter==='orcamento') && pendingDecisions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-400 mr-2" />
            Decisões Pendentes de Aprovação ({pendingDecisions.length})
          </h2>
          
          <div className="space-y-4">
            {pendingDecisions.map((decision) => (
              <div key={decision.id} className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-orange-400">
                      Estratégia: {decision.strategy.toUpperCase()}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(decision.timestamp)} • {decision.allocations.length} mudanças
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approveDecision(decision.id)}
                      disabled={processing === decision.id}
                      className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Aprovar</span>
                    </button>
                    
                    <button
                      onClick={() => rejectDecision(decision.id)}
                      disabled={processing === decision.id}
                      className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rejeitar</span>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white/50 dark:bg-white/5 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">ROI Esperado</p>
                    <p className="text-lg font-bold text-green-400">{formatCurrency(decision.expectedTotalROI)}</p>
                  </div>
                  
                  <div className="bg-white/50 dark:bg-white/5 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Diversificação</p>
                    <p className="text-lg font-bold text-blue-400">{(decision.diversificationScore * 100).toFixed(1)}%</p>
                  </div>
                  
                  <div className="bg-white/50 dark:bg-white/5 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mudanças</p>
                    <p className="text-lg font-bold text-purple-400">{decision.allocations.length}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">Mudanças de Orçamento:</h4>
                  {decision.allocations.map((allocation, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/30 dark:bg-white/5 rounded-lg p-3">
                      <div>
                        <p className="font-medium">{allocation.campaignId}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{allocation.rationale}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(allocation.from)} → {formatCurrency(allocation.to)}
                        </p>
                        <p className={`text-sm ${allocation.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {allocation.delta >= 0 ? '+' : ''}{formatCurrency(allocation.delta)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

  {/* Ações Rápidas */}
  {(permFilter==='todas' || permFilter==='orcamento') && (
  <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Bot className="w-5 h-5 text-blue-400 mr-2" />
          Ações do Sistema
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => triggerAllocation('balanced')}
            disabled={processing === 'allocation'}
            className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 p-4 rounded-xl font-medium transition-all disabled:opacity-50"
          >
            <TrendingUp className="w-6 h-6 mx-auto mb-2" />
            <div>Alocação Balanceada</div>
            <div className="text-sm opacity-75">Estratégia equilibrada</div>
          </button>
          
          <button
            onClick={() => triggerAllocation('growth')}
            disabled={processing === 'allocation'}
            className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 p-4 rounded-xl font-medium transition-all disabled:opacity-50"
          >
            <Target className="w-6 h-6 mx-auto mb-2" />
            <div>Alocação Agressiva</div>
            <div className="text-sm opacity-75">Foco em crescimento</div>
          </button>
          
          <button
            onClick={() => triggerAllocation('defensive')}
            disabled={processing === 'allocation'}
            className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 p-4 rounded-xl font-medium transition-all disabled:opacity-50"
          >
            <DollarSign className="w-6 h-6 mx-auto mb-2" />
            <div>Alocação Defensiva</div>
            <div className="text-sm opacity-75">Preservar capital</div>
          </button>
        </div>
  </div>
  )}

      {/* Histórico de Decisões */}
  {(permFilter==='todas' || permFilter==='orcamento') && status && status.decisions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Histórico de Decisões ({status.decisions.length})</h2>
          
          <div className="space-y-4">
            {status.decisions.slice(0, 10).map((decision) => (
              <div key={decision.id} className={`rounded-2xl p-6 border ${
                decision.approved
                  ? 'bg-green-500/10 border-green-500/20'
                  : decision.rejectedBy
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-orange-500/10 border-orange-500/20'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Estratégia: {decision.strategy.toUpperCase()}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(decision.timestamp)}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {decision.approved ? (
                      <span className="flex items-center space-x-1 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Aprovado</span>
                      </span>
                    ) : decision.rejectedBy ? (
                      <span className="flex items-center space-x-1 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm">
                        <XCircle className="w-4 h-4" />
                        <span>Rejeitado</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Pendente</span>
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">ROI Esperado: </span>
                    <span className="text-green-400">{formatCurrency(decision.expectedTotalROI)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Diversificação: </span>
                    <span className="text-blue-400">{(decision.diversificationScore * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="font-medium">Mudanças: </span>
                    <span className="text-purple-400">{decision.allocations.length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}

      {/* Bloco de Otimizações de Prompt (como parte de Permissões) */}
      {(permFilter==='todas' || permFilter==='prompt') && (
        <div className="space-y-6 mt-10">
          {/* Header da Aba Prompt */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-400">Prompt Optimizer ML</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Otimizações inteligentes do prompt de vendas baseadas em ML
              </p>
            </div>
            
            <button
              onClick={generateOptimizations}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>Gerar Otimizações</span>
            </button>
          </div>

          {/* Análise de Performance */}
          {promptAnalysis && (
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/20">
              <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Performance Atual do Prompt
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-green-400">
                    {(promptAnalysis.conversionRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tempo de Resposta</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {promptAnalysis.responseTime}s
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Satisfação</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {(promptAnalysis.customerSatisfaction * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Problemas</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {promptAnalysis.commonIssues.length}
                  </p>
                </div>
              </div>

              {promptAnalysis.commonIssues.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-400 mb-2">Problemas Identificados:</h4>
                  <ul className="space-y-1">
                    {promptAnalysis.commonIssues.map((issue: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        <AlertTriangle className="w-4 h-4 text-orange-400 mr-2" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Otimizações Pendentes */}
          {promptOptimizations.length > 0 ? (
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/20">
              <h3 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Otimizações Pendentes ({promptOptimizations.length})
              </h3>
              
              <div className="space-y-4">
                {promptOptimizations.map((optimization) => (
                  <div key={optimization.id} className="bg-white/40 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-200/20">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {optimization.type === 'pricing' && <DollarSign className="w-5 h-5 text-green-400" />}
                        {optimization.type === 'messaging' && <MessageSquare className="w-5 h-5 text-blue-400" />}
                        {optimization.type === 'cities' && <MapPin className="w-5 h-5 text-purple-400" />}
                        {optimization.type === 'strategy' && <Target className="w-5 h-5 text-orange-400" />}
                        
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                            {optimization.type.replace('_', ' ')}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {new Date(optimization.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-400">
                          +{(optimization.expectedImprovement * 100).toFixed(1)}% melhoria
                        </div>
                        <div className="text-xs text-gray-500">
                          {(optimization.confidence * 100).toFixed(0)}% confiança
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Atual:</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 bg-red-500/10 px-2 py-1 rounded">
                          {optimization.currentValue}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sugestão:</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 bg-green-500/10 px-2 py-1 rounded">
                          {optimization.suggestedValue}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Razão:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {optimization.reasoning}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => approvePromptOptimization(optimization.id)}
                        disabled={processing === optimization.id}
                        className="flex-1 flex items-center justify-center space-x-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 px-4 rounded-lg font-medium transition-all disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Aprovar & Aplicar</span>
                      </button>
                      
                      <button
                        onClick={() => rejectPromptOptimization(optimization.id)}
                        disabled={processing === optimization.id}
                        className="flex-1 flex items-center justify-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-4 rounded-lg font-medium transition-all disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Rejeitar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-green-500/20 text-center">
              <Brain className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                Tudo Otimizado! 🎯
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Não há otimizações de prompt pendentes no momento.
              </p>
              <button
                onClick={generateOptimizations}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-6 py-2 rounded-xl font-medium transition-all"
              >
                Analisar Novamente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BudgetAllocatorPanel
