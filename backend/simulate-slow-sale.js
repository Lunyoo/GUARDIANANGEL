import axios from 'axios';

const baseURL = 'http://localhost:3001';
const phone = '5511998877665'; // Novo número para evitar conflitos

async function sendAndWait(body, description, waitTime = 4000) {
  console.log(`\n🔄 ${description}`);
  console.log(`📤 Enviando: "${body}"`);
  
  try {
    const response = await axios.post(`${baseURL}/api/public/test-wa-message`, {
      phone: phone,
      body: body
    });
    
    console.log('✅ Mensagem enviada');
    
    // Aguardar processamento
    console.log(`⏳ Aguardando ${waitTime/1000}s para próxima mensagem...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

async function completeFlowSimulation() {
  console.log('🎬 NOVA SIMULAÇÃO DE VENDA COMPLETA');
  console.log('📱 Cliente:', phone);
  console.log('⏰ Timing: Mensagens com intervalo de 4 segundos');
  console.log('=' .repeat(60));
  
  // Fluxo sequencial com intervalos maiores
  await sendAndWait('Oi', '1️⃣ Cliente inicia conversa');
  
  await sendAndWait('Quero saber sobre a calcinha modeladora', '2️⃣ Cliente demonstra interesse');
  
  await sendAndWait('Quero ver as fotos', '3️⃣ Cliente pede fotos', 8000); // Mais tempo para fotos
  
  await sendAndWait('Qual o preço?', '4️⃣ Cliente pergunta preço');
  
  await sendAndWait('Quero comprar 2 unidades', '5️⃣ Cliente decide quantidade');
  
  await sendAndWait('Moro no Rio de Janeiro', '6️⃣ Cliente informa cidade COD');
  
  await sendAndWait('Meu nome é Maria da Silva', '7️⃣ Cliente informa nome');
  
  await sendAndWait('Quero a cor bege', '8️⃣ Cliente escolhe cor');
  
  await sendAndWait('Rua das Palmeiras, 456, Ipanema, Rio de Janeiro', '9️⃣ Cliente informa endereço completo');
  
  await sendAndWait('Sim, confirmo a compra', '🔟 Cliente confirma o pedido final');
  
  console.log('\n🎉 SIMULAÇÃO COMPLETA FINALIZADA!');
  console.log('✅ Verifique os logs para ver o fluxo completo');
}

// Executar
completeFlowSimulation().catch(console.error);
