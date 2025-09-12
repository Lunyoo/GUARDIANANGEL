// 🧠 ML Decision Logger - simple in-memory ring buffer used by dashboard and bots

export interface MLDecisionLog {
  timestamp: string
  customerId: string
  conversationId: string
  modelUsed: string
  strategy: any
  confidence: number
  factors: string[]
  responseLength: number
  messageCount: number
  result?: {
    responded: boolean
    progressed: boolean
    converted: boolean
    revenue?: number
  }
}

const MAX_DECISIONS = 500
const buffer: MLDecisionLog[] = []

export function addDecision(entry: MLDecisionLog) {
  buffer.unshift(entry)
  if (buffer.length > MAX_DECISIONS) buffer.pop()
}

export function getDecisions(limit = 100): MLDecisionLog[] {
  return buffer.slice(0, limit)
}

export function clearDecisions() {
  buffer.length = 0
}

export default { addDecision, getDecisions, clearDecisions }
