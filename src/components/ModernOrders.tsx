import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Phone, 
  MapPin, 
  DollarSign, 
  Calendar,
  Filter,
  Search,
  Eye,
  Edit,
  MessageSquare,
  Download,
  Upload,
  BarChart3,
  TrendingUp,
  Users,
  Star,
  Zap,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  XCircle,
  ChevronRight,
  ExternalLink,
  FileText,
  CreditCard,
  Smartphone
} from 'lucide-react'

interface Order {
  id: string
  customer: {
    name: string
    phone: string
    whatsapp_id: string
    city: string
    state: string
    address: string
    notes?: string
  }
  products: OrderProduct[]
  status: 'pending' | 'confirmed' | 'production' | 'shipped' | 'delivered' | 'cancelled' | 'cod_failed'
  payment_method: 'cod' | 'pix' | 'card'
  total_amount: number
  shipping_cost: number
  discount: number
  tracking_code?: string
  estimated_delivery: Date
  created_at: Date
  updated_at: Date
  conversation_history: ConversationMessage[]
  automation_flags: {
    follow_up_sent: boolean
    confirmation_requested: boolean
    shipping_notified: boolean
    delivery_confirmed: boolean
  }
}

interface OrderProduct {
  product_id: string
  product_name: string
  variant_id: string
  variant_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface ConversationMessage {
  id: string
  type: 'customer' | 'agent' | 'automation'
  content: string
  timestamp: Date
  status: 'sent' | 'delivered' | 'read'
}

interface OrderStats {
  total_orders: number
  pending_orders: number
  shipped_orders: number
  delivered_orders: number
  cancelled_orders: number
  total_revenue: number
  avg_order_value: number
  cod_success_rate: number
  delivery_success_rate: number
}

const ModernOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load real orders and stats
  useEffect(() => {
    let stop = false
    async function load() {
      try {
        setIsLoading(true)
        const [listRes, statsRes] = await Promise.all([
          fetch('/api/ops/orders'),
          fetch('/api/ops/orders/stats')
        ])
        const list = await listRes.json().catch(()=>[])
        const stats = await statsRes.json().catch(()=>null)
        if (!stop) {
          const mapped: Order[] = (Array.isArray(list)? list: []).map((o:any)=>({
            id: o.id || o.orderId || o.uuid,
            customer: {
              name: o.customerName || o.customer?.name || 'Cliente',
              phone: o.customerPhone || o.customer?.phone || '',
              whatsapp_id: o.whatsappId || '',
              city: o.city || o.customer?.city || '',
              state: o.state || o.customer?.state || '',
              address: o.address || o.customer?.address || '',
              notes: o.notes || ''
            },
            products: (o.products||[]).map((p:any)=>({
              product_id: p.productId || p.id,
              product_name: p.productName || p.name,
              variant_id: p.variantId || '',
              variant_name: p.variantName || '',
              quantity: p.quantity || 1,
              unit_price: p.unitPrice || p.price || 0,
              total_price: p.totalPrice || (p.quantity||1) * (p.unitPrice||p.price||0)
            })),
            status: (o.status || 'pending').toLowerCase(),
            payment_method: (o.paymentMethod || 'cod').toLowerCase(),
            total_amount: o.totalAmount || 0,
            shipping_cost: o.shippingCost || 0,
            discount: o.discount || 0,
            tracking_code: o.trackingCode,
            estimated_delivery: new Date(o.estimatedDelivery || Date.now()),
            created_at: new Date(o.createdAt || Date.now()),
            updated_at: new Date(o.updatedAt || Date.now()),
            conversation_history: [],
            automation_flags: {
              follow_up_sent: !!o.followUpSent,
              confirmation_requested: !!o.confirmationRequested,
              shipping_notified: !!o.shippingNotified,
              delivery_confirmed: !!o.deliveryConfirmed
            }
          }))
          setOrders(mapped)
          if (stats && typeof stats === 'object') setStats(stats as any)
        }
      } catch(e) {
        if (!stop) { setOrders([]) }
      } finally { if (!stop) setIsLoading(false) }
    }
    load(); const id = setInterval(load, 60000); return ()=>{ stop = true; clearInterval(id) }
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/40',
      confirmed: 'bg-blue-900/30 text-blue-300 border border-blue-800/40',
      production: 'bg-purple-900/30 text-purple-300 border border-purple-800/40',
      shipped: 'bg-indigo-900/30 text-indigo-300 border border-indigo-800/40',
      delivered: 'bg-green-900/30 text-green-300 border border-green-800/40',
      cancelled: 'bg-red-900/30 text-red-300 border border-red-800/40',
      cod_failed: 'bg-orange-900/30 text-orange-300 border border-orange-800/40'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: Order['status']) => {
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      production: Package,
      shipped: Truck,
      delivered: CheckCircle,
      cancelled: XCircle,
      cod_failed: AlertCircle
    }
    const Icon = icons[status] || Clock
    return <Icon className="w-4 h-4" />
  }

  const getStatusLabel = (status: Order['status']) => {
    const labels = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      production: 'Produção',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
      cod_failed: 'COD Falhou'
    }
    return labels[status] || status
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.phone.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus
    const matchesPayment = filterPayment === 'all' || order.payment_method === filterPayment
    
    return matchesSearch && matchesStatus && matchesPayment
  })

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus, updated_at: new Date() }
        : order
    ))
    
    // Here you would call the API to update the order status
    // await fetch(`/api/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })
  }

  const sendWhatsAppMessage = async (order: Order, message: string) => {
    // Here you would integrate with WhatsApp API
    console.log(`Enviando mensagem para ${order.customer.phone}: ${message}`)
  }

  const OrderCard = ({ order }: { order: Order }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
  className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-all duration-200"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-white">{order.id}</h3>
          <p className="text-sm text-gray-400">{order.customer.name}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {getStatusIcon(order.status)}
            <span className="ml-1">{getStatusLabel(order.status)}</span>
          </span>
        </div>
      </div>

    <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
      <span className="text-xs text-gray-400">Total</span>
      <div className="font-semibold text-green-400">{formatCurrency(order.total_amount + order.shipping_cost - order.discount)}</div>
        </div>
        <div>
      <span className="text-xs text-gray-400">Produtos</span>
      <div className="font-semibold text-gray-200">{order.products.reduce((sum, p) => sum + p.quantity, 0)} itens</div>
        </div>
      </div>

    <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
        <div className="flex items-center space-x-1">
      <MapPin className="w-4 h-4 text-gray-500" />
          <span>{order.customer.city}, {order.customer.state}</span>
        </div>
        <div className="flex items-center space-x-1">
          {order.payment_method === 'cod' && <CreditCard className="w-4 h-4" />}
          {order.payment_method === 'pix' && <Smartphone className="w-4 h-4" />}
          <span className="capitalize">{order.payment_method}</span>
        </div>
      </div>

      {order.tracking_code && (
        <div className="bg-gray-800/50 rounded-lg p-2 mb-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Rastreamento</span>
            <button className="text-xs text-cyan-400 hover:text-cyan-300">
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="font-mono text-sm text-gray-200">{order.tracking_code}</div>
        </div>
      )}

      <div className="flex space-x-2">
        <button
          onClick={() => setSelectedOrder(order)}
          className="flex-1 bg-cyan-600 text-white py-2 px-3 rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
        >
          Ver Detalhes
        </button>
        <button
          onClick={() => sendWhatsAppMessage(order, 'Olá! Temos uma atualização sobre seu pedido.')}
          className="p-2 text-green-400 hover:bg-green-900/20 rounded-lg transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )

  const OrderDetailModal = ({ order, onClose }: { order: Order, onClose: () => void }) => (
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
          className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{order.id}</h2>
                <p className="text-gray-400">Criado em {order.created_at.toLocaleDateString('pt-BR')}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-3 text-white">Informações do Cliente</h3>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 border border-gray-700">
                  <div>
                    <span className="text-sm text-gray-400">Nome:</span>
                    <div className="font-medium text-gray-200">{order.customer.name}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Telefone:</span>
                    <div className="font-medium text-gray-200">{order.customer.phone}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Endereço:</span>
                    <div className="font-medium text-gray-200">{order.customer.address}</div>
                    <div className="text-sm text-gray-400">{order.customer.city}, {order.customer.state}</div>
                  </div>
                  {order.customer.notes && (
                    <div>
                      <span className="text-sm text-gray-400">Observações:</span>
                      <div className="font-medium text-gray-200">{order.customer.notes}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Status */}
              <div>
                <h3 className="font-semibold mb-3 text-white">Status do Pedido</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Status Atual:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{getStatusLabel(order.status)}</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                      className="bg-blue-900/30 text-blue-300 py-2 px-3 rounded-lg text-sm hover:bg-blue-900/50 border border-blue-800/40 transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'shipped')}
                      className="bg-indigo-900/30 text-indigo-300 py-2 px-3 rounded-lg text-sm hover:bg-indigo-900/50 border border-indigo-800/40 transition-colors"
                    >
                      Enviar
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'delivered')}
                      className="bg-green-900/30 text-green-300 py-2 px-3 rounded-lg text-sm hover:bg-green-900/50 border border-green-800/40 transition-colors"
                    >
                      Entregar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="mt-6">
              <h3 className="font-semibold mb-3 text-white">Produtos</h3>
              <div className="border border-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="text-left py-3 px-4 text-gray-300">Produto</th>
                      <th className="text-left py-3 px-4 text-gray-300">Quantidade</th>
                      <th className="text-left py-3 px-4 text-gray-300">Preço Unit.</th>
                      <th className="text-left py-3 px-4 text-gray-300">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900/40">
                    {order.products.map((product, index) => (
                      <tr key={index} className="border-t border-gray-800">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-200">{product.product_name}</div>
                            <div className="text-sm text-gray-400">{product.variant_name}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{product.quantity}</td>
                        <td className="py-3 px-4 text-gray-300">{formatCurrency(product.unit_price)}</td>
                        <td className="py-3 px-4 font-medium text-gray-200">{formatCurrency(product.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Total */}
              <div className="bg-gray-800/50 rounded-lg p-4 mt-4 border border-gray-700">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Subtotal:</span>
                    <span className="text-gray-200">{formatCurrency(order.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Frete:</span>
                    <span className="text-gray-200">{formatCurrency(order.shipping_cost)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span className="">Desconto:</span>
                      <span>-{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between font-semibold text-lg text-white">
                      <span>Total:</span>
                      <span>{formatCurrency(order.total_amount + order.shipping_cost - order.discount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversation History */}
            <div className="mt-6">
              <h3 className="font-semibold mb-3 text-white">Histórico de Conversas</h3>
              <div className="max-h-60 overflow-y-auto space-y-3">
                {order.conversation_history.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'customer' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-sm rounded-lg p-3 ${
                      message.type === 'customer' 
                        ? 'bg-gray-800 text-gray-200 border border-gray-700' 
                        : message.type === 'automation'
                        ? 'bg-blue-900/40 text-blue-200 border border-blue-800/40'
                        : 'bg-green-900/40 text-green-200 border border-green-800/40'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {message.timestamp.toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 to-black p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos</h1>
          <p className="text-gray-300">Gerencie pedidos do WhatsApp ao COD</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-cyan-300">{stats.total_orders}</div>
            <div className="text-sm text-gray-400">Total Pedidos</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-300">{stats.pending_orders}</div>
            <div className="text-sm text-gray-400">Pendentes</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-indigo-300">{stats.shipped_orders}</div>
            <div className="text-sm text-gray-400">Enviados</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-300">{stats.delivered_orders}</div>
            <div className="text-sm text-gray-400">Entregues</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-300">{formatCurrency(stats.avg_order_value)}</div>
            <div className="text-sm text-gray-400">Ticket Médio</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-300">{(stats.cod_success_rate * 100).toFixed(0)}%</div>
            <div className="text-sm text-gray-400">Taxa COD</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por ID, cliente ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-700 bg-gray-950 text-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-700 bg-gray-950 text-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent"
            >
              <option value="all">Todos Status</option>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="production">Produção</option>
              <option value="shipped">Enviado</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
              <option value="cod_failed">COD Falhou</option>
            </select>
            
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="px-4 py-2 border border-gray-700 bg-gray-950 text-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-600 focus:border-transparent"
            >
              <option value="all">Todos Pagamentos</option>
              <option value="cod">COD</option>
              <option value="pix">PIX</option>
              <option value="card">Cartão</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhum pedido encontrado</h3>
          <p className="text-gray-400">Tente ajustar os filtros de busca</p>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  )
}

export default ModernOrders
