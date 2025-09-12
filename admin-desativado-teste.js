#!/usr/bin/env node

/**
 * ✅ CONFIRMAÇÃO: Admin desativado para teste como cliente
 */

console.log('🔧 === ADMIN DESATIVADO PARA TESTE ===')
console.log('')
console.log('✅ MUDANÇAS APLICADAS:')
console.log('   1. const isAdmin = false // Forçado como cliente')
console.log('   2. Verificações de admin comentadas')
console.log('   3. Seu número será tratado como cliente comum')
console.log('')
console.log('📱 AGORA VOCÊ PODE TESTAR:')
console.log('   1. Envie mensagem VAZIA → Deve receber resposta educativa')
console.log('   2. Envie "oi" → Deve receber apresentação e processo de vendas')
console.log('   3. Envie "quero informações" → Deve iniciar conversa de vendas')
console.log('')
console.log('🎯 O QUE ESPERAR:')
console.log('   ❌ NÃO vai mais receber comandos de admin')
console.log('   ✅ VAI receber respostas de bot de vendas')
console.log('   ✅ VAI passar pelo processo normal de lead/cliente')
console.log('')
console.log('🔄 PARA REATIVAR ADMIN DEPOIS:')
console.log('   - Remova o "false" e volte a lógica original')
console.log('   - Descomente as verificações')
console.log('')
console.log('🚀 TESTE AGORA NO WHATSAPP!')

// Verificar se backend está rodando
fetch('http://localhost:3001/health')
  .then(res => res.json())
  .then(data => {
    console.log('')
    console.log(`✅ Backend Status: ${data.status}`)
    console.log('🎉 Pronto para testar como cliente!')
  })
  .catch(err => {
    console.log('')
    console.log('❌ Backend não está rodando!')
    console.log('Execute: npm run --prefix backend dev')
  })
