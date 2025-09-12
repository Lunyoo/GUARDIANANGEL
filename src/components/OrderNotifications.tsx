import React, { useEffect, useState } from 'react'

interface OrderNote { id:string; message:string; ts:number }

export default function OrderNotifications(){
  const [notes,setNotes]=useState<OrderNote[]>([])

  useEffect(()=>{
    let cancelled=false
    async function poll(){
      try {
        const r = await fetch('/api/orders/notifications')
        if(!r.ok) return
        const j = await r.json()
        if(!cancelled && Array.isArray(j.notifications)) setNotes(j.notifications.slice(-5))
      } catch {/* ignore */}
    }
    poll()
    const id = setInterval(poll, 15000)
    return ()=>{ cancelled=true; clearInterval(id) }
  },[])

  if(!notes.length) return null
  return (
    <div className="fixed bottom-4 right-4 w-72 space-y-3 z-40">
      {notes.map(n=> (
        <div key={n.id} className="p-3 rounded-lg bg-gray-900/80 border border-cyan-500/30 text-xs text-gray-300 shadow-lg">
          <div className="font-semibold text-cyan-300 mb-1">Novo Pedido</div>
          <div>{n.message}</div>
          <div className="mt-1 text-[10px] text-gray-500">{new Date(n.ts).toLocaleTimeString()}</div>
        </div>
      ))}
    </div>
  )
}
