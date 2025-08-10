import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { config } from 'dotenv'
import logger from './config/logger.js'
import { connectDatabase } from './config/database.js'
import { connectRedis } from './config/redis.js'
// Note: For lean build, only mount public routes. Other routes can be re-enabled when typings are aligned.
// import authRoutes from './routes/auth.js'
// import campaignRoutes from './routes/campaigns.js'
// import facebookRoutes from './routes/facebook.js'
// import scrapingRoutes from './routes/scraping.js'
// import automationRoutes from './routes/automation.js'
import publicRoutes from './routes/public.js'
import { authMiddleware } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import cron from 'node-cron'
import axios from 'axios'
import { scheduleAttributionForwarder, processPendingSalesEvents } from './services/attributionForwarder.js'
import { startCapiWorkers } from './services/capiQueue.js'

// Carregar variáveis de ambiente
config()

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP
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

// Request logging
app.use(requestLogger)

// Rotas públicas
// app.use('/api/auth', authRoutes)
app.use('/api/public', publicRoutes)

// Middleware de autenticação para rotas protegidas
app.use('/api', authMiddleware)

// Rotas protegidas
// app.use('/api/campaigns', campaignRoutes)
// app.use('/api/facebook', facebookRoutes)
// app.use('/api/scraping', scrapingRoutes)
// app.use('/api/automation', automationRoutes)

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

// Configurar tarefas agendadas
function setupCronJobs() {
  // Atualizar KPIs a cada 15 minutos
  cron.schedule('*/15 * * * *', async () => {
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
}

// Inicializar servidor
const server = createServer(app)

server.listen(PORT, async () => {
  logger.info(`🚀 Nexus Backend server running on port ${PORT}`)
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`)
  
  await initializeServices()
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