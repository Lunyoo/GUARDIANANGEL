#!/usr/bin/env node

/**
 * 🧪 TESTE: Verificação de correção de mensagens em branco
 * 
 * Este script testa se o sistema está corrigindo adequadamente:
 * 1. Mensagens completamente vazias
 * 2. Mensagens só com espaços/quebras
 * 3. Mensagens com caracteres invisíveis
 * 4. Se o botVigia está interceptando corretamente
 */

import axios from 'axios'

const BASE_URL = 'http://localhost:3001'

// Casos de teste para mensagens problemáticas
const testCases = [
  {
    name: 'Mensagem completamente vazia',
    message: '',
    expected: 'should_be_blocked_or_corrected'
  },
  {
    name: 'Mensagem só com espaços',
    message: '   ',
    expected: 'should_be_blocked_or_corrected'  
  },
  {
    name: 'Mensagem só com quebras de linha',
    message: '\n\n\n',
    expected: 'should_be_blocked_or_corrected'
  },
  {
    name: 'Mensagem com tabs e espaços',
    message: '\t  \t  ',
    expected: 'should_be_blocked_or_corrected'
  },
  {
    name: 'Mensagem válida (controle)',
    message: 'Olá, gostaria de informações sobre o produto',
    expected: 'should_work_normally'
  },
  {
    name: 'Mensagem com emoji apenas',
    message: '👍',
    expected: 'should_work_normally'
  }
]

async function testServerHealth() {
  try {
    console.log('🔍 Testando saúde do servidor...')
    const response = await axios.get(`${BASE_URL}/health`)
    console.log('✅ Servidor respondendo:', response.status)
    return true
  } catch (error) {
    console.error('❌ Servidor não está respondendo:', error.message)
    return false
  }
}

async function testEmptyMessageHandling() {
  console.log('\n🧪 INICIANDO TESTES DE MENSAGENS VAZIAS\n')
  
  for (const testCase of testCases) {
    console.log(`📝 Testando: ${testCase.name}`)
    console.log(`   Mensagem: "${testCase.message}" (length: ${testCase.message.length})`)
    
    try {
      // Simula uma mensagem chegando via webhook do bot
      const payload = {
        from: '5541999999999@c.us',
        body: testCase.message,
        timestamp: Date.now(),
        id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'chat'
      }
      
      // Testa o endpoint interno de processamento
      const response = await axios.post(`${BASE_URL}/api/internal/process-message`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': 'test-token'
        },
        timeout: 10000
      })
      
      console.log(`   Status: ${response.status}`)
      console.log(`   Resposta: ${JSON.stringify(response.data).substring(0, 100)}...`)
      
      if (testCase.expected === 'should_be_blocked_or_corrected') {
        if (response.data.blocked || response.data.corrected || response.data.ignored) {
          console.log('   ✅ SUCESSO: Mensagem vazia foi tratada adequadamente')
        } else {
          console.log('   ⚠️  ATENÇÃO: Mensagem vazia pode não ter sido tratada')
        }
      } else {
        console.log('   ✅ SUCESSO: Mensagem válida processada normalmente')
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ ERRO: ${error.response.status} - ${error.response.data?.error || 'Erro desconhecido'}`)
      } else {
        console.log(`   ❌ ERRO: ${error.message}`)
      }
    }
    
    console.log('') // Linha em branco para separar testes
    
    // Pequeno delay entre testes
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

async function checkVigiaLogs() {
  console.log('📊 Verificando logs do botVigia...')
  
  try {
    // Tenta acessar endpoint de logs (se existir)
    const response = await axios.get(`${BASE_URL}/api/internal/vigia-status`, {
      headers: {
        'x-internal-token': 'test-token'
      }
    })
    
    console.log('✅ Status do Vigia:', response.data)
  } catch (error) {
    console.log('⚠️  Endpoint de status do Vigia não disponível')
  }
}

async function main() {
  console.log('🚀 TESTE DE CORREÇÃO DE MENSAGENS VAZIAS')
  console.log('=========================================\n')
  
  // Verifica se o servidor está rodando
  const isHealthy = await testServerHealth()
  if (!isHealthy) {
    console.log('❌ Não é possível continuar - servidor não está respondendo')
    process.exit(1)
  }
  
  // Executa os testes
  await testEmptyMessageHandling()
  
  // Verifica logs do Vigia
  await checkVigiaLogs()
  
  console.log('\n🎉 TESTES CONCLUÍDOS!')
  console.log('Verifique os logs do backend para mais detalhes sobre o processamento.')
}

// Executa os testes
main().catch(error => {
  console.error('💥 Erro durante execução dos testes:', error)
  process.exit(1)
})
