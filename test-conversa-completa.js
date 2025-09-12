import axios from 'axios';

// Configuração do teste
const API_BASE = 'http://localhost:3001';
const TEST_PHONE = '5511999887766'; // Número de teste

// Headers padrão
const headers = {
  'Content-Type': 'application/json'
};

// Função para simular mensagem do cliente
async function sendMessage(phone, message) {
  console.log(`\n📤 ENVIANDO: "${message}"`);
  
  try {
    const response = await axios.post(`${API_BASE}/webhook/inbound`, {
      phone: phone,
      body: message,
      timestamp: Date.now(),
      id: `test_${Date.now()}`,
      source: 'test'
    }, { headers });
    
    console.log(`📥 RESPOSTA: "${response.data?.response || 'Sem resposta'}"`);
    return response.data?.response;
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    return null;
  }
}

// Função para delay entre mensagens
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Teste completo de venda
async function testeVendaCompleta() {
  console.log('🚀 INICIANDO TESTE COMPLETO DE VENDA');
  console.log('=' .repeat(50));
  
  try {
    // 1. Primeira interação - Cliente interessado
    console.log('\n🎯 FASE 1: INTERESSE INICIAL');
    await sendMessage(TEST_PHONE, 'oi, vi sobre a calcinha modeladora');
    await sleep(2000);
    
    // 2. Cliente pergunta sobre preço
    console.log('\n💰 FASE 2: PERGUNTA SOBRE PREÇO');
    await sendMessage(TEST_PHONE, 'quanto custa?');
    await sleep(2000);
    
    // 3. Cliente demonstra interesse
    console.log('\n✨ FASE 3: DEMONSTRA INTERESSE');
    await sendMessage(TEST_PHONE, 'quero sim, como faço para comprar?');
    await sleep(2000);
    
    // 4. Fornecer nome
    console.log('\n📝 FASE 4: COLETA DE DADOS - NOME');
    await sendMessage(TEST_PHONE, 'Maria Silva');
    await sleep(2000);
    
    // 5. Teste de validação de nome inválido
    console.log('\n❌ FASE 5: TESTE VALIDAÇÃO NOME INVÁLIDO');
    await sendMessage(TEST_PHONE, 'eu');
    await sleep(2000);
    
    // 6. Fornecer nome válido
    console.log('\n✅ FASE 6: NOME VÁLIDO');
    await sendMessage(TEST_PHONE, 'Maria Silva Santos');
    await sleep(2000);
    
    // 7. Fornecer endereço
    console.log('\n🏠 FASE 7: COLETA DE DADOS - ENDEREÇO');
    await sendMessage(TEST_PHONE, 'Rua das Flores, 123, Centro, 01234-567');
    await sleep(2000);
    
    // 8. Teste de mudança de dados
    console.log('\n🔄 FASE 8: TESTE MUDANÇA DE DADOS');
    await sendMessage(TEST_PHONE, 'quero mudar meu nome para Ana Maria');
    await sleep(2000);
    
    // 9. Confirmação final
    console.log('\n✅ FASE 9: CONFIRMAÇÃO FINAL');
    await sendMessage(TEST_PHONE, 'sim, está correto');
    await sleep(2000);
    
    // 10. Teste de abandono
    console.log('\n🛑 FASE 10: TESTE DE ABANDONO');
    await sendMessage(TEST_PHONE, 'não quero mais');
    await sleep(2000);
    
    console.log('\n🎉 TESTE COMPLETO FINALIZADO!');
    
  } catch (error) {
    console.error(`❌ ERRO NO TESTE: ${error.message}`);
  }
}

// Executar teste
testeVendaCompleta();
