import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import CodCitiesManager from './CodCitiesManager'
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  MapPin, 
  Star, 
  TrendingUp, 
  DollarSign, 
  Users, 
  ShoppingCart,
  Image as ImageIcon,
  Play,
  Upload,
  Download,
  Filter,
  Search,
  Grid,
  List,
  Heart,
  Share2,
  Tag,
  Zap,
  BarChart3,
  Target,
  Camera,
  Video,
  FileText,
  Clock
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
  variants: ProductVariant[]
  cities: CityData[]
  clientPrompt?: string // Template para prompts personalizados
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

interface ProductVariant {
  id: string
  name: string
  price: number
  stock: number
  sku: string
  attributes: Record<string, string>
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

const ModernProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [allCodCities, setAllCodCities] = useState<{ label:string; city:string; state:string }[]>([])
  
  // Calcinha-specific states
  const [calcinhaOffers, setCalcinhaOffers] = useState<any[]>([])
  const [calcinhaProducts, setCalcinhaProducts] = useState<any[]>([])
  const [hasCalcinha, setHasCalcinha] = useState(false)
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  // render is returned at the end of the component
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
        variants: [],
        cities: (Array.isArray(p.codCities) ? p.codCities : []).map((c: string) => ({ city: c.split(' - ')[0] || c, state: (c.split(' - ')[1] || '').toUpperCase(), demand: 0, avg_delivery_time: 0, cod_success_rate: 0.8, popular_variants: [], monthly_sales: 0, growth_rate: 0 })),
        clientPrompt: p.clientPrompt || undefined, // Template personalizado
        sales_data: { total_sales: p.sales || 0, total_revenue: (typeof p.price === 'number' ? p.price : 0) * (p.sales || 0), avg_rating: p.rating || 4.6, reviews_count: p.reviews || 50, conversion_rate: 0.1 },
        created_at: new Date(p.createdAt || Date.now()),
        updated_at: new Date(p.updatedAt || Date.now())
      }))
      if (!cancelledRef?.current) setProducts(list)
    } catch (e) { if (!cancelledRef?.current) setProducts([]) } finally { setIsLoading(false) }
  }

  // Carregar produtos reais do backend
  useEffect(() => {
    const cancelled = { current:false }
    loadProducts(cancelled)
    const id=setInterval(()=>loadProducts(cancelled), 60000)
    return ()=>{ cancelled.current=true; clearInterval(id) }
  }, [])

  // Load available COD cities catalog for selection
  useEffect(()=>{ let stop=false; (async()=>{
    try { const r=await fetch('/api/cod-cities/all-flat'); if(r.ok){ const j=await r.json(); if(!stop) setAllCodCities(j.cities||[]) } }
    catch{}
  })(); return ()=>{ stop=true }
  },[])

  // Load calcinha ML pricing options
  const [calcinhaOptions, setCalcinhaOptions] = useState<any>(null)
  useEffect(() => {
    let stop = false
    const loadCalcinhaOptions = async () => {
      try {
        console.log('🩲 Carregando opções de preço da calcinha...')
        setApiStatus('loading')
        // Add a small delay to ensure backend is ready
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
          // Retry after 3 seconds
          setTimeout(() => {
            if (!stop) loadCalcinhaOptions()
          }, 3000)
        }
      } catch (e) {
        console.error('🩲 Erro ao carregar opções da calcinha:', e)
        setApiStatus('error')
        // Retry after 3 seconds
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

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

  // Detect calcinha products by name and update state
  useEffect(() => {
    const detectedHasCalcinha = products.some(p => /calcinha|lipo/i.test(p.name))
    const detectedCalcinhaProducts = products.filter(p => /calcinha|lipo/i.test(p.name))
    
    console.log('🔍 Produtos carregados:', products.length)
    console.log('🔍 Calcinha detectada:', detectedHasCalcinha)
    console.log('🔍 Produtos calcinha:', detectedCalcinhaProducts.map(p => p.name))
    
    setHasCalcinha(detectedHasCalcinha)
    setCalcinhaProducts(detectedCalcinhaProducts)
  }, [products])

  async function syncCalcinha(){
    try{
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

  const ProductCard = ({ product }: { product: Product }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="bg-gray-900 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-800"
    >
      <div className="relative">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-800 flex items-center justify-center text-gray-500 text-sm">Sem imagem</div>
        )}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            product.status === 'active' ? 'bg-green-900/40 text-green-300' :
            product.status === 'inactive' ? 'bg-red-900/40 text-red-300' :
            'bg-yellow-900/40 text-yellow-300'
          }`}>
            {product.status}
          </span>
        </div>
        <div className="absolute top-3 left-3">
          <div className="flex items-center space-x-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{product.sales_data.avg_rating}</span>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-white mb-2 line-clamp-2">{product.name}</h3>
        <p className="text-gray-300 text-sm mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-2xl font-bold text-green-400">{formatCurrency(product.price)}</span>
            <span className="text-sm text-gray-400 ml-2">Custo: {formatCurrency(product.cost)}</span>
          </div>
          <div className="text-sm text-gray-400">
            Margem: {Math.round(((product.price - product.cost) / product.price) * 100)}%
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div>
            <div className="text-lg font-semibold text-cyan-400">{product.sales_data.total_sales}</div>
            <div className="text-xs text-gray-400">Vendas</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-purple-400">{product.variants.length}</div>
            <div className="text-xs text-gray-400">Variações</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-orange-400">{product.cities.length}</div>
            <div className="text-xs text-gray-400">Cidades</div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedProduct(product)}
            className="flex-1 bg-cyan-700 text-white py-2 px-3 rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium"
          >
            Ver Detalhes
          </button>
          <button 
            onClick={() => document.getElementById(`quick-upload-${product.id}`)?.click()}
            className="p-2 text-gray-400 hover:text-cyan-300 hover:bg-gray-800 rounded-lg transition-colors" 
            title="Upload de Imagens"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-cyan-300 hover:bg-gray-800 rounded-lg transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-red-300 hover:bg-gray-800 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Hidden quick upload input */}
        <input 
          id={`quick-upload-${product.id}`}
          type="file" 
          multiple 
          accept="image/*,video/*" 
          onChange={async (e)=>{
            const files = Array.from(e.target.files||[])
            if(!files.length) return
            try{ 
              const resp = await uploadMedia(product.id, files as File[], 'images')
              const urls: string[] = resp?.urls||[]
              setProducts(prev=> prev.map(p=> p.id===product.id? { ...p, images: [...p.images, ...urls] }: p))
              // Reset file input
              const input = e.target as HTMLInputElement
              input.value = ''
              alert(`${urls.length} arquivo(s) enviado(s) com sucesso para ${product.name}!`)
            } catch(err){ 
              console.error(err)
              alert('Erro ao enviar arquivos. Tente novamente.')
            }
          }} 
          className="hidden" 
        />
      </div>
    </motion.div>
  )

  async function uploadMedia(productId: string, files: File[], type: 'images'|'videos'|'testimonials'='images'){
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    const r = await fetch(`/api/media/products/${productId}/upload?type=${type}`,{ method:'POST', body: fd })
    if(!r.ok) throw new Error('Falha no upload')
    return r.json()
  }

  const ProductDetailModal = ({ product, onClose }: { product: Product, onClose: () => void }) => (
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
        <h2 className="text-2xl font-bold text-white">{product.name}</h2>
        <p className="text-gray-300">{product.description}</p>
              </div>
              <button
                onClick={onClose}
        className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-300"
              >
                ×
              </button>
            </div>

            {/* Product Images & Videos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold mb-3 text-white">Imagens & Vídeos</h3>
                <div className="grid grid-cols-2 gap-3">
                  {product.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                  {product.videos.map((video, index) => (
                    <div key={index} className="relative">
                      <video
                        src={video}
                        className="w-full h-32 object-cover rounded-lg"
                        poster="/api/placeholder/400/300"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white bg-black bg-opacity-50 rounded-full p-2" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Mídias do Produto</label>
                    <button
                      onClick={() => document.getElementById(`file-input-${product.id}`)?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Enviar Imagens
                    </button>
                  </div>
                  
                  <input 
                    id={`file-input-${product.id}`}
                    type="file" 
                    multiple 
                    accept="image/*,video/*" 
                    onChange={async (e)=>{
                      const files = Array.from(e.target.files||[])
                      if(!files.length) return
                      try{ 
                        const resp = await uploadMedia(product.id, files as File[], 'images')
                        const urls: string[] = resp?.urls||[]
                        setProducts(prev=> prev.map(p=> p.id===product.id? { ...p, images: [...p.images, ...urls] }: p))
                        // Reset file input
                        const input = e.target as HTMLInputElement
                        input.value = ''
                        alert(`${urls.length} arquivo(s) enviado(s) com sucesso!`)
                      } catch(err){ 
                        console.error(err)
                        alert('Erro ao enviar arquivos. Tente novamente.')
                      }
                    }} 
                    className="hidden" 
                  />
                  
                  <div className="text-xs text-gray-400">
                    Formatos aceitos: JPG, PNG, GIF, MP4. Máximo 10 arquivos por vez.
                  </div>
                </div>
              </div>
              
              {/* Key Metrics */}
              <div>
                <h3 className="font-semibold mb-3 text-white">Métricas Principais</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-cyan-900/30 p-4 rounded-lg border border-cyan-800/40">
                    <div className="text-2xl font-bold text-cyan-300">{formatCurrency(product.sales_data.total_revenue)}</div>
                    <div className="text-sm text-cyan-300">Receita Total</div>
                  </div>
                  <div className="bg-green-900/30 p-4 rounded-lg border border-green-800/40">
                    <div className="text-2xl font-bold text-green-300">{product.sales_data.total_sales}</div>
                    <div className="text-sm text-green-300">Total Vendas</div>
                  </div>
                  <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-800/40">
                    <div className="text-2xl font-bold text-purple-300">{(product.sales_data.conversion_rate * 100).toFixed(1)}%</div>
                    <div className="text-sm text-purple-300">Taxa Conversão</div>
                  </div>
                  <div className="bg-yellow-900/30 p-4 rounded-lg border border-yellow-800/40">
                    <div className="text-2xl font-bold text-yellow-300">{product.sales_data.avg_rating}/5</div>
                    <div className="text-sm text-yellow-300">Avaliação Média</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Offers / Combos */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-white">Ofertas & Combos</h3>
              <OffersBlock productId={product.id} />
            </div>

            {/* Variants */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-white">Variações do Produto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {product.variants.map((variant) => (
                  <div key={variant.id} className="border border-gray-800 rounded-lg p-3 text-gray-200 bg-gray-950/30">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{variant.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        variant.stock > 20 ? 'bg-green-900/40 text-green-300' :
                        variant.stock > 5 ? 'bg-yellow-900/40 text-yellow-300' :
                        'bg-red-900/40 text-red-300'
                      }`}>
                        {variant.stock} un.
                      </span>
                    </div>
                    <div className="text-sm text-gray-300">
                      <div>SKU: {variant.sku}</div>
                      <div>Preço: {formatCurrency(variant.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cities Performance */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-white">Performance por Cidade (COD)</h3>
              {/* Simple multi-select to update COD cities on product */}
              <div className="mb-3">
                <label className="text-sm text-gray-300 mb-1 block">Cidades COD</label>
        <select multiple value={product.cities.map(c=>`${c.city} - ${c.state}`)} onChange={async (e)=>{
                  const selected = Array.from(e.target.selectedOptions).map(o=>o.value)
                  try {
                    await fetch(`/api/products/${product.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ codCities: selected }) })
                    // Atualiza contexto de entrega do bot/ML imediatamente
                    try {
                      await fetch('/api/update-cod-cities', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cities: selected })
                      })
                    } catch (mlErr) {
                      console.warn('Aviso: falha ao atualizar contexto COD no ML', mlErr)
                    }
          const nextCities = selected.map((s:any)=>({ city: s.split(' - ')[0], state: s.split(' - ')[1], demand:0, avg_delivery_time:0, cod_success_rate:0.8, popular_variants:[], monthly_sales:0, growth_rate:0 }))
          setProducts(prev=> prev.map(p=> p.id===product.id? { ...p, cities: nextCities }: p))
          // Keep modal product in sync
          setSelectedProduct(prev => prev && prev.id===product.id ? { ...prev, cities: nextCities } as Product : prev)
          toast.success('Cidades COD atualizadas')
                  } catch (err){ console.error('Falha ao atualizar cidades', err) }
                }} className="w-full border border-gray-800 bg-gray-950 text-gray-200 rounded-lg p-2 h-28">
                  {allCodCities.map((c,i)=> (
                    <option key={i} value={c.label}>{c.label}</option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">Segure Ctrl/Cmd para selecionar múltiplas.</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-300">
                      <th className="text-left py-3 px-4">Cidade</th>
                      <th className="text-left py-3 px-4">Demanda</th>
                      <th className="text-left py-3 px-4">Vendas/Mês</th>
                      <th className="text-left py-3 px-4">Taxa COD</th>
                      <th className="text-left py-3 px-4">Entrega Média</th>
                      <th className="text-left py-3 px-4">Crescimento</th>
                      <th className="text-left py-3 px-4">Variações Populares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.cities.map((city, index) => (
                      <tr key={index} className="border-b border-gray-900 hover:bg-gray-900/40 text-gray-200">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{city.city}, {city.state}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{city.demand.toLocaleString()}</td>
                        <td className="py-3 px-4 font-medium">{city.monthly_sales}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            city.cod_success_rate > 0.85 ? 'bg-green-900/40 text-green-300' :
                            city.cod_success_rate > 0.75 ? 'bg-yellow-900/40 text-yellow-300' :
                            'bg-red-900/40 text-red-300'
                          }`}>
                            {(city.cod_success_rate * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">{city.avg_delivery_time} dias</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            <span className="text-green-300 font-medium">
                              +{(city.growth_rate * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {city.popular_variants.slice(0, 2).map((variant, idx) => (
                              <span key={idx} className="bg-cyan-900/40 text-cyan-300 text-xs px-2 py-1 rounded-full">
                                {variant}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Template de Prompt Personalizado */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Template de Conversa Personalizado
              </h3>
              <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
                <div className="mb-3">
                  <label className="text-sm text-gray-300 mb-2 block">
                    Template Personalizado para o Bot 
                    <span className="text-gray-500 ml-1">(usa placeholders dinâmicos)</span>
                  </label>
                  <textarea
                    value={product.clientPrompt || ''}
                    onChange={async (e) => {
                      const newTemplate = e.target.value
                      try {
                        await fetch(`/api/products/${product.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ clientPrompt: newTemplate })
                        })
                        
                        // Atualizar estado local
                        setProducts(prev => prev.map(p => 
                          p.id === product.id ? { ...p, clientPrompt: newTemplate } : p
                        ))
                        setSelectedProduct(prev => 
                          prev && prev.id === product.id 
                            ? { ...prev, clientPrompt: newTemplate } 
                            : prev
                        )
                        
                        toast.success('Template atualizado!')
                      } catch (err) {
                        console.error('Erro ao atualizar template:', err)
                        toast.error('Erro ao salvar template')
                      }
                    }}
                    placeholder="Oi, eu sou a {VENDEDOR}! 🌟&#10;&#10;Soube que você se interessou pela nossa {PRODUTO} - é uma das melhores do mercado!&#10;&#10;🎯 ESTRATÉGIA ATUAL: {ESTRATEGIA}&#10;💰 Preço especial: {PRECO}&#10;🏙️ Você está em: {CIDADE}&#10;📦 Entrega: {ENTREGA_INFO}&#10;&#10;Que tal conversar sobre como ela pode te ajudar? {TOM}"
                    className="w-full h-40 border border-gray-700 bg-gray-900 text-gray-200 rounded-lg p-3 text-sm font-mono resize-vertical focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                
                {/* Placeholders Guide */}
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-cyan-300 mb-2">🎭 Placeholders Disponíveis:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="text-gray-400">
                      <code className="text-cyan-300">{'{VENDEDOR}'}</code> - Nome da vendedora
                    </div>
                    <div className="text-gray-400">
                      <code className="text-cyan-300">{'{PRODUTO}'}</code> - Nome do produto
                    </div>
                    <div className="text-gray-400">
                      <code className="text-cyan-300">{'{PRECO}'}</code> - Preço com estratégia ML
                    </div>
                    <div className="text-gray-400">
                      <code className="text-cyan-300">{'{ESTRATEGIA}'}</code> - Estratégia Universal Bandits
                    </div>
                    <div className="text-gray-400">
                      <code className="text-cyan-300">{'{CIDADE}'}</code> - Cidade detectada
                    </div>
                    <div className="text-gray-400">
                      <code className="text-cyan-300">{'{ENTREGA_INFO}'}</code> - Info de entrega/COD
                    </div>
                    <div className="text-gray-400">
                      <code className="text-cyan-300">{'{TOM}'}</code> - Tom emocional
                    </div>
                  </div>
                </div>
                
                {/* Template Status */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      product.clientPrompt ? 'bg-green-400' : 'bg-gray-500'
                    }`} />
                    <span className="text-sm text-gray-400">
                      {product.clientPrompt 
                        ? 'Template personalizado ativo' 
                        : 'Usando prompt padrão do sistema'
                      }
                    </span>
                  </div>
                  
                  {product.clientPrompt && (
                    <button
                      onClick={async () => {
                        try {
                          await fetch(`/api/products/${product.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ clientPrompt: null })
                          })
                          
                          setProducts(prev => prev.map(p => 
                            p.id === product.id ? { ...p, clientPrompt: undefined } : p
                          ))
                          setSelectedProduct(prev => 
                            prev && prev.id === product.id 
                              ? { ...prev, clientPrompt: undefined } 
                              : prev
                          )
                          
                          toast.success('Template removido - usando padrão do sistema')
                        } catch (err) {
                          console.error('Erro ao remover template:', err)
                          toast.error('Erro ao remover template')
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Remover template
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  // Lightweight offers block component with internal fetch
  const OffersBlock: React.FC<{ productId: string }> = ({ productId }) => {
    const [offers, setOffers] = useState<{ label: string; qty?: number; price?: number }[]>([])
    useEffect(() => {
      let stop = false
      ;(async () => {
        try {
          const r = await fetch(`/api/products/${productId}/offers`)
          if (!r.ok) return
          const j = await r.json()
          if (!stop) setOffers(j.offers || [])
        } catch {}
      })()
      return () => { stop = true }
    }, [productId])
    if (!offers.length) return (
      <div className="text-sm text-gray-500">Sem ofertas configuradas.</div>
    )
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {offers.map((o, i) => (
          <div key={i} className="border border-gray-800 bg-gray-950/40 rounded-lg p-3 flex items-center justify-between text-gray-200">
            <div>
              <div className="font-medium">{o.label}</div>
              {typeof o.price === 'number' && (
                <div className="text-xs text-gray-400">{formatCurrency(o.price)}</div>
              )}
            </div>
            <button
              className="text-xs px-2 py-1 rounded bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/40"
              onClick={() => navigator.clipboard.writeText(o.label)}
              title="Copiar"
            >Copiar</button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-full bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:to-black p-6 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produtos</h1>
          <p className="text-gray-600 dark:text-gray-300">Gerencie seus produtos e acompanhe performance por cidade</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-cyan-700 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-700 bg-gray-950 text-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-700 bg-gray-950 text-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent"
            >
              <option value="all">Todas Categorias</option>
              <option value="Moda Íntima">Moda Íntima</option>
              <option value="Beleza">Beleza</option>
              <option value="Fitness">Fitness</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-700 bg-gray-950 text-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent"
            >
              <option value="all">Todos Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="draft">Rascunho</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition-colors ${
                view === 'grid' ? 'bg-cyan-900/40 text-cyan-300' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-colors ${
                view === 'list' ? 'bg-cyan-900/40 text-cyan-300' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
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
            {calcinhaOptions.kits.map((kit: any) => (
              <div key={kit.kit} className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50">
                <div className="text-sm font-medium text-white mb-1">
                  Kit {kit.kit} {kit.kit === 1 ? 'unidade' : 'unidades'}
                </div>
                <div className="text-xs text-gray-400 mb-2 line-clamp-2">{kit.description}</div>
                <div className="space-y-1">
                  {kit.availablePrices.map((price: number, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-300">R$</span>
                      <span className="text-green-400 font-mono font-medium">{price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {kit.priceCount > 1 && (
                  <div className="mt-2 pt-2 border-t border-gray-700/50">
                    <div className="text-xs text-purple-400 text-center">
                      IA escolhe entre {kit.priceCount}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                🎨 <span>Cores: Bege, Preta</span>
              </span>
              <span className="flex items-center gap-1">
                {(() => {
                  const citySet = new Set(
                    calcinhaProducts.flatMap(p => p.cities.map(c => `${c.city} - ${c.state}`))
                  )
                  return (
                    <>
                      🏙️ <span>{citySet.size || 0} cidades COD</span>
                    </>
                  )
                })()}
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
          
          {calcinhaProducts.map((product) => (
            <div key={product.id} className="bg-gray-800/60 p-3 rounded-lg border border-gray-700/50 mb-3">
              <div className="text-sm font-medium text-white mb-1">{product.name}</div>
              <div className="text-xs text-gray-400 mb-2">{product.description}</div>
              <div className="flex justify-between items-center">
                <span className="text-green-400 font-mono text-lg font-medium">
                  R$ {product.price.toFixed(2)}
                </span>
                <span className="text-xs text-gray-400">
                  {product.cities.length} cidades COD
                </span>
              </div>
            </div>
          ))}
          
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
          <button onClick={syncCalcinha} disabled={isLoading} className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm disabled:opacity-50">
            {isLoading? 'Sincronizando...' : 'Sincronizar Calcinha & Cidades COD'}
          </button>
        </div>
      )}

      <div className={`grid gap-6 ${
        view === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1'
      }`}>
        <AnimatePresence>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State + Maintenance CTA */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhum produto encontrado</h3>
          <p className="text-gray-400 mb-4">Tente ajustar os filtros ou criar um novo produto</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-700 text-white px-6 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Criar Primeiro Produto
          </button>
          {!hasCalcinha && (
            <div className="mt-4">
              <button onClick={syncCalcinha} disabled={isLoading} className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm disabled:opacity-50">
                {isLoading? 'Sincronizando...' : 'Sincronizar Calcinha & Cidades COD'}
              </button>
              <div className="text-xs text-gray-500 mt-1">Repara slug e garante as 73 cidades COD no produto Calcinha Lipo.</div>
            </div>
          )}
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

export default ModernProducts
