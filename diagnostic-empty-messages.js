#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO COMPLETO - Onde o sistema falha com mensagens vazias?
 * 
 * Este script vai testar CADA PONTO do fluxo para encontrar exatamente
 * onde as mensagens vazias conseguem passar.
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Simular o ambiente do backend
process.chdir(join(__dirname, 'backend'))

console.log('🔍 === DIAGNÓSTICO COMPLETO: MENSAGENS VAZIAS ===')
console.log('')

async function testConversationGPT() {
  try {
    console.log('1️⃣ TESTANDO: conversationGPT_fixed.ts')
    console.log('   ↳ Pode gerar resposta vazia quando recebe entrada vazia?')
    
    const { processConversationMessage } = await import('./backend/src/services/bot/conversationGPT_fixed.js')
    
    // Testar diferentes tipos de entrada vazia
    const testCases = [
      { name: 'String vazia', input: '' },
      { name: 'Undefined', input: undefined },
      { name: 'Só espaços', input: '   ' },
      { name: 'Só quebras', input: '\n\n' }
    ]
    
    for (const testCase of testCases) {
      console.log(`\n   📝 Teste: ${testCase.name}`)
      console.log(`   📞 Phone: 5511999999999`)
      console.log(`   💬 Input: "${testCase.input}"`)
      
      try {
        const result = await processConversationMessage('5511999999999', testCase.input)
        
        if (!result || result.trim().length === 0) {
          console.log(`   ❌ PROBLEMA ENCONTRADO! Retornou vazio: "${result}"`)
        } else {
          console.log(`   ✅ OK: "${result.substring(0, 50)}..."`)
        }
      } catch (error) {
        console.log(`   ⚠️  Erro: ${error.message}`)
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao importar: ${error.message}`)
  }
}

async function testWhatsAppClient() {
  try {
    console.log('\n2️⃣ TESTANDO: whatsappClient_wwjs.ts')
    console.log('   ↳ A validação EMPTY_MESSAGE_BLOCKED funciona?')
    
    const { sendWhatsAppMessage } = await import('./backend/src/services/bot/whatsappClient_wwjs.js')
    
    const testCases = [
      { name: 'String vazia', message: '' },
      { name: 'Só espaços', message: '   ' },
      { name: 'Só quebras', message: '\n\n' }
    ]
    
    for (const testCase of testCases) {
      console.log(`\n   📝 Teste: ${testCase.name}`)
      console.log(`   📞 Phone: 5511999999999`)
      console.log(`   💬 Message: "${testCase.message}"`)
      
      try {
        await sendWhatsAppMessage('5511999999999', testCase.message)
        console.log(`   ❌ PROBLEMA! Mensagem vazia passou pela validação!`)
      } catch (error) {
        if (error.message === 'EMPTY_MESSAGE_BLOCKED') {
          console.log(`   ✅ OK: Validação bloqueou mensagem vazia`)
        } else {
          console.log(`   ⚠️  Erro inesperado: ${error.message}`)
        }
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao importar: ${error.message}`)
  }
}

async function testInboundProcessor() {
  try {
    console.log('\n3️⃣ TESTANDO: inboundProcessorGPT.ts')
    console.log('   ↳ Como processa mensagens vazias do WhatsApp?')
    
    const { processInbound } = await import('./backend/src/services/bot/inboundProcessorGPT.js')
    
    const testMessage = {
      from: '5511999999999@c.us',
      body: '', // MENSAGEM VAZIA
      timestamp: Date.now() / 1000,
      type: 'chat',
      hasMedia: false
    }
    
    console.log(`\n   📝 Simulando mensagem WhatsApp vazia`)
    console.log(`   📞 From: ${testMessage.from}`)
    console.log(`   💬 Body: "${testMessage.body}"`)
    
    try {
      const result = await processInbound(testMessage)
      
      console.log(`\n   📊 RESULTADO:`)
      console.log(`   ✓ Success: ${result.success}`)
      console.log(`   ✓ Response: "${result.response}"`)
      console.log(`   ✓ TypingDelay: ${result.typingDelay}`)
      
      if (result.success && result.response && result.response.trim().length > 0) {
        console.log(`   ✅ OK: Sistema tratou mensagem vazia e gerou resposta`)
      } else {
        console.log(`   ❌ PROBLEMA: Sistema não conseguiu tratar mensagem vazia`)
      }
      
    } catch (error) {
      console.log(`   ❌ Erro no processamento: ${error.message}`)
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao importar: ${error.message}`)
  }
}

async function testBotVigia() {
  try {
    console.log('\n4️⃣ TESTANDO: botVigia.ts')
    console.log('   ↳ O Vigia pode gerar resposta vazia?')
    
    const { BotVigia } = await import('./backend/src/services/bot/botVigia.js')
    
    const vigia = new BotVigia()
    
    const testCases = [
      { 
        name: 'Resposta vazia do GPT', 
        originalMessage: 'oi',
        assistantResponse: ''
      },
      { 
        name: 'Resposta só espaços', 
        originalMessage: 'oi',
        assistantResponse: '   '
      }
    ]
    
    for (const testCase of testCases) {
      console.log(`\n   📝 Teste: ${testCase.name}`)
      console.log(`   💬 Original: "${testCase.originalMessage}"`)
      console.log(`   🤖 Assistant: "${testCase.assistantResponse}"`)
      
      try {
        const result = await vigia.processResponse(
          testCase.assistantResponse,
          testCase.originalMessage,
          '5511999999999',
          []
        )
        
        if (!result || result.trim().length === 0) {
          console.log(`   ❌ PROBLEMA! Vigia retornou vazio: "${result}"`)
        } else {
          console.log(`   ✅ OK: "${result.substring(0, 50)}..."`)
        }
      } catch (error) {
        console.log(`   ⚠️  Erro: ${error.message}`)
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao importar: ${error.message}`)
  }
}

// Executar todos os testes
async function runDiagnostic() {
  console.log('🚀 Iniciando diagnóstico completo...\n')
  
  await testConversationGPT()
  await testWhatsAppClient()
  await testInboundProcessor()
  await testBotVigia()
  
  console.log('\n🎯 === ANÁLISE ===')
  console.log('Se algum teste falhou, esse é o ponto onde as mensagens vazias escapam!')
  console.log('Se todos passaram, o problema pode estar na integração entre os módulos.')
  console.log('\n🏁 Diagnóstico finalizado!')
}

runDiagnostic().catch(console.error)
