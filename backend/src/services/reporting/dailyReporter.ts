import fs from 'fs';
import path from 'path';
import { metricsRegistry } from '../../metrics/metricsRegistry';
import { budgetAllocator } from '../ml/budgetAllocator';
import { anomalyDetector } from '../monitoring/anomalyDetector';
import { combinationStats } from '../ml/combinationStats';
import { guardrails } from '../ml/guardrails';

// Lazy imports to avoid hard coupling
async function getInsightsSummary() {
  try {
    // dynamic import
  const mod: any = await import('../ai/autoInsightSystem.js');
    const system = (mod as any).autoInsightSystem || (mod as any).default;
    if (!system || !system.getReport) return null;
    const report = system.getReport();
    return {
      total: report.totalInsights,
      byPriority: report.byPriority,
      approved: report.approved,
      rejected: report.rejected
    };
  } catch { return null; }
}

export async function generateDailyReport(): Promise<any> {
  const dateStr = new Date().toISOString().slice(0,10);
  const allocHistory = budgetAllocator.getDecisionHistory(10); // últimas decisões
  const lastDecision = allocHistory[0];
  const metrics = metricsRegistry.snapshot();
  const anomalies = anomalyDetector.getAll(100);
  const highAnoms = anomalies.filter(a=>a.severity==='high');
  const insights = await getInsightsSummary();

  const report = {
    date: dateStr,
    generatedAt: new Date().toISOString(),
    allocation: {
      lastDecision,
      attempts: metrics.allocation.attempts,
      constraints: metrics.allocation.constraints
    },
    errors: metrics.errors,
    anomalies: {
      total: anomalies.length,
      high: highAnoms.length
    },
    insights,
  topCombinations: combinationStats.getTop(10),
  guardrails: guardrails.getState(),
    health: {
      riskScore: (highAnoms.length * 5 + metrics.errors.total5xx) // simplistic composite
    }
  };

  const dir = path.join(process.cwd(), 'data', 'dailyReports');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${dateStr}.json`);
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2)); } catch {}
  console.log(`📄 Daily report generated: ${file}`);
  return report;
}
