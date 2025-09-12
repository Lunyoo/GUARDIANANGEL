/**
 * Statistical anomaly detector (z-score based) with rolling windows per metric.
 * API: record(metric, value), getAll(limit), getMetrics(), getAnomalies(metric).
 */

export interface AnomalyRecord { id:string; metric:string; value:number; severity:'low'|'medium'|'high'; ts:number; note?:string; mean:number; std:number; z:number }

interface SeriesState { values:number[]; mean:number; m2:number; count:number }

function updateWelford(state: SeriesState, x:number, maxWindow=500){
  state.values.push(x)
  if (state.values.length > maxWindow) state.values.shift()
  // recompute incremental statistics from window (simple for clarity)
  const arr = state.values
  const n = arr.length
  const mean = arr.reduce((a,b)=>a+b,0)/n
  const variance = arr.reduce((a,b)=> a + (b-mean)**2, 0)/(n>1? n-1:1)
  state.mean = mean
  state.m2 = variance * (n>1? n-1:1)
  state.count = n
}

class AnomalyDetector {
  private records: AnomalyRecord[] = []
  private series: Map<string, SeriesState> = new Map()

  record(metric:string, value:number, note?:string){
    const series = this.series.get(metric) || { values:[], mean:0, m2:0, count:0 }
    updateWelford(series, value)
    this.series.set(metric, series)
    const std = Math.sqrt(series.count>1? series.m2/(series.count-1): 0)
    const z = std>0? (value - series.mean)/std : 0
    let severity:AnomalyRecord['severity'] = 'low'
    if (Math.abs(z) > 3) severity = 'high'
    else if (Math.abs(z) > 2) severity = 'medium'
    if (severity !== 'low') {
      const rec: AnomalyRecord = { id: Math.random().toString(36).slice(2), metric, value, severity, ts: Date.now(), note, mean: series.mean, std, z }
      this.records.push(rec)
      if (this.records.length > 2000) this.records.splice(0, this.records.length - 2000)
      // Persist best-effort
      try {
        const db = require('../../config/database') as any
        const realDb = db.getDatabase?.()
        realDb?.prepare?.(`INSERT OR IGNORE INTO anomalies (id, metric, value, severity, mean, std, z, note, ts) VALUES (?,?,?,?,?,?,?,?,?)`).run(rec.id, rec.metric, rec.value, rec.severity, rec.mean, rec.std, rec.z, rec.note, rec.ts)
      } catch {}
    }
  }

  getAll(limit=100){ return this.records.slice(-limit).sort((a,b)=> b.ts - a.ts) }
  getAnomalies(metric:string, limit=50){ return this.getAll(500).filter(r=>r.metric===metric).slice(-limit) }
  getMetrics(){
    const last = this.records[this.records.length-1]
    return {
      total: this.records.length,
      last,
      high: this.records.filter(r=>r.severity==='high').length,
      distinctMetrics: Array.from(new Set(this.records.map(r=>r.metric))).length
    }
  }
}

export const anomalyDetector = new AnomalyDetector()
