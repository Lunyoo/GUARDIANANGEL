import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { logger } from '../src/services/logger'

const prisma = new PrismaClient()

async function main() {
  logger.info('🌱 Iniciando seed do banco de dados...')

  // Criar usuário admin
  const adminEmail = process.env.ADMIN_EMAIL || 'alexvinitius@gmail.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'
  
  const hashedPassword = await bcrypt.hash(adminPassword, 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Alex Vinitius - Admin',
      isAdmin: true,
      isActive: true,
      facebookToken: process.env.FACEBOOK_ACCESS_TOKEN,
      adAccountId: process.env.FACEBOOK_AD_ACCOUNT_ID,
      facebookAppId: process.env.FACEBOOK_APP_ID,
      facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
      kiwifyClientId: process.env.KIWIFY_CLIENT_ID,
      kiwifyClientSecret: process.env.KIWIFY_CLIENT_SECRET,
      ideogramToken: process.env.IDEOGRAM_API_KEY,
    },
  })

  logger.info(`👤 Usuário admin criado: ${adminUser.email}`)

  // Configurações do sistema
  const systemConfigs = [
    {
      key: 'ML_MODEL_VERSION',
      value: '1.0.0',
      description: 'Versão atual do modelo de Machine Learning',
      isPublic: true
    },
    {
      key: 'SCRAPING_ENABLED',
      value: 'true',
      description: 'Habilitar sistema de scraping',
      isPublic: true
    },
    {
      key: 'AUTO_CAMPAIGN_CREATION',
      value: 'false',
      description: 'Criação automática de campanhas',
      isPublic: false
    },
    {
      key: 'MAX_DAILY_SPEND',
      value: '1000',
      description: 'Gasto máximo diário por usuário (USD)',
      isPublic: false
    },
    {
      key: 'SCRAPING_COOLDOWN_MINUTES',
      value: '30',
      description: 'Tempo de cooldown entre scrapings (minutos)',
      isPublic: false
    }
  ]

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    })
  }

  logger.info('⚙️ Configurações do sistema criadas')

  // Modelo ML inicial
  await prisma.mLModel.upsert({
    where: { name: 'creative-performance-predictor' },
    update: {},
    create: {
      name: 'creative-performance-predictor',
      version: '1.0.0',
      type: 'PERFORMANCE_PREDICTION',
      status: 'READY',
      accuracy: 0.75,
      parameters: {
        algorithm: 'RandomForestClassifier',
        features: ['headline_length', 'description_length', 'cta_type', 'ad_type'],
        target: 'high_performance'
      }
    }
  })

  logger.info('🤖 Modelo ML inicial criado')

  // Log de automação de exemplo
  await prisma.automationLog.create({
    data: {
      type: 'SYSTEM_INIT',
      status: 'COMPLETED',
      action: 'Database seeded successfully',
      details: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      completedAt: new Date(),
      duration: 0
    }
  })

  logger.info('📝 Log de inicialização criado')
  logger.info('✅ Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    logger.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })