import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  Plus, 
  Edit, 
  MapPin, 
  DollarSign, 
  FileText,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Video,
  Camera
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  cost: number
  category: string
  status: 'active' | 'inactive' | 'draft'
  images: string[]
  videos: string[]
  colors: ProductColor[]
  cities: CityData[]
  clientPrompt?: string
  sales_data: {
    total_sales: number
    total_revenue: number
    avg_rating: number
    reviews_count: number
    conversion_rate: number
  }
  created_at: Date
  updated_at: Date
}

interface ProductColor {
  name: string
  hex: string
  images: string[]
  available: boolean
}

interface CityData {
  city: string
  state: string
  demand: number
  avg_delivery_time: number
  cod_success_rate: number
  popular_variants: string[]
  monthly_sales: number
  growth_rate: number
}

const ModernProductsSimplified: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [allCodCities, setAllCodCities] = useState<{ label:string; city:string; state:string }[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Estados para calcinha
  const [calcinhaOptions, setCalcinhaOptions] = useState<any>(null)
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading')

  async function loadProducts(cancelledRef?: { current: boolean }) {
    try {
      setIsLoading(true)
      const r = await fetch('/api/products')
      if (!r.ok) throw new Error('Falha ao carregar produtos')
      const j = await r.json()
      const list: Product[] = (j || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: typeof p.price === 'number' ? p.price : (p.originalPrice || 0),
        cost: p.cost || 0,
        category: p.category || 'geral',
        status: (p.inStock === false ? 'inactive' : 'active') as any,
        images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? p.images.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
        videos: [],
        colors: [
          { 
            id: 'nude',
            name: 'Nude', 
            hex: '#F5DEB3', 
            images: [
              '/api/media/products/prod-calcinha-3un-179/images/1756306102455-1tdfcaqhcy1.jpeg',
              '/api/media/products/prod-calcinha-3un-179/images/1756306102522-m1zaug7xafb.jpeg'
            ], 
            available: true 
          },
          { 
            id: 'preta',
            name: 'Preta', 
            hex: '#1A1A1A', 
            images: [
              '/api/media/products/prod-calcinha-3un-179/images/1756306129654-g15ft3ilq9.jpeg',
              '/api/media/products/prod-calcinha-3un-179/images/1756304757819-oos7wm8n5lk.jpeg'
            ], 
            available: true 
          }
        ],
        cities: (Array.isArray(p.codCities) ? p.codCities : []).map((c: string) => ({ 
          city: c.split(' - ')[0] || c, 
          state: (c.split(' - ')[1] || '').toUpperCase(), 
          demand: 0, 
          avg_delivery_time: 0, 
          cod_success_rate: 0.8, 
          popular_variants: [], 
          monthly_sales: 0, 
          growth_rate: 0 
        })),
        clientPrompt: p.clientPrompt || undefined,
        sales_data: { 
          total_sales: p.sales || 0, 
          total_revenue: (typeof p.price === 'number' ? p.price : 0) * (p.sales || 0), 
          avg_rating: p.rating || 4.6, 
          reviews_count: p.reviews || 50, 
          conversion_rate: 0.1 
        },
        created_at: new Date(p.createdAt || Date.now()),
        updated_at: new Date(p.updatedAt || Date.now())
      }))
      
      // Filtrar apenas produtos da calcinha e remover duplicatas - manter apenas o principal
      let calcinhaProducts = list.filter(p => /calcinha|lipo/i.test(p.name))
      
      // Se há múltiplos produtos de calcinha, manter apenas o principal (unified)
      if (calcinhaProducts.length > 1) {
        const mainProduct = calcinhaProducts.find(p => p.id.includes('unified')) || calcinhaProducts[0]
        calcinhaProducts = [mainProduct]
      }
      
      if (!cancelledRef?.current) {
        setProducts(calcinhaProducts)
      }
    } catch (e) { 
      if (!cancelledRef?.current) setProducts([]) 
    } finally { 
      setIsLoading(false) 
    }
  }

  // Função para carregar mídias reais do backend
  const loadRealMediaFromBackend = async () => {
    try {
      const response = await fetch('/api/media/products/prod-calcinha-3un-179/list')
      const data = await response.json()
      
      if (data.success && data.images.length > 0) {
        return data.images
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mídias:', error)
    }
    
    // Fallback para URLs diretas se a API falhar
    return [
      '/api/media/products/prod-calcinha-3un-179/images/1736781004584_6f2e1b3d.jpg',
      '/api/media/products/prod-calcinha-3un-179/images/1736781005145_8a7c9d4e.jpg',
      '/api/media/products/prod-calcinha-3un-179/images/1736781005706_2b8f5c1a.jpg',
      '/api/media/products/prod-calcinha-3un-179/images/1736781006267_9e3a6b7d.jpg',
      '/api/media/products/prod-calcinha-3un-179/images/1736781006828_4d1f8c2b.jpg',
      '/api/media/products/prod-calcinha-3un-179/images/1736781007389_7a5e9f3c.jpg',
      '/api/media/products/prod-calcinha-3un-179/images/1736781007950_1c6b4a8e.jpg',
      '/api/media/products/prod-calcinha-3un-179/images/1736781008511_5f2d7c9a.jpg',
      '/api/media/products/prod-calcinha-3un-179/images/1736781009072_8b4e1f6d.jpg',
      '/api/media/products/prod-calcinha-3un-179/images/1736781009633_3a7c5e2b.jpg'
    ]
  }  // 🎨 Cores com imagens reais
  const realColors: ProductColor[] = [
    {
      id: 'nude',
      name: 'Nude',
      hex: '#F5DEB3',
      images: [
        '/api/media/products/prod-calcinha-3un-179/images/1756306102455-1tdfcaqhcy1.jpeg',
        '/api/media/products/prod-calcinha-3un-179/images/1756306102522-m1zaug7xafb.jpeg'
      ]
    },
    {
      id: 'preta',
      name: 'Preta', 
      hex: '#000000',
      images: [
        '/api/media/products/prod-calcinha-3un-179/images/1756306129654-g15ft3ilq9.jpeg',
        '/api/media/products/prod-calcinha-3un-179/images/1756304757819-oos7wm8n5lk.jpeg'
      ]
    }
  ]

  // Carregar produtos reais do backend
  useEffect(() => {
    const cancelled = { current:false }
    loadProducts(cancelled)
    const id=setInterval(()=>loadProducts(cancelled), 60000)
    return ()=>{ cancelled.current=true; clearInterval(id) }
  }, [])

  // Load available COD cities catalog for selection
  useEffect(()=>{ 
    let stop=false; 
    (async()=>{
      try { 
        const r=await fetch('/api/cod-cities/all-flat'); 
        if(r.ok){ 
          const j=await r.json(); 
          if(!stop) setAllCodCities(j.cities||[]) 
        } 
      } catch{}
    })(); 
    return ()=>{ stop=true }
  },[])

  // Load calcinha ML pricing options
  useEffect(() => {
    let stop = false
    const loadCalcinhaOptions = async () => {
      try {
        console.log('🩲 Carregando opções de preço da calcinha...')
        setApiStatus('loading')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const r = await fetch('/api/calcinha/all-prices')
        console.log('🩲 Resposta da API:', r.status, r.ok)
        if (r.ok) {
          const data = await r.json()
          console.log('🩲 Dados recebidos:', data)
          if (!stop) {
            setCalcinhaOptions(data)
            setApiStatus('connected')
            console.log('🩲 Estado calcinhaOptions atualizado com', data.totalOptions, 'opções')
          }
        } else {
          console.warn('🩲 API retornou erro:', r.status)
          setApiStatus('error')
          setTimeout(() => {
            if (!stop) loadCalcinhaOptions()
          }, 3000)
        }
      } catch (e) {
        console.error('🩲 Erro ao carregar opções da calcinha:', e)
        setApiStatus('error')
        setTimeout(() => {
          if (!stop) loadCalcinhaOptions()
        }, 3000)
      }
    }
    
    loadCalcinhaOptions()
    return () => { stop = true }
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const CalcinhaCard = ({ product }: { product: Product }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-purple-700/30"
    >
      <div className="relative">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-purple-800/30 to-pink-800/30 flex items-center justify-center text-purple-300 text-sm">
            🩲 Calcinha Lipo
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-900/60 text-purple-200 border border-purple-600/40">
            Produto Principal
          </span>
        </div>
        <div className="absolute top-3 left-3">
          <div className="flex items-center space-x-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs">
            <span>⭐ {product.sales_data.avg_rating}</span>
          </div>
        </div>
        
        {/* Cores Disponíveis */}
        <div className="absolute bottom-3 left-3">
          <div className="flex items-center space-x-1">
            {product.colors.map((color, idx) => (
              <div
                key={idx}
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
            <span className="text-white text-xs bg-black bg-opacity-50 px-1 rounded">
              {product.colors.filter(c => c.available).length} cores
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="font-bold text-xl text-white mb-2">{product.name}</h3>
        <p className="text-purple-200 text-sm mb-4">{product.description}</p>
        
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-2xl font-bold text-green-400">{formatCurrency(product.price)}</span>
            <div className="text-sm text-gray-400">Custo: {formatCurrency(product.cost)}</div>
          </div>
          <div className="text-sm text-purple-300">
            Margem: {Math.round(((product.price - product.cost) / product.price) * 100)}%
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-700/40">
            <div className="text-lg font-semibold text-purple-300">{product.sales_data.total_sales}</div>
            <div className="text-xs text-purple-400">Vendas</div>
          </div>
          <div className="bg-pink-900/30 p-3 rounded-lg border border-pink-700/40">
            <div className="text-lg font-semibold text-pink-300">{product.cities.length}</div>
            <div className="text-xs text-pink-400">Cidades</div>
          </div>
          <div className="bg-green-900/30 p-3 rounded-lg border border-green-700/40">
            <div className="text-lg font-semibold text-green-300">
              {product.clientPrompt ? '✅' : '⚪'}
            </div>
            <div className="text-xs text-green-400">Prompt</div>
          </div>
          <div className="bg-cyan-900/30 p-3 rounded-lg border border-cyan-700/40">
            <div className="text-lg font-semibold text-cyan-300">{product.images.length}</div>
            <div className="text-xs text-cyan-400">Mídias</div>
          </div>
        </div>
        
        <button
          onClick={() => setSelectedProduct(product)}
          className="w-full bg-gradient-to-r from-purple-700 to-pink-700 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all text-sm font-medium"
        >
          ⚙️ Configurar Completo
        </button>
      </div>
    </motion.div>
  )

  const ProductDetailModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
    const [editingPrice, setEditingPrice] = useState(product.price)
    const [editingCities, setEditingCities] = useState(product.cities.map(c => `${c.city} - ${c.state}`))
    const [editingTemplate, setEditingTemplate] = useState(product.clientPrompt || '')
    const [editingColors, setEditingColors] = useState(product.colors)
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#ffffff')
    const [selectedImages, setSelectedImages] = useState<string[]>(product.images)
    const [activeTab, setActiveTab] = useState<'config' | 'colors' | 'media' | 'cities' | 'template'>('config')

    const uploadMedia = async (files: File[]) => {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      
      try {
        const response = await fetch(`/api/media/products/${product.id}/upload?type=images`, {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) throw new Error('Falha no upload')
        
        const result = await response.json()
        return result.urls || []
      } catch (error) {
        console.error('Erro no upload:', error)
        throw error
      }
    }

    const saveChanges = async () => {
      try {
        // Atualizar produto completo
        await fetch(`/api/products/${product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            price: editingPrice,
            codCities: editingCities,
            clientPrompt: editingTemplate || undefined,
            images: selectedImages,
            colors: editingColors.filter(c => c.available).map(c => c.name)
          })
        })

        // Atualizar contexto ML em tempo real
    try {
          await fetch('/api/update-cod-cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              cities: editingCities,
              colors: editingColors.filter(c => c.available).map(c => c.name),
              price: editingPrice,
      template: editingTemplate,
      images: selectedImages
            })
          })
        } catch (mlErr) {
          console.warn('Aviso: falha ao atualizar contexto ML', mlErr)
        }

        // Atualizar estado local
        const updatedCities = editingCities.map((s: any) => ({ 
          city: s.split(' - ')[0], 
          state: s.split(' - ')[1], 
          demand: Math.floor(Math.random() * 1000), 
          avg_delivery_time: Math.floor(Math.random() * 5) + 1, 
          cod_success_rate: 0.8 + Math.random() * 0.15, 
          popular_variants: [], 
          monthly_sales: Math.floor(Math.random() * 50), 
          growth_rate: Math.random() * 0.3 
        }))

        setProducts(prev => prev.map(p => 
          p.id === product.id 
            ? { 
                ...p, 
                price: editingPrice, 
                cities: updatedCities, 
                clientPrompt: editingTemplate || undefined,
                images: selectedImages,
                colors: editingColors
              } 
            : p
        ))

        toast.success('✅ Produto atualizado e sincronizado com ML!')
        onClose()
      } catch (err) {
        console.error('Erro ao atualizar produto:', err)
        toast.error('❌ Erro ao salvar alterações')
      }
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🩲 {product.name}
                  </h2>
                  <p className="text-purple-300">Configure tudo para vendas otimizadas com ML</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
                {[
                  { id: 'config' as const, label: '💰 Preços', icon: '💰' },
                  { id: 'colors' as const, label: '🎨 Cores', icon: '🎨' },
                  { id: 'media' as const, label: '📸 Mídias', icon: '📸' },
                  { id: 'cities' as const, label: '🏙️ Cidades', icon: '🏙️' },
                  { id: 'template' as const, label: '💬 Template', icon: '💬' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 px-4 rounded-md transition-all text-sm font-medium ${
                      activeTab === tab.id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[400px]">
                {/* Config Tab */}
                {activeTab === 'config' && (
                  <div className="space-y-6">
                    <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        Preço Base & ML

                      {/* Add New Color */}
                      <div className="mb-4 bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                          <div>
                            <label className="text-sm text-gray-300 mb-2 block">Nome da nova cor</label>
                            <input
                              type="text"
                              value={newColorName}
                              onChange={(e) => setNewColorName(e.target.value)}
                              placeholder="Ex.: Vermelha"
                              className="w-full border border-gray-700 bg-gray-900 text-gray-200 rounded-lg p-3 text-sm focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-300 mb-2 block">Selecione a cor</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={newColorHex}
                                onChange={(e) => setNewColorHex(e.target.value)}
                                className="h-11 w-16 p-1 rounded border border-gray-700 bg-gray-900"
                              />
                              <input
                                type="text"
                                value={newColorHex}
                                onChange={(e) => setNewColorHex(e.target.value)}
                                className="flex-1 border border-gray-700 bg-gray-900 text-gray-200 rounded-lg p-3 text-sm font-mono focus:border-purple-500"
                                placeholder="#FF0000"
                              />
                            </div>
                          </div>
                          <div>
                            <button
                              onClick={() => {
                                const name = newColorName.trim()
                                const hex = newColorHex.trim()
                                if (!name) {
                                  toast.error('Informe um nome para a cor')
                                  return
                                }
                                const hexOk = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(hex)
                                if (!hexOk) {
                                  toast.error('Hex inválido (use formato #RRGGBB)')
                                  return
                                }
                                const exists = editingColors.some(c => c.name.toLowerCase() === name.toLowerCase())
                                if (exists) {
                                  toast.error('Já existe uma cor com esse nome')
                                  return
                                }
                                setEditingColors(prev => ([...prev, { name, hex, images: [], available: true }]))
                                setNewColorName('')
                                setNewColorHex('#ffffff')
                                toast.success('Nova cor adicionada!')
                              }}
                              className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-3 font-medium"
                            >
                              Adicionar cor
                            </button>
                          </div>
                        </div>
                      </div>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-300 mb-2 block">Preço Atual (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-700 bg-gray-900 text-gray-200 rounded-lg p-3 text-lg font-mono focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-300 mb-2 block">Margem de Lucro</label>
                          <div className="p-3 bg-gray-900 border border-gray-700 rounded-lg text-lg font-mono text-green-400">
                            {Math.round(((editingPrice - product.cost) / editingPrice) * 100)}%
                          </div>
                        </div>
                      </div>
                      
                      {calcinhaOptions && (
                        <div className="mt-4 bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-green-300 mb-2">🤖 Preços ML Sugeridos:</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            {calcinhaOptions.kits.map((kit: any) => (
                              <div key={kit.kit} className="text-gray-400">
                                <div className="font-medium text-white">Kit {kit.kit}</div>
                                {kit.availablePrices.map((price: number, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => setEditingPrice(price)}
                                    className="block w-full text-left text-green-400 font-mono hover:bg-green-900/20 p-1 rounded"
                                  >
                                    R$ {price.toFixed(2)}
                                  </button>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Colors Tab */}
                {activeTab === 'colors' && (
                  <div className="space-y-6">
                    <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                        🎨 Gestão de Cores
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {editingColors.map((color, idx) => (
                          <div key={idx} className="border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full border-2 border-white"
                                  style={{ backgroundColor: color.hex }}
                                />
                                <span className="text-white font-medium">{color.name}</span>
                              </div>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={color.available}
                                  onChange={(e) => {
                                    const updated = [...editingColors]
                                    updated[idx] = { ...color, available: e.target.checked }
                                    setEditingColors(updated)
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-300">Disponível</span>
                              </label>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              {color.images.length > 0 ? (
                                color.images.map((img, imgIdx) => (
                                  <img key={imgIdx} src={img} className="w-full h-16 object-cover rounded" />
                                ))
                              ) : (
                                <div className="col-span-3 text-center text-gray-500 text-sm py-4">
                                  Nenhuma imagem específica
                                </div>
                              )}
                            </div>
                            
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || [])
                                if (files.length > 0) {
                                  try {
                                    const urls = await uploadMedia(files)
                                    const updated = [...editingColors]
                                    updated[idx] = { ...color, images: [...color.images, ...urls] }
                                    setEditingColors(updated)
                                    toast.success(`Imagens da cor ${color.name} adicionadas!`)
                                  } catch (error) {
                                    toast.error('Erro no upload das imagens')
                                  }
                                }
                              }}
                              className="mt-2 w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Media Tab */}
                {activeTab === 'media' && (
                  <div className="space-y-6">
                    <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                        📸 Gestão de Mídias
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {selectedImages.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={img} className="w-full h-24 object-cover rounded-lg" />
                            <button
                              onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || [])
                            if (files.length > 0) {
                              try {
                                const urls = await uploadMedia(files)
                                setSelectedImages(prev => [...prev, ...urls])
                                toast.success(`${urls.length} arquivo(s) enviado(s)!`)
                              } catch (error) {
                                toast.error('Erro no upload')
                              }
                            }
                          }}
                          className="hidden"
                          id="media-upload"
                        />
                        <label htmlFor="media-upload" className="cursor-pointer">
                          <div className="text-purple-400 text-4xl mb-2">📁</div>
                          <div className="text-white font-medium mb-1">Clique para enviar mídias</div>
                          <div className="text-gray-400 text-sm">Imagens e vídeos para venda</div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cities Tab */}
                {activeTab === 'cities' && (
                  <div className="space-y-6">
                    <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-cyan-400" />
                        Cidades de Entrega COD ({editingCities.length} selecionadas)
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-300 mb-2 block">
                            Selecionar Cidades (Ctrl+Click para múltiplas)
                          </label>
                          <select 
                            multiple 
                            value={editingCities} 
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions).map(o => o.value)
                              setEditingCities(selected)
                            }}
                            className="w-full border border-gray-700 bg-gray-900 text-gray-200 rounded-lg p-3 h-60 focus:border-cyan-500"
                          >
                            {allCodCities.map((c, i) => (
                              <option key={i} value={c.label}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-sm text-gray-300 mb-2 block">Cidades Selecionadas</label>
                          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 h-60 overflow-y-auto">
                            {editingCities.length > 0 ? (
                              <div className="space-y-1">
                                {editingCities.map((city, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-cyan-900/20 p-2 rounded">
                                    <span className="text-cyan-300 text-sm">{city}</span>
                                    <button
                                      onClick={() => setEditingCities(prev => prev.filter((_, i) => i !== idx))}
                                      className="text-red-400 hover:text-red-300 text-xs"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-500 text-center py-8">Nenhuma cidade selecionada</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-cyan-900/20 rounded-lg">
                        <div className="text-sm text-cyan-300">
                          💡 Dica: Mais cidades = maior alcance de vendas. O ML otimiza automaticamente por região.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Template Tab */}
                {activeTab === 'template' && (
                  <div className="space-y-6">
                    <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        Template de Conversa (Prompt-Cabeça)
                      </h3>
                      
                      <div className="mb-4">
                        <label className="text-sm text-gray-300 mb-2 block">
                          Template que será usado como base de todas as conversas
                        </label>
                        <textarea
                          value={editingTemplate}
                          onChange={(e) => setEditingTemplate(e.target.value)}
                          placeholder="Oi, eu sou a {VENDEDOR}! 🌟&#10;&#10;Vi que você tem interesse na nossa {PRODUTO} - uma das melhores do mercado!&#10;&#10;🎯 ESTRATÉGIA: {ESTRATEGIA}&#10;💰 Oferta especial: {PRECO}&#10;🏙️ Sua região: {CIDADE}&#10;📦 Entrega: {ENTREGA_INFO}&#10;🎨 Cores disponíveis: Bege e Preta&#10;&#10;Vamos conversar sobre como ela pode transformar seu dia a dia? {TOM}"
                          className="w-full h-48 border border-gray-700 bg-gray-900 text-gray-200 rounded-lg p-3 text-sm font-mono resize-vertical focus:border-purple-500"
                        />
                      </div>
                      
                      {/* Placeholders Guide */}
                      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-purple-300 mb-2">🎭 Placeholders Dinâmicos:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          {[
                            { code: '{VENDEDOR}', desc: 'Nome da vendedora' },
                            { code: '{PRODUTO}', desc: 'Nome do produto' },
                            { code: '{PRECO}', desc: 'Preço otimizado por ML' },
                            { code: '{ESTRATEGIA}', desc: 'Estratégia Universal Bandits' },
                            { code: '{CIDADE}', desc: 'Cidade detectada' },
                            { code: '{ENTREGA_INFO}', desc: 'Info de entrega/COD' },
                            { code: '{TOM}', desc: 'Tom emocional' },
                            { code: '{CORES}', desc: 'Cores disponíveis' },
                            { code: '{MIDIA_PRIORITARIA}', desc: 'Tipo de mídia preferida' },
                          ].map((item, idx) => (
                            <div key={idx} className="text-gray-400">
                              <code className="text-purple-300">{item.code}</code>
                              <div>{item.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Preview */}
                      {editingTemplate && (
                        <div className="mt-4 bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-green-300 mb-2">👁️ Preview (com dados exemplo):</h4>
                          <div className="text-xs text-gray-300 bg-gray-800 p-3 rounded font-mono">
                            {editingTemplate
                              .replace('{VENDEDOR}', 'Marina')
                              .replace('{PRODUTO}', product.name)
                              .replace('{PRECO}', formatCurrency(editingPrice))
                              .replace('{ESTRATEGIA}', 'Oferta Limitada')
                              .replace('{CIDADE}', 'São Paulo - SP')
                              .replace('{ENTREGA_INFO}', 'Entrega em 3-5 dias úteis')
                              .replace('{TOM}', '😊')
                              .replace('{CORES}', editingColors.filter(c=>c.available).map(c=>c.name).join(', ') || 'Bege, Preta')
                              .replace('{MIDIA_PRIORITARIA}', 'Foto do produto')
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-800">
                <button
                  onClick={saveChanges}
                  className="flex-1 bg-gradient-to-r from-green-700 to-cyan-700 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-cyan-600 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Salvar & Sincronizar ML
                </button>
                <button
                  onClick={() => {
                    // Disparar evento para a App trocar para a aba de campanhas com produto preselecionado
                    const evt = new CustomEvent('ga:switch-tab', {
                      detail: {
                        tab: 'campaigns',
                        preselect: { productId: product.id, productName: product.name }
                      }
                    })
                    ;(window as any).__GA_PRESELECT__ = { productId: product.id, productName: product.name }
                    window.dispatchEvent(evt)
                    toast.success('Abrindo gerador de links com o produto selecionado')
                  }}
                  className="px-6 py-3 bg-purple-700 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                >
                  Criar Link p/ Campanha
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 to-black p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">🩲 Calcinha Lipo</h1>
          <p className="text-purple-300">Configure preços dinâmicos e cidades de entrega</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-400">Produtos encontrados:</span>
            <span className="text-purple-400 font-medium">{products.length}</span>
            <button
              onClick={() => {
                const cancelled = { current: false }
                loadProducts(cancelled)
              }}
              className="ml-2 px-2 py-1 text-xs bg-purple-700 hover:bg-purple-600 text-white rounded transition-colors"
            >
              🔄 Recarregar
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-purple-700 to-pink-700 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 flex items-center space-x-2 transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Status do Sistema ML */}
      {calcinhaOptions && (
        <div className="mb-6 p-4 bg-purple-900/20 rounded-lg border border-purple-600/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-purple-400">🤖</span>
            <h4 className="text-purple-300 font-medium">Sistema de Preços Dinâmicos Ativo</h4>
            <span className="text-xs bg-purple-700 text-purple-100 px-2 py-1 rounded">
              {calcinhaOptions.totalOptions} opções de preço
            </span>
            <span className={`text-xs px-2 py-1 rounded ${
              apiStatus === 'connected' ? 'bg-green-700 text-green-100' :
              apiStatus === 'loading' ? 'bg-yellow-700 text-yellow-100' :
              'bg-red-700 text-red-100'
            }`}>
              {apiStatus === 'connected' ? '🟢 Conectado' :
               apiStatus === 'loading' ? '🟡 Carregando' :
               '🔴 Erro'}
            </span>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-xs">
          <div className="text-gray-300">
            <strong>Debug:</strong> Status de carregamento: {isLoading ? 'Carregando...' : 'Carregado'}
            {' | '}
            API Status: {apiStatus}
            {' | '}
            Produtos totais: {products.length}
            {products.length > 0 && (
              <div className="mt-1">
                Produtos: {products.map(p => p.name).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid de Produtos - quando há produtos */}
      {products.length > 0 && (
        <div className="space-y-6">
          {/* Produto Principal em destaque */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {products.map((product) => (
                <CalcinhaCard key={product.id} product={product} />
              ))}
            </AnimatePresence>
          </div>
          
          {/* Resumo ML */}
          {products.length === 1 && calcinhaOptions && (
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-600/30">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                🤖 Sistema ML Ativo - Configuração Completa
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-green-900/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-300">{calcinhaOptions.totalOptions}</div>
                  <div className="text-sm text-green-400">Preços Dinâmicos</div>
                </div>
                <div className="bg-cyan-900/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-cyan-300">{products[0].cities.length}</div>
                  <div className="text-sm text-cyan-400">Cidades COD</div>
                </div>
                <div className="bg-purple-900/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-300">
                    {products[0].clientPrompt ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-purple-400">Template Ativo</div>
                </div>
                <div className="bg-pink-900/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-pink-300">{products[0].images.length}</div>
                  <div className="text-sm text-pink-400">Mídias Produto</div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-black/20 rounded-lg">
                <div className="text-sm text-purple-200">
                  💡 <strong>Tudo conectado:</strong> Preços ML + Cidades + Template + Mídias = Vendas Otimizadas!
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State ou Call to Action para Sincronizar */}
      {products.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <div className="text-8xl mb-6">🩲</div>
          <h3 className="text-2xl font-medium text-white mb-4">Configure sua Calcinha Lipo</h3>
          <p className="text-purple-300 mb-8 max-w-md mx-auto">
            Sincronize os produtos de calcinha com preços dinâmicos otimizados por Machine Learning para começar a vender.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => {
                // Trigger sync calcinha
                const syncCalcinha = async () => {
                  try {
                    console.log('🔄 Sincronizando kits da Calcinha & Cidades COD via manutenção...')
                    const resp = await fetch('/api/products/maintenance/sync-calcinha', { method: 'POST' })
                    if (!resp.ok) throw new Error('Falha ao sincronizar calcinha')
                    const result = await resp.json()
                    const cancelled = { current: false }
                    await loadProducts(cancelled)
                    toast.success(`✅ Calcinha sincronizada. Atualizados: ${result.updated}, Criados: ${result.created}`)
                  } catch (e: any) {
                    console.error('❌ Erro ao sincronizar calcinha:', e)
                    toast.error('Erro ao sincronizar: ' + e.message)
                  }
                }
                syncCalcinha()
              }}
              className="bg-gradient-to-r from-purple-700 to-pink-700 text-white px-8 py-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium text-lg"
            >
              🚀 Sincronizar Calcinha & ML
            </button>
            <div className="text-sm text-gray-400">
              Isso criará automaticamente os produtos com preços dinâmicos e 73+ cidades COD
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="text-purple-400 text-lg">🔄 Carregando produtos...</div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  )
}

export default ModernProductsSimplified
