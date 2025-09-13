#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * 🗂️ Script para organizar imagens por categoria baseado na análise IA
 */

const MEDIA_BASE = '/home/alex/GUARDIANANGEL/backend/src/media/products';
const ORGANIZED_BASE = '/home/alex/GUARDIANANGEL/organized-media';

// Mapeamento de categorias para pastas organizadas
const CATEGORY_MAPPING = {
  'tabela de medidas': 'size-charts',
  'product': 'product-images', 
  'testimonial': 'testimonials',
  'antes_depois': 'before-after',
  'comparison': 'before-after',
  'promotional': 'promotional',
  'discount': 'promotional',
  'other': 'promotional'
};

const SUBCATEGORY_MAPPING = {
  'tabela de medidas': 'size-charts',
  'depoimento_cliente': 'testimonials',
  'antes_depois': 'before-after',
  'produto_destaque': 'product-images',
  'promocional': 'promotional'
};

function getAllProducts() {
  try {
    return fs.readdirSync(MEDIA_BASE).filter(dir => 
      fs.statSync(path.join(MEDIA_BASE, dir)).isDirectory()
    );
  } catch (error) {
    console.error('❌ Erro ao ler diretório de produtos:', error);
    return [];
  }
}

function getImageAnalyses(productDir) {
  const imagesDir = path.join(MEDIA_BASE, productDir, 'images');
  
  if (!fs.existsSync(imagesDir)) {
    return [];
  }
  
  const analyses = [];
  const files = fs.readdirSync(imagesDir);
  
  for (const file of files) {
    if (file.endsWith('.analysis.json')) {
      try {
        const analysisPath = path.join(imagesDir, file);
        const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
        
        // Encontrar a imagem correspondente
        const imageBaseName = file.replace('.analysis.json', '');
        const possibleExtensions = ['.jpeg', '.jpg', '.png', '.webp', '.gif'];
        
        let imageFile = null;
        for (const ext of possibleExtensions) {
          const imagePath = path.join(imagesDir, imageBaseName + ext);
          if (fs.existsSync(imagePath)) {
            imageFile = imageBaseName + ext;
            break;
          }
        }
        
        if (imageFile) {
          analyses.push({
            product: productDir,
            imageFile,
            imagePath: path.join(imagesDir, imageFile),
            analysisFile: file,
            analysis
          });
        }
      } catch (error) {
        console.error(`❌ Erro ao processar análise ${file}:`, error);
      }
    }
  }
  
  return analyses;
}

function determineCategory(analysis) {
  const { category, subcategory, tags = [], features = [] } = analysis;
  
  // Prioridade para subcategorias específicas
  if (subcategory && SUBCATEGORY_MAPPING[subcategory]) {
    return SUBCATEGORY_MAPPING[subcategory];
  }
  
  // Verificar por tags específicas
  if (tags.includes('tabela de tamanhos') || tags.includes('medidas') || tags.includes('tamanho')) {
    return 'size-charts';
  }
  
  if (tags.includes('depoimento') || tags.includes('social_proof')) {
    return 'testimonials';
  }
  
  if (tags.includes('antes_depois') || tags.includes('comparação')) {
    return 'before-after';
  }
  
  if (tags.includes('desconto') || tags.includes('promoção') || features.includes('desconto')) {
    return 'promotional';
  }
  
  // Fallback para categoria principal
  return CATEGORY_MAPPING[category] || 'product-images';
}

function copyImageToCategory(imageData) {
  const { imagePath, analysis, product, imageFile } = imageData;
  const targetCategory = determineCategory(analysis);
  const targetDir = path.join(ORGANIZED_BASE, targetCategory);
  
  // Criar nome único: produto_arquivo
  const targetFileName = `${product}_${imageFile}`;
  const targetPath = path.join(targetDir, targetFileName);
  
  try {
    // Copiar imagem
    fs.copyFileSync(imagePath, targetPath);
    
    // Copiar análise junto
    const analysisTargetPath = targetPath.replace(path.extname(targetPath), '.analysis.json');
    const analysisSourcePath = imagePath.replace(path.extname(imagePath), '.analysis.json');
    
    if (fs.existsSync(analysisSourcePath)) {
      fs.copyFileSync(analysisSourcePath, analysisTargetPath);
    }
    
    return { success: true, targetCategory, targetPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateReport(organizedImages) {
  const categoryStats = {};
  const sizeChartImages = [];
  
  organizedImages.forEach(item => {
    const { targetCategory, analysis, product, imageFile } = item;
    
    if (!categoryStats[targetCategory]) {
      categoryStats[targetCategory] = 0;
    }
    categoryStats[targetCategory]++;
    
    // Catalogar imagens de tabela de medidas especificamente
    if (targetCategory === 'size-charts') {
      sizeChartImages.push({
        product,
        file: imageFile,
        description: analysis.description,
        confidence: analysis.confidence
      });
    }
  });
  
  return { categoryStats, sizeChartImages };
}

// 🚀 EXECUÇÃO PRINCIPAL
async function main() {
  console.log('🗂️ Iniciando organização das imagens...\n');
  
  const products = getAllProducts();
  console.log(`📁 Encontrados ${products.length} produtos`);
  
  let totalImages = 0;
  let organizedImages = [];
  
  for (const product of products) {
    console.log(`\n📸 Processando ${product}...`);
    
    const analyses = getImageAnalyses(product);
    console.log(`  ${analyses.length} imagens com análise`);
    
    for (const imageData of analyses) {
      const result = copyImageToCategory(imageData);
      
      if (result.success) {
        organizedImages.push({
          ...imageData,
          targetCategory: result.targetCategory,
          targetPath: result.targetPath
        });
        console.log(`  ✅ ${imageData.imageFile} → ${result.targetCategory}`);
      } else {
        console.log(`  ❌ ${imageData.imageFile}: ${result.error}`);
      }
    }
    
    totalImages += analyses.length;
  }
  
  // Gerar relatório
  const { categoryStats, sizeChartImages } = generateReport(organizedImages);
  
  console.log('\n📊 RELATÓRIO DE ORGANIZAÇÃO');
  console.log('============================');
  console.log(`Total de imagens processadas: ${totalImages}`);
  console.log(`Total organizadas com sucesso: ${organizedImages.length}`);
  console.log('\nDistribuição por categoria:');
  
  Object.entries(categoryStats).forEach(([category, count]) => {
    console.log(`  📁 ${category}: ${count} imagens`);
  });
  
  console.log('\n📏 TABELAS DE MEDIDAS ENCONTRADAS:');
  sizeChartImages.forEach(item => {
    console.log(`  📊 ${item.product}: ${item.description} (${item.confidence} confiança)`);
  });
  
  console.log('\n✅ Organização concluída!');
  console.log(`📂 Imagens organizadas em: ${ORGANIZED_BASE}`);
}

main().catch(console.error);
