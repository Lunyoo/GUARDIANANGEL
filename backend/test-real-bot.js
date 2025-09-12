/**
 * 🧪 TESTE REAL DO BOT - SIMULAÇÃO DE CONVERSA COMPLETA
 * 
 * Testa o bot real que está rodando para verificar
 * se o fluxo de venda automática está funcionando
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const TEST_PHONE = '5511999887766'; // Número de teste

// Simular conversa completa
async function testRealBot() {
    console.log('🚀 === TESTE REAL DO BOT DE VENDAS ===\n');
    
    const messages = [
        {
            step: 1,
            message: 'Oi, vi o anúncio da calcinha modeladora',
            description: 'Cliente inicial interessado'
        },
        {
            step: 2, 
            message: 'Quanto custa?',
            description: 'Pergunta sobre preço'
        },
        {
            step: 3,
            message: 'Quero o kit de 3',
            description: 'Demonstra interesse em comprar'
        },
        {
            step: 4,
            message: 'São Paulo',
            description: 'Informa cidade (deve detectar COD)'
        },
        {
            step: 5,
            message: 'Maria Silva Santos',
            description: 'Fornece nome completo'
        },
        {
            step: 6,
            message: 'Rua das Flores, 123, Vila Nova, CEP 01234-567',
            description: 'Fornece endereço completo'
        },
        {
            step: 7,
            message: 'CONFIRMAR',
            description: 'Confirma dados para finalizar venda'
        }
    ];

    for (const msg of messages) {
        console.log(`\n${msg.step}. 👤 CLIENTE: "${msg.message}"`);
        console.log(`   📝 ${msg.description}`);
        
        try {
            // Simular mensagem chegando no bot
            const response = await fetch(`${API_BASE}/api/webhooks/whatsapp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: TEST_PHONE,
                    message: msg.message,
                    timestamp: Date.now(),
                    source: 'test'
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`   🤖 BOT: "${result.response?.substring(0, 100)}..."`);
                console.log(`   ✅ Status: ${response.status}`);
            } else {
                console.log(`   ❌ Erro: ${response.status} - ${response.statusText}`);
            }
            
            // Pausa entre mensagens para simular conversa real
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.log(`   ❌ Erro de conexão: ${error.message}`);
            console.log('   💡 Certifique-se que o backend está rodando em localhost:3001');
            break;
        }
    }
    
    console.log('\n🔍 === VERIFICAÇÕES IMPORTANTES ===\n');
    console.log('Observe se o bot:');
    console.log('✅ 1. Perguntou cidade ANTES do nome');
    console.log('✅ 2. Detectou que São Paulo é COD');
    console.log('✅ 3. Coletou nome completo');
    console.log('✅ 4. Pediu endereço estruturado'); 
    console.log('✅ 5. Apresentou resumo para confirmação');
    console.log('✅ 6. Finalizou venda após "CONFIRMAR"');
    console.log('✅ 7. Não repetiu informações');
    console.log('✅ 8. Usou preços do ML Universal Bandits');
    
    console.log('\n📊 Se tudo funcionou, o bot está:');
    console.log('🎯 VENDENDO AUTOMATICAMENTE');
    console.log('🛡️ COLETANDO DADOS COMPLETOS');
    console.log('🚀 OTIMIZADO PARA CONVERSÃO');
}

// Função para testar endpoint de saúde
async function checkBotHealth() {
    try {
        console.log('🔍 Verificando se bot está online...');
        
        const healthResponse = await fetch(`${API_BASE}/health`);
        if (healthResponse.ok) {
            console.log('✅ Backend está rodando e acessível');
            return true;
        } else {
            console.log('❌ Backend respondeu com erro:', healthResponse.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Backend não está acessível:', error.message);
        console.log('💡 Execute: npm run dev no diretório backend');
        return false;
    }
}

// Executar teste
async function runTest() {
    const isHealthy = await checkBotHealth();
    
    if (isHealthy) {
        await testRealBot();
    } else {
        console.log('\n🚨 BACKEND NÃO ESTÁ RODANDO');
        console.log('Para testar o bot real:');
        console.log('1. cd backend');
        console.log('2. npm run dev');
        console.log('3. Execute este teste novamente');
    }
}

runTest().catch(console.error);

export { testRealBot, checkBotHealth };
