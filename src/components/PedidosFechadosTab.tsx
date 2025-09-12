import React from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function PedidosFechadosTab(){
  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2 text-green-400"><CheckCircle2 className="w-5 h-5"/> Pedidos Fechados</h3>
      <p className="text-xs text-gray-400">Lista real de pedidos a integrar com endpoint /api/orders?status=closed</p>
      <div className="text-sm text-gray-500">Nenhum pedido carregado (implementação pendente).</div>
    </div>
  )
}
