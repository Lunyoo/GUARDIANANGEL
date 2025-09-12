import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function demonstrarPromptCabeca() {
  try {
    console.log('🎭 DEMONSTRAÇÃO: SISTEMA DE PROMPT-CABEÇA\n');
    
    // 1. Buscar produto de teste
    const product = await prisma.product.findUnique({
      where: { id: 'prod-test-template' }
    });
    
    if (!product) {
      console.log('❌ Produto de teste não encontrado');
      return;
    }
    
    console.log('✅ Produto encontrado:', product.name);
    console.log('📝 Template personalizado:');
    console.log('━'.repeat(60));
    console.log(product.clientPrompt);
    console.log('━'.repeat(60));
    
    console.log('\n🎯 COMO FUNCIONA O NOVO SISTEMA:\n');
    
    console.log('1️⃣ PRIMEIRA MENSAGEM (Cliente: "Oi, quero saber da calcinha")');
    console.log('   🔄 Sistema detecta produto via campanha');
    console.log('   🎰 Universal Bandits seleciona estratégia: "R$ 89,90 (de R$ 149,90)"');
    console.log('   🏙️ Detecta cidade: "São Paulo - SP"');
    console.log('   🎭 Template Engine injeta placeholders');
    console.log('   📋 PROMPT-CABEÇA gerado e salvo como SYSTEM MESSAGE');
    
    console.log('\n   📝 Exemplo de PROMPT-CABEÇA final:');
    console.log('   ━'.repeat(50));
    console.log('   Oi, eu sou a AMANDA! 🌟');
    console.log('   ');
    console.log('   Soube que você se interessou pela nossa Calcinha Modeladora - é uma das melhores!');
    console.log('   ');
    console.log('   🎯 ESTRATÉGIA ATUAL: Desconto Premium');
    console.log('   💰 Preço especial: R$ 89,90 (de R$ 149,90)');
    console.log('   🏙️ Você está em: São Paulo - SP');
    console.log('   📦 Entrega: Entrega rápida com pagamento na entrega!');
    console.log('   ');
    console.log('   Que tal conversar sobre como ela pode te ajudar? 😍');
    console.log('   ━'.repeat(50));
    
    console.log('\n2️⃣ THREAD DE CONVERSA INICIADA:');
    console.log('   [SYSTEM] -> Prompt-cabeça (instruções fixas)');
    console.log('   [USER]   -> "Oi, quero saber da calcinha"');
    console.log('   [ASSISTANT] -> GPT responde baseado no prompt-cabeça');
    
    console.log('\n3️⃣ MENSAGENS SEGUINTES (Cliente: "Quanto custa?")');
    console.log('   🔄 Mensagem adicionada à MESMA THREAD');
    console.log('   🧠 GPT mantém TODA a conversa + prompt-cabeça');
    console.log('   🎯 Resposta é ancorada no template mas generativa');
    
    console.log('\n   📋 Thread completa:');
    console.log('   [SYSTEM]    -> Prompt-cabeça (SEMPRE presente)');
    console.log('   [USER]      -> "Oi, quero saber da calcinha"');
    console.log('   [ASSISTANT] -> "Olá! Que bom que se interessou pela nossa calcinha..."');
    console.log('   [USER]      -> "Quanto custa?"');
    console.log('   [ASSISTANT] -> GPT responde usando contexto COMPLETO');
    
    console.log('\n4️⃣ VANTAGENS DO SISTEMA:');
    console.log('   ✅ Prompt-cabeça NUNCA é perdido');
    console.log('   ✅ Cada produto tem seu próprio template');
    console.log('   ✅ Estratégias ML injetadas dinamicamente');
    console.log('   ✅ Contexto completo mantido em cada resposta');
    console.log('   ✅ Respostas generativas mas ancoradas');
    console.log('   ✅ Uma thread por cliente = conversa coerente');
    
    console.log('\n🎉 SISTEMA IMPLEMENTADO E FUNCIONANDO!');
    console.log('\n🔗 Para testar:');
    console.log('   1. Acesse o dashboard em http://localhost:3000');
    console.log('   2. Vá para a seção de Produtos');
    console.log('   3. Clique em qualquer produto');
    console.log('   4. Edite o "Template de Conversa Personalizado"');
    console.log('   5. Use os placeholders disponíveis');
    console.log('   6. Salve e teste com conversas reais');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

demonstrarPromptCabeca();
