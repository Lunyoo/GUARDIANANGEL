#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * 🧹 Script para otimizar imagens: remover duplicatas e criar catálogo final
 */

const ORGANIZED_BASE = '/home/alex/GUARDIANANGEL/organized-media';
const FINAL_BASE = '/home/alex/GUARDIANANGEL/final-media-catalog';

// Criar estrutura final otimizada
const FINAL_STRUCTURE = {
  'size-charts': {
    folder: 'tabela-medidas',
    limit: 2, // Manter apenas as 2 melhores
    priority: 'confidence'
  },
  'promotional': {
    folder: 'promocional', 
    limit: 20, // Melhores 20 promocionais
    priority: 'confidence'
  },
  'testimonials': {
    folder: 'depoimentos',
    limit: 15, // Melhores 15 depoimentos
    priority: 'confidence'
  },
  'product-images': {
    folder: 'produto',
    limit: 10, // Melhores 10 do produto
    priority: 'confidence'
  }
};

function calculateFileHash(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(data).digest('hex');
}

function loadAnalysis(imagePath) {
  const analysisPath = imagePath.replace(path.extname(imagePath), '.analysis.json');
  
  if (fs.existsSync(analysisPath)) {
    try {
      return JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    } catch (error) {
      console.warn(`❌ Erro ao carregar análise: ${analysisPath}`);
      return null;
    }
  }
  return null;
}

function getImagesFromCategory(category) {
  const categoryPath = path.join(ORGANIZED_BASE, category);
  
  if (!fs.existsSync(categoryPath)) {
    return [];
  }
  
  const files = fs.readdirSync(categoryPath).filter(file => 
    file.match(/\.(jpeg|jpg|png|webp|gif)$/i)
  );
  
  const images = [];
  const hashSeen = new Set();
  
  for (const file of files) {
    const imagePath = path.join(categoryPath, file);
    const hash = calculateFileHash(imagePath);
    
    // Pular duplicatas
    if (hashSeen.has(hash)) {
      console.log(`🗑️ Duplicata encontrada: ${file}`);
      continue;
    }
    
    hashSeen.add(hash);
    const analysis = loadAnalysis(imagePath);
    
    images.push({
      file,
      path: imagePath,
      hash,
      analysis,
      confidence: analysis?.confidence || 0,
      size: fs.statSync(imagePath).size
    });
  }
  
  return images;
}

function selectBestImages(images, config) {
  // Ordenar por confiança (maior primeiro)
  const sorted = images.sort((a, b) => {
    if (config.priority === 'confidence') {
      return b.confidence - a.confidence;
    }
    return b.size - a.size; // Por tamanho se não for confiança
  });
  
  // Retornar apenas o limite especificado
  return sorted.slice(0, config.limit);
}

function copyOptimizedImages() {
  // Criar estrutura de diretórios final
  if (!fs.existsSync(FINAL_BASE)) {
    fs.mkdirSync(FINAL_BASE, { recursive: true });
  }
  
  const finalCatalog = {
    metadata: {
      createdAt: new Date().toISOString(),
      totalOriginal: 0,
      totalOptimized: 0,
      categories: {}
    },
    images: {}
  };
  
  for (const [category, config] of Object.entries(FINAL_STRUCTURE)) {
    console.log(`\\n📁 Processando categoria: ${category}`);
    
    // Criar pasta final
    const finalCategoryPath = path.join(FINAL_BASE, config.folder);
    if (!fs.existsSync(finalCategoryPath)) {
      fs.mkdirSync(finalCategoryPath, { recursive: true });
    }
    
    // Obter imagens da categoria
    const images = getImagesFromCategory(category);
    console.log(`  📸 ${images.length} imagens únicas encontradas`);
    
    // Selecionar as melhores
    const bestImages = selectBestImages(images, config);
    console.log(`  ⭐ ${bestImages.length} melhores selecionadas`);
    
    // Copiar para estrutura final
    finalCatalog.images[category] = [];
    
    bestImages.forEach((image, index) => {
      const newFileName = `${category}_${index + 1}${path.extname(image.file)}`;
      const finalPath = path.join(finalCategoryPath, newFileName);
      
      // Copiar imagem
      fs.copyFileSync(image.path, finalPath);
      
      // Copiar análise
      const finalAnalysisPath = finalPath.replace(path.extname(finalPath), '.analysis.json');
      if (image.analysis) {
        fs.writeFileSync(finalAnalysisPath, JSON.stringify(image.analysis, null, 2));
      }
      
      finalCatalog.images[category].push({
        fileName: newFileName,
        originalName: image.file,
        confidence: image.confidence,
        description: image.analysis?.description || 'Sem descrição',
        tags: image.analysis?.tags || [],
        recommendedFor: image.analysis?.recommendedFor || []
      });
      
      console.log(`    ✅ ${newFileName} (${image.confidence} confiança)`);
    });
    
    finalCatalog.metadata.totalOriginal += images.length;
    finalCatalog.metadata.totalOptimized += bestImages.length;
    finalCatalog.metadata.categories[category] = {
      original: images.length,
      optimized: bestImages.length,
      reduction: Math.round(((images.length - bestImages.length) / images.length) * 100)
    };
  }
  
  // Salvar catálogo final
  fs.writeFileSync(
    path.join(FINAL_BASE, 'catalog.json'),
    JSON.stringify(finalCatalog, null, 2)
  );
  
  return finalCatalog;
}

function generateOptimizedReport(catalog) {
  console.log(`\\n📊 RELATÓRIO DE OTIMIZAÇÃO`);
  console.log(`============================`);
  console.log(`🗂️ Total original: ${catalog.metadata.totalOriginal} imagens`);
  console.log(`⚡ Total otimizado: ${catalog.metadata.totalOptimized} imagens`);
  console.log(`🗑️ Redução: ${Math.round(((catalog.metadata.totalOriginal - catalog.metadata.totalOptimized) / catalog.metadata.totalOriginal) * 100)}%`);
  
  console.log(`\\n📁 Por categoria:`);
  Object.entries(catalog.metadata.categories).forEach(([category, stats]) => {
    console.log(`  ${category}: ${stats.original} → ${stats.optimized} (-${stats.reduction}%)`);
  });
  
  console.log(`\\n🎯 IMAGENS FINAIS SELECIONADAS:`);
  Object.entries(catalog.images).forEach(([category, images]) => {
    console.log(`\\n📂 ${category.toUpperCase()}:`);
    images.forEach((img, i) => {
      console.log(`  ${i + 1}. ${img.fileName} (${img.confidence} conf) - ${img.description}`);
    });
  });
}

function generateBotIntegrationCode(catalog) {
  const integrationCode = `
// 🤖 CÓDIGO DE INTEGRAÇÃO PARA O BOT
// Usar as imagens otimizadas no sistema de vendas

const OPTIMIZED_IMAGES = {
  sizeCharts: [
${catalog.images['size-charts']?.map(img => `    '${img.fileName}' // ${img.description}`).join(',\\n') || '    // Nenhuma imagem de tabela de medidas'}
  ],
  
  promotional: [
${catalog.images['promotional']?.slice(0, 5).map(img => `    '${img.fileName}' // ${img.description}`).join(',\\n') || '    // Nenhuma imagem promocional'}
  ],
  
  testimonials: [
${catalog.images['testimonials']?.slice(0, 5).map(img => `    '${img.fileName}' // ${img.description}`).join(',\\n') || '    // Nenhum depoimento'}
  ],
  
  product: [
${catalog.images['product-images']?.slice(0, 3).map(img => `    '${img.fileName}' // ${img.description}`).join(',\\n') || '    // Nenhuma imagem de produto'}
  ]
};

// 📏 Função para enviar tabela de medidas
export function sendSizeChart(customerPhone) {
  const image = OPTIMIZED_IMAGES.sizeCharts[0];
  return sendImage(customerPhone, \`/final-media-catalog/tabela-medidas/\${image}\`);
}

// 🎯 Função para enviar imagem promocional
export function sendPromotionalImage(customerPhone, index = 0) {
  const image = OPTIMIZED_IMAGES.promotional[index];
  return sendImage(customerPhone, \`/final-media-catalog/promocional/\${image}\`);
}

// 👥 Função para enviar depoimento
export function sendTestimonial(customerPhone, index = 0) {
  const image = OPTIMIZED_IMAGES.testimonials[index];
  return sendImage(customerPhone, \`/final-media-catalog/depoimentos/\${image}\`);
}
`;

  fs.writeFileSync(
    path.join(FINAL_BASE, 'bot-integration.js'),
    integrationCode
  );
  
  console.log(`\\n🤖 Código de integração gerado: ${FINAL_BASE}/bot-integration.js`);
}

// 🚀 EXECUÇÃO PRINCIPAL
async function main() {
  console.log('🧹 Iniciando otimização das imagens...\\n');
  
  const catalog = copyOptimizedImages();
  generateOptimizedReport(catalog);
  generateBotIntegrationCode(catalog);
  
  console.log(`\\n✅ Otimização concluída!`);
  console.log(`📂 Catálogo final em: ${FINAL_BASE}`);
  console.log(`🤖 Pronto para integração com o bot!`);
}

main().catch(console.error);
