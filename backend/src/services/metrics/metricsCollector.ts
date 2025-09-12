import { getQueueStats } from '../bot/messageQueue.js'
import { superIntelligentSystem } from '../ml/superIntelligentSystem'
import { neuralOrchestrator } from '../ml/neuralOrchestrator'

const decisionLatencies: number[] = []
const MAX_SAMPLES = 200

export function recordDecisionLatency(ms: number){
  decisionLatencies.push(ms)
  if (decisionLatencies.length > MAX_SAMPLES) decisionLatencies.splice(0, decisionLatencies.length - MAX_SAMPLES)
}

function summarizeLatencies(){
  if (!decisionLatencies.length) return { count:0 }
  const arr = decisionLatencies.slice(-MAX_SAMPLES)
  const count = arr.length
  const avg = arr.reduce((a,b)=>a+b,0)/count
  const p95 = arr.slice().sort((a,b)=>a-b)[Math.floor(count*0.95)-1] || arr[count-1]
  const max = Math.max(...arr)
  return { count, avg, p95, max }
}

export async function collectSystemMetrics(){
  let neural:any = null, superSys:any = null
  try { neural = await neuralOrchestrator.getSystemMetrics() } catch {}
  try { superSys = superIntelligentSystem.getSystemMetrics() } catch {}
  return {
    timestamp: new Date().toISOString(),
    queue: getQueueStats(),
    decisions: summarizeLatencies(),
    neural,
    super: superSys
  }
}

export default { recordDecisionLatency, collectSystemMetrics }
