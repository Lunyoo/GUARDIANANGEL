// Teste para verificar métodos disponíveis no cliente WhatsApp
import fetch from 'node-fetch'

async function testWhatsAppMethods() {
  try {
    console.log('🔍 Verificando métodos disponíveis no cliente WhatsApp...')
    
    // Criar uma rota de debug temporária para inspecionar o cliente
    const debugCode = `
      // Debug temporário para inspecionar cliente
      if (sock) {
        console.log('📱 Baileys sock disponível')
        console.log('🗂️ Store keys:', Object.keys(sock.store || {}))
        console.log('📊 Store chats:', Object.keys(sock.store?.chats || {}).length)
        
        // Tentar buscar chats de forma diferente
        if (sock.store?.chats) {
          const chats = Object.values(sock.store.chats)
          console.log('💬 Total chats no store:', chats.length)
          
          chats.slice(0, 5).forEach((chat, i) => {
            console.log(\`Chat \${i+1}: \${chat.id} - \${chat.name || 'Sem nome'}\`)
          })
        }
      }
      
      if (client) {
        console.log('📱 Venom client disponível')
        console.log('🔧 Métodos:', Object.getOwnPropertyNames(client).filter(n => n.includes('chat') || n.includes('Chat')))
      }
    `
    
    console.log('📝 Codigo de debug criado. Execute no backend para inspecionar cliente.')
    console.log('---')
    console.log(debugCode)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

testWhatsAppMethods()
