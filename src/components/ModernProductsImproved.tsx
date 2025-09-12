import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import CodCitiesManager from './CodCitiesManager'
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  MapPin, 
  DollarSign, 
  Upload,
  Camera,
  Video,
  Tag,
  Link as LinkIcon,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Palette,
  Truck,
  CreditCard,
  Globe,
  Zap,
  BarChart3
} from 'lucide-react'

interface PriceVariant {
  id: string
  name: string
  price: number
  description: string
  isMLOptimized: boolean
  conversionRate: number
  active: boolean
}

interface MediaFile {
  id: string
  type: 'image' | 'video'
  url: string
  name: string
  isPrimary: boolean
}

interface CityData {
  name: string
  state: string
  region: string
  hasCOD: boolean
}

interface CampaignLink {
  id: string
  name: string
  url: string
  linkedProductId?: string
}

interface Product {
  id: string
  name: string
  description: string
  category: string
  status: 'active' | 'inactive' | 'draft'
  priceVariants: PriceVariant[]
  media: MediaFile[]
  colors: string[]
  availableCities: string[]
  codCities: string[]
  totalSales: number
  totalRevenue: number
  avgRating: number
  createdAt: string
  updatedAt: string
}

const ModernProductsImproved: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [campaignLinks, setCampaignLinks] = useState<CampaignLink[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [editingPrice, setEditingPrice] = useState<PriceVariant | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  // Calcinha-specific states
  const [calcinhaOffers, setCalcinhaOffers] = useState<any[]>([])
  const [calcinhaProducts, setCalcinhaProducts] = useState<any[]>([])
  const [hasCalcinha, setHasCalcinha] = useState(false)
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [calcinhaOptions, setCalcinhaOptions] = useState<any>(null)

  // Initialize arrays to prevent undefined errors
  useEffect(() => {
    if (!products) setProducts([])
    if (!campaignLinks) setCampaignLinks([])
    if (!calcinhaProducts) setCalcinhaProducts([])
    if (!calcinhaOffers) setCalcinhaOffers([])
  }, [])

  // Estados para formulários
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    category: 'clothing',
    priceVariants: [],
    media: [],
    colors: [],
    availableCities: [],
    codCities: []
  })

  const [newPrice, setNewPrice] = useState<Partial<PriceVariant>>({
    name: '',
    price: 0,
    description: '',
    active: true
  })

  // Lista de cidades brasileiras (amostra - em produção virá da API)
  const brazilianCities = [
    { name: 'São Paulo', state: 'SP', region: 'Sudeste' },
    { name: 'Rio de Janeiro', state: 'RJ', region: 'Sudeste' },
    { name: 'Belo Horizonte', state: 'MG', region: 'Sudeste' },
    { name: 'Salvador', state: 'BA', region: 'Nordeste' },
    { name: 'Brasília', state: 'DF', region: 'Centro-Oeste' },
    { name: 'Fortaleza', state: 'CE', region: 'Nordeste' },
    { name: 'Manaus', state: 'AM', region: 'Norte' },
    { name: 'Curitiba', state: 'PR', region: 'Sul' },
    { name: 'Recife', state: 'PE', region: 'Nordeste' },
    { name: 'Porto Alegre', state: 'RS', region: 'Sul' },
    // Adicionar mais cidades conforme necessário
  ]

  const productColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#222222', '#FFFFFF', '#8B4513', '#FF1493', '#32CD32'
  ]

  // Carregar dados iniciais
  useEffect(() => {
    loadProducts()
    loadCampaignLinks()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        const arr: any[] = Array.isArray(data) ? data : (Array.isArray(data?.products) ? data.products : [])
        const mapped: Product[] = arr.map((p: any): Product => {
          const images: string[] = Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? p.images.split(',').map((s: string)=>s.trim()).filter(Boolean) : [])
          const codCities: string[] = Array.isArray(p.codCities) ? p.codCities : []
          const onlyCityNames = codCities.map((c: string) => (c.split(' - ')[0] || c).trim())
          return {
            id: String(p.id),
            name: String(p.name),
            description: String(p.description || ''),
            category: String(p.category || 'geral'),
            status: (p.inStock === false ? 'inactive' : 'active'),
            priceVariants: [
              {
                id: `pv-${p.id}-default`,
                name: 'Preço Padrão',
                price: typeof p.price === 'number' ? p.price : (typeof p.originalPrice === 'number' ? p.originalPrice : 0),
                description: 'Preço atual do produto',
                isMLOptimized: false,
                conversionRate: 0,
                active: true
              }
            ],
            media: images.map((url: string, idx: number) => ({
              id: `m-${p.id}-${idx}`,
              type: 'image',
              url,
              name: `Imagem ${idx+1}`,
              isPrimary: idx === 0
            })),
            colors: [],
            availableCities: Array.from(new Set(onlyCityNames)),
            codCities: onlyCityNames,
            totalSales: Number(p.sales || 0),
            totalRevenue: (typeof p.price === 'number' ? p.price : 0) * Number(p.sales || 0),
            avgRating: Number(p.rating || 4.6),
            createdAt: new Date(p.createdAt || Date.now()).toISOString(),
            updatedAt: new Date(p.updatedAt || Date.now()).toISOString()
          }
        })
        setProducts(mapped)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      // Dados de exemplo para desenvolvimento
      setProducts([
        {
          id: 'calc-modeladora-001',
          name: 'Calcinha Modeladora ShapeFit Premium',
          description: 'Calcinha modeladora de alta compressão que modela o corpo e realça as curvas naturais.',
          category: 'clothing',
          status: 'active',
          priceVariants: [
            {
              id: 'price-001',
              name: 'Preço Padrão',
              price: 89.90,
              description: 'Preço padrão para público geral',
              isMLOptimized: false,
              conversionRate: 12.5,
              active: true
            },
            {
              id: 'price-002', 
              name: 'Preço Promocional',
              price: 69.90,
              description: 'Preço promocional otimizado por ML',
              isMLOptimized: true,
              conversionRate: 18.3,
              active: true
            }
          ],
          media: [
            {
              id: 'media-001',
              type: 'image',
              url: '/api/media/calcinha-principal.jpg',
              name: 'Imagem Principal',
              isPrimary: true
            }
          ],
          colors: ['#000000', '#8B4513', '#FF1493'],
          availableCities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte'],
          codCities: ['São Paulo', 'Rio de Janeiro'],
          totalSales: 245,
          totalRevenue: 21605.50,
          avgRating: 4.7,
          createdAt: '2024-01-15',
          updatedAt: '2024-08-30'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadCampaignLinks = async () => {
    try {
      const response = await fetch('/api/campaign-links')
      if (response.ok) {
        const data = await response.json()
        setCampaignLinks(data.links || [])
      }
    } catch (error) {
      console.error('Erro ao carregar links de campanha:', error)
    }
  }

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

  // Detect calcinha products by name and update state
  useEffect(() => {
    if (!products || !Array.isArray(products)) return
    
    const detectedHasCalcinha = products.some(p => p && p.name && /calcinha|lipo/i.test(p.name))
    const detectedCalcinhaProducts = products.filter(p => p && p.name && /calcinha|lipo/i.test(p.name))
    
    console.log('🔍 Produtos carregados:', products.length)
    console.log('🔍 Calcinha detectada:', detectedHasCalcinha)
    console.log('🔍 Produtos calcinha:', detectedCalcinhaProducts.map(p => p?.name || 'unnamed'))
    
    setHasCalcinha(detectedHasCalcinha)
    setCalcinhaProducts(detectedCalcinhaProducts)
  }, [products])

  // Load calcinha offers when calcinha products are detected
  useEffect(() => {
    if (hasCalcinha && calcinhaProducts.length > 0) {
      loadCalcinhaOffers()
    }
  }, [hasCalcinha, calcinhaProducts])

  async function loadCalcinhaOffers() {
    try {
      const calcinhaProduct = calcinhaProducts[0]
      if (!calcinhaProduct) return

      const response = await fetch(`/api/products/${calcinhaProduct.id}/offers`)
      if (response.ok) {
        const data = await response.json()
        setCalcinhaOffers(data.offers || [])
      }
    } catch (error) {
      console.error('Erro ao carregar ofertas da calcinha:', error)
    }
  }

  async function syncCalcinha(){
    try {
      setLoading(true)
      toast.success('Sincronizando calcinha e cidades COD...')
      await loadProducts() // Reload products
    } catch (error) {
      toast.error('Erro ao sincronizar calcinha')
    } finally {
      setLoading(false)
    }
  }

  const saveProduct = async () => {
    try {
      const productData = {
        ...newProduct,
        id: newProduct.id || `product-${Date.now()}`,
        updatedAt: new Date().toISOString()
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })

      if (response.ok) {
        toast.success('Produto salvo com sucesso!')
        loadProducts()
        setShowProductModal(false)
        resetProductForm()
      }
    } catch (error) {
      toast.error('Erro ao salvar produto')
    }
  }

  const savePriceVariant = async () => {
    try {
      if (!selectedProduct || !newPrice.name || !newPrice.price) {
        toast.error('Preencha todos os campos obrigatórios')
        return
      }

      const priceData = {
        ...newPrice,
        id: editingPrice?.id || `price-${Date.now()}`,
        isMLOptimized: false,
        conversionRate: 0
      }

      const updatedProduct = {
        ...selectedProduct,
        priceVariants: editingPrice 
          ? selectedProduct.priceVariants.map(p => p.id === editingPrice.id ? priceData as PriceVariant : p)
          : [...selectedProduct.priceVariants, priceData as PriceVariant]
      }

      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      })

      if (response.ok) {
        toast.success('Preço salvo com sucesso!')
        setSelectedProduct(updatedProduct)
        loadProducts()
        setShowPriceModal(false)
        resetPriceForm()
      }
    } catch (error) {
      toast.error('Erro ao salvar preço')
    }
  }

  const resetProductForm = () => {
    setNewProduct({
      name: '',
      description: '',
      category: 'clothing',
      priceVariants: [],
      media: [],
      colors: [],
      availableCities: [],
      codCities: []
    })
  }

  const resetPriceForm = () => {
    setNewPrice({
      name: '',
      price: 0,
      description: '',
      active: true
    })
    setEditingPrice(null)
  }

  // 💰 Obter preço inteligente usando ML
  const getSmartPrice = async (productId: string, customerProfile: any) => {
    try {
      const response = await fetch(`/api/products/${productId}/get-smart-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerProfile,
          campaignType: 'standard',
          videoOrigin: 'direct',
          demandLevel: 'medium'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('💡 Preço inteligente:', data)
        return data
      }
      return null
    } catch (error) {
      console.error('❌ Erro ao obter preço inteligente:', error)
      return null
    }
  }
  
  // 🏙️ Verificar disponibilidade COD
  const checkCOD = async (productId: string, city: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/check-cod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('🏙️ Verificação COD:', data)
        return data
      }
      return null
    } catch (error) {
      console.error('❌ Erro ao verificar COD:', error)
      return null
    }
  }
  
  // 📊 Atualizar cidades COD
  const updateCODCities = async (productId: string, cities: string[]) => {
    try {
      const response = await fetch(`/api/products/${productId}/cod-cities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cities })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Cidades COD atualizadas:', data)
        loadProducts() // Recarregar lista
        toast.success('Cidades COD atualizadas!')
        return data
      }
      return null
    } catch (error) {
      console.error('❌ Erro ao atualizar cidades COD:', error)
      toast.error('Erro ao atualizar cidades COD')
      return null
    }
  }
  
  // 🎨 Atualizar mídias do produto
  const updateProductMedia = async (productId: string, media: MediaFile[]) => {
    try {
      const response = await fetch(`/api/products/${productId}/media`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Mídias atualizadas:', data)
        loadProducts() // Recarregar lista
        toast.success('Mídias atualizadas!')
        return data
      }
      return null
    } catch (error) {
      console.error('❌ Erro ao atualizar mídias:', error)
      toast.error('Erro ao atualizar mídias')
      return null
    }
  }

  const toggleCitySelection = (cityName: string, type: 'available' | 'cod') => {
    if (!selectedProduct) return

    const cityList = type === 'available' ? selectedProduct.availableCities : selectedProduct.codCities
    const otherList = type === 'available' ? selectedProduct.codCities : selectedProduct.availableCities

    let updatedList
    if (cityList.includes(cityName)) {
      updatedList = cityList.filter(c => c !== cityName)
      // Se removeu de disponíveis, também remove de COD
      if (type === 'available') {
        const updatedCOD = otherList.filter(c => c !== cityName)
        setSelectedProduct({
          ...selectedProduct,
          availableCities: updatedList,
          codCities: updatedCOD
        })
        return
      }
    } else {
      updatedList = [...cityList, cityName]
      // Se adicionou em COD, garante que está em disponíveis
      if (type === 'cod' && !selectedProduct.availableCities.includes(cityName)) {
        setSelectedProduct({
          ...selectedProduct,
          availableCities: [...selectedProduct.availableCities, cityName],
          codCities: updatedList
        })
        return
      }
    }

    setSelectedProduct({
      ...selectedProduct,
      [type === 'available' ? 'availableCities' : 'codCities']: updatedList
    })
  }

  const linkCampaignToProduct = async (linkId: string, productId: string) => {
    try {
      const response = await fetch(`/api/campaign-links/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedProductId: productId })
      })

      if (response.ok) {
        toast.success('Link conectado ao produto!')
        loadCampaignLinks()
      }
    } catch (error) {
      toast.error('Erro ao conectar link')
    }
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

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
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Gestão de Produtos Inteligente
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Produtos com preços dinâmicos e cidades COD integradas
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowProductModal(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Calcinha ML Pricing Dashboard */}
      {hasCalcinha && calcinhaOptions && (
        <div className="mb-6 p-4 bg-purple-900/20 rounded-lg border border-purple-600/30">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-purple-400" />
            <h4 className="text-purple-300 font-medium">🩲 Calcinha ML - Sistema de Preços Dinâmicos</h4>
            <span className="text-xs bg-purple-700 text-purple-100 px-2 py-1 rounded">
              {calcinhaOptions.totalOptions} opções de preço
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {calcinhaOptions?.kits?.map((kit: any) => (
              <div key={kit.kit} className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
                <div className="text-sm font-medium text-white mb-1">
                  Kit {kit.kit} {kit.kit === 1 ? 'unidade' : 'unidades'}
                </div>
                <div className="text-xs text-gray-400 mb-2 line-clamp-2">{kit.description}</div>
                <div className="space-y-1">
                  {kit.availablePrices?.map((price: number, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-300">R$</span>
                      <span className="text-green-400 font-mono font-medium">{price.toFixed(2)}</span>
                    </div>
                  )) || []}
                </div>
                {kit.priceCount > 1 && (
                  <div className="mt-2 pt-2 border-t border-gray-700/50">
                    <div className="text-xs text-purple-400 text-center">
                      IA escolhe entre {kit.priceCount}
                    </div>
                  </div>
                )}
              </div>
            )) || []}</div>
          
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                🎨 <span>Cores: Bege, Preta</span>
              </span>
              <span className="flex items-center gap-1">
                🏙️ <span>{calcinhaProducts.length > 0 ? calcinhaProducts[0].codCities?.length || 0 : 0} cidades COD</span>
              </span>
            </div>
            <span className="text-purple-400">🤖 Machine Learning otimiza automaticamente</span>
          </div>
        </div>
      )}

      {/* Fallback Calcinha Product Info */}
      {hasCalcinha && !calcinhaOptions && calcinhaProducts.length > 0 && (
        <div className="mb-6 p-4 bg-purple-900/20 rounded-lg border border-purple-600/30">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              <h4 className="text-purple-300 font-medium">🩲 Calcinha Produto Detectado</h4>
              <span className="text-xs bg-purple-700 text-purple-100 px-2 py-1 rounded">
                {apiStatus === 'loading' ? 'Carregando preços ML...' : 
                 apiStatus === 'error' ? 'Erro na conexão' : 'Preços carregados'}
              </span>
              {apiStatus === 'error' && (
                <span className="text-xs bg-red-700 text-red-100 px-2 py-1 rounded">
                  🔴 API Offline
                </span>
              )}
            </div>
            <button 
              onClick={() => {
                console.log('🔄 Forçando recarregamento dos preços...')
                window.location.reload()
              }}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded"
            >
              🔄 Recarregar Preços
            </button>
          </div>
          
          {calcinhaProducts?.map((product) => (
            <div key={product.id} className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50 mb-3">
              <div className="text-sm font-medium text-white mb-1">{product.name}</div>
              <div className="text-xs text-gray-400 mb-2">{product.description}</div>
              <div className="flex justify-between items-center">
                <span className="text-green-400 font-mono text-lg font-medium">
                  R$ {product.priceVariants?.[0]?.price?.toFixed(2) || '0.00'}
                </span>
                <span className="text-xs text-gray-400">
                  {product.codCities?.length || 0} cidades COD
                </span>
              </div>
            </div>
          )) || []}
          
          <div className="text-xs text-purple-400 text-center">
            🤖 Aguardando sistema de preços dinâmicos ML...
          </div>
        </div>
      )}

      {/* COD Cities Management for Conversation GPT */}
      {hasCalcinha && (
        <CodCitiesManager 
          calcinhaProducts={calcinhaProducts}
          onCitiesUpdate={() => loadProducts()}
        />
      )}

      {/* Quick maintenance CTA when calcinha products are missing */}
      {!hasCalcinha && (
        <div className="mb-6 p-4 bg-purple-900/10 border border-purple-700/30 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-purple-200">
            Calcinha não encontrada na lista de produtos. Você pode sincronizar automaticamente os kits e as cidades COD.
          </div>
          <button onClick={syncCalcinha} disabled={loading} className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm disabled:opacity-50">
            {loading ? 'Sincronizando...' : 'Sincronizar Calcinha & Cidades COD'}
          </button>
        </div>
      )}

      {/* Lista de Produtos */}
      <div className="space-y-6">
        {(products || []).map((product) => (
          <div key={product.id} className="bg-white/60 dark:bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-200/20 overflow-hidden">
            {/* Header do Produto */}
            <div className="p-6 border-b border-gray-200/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                    className="flex items-center space-x-3 hover:bg-gray-100/50 dark:hover:bg-white/5 p-2 rounded-lg transition-colors"
                  >
                    {expandedProduct === product.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      {product.name.charAt(0)}
                    </div>
                  </button>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{product.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{product.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.status === 'active' ? 'bg-green-100 text-green-800' :
                        product.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {product.status}
                      </span>
                      <span className="text-sm text-gray-500">{product.priceVariants.length} preços</span>
                      <span className="text-sm text-gray-500">{product.availableCities.length} cidades</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(product.totalRevenue)}</p>
                    <p className="text-sm text-gray-500">{product.totalSales} vendas</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProduct(product)
                      setExpandedProduct(product.id)
                    }}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Conteúdo Expandido */}
            {expandedProduct === product.id && (
              <div className="p-6 space-y-6">
                
                {/* Preços */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">Variações de Preço</h4>
                    <button
                      onClick={() => {
                        setSelectedProduct(product)
                        setShowPriceModal(true)
                      }}
                      className="flex items-center space-x-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Novo Preço</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(product.priceVariants || []).map((price) => (
                      <div key={price.id} className="bg-white/50 dark:bg-white/5 rounded-lg p-4 border border-gray-200/20">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{price.name}</h5>
                          {price.isMLOptimized && (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">ML</span>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-green-600 mb-1">{formatCurrency(price.price)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{price.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Conversão: {price.conversionRate}%</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            price.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {price.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cores Disponíveis */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Cores Disponíveis</h4>
                  <div className="flex flex-wrap gap-3">
                    {(product.colors || []).map((color, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div 
                          className="w-8 h-8 rounded-full border-2 border-gray-300" 
                          style={{ backgroundColor: color }}
                        ></div>
                        <span className="text-sm">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cidades e COD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Cidades Atendidas ({(product.availableCities || []).length})</h4>
                    <div className="max-h-32 overflow-y-auto">
                      <div className="space-y-1">
                        {(product.availableCities || []).map((city) => (
                          <div key={city} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <span className="text-sm">{city}</span>
                            {(product.codCities || []).includes(city) && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">COD</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Links de Campanha Conectados</h4>
                    <div className="space-y-2">
                      {(campaignLinks || [])
                        .filter(link => link.linkedProductId === product.id)
                        .map((link) => (
                          <div key={link.id} className="flex items-center space-x-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                            <LinkIcon className="w-4 h-4 text-purple-400" />
                            <span className="text-sm flex-1">{link.name}</span>
                          </div>
                        ))}
                      
                      {(campaignLinks || []).filter(link => !link.linkedProductId).length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-2">Conectar links:</p>
                          {(campaignLinks || [])
                            .filter(link => !link.linkedProductId)
                            .slice(0, 3)
                            .map((link) => (
                              <button
                                key={link.id}
                                onClick={() => linkCampaignToProduct(link.id, product.id)}
                                className="block w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-sm"
                              >
                                🔗 {link.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de Novo Produto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Novo Produto</h2>
              <button onClick={() => setShowProductModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Produto *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  placeholder="Ex: Calcinha Modeladora Premium"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  placeholder="Descrição detalhada do produto..."
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveProduct}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
                >
                  Salvar Produto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preço */}
      {showPriceModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{editingPrice ? 'Editar' : 'Novo'} Preço</h2>
              <button onClick={() => {setShowPriceModal(false); resetPriceForm()}}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Preço *</label>
                <input
                  type="text"
                  value={newPrice.name}
                  onChange={(e) => setNewPrice({...newPrice, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  placeholder="Ex: Preço Promocional"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newPrice.price}
                  onChange={(e) => setNewPrice({...newPrice, price: parseFloat(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  placeholder="89.90"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <textarea
                  value={newPrice.description}
                  onChange={(e) => setNewPrice({...newPrice, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  placeholder="Quando usar este preço..."
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => {setShowPriceModal(false); resetPriceForm()}}
                  className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={savePriceVariant}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
                >
                  Salvar Preço
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModernProductsImproved
