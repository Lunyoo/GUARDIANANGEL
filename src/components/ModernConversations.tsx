import React, { useEffect, useRef, useState } from 'react'
import { MessageSquare, Search, Pin, PinOff, Send, Download, Sparkles, Filter, Bot, User, Clock, CheckCheck, Check, Phone, Globe, FileText, BarChart3, Zap } from 'lucide-react'

interface Msg { 
  id: string
  body: string
  direction: 'IN' | 'OUT'
  at?: string
  timestamp?: string
  phone?: string
  status?: string
  type?: 'text' | 'image' | 'document' | 'audio'
}

interface Conv { 
  id: string
  contact: string
  state?: string
  botEnabled?: boolean
  messages: Msg[]
  lastActivity?: string
  unreadCount?: number
  tags?: string[]
}

interface ConversationStats {
  totalMessages: number
  avgResponseTime: number
  botResponseRate: number
  lastActivity: string
}

export default function ModernConversations() {
  const [conversations, setConversations] = useState<Conv[]>([])
  const [activeConv, setActiveConv] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'BOT_ON' | 'BOT_OFF' | 'RECENT'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)
  const [stats, setStats] = useState<ConversationStats | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  // Carregar conversas
  const loadConversations = async () => {
    try {
      const response = await fetch('/api/bot/whatsapp/conversations')
      if (response.ok) {
        const data = await response.json()
        const convs = data.conversations || []
        
        // Enriquecer conversas com estatísticas
        const enrichedConvs = convs.map((conv: Conv) => ({
          ...conv,
          lastActivity: conv.messages?.[conv.messages.length - 1]?.timestamp || conv.messages?.[conv.messages.length - 1]?.at,
          unreadCount: conv.messages?.filter(m => m.direction === 'IN' && !m.status?.includes('read')).length || 0,
          tags: generateTags(conv)
        }))
        // Ordenar por última atividade (mais recente primeiro)
        .sort((a: any, b: any) => {
          const atA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
          const atB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
          return atB - atA
        })
        
        setConversations(enrichedConvs)
        if (enrichedConvs.length > 0 && !activeConv) {
          setActiveConv(enrichedConvs[0].id)
        }
        
        // Calcular estatísticas gerais
        calculateStats(enrichedConvs)
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Gerar tags automáticas para conversas
  const generateTags = (conv: Conv): string[] => {
    const tags: string[] = []
    
    if (conv.botEnabled) tags.push('Bot Ativo')
    if (conv.messages?.length > 50) tags.push('Alta Frequência')
    if (conv.messages?.some(m => m.type === 'image')) tags.push('Mídia')
    
  // Análise de sentimento básica
    const recentMessages = conv.messages?.slice(-5) || []
    const hasPositiveWords = recentMessages.some(m => 
      /obrigad|excelente|ótimo|perfeito|amei/i.test(m.body)
    )
    const hasNegativeWords = recentMessages.some(m => 
      /problema|ruim|terrível|cancelar|reclamar/i.test(m.body)
    )
    
    if (hasPositiveWords) tags.push('😊 Positivo')
    if (hasNegativeWords) tags.push('😟 Atenção')
    
    return tags
  }

  // Calcular estatísticas
  const calculateStats = (convs: Conv[]) => {
    const allMessages = convs.flatMap(c => c.messages || [])
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentMessages = allMessages.filter(m => new Date(m.timestamp || m.at || 0) > last24h)

    const outMessages = recentMessages.filter(m => m.direction === 'OUT')
    const botResponseRate = recentMessages.length > 0 ? (outMessages.length / recentMessages.length) * 100 : 0

    // Calcular tempo médio de resposta (IN -> OUT seguinte)
    let pairs = 0
    let totalSec = 0
    convs.forEach(c => {
      const msgs = (c.messages || []).slice().sort((a, b) => new Date(a.timestamp || a.at || 0).getTime() - new Date(b.timestamp || b.at || 0).getTime())
      for (let i = 0; i < msgs.length - 1; i++) {
        const cur = msgs[i]
        const next = msgs[i + 1]
        if (cur.direction === 'IN' && next.direction === 'OUT') {
          const dt = (new Date(next.timestamp || next.at || 0).getTime() - new Date(cur.timestamp || cur.at || 0).getTime()) / 1000
          if (dt >= 0 && isFinite(dt)) {
            totalSec += dt
            pairs++
          }
        }
      }
    })
    const avgResponseTime = pairs > 0 ? Number((totalSec / pairs).toFixed(1)) : 0

    setStats({
      totalMessages: allMessages.length,
      avgResponseTime,
      botResponseRate,
      lastActivity: allMessages[allMessages.length - 1]?.timestamp || 'Nunca'
    })
  }

  // Enviar mensagem
  const sendMessage = async () => {
    if (!messageText.trim() || !activeConv || sending) return
    
    const conv = conversations.find(c => c.id === activeConv)
    if (!conv) return

    setSending(true)
    try {
      const response = await fetch('/api/bot/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: conv.contact,
          content: messageText.trim()
        })
      })

      if (response.ok) {
        setMessageText('')
        // Recarregar conversas para mostrar a nova mensagem
        setTimeout(loadConversations, 1000)
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setSending(false)
    }
  }

  // Filtrar conversas
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.messages?.some(m => m.body.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesFilter = (() => {
      switch (filter) {
        case 'UNREAD': return (conv.unreadCount || 0) > 0
        case 'BOT_ON': return conv.botEnabled
        case 'BOT_OFF': return !conv.botEnabled
        case 'RECENT': return conv.lastActivity && 
          new Date(conv.lastActivity) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        default: return true
      }
    })()
    
    return matchesSearch && matchesFilter
  })

  // SSE para atualizações em tempo real
  useEffect(() => {
    let es: EventSource | undefined

    const onAnyUpdate = () => {
      // Atualizar lista e painel de conversa
      loadConversations()
    }

    const connect = () => {
      try {
        es = new EventSource('/api/bot/events')

        // Conexão estabelecida
        es.addEventListener('connected', () => setConnected(true))

        // Novas mensagens (in/out) do WhatsApp
        es.addEventListener('wa_message', onAnyUpdate)

        // Conversa atualizada (ex: inbound processado, estado, resumo, etc.)
        es.addEventListener('conversation_updated', onAnyUpdate)

        // Eventos de prontidão do WhatsApp (opcional recarregar)
        es.addEventListener('wa_ready', onAnyUpdate)
        es.addEventListener('wa_disconnected', () => setConnected(false))

        // Erro/conexão caída -> tentar reconectar
        es.onerror = () => {
          setConnected(false)
          try { es?.close() } catch {}
          setTimeout(connect, 3000)
        }
      } catch {
        setConnected(false)
      }
    }

    connect()
    return () => {
      try { es?.close() } catch {}
    }
  }, [])

  // Carregar dados inicialmente
  useEffect(() => {
    loadConversations()
  }, [])

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [activeConv, conversations])

  const activeConversation = conversations.find(c => c.id === activeConv)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <div className="text-gray-400">Carregando conversas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header com estatísticas */}
      <div className="p-4 bg-gray-800/50 border-b border-gray-700/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-600/20 border border-green-600/30">
              <MessageSquare className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Conversas WhatsApp</h2>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                {connected ? 'Conectado' : 'Offline'} • {conversations.length} conversas
              </div>
            </div>
          </div>
          
          {stats && (
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-cyan-400">{stats.totalMessages}</div>
                <div className="text-gray-400">Mensagens</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">{stats.botResponseRate.toFixed(0)}%</div>
                <div className="text-gray-400">Bot Rate</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-400">{stats.avgResponseTime}s</div>
                <div className="text-gray-400">Resp. Time</div>
              </div>
            </div>
          )}
        </div>

        {/* Controles de filtro e busca */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversas ou mensagens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-400"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200"
          >
            <option value="ALL">Todas</option>
            <option value="UNREAD">Não lidas</option>
            <option value="RECENT">Recentes (24h)</option>
            <option value="BOT_ON">Bot ativo</option>
            <option value="BOT_OFF">Bot inativo</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Lista de conversas */}
        <div className="w-80 bg-gray-800/30 border-r border-gray-700/60 overflow-y-auto">
          {filteredConversations.map(conv => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConv}
              isPinned={pinned.has(conv.id)}
              onClick={() => setActiveConv(conv.id)}
              onPin={() => {
                const newPinned = new Set(pinned)
                if (pinned.has(conv.id)) {
                  newPinned.delete(conv.id)
                } else {
                  newPinned.add(conv.id)
                }
                setPinned(newPinned)
              }}
            />
          ))}
          
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div>Nenhuma conversa encontrada</div>
            </div>
          )}
        </div>

        {/* Área de mensagens */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              {/* Header da conversa */}
              <div className="p-4 bg-gray-800/30 border-b border-gray-700/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                      {activeConversation.contact.slice(-2)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-200">{activeConversation.contact}</div>
                      <div className="text-sm text-gray-400 flex items-center gap-2">
                        {activeConversation.botEnabled && <Bot className="w-4 h-4 text-emerald-400" />}
                        {activeConversation.tags?.map(tag => (
                          <span key={tag} className="text-xs px-2 py-1 rounded-full bg-gray-700/50">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-gray-200">
                      <Phone className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-gray-200">
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mensagens */}
              <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeConversation.messages?.map(message => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>

              {/* Input de envio */}
              <div className="p-4 bg-gray-800/30 border-t border-gray-700/60">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Digite sua mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-400"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !messageText.trim()}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Enviar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">Selecione uma conversa</div>
                <div className="text-sm">Escolha uma conversa da lista para começar</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConversationItem({ conversation, isActive, isPinned, onClick, onPin }: {
  conversation: Conv
  isActive: boolean
  isPinned: boolean
  onClick: () => void
  onPin: () => void
}) {
  const lastMessage = conversation.messages?.[conversation.messages.length - 1]
  const hasUnread = (conversation.unreadCount || 0) > 0

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left border-b border-gray-700/40 hover:bg-gray-700/30 transition-colors ${
        isActive ? 'bg-gray-700/50 border-cyan-400/30' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold">
            {conversation.contact.slice(-2)}
          </div>
          <div>
            <div className="font-medium text-gray-200">{conversation.contact}</div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              {conversation.botEnabled && <Bot className="w-3 h-3 text-emerald-400" />}
              {conversation.lastActivity && (
                <Clock className="w-3 h-3" />
              )}
              {conversation.lastActivity && 
                new Date(conversation.lastActivity).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              }
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          {hasUnread && (
            <span className="text-xs bg-cyan-600 text-white px-2 py-1 rounded-full">
              {conversation.unreadCount}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPin()
            }}
            className="text-gray-500 hover:text-cyan-400"
          >
            {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
        </div>
      </div>
      
      {lastMessage && (
        <div className="text-sm text-gray-400 line-clamp-2">
          {lastMessage.direction === 'OUT' && <span className="text-cyan-400">→ </span>}
          {lastMessage.body}
        </div>
      )}
      
      {conversation.tags && conversation.tags.length > 0 && (
        <div className="flex gap-1 mt-2">
          {conversation.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300">
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

function MessageBubble({ message }: { message: Msg }) {
  const isOutgoing = message.direction === 'OUT'
  
  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOutgoing 
          ? 'bg-cyan-600 text-white' 
          : 'bg-gray-700/50 text-gray-200'
      }`}>
        <div className="text-sm">{message.body}</div>
        <div className={`text-xs mt-1 flex items-center gap-1 ${
          isOutgoing ? 'text-cyan-100 justify-end' : 'text-gray-400'
        }`}>
          <span>
            {new Date(message.timestamp || message.at || Date.now()).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {isOutgoing && (
            <StatusIcon status={message.status} />
          )}
        </div>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status?: string }) {
  if (status === 'read') return <CheckCheck className="w-3 h-3 text-cyan-200" />
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-gray-300" />
  if (status === 'sent') return <Check className="w-3 h-3 text-gray-300" />
  return <Clock className="w-3 h-3 text-gray-400" />
}
