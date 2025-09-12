#!/usr/bin/env node

/**
 * 🧪 TESTE REAL: Validação de Mensagens Vazias via WhatsApp Client
 * 
 * Este script testa DIRETAMENTE a função processInbound que é chamada
 * quando uma mensagem chega via WhatsApp, incluindo mensagens vazias.
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Simular o caminho do backend
process.chdir(join(__dirname, 'backend'))

// Importar as funções de processamento
async function testEmptyMessageHandling() {
  try {
    console.log('🧪 === TESTE REAL: MENSAGEM VAZIA ===')
    
    // Importar as funções do sistema
    const { processInbound } = await import('./backend/src/services/bot/inboundProcessorGPT.js')
    
    // Simular mensagem vazia como recebida do WhatsApp
    const emptyMessage = {
      from: '5511999999999@c.us',
      body: '',
      timestamp: Date.now() / 1000,
      type: 'chat',
      hasMedia: false
    }
    
    console.log('📞 Simulando mensagem vazia...')
    console.log('   From:', emptyMessage.from)
    console.log('   Body:', `"${emptyMessage.body}"`)
    console.log('   Timestamp:', emptyMessage.timestamp)
    
    // Chamar a função real de processamento
    const result = await processInbound(emptyMessage)
    
    console.log('\n✅ RESULTADO DO TESTE:')
    console.log('   Success:', result.success)
    console.log('   Response:', result.response)
    console.log('   TypingDelay:', result.typingDelay)
    console.log('   Transcription:', result.transcription)
    
    if (result.success && result.response && result.response.trim().length > 0) {
      console.log('\n🎉 TESTE PASSOU!')
      console.log('✅ Sistema tratou mensagem vazia corretamente')
      console.log(`✅ Resposta gerada: "${result.response}"`)
    } else {
      console.log('\n❌ TESTE FALHOU!')
      console.log('❌ Sistema não conseguiu tratar mensagem vazia')
    }
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error)
    console.error('Stack:', error.stack)
  }
}

// Testar diferentes cenários de mensagens vazias
async function testVariousEmptyScenarios() {
  try {
    console.log('\n🧪 === TESTANDO VÁRIOS CENÁRIOS ===')
    
    const { processInbound } = await import('./backend/src/services/bot/inboundProcessorGPT.js')
    
    const scenarios = [
      { name: 'Mensagem completamente vazia', body: '' },
      { name: 'Mensagem só com espaços', body: '   ' },
      { name: 'Mensagem só com quebras de linha', body: '\n\n\n' },
      { name: 'Mensagem com espaços e quebras', body: ' \n  \n ' },
      { name: 'Mensagem undefined', body: undefined }
    ]
    
    for (const scenario of scenarios) {
      console.log(`\n📝 Testando: ${scenario.name}`)
      
      const message = {
        from: '5511999999999@c.us',
        body: scenario.body,
        timestamp: Date.now() / 1000,
        type: 'chat',
        hasMedia: false
      }
      
      try {
        const result = await processInbound(message)
        
        if (result.success && result.response && result.response.trim().length > 0) {
          console.log(`   ✅ PASSOU: "${result.response.substring(0, 50)}..."`)
        } else {
          console.log(`   ❌ FALHOU: ${JSON.stringify(result)}`)
        }
      } catch (error) {
        console.log(`   ❌ ERRO: ${error.message}`)
      }
      
      // Delay entre testes
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
  } catch (error) {
    console.error('❌ ERRO NOS TESTES:', error)
  }
}

// Executar os testes
async function runTests() {
  console.log('🚀 Iniciando testes de mensagem vazia...\n')
  
  await testEmptyMessageHandling()
  await testVariousEmptyScenarios()
  
  console.log('\n🏁 Testes finalizados!')
}

runTests().catch(console.error)
