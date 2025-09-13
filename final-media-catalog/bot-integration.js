
// 🤖 CÓDIGO DE INTEGRAÇÃO PARA O BOT
// Usar as imagens otimizadas no sistema de vendas

const OPTIMIZED_IMAGES = {
  sizeCharts: [
    'size-charts_1.jpeg' // Imagem mostrando tabela de medidas com desconto de 50%.
  ],
  
  promotional: [
    'promotional_1.jpeg' // Imagem categorizada automaticamente como other,\n    'promotional_2.jpeg' // Imagem categorizada automaticamente como other,\n    'promotional_3.jpeg' // Imagem categorizada automaticamente como other,\n    'promotional_4.jpeg' // Imagem categorizada automaticamente como other,\n    'promotional_5.jpeg' // Imagem categorizada automaticamente como other
  ],
  
  testimonials: [
    'testimonials_1.jpeg' // Imagem de uma mulher usando calcinha modeladora nude destacando características do produto.,\n    'testimonials_2.jpeg' // Imagem de feedback de cliente sobre a calcinha modeladora, destacando conforto e modelagem.,\n    'testimonials_3.jpeg' // Imagem mostrando o resultado do uso da calcinha modeladora sob um vestido cinza.
  ],
  
  product: [
    'product-images_1.jpeg' // Comparação visual do efeito da calcinha modeladora em um vestido azul.,\n    'product-images_2.jpeg' // Imagem mostrando comparação antes e depois do uso da calcinha modeladora.
  ]
};

// 📏 Função para enviar tabela de medidas
export function sendSizeChart(customerPhone) {
  const image = OPTIMIZED_IMAGES.sizeCharts[0];
  return sendImage(customerPhone, `/final-media-catalog/tabela-medidas/${image}`);
}

// 🎯 Função para enviar imagem promocional
export function sendPromotionalImage(customerPhone, index = 0) {
  const image = OPTIMIZED_IMAGES.promotional[index];
  return sendImage(customerPhone, `/final-media-catalog/promocional/${image}`);
}

// 👥 Função para enviar depoimento
export function sendTestimonial(customerPhone, index = 0) {
  const image = OPTIMIZED_IMAGES.testimonials[index];
  return sendImage(customerPhone, `/final-media-catalog/depoimentos/${image}`);
}
