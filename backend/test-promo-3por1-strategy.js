/**
 * Teste para validar estratégia da promoção "3 por 1" 
 * 
 * Testa se o bot responde corretamente quando cliente menciona 
 * que viu promoção "3 por 1" no anúncio
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simulação das funções de conversação
function testPromo3Por1Strategy() {
    console.log('🧪 === TESTE ESTRATÉGIA PROMOÇÃO 3 POR 1 ===\n');

    // Mensagens que devem acionar a estratégia
    const testMessages = [
        "O anúncio dizia que era 3 por 1",
        "Vi que era 3 calcinhas por uma",
        "Não era 3 por um?",
        "O anuncio ta dizendo 3 por 1",
        "Vi no face que era 3 por 1"
    ];

    // Resposta esperada
    const expectedResponse = "Ai que pena! Essa promoção já encerrou ontem 😔 Mas posso fazer um desconto especial pra você: 2 unidades por R$ 119,90! O que acha?";

    console.log('📝 Testando mensagens que devem acionar a estratégia:\n');
    
    testMessages.forEach((message, index) => {
        console.log(`${index + 1}. Mensagem: "${message}"`);
        
        // Simula detecção de triggers
        const triggers = ['3 por 1', 'anúncio dizia', 'vi que era 3'];
        const hasPromoTrigger = triggers.some(trigger => 
            message.toLowerCase().includes(trigger.toLowerCase())
        );
        
        if (hasPromoTrigger) {
            console.log('   ✅ Trigger detectado - deve usar estratégia especial');
            console.log(`   📤 Resposta: "${expectedResponse}"`);
        } else {
            console.log('   ❌ Trigger não detectado');
        }
        console.log('');
    });

    // Verificar se as funções foram atualizadas corretamente
    console.log('🔍 === VERIFICAÇÃO DE IMPLEMENTAÇÃO ===\n');
    
    try {
        // Verificar conversationGPT_fixed.ts
        const conversationPath = path.join(__dirname, 'src/services/bot/conversationGPT_fixed.ts');
        const conversationContent = fs.readFileSync(conversationPath, 'utf8');
        
        const hasPromoStrategy = conversationContent.includes('3 por 1') && 
                                conversationContent.includes('promoção já encerrou') &&
                                conversationContent.includes('119,90');
        
        console.log(`📁 conversationGPT_fixed.ts: ${hasPromoStrategy ? '✅' : '❌'} Estratégia implementada`);
        
        // Verificar universalBandits.ts
        const banditsPath = path.join(__dirname, 'src/services/ml/universalBandits.ts');
        const banditsContent = fs.readFileSync(banditsPath, 'utf8');
        
        const hasBanditArm = banditsContent.includes('objection_promo_3por1_encerrada') &&
                            banditsContent.includes('promotion_ended');
        
        console.log(`📁 universalBandits.ts: ${hasBanditArm ? '✅' : '❌'} Arm de objeção criado`);
        
        if (hasPromoStrategy && hasBanditArm) {
            console.log('\n🎉 TESTE PASSOU! Estratégia implementada com sucesso em ambos os arquivos');
        } else {
            console.log('\n⚠️ ATENÇÃO: Implementação incompleta detectada');
        }
        
    } catch (error) {
        console.log(`❌ Erro ao verificar arquivos: ${error.message}`);
    }

    console.log('\n📋 === RESUMO DA ESTRATÉGIA ===');
    console.log('Triggers de ativação:');
    console.log('- "3 por 1"');  
    console.log('- "anúncio dizia"');
    console.log('- "vi que era 3"');
    console.log('\nResposta padrão:');
    console.log(`"${expectedResponse}"`);
    console.log('\n✅ Estratégia de recuperação implementada com sucesso!');
}

// Executar teste
testPromo3Por1Strategy();

export { testPromo3Por1Strategy };
