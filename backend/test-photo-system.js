import axios from 'axios';

async function testPhotoSystem() {
  try {
    console.log('🧪 Testando sistema de fotos...');
    
    // Simular mensagem de pedido de foto
    const response = await axios.post('http://localhost:3001/api/public/test-wa-message', {
      phone: '5511999999999',
      body: 'quero ver as fotos do produto'
    });
    
    console.log('✅ Status:', response.status);
    console.log('📱 Resposta:', response.data);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

testPhotoSystem();
