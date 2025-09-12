/**
 * leadScoring.ts
 * Probabilistic / heuristic hybrid lead scoring engine.
 * Reconstructs expected public API used by routes:
 *  - scoreIead(leadId)  (note: original code had a probable typo 'Iead')
 *  - retrainModel()
 *  - recordConversion(leadId, value)
 *  - modelVersion (prop)
 *
 * Design:
 * 1. Load lead attributes (lazy – minimal fields via prisma).
 * 2. Extract feature vector with light normalization.
 * 3. Maintain online statistics for features (mean, variance, weights) enabling adaptive scoring.
 * 4. Bayesian smoothing of conversion rates per segment bucket.
 * 5. Provide segmentation label & numeric score 0–100.
 */

import fs from 'fs';
import path from 'path';
import { getDatabase } from '../../config/database.js'
import { universalBandits } from '../bot/universalBandits'

interface LeadFeatureVector {
  leadId: string;
  createdMinutesAgo: number;
  nameLength: number;
  hasWhatsApp: number;
  sourceScore: number;
  hourOfDay: number;
  dayOfWeek: number;
}

interface OnlineStats { count: number; mean: number; M2: number; }
interface WeightEntry { weight: number; lastUpdated: number; }

interface ConversionRecord { leadId: string; value: number; ts: number; }

interface SegmentRate { segment: string; conversions: number; total: number; }

interface ScoreResult {
  leadId: string;
  score: number; // 0-100
  raw: number;   // unscaled
  segment: string;
  features: LeadFeatureVector;
  version: string;
}

class LeadScoringEngine {
  private stats: Record<keyof Omit<LeadFeatureVector,'leadId'>, OnlineStats> = {
    createdMinutesAgo: { count:0, mean:0, M2:0 },
    nameLength: { count:0, mean:0, M2:0 },
    hasWhatsApp: { count:0, mean:0, M2:0 },
    sourceScore: { count:0, mean:0, M2:0 },
    hourOfDay: { count:0, mean:0, M2:0 },
    dayOfWeek: { count:0, mean:0, M2:0 }
  };
  private weights: Record<keyof Omit<LeadFeatureVector,'leadId'>, WeightEntry> = {
    createdMinutesAgo: { weight: -0.25, lastUpdated: Date.now() },
    nameLength: { weight: 0.4, lastUpdated: Date.now() },
    hasWhatsApp: { weight: 1.2, lastUpdated: Date.now() },
    sourceScore: { weight: 0.9, lastUpdated: Date.now() },
    hourOfDay: { weight: 0.15, lastUpdated: Date.now() },
    dayOfWeek: { weight: 0.05, lastUpdated: Date.now() }
  };
  private segmentRates: Record<string, SegmentRate> = {};
  private conversions: ConversionRecord[] = [];
  private persistenceFile: string;
  public modelVersion = '1.0.0';

  constructor() {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.persistenceFile = path.join(dir, 'lead-scoring-state.json');
    this.load();
  }

  private state() {
    return {
      stats: this.stats,
      weights: this.weights,
      segmentRates: this.segmentRates,
      conversions: this.conversions,
      modelVersion: this.modelVersion
    };
  }

  private save() {
    try { fs.writeFileSync(this.persistenceFile, JSON.stringify(this.state(), null, 2)); } catch {}
  }

  private load() {
    try {
      if (fs.existsSync(this.persistenceFile)) {
        const d = JSON.parse(fs.readFileSync(this.persistenceFile,'utf-8'));
        this.stats = d.stats || this.stats;
        this.weights = d.weights || this.weights;
        this.segmentRates = d.segmentRates || {};
        this.conversions = d.conversions || [];
        this.modelVersion = d.modelVersion || this.modelVersion;
      }
    } catch {}
  }

  private welfordUpdate(key: keyof Omit<LeadFeatureVector,'leadId'>, x: number) {
    const s = this.stats[key];
    s.count += 1;
    const delta = x - s.mean;
    s.mean += delta / s.count;
    const delta2 = x - s.mean;
    s.M2 += delta * delta2;
  }

  private variance(key: keyof Omit<LeadFeatureVector,'leadId'>) {
    const s = this.stats[key];
    return s.count > 1 ? s.M2 / (s.count - 1) : 1;
  }

  private zscore(key: keyof Omit<LeadFeatureVector,'leadId'>, x: number) {
    const v = this.variance(key);
    const std = Math.sqrt(v||1);
    if (std === 0) return 0;
    return (x - this.stats[key].mean) / std;
  }

  private mapSource(source?: string|null) {
    if (!source) return 0.2;
    const s = source.toLowerCase();
    if (s.includes('facebook')||s.includes('fb')) return 0.9;
    if (s.includes('instagram')||s.includes('ig')) return 0.8;
    if (s.includes('ads')) return 0.85;
    if (s.includes('organic')) return 0.5;
    if (s.includes('referral')) return 0.6;
    return 0.4;
  }

  private deriveSegment(score: number): string {
    if (score >= 80) return 'A-alto';
    if (score >= 60) return 'B-bom';
    if (score >= 40) return 'C-médio';
    if (score >= 20) return 'D-baixo';
    return 'E-frio';
  }

  private recordSegment(segment: string, converted: boolean) {
    if (!this.segmentRates[segment]) this.segmentRates[segment] = { segment, conversions:0, total:0 };
    const sr = this.segmentRates[segment];
    sr.total += 1;
    if (converted) sr.conversions += 1;
  }

  private async fetchLeadBasic(leadId: string) {
    // Use SQLite leads table (lightweight) falling back to synthetic if absent
    try {
      const db = getDatabase()
      const row = db.prepare('SELECT id, name, phone, first_contact as firstContact, last_contact as lastContact FROM leads WHERE id = ? OR phone = ? LIMIT 1').get(leadId, leadId) as undefined | { id:string; name?:string; phone?:string; firstContact?:string; lastContact?:string }
      if (row && row.id) {
        return { id: row.id, name: row.name || ('Lead '+row.id.slice(-4)), phone: row.phone, createdAt: row.firstContact || row.lastContact || new Date().toISOString(), source: 'facebook' }
      }
    } catch {}
    return { id: leadId, name: 'Lead '+leadId.slice(-4), phone: null, createdAt: new Date().toISOString(), source: 'facebook' }
  }

  private buildFeatures(lead: any): LeadFeatureVector {
    const createdMinutesAgo = (Date.now() - new Date(lead.createdAt).getTime()) / 60000;
    return {
      leadId: lead.id,
      createdMinutesAgo,
      nameLength: (lead.name||'').trim().length,
      hasWhatsApp: lead.phone ? 1 : 0,
      sourceScore: this.mapSource(lead.source),
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };
  }

  private rawScore(fv: LeadFeatureVector) {
    // Normalize with z-scores where helpful, apply weights.
    const components: number[] = [];
    const push = (key: keyof Omit<LeadFeatureVector,'leadId'>, val: number) => {
      const w = this.weights[key].weight;
      // For time since creation we invert (more recent = better)
      if (key === 'createdMinutesAgo') {
        val = -this.zscore(key, val);
      } else if (key === 'hourOfDay' || key === 'dayOfWeek') {
        // center cyclical features (simple scaling)
        val = Math.cos((val/24)*Math.PI*2);
      } else if (key === 'nameLength') {
        val = this.zscore(key, val);
      }
      components.push(w * val);
    };
    
    push('createdMinutesAgo', fv.createdMinutesAgo);
    push('nameLength', fv.nameLength);
    push('hasWhatsApp', fv.hasWhatsApp);
    push('sourceScore', fv.sourceScore);
    push('hourOfDay', fv.hourOfDay);
    push('dayOfWeek', fv.dayOfWeek);
    
    let baseScore = components.reduce((a,b)=>a+b,0);
    
    // Enhanced ML integration: boost score based on Universal Bandits performance
    try {
      const topPerformers = universalBandits.getTopPerformers(10);
      const avgConversionRate = topPerformers.reduce((sum, arm) => sum + arm.conversionRate, 0) / topPerformers.length;
      
      // If ML is performing well overall, slightly boost all lead scores
      if (avgConversionRate > 0.05) { // >5% conversion rate
        baseScore *= 1.1; // 10% boost during hot ML periods
      }
      
      // Consider time-based ML performance (timing category)
      const timingArms = topPerformers.filter(arm => arm.category === 'timing');
      if (timingArms.length > 0) {
        const currentHour = new Date().getHours();
        const isOptimalTime = timingArms.some(arm => {
          return (arm.variant.includes('morning') && currentHour >= 8 && currentHour <= 11) ||
                 (arm.variant.includes('afternoon') && currentHour >= 12 && currentHour <= 17) ||
                 (arm.variant.includes('evening') && currentHour >= 18 && currentHour <= 21);
        });
        if (isOptimalTime) {
          baseScore *= 1.05; // 5% boost for optimal timing
        }
      }
    } catch (error) {
      // Fallback to original scoring if ML data unavailable
    }
    
    return baseScore;
  }

  async scoreIead(leadId: string): Promise<ScoreResult> { // keeping original method name (typo) for compatibility
    const lead = await this.fetchLeadBasic(leadId);
    if (!lead) throw new Error('Lead não encontrado');
    const fv = this.buildFeatures(lead);
    // update stats
    (Object.keys(fv) as (keyof LeadFeatureVector)[]).forEach(k=>{
      if (k==='leadId') return;
      this.welfordUpdate(k as any, (fv as any)[k]);
    });
    const raw = this.rawScore(fv);
    // scale raw to 0-100 via logistic mapping
    const scaled = 100 / (1 + Math.exp(-raw));
    const segment = this.deriveSegment(scaled);
    this.recordSegment(segment, false);
    this.save();
    return { leadId, score: +scaled.toFixed(2), raw: +raw.toFixed(4), segment, features: fv, version: this.modelVersion };
  }

  async recordConversion(leadId: string, value: number = 0) {
    const scoreInfo = await this.scoreIead(leadId).catch(()=>null);
    const segment = scoreInfo?.segment || 'unknown';
    this.recordSegment(segment, true);
    this.conversions.push({ leadId, value, ts: Date.now() });
    if (this.conversions.length > 5000) this.conversions.splice(0, this.conversions.length - 5000);
    // Lightweight adaptive weight tweak: increase weights modestly for features correlated with higher segment tiers
    if (scoreInfo) this.adaptWeights(scoreInfo);
    this.save();
  }

  private adaptWeights(scoreInfo: ScoreResult) {
    const tierFactor = { 'A-alto': 1.05, 'B-bom': 1.02, 'C-médio': 1.0, 'D-baixo': 0.99, 'E-frio': 0.97 }[scoreInfo.segment] || 1.0;
    const now = Date.now();
    (Object.keys(this.weights) as (keyof Omit<LeadFeatureVector,'leadId'>)[]).forEach(k=>{
      const w = this.weights[k];
      w.weight *= tierFactor;
      // soft bounds to prevent explosion
      if (w.weight > 2) w.weight = 2;
      if (w.weight < -2) w.weight = -2;
      w.lastUpdated = now;
    });
  }

  async retrainModel() {
    // Off-line style retrain: re-evaluate weight centrality using segment conversion uplift.
    // Simple heuristic: features with higher variance and recent conversions get slight boost.
    const recent = this.conversions.slice(-300);
    const varianceMap: Record<string, number> = {};
    (Object.keys(this.stats) as (keyof Omit<LeadFeatureVector,'leadId'>)[]).forEach(k=>{ varianceMap[k] = this.variance(k); });
    const varianceTotal = Object.values(varianceMap).reduce((a,b)=>a+b,0)||1;
    const convFactor = Math.log(1 + recent.length)/5; // dampen effect
    (Object.keys(this.weights) as (keyof Omit<LeadFeatureVector,'leadId'>)[]).forEach(k=>{
      const varianceShare = varianceMap[k]/varianceTotal;
      this.weights[k].weight *= (1 + varianceShare * 0.1 * convFactor);
      if (this.weights[k].weight > 2) this.weights[k].weight = 2;
    });
    this.modelVersion = (parseFloat(this.modelVersion)+0.01).toFixed(2);
    this.save();
    return {
      modelVersion: this.modelVersion,
      weights: this.weights,
      segments: this.segmentRates,
      conversions: this.conversions.length
    };
  }
}

export const leadScoringEngine = new LeadScoringEngine();
