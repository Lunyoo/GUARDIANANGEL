import { thompsonSampling } from './thomsonSampling';
import { universalBandits } from '../bot/universalBandits';
import { updateCombinationStats } from './combinationStats';
import { guardrails } from './guardrails';

/**
 * Unified helper to record a conversion outcome updating both Thompson sampling
 * (Bayesian arms) and Universal Bandits metrics.
 */
export interface ConversionEvent {
  pricingArmId?: string;
  approachArmId?: string;
  timingArmId?: string;
  mediaArmId?: string;
  closingArmId?: string;
  scriptArmId?: string;
  revenue: number;
  reward?: number; // default 1
}

// Intermediate event (pedido criado) para sinal mais cedo
export function recordCreatedOrder(event: ConversionEvent) {
  const reward = 0.3; // partial credit
  const bayesArms = [event.pricingArmId, event.approachArmId, event.timingArmId, event.mediaArmId, event.closingArmId];
  bayesArms.filter(Boolean).forEach(id => {
    thompsonSampling.updateReward(id!, reward, 0);
  });
  const uniArms = [event.pricingArmId, event.approachArmId, event.timingArmId, event.mediaArmId, event.closingArmId, event.scriptArmId];
  uniArms.filter(Boolean).forEach(id => {
  universalBandits.recordResult(id!, { created: true });
  });
  guardrails.recordCreated();
  try { updateCombinationStats({ ...event, revenue: 0 } as any) } catch {}
}

export function recordConversion(event: ConversionEvent) {
  const reward = event.reward ?? 1;
  // Update Thompson (only arms that exist there: pricing/approach/timing/media/closing)
  const bayesArms = [event.pricingArmId, event.approachArmId, event.timingArmId, event.mediaArmId, event.closingArmId];
  bayesArms.filter(Boolean).forEach(id => {
    thompsonSampling.updateReward(id!, reward, event.revenue);
  });

  // Update universal bandits (supports all, including script)
  const uniArms = [event.pricingArmId, event.approachArmId, event.timingArmId, event.mediaArmId, event.closingArmId, event.scriptArmId];
  uniArms.filter(Boolean).forEach(id => {
    universalBandits.recordResult(id!, { conversion: true, revenue: event.revenue });
  });
  guardrails.recordConversion();
  // Aggregate combination stats (wrapped in try to avoid impacting main flow)
  try { updateCombinationStats(event as any) } catch {}
}

export function recordInteraction(armIds: string[]) {
  armIds.forEach(id => universalBandits.recordResult(id, { interaction: true }));
}

export function recordImpression(armIds: string[]) {
  armIds.forEach(id => universalBandits.recordResult(id, { impression: true }));
}
