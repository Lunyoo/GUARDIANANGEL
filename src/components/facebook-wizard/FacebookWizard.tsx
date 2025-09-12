// Clean unified implementation (duplicate-free)
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Upload, Send, Bot, User, Eye, Brain, Zap, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatMessage { id:string; type:'user'|'ai'; content:string; timestamp:Date; images?:string[]; analyzed?:boolean; mode?:string; meta?:Record<string,any>; }
interface UploadedAsset { id:string; file:File; type:'image'|'video'; preview:string; base64?:string; status:'pending'|'ready'|'error'; }
interface ChatState { messages:ChatMessage[]; sessionId:string; lastUpdated:string }
const STORAGE_KEY='facebook-wizard-chat-state'

export default function FacebookWizard(){
  const [messages,setMessages]=useState<ChatMessage[]>([])
  const [currentMessage,setCurrentMessage]=useState('')
  const [assets,setAssets]=useState<UploadedAsset[]>([])
  const [isAnalyzing,setIsAnalyzing]=useState(false)
  const [isUploading,setIsUploading]=useState(false)
  const [declaredBudget,setDeclaredBudget]=useState('')
  const [pendingAction,setPendingAction]=useState<string|null>(null)
  const [dragActive,setDragActive]=useState(false)
  const [mlStats,setMlStats]=useState<any>(null)
  const [mlLastFetched,setMlLastFetched]=useState(0)
  const [foldedSections,setFoldedSections]=useState<Record<string,boolean>>({})
  const [sessionId]=useState(()=>`session-${Date.now()}-${Math.random().toString(36).slice(2,9)}`)
  const fileInputRef=useRef<HTMLInputElement>(null)
  const messagesEndRef=useRef<HTMLDivElement>(null)

  const saveState=useCallback((newMessages:ChatMessage[])=>{const st:ChatState={messages:newMessages,sessionId,lastUpdated:new Date().toISOString()}; try{localStorage.setItem(STORAGE_KEY,JSON.stringify(st))}catch{}},[sessionId])
  const loadState=useCallback(()=>{try{const raw=localStorage.getItem(STORAGE_KEY); if(!raw)return null; const parsed=JSON.parse(raw) as ChatState; if(Date.now()-new Date(parsed.lastUpdated).getTime()>86400000) return null; return parsed;}catch{return null}},[])
  const welcome=useCallback(()=>{const w:ChatMessage={id:'msg-'+Date.now(),type:'ai',timestamp:new Date(),content:'🚀 Bem-vindo! Envie prints / defina budget e peça: blueprint, auditoria, distribuição, ângulos.'}; setMessages([w]); saveState([w])},[saveState])
  const init=useCallback(()=>{const stored=loadState(); if(stored){setMessages(stored.messages.map(m=>({...m,timestamp:new Date(m.timestamp)})))} else {welcome()}},[loadState,welcome])
  const clearHistory=()=>{localStorage.removeItem(STORAGE_KEY); welcome(); setAssets([])}

  useEffect(init,[init])
  useEffect(()=>{messagesEndRef.current?.scrollIntoView({behavior:'smooth'})},[messages])
  useEffect(()=>{let active=true; const fetchStats=async()=>{try{const r=await fetch('/api/ops/dashboard'); if(!r.ok)throw 0; const d=await r.json(); if(active){setMlStats(d); setMlLastFetched(Date.now())}}catch{if(active) setMlStats(null)}}; fetchStats(); const id=setInterval(fetchStats,20000); return()=>{active=false; clearInterval(id)}},[])

  const healthBadge=()=>{ if(!mlStats) return <span className="px-2 py-1 text-[10px] rounded bg-gray-700 text-gray-300">ML...</span>; const s=mlStats.health?.status||'unknown'; const color=s==='green'?'bg-green-600':s==='yellow'?'bg-yellow-600':'bg-red-600'; return <span className={`px-2 py-1 text-[10px] rounded ${color} text-white`}>ML {s.toUpperCase()} {mlStats.health?.score}</span> }
  const budgetSummary=()=>{const num=parseFloat(declaredBudget.replace(/[^0-9,.]/g,'').replace(',','.')); if(!num) return null; const test=Math.max(20,Math.round(num*0.25)); const scale=Math.round(num*0.5); const ret=Math.max(0,num-test-scale); return <span className="text-[10px] text-blue-300">Dist: Test {test} • Scale {scale} • Retarg {ret}</span>}
  const toggleSection=(id:string)=>setFoldedSections(f=>({...f,[id]:!f[id]}))
  const renderMessageContent=(m:ChatMessage)=>{ if(m.type==='user') return <span className="whitespace-pre-wrap">{m.content}</span>; const lines=m.content.split(/\n/); const parts:{id:string;title:string;body:string[]}[]=[]; let current:any=null; let idx=0; for(const line of lines){ if(/^#{1,3}\s|^\*\*.+\*\*:|^\*\*[A-ZÁÃÂ]/.test(line.trim())){ if(current) parts.push(current); current={id:'sec'+(idx++),title:line.replace(/^#+\s*/,'').replace(/\*\*/g,''),body:[]} } else { if(!current) current={id:'sec'+(idx++),title:'Resposta',body:[]}; current.body.push(line)} } if(current) parts.push(current); return <div className="space-y-2">{parts.map(p=>{const folded=foldedSections[p.id]; return <div key={p.id} className="border border-gray-700/60 rounded-md bg-gray-800/60"><button onClick={()=>toggleSection(p.id)} className="w-full text-left px-2 py-1 text-xs font-semibold flex items-center justify-between hover:bg-gray-700/40"><span>{p.title}</span><span className="text-[10px] text-gray-400">{folded?'+':'−'}</span></button>{!folded && <div className="px-3 pt-1 pb-2 text-xs whitespace-pre-wrap text-gray-300 leading-relaxed">{p.body.join('\n')}</div>}</div>})}</div> }

  const fileToBase64=(file:File)=>new Promise<string>((res,rej)=>{const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=()=>rej(r.error); r.readAsDataURL(file)})
  const processFiles=async(files:File[])=>{ if(!files.length)return; setIsUploading(true); const list:UploadedAsset[]=[]; for(const file of files){ const type: 'image'|'video'= file.type.startsWith('video')?'video':'image'; const asset:UploadedAsset={id:'asset-'+Math.random().toString(36).slice(2,9),file,type,preview:URL.createObjectURL(file),status:'pending'}; list.push(asset); if(type==='image'){ try{asset.base64=await fileToBase64(file); asset.status='ready'}catch{asset.status='error'} } else { asset.status='ready' } } setAssets(a=>[...a,...list]); setIsUploading(false) }
  const handleFileInput=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files; if(!f)return; processFiles(Array.from(f)); e.target.value=''}
  const removeAsset=(id:string)=>setAssets(a=>a.filter(x=>x.id!==id))
  const onDragOver=(e:React.DragEvent)=>{e.preventDefault(); setDragActive(true)}
  const onDragLeave=(e:React.DragEvent)=>{e.preventDefault(); setDragActive(false)}
  const onDrop=(e:React.DragEvent)=>{e.preventDefault(); setDragActive(false); processFiles(Array.from(e.dataTransfer.files))}
  useEffect(()=>{const h=(e:ClipboardEvent)=>{if(!e.clipboardData)return; const files=Array.from(e.clipboardData.items).filter(i=>i.kind==='file').map(i=>i.getAsFile()).filter((f):f is File=>!!f); if(files.length) processFiles(files)}; window.addEventListener('paste',h); return()=>window.removeEventListener('paste',h)},[])

  const addAIMessage=(content:string,mode?:string,meta?:Record<string,any>)=>
    setMessages(p=>{
      const aiMsg:ChatMessage={id:'msg-'+Date.now()+Math.random().toString(36).slice(2,6),type:'ai',content,timestamp:new Date(),mode,meta}
      const next:ChatMessage[]=[...p,aiMsg]
      saveState(next); return next
    })
  const addUserMessage=(content:string,images?:string[])=>
    setMessages(p=>{
      const userMsg:ChatMessage={id:'msg-'+Date.now()+Math.random().toString(36).slice(2,6),type:'user',content,timestamp:new Date(),images}
      const next:ChatMessage[]=[...p,userMsg]
      saveState(next); return next
    })
  const handleSendMessage=async()=>{ if(!currentMessage.trim())return; const text=currentMessage.trim(); setCurrentMessage(''); addUserMessage(text); await sendToServer(text) }
  const handleKeyPress=(e:React.KeyboardEvent<HTMLInputElement>)=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSendMessage() } }
  const sendToServer=async(text:string)=>{ try{ const payload={ message:text, history:messages.slice(-25).map(m=>({role:m.type==='user'?'user':'assistant',content:m.content})), budget:declaredBudget, images:assets.filter(a=>a.type==='image'&&a.base64).map(a=>({data:a.base64,name:a.file.name})), videos:assets.filter(a=>a.type==='video').map(a=>({name:a.file.name,size:a.file.size})) }; const r=await fetch('/api/facebook-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const data=await r.json().catch(()=>({message:'Erro de resposta'})); addAIMessage(data.message||data.response||'Sem resposta.',data.mode,{raw:data}) }catch{ addAIMessage('⚠️ Erro ao conectar com servidor.') } }
  const generateStrategy=(label:string)=>{ const prompt=`${label}: considere budget ${declaredBudget||'não informado'} e contexto.`; setCurrentMessage(prompt); handleSendMessage() }
  const analyzeAssets=async()=>{ if(!assets.length)return; setIsAnalyzing(true); addAIMessage('🔎 Analisando assets...','analyze'); try{ const synthetic='Auditoria Criativa:\n'+assets.map((a,i)=>`Asset ${i+1} (${a.type}): Força: ${a.type==='image'?'Visual claro':'Vídeo curto'}, Ações: Testar CTA novo, otimizar hook inicial.`).join('\n')+'\nPrioridades: duplicar top CTR; cortar baixo engajamento; novos ângulos.'; addAIMessage(synthetic,'creative_audit'); setAssets(a=>a.map(x=>({...x,status:'ready'}))) } finally { setIsAnalyzing(false) } }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white px-2 md:px-4 py-4">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4">
        {/* Main Chat Column */}
        <div className="col-span-12 lg:col-span-8 flex flex-col h-[86vh]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg"><Brain className="w-7 h-7"/></div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold flex items-center gap-2">Assistente Estratégico • Calcinha Lipo <Zap className="w-4 h-4 text-yellow-400"/></h1>
              <div className="flex flex-wrap gap-2 mt-1 items-center text-[10px]">
                {healthBadge()}
                {mlStats && <span className="px-2 py-1 rounded bg-gray-700 text-gray-200">ROAS {mlStats.allocator?.overallROAS?.toFixed?.(2) ?? '—'}</span>}
                {mlStats && <span className="px-2 py-1 rounded bg-gray-700 text-gray-200">Div {mlStats.allocator?.diversificationScore?.toFixed?.(2) ?? '—'}</span>}
                {budgetSummary()}
                {isAnalyzing && <span className="px-2 py-1 rounded bg-blue-600/70 animate-pulse">Analisando...</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-gray-600 bg-gray-800 hover:bg-gray-700" onClick={clearHistory}><RotateCcw className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" className="border-gray-600 bg-gray-800 hover:bg-gray-700" onClick={()=>fileInputRef.current?.click()}><Upload className="w-4 h-4"/></Button>
            </div>
          </div>
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500" disabled={pendingAction==='strategy'} onClick={()=>{ setPendingAction('strategy'); generateStrategy('Estratégia completa'); setTimeout(()=>setPendingAction(null),1200) }}>Blueprint</Button>
            <Button size="sm" className="bg-blue-700 hover:bg-blue-600" disabled={!assets.length || isAnalyzing} onClick={analyzeAssets}>Auditar Assets</Button>
            <Button size="sm" className="bg-slate-700 hover:bg-slate-600" onClick={()=> addAIMessage('📌 Dicas: cole prints (Ctrl+V); peça "distribuir orçamento"; peça novos ângulos; informe budget.','hint')}>Sugestões</Button>
            <div className="flex items-center gap-1">
              <Input value={declaredBudget} onChange={e=> setDeclaredBudget(e.target.value)} placeholder="Budget R$" className="h-8 w-28 bg-gray-800/70 border-gray-600 text-xs" />
              <Button size="sm" className="h-8 bg-gray-700 hover:bg-gray-600" disabled={!declaredBudget} onClick={()=> declaredBudget && addAIMessage(`💰 Budget definido: ${declaredBudget}`,'budget')}>Fixar</Button>
            </div>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-gray-800 bg-gradient-to-b from-gray-900/70 to-gray-900/30 p-4 space-y-4">
            <AnimatePresence>
              {messages.map(m => (
                <motion.div key={m.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className={`flex gap-3 ${m.type==='user'?'justify-end':'justify-start'}`}>
                  {m.type==='ai' && <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow"><Bot className="w-4 h-4"/></div>}
                  <div className={`max-w-xl ${m.type==='user'?'order-1':''}`}>
                    <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed shadow ${m.type==='user'?'bg-gradient-to-r from-indigo-600 to-blue-600 text-white':'bg-gray-800/80 border border-gray-700 text-gray-100'}`}>
                      {m.images && m.images.length>0 && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {m.images.map((img,i)=>(<div key={i} className="relative group"><img src={img} className="w-full h-24 object-cover rounded border border-gray-600" />{m.analyzed && <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full"/>}</div>))}
                        </div>
                      )}
                      {m.mode && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-700/30 border border-blue-600 text-blue-300 mr-2 uppercase tracking-wide">{m.mode}</span>}
                      {renderMessageContent(m)}
                    </div>
                    <div className={`mt-1 text-[10px] text-gray-500 ${m.type==='user'?'text-right':''}`}>{m.timestamp.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  {m.type==='user' && <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center"><User className="w-4 h-4 text-gray-200"/></div>}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
          {/* Composer */}
          <div className="mt-3 flex gap-2 items-end">
            <div className="flex-1">
              <Input value={currentMessage} onChange={e=> setCurrentMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder="Digite pergunta ou cole imagens (Ctrl+V)..." className="bg-gray-800/70 border-gray-700 text-white placeholder-gray-500" />
            </div>
            <Button onClick={handleSendMessage} disabled={!currentMessage.trim() || isAnalyzing} className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6"> <Send className="w-4 h-4"/> </Button>
          </div>
          <div className="mt-1 text-[10px] text-gray-500 flex gap-4 flex-wrap">
            <span>Enter envia</span>
            <span>Ctrl+V cola imagens</span>
            <span>Blueprint = estratégia completa</span>
            <span>Analisar = auditoria criativa</span>
          </div>
        </div>
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 flex flex-col h-[86vh]">
          <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} className={`border-2 border-dashed rounded-lg p-3 text-xs mb-4 transition relative cursor-pointer ${dragActive?'border-blue-500 bg-blue-500/10':'border-gray-700 bg-gray-900/40 hover:border-gray-500'}`} onClick={()=>fileInputRef.current?.click()}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-gray-200">Assets ({assets.length})</span>
              <div className="flex gap-2">
                {!!assets.length && <Button size="sm" className="h-7 bg-gray-700 hover:bg-gray-600" disabled={isAnalyzing || isUploading || assets.some(a=>a.status==='pending')} onClick={analyzeAssets}>{isAnalyzing?'Analisando':'Auditar'}</Button>}
                <Button size="sm" variant="outline" className="h-7 border-gray-600 text-gray-300 hover:bg-gray-700" onClick={()=> setAssets([])}>Limpar</Button>
              </div>
            </div>
            {!assets.length && !isUploading && <div className="text-gray-500">Arraste / clique / Ctrl+V imagens e vídeos</div>}
            {isUploading && <div className="text-blue-400 animate-pulse">Processando...</div>}
            {!!assets.length && (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto mt-2 pr-1">
                {assets.map(a=> (
                  <div key={a.id} className="relative group">
                    {a.type==='image'? <img src={a.preview} className="w-full h-20 object-cover rounded border border-gray-600"/> : <video src={a.preview} className="w-full h-20 object-cover rounded border border-gray-600"/>}
                    <button onClick={(e)=> { e.stopPropagation(); removeAsset(a.id) }} className="absolute top-1 right-1 bg-black/60 text-[9px] px-1 rounded opacity-0 group-hover:opacity-100">✕</button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] px-1 rounded">{a.type==='video'?'VID':'IMG'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto rounded-lg border border-gray-800 bg-gray-900/40 p-3 text-xs space-y-4">
            <div>
              <h2 className="font-semibold mb-1 text-gray-200 flex items-center gap-2"><Eye className="w-3 h-3"/> Insights Rápidos</h2>
              <ul className="list-disc ml-5 space-y-1 text-gray-400">
                <li>Use múltiplos ângulos (Efeito Lipo, Pós-Parto, Economia Cirúrgica).</li>
                <li>CTR alvo ≥ 4.5% • CPC ≤ R$1,40 • ROAS inicial ≥ 3.0.</li>
                <li>Duplicar top criativo após 1.5x CPA meta.</li>
                <li>Teste 25% orçamento em novos criativos continuamente.</li>
              </ul>
            </div>
            {mlStats && (
              <div>
                <h2 className="font-semibold mb-1 text-gray-200">ML / Sistema</h2>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-gray-800/60 rounded p-2"><div className="text-gray-400">Decisões</div><div className="font-semibold">{mlStats.allocator?.decisionCount ?? '—'}</div></div>
                  <div className="bg-gray-800/60 rounded p-2"><div className="text-gray-400">Warmup</div><div className="font-semibold">{mlStats.allocator?.warmupMode? 'SIM':'NÃO'}</div></div>
                  <div className="bg-gray-800/60 rounded p-2"><div className="text-gray-400">Anomalias High</div><div className={`font-semibold ${(mlStats.anomalies?.high||0)>0?'text-yellow-300':'text-green-400'}`}>{mlStats.anomalies?.high ?? 0}</div></div>
                  <div className="bg-gray-800/60 rounded p-2"><div className="text-gray-400">Lag (ms)</div><div className="font-semibold">{mlStats.eventLoopLagMs}</div></div>
                </div>
              </div>
            )}
            <div>
              <h2 className="font-semibold mb-1 text-gray-200">Ações Rápidas</h2>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="bg-gray-700 hover:bg-gray-600" onClick={()=> addAIMessage('📌 Pergunte por "auditoria criativa" para priorizar cortes e duplicações.','hint')}>Auditoria</Button>
                <Button size="sm" className="bg-gray-700 hover:bg-gray-600" onClick={()=> addAIMessage('📌 Use "distribuir orçamento" para sugerir buckets detalhados.','hint')}>Distribuição</Button>
                <Button size="sm" className="bg-gray-700 hover:bg-gray-600" onClick={()=> addAIMessage('📌 Peça "novos ângulos" para geração incremental.','hint')}>Ângulos</Button>
              </div>
            </div>
            <div className="text-[10px] text-gray-500">Última sync ML: {mlLastFetched? new Date(mlLastFetched).toLocaleTimeString('pt-BR'):'—'}</div>
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileInput} className="hidden" />
    </div>
  )
}
