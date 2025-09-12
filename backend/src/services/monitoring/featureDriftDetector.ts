interface Summary { count:number; mean:number; m2:number }
function summarize(values:number[]): Summary {
  let mean=0, m2=0
  values.forEach((x,i)=>{ const delta = x-mean; mean += delta/(i+1); m2 += delta*(x-mean) })
  return { count: values.length, mean, m2 }
}
function variance(s:Summary){ return s.count>1? s.m2/(s.count-1):0 }

class FeatureDriftDetectorCore {
  private baselineSummary: Summary | null = null
  private baseline: { sampleSize:number; ts:string } | null = null
  private lastEvaluation: { sampleSize:number; driftScore:number; ts:string; mean:number } | null = null

  async checkDrift(): Promise<{ hasDrift: boolean; score: number }> {
    const score = this.lastEvaluation?.driftScore || 0
    return { hasDrift: score > 0.5, score }
  }

  async buildBaseline(leadIds: string[]): Promise<void> {
    // Simulate feature extraction numeric (length heuristic)
    const syntheticFeature = leadIds.map(id=> id.length % 10)
    this.baselineSummary = summarize(syntheticFeature)
    this.baseline = { sampleSize: leadIds.length, ts: new Date().toISOString() }
  }

  async evaluateCurrent(leadIds: string[]): Promise<{ driftScore:number; hasDrift:boolean }> {
    if (!this.baselineSummary) return { driftScore:0, hasDrift:false }
    const syntheticFeature = leadIds.map(id=> id.length % 10)
    const current = summarize(syntheticFeature)
    // Simple population mean shift score normalized by pooled std
    const baseVar = variance(this.baselineSummary)
    const curVar = variance(current)
    const pooledStd = Math.sqrt(((this.baselineSummary.count-1)*baseVar + (current.count-1)*curVar) / Math.max(1,(this.baselineSummary.count+current.count-2))) || 1
    const meanDiff = Math.abs(current.mean - this.baselineSummary.mean)
    const z = meanDiff / pooledStd
    const driftScore = Math.min(1, z/5) // cap
    const hasDrift = driftScore > 0.5
    this.lastEvaluation = { sampleSize: leadIds.length, driftScore, ts: new Date().toISOString(), mean: current.mean }
    return { driftScore, hasDrift }
  }
  
  async getMetrics() {
    const score = this.lastEvaluation?.driftScore || 0
    return {
      lastCheck: new Date().toISOString(),
      driftScore: score,
      status: score>0.7? 'drift': score>0.4? 'watch':'stable',
      baseline: this.baseline,
      lastEvaluation: this.lastEvaluation
    }
  }
}

export const featureDriftDetector = new FeatureDriftDetectorCore()
