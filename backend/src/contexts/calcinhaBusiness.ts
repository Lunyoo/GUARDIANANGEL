/**
 * calcinhaBusiness.ts
 * Domain strategic context for "Calcinha" (lingerie) niche operations across AI, marketing, and campaign optimization.
 * Reconstructed with structured sections: market insights, personas, product grid, positioning angles, objections, channel plays,
 * creative frameworks, offer engineering, pricing psychology, retention & LTV levers, KPI guardrails, and ML feature hints.
 *
 * This contextual knowledge is consumed by higher-level AI systems (facebookChat, autoInsightSystem, superIntelligentSystem)
 * to ground generations, select strategies, and enforce brand/market constraints.
 */

export interface Persona {
  id: string;
  name: string;
  ageRange: string;
  archetype: string;
  motivations: string[];
  painPoints: string[];
  objections: string[];
  preferredAngles: string[];
  contentHooks: string[];
}

export interface ProductVariant {
  sku: string;
  category: string; // e.g., "calcinha", "conjunto", "modeladora"
  style: string; // e.g., "renda", "invisivel", "cotton", "seamless"
  fabric: string;
  colors: string[];
  sizes: string[];
  price: number; // base price
  priceAnchor?: number; // higher anchor for pricing psychology
  benefits: string[];
  upsell?: string[]; // related SKU codes
  crossSell?: string[]; // complementary SKU codes
  tags: string[];
}

export interface OfferFramework {
  id: string;
  name: string;
  trigger: string; // event or condition to use
  structure: string[]; // ordered message blocks
  psychologicalDrivers: string[];
  constraints?: string[];
  metricsFocus?: string[];
}

export interface CreativeFramework {
  id: string;
  name: string;
  hookPatterns: string[];
  bodyPatterns: string[];
  ctaPatterns: string[];
  proofElements: string[];
  variants?: number;
}

export interface AcquisitionPlay {
  id: string;
  channel: string;
  objective: string;
  whenToUse: string[];
  kpis: string[];
  guardrails: string[];
  notes: string[];
}

export interface KPIThreshold {
  metric: string;
  target: string;
  caution: string;
  critical: string;
  optimizationActions: string[];
}

export interface CalcinhaBusinessContext {
  marketSnapshot: string[];
  positioningCore: string[];
  differentiationAngles: string[];
  personas: Persona[];
  productCatalog: ProductVariant[];
  acquisitionPlays: AcquisitionPlay[];
  creativeFrameworks: CreativeFramework[];
  offerFrameworks: OfferFramework[];
  objectionBank: string[];
  pricingPsychology: string[];
  retentionLTV: string[];
  kpiThresholds: KPIThreshold[];
  mlFeatureHints: string[];
  complianceGuidelines: string[];
  toneGuidelines: string[];
}

export const CALCINHA_BUSINESS_CONTEXT: CalcinhaBusinessContext = {
  marketSnapshot: [
    "Alta competitividade em moda íntima digital: diferenciação por conforto, modelagem e experiência pós-compra.",
    "Consumidor busca combinação de estética + funcionalidade (respirabilidade, zero marca, sustentação).",
    "Crescimento de demanda por tamanhos inclusivos e comunicação body-positive autêntica.",
    "Atenção a sensibilidade de anúncios: evitar conteúdo sexualizado explícito para manter compliance em plataformas." ,
    "Logística e velocidade de entrega impactam fortemente recompra e reviews." 
  ],
  positioningCore: [
    "Marca centrada em conforto inteligente + design elegante diário.",
    "Promessa: sentir-se confiante sem sacrificar respirabilidade e modelagem natural.",
    "Pilares: conforto anatômico, tecidos tecnológicos, inclusão de tamanhos, design minimal premium." 
  ],
  differentiationAngles: [
    "Modelagem que não enrola e não marca sob roupas justas.",
    "Tecidos que equilibram maciez e elasticidade durável.",
    "Curadoria de cores neutras estratégicas para o dia a dia + edições sazonais limitadas.",
    "Guia de tamanhos preciso + suporte consultivo para reduzir trocas." 
  ],
  personas: [
    {
      id: 'executiva_conforto',
      name: 'Profissional Dinâmica',
      ageRange: '28-40',
      archetype: 'Alta performance consciente',
      motivations: ['Praticidade', 'Conforto o dia todo', 'Autoconfiança discreta'],
      painPoints: ['Marcas sob roupa social', 'Tecidos que irritam', 'Peças que deformam rápido'],
      objections: ['Preço acima de opções básicas', 'Durabilidade real?', 'Transparência de tecidos claros'],
      preferredAngles: ['Tecnologia do tecido', 'Durabilidade', 'Zero marca'],
      contentHooks: ['Teste de invisibilidade', 'Antes/depois marca', 'Checklist conforto']
    },
    {
      id: 'fit_lifestyle',
      name: 'Wellness & Movimento',
      ageRange: '24-35',
      archetype: 'Equilíbrio ativo',
      motivations: ['Respirabilidade', 'Secagem rápida', 'Mobilidade'],
      painPoints: ['Peças que prendem suor', 'Desconforto em treino leve', 'Costuras que irritam'],
      objections: ['Vai marcar na calça legging?', 'Suor e odores?', 'Aguenta lavagens frequentes?'],
      preferredAngles: ['Respirabilidade', 'Elasticidade', 'Tecnologia anti odor'],
      contentHooks: ['Teste movimento 360°', 'Comparativo suor', 'Lavagem stress test']
    },
    {
      id: 'tamanhos_inclusivos',
      name: 'Corpos Reais',
      ageRange: '30-48',
      archetype: 'Confiança em evolução',
      motivations: ['Autoaceitação', 'Segurança', 'Modelagem estável'],
      painPoints: ['Cós que enrola', 'Marcas laterais', 'Dificuldade acertar tamanho'],
      objections: ['Vai lacear?', 'Vai escorregar?', 'Trocas difíceis?'],
      preferredAngles: ['Modelagem inteligente', 'Guia tamanhos assertivo', 'Depoimentos reais'],
      contentHooks: ['Prova social corpos reais', 'Guia de medidas prático', 'Teste de elasticidade']
    }
  ],
  productCatalog: [
    {
      sku: 'CALC-SEAMLESS-NUDE',
      category: 'calcinha',
      style: 'seamless',
      fabric: 'microfiber tech',
      colors: ['nude', 'preto', 'rose'],
      sizes: ['PP','P','M','G','GG','XG'],
      price: 39.9,
      priceAnchor: 89.9, // ✅ CORRIGIDO: anchor realista para não confundir vendas
      benefits: ['Zero marca', 'Toque gelado', 'Secagem rápida'],
      upsell: ['CALC-SEAMLESS-KIT3'],
      crossSell: ['TOP-BASIC-COMFY'],
      tags: ['invisivel','conforto','daily']
    },
    {
      sku: 'CALC-RENDATRIM-PRETO',
      category: 'calcinha',
      style: 'renda',
      fabric: 'lace premium + cotton gusset',
      colors: ['preto','bordo','branco'],
      sizes: ['P','M','G','GG'],
      price: 49.9,
      priceAnchor: 89.9, // ✅ CORRIGIDO: anchor realista
      benefits: ['Acabamento delicado', 'Respiro de algodão', 'Elasticidade estruturada'],
      upsell: ['CONJ-RENDABASE-PRETO'],
      crossSell: ['ROBE-SATIN-PRETO'],
      tags: ['renda','elegante']
    },
    {
      sku: 'CALC-MODELADORA-NUDE',
      category: 'calcinha',
      style: 'modeladora',
      fabric: 'compress tech blend',
      colors: ['nude','preto'],
      sizes: ['P','M','G','GG','XG','XXG'],
      price: 79.9,
      priceAnchor: 99.9,
      benefits: ['Modela sem desconforto', 'Cintura estável', 'Costuras suaves'],
      upsell: ['BODY-MODELADOR-BASIC'],
      crossSell: ['CALC-SEAMLESS-NUDE'],
      tags: ['modeladora','suporte']
    }
  ],
  acquisitionPlays: [
    {
      id: 'fb_awareness_hook',
      channel: 'facebook_ads',
      objective: 'Awareness + warm pixel',
      whenToUse: ['Lançamento coleção', 'Entrada novo público lookalike'],
      kpis: ['CPM','CTR','ViewContent'],
      guardrails: ['Evitar ângulos sensuais explícitos', 'Manter copy educativa >40%'],
      notes: ['Variar 3 ganchos de dor funcional', 'Criar versão quadrada e vertical']
    },
    {
      id: 'ig_reels_trial',
      channel: 'instagram_reels',
      objective: 'Engajamento + micro conversões',
      whenToUse: ['Validar novo framework criativo'],
      kpis: ['VTR','Saves','Shares','ProfileVisits'],
      guardrails: ['Primeiros 1.5s com mudança visual forte'],
      notes: ['Inserir prova social no segundo terço']
    }
  ],
  creativeFrameworks: [
    {
      id: 'hook_problem_solution',
      name: 'Problema > Reframe > Solução',
      hookPatterns: ['Cansada de calcinha que ...?', 'O erro que faz sua lingerie ...'],
      bodyPatterns: ['Mostrar problema visual', 'Comparativo rápido', 'Explicar tecido/tecnologia'],
      ctaPatterns: ['Descubra seu tamanho perfeito', 'Veja a diferença no corpo'],
      proofElements: ['Depoimento real', 'Close tecido', 'Teste de elasticidade']
    },
    {
      id: 'demo_test',
      name: 'Teste Visual Direto',
      hookPatterns: ['Desafio da calcinha invisível', 'Teste dobra & elasticidade'],
      bodyPatterns: ['Exibir movimento 360°', 'Esticar + soltar', 'Comparar com concorrente genérico'],
      ctaPatterns: ['Sinta a diferença', 'Experimente hoje'],
      proofElements: ['Split screen', 'Zoom costura', 'Print review']
    }
  ],
  offerFrameworks: [
    {
      id: 'anchor_bundle',
      name: 'Bundle Ancorado',
      trigger: 'Aumento de ticket médio / lançamento coleção',
      structure: ['Apresentar preço unitário', 'Anchor preço maior', 'Bundle com % economia', 'Urgência leve estoque limitado'],
      psychologicalDrivers: ['Ancoragem', 'Escassez suave', 'Valor percebido'],
      metricsFocus: ['AOV','ConversionRate']
    },
    {
      id: 'welcome_flow',
      name: 'Fluxo Boas-Vindas',
      trigger: 'Novo lead - captura pop-up',
      structure: ['Benefício principal', 'Prova social curta', 'Cupom limitado', 'CTA com reforço de conforto'],
      psychologicalDrivers: ['Reciprocidade', 'Urgência', 'Prova'],
      metricsFocus: ['LeadToFirstPurchase']
    }
  ],
  objectionBank: [
    'Preço está acima de fast-fashion',
    'Não sei meu tamanho exato',
    'Será que marca na roupa?',
    'Renda pode coçar/irritar',
    'Troca é complicada?'
  ],
  pricingPsychology: [
    'Usar preço âncora ~35-45% maior para reforçar valor do bundle',
    'Empacotar kit 3 e kit 5 com economia progressiva',
    'Destacar economia anual estimada (redução trocas)' 
  ],
  retentionLTV: [
    'Fluxo pós-compra com dicas de cuidado prolonga vida útil -> reforça valor',
    'Programa pontos baseado em variedade de estilos adquiridos',
    'Sequência reativação 60 dias com proposta de upgrade de modelagem' 
  ],
  kpiThresholds: [
    {
      metric: 'CTR',
      target: '>1.2%',
      caution: '0.8-1.2%',
      critical: '<0.8%',
      optimizationActions: ['Trocar hook', 'Adicionar contraste visual inicial', 'Testar ângulo funcional vs estético']
    },
    {
      metric: 'CPM',
      target: '< R$18',
      caution: 'R$18-25',
      critical: '> R$25',
      optimizationActions: ['Ajustar segmentação', 'Ampliar público lookalike', 'Variar criativo para freshness']
    },
    {
      metric: 'ConversionRate',
      target: '>2.4%',
      caution: '1.6-2.4%',
      critical: '<1.6%',
      optimizationActions: ['Rever oferta', 'Adicionar prova social dinâmica', 'Teste de garantia confiança']
    }
  ],
  mlFeatureHints: [
    'Mapear persona -> padrão de criativo vencedor por horário',
    'Relacionar hookPattern -> CTR incremental',
    'Elasticidade preço bundle vs AOV',
    'Objeção mencionada em chat -> cluster de abandono checkout'
  ],
  complianceGuidelines: [
    'Evitar linguagem sexual explícita',
    'Garantir diversidade representativa em visual descrito',
    'Não fazer promessas exageradas de resultados físicos' 
  ],
  toneGuidelines: [
    'Confiança acolhedora',
    'Educativo sem jargão técnico excessivo',
    'Positivo e inclusivo' 
  ]
};

export const CALCINHA_FACEBOOK_STRATEGY = `
Estratégia Facebook Ads (Calcinha / Lingerie Conforto)
1) Estrutura de Campanhas
 - Topo: Hooks funcionais (zero marca, conforto 12h, respiração) + testes A/B
 - Meio: Prova social + demonstração tecidos + comparativo concorrente genérico
 - Fundo: Oferta bundle + urgência suave + reviews específicos de dor resolvida
2) Rotina de Otimização
 - Dia 1-2: Validação CTR e VTR -> pausar <70% benchmark
 - Dia 3-4: Escalar conjuntos com CPA <= alvo e frequência < 2.5
 - Semana 2: Introduzir variantes criativas usando padrões vencedores (hook adaptado)
3) Biblioteca de Creatives
 - Reels demonstração movimento 360° (seamless)
 - Split test invisibilidade (leggings clara)
 - Teste elasticidade vs peça comum
 - Depoimentos corpos reais (diversidade)
4) Métricas Centrais
 - CTR Primário >1.2% / Secundário: AddsToCart, ViewContent
 - CPA alvo inicial -> derivar de margem unitária e meta ROAS
 - Frequência controle para evitar fadiga < 3.0
5) Checklist Compliance
 - Sem close-up excessivamente sugestivo
 - Copy foca conforto funcional / tecnologia
`;
