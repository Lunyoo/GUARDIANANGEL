/**
 * 🧠 NEURAL API ENDPOINTS
 * Endpoints para controlar e monitorar o sistema neural de ML
 */

import { Router } from 'express';
import { neuralOrchestrator } from '../services/ml/neuralOrchestrator';
import { leadScoringEngine } from '../services/ml/leadScoring';
import { contextualBotPolicy } from '../services/ml/contextualBotPolicy';
import { intelligentQueue } from '../services/ml/intelligentQueue';
import { budgetAllocator } from '../services/ml/budgetAllocator';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { getDatabase } from '../config/database';
import crypto from 'crypto';

const router = Router();

/**
 * 🎯 PROCESSAR LEAD INDIVIDUAL
 */
router.post('/process-lead', async (req, res) => {
  try {
    const { leadId, trigger = 'manual' } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ error: 'leadId é obrigatório' });
    }

    const decision = await neuralOrchestrator.processLead(leadId, trigger);
    
    res.json({
      success: true,
      decision,
      processingTime: Date.now() - decision.processedAt.getTime()
    });
    
  } catch (error) {
    logger.error('Erro no processamento neural:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * 📊 DASHBOARD NEURAL
 */
router.get('/dashboard', async (req, res) => {
  try {
    const dashboardData = await neuralOrchestrator.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    logger.error('Erro no dashboard neural:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

/**
 * 📈 MÉTRICAS DO SISTEMA
 */
router.get('/metrics', async (req, res) => {
  try {
    const systemMetrics = await neuralOrchestrator.getSystemMetrics();
    res.json(systemMetrics);
  } catch (error) {
    logger.error('Erro nas métricas do sistema:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas' });
  }
});

/**
 * 🎯 LOOP A: LEAD SCORING
 */
router.get('/scoring/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;

/**
 * 🔧 DEV ONLY: Seed a lead row for scoring / queue testing
 */
router.post('/dev/seed-lead', (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'forbidden in production' })
    }
    const db = getDatabase()
    const id = crypto.randomUUID()
    const phone = req.body?.phone || ('+5500'+Math.floor(Math.random()*1e8))
    const name = req.body?.name || 'Lead Seed'
    db.prepare('INSERT INTO leads (id, phone, name, first_contact, last_contact, city) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, phone, name, new Date().toISOString(), new Date().toISOString(), req.body?.city || null)
    res.json({ ok:true, leadId: id, phone, name })
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'seed lead failed' })
  }
})

/**
 * 🔧 DEV ONLY: Run full orchestrator on a freshly seeded lead
 */
router.post('/dev/seed-and-process', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'forbidden in production' })
    }
    const db = getDatabase()
    const id = crypto.randomUUID()
    const phone = req.body?.phone || ('+5500'+Math.floor(Math.random()*1e8))
    const name = req.body?.name || 'Lead Orchestrated'
    db.prepare('INSERT INTO leads (id, phone, name, first_contact, last_contact, city) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, phone, name, new Date().toISOString(), new Date().toISOString(), req.body?.city || null)
    const decision = await neuralOrchestrator.processLead(id, 'seed-dev')
    res.json({ ok:true, leadId: id, phone, name, decision })
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'seed+process failed' })
  }
})
    const score = await leadScoringEngine.scoreIead(leadId);
    res.json(score);
  } catch (error) {
    logger.error('Erro no lead scoring:', error);
    res.status(500).json({ error: 'Erro no scoring do lead' });
  }
});

router.post('/scoring/retrain', async (req, res) => {
  try {
    const metrics = await leadScoringEngine.retrainModel();
    res.json({ success: true, metrics });
  } catch (error) {
    logger.error('Erro no retreinamento:', error);
    res.status(500).json({ error: 'Erro no retreinamento do modelo' });
  }
});

router.post('/scoring/conversion', async (req, res) => {
  try {
    const { leadId, value } = req.body;
    await leadScoringEngine.recordConversion(leadId, value);
    res.json({ success: true });
  } catch (error) {
    logger.error('Erro ao registrar conversão:', error);
    res.status(500).json({ error: 'Erro ao registrar conversão' });
  }
});

/**
 * 🤖 LOOP B: BOT POLICY
 */
router.post('/bot-policy/decide/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const decision = await contextualBotPolicy.decide(leadId);
    res.json(decision);
  } catch (error) {
    logger.error('Erro na política do bot:', error);
    res.status(500).json({ error: 'Erro na decisão do bot' });
  }
});

router.post('/bot-policy/feedback', async (req, res) => {
  try {
    const { leadId, armId, reward } = req.body;
    await contextualBotPolicy.recordReward(leadId, armId, reward);
    res.json({ success: true });
  } catch (error) {
    logger.error('Erro no feedback do bot:', error);
    res.status(500).json({ error: 'Erro ao registrar feedback' });
  }
});

router.get('/bot-policy/metrics', async (req, res) => {
  try {
    const metrics = contextualBotPolicy.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Erro nas métricas do bot:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas do bot' });
  }
});

/**
 * 📝 LOOP C: INTELLIGENT QUEUE
 */
router.get('/queue', async (req, res) => {
  try {
    const queue = intelligentQueue.getQueue();
    res.json(queue);
  } catch (error) {
    logger.error('Erro na fila inteligente:', error);
    res.status(500).json({ error: 'Erro ao buscar fila' });
  }
});

router.post('/queue/assign', async (req, res) => {
  try {
    const { leadId, agentId } = req.body;
    const routing = await intelligentQueue.assignLead(leadId, agentId);
    res.json(routing);
  } catch (error) {
    logger.error('Erro na atribuição:', error);
    res.status(500).json({ error: 'Erro ao atribuir lead' });
  }
});

router.post('/queue/complete', async (req, res) => {
  try {
    const { leadId, result, value } = req.body;
    await intelligentQueue.completeLead(leadId, result, value);
    res.json({ success: true });
  } catch (error) {
    logger.error('Erro ao completar lead:', error);
    res.status(500).json({ error: 'Erro ao completar lead' });
  }
});

router.get('/queue/metrics', async (req, res) => {
  try {
    const metrics = intelligentQueue.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Erro nas métricas da fila:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas da fila' });
  }
});

/**
 * 💰 LOOP D: BUDGET ALLOCATION
 */
router.post('/budget/allocate', async (req, res) => {
  try {
    const { strategy = 'balanced' } = req.body;
    const allocation = await budgetAllocator.allocateBudget(strategy);
    res.json(allocation);
  } catch (error) {
    logger.error('Erro na alocação de budget:', error);
    res.status(500).json({ error: 'Erro na alocação de orçamento' });
  }
});

router.post('/budget/simulate', async (req, res) => {
  try {
    const { strategy = 'balanced' } = req.body;
    const simulation = await budgetAllocator.simulateAllocation(strategy);
    res.json(simulation);
  } catch (error) {
    logger.error('Erro na simulação de budget:', error);
    res.status(500).json({ error: 'Erro na simulação' });
  }
});

router.post('/budget/feedback', async (req, res) => {
  try {
    const { campaignId, cost, conversions, revenue } = req.body;
    await budgetAllocator.recordCampaignResult(campaignId, cost, conversions, revenue);
    res.json({ success: true });
  } catch (error) {
    logger.error('Erro no feedback de campanha:', error);
    res.status(500).json({ error: 'Erro ao registrar resultado' });
  }
});

router.get('/budget/metrics', async (req, res) => {
  try {
    const metrics = budgetAllocator.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Erro nas métricas de budget:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas de orçamento' });
  }
});

/**
 * 🎮 CONTROLES AVANÇADOS
 */
router.post('/event', async (req, res) => {
  try {
    const { leadId, eventType } = req.body;
    await neuralOrchestrator.processEvent(leadId, eventType);
    res.json({ success: true });
  } catch (error) {
    logger.error('Erro no processamento de evento:', error);
    res.status(500).json({ error: 'Erro ao processar evento' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const metrics = await neuralOrchestrator.getSystemMetrics();
    const health = {
      status: metrics.health.overall > 70 ? 'healthy' : metrics.health.overall > 40 ? 'warning' : 'critical',
      score: metrics.health.overall,
      bottlenecks: metrics.health.bottlenecks,
      uptime: process.uptime(),
      timestamp: new Date()
    };
    res.json(health);
  } catch (error) {
    logger.error('Erro no health check:', error);
    res.status(500).json({ status: 'error', error: 'Health check failed' });
  }
});

/**
 * 🚀 INTEGRAÇÕES (PASSOS 1–5)
 * 1. Ingestão de campanhas reais no budgetAllocator
 * 2. Registro/atualização de agentes reais
 * 3. Registro de conversões (lead + valor) alimentando loops
 * 4. Persistência (save/load) do estado ML
 * 5. Snapshot unificado de todos os sistemas para frontend
 */

// 1. Ingestão de campanhas (array de {id,name,budget,spent,leads,roas})
router.post('/budget/ingest-campaigns', async (req, res) => {
  try {
    const { campaigns } = req.body;
    if (!Array.isArray(campaigns)) return res.status(400).json({ error: 'campaigns array requerido' });
    let added = 0;
    for (const c of campaigns) {
      if (!c.id) continue;
      budgetAllocator.addOrUpdateCampaign({
        campaignId: c.id,
        name: c.name,
        currentBudget: c.budget,
        totalSpent: c.spent,
        totalLeads: c.leads,
        roas: c.roas,
        alpha: c.conversions ? 1 + c.conversions : undefined,
        beta: c.nonConversions ? 1 + c.nonConversions : undefined
      } as any);
      added++;
    }
    res.json({ success: true, added });
  } catch (e) {
    logger.error('Erro ingest campaigns:', e);
    res.status(500).json({ error: 'falha ingest campaigns' });
  }
});

// 2. Registro de agentes
router.post('/queue/agents/upsert', async (req, res) => {
  try {
    const { agent } = req.body;
    if (!agent?.agentId) return res.status(400).json({ error: 'agent.agentId requerido' });
    intelligentQueue.upsertAgent(agent);
    res.json({ success: true });
  } catch (e) {
    logger.error('Erro upsert agent:', e);
    res.status(500).json({ error: 'falha upsert agent' });
  }
});

// Listar agentes
router.get('/queue/agents', (_req, res) => {
  try {
  const agents = (intelligentQueue as any).agents ? Array.from((intelligentQueue as any).agents.values()) : [];
    res.json({ success:true, agents });
  } catch (e) { res.status(500).json({ error:'falha listar agentes' }) }
});

// 3. Registro de conversão (lead + value) alimenta lead scoring + budget feedback opcional
router.post('/conversion', async (req, res) => {
  try {
    const { leadId, value = 0, campaignId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId requerido' });
    await leadScoringEngine.recordConversion(leadId, value);
    if (campaignId) {
      await budgetAllocator.recordCampaignResult(campaignId, 0, 1, value);
    }
    res.json({ success: true });
  } catch (e) {
    logger.error('Erro registro conversão:', e);
    res.status(500).json({ error: 'falha registro conversão' });
  }
});

// Helpers para persistência
const persistenceDir = path.join(process.cwd(), 'data');
function ensureDir() { if (!fs.existsSync(persistenceDir)) fs.mkdirSync(persistenceDir, { recursive: true }); }

// 4a. Salvar snapshot
router.post('/persistence/save', async (_req, res) => {
  try {
    ensureDir();
    const snapshot = {
      ts: Date.now(),
      budget: budgetAllocator.getMetrics(),
      queue: intelligentQueue.getMetrics()
    };
    const file = path.join(persistenceDir, 'ml-snapshot.json');
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
    res.json({ success: true, file });
  } catch (e) {
    logger.error('Erro salvar snapshot:', e);
    res.status(500).json({ error: 'falha salvar snapshot' });
  }
});

// 4b. Carregar snapshot (apenas métricas – não recria estado de arms/queue detalhado ainda)
router.post('/persistence/load', async (_req, res) => {
  try {
    const file = path.join(persistenceDir, 'ml-snapshot.json');
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'snapshot não encontrado' });
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    res.json({ success: true, snapshot: data });
  } catch (e) {
    logger.error('Erro carregar snapshot:', e);
    res.status(500).json({ error: 'falha carregar snapshot' });
  }
});

// 5. Snapshot unificado para frontend
router.get('/snapshot', async (_req, res) => {
  try {
    const metrics = await neuralOrchestrator.getSystemMetrics();
    res.json({
      ts: Date.now(),
      health: metrics.health,
      budget: budgetAllocator.getMetrics(),
      queue: intelligentQueue.getMetrics(),
      scoring: { modelVersion: (leadScoringEngine as any)?.modelVersion || 'unknown' }
    });
  } catch (e) {
    logger.error('Erro snapshot unificado:', e);
    res.status(500).json({ error: 'falha snapshot' });
  }
});

// SSE Live Snapshot
router.get('/stream/snapshot', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  let active = true;
  req.on('close', ()=> { active=false; });
  const push = async () => {
    try {
      const metrics = await neuralOrchestrator.getSystemMetrics();
      const payload = JSON.stringify({
        ts: Date.now(),
        health: metrics.health,
        budget: budgetAllocator.getMetrics(),
        queue: intelligentQueue.getMetrics()
      });
      res.write(`data: ${payload}\n\n`);
    } catch {}
  };
  await push();
  const interval = setInterval(()=> { if(!active){ clearInterval(interval); return;} push(); }, 15000);
});

// Job: atualizar custos e roas de campanhas do budget allocator (chamável manualmente)
let lastFbRefreshTs = 0;
router.post('/budget/refresh-fb', async (_req, res) => {
  try {
    const now = Date.now();
    const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    if (now - lastFbRefreshTs < MIN_INTERVAL_MS) {
      return res.json({ success:true, skipped:true, reason:'throttled', secondsSinceLast: Math.floor((now-lastFbRefreshTs)/1000) });
    }
    const token = process.env.FACEBOOK_ACCESS_TOKEN;
    const account = process.env.FACEBOOK_AD_ACCOUNT_IDS?.split(',')[0];
    if (!token || !account) return res.status(400).json({ error:'credenciais facebook ausentes' });
    const act = account.startsWith('act_')? account : `act_${account}`;
    const resp = await axios.get(`https://graph.facebook.com/v18.0/${act}/campaigns`, { params:{ access_token: token, fields:'id,name,insights{spend,actions}' }});
    let updated=0;
    (resp.data.data||[]).forEach((c:any)=>{
      const ins = c.insights?.data?.[0]||{};
      const spend = parseFloat(ins.spend||'0');
      const purchases = ins.actions?.find((a:any)=>a.action_type==='purchase')?.value||0;
      const roas = spend>0? (purchases*100)/spend:0;
      try { budgetAllocator.addOrUpdateCampaign({ campaignId:c.id, name:c.name, totalSpent:spend, totalLeads:+purchases, roas }); updated++; } catch {}
    });
    lastFbRefreshTs = Date.now();
    res.json({ success:true, updated, refreshedAt: new Date(lastFbRefreshTs).toISOString() });
  } catch (e) {
    logger.error('Erro refresh fb budget', e);
    res.status(500).json({ error:'falha refresh fb' });
  }
});

/**
 * 🔬 TESTING & DEBUG
 */
router.post('/test/full-pipeline', async (req, res) => {
  try {
    const { phoneNumber, name, message, source, metadata } = req.body;
    
    if (!phoneNumber || !name || !message) {
      return res.status(400).json({ 
        error: 'phoneNumber, name e message são obrigatórios' 
      });
    }
    
    console.log(`🔬 Testing full neural pipeline for lead ${phoneNumber}`);
    
    // Importar prisma para criar lead
  // Prisma indisponível nesta fase – criar lead sintético
  const lead = { id: Date.now().toString(), phone: phoneNumber, name, source: source || 'test' };
    
    console.log(`✅ Lead criado: ${lead.id}`);
    
    // 2. Test Lead Scoring
    const score = await leadScoringEngine.scoreIead(lead.id);
    console.log(`🎯 Scoring: ${score.score} (${score.segment})`);
    
    // 3. Test Bot Policy
    const botDecision = await contextualBotPolicy.decide(lead.id);
    console.log(`🤖 Bot: ${botDecision.action.type} - ${botDecision.action.template}`);
    
    // 4. Test Queue
    const queueItem = await intelligentQueue.enqueue(lead.id);
    console.log(`📝 Queue: Priority ${queueItem.priority} (${queueItem.segment})`);
    
    // 5. Test Budget (simulation)
    const budgetSim = await budgetAllocator.simulateAllocation('balanced');
    console.log(`💰 Budget: ${budgetSim.allocations.length} allocations, ROI ${budgetSim.expectedTotalROI.toFixed(2)}`);
    
    // 6. Full Neural Processing
    const neuralDecision = await neuralOrchestrator.processLead(lead.id, 'manual');
    
    res.json({
      success: true,
      leadId: lead.id,
      results: {
        scoring: score,
        botPolicy: botDecision,
        queue: queueItem,
        budget: budgetSim,
        neural: neuralDecision
      }
    });
    
  } catch (error) {
    logger.error('Erro no teste completo:', error);
    res.status(500).json({ error: 'Erro no pipeline de teste' });
  }
});

export default router;
