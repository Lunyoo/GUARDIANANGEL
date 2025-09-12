/**
 * 🎯 CONFIGURADOR MULTI-PRODUTO PARA WHATSAPP BUSINESS
 * 
 * Sistema para gerenciar múltiplos bots vendendo diferentes produtos
 * em números diferentes de WhatsApp Business
 */

interface ProductConfig {
  id: string
  name: string
  description: string
  whatsappNumber: string
  businessName: string
  // Produtos disponíveis
  products: Array<{
    id: string
    name: string
    description: string
    colors: string[]
    sizes?: string[]
    basePrice: number
    imageFolder: string
  }>
  // Configurações específicas
  codCities: string[]
  deliveryInfo: {
    codDeliveryTime: string
    prepaidDeliveryTime: string
  }
  // Prompts personalizados
  systemPrompt: string
  greetingMessage: string
  closingStrategies: string[]
}

// 📦 CONFIGURAÇÃO ATUAL - CALCINHA MODELADORA
const CALCINHA_CONFIG: ProductConfig = {
  id: 'calcinha_modeladora',
  name: 'Calcinha Modeladora ShapeFit',
  description: 'Calcinha modeladora que realça curvas',
  whatsappNumber: '554195068982',
  businessName: 'Larissa da Shapefit',
  products: [{
    id: 'calcinha_shapefit',
    name: 'Calcinha Modeladora ShapeFit',
    description: 'Calcinha que modela o corpo e realça suas curvas',
    colors: ['Rosa', 'Preta', 'Nude'],
    basePrice: 89.90,
    imageFolder: '/media/products'
  }],
  codCities: [], // Carregado dinamicamente
  deliveryInfo: {
    codDeliveryTime: '1-2 dias úteis por motoboy',
    prepaidDeliveryTime: '3-5 dias úteis pelos Correios'
  },
  systemPrompt: `Você é a Larissa da Shapefit, vendedora especialista em calcinhas modeladoras...`,
  greetingMessage: 'Oi! Sou a Larissa da Shapefit! 😊',
  closingStrategies: [
    'Oferta especial para hoje',
    'Desconto progressivo',
    'Kit com desconto'
  ]
}

// 🆕 TEMPLATE PARA NOVO PRODUTO
const NOVO_PRODUTO_TEMPLATE: ProductConfig = {
  id: 'novo_produto',
  name: 'Nome do Produto',
  description: 'Descrição do produto',
  whatsappNumber: '5541999999999', // SEU NOVO NÚMERO
  businessName: 'Nome da Vendedora',
  products: [{
    id: 'produto_id',
    name: 'Nome Completo do Produto',
    description: 'Descrição detalhada',
    colors: ['Cor 1', 'Cor 2', 'Cor 3'],
    sizes: ['P', 'M', 'G', 'GG'], // Se aplicável
    basePrice: 99.90,
    imageFolder: '/media/novo_produto'
  }],
  codCities: [], // Usar as mesmas cidades ou configurar outras
  deliveryInfo: {
    codDeliveryTime: '1-2 dias úteis',
    prepaidDeliveryTime: '3-5 dias úteis'
  },
  systemPrompt: `Você é [NOME], vendedora especialista em [PRODUTO]...`,
  greetingMessage: 'Oi! Sou a [NOME]! 😊',
  closingStrategies: [
    'Estratégia 1',
    'Estratégia 2',
    'Estratégia 3'
  ]
}

/**
 * 🎯 GERENCIADOR DE CONFIGURAÇÕES POR NÚMERO
 */
class ProductConfigManager {
  private configs: Map<string, ProductConfig> = new Map()
  
  constructor() {
    // Registrar configuração atual
    this.configs.set(CALCINHA_CONFIG.whatsappNumber, CALCINHA_CONFIG)
  }
  
  /**
   * Adicionar nova configuração de produto
   */
  addProduct(config: ProductConfig) {
    this.configs.set(config.whatsappNumber, config)
    console.log(`✅ Produto "${config.name}" configurado para ${config.whatsappNumber}`)
  }
  
  /**
   * Obter configuração por número do WhatsApp
   */
  getConfigByNumber(whatsappNumber: string): ProductConfig | null {
    // Normalizar número
    const normalized = whatsappNumber.replace(/\D/g, '')
    
    for (const [number, config] of this.configs) {
      if (number.replace(/\D/g, '').endsWith(normalized.slice(-10))) {
        return config
      }
    }
    
    return null
  }
  
  /**
   * Listar todos os produtos configurados
   */
  listProducts(): ProductConfig[] {
    return Array.from(this.configs.values())
  }
  
  /**
   * Gerar prompt personalizado para produto
   */
  generateSystemPrompt(whatsappNumber: string): string {
    const config = this.getConfigByNumber(whatsappNumber)
    if (!config) return CALCINHA_CONFIG.systemPrompt
    
    return config.systemPrompt
  }
}

// Instância global
export const productConfigManager = new ProductConfigManager()

/**
 * 🚀 FUNÇÃO PARA CONFIGURAR NOVO PRODUTO
 */
export function setupNewProduct() {
  console.log('🎯 === CONFIGURADOR DE NOVO PRODUTO ===\\n')
  
  console.log('Para configurar um novo produto, você precisa:')
  console.log('1. 📱 Número do WhatsApp Business')
  console.log('2. 🏷️ Nome do produto')  
  console.log('3. 🎨 Cores/variações disponíveis')
  console.log('4. 💰 Preço base')
  console.log('5. 📸 Pasta com imagens do produto')
  console.log('6. 👩 Nome da vendedora/marca')
  console.log('')
  
  console.log('📋 EXEMPLO DE CONFIGURAÇÃO:')
  console.log('```javascript')
  console.log('const meuProduto = {')
  console.log('  whatsappNumber: "5541987654321",')
  console.log('  name: "Conjunto Fitness Premium",')
  console.log('  businessName: "Ana do Fitness",')
  console.log('  products: [{')
  console.log('    name: "Conjunto Fitness Premium",')
  console.log('    colors: ["Preto", "Azul", "Rosa"],')
  console.log('    sizes: ["P", "M", "G", "GG"],')
  console.log('    basePrice: 129.90')
  console.log('  }]')
  console.log('}')
  console.log('```')
  console.log('')
  
  console.log('🔧 PRÓXIMOS PASSOS:')
  console.log('1. Me fala que produto você quer vender')
  console.log('2. Qual número vai usar') 
  console.log('3. Vou configurar tudo automaticamente!')
  console.log('')
  console.log('✅ O sistema já está preparado para múltiplos produtos!')
}

export { ProductConfig, CALCINHA_CONFIG, NOVO_PRODUTO_TEMPLATE }

// Para debug/teste
if (import.meta.url === `file://${process.argv[1]}`) {
  setupNewProduct()
}
