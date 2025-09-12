import express from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { config } from 'dotenv'
import logger from './config/logger'
import { connectDatabase } from './config/database'
import { connectRedis } from './config/redis'
import { autoOptimizer } from './services/ml/autoOptimizer.js'

// 🚨 DEBUG MODE: Temporarily allow all errors to show
console.log('🐛 DEBUG MODE: All error suppression DISABLED for debugging')

// Minimal error handling - só catch o essencial
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🚨 UNHANDLED REJECTION:', reason)
  console.error('Promise:', promise)
})

process.on('uncaughtException', (error: Error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error)
  console.error('Stack:', error.stack)
  // Don't exit immediately - let's see what's happening
})

// Rotas principais do sistema
import authRoutes from './routes/auth'
import campaignRoutes from './routes/campaigns'
import campanhasRoutes from './routes/campanhas'
import facebookRoutes from './routes/facebook'
import botRoutes from './routes/bot'
import aiRoutes from './routes/ai'
import mlRoutes from './routes/ml'
import mlDashboard from './api/mlDashboard'
import allocatorRoutes from './routes/allocator'
import promptOptimizationsRoutes from './routes/promptOptimizations'
import notificationsRoutes from './routes/notifications'
import productsRoutes from './routes/products'
import mediaRoutes from './routes/media.js'
import codCitiesRoutes from './routes/codCities'
import analyticsRoutes from './routes/analytics'
import campaignLinksRoutes from './routes/campaignLinks'
import strategiesRoutes from './routes/strategies'
import platformRoutes from './routes/platform'
import facebookChatRoutes from './routes/facebookChat'
import neuralRoutes from './routes/neural'
import opsRoutes from './routes/ops'
import whatsappRoutes from './routes/whatsapp'
// import whatsappHealthRoutes from './routes/whatsappHealth.js'
// import botMetricsRoutes from './routes/botMetrics.js'
import dashboardRoutes from './routes/dashboard'
import autoOptimizerRoutes from './routes/autoOptimizer'
import trackingRoutes from './routes/tracking.js'
import conversationRoutes from './routes/conversation'
import { sseHandler } from './services/bot/sse.js'
import publicRoutes from './routes/public'
import ordersPublicRoutes from './routes/ordersPublic'
import ordersRoutes from './routes/orders'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import cron from 'node-cron'
import axios from 'axios'
import { scheduleAttributionForwarder, processPendingSalesEvents } from './services/attributionForwarder'
import { startCapiWorkers } from './services/capiQueue'
import { initWhatsApp } from './services/bot/whatsappClient.fixed'
import { bindInboundHandler } from './services/bot/inboundBridge.js'
import { startOutboundDispatcher } from './services/bot/messageQueue.js'
import { initMLServices } from './services/ml/init.js'
import { budgetAllocator } from './services/ml/budgetAllocator.js'
import { isWhatsAppReady, sendWhatsAppMessage } from './services/bot/whatsappClient.fixed'

// Carregar variáveis de ambiente
config()

// Debug env snapshot in test mode
if (process.env.NODE_ENV === 'test') {
  console.log('[SERVER_ENV_DEBUG]', {
    BOT_METRICS_PUBLIC: process.env.BOT_METRICS_PUBLIC,
    BOT_METRICS_KEY: process.env.BOT_METRICS_KEY ? '***set***' : 'unset'
  })
}

const app = express()
const PORT = process.env.PORT || 3001

// Middlewares de segurança
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}))

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}))

// Rate limiting - otimizado para VPS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP (balanceado para uso normal)
  message: { error: 'Muitas requisições, tente novamente em 15 minutos.' }
})
app.use(limiter)

// Middlewares de parsing
// Capture rawBody for webhook signature verification while still parsing JSON
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    try { req.rawBody = Buffer.from(buf) } catch {}
  }
}))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static media serving (product media stock)
const mediaRoot = path.join(process.cwd(), 'backend', 'src', 'media')
app.use('/media', express.static(mediaRoot))

// Request logging
app.use(requestLogger)

// Cache para deduplicação de mensagens de teste
const testMessageCache = new Map<string, number>()

// Rota temporária para verificar pedidos (SEM autenticação)
app.get('/debug/orders', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const orders = await (prisma as any).hypeeOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    await prisma.$disconnect()
    res.json({ success: true, count: orders.length, orders })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Rota temporária para testar mídia (SEM autenticação)
app.post('/test-media', async (req, res) => {
  try {
    const { phone, body, mediaType } = req.body
    const normalizedPhone = (phone || '554199509644').replace(/\D/g, '')
    const messageContent = body || '[📷 Imagem]'
    
    // Criar chave única para deduplicação
    const cacheKey = `${normalizedPhone}:${messageContent}`
    const now = Date.now()
    
    // Verificar se mensagem similar foi enviada nos últimos 10 segundos
    if (testMessageCache.has(cacheKey)) {
      const lastSent = testMessageCache.get(cacheKey)!
      if (now - lastSent < 10000) { // 10 segundos
        return res.json({ 
          success: true, 
          message: 'Mensagem duplicada ignorada (cooldown)', 
          cooldown: Math.ceil((10000 - (now - lastSent)) / 1000)
        })
      }
    }
    
    // Atualizar cache
    testMessageCache.set(cacheKey, now)
    
  const { waInternalEmitter } = await import('./services/bot/whatsappClient.fixed')
    
    const msgData = {
      id: `test_${now}_${Math.random().toString(36).substr(2, 6)}`,
      phone: normalizedPhone,
      body: messageContent,
      direction: 'IN' as const,
      at: new Date().toISOString(),
      source: 'test',
      mediaType: mediaType || 'image'
    }
    
    waInternalEmitter.emit('inbound-wa', msgData)
    res.json({ success: true, message: 'Mensagem de teste enviada', data: msgData })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Rota pública para simular mensagens WhatsApp completas (SEM autenticação)
app.post('/api/public/test-wa-message', async (req, res) => {
  try {
    const { phone, body, direction = 'IN' } = req.body
  const { waInternalEmitter } = await import('./services/bot/whatsappClient.fixed')
    const msgData = {
      id: `sim_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      phone: (phone || '554199509644').replace(/\D/g, ''),
      body: body || 'Teste',
      direction: direction as 'IN' | 'OUT',
      at: new Date().toISOString(),
      source: 'simulation'
    }
    console.log(`🧪 Simulação (public): ${msgData.phone} -> "${msgData.body}"`)
    waInternalEmitter.emit('inbound-wa', msgData)
    res.json({ success: true, message: 'Mensagem simulada enviada', data: msgData })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Rota pública simples (via querystring) para simular mensagem WhatsApp sem JSON
app.get('/api/public/test-wa-q', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').replace(/\D/g, '')
    const body = String(req.query.body || 'Teste')
    if (!phone) return res.status(400).json({ ok: false, error: 'phone query required' })
    const { waInternalEmitter } = await import('./services/bot/whatsappClient.fixed')
    const msgData = {
      id: `sim_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      phone,
      body,
      direction: 'IN' as const,
      at: new Date().toISOString(),
      source: 'simulation-q'
    }
    waInternalEmitter.emit('inbound-wa', msgData)
    res.json({ ok: true, message: 'Mensagem simulada enviada', data: msgData })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Rotas públicas
app.use('/api/auth', authRoutes)
app.use('/api/public', publicRoutes)
app.use('/api', ordersPublicRoutes)
// Analytics routes (public para aceitar clicks das campanhas)
app.use('/api/analytics', analyticsRoutes)
// Campaign Links routes (public para aceitar redirects)
app.use('/api', campaignLinksRoutes)
// Orders management (protected)
app.use('/api/orders', authMiddleware, ordersRoutes)
// Tracking routes (public para aceitar clicks do Facebook)
app.use('/api/tracking', trackingRoutes)
// Dev-only: expose allocator under public prefix for E2E tests without auth
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/public/allocator', allocatorRoutes)
}
// Bot precisa ser público para receber webhooks e permitir status sem autenticação
app.use('/api/bot', botRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/auto-optimizer', autoOptimizerRoutes) // 📊 Dashboard integrado
// WhatsApp + Conversations (public for SSE + ops – protect via proxy in prod)
app.use('/api/bot', whatsappRoutes)
// SSE alias for clients expecting /api/events
app.get('/api/events', (req, res) => sseHandler(req as any, res as any))
// Endpoints de IA de diagnóstico também públicos para testes iniciais
app.use('/api/ai', aiRoutes)

// 📊 Dashboard ML (público para visualização em tempo real)
app.use('/api/public', mlDashboard)

// Mídia dos produtos (público para exibição de imagens)
app.use('/api/media', mediaRoutes)

// COD routes (public)

// Rotas de campanhas (públicas para dashboard)
app.use('/api/campaigns', campaignRoutes)

// Conversation GPT routes
app.use('/api/conversation', conversationRoutes)

// Products routes
app.use('/api/products', productsRoutes)

// 🩲 Calcinha ML Pricing (público para bot e frontend)
import calcinhaRoutes from './routes/calcinha.js'
app.use('/api/calcinha', calcinhaRoutes)

// Upload de media (público para frontend fazer upload de criativos)
app.use('/api', mediaRoutes)

// Dev-only: expor rotas de COD cities publicamente para facilitar configuração
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/public', codCitiesRoutes)
}

// Demais rotas protegidas (com autenticação)
app.use('/api/campanhas', authMiddleware, campanhasRoutes)
app.use('/api/facebook', authMiddleware, facebookRoutes)
app.use('/api/ml', authMiddleware, mlRoutes)
app.use('/api/allocator', authMiddleware, allocatorRoutes)
app.use('/api', promptOptimizationsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api', codCitiesRoutes)
app.use('/api/strategies', strategiesRoutes)
app.use('/api/platform', platformRoutes)
app.use('/api', facebookChatRoutes)
app.use('/api/neural', neuralRoutes)
app.use('/api/ops', opsRoutes)
// app.use('/api/whatsapp-health', whatsappHealthRoutes)
// app.use('/api/bot-metrics', botMetricsRoutes)

// Rota temporária para testar mídia
app.use('/api/neural', neuralRoutes)
app.use('/api/ops', opsRoutes)

// Rota de health check

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Lightweight endpoint to manually trigger attribution reprocessing (admin usage)
app.post('/api/public/attribution/retry', async (_req, res) => {
  try {
    const result = await processPendingSalesEvents(100)
    res.json({ ok: true, ...result })
  } catch (e: any) {
    res.status(500).json({ error: 'Retry failed', details: e?.message })
  }
})

// Error handler
app.use(errorHandler)

// Função para inicializar serviços
async function initializeServices() {
  try {
    // Conectar ao banco de dados
    await connectDatabase()
    logger.info('Database connected successfully')

    // Conectar ao Redis
    try {
      await connectRedis()
      logger.info('Redis connected successfully')
    } catch (_err) {
      // connectRedis já faz log e retorna null; seguimos sem Redis
      logger.warn('Prosseguindo sem Redis (cache desabilitado)')
    }

  // Inicializar subsistemas de ML explicitamente (logs de prontidão)
  await initMLServices()

  // Agendar tarefas
    setupCronJobs()

  // Iniciar forwarder de atribuição (CAPI retries)
  scheduleAttributionForwarder()

  // Iniciar worker da fila (se Redis estiver disponível)
  try {
    await startCapiWorkers()
  } catch {
    // silencioso: seguimos sem fila
  }

  } catch (error) {
    logger.error('Failed to initialize services:', error)
    process.exit(1)
  }
}

// Configurar tarefas agendadas - otimizado para VPS
function setupCronJobs() {
  // Atualizar KPIs a cada 1 hora (reduzido de 15min para economizar CPU)
  cron.schedule('0 * * * *', async () => {
    logger.info('Running scheduled KPI update')
    // Implementar lógica de atualização de KPIs aqui
  })

  // Limpeza de cache a cada 6 horas
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running cache cleanup')
    // Implementar limpeza de cache aqui
  })

  // Otimização diária de orçamentos (06:00) se configurado
  cron.schedule('0 6 * * *', async () => {
    try {
      const facebook_token = process.env.SCHEDULER_FACEBOOK_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN
      const ad_account_id = process.env.SCHEDULER_AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID || process.env.AD_ACCOUNT_ID
      if (!facebook_token || !ad_account_id) {
        logger.warn('Skipping daily budget optimization (missing token/ad account env)')
        return
      }
      const base = `http://localhost:${PORT}`
      const resp = await axios.post(`${base}/api/public/scheduler/optimize-budgets`, { facebook_token, ad_account_id })
      logger.info(`Budget optimization done: reviewed=${resp.data?.reviewed} changes=${resp.data?.changes?.length || 0}`)
    } catch (e: any) {
      logger.error('Daily budget optimization failed:', e.response?.data || e.message)
    }
  })

  // 🗞️ Enviar resumo diário para o admin às 08:00
  cron.schedule('0 8 * * *', async () => {
    try {
      const admin = process.env.ADMIN_PHONE?.replace(/\D+/g,'')
      if (!admin) return
      const { generateDailyReport } = await import('./services/reporting/dailyReporter')
  const { isWhatsAppReady, sendWhatsAppMessage } = await import('./services/bot/whatsappClient.fixed')
      const rep = await generateDailyReport()
      const last = rep?.allocation?.lastDecision
      const msg = [
        '🗞️ Resumo diário',
        `Data: ${rep?.date || new Date().toISOString().slice(0,10)}`,
        last ? `Alocador: aloc=${(last.allocations?.length||0)} div=${(last.diversificationScore||0).toFixed(3)}` : undefined,
        rep?.errors ? `Erros 5xx: ${rep.errors.total5xx||0}` : undefined,
        rep?.anomalies ? `Anomalias altas: ${rep.anomalies.high||0}` : undefined
      ].filter(Boolean).join('\n')
      if (isWhatsAppReady()) await sendWhatsAppMessage(`${admin}@c.us`, msg)
    } catch (e:any) {
      try { logger.warn('Falha ao enviar resumo diário: ' + (e?.message || e)) } catch {}
    }
  })

  // 📈 Alocador automático (experimental): a cada 2 horas, se habilitado (reduzido de 30min)
  try {
    const autoAlloc = String(process.env.ALLOCATOR_AUTO || '').toLowerCase() === 'true'
    if (autoAlloc) {
      cron.schedule('0 */2 * * *', async () => {
        try {
          const strategy = process.env.ALLOCATOR_STRATEGY || 'balanced'
          const decision = await budgetAllocator.allocateBudget(strategy)
          logger.info(`[CRON] allocator auto-run executed (${strategy}) allocations=${decision.allocations?.length || 0}`)
          // Optional admin notify (best-effort)
          try {
            const adminPhone = process.env.ADMIN_PHONE?.replace(/\D+/g, '')
            if (adminPhone && isWhatsAppReady()) {
              const pending = (decision as any)?.pendingApproval === true
              const lines = [
                `📈 Alocador automático (${strategy})`,
                `Alocações: ${decision.allocations?.length || 0}`,
                `Diversificação: ${(decision.diversificationScore || 0).toFixed(3)}`,
                `ROI esperado: ${(decision.expectedTotalROI || 0).toFixed(2)}`,
                pending ? 'Status: aguardando aprovação' : 'Status: aplicada'
              ]
              await sendWhatsAppMessage(`${adminPhone}@c.us`, lines.join('\n'))
            }
          } catch {}
        } catch (e:any) {
          logger.warn('[CRON] allocator auto-run failed: ' + (e?.message || e))
        }
      })
      logger.info('Allocator auto-run enabled (0 */2 * * *)')
    } else {
      logger.info('Allocator auto-run disabled (set ALLOCATOR_AUTO=true to enable)')
    }
  } catch {}

  // 🔄 Auto-enroll refresher: repuxa campanhas a cada 2h (reduzido de 30min)
  try {
    const enrollCron = String(process.env.ALLOCATOR_AUTO_ENROLL_CRON || '').toLowerCase() === 'true'
    if (enrollCron) {
      cron.schedule('0 */2 * * *', async () => {
        try {
          // Hit our own endpoint so it aggregates accounts and triggers auto-enroll
          const base = `http://localhost:${PORT}`
          await axios.get(`${base}/api/campaigns`)
          logger.info('[CRON] auto-enroll refresh executed')
        } catch (e:any) {
          logger.warn('[CRON] auto-enroll refresh failed: ' + (e?.response?.data ? JSON.stringify(e.response.data) : e?.message))
        }
      })
      logger.info('Auto-enroll refresh enabled (0 */2 * * *)')
    }
  } catch {}
}

// Inicializar servidor
const server = createServer(app)

server.listen(PORT, async () => {
  logger.info(`🚀 Nexus Backend server running on port ${PORT}`)
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`)
  
  await initializeServices()
  
  // 🚀 Iniciar AUTO-OTIMIZADOR
  try {
    autoOptimizer.start()
    logger.info('🤖 Auto-Optimizer started - sistema se otimiza sozinho!')
  } catch (error) {
    logger.warn('Auto-Optimizer failed to start:', error)
  }
  
  // 🔥 Inicializar WhatsApp + Inbound Bridge + Outbound Dispatcher
  try {
    logger.info('🔧 Iniciando WhatsApp client...')
    logger.info('🔥 [SERVER] *** INICIANDO SETUP WHATSAPP ***')
    
    // Bind inbound handler ANTES de inicializar WhatsApp para garantir que o listener esteja ativo
    logger.info('🔗 Binding inbound handler FIRST...')
    logger.info('🔥 [SERVER] Configurando inbound bridge...')
    bindInboundHandler()
    logger.info('✅ Inbound handler bound')
    logger.info('🔥 [SERVER] Inbound bridge configurado - agora iniciando WhatsApp...')
    
    // Agora inicializar WhatsApp (pode demorar)
    logger.info('🔥 [SERVER] Chamando initWhatsApp()...')
    await initWhatsApp()
    logger.info('✅ WhatsApp client inicializado')
    logger.info('🔥 [SERVER] *** WHATSAPP INICIALIZADO COM SUCESSO ***')
    
    // ⚠️ DESABILITADO: Outbound dispatcher não deve rodar automaticamente no startup
    // startOutboundDispatcher()
    logger.info('⚠️ Outbound dispatcher DESABILITADO no startup para evitar spam')
    
    logger.info('🎉 WhatsApp iniciado com sucesso!')
    logger.info('🔥 [SERVER] *** SETUP COMPLETO - SISTEMA PRONTO PARA RECEBER MENSAGENS ***')
  } catch(e) { 
    logger.error('❌ WA init failed:', e)
    logger.error('Stack:', (e as any)?.stack)
    logger.error('🔥 [SERVER] *** ERRO CRÍTICO NO SETUP WHATSAPP ***:', e)
    
    // Mesmo se WhatsApp falhar, garantir que o bridge está ativo
    try {
      logger.info('🔗 Ensuring inbound handler is bound (fallback)...')
      bindInboundHandler()
      logger.info('✅ Inbound handler bound (fallback)')
    } catch(e2) {
      logger.error('❌ Failed to bind inbound handler:', e2)
      logger.error('🔥 [SERVER] *** ERRO AO CONFIGURAR BRIDGE DE FALLBACK ***:', e2)
    }
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
    process.exit(0)
  })
})

export default app
// Force reload - fixed bindInboundHandler order
