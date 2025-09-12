import React from 'react'

export default function FacebookWizard(){
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Facebook Wizard</h2>
      <p className="text-sm text-gray-400">Assistente para criação de campanhas no Facebook. Implementar passos: objetivo, público, criativos, orçamento.</p>
      <div className="text-xs text-gray-500">Endpoint alvo: /api/campaigns/facebook (POST)</div>
    </div>
  )
}
