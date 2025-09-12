/**
 * contextualBotPolicy.ts
 * Contextual multi-armed policy deciding bot action templates per lead.
 * Integrates with lead scoring (segment) + lightweight per-template performance stats.
 * Public API:
 *  - decide(leadId): returns chosen action { type, template, variant, reason, segment }
 *  - recordReward(leadId, armId, reward)
 *  - getMetrics()
 */

import { leadScoringEngine } from './leadScoring';
import { prisma } from '../../lib/prisma';
import fs from 'fs';
import path from 'path';

interface PolicyArm {
  id: string;
  template: string;
  type: string; // message, question, offer
  segmentBias?: string[]; // segments where arm is stronger
  stats: { impressions: number; rewards: number; lastUsed?: number };
}

interface DecisionResult {
  armId: string; segment: string; template: string; type: string; variant?: number; reason: string;
  action: { type: string; template: string; variant?: number };
}

class ContextualBotPolicy {
  private arms: Map<string, PolicyArm> = new Map();
  private persistenceFile: string;

  constructor() {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir,{ recursive:true });
    this.persistenceFile = path.join(dir, 'bot-policy-state.json');
    this.seedArms();
    this.load();
  }

  private seedArms() {
    const base: PolicyArm[] = [
      { id:'greeting_warm', type:'message', template:'Oi {{nome}}, tudo bem? Vi que você se interessou pelos nossos modelos super confortáveis. Posso te ajudar a escolher?', segmentBias:['A-alto','B-bom'], stats:{ impressions:0, rewards:0 } },
      { id:'question_need', type:'question', template:'Qual é o ponto mais importante pra você: conforto o dia todo, não marcar na roupa ou tecido respirável?', segmentBias:['B-bom','C-médio'], stats:{ impressions:0, rewards:0 } },
      { id:'offer_bundle', type:'offer', template:'Temos um kit com economia progressiva que sai mais em conta que comprar separado. Quer que eu te envie os detalhes?', segmentBias:['A-alto','B-bom'], stats:{ impressions:0, rewards:0 } },
      { id:'social_proof', type:'message', template:'Outras clientes com o mesmo perfil adoraram o modelo seamless pela sensação de não estar usando nada 😄', segmentBias:['C-médio','D-baixo'], stats:{ impressions:0, rewards:0 } },
      { id:'sizing_help', type:'question', template:'Posso te mandar um guia rápido pra garantir que acerta o tamanho de primeira?', segmentBias:['E-frio','D-baixo','C-médio'], stats:{ impressions:0, rewards:0 } }
    ];
    base.forEach(a=> this.arms.set(a.id,a));
  }

  private save() { try { fs.writeFileSync(this.persistenceFile, JSON.stringify({ arms:[...this.arms.values()]},null,2)); } catch {} }
  private load() {
    try { if (fs.existsSync(this.persistenceFile)) { const d = JSON.parse(fs.readFileSync(this.persistenceFile,'utf-8')); (d.arms||[]).forEach((a:PolicyArm)=> this.arms.set(a.id,a)); } } catch {}
  }

  private ucbScore(arm: PolicyArm, total: number) {
    const { impressions, rewards } = arm.stats;
    if (impressions === 0) return 10; // force exploration
    const mean = rewards / impressions;
    const c = 1.4;
    return mean + c * Math.sqrt(Math.log(total+1)/impressions);
  }

  async decide(leadId: string): Promise<DecisionResult> {
    const scoring = await leadScoringEngine.scoreIead(leadId);
    const segment = scoring.segment;
    const totalImpressions = [...this.arms.values()].reduce((a,b)=> a + b.stats.impressions, 0);

    let best: PolicyArm | null = null;
    let bestScore = -Infinity;
    for (const arm of this.arms.values()) {
      let score = this.ucbScore(arm, totalImpressions+1);
      // segment bias
      if (arm.segmentBias?.includes(segment)) score *= 1.1;
      if (score > bestScore) { bestScore = score; best = arm; }
    }
    if (!best) throw new Error('Nenhum arm disponível');
    best.stats.impressions += 1; best.stats.lastUsed = Date.now();
    this.save();
    return {
      armId: best.id,
      segment,
      template: best.template,
      type: best.type,
      variant: 1,
      reason: 'ucb+segment-bias',
      action: { type: best.type, template: best.template, variant:1 }
    };
  }

  async recordReward(_leadId: string, armId: string, reward: number) {
    const arm = this.arms.get(armId);
    if (!arm) return;
    arm.stats.rewards += reward;
    this.save();
  }

  getMetrics() {
    const arms = [...this.arms.values()].map(a=> ({
      id: a.id,
      impressions: a.stats.impressions,
      rewards: a.stats.rewards,
      ctr: a.stats.impressions ? +(a.stats.rewards / a.stats.impressions).toFixed(3) : 0,
      lastUsed: a.stats.lastUsed ? new Date(a.stats.lastUsed).toISOString() : null
    }));
    return { arms, total: arms.reduce((a,b)=>a+b.impressions,0) };
  }
}

export const contextualBotPolicy = new ContextualBotPolicy();
