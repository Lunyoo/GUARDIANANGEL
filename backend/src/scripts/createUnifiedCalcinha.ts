import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const COD_CITIES_70 = [
  "São Paulo - SP", "Taboão da Serra - SP", "São Bernardo do Campo - SP", "Osasco - SP", 
  "Guarulhos - SP", "Diadema - SP", "Santo André - SP", "Itapecerica da Serra - SP",
  "Carapicuíba - SP", "Itaquaquecetuba - SP", "Barueri - SP", "Mauá - SP",
  "Ferraz de Vasconcelos - SP", "São Caetano do Sul - SP", "Suzano - SP", "Cotia - SP",
  "Embu das Artes - SP", "Poá - SP", "Itapevi - SP", "Jandira - SP", "Mogi das Cruzes - SP",
  "Recife - PE", "Olinda - PE", "Jaboatão dos Guararapes - PE", "Camaragibe - PE",
  "Paulista - PE", "Abreu e Lima - PE", "Goiânia - GO", "Senador Canedo - GO",
  "Aparecida de Goiânia - GO", "Trindade - GO", "Goianira - GO", "Fortaleza - CE",
  "Caucaia - CE", "Maracanaú - CE", "Eusébio - CE", "Pacatuba - CE", "Maranguape - CE",
  "Rio de Janeiro - RJ", "Niterói - RJ", "Duque de Caxias - RJ", "São João de Meriti - RJ",
  "Nilópolis - RJ", "Mesquita - RJ", "Nova Iguaçu - RJ", "São Gonçalo - RJ", "Queimados - RJ",
  "Salvador - BA", "Lauro de Freitas - BA", "Simões Filho - BA", "Camaçari - BA",
  "Belo Horizonte - MG", "Nova Lima - MG", "Sarzedo - MG", "Contagem - MG", "Betim - MG",
  "Ribeirão das Neves - MG", "Sabará - MG", "Ibirité - MG", "Santa Luzia - MG",
  "Porto Alegre - RS", "Canoas - RS", "Esteio - RS", "São Leopoldo - RS",
  "Novo Hamburgo - RS", "Gravataí - RS", "Sapucaia do Sul - RS", "Viamão - RS",
  "Cachoeirinha - RS", "Alvorada - RS"
]

const UNIFIED_CALCINHA = {
  id: "calcinha-lipo-unified",
  name: "Calcinha Lipo Modeladora Premium",
  description: "Calcinha modeladora premium com tecnologia avançada que modela a cintura, não marca a roupa e oferece máximo conforto. Disponível em bege e preta, com múltiplas opções de quantidade (1, 2, 3, 4, 6 unidades) e preços otimizados por Machine Learning.",
  category: "lingerie",
  inStock: true,
  
  // Images como string separada por vírgula
  images: "/images/calcinha-bege-1.jpg,/images/calcinha-preta-1.jpg,/images/calcinha-bege-2.jpg,/images/calcinha-preta-2.jpg",
  
  // Preço padrão para exibição (kit 3 unidades)
  originalPrice: 259.9,
  price: 179.9,
  
  // SKUs por variação
  sku: "CALCINHA-LIPO-UNIFIED",
  slug: "calcinha-lipo-modeladora-premium",
  
  // 70 cidades pré-selecionadas como JSON string
  codCities: JSON.stringify(COD_CITIES_70)
}

async function createUnifiedCalcinha() {
  try {
    console.log('🔄 Criando produto unificado da calcinha...')
    
    // Deletar produtos antigos da calcinha
    await prisma.product.deleteMany({
      where: {
        OR: [
          { id: { contains: 'calcinha' } },
          { id: { contains: 'lipo' } },
          { name: { contains: 'Calcinha' } }
        ]
      }
    })
    
    console.log('🗑️ Produtos antigos removidos')
    
    // Criar produto unificado
    const product = await prisma.product.create({
      data: UNIFIED_CALCINHA
    })
    
    console.log('✅ Produto unificado criado:', product.id)
    console.log('🎨 Cores: bege, preta')
    console.log('📦 Kits: 1un, 2un, 3un')
    console.log('🏙️ Cidades COD:', COD_CITIES_70.length)
    console.log('💰 Sistema ML: Ativo para preços dinâmicos')
    
    return product
    
  } catch (error) {
    console.error('❌ Erro ao criar produto unificado:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se for chamado diretamente
async function main() {
  await createUnifiedCalcinha()
  console.log('🎉 Produto unificado criado com sucesso!')
}

// Verificar se é execução direta
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Falha ao criar produto:', error)
    process.exit(1)
  })
}

export { createUnifiedCalcinha, UNIFIED_CALCINHA, COD_CITIES_70 }
