const axios = require('axios');

// Configuração
const BASE_URL = 'http://localhost:3001';
const TEST_PHONE = '+5511999887766';

// Função para simular mensagem
async function sendMessage(message, step = '') {
  try {
    console.log(`\n📱 ${step ? `[${step}] ` : ''}ENVIANDO: "${message}"`);
    
    const response = await axios.post(`${BASE_URL}/api/whatsapp/webhook`, {
      phone: TEST_PHONE,
      message: message,
      timestamp: Date.now()
    });

    if (response.data?.response) {
      console.log(`🤖 RESPOSTA BOT:\n${response.data.response}`);
    } else {
      console.log(`⚠️ Resposta inesperada:`, response.data);
    }
    
    // Aguarda antes da próxima mensagem
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error(`❌ Erro ao enviar "${message}":`, error.response?.data || error.message);
  }
}

// Fluxo completo de teste
async function testeVendaCompleta() {
  console.log('🚀 INICIANDO TESTE DE VENDA COMPLETA COM QUANTIDADE E PREÇO');
  console.log('═'.repeat(70));
  
  try {
    // 1. Mensagem inicial
    await sendMessage('oi, vi um anuncio seu', 'INÍCIO');
    
    // 2. Demonstrar interesse com quantidade específica
    await sendMessage('quero comprar 2 unidades', 'INTERESSE + QTD');
    
    // 3. Nome
    await sendMessage('Maria Silva Santos', 'NOME');
    
    // 4. Cidade
    await sendMessage('São Paulo', 'CIDADE');
    
    // 5. Cor
    await sendMessage('bege', 'COR');
    
    // 6. Tamanho
    await sendMessage('M', 'TAMANHO');
    
    // 7. Endereço para finalizar
    await sendMessage('Rua das Flores 123, Vila Madalena', 'ENDEREÇO');
    
    // 8. Confirmar tudo
    await sendMessage('sim, pode confirmar', 'CONFIRMAÇÃO');
    
    console.log('\n✅ TESTE CONCLUÍDO!');
    console.log('🔍 VERIFIQUE SE O RESUMO FINAL INCLUI:');
    console.log('   - QUANTIDADE: 2 unidades');
    console.log('   - PREÇO TOTAL: R$ 119,90');
    console.log('═'.repeat(70));
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
  }
}

// Executar teste
testeVendaCompleta();
