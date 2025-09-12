import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareIcon, User, Loader2, Send, Bot, ToggleLeft, ToggleRight, RefreshCw, Trash2, Link2 } from 'lucide-react';
import MediaViewer from './MediaViewer';

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: string;
  direction: 'IN' | 'OUT';
  status?: 'pending' | 'server' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  contact: string;
  state?: string;
  botEnabled?: boolean;
  messages: Message[];
}

export default function ConversasContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [typingPhones, setTypingPhones] = useState<Record<string, boolean>>({});
  // Local sidebar filter search
  const [search, setSearch] = useState('');
  // Global search (full-text in DB messages)
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const globalAbortRef = useRef<AbortController | null>(null)
  const [unreads, setUnreads] = useState<Record<string, number>>(()=>{ try { return JSON.parse(localStorage.getItem('conv:unreads')||'{}') } catch { return {} } });
  const persistUnreads = (map:Record<string,number>) => { try { localStorage.setItem('conv:unreads', JSON.stringify(map)) } catch {} }
  useEffect(()=>{ persistUnreads(unreads) },[unreads])
  useEffect(()=>{ const onStorage=(e:StorageEvent)=>{ if(e.key==='conv:unreads' && e.newValue){ try { setUnreads(JSON.parse(e.newValue)) } catch {} } }; window.addEventListener('storage',onStorage); return ()=> window.removeEventListener('storage',onStorage) },[])
  const [deleting, setDeleting] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)
  const [prepaidNeeded, setPrepaidNeeded] = useState<{ conversationId: string; phone: string; city?: string } | null>(null)
  const [prepaidLink, setPrepaidLink] = useState('')
  // UI Enhancements
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'BOT_ON' | 'BOT_OFF'>('ALL')
  const [pinned, setPinned] = useState<Set<string>>(()=>{
    try { const raw = localStorage.getItem('conv:pinned'); if (raw) return new Set(JSON.parse(raw)); } catch {} return new Set();
  })
  const [recentlyUpdated, setRecentlyUpdated] = useState<Record<string, number>>({})
  const highlightMs = 6000
  // Notes & insights
  const [notes, setNotes] = useState<{id:string; note:string; created_at:string}[]>([])
  const [noteInput, setNoteInput] = useState('')
  
  // Media Viewer state
  const [mediaViewer, setMediaViewer] = useState<{
    isOpen: boolean;
    url: string;
    type: 'image' | 'video' | 'audio';
    caption?: string;
  } | null>(null);
  const [showNotes, setShowNotes] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [insights, setInsights] = useState<any|null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  // Pagination state per conversation
  const [pages, setPages] = useState<Record<string,{cursor:number|null; hasMore:boolean; loading:boolean}>>({})
  const eventSrcRef = useRef<EventSource | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // UX enhancements
  const [autoScroll, setAutoScroll] = useState(true)
  const [pendingNew, setPendingNew] = useState(false)
  const lastMessageCountRef = useRef<number>(0)
  const lastEventTsRef = useRef<number>(Date.now())
  const heartbeatMissRef = useRef<number>(0)

  // Operador: ações rápidas (somente UI interna). Enviadas como texto simples para o cliente.
  const QUICK_ACTIONS: Array<{ label: string; text: string }> = [
    { label: 'Pitch curto', text: 'Tenho um kit com 3 calcinhas modeladoras por R$ 147 (frete grátis). É pagar só na entrega. Quer que eu separe um pra você?' },
    { label: 'Tamanho', text: 'Pra separar certinho: você usa P, M, G ou GG? Se preferir, me diz sua altura e peso que eu te indico.' },
    { label: 'Endereço', text: 'Me passa o endereço completo (rua, número, bairro, cidade e CEP)? É entrega por motoboy/correio e pagamento na entrega.' },
    { label: 'Confirmação COD', text: 'Fechado! Anotei aqui: pagamento na entrega, combinado. Assim que sair pra entrega eu te aviso por aqui.' },
    { label: 'Objeção preço', text: 'Entendo! Sai menos de R$ 50 cada. E como é na entrega, você só paga quando receber e gostar do resultado.' },
    { label: 'Prova social', text: 'As meninas aqui têm elogiado muito que não marca na roupa e reduz 1 a 2 números na hora. Posso te mandar as medidas certinhas também.' },
  ]

  useEffect(() => {
    let cancelled = false
    const fetchInitial = async () => {
      setLoading(true);
      try {
        // Always try to fetch conversations first so the UI shows history even if WA not ready
        const convRes = await fetch('/api/bot/whatsapp/conversations');
        const convData = convRes.ok ? await convRes.json() : { conversations: [] };
        if (!cancelled) {
          const list: Conversation[] = (convData.conversations || []).map((c:any)=> ({
            ...c,
            messages: (c.messages||[]).map((m:any)=> ({ ...m, timestamp: normalizeTimestamp(m.timestamp || m.at) }))
          }))
          setConversations(list);
          if (list.length && !activeId) setActiveId(list[0].id);
        }
        // Then get connection status (non-blocking for rendering)
        const statusRes = await fetch('/api/bot/whatsapp/status');
  const statusData = statusRes.ok ? await statusRes.json() : { ready:false };
  // Backend returns { ok, whatsapp: boolean, status, hasQr } so consider any truthy of whatsapp/ready/connected as connected
  const isConn = Boolean((statusData as any)?.whatsapp ?? (statusData as any)?.connected ?? (statusData as any)?.ready ?? false)
  if (!cancelled) setConnected(isConn);
      } catch {
        if (!cancelled) setConnected(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchInitial();
    return ()=>{ cancelled = true }
  }, []);

  // Global search effect (debounced)
  useEffect(() => {
    if (globalAbortRef.current) { try { globalAbortRef.current.abort() } catch {} }
    if (globalQuery.trim().length < 2) { setGlobalResults([]); return }
    const ctrl = new AbortController();
    globalAbortRef.current = ctrl
    const t = setTimeout(async () => {
      setGlobalLoading(true)
      try {
        const r = await fetch(`/api/bot/conversations/search/all?q=${encodeURIComponent(globalQuery.trim())}`, { signal: ctrl.signal })
        if (r.ok) {
          const d = await r.json()
          setGlobalResults(d.results || [])
        }
      } catch {}
      setGlobalLoading(false)
    }, 350)
    return () => { clearTimeout(t); try { ctrl.abort() } catch {} }
  }, [globalQuery])

              lastEventTsRef.current = Date.now()
  // Atualiza imediatamente quando app emitir wa:connected
  useEffect(() => {
  const onConnected = () => {
      setConnected(true);
      // Carregar conversas imediatamente
      fetch('/api/bot/whatsapp/conversations').then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setConversations(data.conversations || []);
          if (!activeId && data.conversations?.length) setActiveId(data.conversations[0].id)
              lastEventTsRef.current = Date.now()
        }
      }).catch(() => {});
    };
    window.addEventListener('wa:connected', onConnected);
    return () => window.removeEventListener('wa:connected', onConnected);
  }, []);

  // Subscribe to SSE for real-time events (message, typing, bot)
  useEffect(() => {
    // Debounce SSE setup to avoid rapid reinitialization during status flaps
    if (!connected) return;
    lastEventTsRef.current = Date.now()
    const t = setTimeout(()=>{
      try {
        const es = new EventSource('/api/bot/events');
        eventSrcRef.current = es;
      es.addEventListener('message', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          const phone = normalizePhone(payload.phone);
          setConversations(prev => {
      const next = applyInboundEvent(prev, { type: 'message', payload })
            // Auto-select active chat if none
            setActiveId(a => a || findByPhone(next, phone)?.id || null)
            // Unread increment using freshest next + current active id
            const isIn = String(payload.direction || 'IN') === 'IN'
            const convId = findByPhone(next, phone)?.id || `wa:${phone}`
            if (isIn) {
              setUnreads(curr => { const next = (activeId === convId ? { ...curr, [convId]: 0 } : { ...curr, [convId]: (curr[convId] || 0) + 1 }); return next })
            }
      // Highlight updated
      if (convId) setRecentlyUpdated(r => ({ ...r, [convId]: Date.now() }))
            // Auto-scroll logic
            const localConvId = convId
            if (localConvId && localConvId === activeId) {
              requestAnimationFrame(()=>{
                const el = document.getElementById('messages-scroll')
                if (el) {
                  const nearBottom = (el.scrollHeight - (el.scrollTop + el.clientHeight)) < 160
                  if (autoScroll || nearBottom) {
                    el.scrollTop = el.scrollHeight
                    setPendingNew(false)
                  } else if (isIn) {
                    setPendingNew(true)
                  }
                }
              })
            }
            lastEventTsRef.current = Date.now()
            return next
          });
        } catch {}
      });
      // Listener dedicado para eventos wa_message (cada mensagem de WhatsApp em tempo real)
      es.addEventListener('wa_message', (e:any) => {
        try {
          const payload = JSON.parse(e.data)
          const phone = normalizePhone(payload.phone)
          setConversations(prev => {
            const next = applyInboundEvent(prev, { type:'message', payload })
            // definir conversa ativa se nenhuma
            setActiveId(a => a || findByPhone(next, phone)?.id || null)
            const convId = findByPhone(next, phone)?.id || `wa:${phone}`
            const isIn = String(payload.direction||'IN') === 'IN'
            if (isIn) setUnreads(curr => (activeId===convId ? { ...curr, [convId]:0 } : { ...curr, [convId]:(curr[convId]||0)+1 }))
            if (convId) setRecentlyUpdated(r=>({ ...r, [convId]: Date.now() }))
            // auto-scroll
            if (convId && convId === activeId) {
              requestAnimationFrame(()=>{
                const el = document.getElementById('messages-scroll')
                if (el) {
                  const nearBottom = (el.scrollHeight - (el.scrollTop + el.clientHeight)) < 160
                  if (autoScroll || nearBottom) {
                    el.scrollTop = el.scrollHeight
                    setPendingNew(false)
                  } else if (isIn) {
                    setPendingNew(true)
                  }
                }
              })
            }
            lastEventTsRef.current = Date.now()
            return next
          })
        } catch {}
      })
      es.addEventListener('typing', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          const phone = normalizePhone(payload.phone);
          setTypingPhones(t => ({ ...t, [phone]: Boolean(payload.typing) }));
        } catch {}
      });
      es.addEventListener('bot', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          setConversations(prev => prev.map(c => {
            const byId = payload.conversationId && c.id === payload.conversationId
            const byPhone = payload.phone && normalizePhone(c.contact) === normalizePhone(payload.phone)
            return (byId || byPhone) ? { ...c, botEnabled: payload.botEnabled } : c
          }));
        } catch {}
      });
      es.addEventListener('bot_toggled', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          const phone = normalizePhone(payload.phone);
          setConversations(prev => prev.map(c => {
            return normalizePhone(c.contact) === phone ? { ...c, botEnabled: payload.enabled } : c
          }));
        } catch {}
      });
      es.addEventListener('alert', (e: any) => {
        try {
          const payload = JSON.parse(e.data)
          if (payload?.type === 'prepaid_intent') {
            setPrepaidNeeded({ conversationId: payload.conversationId, phone: payload.phone, city: payload.city })
            // Focus the conversation if listed
            setActiveId(prev => prev || payload.conversationId || null)
          }
        } catch {}
      })
        es.onerror = () => { /* keep silent */ };
        return () => { try { es.close() } catch {} };
      } catch {}
    }, 250)
    return ()=>{ clearTimeout(t); try { eventSrcRef.current?.close() } catch {} }
  }, [connected, activeId]);

  // Secondary SSE for conversation meta updates (ordering / states)
  useEffect(() => {
    if (!connected) return
    let es: EventSource | null = null
    try {
      es = new EventSource('/api/bot/conversations/events')
      es.addEventListener('message', (ev:any) => {
        try {
          const data = JSON.parse(ev.data)
          if (data?.type === 'conversations_update' && Array.isArray(data.data)) {
            setConversations(prev => {
              // Merge states / last activity ordering
              const byId = new Map(prev.map(c => [c.id, c]))
              const updated: Conversation[] = []
              for (const meta of data.data) {
                const existing = byId.get(meta.id)
                if (existing) {
                  updated.push({ ...existing, state: meta.stage || existing.state })
                }
              }
              // Add any left-over convs not in update
              for (const c of prev) { if (!updated.find(u => u.id === c.id)) updated.push(c) }
              return reorderByLastMessage(updated)
            })
          }
        } catch {}
      })
    } catch {}
    return () => { try { es?.close() } catch {} }
  }, [connected])

  // Helpers
  const normalizePhone = (p?: string) => {
    if (!p) return ''
    const d = p.replace(/\D+/g, '')
    return d ? `+${d}` : ''
  }
  
  // Media helper functions
  const isMediaMessage = (message: Message): boolean => {
    const text = message.body.toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm|mp3|wav|ogg|m4a)$/i.test(text) ||
           text.includes('base64') ||
           text.includes('data:image') ||
           text.includes('data:video') ||
           text.includes('data:audio') ||
           text.includes('[📷 imagem]') ||
           text.includes('[🎥 vídeo]') ||
           text.includes('[🎵 áudio]') ||
           text.includes('temp-media-placeholder.com');
  };

  const getMediaType = (message: Message): 'image' | 'video' | 'audio' | null => {
    const text = message.body.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(text) || text.includes('data:image') || text.includes('[📷 imagem]') || text.includes('/image/')) {
      return 'image';
    }
    if (/\.(mp4|mov|avi|webm)$/i.test(text) || text.includes('data:video') || text.includes('[🎥 vídeo]') || text.includes('/video/')) {
      return 'video';
    }
    if (/\.(mp3|wav|ogg|m4a)$/i.test(text) || text.includes('data:audio') || text.includes('[🎵 áudio]') || text.includes('/audio/')) {
      return 'audio';
    }
    return null;
  };

  const openMediaViewer = (message: Message) => {
    const mediaType = getMediaType(message);
    if (mediaType) {
      // Se for placeholder, usar uma imagem/vídeo/áudio de exemplo
      let mediaUrl = message.body;
      if (mediaUrl.includes('temp-media-placeholder.com')) {
        switch (mediaType) {
          case 'image':
            mediaUrl = 'https://picsum.photos/800/600';
            break;
          case 'video':
            mediaUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_360x240_1mb.mp4';
            break;
          case 'audio':
            mediaUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
            break;
        }
      }
      
      setMediaViewer({
        isOpen: true,
        url: mediaUrl,
        type: mediaType,
        caption: `Enviado em ${new Date(message.timestamp).toLocaleString()}`
      });
    }
  };

  const closeMediaViewer = () => {
    setMediaViewer(null);
  };
  
  const findByPhone = (list: Conversation[], phone: string) => list.find(c => normalizePhone(c.contact) === phone || (typeof c.id === 'string' && c.id.startsWith('wa:') && c.id.slice(3) === phone))
  function prevOrNewList(prev: Conversation[], ev: any) {
    // quickly compute list after applyInboundEvent without setState
    return applyInboundEvent(prev, ev)
  }
  function applyInboundEvent(prev: Conversation[], ev: { type: 'message'; payload: any }) {
    if (ev.type === 'message') {
      const { phone, body, direction, conversationId, at } = ev.payload || {}
  const ts = normalizeTimestamp(at)
      const norm = normalizePhone(phone)
      // Try match by conversationId first
      let idx = conversationId ? prev.findIndex(c => c.id === conversationId) : -1
      if (idx === -1 && norm) idx = prev.findIndex(c => normalizePhone(c.contact) === norm || (typeof c.id === 'string' && c.id.startsWith('wa:') && c.id.slice(3) === norm))
      if (idx !== -1) {
        const target = prev[idx]
        const newMsg: Message = { id: `${target.id}-${Date.now()}`, from: norm || target.contact, to: 'me', body: String(body||''), timestamp: ts, direction: direction || 'IN' }
        const updated: Conversation = { ...target, messages: [...target.messages, newMsg] }
        const arr = [...prev]
        arr.splice(idx,1) // remove
        return [updated, ...arr] // move updated to top
      }
      // New conversation (WA-only)
      if (!norm) return prev
      const newConv: Conversation = {
        id: `wa:${norm}`,
        contact: norm,
        state: 'UNKNOWN',
        botEnabled: true,
        messages: [{ id: `wa:${norm}-${Date.now()}`, from: norm, to: 'me', body: String(body||''), timestamp: ts, direction: direction || 'IN' }]
      }
      return [newConv, ...prev]
    }
    return prev
  }

  // Reorder util by last message timestamp desc
  function reorderByLastMessage(list: Conversation[]) {
    return [...list].sort((a,b) => {
      const ta = a.messages.length ? safeTime(a.messages[a.messages.length-1].timestamp) : 0
      const tb = b.messages.length ? safeTime(b.messages[b.messages.length-1].timestamp) : 0
      return tb - ta
    })
  }
  function safeTime(ts?: string){
    if(!ts) return 0
    const d = new Date(ts)
    return isNaN(d.getTime()) ? 0 : d.getTime()
  }

  function normalizeTimestamp(raw:any): string {
    if(!raw) return new Date().toISOString()
    if(typeof raw === 'number') {
      const n = raw < 1e12 ? raw*1000 : raw
      const d = new Date(n)
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
    }
    if(typeof raw === 'string') {
      const d = new Date(raw)
      if(!isNaN(d.getTime())) return d.toISOString()
      const n = Number(raw)
      if(!isNaN(n)) {
        const d2 = new Date(n < 1e12 ? n*1000 : n)
        if(!isNaN(d2.getTime())) return d2.toISOString()
      }
    }
    return new Date().toISOString()
  }
  // (Nada aqui: listeners adicionados dentro do useEffect principal de SSE)

  // Persist pinned set
  useEffect(() => {
    try { localStorage.setItem('conv:pinned', JSON.stringify(Array.from(pinned))) } catch {}
  }, [pinned])

  function togglePinned(id: string) {
    setPinned(prev => {
      const s = new Set(prev)
      if (s.has(id)) {
        s.delete(id)
      } else {
        s.add(id)
      }
      return s
    })
  }

  const activeConv = useMemo(() => conversations.find(c => c.id === activeId) || null, [conversations, activeId]);

  // Load notes & insights when active conversation changes (only DB conversations)
  useEffect(() => {
    setNotes([])
    setInsights(null)
    setShowNotes(false)
    setShowInsights(false)
    if (!activeConv) return
    if (activeConv.id.startsWith('wa:')) return
    // Notes
    ;(async () => {
      try { const r = await fetch(`/api/bot/conversations/${encodeURIComponent(activeConv.id)}/notes`); if (r.ok) { const d = await r.json(); setNotes(d.notes||[]) } } catch {}
    })()
    // Insights (lazy trigger only when user opens panel)
  }, [activeConv?.id])

  const fetchInsights = async () => {
    if (!activeConv || activeConv.id.startsWith('wa:')) return
    if (insights || insightsLoading) return
    setInsightsLoading(true)
    try { const r = await fetch(`/api/bot/conversations/${encodeURIComponent(activeConv.id)}/insights`); if (r.ok) { setInsights(await r.json()) } } catch {}
    setInsightsLoading(false)
  }

  const addNote = async () => {
    const txt = noteInput.trim(); if (!txt || !activeConv || activeConv.id.startsWith('wa:')) return
    try {
      const r = await fetch(`/api/bot/conversations/${encodeURIComponent(activeConv.id)}/notes`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: txt }) })
      if (r.ok) {
        setNoteInput('')
        const d = await r.json();
        setNotes(prev => [{ id: d.id, note: txt, created_at: new Date().toISOString() }, ...prev])
      }
    } catch {}
  }

  const deleteNote = async (id:string) => {
    if (!activeConv || activeConv.id.startsWith('wa:')) return
    const ok = window.confirm('Remover nota?'); if (!ok) return
    try {
      const r = await fetch(`/api/bot/conversations/${encodeURIComponent(activeConv.id)}/notes/${encodeURIComponent(id)}`, { method:'DELETE' })
      if (r.ok) setNotes(prev => prev.filter(n => n.id !== id))
    } catch {}
  }

  // Clear unread when opening a conversation
  useEffect(() => {
    if (!activeId) return
  setUnreads(u => { const next = { ...u, [activeId]: 0 }; return next })
  }, [activeId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = conversations
    // Filter by type
    if (filter === 'UNREAD') list = list.filter(c => (unreads[c.id]||0) > 0)
    if (filter === 'BOT_ON') list = list.filter(c => c.botEnabled !== false)
    if (filter === 'BOT_OFF') list = list.filter(c => c.botEnabled === false)
    if (q) {
      list = list.filter(c => {
        if (c.contact.toLowerCase().includes(q)) return true
        const last = c.messages[c.messages.length - 1]
        if (last && last.body.toLowerCase().includes(q)) return true
        return false
      })
    }
    // Order: pinned first (keeping relative ordering), then others already ordered by recency
    const pinnedArr: Conversation[] = []
    const rest: Conversation[] = []
    for (const c of list) (pinned.has(c.id) ? pinnedArr : rest).push(c)
    return [...pinnedArr, ...rest]
  }, [search, conversations, filter, unreads, pinned])

  // Derived stats
  const stats = useMemo(() => {
    const total = conversations.length
    const unreadTotal = Object.values(unreads).reduce((a,b)=>a+b,0)
    const botOn = conversations.filter(c => c.botEnabled !== false).length
    const botOff = total - botOn
    return { total, unreadTotal, botOn, botOff }
  }, [conversations, unreads])

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setSending(true);
    try {
      const conv = conversations.find(c => c.id === activeId);
      if (!conv) return;
      // Determine if DB conversation or WA-only (id starts with 'wa:')
      if (typeof conv.id === 'string' && conv.id.startsWith('wa:')) {
        await fetch('/api/bot/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: conv.contact, content: text })
        });
      } else {
        await fetch(`/api/bot/conversations/${conv.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text })
        });
      }
      setInputText('');
      // optimistic append
      setConversations(prev => prev.map(c => c.id === conv.id ? ({ ...c, messages: [...c.messages, { id: `${c.id}-${Date.now()}`, from: 'me', to: conv.contact, body: text, timestamp: new Date().toISOString(), direction: 'OUT' }] }) : c));
    } finally {
      setSending(false);
    }
  };

  // Envia texto direto (sem exibir botão para o cliente; é apenas conveniência do operador)
  const sendQuick = async (text: string) => {
    if (!text.trim()) return
    const conv = conversations.find(c => c.id === activeId)
    if (!conv) return
    setSending(true)
    try {
      if (typeof conv.id === 'string' && conv.id.startsWith('wa:')) {
        await fetch('/api/bot/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: conv.contact, content: text })
        })
      } else {
        await fetch(`/api/bot/conversations/${conv.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text })
        })
      }
      // optimistic append
      setConversations(prev => prev.map(c => c.id === conv.id ? ({ ...c, messages: [...c.messages, { id: `${c.id}-${Date.now()}`, from: 'me', to: conv.contact, body: text, timestamp: new Date().toISOString(), direction: 'OUT' }] }) : c))
    } finally {
      setSending(false)
    }
  }

  const toggleBot = async (conv: Conversation) => {
    const enabled = !(conv.botEnabled ?? true);
    if (typeof conv.id === 'string' && conv.id.startsWith('wa:')) {
      const phone = normalizePhone(conv.contact)
      await fetch(`/api/bot/whatsapp/phone/${encodeURIComponent(phone)}/bot`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) })
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, botEnabled: enabled } : c));
      return
    }
    await fetch(`/api/bot/conversations/${conv.id}/bot`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, botEnabled: enabled } : c));
  };

  const quickCreateOrder = async (conv: Conversation) => {
    try {
      const id = conv.id
      if (!id) return alert('Conversa inválida')
      const resp = await fetch(`/api/bot/conversations/${encodeURIComponent(id)}/order`, { method: 'POST' })
      if (!resp.ok) throw new Error('Falha ao criar pedido')
      alert('Pedido criado (Pendente).')
    } catch {
      alert('Falha ao criar pedido')
    }
  }

  const deleteConversation = async (conv: Conversation) => {
    try {
      const phone = normalizePhone(conv.contact)
      if (!phone) return alert('Telefone inválido para exclusão.')
      const ok = window.confirm(`Excluir todas as conversas de ${phone}? Esta ação não pode ser desfeita.`)
      if (!ok) return
      setDeleting(true)
      const resp = await fetch('/api/bot/conversations/reset-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, deep: true, createFresh: false })
      })
      if (!resp.ok) throw new Error('Falha ao excluir conversas')
      // Atualiza lista: remove conversas com o mesmo phone e recarrega do backend
      setConversations(prev => prev.filter(c => normalizePhone(c.contact) !== phone))
      setActiveId(prev => {
        const nextList = conversations.filter(c => normalizePhone(c.contact) !== phone)
        return nextList.length ? nextList[0].id : null
      })
      try {
        const r = await fetch('/api/bot/whatsapp/conversations')
        if (r.ok) {
          const d = await r.json()
          setConversations(d.conversations || [])
          if (!activeId && d.conversations?.length) setActiveId(d.conversations[0].id)
        }
      } catch {}
    } catch (e) {
      alert('Não foi possível excluir a conversa.')
    } finally {
      setDeleting(false)
    }
  }

  const resetConversationFresh = async (conv: Conversation) => {
    const phone = normalizePhone(conv.contact)
    if (!phone) return alert('Telefone inválido.')
    const ok = window.confirm(`Limpar e criar conversa nova para ${phone}?`)
    if (!ok) return
    setResetting(conv.id)
    try {
      const resp = await fetch('/api/bot/conversations/reset-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, deep: true, createFresh: true })
      })
      if (!resp.ok) throw new Error('reset failed')
      // reload list
      const r = await fetch('/api/bot/whatsapp/conversations')
      if (r.ok) {
        const d = await r.json()
        setConversations(d.conversations || [])
        if (d.conversations?.length) setActiveId(d.conversations[0].id)
      }
    } catch {
      alert('Não foi possível limpar/criar nova conversa.')
    } finally {
      setResetting(null)
    }
  }

  // Add below existing helper functions, before return (pagination + status ticks)
  const messagesScrollRef = useRef<HTMLDivElement | null>(null)

  function statusTicks(status: string) {
    switch (status) {
      case 'pending': return '…'
      case 'server': return '✓'
      case 'delivered': return '✓✓'
      case 'read': return '✓✓'
      default: return ''
    }
  }

  function ensurePageState(id: string) {
    setPages(p => p[id] ? p : { ...p, [id]: { cursor: null, hasMore: true, loading: false } })
  }

  async function loadOlderMessages(id: string) {
    const conv = conversations.find(c => c.id === id)
    if (!conv) return
    ensurePageState(id)
    setPages(p => ({ ...p, [id]: { ...(p[id]||{cursor:null,hasMore:true,loading:false}), loading: true } }))
    try {
      // Determine endpoint
      const oldest = conv.messages[0]
      const before = oldest ? new Date(oldest.timestamp).getTime() : Date.now()
      if (id.startsWith('wa:')) {
        // For WA-only we don't yet have backend pagination; skip
        setPages(p => ({ ...p, [id]: { ...(p[id]||{}), hasMore: false, loading: false } }))
        return
      }
      const r = await fetch(`/api/bot/conversations/${encodeURIComponent(id)}/messages?limit=40&before=${before}`)
      if (r.ok) {
        const d = await r.json()
        const msgs = Array.isArray(d.messages) ? d.messages : []
        if (msgs.length) {
          // Transform to UI Message shape if needed
          const mapped = msgs.map((m:any)=>({
            id: m.id,
            from: m.direction === 'inbound' ? conv.contact : 'me',
            to: m.direction === 'inbound' ? 'me' : conv.contact,
            body: m.content || m.body || '',
              timestamp: m.createdAt || m.timestamp || new Date().toISOString(),
            direction: m.direction === 'inbound' ? 'IN' : 'OUT'
          }))
          setConversations(prev => prev.map(c => c.id === id ? ({ ...c, messages: [...mapped, ...c.messages] }) : c))
        }
        setPages(p => ({ ...p, [id]: { cursor: d.nextCursor || null, hasMore: d.hasMore, loading: false } }))
        // Maintain scroll position after prepending
        if (messagesScrollRef.current) {
          messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight / 3 // approximate
        }
      } else {
        setPages(p => ({ ...p, [id]: { ...(p[id]||{}), loading: false } }))
      }
    } catch {
      setPages(p => ({ ...p, [id]: { ...(p[id]||{}), loading: false } }))
    }
  }

  function handleScrollLoadMore(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (el.scrollTop < 40 && activeConv) {
      const st = pages[activeConv.id]
      if (!st || (st.hasMore && !st.loading)) loadOlderMessages(activeConv.id)
    }
    // Track if user left bottom -> disable autoScroll until they return bottom
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight)
    if (distance > 200) {
      // user scrolled up
      if (autoScroll) setAutoScroll(false)
    } else if (distance < 80 && !autoScroll) {
      // near bottom again; enable
      setAutoScroll(true); setPendingNew(false)
    }
  }

  // Fallback polling & heartbeat (ensures UI updates if SSE stalls or WA-only messages missed)
  useEffect(()=>{
    if (!connected) return
    const interval = setInterval(async () => {
      const now = Date.now()
      const idleMs = now - lastEventTsRef.current
      if (idleMs > 15000) {
        heartbeatMissRef.current++
      } else {
        heartbeatMissRef.current = 0
      }
      if (idleMs > 20000 || heartbeatMissRef.current > 2) {
        try {
          const r = await fetch('/api/bot/whatsapp/conversations')
          if (r.ok) {
            const d = await r.json()
            setConversations(prev => {
              // merge by id; prefer existing messages local
              const map = new Map<string, Conversation>()
              for (const c of prev) map.set(c.id, c)
              for (const nc of (d.conversations||[])) {
                if (!map.has(nc.id)) map.set(nc.id, nc)
              }
              return reorderByLastMessage(Array.from(map.values()))
            })
            lastEventTsRef.current = Date.now()
          }
        } catch {}
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [connected])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-blue-400" /></div>;
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <MessageSquareIcon className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">WhatsApp não conectado</h3>
        <p className="text-gray-500 mb-3">Conecte o WhatsApp para liberar as conversas.</p>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                await fetch('/api/bot/whatsapp/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
                // poll status briefly
                const start = Date.now()
                const wait = async () => {
                  const r = await fetch('/api/bot/whatsapp/status')
                  const d = await r.json()
                  const ok = Boolean(d?.whatsapp ?? d?.connected ?? d?.ready)
                  if (ok) { setConnected(true); return }
                  if (Date.now() - start < 8000) setTimeout(wait, 800)
                }
                wait()
              } catch {}
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Link2 className="w-4 h-4" /> Conectar
          </button>
          <a
            href="/api/bot/whatsapp/qr"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-600 text-gray-200 hover:bg-gray-800"
          >
            Ver QR
          </a>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <MessageSquareIcon className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Nenhuma conversa encontrada</h3>
        <p className="text-gray-500">Assim que receber mensagens, elas aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-0 md:p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-0 py-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <MessageSquareIcon className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <span>💬 Conversas</span>
        </h1>
        <p className="text-gray-400 mt-2 flex flex-wrap gap-3 text-sm">
          <span>Total: <strong className="text-gray-200">{stats.total}</strong></span>
          <span>Não lidas: <strong className="text-red-400">{stats.unreadTotal}</strong></span>
          <span>Bot ON: <strong className="text-green-400">{stats.botOn}</strong></span>
          <span>Bot OFF: <strong className="text-yellow-400">{stats.botOff}</strong></span>
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-6">
        {/* Sidebar - list of chats */}
        <div className="md:col-span-1 bg-gray-800 border-y md:border border-gray-700">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <span className="text-gray-300 text-sm">Conversas</span>
            <div className="flex items-center gap-2">
            <button className="text-gray-400 hover:text-gray-200" onClick={async () => {
              const r = await fetch('/api/bot/whatsapp/conversations');
              if (r.ok) {
                const d = await r.json();
                setConversations(d.conversations || []);
                if (!activeId && d.conversations?.length) setActiveId(d.conversations[0].id);
              }
            }} title="Recarregar lista">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              className="text-gray-400 hover:text-red-300"
              title="Limpar TUDO (DB e sessão do WhatsApp)"
              onClick={async () => {
                const ok = window.confirm('Tem certeza que deseja limpar TODAS as conversas e mensagens? Isso vai também desconectar o WhatsApp e resetar a sessão.')
                if (!ok) return
                try {
                  const r = await fetch('/api/bot/reset/all', { method: 'POST' })
                  if (r.ok) {
                    setConversations([])
                    setActiveId(null)
                    setConnected(false)
                  }
                } catch {}
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            </div>
          </div>
          <div className="p-2 border-b border-gray-700 space-y-2">
            <input
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              placeholder="Buscar por telefone ou última mensagem"
              className="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div className="relative">
              <input
                value={globalQuery}
                onChange={(e)=>setGlobalQuery(e.target.value)}
                placeholder="Busca global (mensagens DB)"
                className="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm"
              />
              {globalQuery && (
                <button onClick={()=>{ setGlobalQuery(''); setGlobalResults([]) }} className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-300 text-xs">×</button>
              )}
              { (globalResults.length>0 || globalLoading) && globalQuery.trim().length>=2 && (
                <div className="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded shadow-lg max-h-64 overflow-y-auto text-xs">
                  {globalLoading && <div className="px-3 py-2 text-gray-400">Buscando…</div>}
                  {!globalLoading && globalResults.map(r => (
                    <button
                      key={r.at + r.snippet}
                      onClick={() => {
                        setGlobalQuery('')
                        setGlobalResults([])
                        if (r.conversationId) {
                          setActiveId(r.conversationId)
                        }
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700/50 border-b border-gray-800 last:border-b-0"
                    >
                      <div className="text-gray-300 truncate">{r.snippet}</div>
                      <div className="text-[10px] text-gray-500 flex justify-between"><span>{r.phone}</span><span>{new Date(r.at).toLocaleDateString()}</span></div>
                    </button>
                  ))}
                  {!globalLoading && globalResults.length===0 && <div className="px-3 py-2 text-gray-500">Sem resultados</div>}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {(['ALL','UNREAD','BOT_ON','BOT_OFF'] as const).map(f => (
                <button key={f} onClick={()=>setFilter(f)} className={`px-2 py-1 rounded border ${filter===f ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-900 border-gray-600 text-gray-300 hover:bg-gray-700/40'}`}>{
                  f === 'ALL' ? 'Todos' : f === 'UNREAD' ? 'Não lidas' : f === 'BOT_ON' ? 'Bot ON' : 'Bot OFF'
                }</button>
              ))}
            </div>
          </div>
          <div ref={listRef} className="overflow-y-auto max-h-[65vh] md:max-h-[70vh]">
            {filtered.map((c) => {
              const phone = c.contact;
              const lastMsg = c.messages[c.messages.length - 1];
              const isActive = c.id === activeId;
              const isTyping = typingPhones[normalizePhone(c.contact)];
              const unread = unreads[c.id] || 0
              const isPinned = pinned.has(c.id)
              const updatedAgo = Date.now() - (recentlyUpdated[c.id] || 0)
              const highlight = updatedAgo < highlightMs
              return (
                <button key={c.id} onClick={() => setActiveId(c.id)} className={`group w-full text-left px-4 py-3 border-b border-gray-700 hover:bg-gray-700/40 ${isActive ? 'bg-gray-700/60' : ''} ${highlight ? 'ring-1 ring-blue-500/60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-200 font-medium">{phone}</span>
                      {c.state && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-200 border border-gray-600">{c.state}</span>}
                      <button
                        onClick={(e)=>{ e.stopPropagation(); togglePinned(c.id) }}
                        title={isPinned ? 'Desafixar' : 'Fixar no topo'}
                        className={`text-xs px-1 py-0.5 rounded border ${isPinned ? 'bg-yellow-500/20 text-yellow-300 border-yellow-600' : 'border-gray-600 text-gray-400 hover:text-gray-200'}`}
                      >{isPinned ? '★' : '☆'}</button>
                    </div>
                    <div className="flex items-center gap-2">
                      {unread > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white">{unread}</span>}
                      {!c.botEnabled && <Bot className="w-4 h-4 text-yellow-400" />}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1 truncate">
                    {isTyping ? <span className="italic text-green-300">digitando…</span> : (lastMsg ? `${lastMsg.direction === 'OUT' ? 'Você: ' : ''}${lastMsg.body}` : '—')}
                  </div>
                  {lastMsg && <div className="text-[10px] text-gray-500 mt-0.5">{new Date(lastMsg.timestamp).toLocaleTimeString()}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active chat */}
        <div className="md:col-span-2 bg-gray-800 border-y md:border border-gray-700 min-h-[65vh] md:min-h-[70vh] flex flex-col">
          {activeConv ? (
            <>
              {/* Prepaid banner (operator handoff) */}
              {prepaidNeeded && prepaidNeeded.conversationId === activeConv.id && (
                <div className="px-3 py-2 bg-amber-900/30 border-b border-amber-800 text-amber-200 text-sm flex items-center gap-2">
                  <span>Sem cobertura 24h para {prepaidNeeded.city || 'a cidade'}. Envie um link de pagamento (PIX/Cartão):</span>
                  <input
                    className="flex-1 px-2 py-1 rounded bg-gray-900 border border-amber-700 text-amber-100 placeholder-amber-300/60"
                    placeholder="https://..."
                    value={prepaidLink}
                    onChange={(e)=>setPrepaidLink(e.target.value)}
                  />
                  <button
                    className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs"
                    onClick={async ()=>{
                      try {
                        if (!prepaidLink.trim()) return
                        await fetch(`/api/bot/conversations/${encodeURIComponent(activeConv.id)}/prepaid-link`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link: prepaidLink.trim() })
                        })
                        setPrepaidLink('')
                        setPrepaidNeeded(null)
                      } catch {}
                    }}
                  >Enviar link</button>
                  <button
                    className="px-2 py-1 rounded border border-amber-700 text-amber-200 text-xs hover:bg-amber-800/40"
                    onClick={()=>setPrepaidNeeded(null)}
                  >Dispensar</button>
                </div>
              )}
              <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-200 font-medium">{activeConv.contact}</span>
                  {activeConv.state && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-200 border border-gray-600">{activeConv.state}</span>}
                  <button onClick={()=> setAutoScroll(a=> !a)} className={`ml-2 text-[10px] px-2 py-0.5 rounded border ${autoScroll ? 'bg-green-600/30 border-green-500 text-green-200':'bg-gray-700/40 border-gray-600 text-gray-300'}`} title="Alternar auto-scroll">Auto {autoScroll? 'ON':'OFF'}</button>
                  {pendingNew && !autoScroll && (
                    <button onClick={()=> { const el=document.getElementById('messages-scroll'); if(el){ el.scrollTop = el.scrollHeight }; setPendingNew(false); setAutoScroll(true) }} className="ml-1 animate-pulse text-[10px] px-2 py-0.5 rounded bg-blue-600/30 border border-blue-500 text-blue-100" title="Ir para últimas mensagens">Novas ↓</button>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={() => toggleBot(activeConv)} className="flex items-center text-gray-300 hover:text-white">
                    {activeConv.botEnabled ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    <span className="ml-1 text-xs">Bot</span>
                  </button>
                  <button onClick={()=>{ if(activeConv.id.startsWith('wa:')) { window.open(`/api/bot/whatsapp/phone/${encodeURIComponent(normalizePhone(activeConv.contact))}/export.csv`,'_blank') } else { window.open(`/api/bot/conversations/${encodeURIComponent(activeConv.id)}/export.csv`,'_blank') } }} className="px-2 py-1 rounded bg-gray-700/40 hover:bg-gray-700 text-gray-200 text-xs border border-gray-600">Exportar CSV</button>
                  {!activeConv.id.startsWith('wa:') && (
                    <button onClick={()=> window.open(`/api/bot/conversations/${encodeURIComponent(activeConv.id)}/export.pdf`,'_blank')} className="px-2 py-1 rounded bg-gray-700/40 hover:bg-gray-700 text-gray-200 text-xs border border-gray-600">PDF</button>
                  )}
                  {!activeConv.id.startsWith('wa:') && (
                    <>
                      <button onClick={()=>{ setShowInsights(s=>{ const n=!s; if(n) fetchInsights(); return n }) }} className={`px-2 py-1 rounded text-xs border ${showInsights ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'bg-indigo-600/10 border-indigo-700/40 text-indigo-300 hover:bg-indigo-600/20'}`}>Insights</button>
                      <button onClick={()=>setShowNotes(s=>!s)} className={`px-2 py-1 rounded text-xs border ${showNotes ? 'bg-teal-600/30 border-teal-500 text-teal-300' : 'bg-teal-600/10 border-teal-700/40 text-teal-300 hover:bg-teal-600/20'}`}>Notas</button>
                    </>
                  )}
                  <button onClick={() => quickCreateOrder(activeConv)} className="px-2 py-1 rounded bg-purple-600/20 text-purple-300 text-xs border border-purple-700/40 hover:bg-purple-600/30">Criar Pedido</button>
                  <button
                    onClick={() => resetConversationFresh(activeConv)}
                    disabled={resetting === activeConv.id}
                    className={`px-2 py-1 rounded text-xs border ${resetting === activeConv.id ? 'opacity-60 cursor-not-allowed' : 'hover:bg-yellow-600/20'} bg-yellow-600/10 text-yellow-300 border-yellow-700/40`}
                    title="Limpar e criar conversa nova"
                  >
                    {resetting === activeConv.id ? 'Limpando…' : 'Limpar' }
                  </button>
                  <button
                    onClick={() => deleteConversation(activeConv)}
                    disabled={deleting}
                    className={`px-2 py-1 rounded text-xs border ${deleting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-600/20'} bg-red-600/10 text-red-300 border-red-700/40 inline-flex items-center gap-1`}
                    title="Excluir conversa"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2" id="messages-scroll" ref={(el)=>{ messagesScrollRef.current = el }} onScroll={handleScrollLoadMore}>
                {(() => {
                  const nodes: React.ReactNode[] = []
                  let lastDay: string | null = null
                  for (const m of activeConv.messages) {
                    const day = new Date(m.timestamp).toISOString().slice(0,10)
                    const _d = (()=>{ const d=new Date(m.timestamp); return isNaN(d.getTime())? new Date(): d })()
                    const dayKey = _d.toISOString().slice(0,10)
                    if (dayKey !== lastDay) {
                      lastDay = dayKey
                      nodes.push(
                        <div key={dayKey} className="flex justify-center my-4">
                          <span className="text-[10px] tracking-wide uppercase px-3 py-1 rounded-full bg-gray-700/60 text-gray-300 border border-gray-600">{_d.toLocaleDateString()}</span>
                        </div>
                      )
                    }
                    const isMedia = isMediaMessage(m);
                    const mediaType = getMediaType(m);
                    
                    nodes.push(
                      <div key={m.id} className={`flex ${m.direction === 'IN' ? 'justify-start' : 'justify-end'}`}>
                        <div 
                          className={`rounded-lg px-3 py-2 max-w-[80%] shadow-sm relative ${m.direction === 'IN' ? 'bg-gray-700 text-white' : 'bg-blue-600 text-white'} transition-colors ${isMedia ? 'cursor-pointer hover:opacity-80' : ''}`}
                          onClick={isMedia ? () => openMediaViewer(m) : undefined}
                        > 
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] opacity-60">{new Date(m.timestamp).toLocaleTimeString()}</span>
                          <span className="text-[10px] opacity-60">{_d.toLocaleTimeString()}</span>
                            {m.direction === 'OUT' && (
                              <span className="text-[10px] opacity-80 flex items-center gap-1">
                                Bot
                                {m.status && (
                                  <span className="text-[10px] ml-1" title={m.status}>{statusTicks(m.status)}</span>
                                )}
                              </span>
                            )}
                          </div>
                          {isMedia ? (
                            <div className="space-y-2">
                              {mediaType === 'image' && (
                                <div className="bg-gray-800/50 rounded p-2 border border-gray-600">
                                  <div className="flex items-center gap-2 text-green-400">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm">Imagem</span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">Clique para visualizar</p>
                                </div>
                              )}
                              {mediaType === 'video' && (
                                <div className="bg-gray-800/50 rounded p-2 border border-gray-600">
                                  <div className="flex items-center gap-2 text-blue-400">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm">Vídeo</span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">Clique para reproduzir</p>
                                </div>
                              )}
                              {mediaType === 'audio' && (
                                <div className="bg-gray-800/50 rounded p-2 border border-gray-600">
                                  <div className="flex items-center gap-2 text-purple-400">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm">Áudio</span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">Clique para ouvir</p>
                                </div>
                              )}
                              {!mediaType && (
                                <span className="whitespace-pre-wrap break-words leading-relaxed text-yellow-300">{m.body}</span>
                              )}
                            </div>
                          ) : (
                            <span className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</span>
                          )}
                          {m.direction === 'OUT' && m.status && (
                            <span className="absolute -bottom-3 right-1 text-[9px] opacity-60">{m.status}</span>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return nodes
                })()}
                {pages[activeConv.id]?.loading && (
                  <div className="flex justify-center py-2 text-[11px] text-gray-400">Carregando...</div>
                )}
                {typingPhones[normalizePhone(activeConv.contact)] && (
                  <div className="flex justify-start">
                    <div className="rounded-lg px-3 py-2 bg-gray-700 text-white inline-flex items-center space-x-2">
                      <span className="text-[10px] opacity-60">digitando…</span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                    </div>
                  </div>
                )}
              </div>
              {/* Insights Panel */}
              {showInsights && !activeConv.id.startsWith('wa:') && (
                <div className="border-t border-gray-700 bg-gray-800/70 px-4 py-3 text-xs grid grid-cols-2 gap-4">
                  {insightsLoading && <div className="col-span-2 text-gray-400">Carregando insights...</div>}
                  {insights && (
                    <>
                      <div>
                        <div className="text-gray-400">Stage</div>
                        <div className="text-gray-200 font-semibold text-sm">{insights.stage || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Status</div>
                        <div className="text-gray-200 font-semibold text-sm">{insights.status || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Score</div>
                        <div className="text-green-300 font-semibold text-sm">{insights.score ?? '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Valor Esperado</div>
                        <div className="text-blue-300 font-semibold text-sm">{insights.expectedValue ?? '-'}</div>
                      </div>
                      <div className="col-span-2 text-[10px] text-gray-500">Atualizado: {insights.updatedAt ? new Date(insights.updatedAt).toLocaleString() : '-'}</div>
                    </>
                  )}
                </div>
              )}
              {/* Notes Panel */}
              {showNotes && !activeConv.id.startsWith('wa:') && (
                <div className="border-t border-gray-700 bg-gray-800/60 px-4 py-3 text-xs space-y-2 max-h-56 overflow-y-auto">
                  <div className="flex gap-2">
                    <input value={noteInput} onChange={e=>setNoteInput(e.target.value)} placeholder="Adicionar nota" className="flex-1 px-2 py-1 rounded bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none" />
                    <button onClick={addNote} disabled={!noteInput.trim()} className="px-2 py-1 rounded bg-teal-600/30 hover:bg-teal-600/40 border border-teal-600 text-teal-200 disabled:opacity-40">Salvar</button>
                  </div>
                  {notes.length === 0 && <div className="text-gray-500">Sem notas.</div>}
                  {notes.map(n => (
                    <div key={n.id} className="border border-gray-700/60 rounded p-2 bg-gray-900/60 relative group">
                      <div className="whitespace-pre-wrap text-gray-200 text-[11px] leading-relaxed">{n.note}</div>
                      <div className="text-[9px] text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                      <button onClick={()=>deleteNote(n.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-[10px]">×</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Ações rápidas (somente operador). Envia texto simples para manter aparência humana. */}
              <div className="px-3 pb-2 border-t border-gray-700 bg-gray-800/60">
                <div className="flex gap-2 overflow-x-auto py-2">
                  {QUICK_ACTIONS.map((qa) => (
                    <button key={qa.label} onClick={() => sendQuick(qa.text)} disabled={sending} className={`shrink-0 px-2 py-1 rounded border text-xs ${sending ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-700'} border-gray-600 bg-gray-900 text-gray-200`}>
                      {qa.label}
                    </button>
                  ))}
                  {/* Trigger prepaid intent for this conversation (if needed) */}
                  <button
                    onClick={async ()=>{
                      try {
                        if (!activeConv?.id) return
                        const r = await fetch(`/api/bot/conversations/${encodeURIComponent(activeConv.id)}/prepaid-intent`, { method: 'POST' })
                        if (r.ok) {
                          const d = await r.json()
                          if (d && d.fastEligible === false) {
                            setPrepaidNeeded({ conversationId: activeConv.id, phone: activeConv.contact, city: d?.intent?.city })
                          }
                        }
                      } catch {}
                    }}
                    className={`shrink-0 px-2 py-1 rounded border text-xs hover:bg-gray-700 border-amber-700 bg-gray-900 text-amber-300`}
                    title="Sem cobertura 24h? Criar alerta e solicitar link de pagamento"
                  >Fluxo Antecipado</button>
                </div>
              </div>
              <div className="p-3 border-t border-gray-700 flex items-center space-x-2">
                <input
                  className="flex-1 px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Escreva uma mensagem"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <button onClick={sendMessage} disabled={sending || !inputText.trim()} className={`px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center ${sending ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  <Send className="w-4 h-4 mr-1" />
                  Enviar
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">Selecione uma conversa</div>
          )}
        </div>
      </div>
      
      {/* Media Viewer */}
      {mediaViewer && (
        <MediaViewer
          isOpen={mediaViewer.isOpen}
          mediaUrl={mediaViewer.url}
          mediaType={mediaViewer.type}
          caption={mediaViewer.caption}
          onClose={closeMediaViewer}
        />
      )}
    </div>
  );
}
