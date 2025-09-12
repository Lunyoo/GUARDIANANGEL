import React, { useEffect, useState } from 'react'
import { MessageSquare, Bot, Shield, Activity, Users, Phone, Globe, Smartphone, QrCode, Wifi, WifiOff, CheckCircle, AlertCircle, Clock, BarChart3 } from 'lucide-react'

interface WhatsAppStats {
  totalConversations: number
  activeConversations: number
  messagesLast24h: number
  botResponses: number
  avgResponseTime: number
  lastActivity?: string
}

interface AdminConfig {
  adminPhone?: string
  businessName?: string
  botEnabled: boolean
  autoReply: boolean
  workingHours: { start: string; end: string; enabled: boolean }
}

export default function ModernWhatsAppControl() {
  const [status, setStatus] = useState<any>({ status: 'checking' })
  const [stats, setStats] = useState<WhatsAppStats | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [config, setConfig] = useState<AdminConfig>({
    adminPhone: '+5511999999999', // Seu número admin
    businessName: 'Guardian Angel',
    botEnabled: true,
    autoReply: true,
    workingHours: { start: '09:00', end: '18:00', enabled: true }
  })
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(false)

  // Carregar QR Code
  const loadQrCode = async () => {
    try {
      const qrRes = await fetch('/api/bot/whatsapp/qr')
      if (qrRes.ok) {
        const qrData = await qrRes.json()
        setQrCode(qrData.dataUrl || null)
      } else {
        setQrCode(null)
      }
    } catch (error) {
      console.error('Erro ao carregar QR Code:', error)
      setQrCode(null)
    }
  }

  // Carregar status e estatísticas
  const loadData = async () => {
    try {
      // Status do WhatsApp
      const statusRes = await fetch('/api/bot/whatsapp/status')
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setStatus(statusData)
        setConnected(statusData.whatsapp)
        
        // Se não está conectado e tem QR disponível, carregar QR
        if (!statusData.whatsapp && statusData.hasQr) {
          loadQrCode()
        }
      }

      // Estatísticas das conversas
      const statsRes = await fetch('/api/bot/whatsapp/conversations')
      if (statsRes.ok) {
        const conversationsData = await statsRes.json()
        const conversations = conversationsData.conversations || []
        
        // Calcular estatísticas
        const now = new Date()
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        
        let messagesLast24h = 0
        let botResponses = 0
        
        conversations.forEach((conv: any) => {
          conv.messages?.forEach((msg: any) => {
            const msgDate = new Date(msg.timestamp || msg.at)
            if (msgDate > last24h) {
              messagesLast24h++
              if (msg.direction === 'OUT') {
                botResponses++
              }
            }
          })
        })

        // Calcular tempo médio de resposta (IN -> OUT seguinte) com base nas conversas carregadas
        let pairs = 0
        let totalSec = 0
        conversations.forEach((c: any) => {
          const msgs = (c.messages || []).slice().sort((a: any, b: any) => new Date(a.timestamp || a.at || 0).getTime() - new Date(b.timestamp || b.at || 0).getTime())
          for (let i = 0; i < msgs.length - 1; i++) {
            const cur = msgs[i]
            const nxt = msgs[i+1]
            if (cur.direction === 'IN' && nxt.direction === 'OUT') {
              const dt = (new Date(nxt.timestamp || nxt.at || 0).getTime() - new Date(cur.timestamp || cur.at || 0).getTime())/1000
              if (dt >= 0 && isFinite(dt)) { totalSec += dt; pairs++ }
            }
          }
        })
        const avgResponseTime = pairs>0 ? Number((totalSec/pairs).toFixed(1)) : 0

        setStats({
          totalConversations: conversations.length,
          activeConversations: conversations.filter((c: any) => c.state === 'active').length,
          messagesLast24h,
          botResponses,
          avgResponseTime,
          lastActivity: conversations.length > 0 ? conversations[0].messages?.[0]?.timestamp : undefined
        })
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  // Controles de WhatsApp
  const handleAction = async (action: string) => {
    setBusy(true)
    try {
      // Para fresh-restart, usa a nova rota
      const endpoint = action === 'fresh-restart' ? '/api/bot/whatsapp/fresh-restart' : `/api/bot/whatsapp/${action}`
      const response = await fetch(endpoint, { method: 'POST' })
      const result = await response.json().catch(() => null)
      
      if (action === 'fresh-restart' && result?.freshQR) {
        alert('✅ Reinício completo realizado! Novo QR code gerado.')
      }
      
      // Aguardar um pouco e recarregar status
      setTimeout(loadData, 2000)
    } catch (error) {
      console.error(`Erro na ação ${action}:`, error)
    } finally {
      setBusy(false)
    }
  }

  // Carregar dados inicialmente e atualizar periodicamente
  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      loadData()
      // Se não está conectado, tentar carregar QR Code
      if (!connected) {
        loadQrCode()
      }
    }, 5000) // Atualizar a cada 5 segundos
    return () => clearInterval(interval)
  }, [connected])

  // SSE listener para eventos de QR code (atualizações instantâneas)
  useEffect(() => {
    let es: EventSource | undefined
    
    try {
      es = new EventSource('/api/bot/events')
      
      // Listen for QR code events
      es.addEventListener('wa_qr', (e: any) => {
        try {
          const data = JSON.parse(e.data)
          setQrCode(data?.dataUrl ?? null)
          console.log('🔄 SSE QR atualizado via wa_qr:', data?.dataUrl ? 'QR recebido' : 'QR limpo')
        } catch (error) {
          console.error('Erro ao processar evento wa_qr:', error)
        }
      })

      // Listen for WhatsApp status changes
      es.addEventListener('wa_status', (e: any) => {
        try {
          const data = JSON.parse(e.data)
          setConnected(data?.ready || false)
          console.log('🔄 SSE Status atualizado via wa_status:', data)
          
          // Se conectou, limpar QR code
          if (data?.ready) {
            setQrCode(null)
          }
        } catch (error) {
          console.error('Erro ao processar evento wa_status:', error)
        }
      })

      es.onerror = () => {
        console.log('❌ SSE connection error - will retry')
      }

    } catch (error) {
      console.error('Erro ao configurar SSE:', error)
    }

    return () => {
      try {
        es?.close()
      } catch {}
    }
  }, [])

  const getStatusIcon = () => {
    if (!connected) return <WifiOff className="w-5 h-5 text-red-400" />
    return <Wifi className="w-5 h-5 text-emerald-400" />
  }

  const getStatusColor = () => {
    if (!connected) return 'text-red-400'
    if (status.status === 'active') return 'text-emerald-400'
    return 'text-yellow-400'
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-green-600/20 border border-green-600/30">
          <MessageSquare className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">WhatsApp Business</h2>
          <div className="flex items-center gap-2 text-sm">
            {getStatusIcon()}
            <span className={getStatusColor()}>
              {connected ? 'Conectado' : 'Desconectado'} • {status.mode || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-400" />}
          title="Conversas"
          value={stats?.totalConversations?.toString() || '—'}
          subtitle={`${stats?.activeConversations || 0} ativas`}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-cyan-400" />}
          title="Mensagens 24h"
          value={stats?.messagesLast24h?.toString() || '—'}
          subtitle={`${stats?.botResponses || 0} respostas bot`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-purple-400" />}
          title="Tempo Resposta"
          value={stats?.avgResponseTime ? `${stats.avgResponseTime}s` : '—'}
          subtitle="Média"
        />
        <StatCard
          icon={<Bot className="w-5 h-5 text-emerald-400" />}
          title="Bot Status"
          value={config.botEnabled ? 'Ativo' : 'Inativo'}
          subtitle={config.autoReply ? 'Auto-reply ON' : 'Manual'}
        />
        <StatCard
          icon={<Shield className="w-5 h-5 text-yellow-400" />}
          title="Admin"
          value={config.adminPhone?.slice(-4) || '—'}
          subtitle="Número registrado"
        />
      </div>

      {/* Controles principais */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Painel de Conexão */}
        <div className="p-6 rounded-xl bg-gray-800/50 border border-gray-700/60">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-cyan-400" />
            Conexão & Pareamento
          </h3>

          {/* QR Code */}
          <div className="mb-6">
            <div className="text-center p-4 border border-gray-600 rounded-lg">
              {qrCode ? (
                <div className="space-y-2">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-48 h-48 mx-auto bg-white p-2 rounded-lg"
                  />
                  <p className="text-sm text-gray-400">Escaneie com seu WhatsApp</p>
                </div>
              ) : connected ? (
                <div className="py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">WhatsApp Conectado!</p>
                </div>
              ) : (
                <div className="py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">Aguardando QR Code...</p>
                </div>
              )}
            </div>
          </div>

          {/* Controles de conexão */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => handleAction('connect')}
                disabled={busy || connected}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2 justify-center"
              >
                <CheckCircle className="w-4 h-4" />
                {busy ? 'Conectando...' : 'Conectar'}
              </button>
              <button
                onClick={() => handleAction('restart')}
                disabled={busy}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2 justify-center"
              >
                <Activity className="w-4 h-4" />
                {busy ? 'Reiniciando...' : 'Reiniciar'}
              </button>
              <button
                onClick={() => handleAction('disconnect')}
                disabled={busy || !connected}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2 justify-center"
              >
                <WifiOff className="w-4 h-4" />
                Desconectar
              </button>
            </div>
            
            {/* Botão Fresh Restart - separado */}
            <div className="pt-2 border-t border-gray-700">
              <button
                onClick={() => handleAction('fresh-restart')}
                disabled={busy}
                className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2 justify-center"
                title="Limpa todas as sessões e gera um QR code completamente novo"
              >
                <QrCode className="w-4 h-4" />
                {busy ? 'Gerando Novo QR...' : 'Gerar Novo QR'}
              </button>
            </div>
          </div>
        </div>

        {/* Configurações do Bot */}
        <div className="p-6 rounded-xl bg-gray-800/50 border border-gray-700/60">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            Configurações do Bot
          </h3>

          <div className="space-y-4">
            {/* Informações do Admin */}
            <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-700/40">
              <div className="text-sm font-medium text-gray-300 mb-2">Administrador</div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-300">{config.adminPhone}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-gray-300">{config.businessName}</span>
              </div>
            </div>

            {/* Configurações do Bot */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Bot Inteligente</label>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, botEnabled: !prev.botEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.botEnabled ? 'bg-emerald-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.botEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Resposta Automática</label>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, autoReply: !prev.autoReply }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.autoReply ? 'bg-emerald-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.autoReply ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Horário de funcionamento */}
            <div className="p-3 rounded-lg bg-gray-900/40">
              <div className="text-sm font-medium text-gray-300 mb-2">Horário de Funcionamento</div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-300">
                  {config.workingHours.enabled 
                    ? `${config.workingHours.start} às ${config.workingHours.end}`
                    : '24/7 (sempre ativo)'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status detalhado */}
      <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/60">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          Status Detalhado
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Modo de Operação</div>
            <div className="text-gray-200 font-medium">{status.mode || 'Undefined'}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Status da Conexão</div>
            <div className={`font-medium ${getStatusColor()}`}>
              {status.status || 'Unknown'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Última Atividade</div>
            <div className="text-gray-200 font-medium">
              {stats?.lastActivity 
                ? new Date(stats.lastActivity).toLocaleString('pt-BR')
                : 'Nenhuma'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, title, value, subtitle }: {
  icon: React.ReactNode
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/60">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <div className="text-sm font-medium text-gray-400">{title}</div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{subtitle}</div>
    </div>
  )
}
