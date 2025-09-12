import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET /api/orders - Listar todos os pedidos
router.get('/', async (req, res) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query
    
    const where = status && status !== 'ALL' ? { status: status as string } : {}
    
    const orders = await (prisma as any).hypeeOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })
    
    const total = await (prisma as any).hypeeOrder.count({ where })
    
    res.json({
      success: true,
      orders,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    })
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error)
    res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// GET /api/orders/:id - Buscar pedido específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const order = await (prisma as any).hypeeOrder.findUnique({
      where: { id }
    })
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Pedido não encontrado' })
    }
    
    res.json({ success: true, order })
  } catch (error) {
    console.error('Erro ao buscar pedido:', error)
    res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// PUT /api/orders/:id/status - Atualizar status do pedido
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes } = req.body
    
    const updateData: any = { status, updatedAt: new Date() }
    
    // Adicionar timestamps específicos baseado no status
    if (status === 'CONFIRMED') updateData.confirmedAt = new Date()
    if (status === 'SHIPPED') updateData.shippedAt = new Date()
    if (status === 'DELIVERED') updateData.deliveredAt = new Date()
    if (status === 'CANCELLED') updateData.cancelledAt = new Date()
    
    if (notes) updateData.notes = notes
    
    const order = await (prisma as any).hypeeOrder.update({
      where: { id },
      data: updateData
    })
    
    res.json({ success: true, order })
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error)
    res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// PUT /api/orders/:id/schedule - Agendar entrega COD
router.put('/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params
    const { scheduledAt, notes } = req.body
    
    const order = await (prisma as any).hypeeOrder.update({
      where: { id },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: 'SCHEDULED',
        notes,
        updatedAt: new Date()
      }
    })
    
    res.json({ success: true, order })
  } catch (error) {
    console.error('Erro ao agendar pedido:', error)
    res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

// GET /api/orders/stats/summary - Estatísticas resumidas
router.get('/stats/summary', async (req, res) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      codOrders,
      totalRevenue
    ] = await Promise.all([
      (prisma as any).hypeeOrder.count(),
      (prisma as any).hypeeOrder.count({ where: { status: 'PENDING' } }),
      (prisma as any).hypeeOrder.count({ where: { status: 'CONFIRMED' } }),
      (prisma as any).hypeeOrder.count({ where: { status: 'SHIPPED' } }),
      (prisma as any).hypeeOrder.count({ where: { status: 'DELIVERED' } }),
      (prisma as any).hypeeOrder.count({ where: { status: 'CANCELLED' } }),
      (prisma as any).hypeeOrder.count({ where: { paymentMethod: 'COD' } }),
      (prisma as any).hypeeOrder.aggregate({ _sum: { totalAmount: true } })
    ])
    
    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        codOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0
      }
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    res.status(500).json({ success: false, error: 'Erro interno do servidor' })
  }
})

export default router
