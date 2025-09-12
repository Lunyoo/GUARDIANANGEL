#!/usr/bin/env node

// Script para verificar status do WhatsApp sem autenticação
const { getWhatsAppState, getLatestQr, isWhatsAppReady } = require('./backend/src/services/bot/whatsappClient.js')

async function checkStatus() {
  console.log('🔍 Verificando status do WhatsApp...\n')
  
  try {
    const state = getWhatsAppState()
    const isReady = isWhatsAppReady()
    const qr = getLatestQr()
    
    console.log('📊 STATUS GERAL:')
    console.log(`   ✅ Cliente pronto: ${isReady ? '✅ SIM' : '❌ NÃO'}`)
    console.log(`   🔄 Inicializando: ${state.initializing ? '✅ SIM' : '❌ NÃO'}`)
    console.log(`   📱 Tem cliente: ${state.hasClient ? '✅ SIM' : '❌ NÃO'}`)
    console.log(`   🔗 Conectado: ${state.ready ? '✅ SIM' : '❌ NÃO'}`)
    
    console.log('\n📲 STATUS DO QR CODE:')
    if (qr && qr.ascii) {
      console.log('   📱 QR Code disponível: ✅ SIM')
      console.log('   🕐 Gerado em:', new Date(qr.ts).toLocaleString())
      console.log('   🔢 Tentativas:', state.qrAttempts)
      console.log('\n📱 QR CODE ASCII:')
      console.log(qr.ascii)
    } else {
      console.log('   📱 QR Code disponível: ❌ NÃO')
      console.log('   🔢 Tentativas:', state.qrAttempts)
      if (state.qrStopped) {
        console.log('   ⚠️ QR Code parado (máximo de tentativas atingido)')
      }
    }
    
    console.log('\n🔧 DETALHES TÉCNICOS:')
    console.log('   📊 Estado completo:', JSON.stringify(state, null, 2))
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error.message)
  }
}

checkStatus()
