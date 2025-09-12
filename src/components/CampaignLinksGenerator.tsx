import React, { useState, useEffect } from 'react'
import { Plus, Link, Copy, Video, Target, BarChart3, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CampaignLink {
  id: string
  videoTitle: string
  videoDescription: string
  videoType: 'depoimento' | 'demonstracao' | 'modelo' | 'custom'
  customContext: string
  identifier: string
  generatedLink: string
  clicks: number
  createdAt: string
  productId?: string
  productName?: string
}

const CampaignLinksGenerator: React.FC = () => {
  const [links, setLinks] = useState<CampaignLink[]>([])
  const [showForm, setShowForm] = useState(false)
  const [products, setProducts] = useState<Array<{id: string, name: string}>>([])
  const [formData, setFormData] = useState<{
    videoTitle: string
    videoDescription: string
    videoType: 'depoimento' | 'demonstracao' | 'modelo' | 'custom'
    customContext: string
    productId: string
  }>({
    videoTitle: '',
    videoDescription: '',
    videoType: 'depoimento',
    customContext: '',
    productId: ''
  })
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Carregar links existentes e produtos ao inicializar
  useEffect(() => {
    const applyPreselect = () => {
      const pre = (window as any).__GA_PRESELECT__
      if (pre?.productId) {
        setFormData(prev => ({ ...prev, productId: pre.productId }))
      }
    }

    const onSwitch = (e: Event) => {
      const detail = (e as CustomEvent).detail as any
      if (detail?.preselect?.productId) {
        setFormData(prev => ({ ...prev, productId: detail.preselect.productId }))
      }
    }

    const loadData = async () => {
      try {
        // Carregar links
        const linksResponse = await fetch('/api/campaign-links')
        if (linksResponse.ok) {
          const linksData = await linksResponse.json()
          if (linksData.success && linksData.links) {
            setLinks(linksData.links)
          }
        }
        
        // Carregar produtos
        const productsResponse = await fetch('/api/products')
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          const arr = Array.isArray(productsData) ? productsData : (productsData.products || [])
          setProducts(arr.map((p: any) => ({ id: p.id, name: p.name })))
        }
      } catch (error) {
        console.log('Carregando dados localmente...') // Fallback silencioso
      }
      applyPreselect()
    }
    
    window.addEventListener('ga:switch-tab', onSwitch as EventListener)
    loadData()
    return () => window.removeEventListener('ga:switch-tab', onSwitch as EventListener)
  }, [])

  const videoTypes = [
    {
      value: 'depoimento' as const,
      label: 'Depoimento de Cliente',
      context: 'Cliente veio através do depoimento de cliente satisfeita. Foque nos resultados de modelagem corporal e autoestima. Mencione que outras clientes tiveram sucesso similar.',
      icon: '👥'
    },
    {
      value: 'demonstracao' as const,
      label: 'Demonstração do Produto',
      context: 'Cliente veio através do vídeo demonstrativo do produto. Foque na qualidade, tecnologia e como funciona na prática. Cliente já viu o produto em ação.',
      icon: '🎯'
    },
    {
      value: 'modelo' as const,
      label: 'Modelo/Resultado',
      context: 'Cliente veio através do vídeo da modelo fitness. Foque nos resultados estéticos, modelagem do corpo e confiança. Cliente busca resultados visíveis.',
      icon: '💪'
    },
    {
      value: 'custom' as const,
      label: 'Personalizado',
      context: '',
      icon: '⚡'
    }
  ]

  const generateIdentifier = (title: string, type: string): string => {
    const timestamp = Date.now().toString(36)
    const titleSlug = title.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 10)
    return `${type}_${titleSlug}_${timestamp}`
  }

  const generateLink = (identifier: string, videoType: string, productId?: string): string => {
    const whatsappNumber = '554195068982' // Número do bot de vendas
    const message = encodeURIComponent(`Olá! Vi seu vídeo e gostaria de saber mais sobre a calcinha modeladora! [${identifier.toUpperCase()}]`)
    
    // Adicionar parâmetros UTM para rastreamento e ML (WhatsApp ignora, mas analytics capturam)
    const utmParams = new URLSearchParams({
      utm_source: 'video_campaign',
      utm_medium: videoType,
      utm_campaign: identifier.toLowerCase(),
      utm_content: productId || 'calcinha_lipo',
      utm_term: 'modeladora'
    })
    
    // Link wa.me direto COM UTMs para tracking
    return `https://wa.me/${whatsappNumber}?text=${message}&${utmParams.toString()}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.videoTitle.trim()) {
      toast.error('Título do vídeo é obrigatório')
      return
    }

    const identifier = generateIdentifier(formData.videoTitle, formData.videoType)
    const generatedLink = generateLink(identifier, formData.videoType, formData.productId)
    
    const selectedType = videoTypes.find(t => t.value === formData.videoType)
    const context = formData.videoType === 'custom' ? formData.customContext : selectedType?.context || ''

    const newLink: CampaignLink = {
      id: identifier,
      videoTitle: formData.videoTitle,
      videoDescription: formData.videoDescription,
      videoType: formData.videoType,
      customContext: context,
      identifier: identifier.toUpperCase(),
      generatedLink,
      clicks: 0,
      createdAt: new Date().toISOString(),
      productId: formData.productId || undefined,
      productName: products.find(p => p.id === formData.productId)?.name
    }

    // Salvar no backend (API call)
    try {
      const response = await fetch('/api/campaign-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLink,
          linkedProductId: newLink.productId,
          productName: newLink.productName
        })
      })
      
      if (response.ok) {
        setLinks(prev => [newLink, ...prev])
        setFormData({
          videoTitle: '',
          videoDescription: '',
          videoType: 'depoimento',
          customContext: '',
          productId: ''
        })
        setShowForm(false)
        toast.success('Link de campanha criado com sucesso!')

        // Opcional: notificar ML do vínculo do produto com este identificador de campanha
        try {
          await fetch('/api/update-cod-cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignIdentifier: newLink.identifier,
              productId: newLink.productId,
              // Sinal leve para o contexto: tipo de origem
              source: 'campaign_link'
            })
          })
        } catch {}
      }
    } catch (error) {
      // Fallback: salvar localmente
      setLinks(prev => [newLink, ...prev])
      setFormData({
        videoTitle: '',
        videoDescription: '',
        videoType: 'depoimento',
        customContext: '',
        productId: ''
      })
      setShowForm(false)
      toast.success('Link de campanha criado!')
    }
  }

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLink(link)
      toast.success('Link copiado!')
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (error) {
      toast.error('Erro ao copiar link')
    }
  }

  const selectedType = videoTypes.find(t => t.value === formData.videoType)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Link className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Gerador de Links de Campanha
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Crie links inteligentes que alimentam todo o sistema de ML
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span>Criar Link</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Links</p>
              <p className="text-2xl font-bold text-purple-400">{links.length}</p>
            </div>
            <Video className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-pink-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Cliques</p>
              <p className="text-2xl font-bold text-pink-400">{links.reduce((sum, link) => sum + link.clicks, 0)}</p>
            </div>
            <Target className="w-8 h-8 text-pink-400" />
          </div>
        </div>
        
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-cyan-400">
                {links.length > 0 ? `${((links.reduce((sum, link) => sum + link.clicks, 0) / links.length) * 100).toFixed(1)}%` : '0%'}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-cyan-400" />
          </div>
        </div>
        
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Melhor Performance</p>
              <p className="text-2xl font-bold text-emerald-400">
                {links.length > 0 ? Math.max(...links.map(l => l.clicks)) : 0}
              </p>
            </div>
            <div className="text-2xl">🏆</div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Criar Novo Link de Campanha</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Título do Vídeo */}
              <div>
                <label className="block text-sm font-medium mb-2">Título do Vídeo *</label>
                <input
                  type="text"
                  value={formData.videoTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoTitle: e.target.value }))}
                  placeholder="Ex: Cliente perdeu 15kg em 30 dias"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium mb-2">Descrição do Vídeo</label>
                <textarea
                  value={formData.videoDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoDescription: e.target.value }))}
                  placeholder="Descreva brevemente o conteúdo do vídeo..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Produto Vinculado */}
              <div>
                <label className="block text-sm font-medium mb-2">Produto Vinculado</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Selecione um produto (opcional)</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  O produto selecionado será oferecido pelo bot quando o cliente clicar no link
                </p>
              </div>

              {/* Tipo de Vídeo */}
              <div>
                <label className="block text-sm font-medium mb-3">Tipo de Vídeo</label>
                <div className="grid grid-cols-2 gap-3">
                  {videoTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, videoType: type.value }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.videoType === type.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{type.icon}</div>
                      <div className="text-sm font-medium">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contexto Personalizado */}
              {formData.videoType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Contexto Personalizado *</label>
                  <textarea
                    value={formData.customContext}
                    onChange={(e) => setFormData(prev => ({ ...prev, customContext: e.target.value }))}
                    placeholder="Descreva como o bot deve abordar clientes que vieram deste vídeo..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              {/* Preview do Contexto */}
              {selectedType?.context && formData.videoType !== 'custom' && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                  <h4 className="font-medium text-purple-400 mb-2">Contexto que será usado pelo Bot:</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedType.context}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Criar Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Links List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Links Criados ({links.length})</h2>
        
        {links.length === 0 ? (
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-12 text-center border border-gray-200/20">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              Nenhum link criado ainda
            </h3>
            <p className="text-gray-500 mb-6">
              Comece criando seu primeiro link de campanha para rastrear a origem dos seus clientes
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              Criar Primeiro Link
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {links.map((link) => (
              <div key={link.id} className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-gray-200/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="text-2xl">
                        {videoTypes.find(t => t.value === link.videoType)?.icon || '📹'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{link.videoTitle}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>Tipo: {videoTypes.find(t => t.value === link.videoType)?.label}</span>
                          <span>•</span>
                          <span>ID: {link.identifier}</span>
                          <span>•</span>
                          <span>{link.clicks} cliques</span>
                        </div>
                      </div>
                    </div>
                    
                    {link.videoDescription && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{link.videoDescription}</p>
                    )}
                    
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium mb-1">Link da Campanha:</p>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 text-xs bg-white dark:bg-gray-900 p-2 rounded border text-blue-600 dark:text-blue-400 overflow-x-auto">
                          {link.generatedLink}
                        </code>
                        <button
                          onClick={() => copyLink(link.generatedLink)}
                          className={`p-2 rounded-lg transition-all ${
                            copiedLink === link.generatedLink
                              ? 'bg-green-500 text-white'
                              : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {copiedLink === link.generatedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {link.productName && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Produto vinculado: <span className="font-medium">{link.productName}</span>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-1">Contexto do Bot:</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">{link.customContext}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CampaignLinksGenerator
