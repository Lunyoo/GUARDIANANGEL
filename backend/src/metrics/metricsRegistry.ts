/**
 * 📊 Metrics Registry (in-memory + lightweight persistence hook placeholder)
 * Rastrea métricas operacionais sem dependência externa (Prometheus scrape via /metrics).
 */
import fs from 'fs';
import path from 'path';

type AllocationConstraintReason = 'max_change_limit' | 'below_min_daily' | 'max_multiplier_limit' | 'diversification_adjust' | 'cooldown_limit';

interface VerificationMetrics {
  mismatches: number;
  lastDecisionId?: string;
  retries: number;
}

interface ApprovalMetrics {
  pending: number;
  approved: number;
}

interface MetricsSnapshot {
  allocation: {
    attempts: number;
    constraints: Record<AllocationConstraintReason, number>;
  };
  approvals: ApprovalMetrics;
  verification: VerificationMetrics;
  digests: { total: number; lastSentAt?: string };
  errors: {
    total5xx: number;
    last5xxAt?: string;
  };
  meta: {
    updatedAt: string;
    startTime: string;
  };
}

class MetricsRegistry {
  private allocationAttempts = 0;
  private allocationConstraintCounts: Record<AllocationConstraintReason, number> = {
    max_change_limit: 0,
    below_min_daily: 0,
    max_multiplier_limit: 0,
    diversification_adjust: 0,
    cooldown_limit: 0
  };
  private approval: ApprovalMetrics = { pending: 0, approved: 0 };
  private verification: VerificationMetrics = { mismatches: 0, retries: 0 };
  private digests = { total: 0, lastSentAt: undefined as Date | undefined };
  private total5xx = 0;
  private last5xxAt?: Date;
  private startTime = new Date();
  private dirty = false;
  private persistFile = path.join(process.cwd(), 'data', 'runtime-metrics.json');
  private persistInterval: NodeJS.Timeout;

  constructor() {
    this.load();
    this.persistInterval = setInterval(()=>{ if (this.dirty) this.save(); }, 60_000).unref();
  }

  incrementAllocationAttempt(){
    this.allocationAttempts++;
    this.dirty = true;
  }
  recordAllocationConstraint(reason: AllocationConstraintReason){
    this.allocationConstraintCounts[reason]++;
    this.dirty = true;
  }
  increment5xx(_status: number, _path: string){
    this.total5xx++;
    this.last5xxAt = new Date();
    this.dirty = true;
  }

  setPendingApprovals(n: number){ this.approval.pending = n; this.dirty = true; }
  incrementApproved(){ this.approval.approved++; this.dirty = true; }
  recordVerification(decisionId: string, mismatches: number){
    this.verification.mismatches = mismatches; this.verification.lastDecisionId = decisionId; this.dirty = true;
  }
  incrementVerificationRetry(){ this.verification.retries++; this.dirty = true; }
  recordDigestGenerated(){ this.digests.total++; this.dirty = true; }
  markDigestSent(){ this.digests.lastSentAt = new Date(); this.dirty = true; }

  snapshot(): MetricsSnapshot {
    return {
      allocation: {
        attempts: this.allocationAttempts,
        constraints: { ...this.allocationConstraintCounts }
      },
  approvals: { ...this.approval },
  verification: { ...this.verification },
  digests: { total: this.digests.total, lastSentAt: this.digests.lastSentAt?.toISOString() },
      errors: {
        total5xx: this.total5xx,
        last5xxAt: this.last5xxAt?.toISOString()
      },
      meta: {
        updatedAt: new Date().toISOString(),
        startTime: this.startTime.toISOString()
      }
    };
  }

  toPrometheus(): string {
    const s = this.snapshot();
    const lines: string[] = [];
    lines.push('# HELP allocation_attempts Total de execuções de alocação de orçamento');
    lines.push('# TYPE allocation_attempts counter');
    lines.push(`allocation_attempts ${s.allocation.attempts}`);
    Object.entries(s.allocation.constraints).forEach(([k,v])=>{
      lines.push(`# HELP allocation_constraint_total Reajustes aplicados por constraint`);
      lines.push('# TYPE allocation_constraint_total counter');
      lines.push(`allocation_constraint_total{reason="${k}"} ${v}`);
    });
    lines.push('# HELP backend_errors_5xx_total Total de respostas 5xx');
    lines.push('# TYPE backend_errors_5xx_total counter');
    lines.push(`backend_errors_5xx_total ${s.errors.total5xx}`);
  lines.push('# HELP allocation_approvals_total Decisões aprovadas');
  lines.push('# TYPE allocation_approvals_total counter');
  lines.push(`allocation_approvals_total ${s.approvals.approved}`);
  lines.push('# HELP allocation_pending_decisions Decisões pendentes');
  lines.push('# TYPE allocation_pending_decisions gauge');
  lines.push(`allocation_pending_decisions ${s.approvals.pending}`);
  lines.push('# HELP allocation_verification_mismatches Divergências da última verificação');
  lines.push('# TYPE allocation_verification_mismatches gauge');
  lines.push(`allocation_verification_mismatches ${s.verification.mismatches}`);
  lines.push('# HELP allocation_verification_retries Total de tentativas de re-verificação');
  lines.push('# TYPE allocation_verification_retries counter');
  lines.push(`allocation_verification_retries ${s.verification.retries}`);
    lines.push('# HELP learning_digests_total Total de digests de aprendizado gerados');
    lines.push('# TYPE learning_digests_total counter');
    lines.push(`learning_digests_total ${s.digests.total}`);
    if (s.digests.lastSentAt) {
      lines.push('# HELP learning_digest_last_sent_timestamp Timestamp do último digest enviado (unix seconds)');
      lines.push('# TYPE learning_digest_last_sent_timestamp gauge');
      lines.push(`learning_digest_last_sent_timestamp ${Math.floor(new Date(s.digests.lastSentAt).getTime()/1000)}`);
    }
    if (s.errors.last5xxAt) {
      lines.push('# HELP backend_errors_5xx_last_timestamp Timestamp do último 5xx (unix seconds)');
      lines.push('# TYPE backend_errors_5xx_last_timestamp gauge');
      lines.push(`backend_errors_5xx_last_timestamp ${Math.floor(new Date(s.errors.last5xxAt).getTime()/1000)}`);
    }
    return lines.join('\n');
  }

  private load(){
    try {
      const raw = fs.readFileSync(this.persistFile,'utf-8');
      const data = JSON.parse(raw);
      if (data.allocation?.attempts) this.allocationAttempts = data.allocation.attempts;
      if (data.allocation?.constraints) Object.entries(data.allocation.constraints).forEach(([k,v])=>{
        if (k in this.allocationConstraintCounts) this.allocationConstraintCounts[k as AllocationConstraintReason] = v as number;
      });
      if (data.errors?.total5xx) this.total5xx = data.errors.total5xx;
      if (data.errors?.last5xxAt) this.last5xxAt = new Date(data.errors.last5xxAt);
  if (data.approvals) this.approval = { ...this.approval, ...data.approvals };
  if (data.verification) this.verification = { ...this.verification, ...data.verification };
  if (data.digests) {
    if (typeof data.digests.total === 'number') this.digests.total = data.digests.total;
    if (data.digests.lastSentAt) this.digests.lastSentAt = new Date(data.digests.lastSentAt);
  }
    } catch {}
  }
  private save(){
    try {
      fs.mkdirSync(path.dirname(this.persistFile), { recursive: true });
      fs.writeFileSync(this.persistFile, JSON.stringify(this.snapshot(), null, 2));
      this.dirty = false;
    } catch (e) {
      // swallow
    }
  }
}

export const metricsRegistry = new MetricsRegistry();
export default metricsRegistry;
