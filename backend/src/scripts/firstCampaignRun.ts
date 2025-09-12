/**
 * 🚀 FIRST CAMPAIGN RUN ORCHESTRATION
 * Objetivo: demonstrar fluxo completo incluindo:
 *  - Seed de campanhas fictícias
 *  - Loop de alocação (1 passo)
 *  - Simulação de gasto sem conversões para acionar guardrail freeze
 *  - Registro de uma conversão para unfreeze
 *  - Exposição de métricas consolidadas
 */
import { budgetAllocator } from '../services/ml/budgetAllocator';
import { guardrails } from '../services/ml/guardrails';
import { thompsonSampling } from '../services/ml/thomsonSampling.js';
import { universalBandits } from '../services/bot/universalBandits.js';
import { recordCreatedOrder, recordConversion } from '../services/ml/conversionRecorder';

async function main() {
  console.log('🚀 Iniciando firstCampaignRun demo');
  // 1. Seed campaigns
  const seeds = [
    { campaignId: 'CAMP_DEMO_A', name: 'Demo A', currentBudget: 120, totalSpent: 0, roas: 0.5 },
    { campaignId: 'CAMP_DEMO_B', name: 'Demo B', currentBudget: 180, totalSpent: 0, roas: 1.2 },
    { campaignId: 'CAMP_DEMO_C', name: 'Demo C', currentBudget: 200, totalSpent: 0, roas: 0.9 }
  ];
  seeds.forEach(c => budgetAllocator.addOrUpdateCampaign(c as any));
  console.log('🌱 Campanhas seed adicionadas');

  // 2. Primeira alocação
  const decision1 = await budgetAllocator.allocateBudget('balanced');
  console.log('🧮 Decisão inicial:', decision1.allocations.map(a=>({ id:a.campaignId, rec: a.recommendedBudget })));

  // 3. Simular gasto agressivo sem conversões para acionar freeze
  for (let i=0;i<5;i++) {
    budgetAllocator.recordCampaignResult('CAMP_DEMO_A', 20, 0, 0);
  }
  // Atualizar guardrails manualmente
  guardrails.checkBudgetGuardrails({ spendLast24h: 100, conversionsLast24h: 0, createdLast24h: guardrails.getState().createdWindow }, { minConv:1, maxSpendPerNoConv: 80 });
  const g1 = guardrails.getState();
  console.log('🛡️ Guardrails após gasto sem conversões:', g1);

  // 4. Tentar nova alocação (deve estar congelado)
  const decisionFrozen = await budgetAllocator.allocateBudget('balanced');
  console.log('❄️ Decisão congelada? frozen=', guardrails.getState().frozen);

  // 5. Registrar pedido criado + conversão para descongelar
  recordCreatedOrder({ pricingArmId: 'price_1un_89', approachArmId: 'approach_consultiva', timingArmId: 'timing_imediato', mediaArmId: 'media_video_demo', closingArmId: 'closing_parcelamento', revenue: 0 });
  recordConversion({ pricingArmId: 'price_1un_89', approachArmId: 'approach_consultiva', timingArmId: 'timing_imediato', mediaArmId: 'media_video_demo', closingArmId: 'closing_parcelamento', revenue: 189.9 });
  guardrails.checkBudgetGuardrails({ spendLast24h: 100, conversionsLast24h: guardrails.getState().conversionsWindow, createdLast24h: guardrails.getState().createdWindow }, { minConv:1, maxSpendPerNoConv: 80 });
  console.log('🛡️ Guardrails pós conversão:', guardrails.getState());

  // 6. Nova alocação (deve descongelar)
  const decision2 = await budgetAllocator.allocateBudget('balanced');
  console.log('🧮 Decisão após unfreeze:', decision2.allocations.map(a=>({ id:a.campaignId, rec:a.recommendedBudget })));

  // 7. Resumo final de métricas
  const th = thompsonSampling.getMetrics();
  const ub = {
    top: universalBandits.getTopPerformers(5).map(a=>({ id:a.id, conv:a.conversions, created:a.created, imp:a.impressions }))
  };
  console.log('📊 TH Metrics:', th.topPerformers.slice(0,3));
  console.log('🎰 UB Top:', ub.top);
  console.log('✅ Demo concluída');
}

main().catch(e=>{ console.error(e); process.exit(1); });
