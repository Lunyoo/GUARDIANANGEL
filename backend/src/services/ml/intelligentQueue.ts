/**
 * intelligentQueue.ts
 * Prioritization + routing queue for leads -> human agents.
 * Uses lead scoring + simple SLA / availability heuristics.
 * Public API used in routes:
 *  - getQueue()
 *  - assignLead(leadId, agentId?)
 *  - completeLead(leadId, result, value?)
 *  - enqueue(leadId)
 *  - getMetrics()
 *  - upsertAgent(agent)
 */

import { leadScoringEngine } from './leadScoring';
import { universalBandits } from '../bot/universalBandits';
import { prisma } from '../../lib/prisma';
import fs from 'fs';
import path from 'path';

interface QueueItem {
  leadId: string;
  segment: string;
  score: number;
  priority: number;
  enqueuedAt: number;
  assignedTo?: string;
  status: 'waiting' | 'assigned' | 'completed';
  result?: string;
  value?: number;
}

interface Agent {
  agentId: string; name?: string; capacity?: number; active?: boolean; assigned?: number; segmentsFocus?: string[];
}

class IntelligentQueue {
  private items: QueueItem[] = [];
  private agents: Map<string, Agent> = new Map();
  private persistenceFile: string;

  constructor() {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir,{ recursive:true });
    this.persistenceFile = path.join(dir,'intelligent-queue-state.json');
    this.load();
  }

  private save() { try { fs.writeFileSync(this.persistenceFile, JSON.stringify({ items:this.items, agents:[...this.agents.values()]},null,2)); } catch {} }
  private load() { try { if (fs.existsSync(this.persistenceFile)) { const d = JSON.parse(fs.readFileSync(this.persistenceFile,'utf-8')); this.items = d.items||[]; (d.agents||[]).forEach((a:Agent)=> this.agents.set(a.agentId,a)); } } catch {} }

  async enqueue(leadId: string) {
    // avoid duplication
    if (this.items.find(i=> i.leadId===leadId && i.status!=='completed')) return this.items.find(i=>i.leadId===leadId)!;
    
    const scoring = await leadScoringEngine.scoreIead(leadId);
    const basePriority = { 'A-alto':100, 'B-bom':70, 'C-médio':50, 'D-baixo':30, 'E-frio':10 }[scoring.segment] || 20;
    
    // Enhanced ML-based priority calculation
    let finalPriority = basePriority;
    
    try {
      // Get ML insights for intelligent prioritization
      const topPerformers = universalBandits.getTopPerformers(10);
      const avgPerformance = topPerformers.reduce((sum, arm) => sum + arm.conversionRate, 0) / topPerformers.length;
      
      // Boost priority during high-performance ML periods
      if (avgPerformance > 0.08) { // >8% conversion rate
        finalPriority *= 1.15; // 15% priority boost during hot periods
      }
      
      // Consider timing-based ML optimization
      const timingArms = topPerformers.filter(arm => arm.category === 'timing');
      if (timingArms.length > 0) {
        const currentHour = new Date().getHours();
        const isOptimalTime = timingArms.some(arm => {
          return (arm.variant.includes('morning') && currentHour >= 8 && currentHour <= 11) ||
                 (arm.variant.includes('afternoon') && currentHour >= 12 && currentHour <= 17) ||
                 (arm.variant.includes('evening') && currentHour >= 18 && currentHour <= 21);
        });
        if (isOptimalTime) {
          finalPriority *= 1.1; // 10% boost for optimal timing
        }
      }
      
      // Boost high-value segments even more during strong approach performance
      const approachArms = topPerformers.filter(arm => arm.category === 'approach');
      if (approachArms.length > 0 && scoring.segment === 'A-alto') {
        const avgApproachPerformance = approachArms.reduce((sum, arm) => sum + arm.conversionRate, 0) / approachArms.length;
        if (avgApproachPerformance > 0.06) { // >6% approach conversion
          finalPriority *= 1.2; // 20% boost for A-leads during strong approach performance
        }
      }
    } catch (error) {
      // Fallback to base priority if ML data unavailable
    }
    
    const item: QueueItem = {
      leadId,
      segment: scoring.segment,
      score: scoring.score,
      priority: finalPriority + Math.random()*5,
      enqueuedAt: Date.now(),
      status: 'waiting'
    };
    
    this.items.push(item);
    this.sort();
    this.save();
    return item;
  }

  private sort() { this.items.sort((a,b)=> b.priority - a.priority || a.enqueuedAt - b.enqueuedAt); }

  getQueue() { return this.items.filter(i=> i.status!=='completed').map(i=>({ ...i })); }

  upsertAgent(agent: Agent) {
    const existing = this.agents.get(agent.agentId) || { agentId: agent.agentId, assigned:0 } as Agent;
    const merged = { ...existing, ...agent };
    if (!merged.capacity) merged.capacity = 10;
    if (merged.active === undefined) merged.active = true;
    this.agents.set(merged.agentId, merged);
    this.save();
  }

  private pickAgentFor(item: QueueItem, preferredAgentId?: string) {
    if (preferredAgentId && this.canAssign(preferredAgentId)) return this.agents.get(preferredAgentId)!;
    // simple: agent with lowest load & active & segment focus match
    let best: Agent | null = null; let bestScore = Infinity;
    for (const agent of this.agents.values()) {
      if (!agent.active) continue;
      if (agent.capacity && (agent.assigned||0) >= agent.capacity) continue;
      let score = (agent.assigned||0);
      if (agent.segmentsFocus && !agent.segmentsFocus.includes(item.segment)) score += 5; // penalty
      if (score < bestScore) { bestScore = score; best = agent; }
    }
    return best;
  }

  private canAssign(agentId: string) {
    const a = this.agents.get(agentId); if (!a || !a.active) return false;
    return (a.assigned||0) < (a.capacity||10);
  }

  async assignLead(leadId: string, agentId?: string) {
    let item = this.items.find(i=> i.leadId===leadId && i.status==='waiting');
    if (!item) item = await this.enqueue(leadId);
    const agent = this.pickAgentFor(item, agentId);
    if (!agent) throw new Error('Nenhum agente disponível');
    item.assignedTo = agent.agentId; item.status='assigned';
    agent.assigned = (agent.assigned||0)+1;
    this.save();
    return { success:true, leadId, agentId: agent.agentId };
  }

  async completeLead(leadId: string, result: string, value?: number) {
    const item = this.items.find(i=> i.leadId===leadId && i.status!=='completed');
    if (!item) throw new Error('Lead não encontrado na fila');
    item.status='completed'; item.result=result; item.value = value;
    if (item.assignedTo) { const ag = this.agents.get(item.assignedTo); if (ag && ag.assigned) ag.assigned -= 1; }
    this.save();
  }

  getMetrics() {
    const waiting = this.items.filter(i=> i.status==='waiting').length;
    const assigned = this.items.filter(i=> i.status==='assigned').length;
    const completedLastHour = this.items.filter(i=> i.status==='completed' && Date.now()-i.enqueuedAt < 3600_000).length;
    const avgWaitMs = (()=> {
      const waits = this.items.filter(i=> i.status!=='completed').map(i=> Date.now() - i.enqueuedAt);
      if (!waits.length) return 0; return Math.round(waits.reduce((a,b)=>a+b,0)/waits.length);
    })();
    return {
      queueLength: waiting,
      assigned,
      throughput1h: completedLastHour,
      avgWaitMs,
      agents: [...this.agents.values()].map(a=> ({ agentId: a.agentId, active: a.active, assigned: a.assigned, capacity: a.capacity }))
    };
  }
}

export const intelligentQueue = new IntelligentQueue();
