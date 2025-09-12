// Central shared bot types (initial extraction step)
// Incrementally expand as inboundProcessor is refactored.

export interface PlannedMessage {
  content: string
  baseDelay: number
  variant: string
}

export interface QueueMeta {
  phone?: string
  to?: string
  leadPhone?: string
  phoneNumber?: string
  waId?: string
  [k: string]: any
}

export type OutboundMsgType = 'text' | 'media' | 'audio'

export interface OutboundMsgRecord {
  id: string
  conversationId: string
  content: string
  msgType: OutboundMsgType
  meta?: QueueMeta
  scheduleAt: number
  sent?: boolean
  attempts: number
}

// Minimal shape of neural orchestrator decision we depend on
export interface NeuralScoringAction { score?: number; expectedValue?: number }
export interface NeuralActions {
  scoring?: NeuralScoringAction
  nextSteps?: string[]
  botAction?: string
  [k: string]: any
}
export interface NeuralDecision {
  reasoning: string[]
  actions: NeuralActions
  timestamp?: number
}

export interface SuperDecisionAction {
  type?: string
  meta?: any
}
export interface SuperDecision {
  finalAction?: SuperDecisionAction
  legacyAction?: string
  confidence?: number
  [k: string]: any
}

export interface LeadContextSnapshot {
  id: number | string
  phone: string
  city?: string | null
  stage?: string
  lastContact?: Date | string
  [k: string]: any
}

export interface ProcessInboundResult {
  processed: boolean
  type: string
  response?: string
  error?: string
  plannedMessages?: PlannedMessage[]
}

export interface VariantTemplate { variant: string; content: string }

// Marker interface for future richer customer profile extraction
export interface CustomerContext { city?: string; objections?: string[]; [k: string]: any }

// Stronger typing additions
export interface ConversationRecord {
  id: string
  leadId: string | number
  stage?: string
  status?: string
  isEscalated?: boolean
  productId?: string
  raw?: any
  metadata?: any
  messages?: Array<{ id: string; content: string; direction: 'IN'|'OUT'|'inbound'|'outbound'; sentAt?: string | Date; meta?: any }>
}

export interface LeadRecord {
  id: string | number
  phone: string
  city?: string | null
  name?: string | null
  context?: CustomerContext
  totalOrders?: number
}

export interface ScheduleOutboundInput {
  conversationId: string
  content: string
  msgType: 'text' | 'media' | 'audio'
  meta?: any
}

export interface BotProcessingResult {
  conversationId?: string | number
  neuralDecision?: any
  mediaProcessed?: boolean
  mediaResponse?: string
}
