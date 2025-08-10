import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar usuário admin
  const adminEmail = process.env.ADMIN_EMAIL || 'alexvinitius@gmail.com'
  
  // Verificar se admin já existe
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        nome: 'Alex Vinícius',
        isAdmin: true
      }
    })

    // Criar configuração de API para o admin
    await prisma.configuracaoApi.create({
      data: {
        userId: admin.id,
        // Usar as variáveis de ambiente reais
        facebookToken: process.env.FACEBOOK_ACCESS_TOKEN,
        facebookAppId: process.env.FACEBOOK_APP_ID,
        facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
        adAccountId: process.env.FACEBOOK_AD_ACCOUNT_ID,
        kiwifyClientSecret: process.env.KIWIFY_CLIENT_SECRET,
        ideogramToken: process.env.IDEOGRAM_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY
      }
    })

    console.log(`✅ Admin criado: ${adminEmail}`)
  } else {
    console.log(`👤 Admin já existe: ${adminEmail}`)
  }

  // Criar algumas campanhas de exemplo para demonstração
  const campanhasExemplo = [
    {
      facebookId: 'demo_campaign_1',
      nome: 'Campanha Demo - Fitness',
      status: 'ACTIVE',
      objetivo: 'CONVERSIONS',
      orcamento: 100.0,
      impressoes: 15420,
      cliques: 234,
      conversoes: 12,
      gasto: 87.50,
      receita: 480.0,
      roas: 5.49,
      ctr: 1.52,
      cpm: 5.67,
      cpc: 0.37
    },
    {
      facebookId: 'demo_campaign_2',
      nome: 'Campanha Demo - Marketing Digital',
      status: 'ACTIVE',
      objetivo: 'CONVERSIONS',
      orcamento: 200.0,
      impressoes: 28340,
      cliques: 412,
      conversoes: 18,
      gasto: 165.75,
      receita: 890.0,
      roas: 5.37,
      ctr: 1.45,
      cpm: 5.85,
      cpc: 0.40
    }
  ]

  for (const campanhaData of campanhasExemplo) {
    await prisma.campanha.upsert({
      where: { facebookId: campanhaData.facebookId },
      update: {},
      create: campanhaData
    })
  }

  console.log('✅ Campanhas demo criadas')

  // Criar alguns insights de exemplo
  const campanhas = await prisma.campanha.findMany()
  
  for (const campanha of campanhas) {
    await prisma.insightIA.create({
      data: {
        campanhaId: campanha.id,
        tipo: 'RECOMENDACAO',
        titulo: 'Oportunidade de Otimização',
        descricao: `A campanha "${campanha.nome}" tem potencial para aumentar ROAS em 15% ajustando o público-alvo.`,
        prioridade: 'ALTA',
        categoria: 'TARGETING',
        confidence: 0.87
      }
    })
  }

  console.log('✅ Insights demo criados')

  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })