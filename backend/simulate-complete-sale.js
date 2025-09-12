import axios from 'axios';

const baseURL = 'http://localhost:3001';
const phone = '5511987654321'; // Número de teste para conversa completa

// Função para enviar mensagem e aguardar resposta
async function sendMessage(body, description) {
  console.log(`\n🔄 ${description}`);
  console.log(`📤 Enviando: "${body}"`);
  
  try {
    const response = await axios.post(`${baseURL}/api/public/test-wa-message`, {
      phone: phone,
      body: body
    });
    
    console.log('✅ Mensagem enviada com sucesso');
    
    // Aguardar um pouco para o processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
  }
}

// Função para aguardar entre mensagens
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateCompleteSale() {
  console.log('🎬 INICIANDO SIMULAÇÃO DE VENDA COMPLETA');
  console.log('📱 Telefone do cliente:', phone);
  console.log('=' .repeat(60));
  
  // 1. Primeira mensagem - interesse inicial
  await sendMessage('Oi', 'Cliente entra em contato');
  await sleep(3000);
  
  // 2. Cliente demonstra interesse
  await sendMessage('Quero saber sobre a calcinha modeladora', 'Cliente demonstra interesse no produto');
  await sleep(3000);
  
  // 3. Cliente pede para ver fotos
  await sendMessage('Quero ver as fotos do produto', 'Cliente pede para ver fotos');
  await sleep(5000); // Mais tempo para o sistema enviar imagens
  
  // 4. Cliente gosta e quer saber preço
  await sendMessage('Gostei! Qual o preço?', 'Cliente pergunta sobre preço');
  await sleep(3000);
  
  // 5. Cliente quer comprar
  await sendMessage('Quero comprar 2 unidades', 'Cliente decide comprar');
  await sleep(3000);
  
  // 6. Cliente informa cidade (COD)
  await sendMessage('Moro no Rio de Janeiro', 'Cliente informa cidade com entrega na porta');
  await sleep(3000);
  
  // 7. Cliente informa nome
  await sendMessage('Meu nome é Maria Silva', 'Cliente informa nome');
  await sleep(3000);
  
  // 8. Cliente escolhe cor
  await sendMessage('Quero a cor bege', 'Cliente escolhe cor');
  await sleep(3000);
  
  // 9. Cliente informa endereço
  await sendMessage('Rua das Flores, 123, Copacabana, Rio de Janeiro', 'Cliente informa endereço');
  await sleep(3000);
  
  // 10. Cliente confirma pedido
  await sendMessage('Sim, confirmo o pedido', 'Cliente confirma o pedido');
  await sleep(3000);
  
  console.log('\n🎉 SIMULAÇÃO DE VENDA COMPLETA FINALIZADA!');
  console.log('📊 A venda deve ter sido processada do início ao fim');
  console.log('✅ Verificar logs do backend para detalhes');
}

// Executar simulação
simulateCompleteSale().catch(console.error);
