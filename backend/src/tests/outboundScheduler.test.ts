import assert from 'assert'
process.env.BOT_DB_INMEMORY = '1'
process.env.NODE_ENV = process.env.NODE_ENV || 'test'
// @ts-ignore runtime js shim
import { schedulePlannedMessages } from '../services/bot/outboundScheduler.runtime.js'

// Minimal prisma-like mock
const prisma: any = {
  message: {
    findMany: async () => [],
    findFirst: async () => null,
    count: async () => 0
  },
  conversation: {
    findUnique: async () => ({ raw: {}, id: 'c1' }),
    update: async () => ({})
  }
}

async function run() {
  const planned = [
    { content: 'Teste preço XX,XX', baseDelay: 200, variant: 'script_intro_v1' },
    { content: 'Teste preço XX,XX', baseDelay: 200, variant: 'script_intro_v1' }, // duplicate
    { content: 'Outra mensagem', baseDelay: 300, variant: 'script_offers_v1' }
  ]
  const res = await schedulePlannedMessages({
    prisma,
    convo: { id: 'c1', messages: [] },
    planned: planned as any,
    phoneNorm: '5511999999999',
    customerCtx: {},
    text: 'qual o preco?',
    AI_ONLY: false,
    forceFreshStart: false
  })
  assert(res.scheduledCount >= 1 && res.scheduledCount <= 2, 'scheduled count out of expected range')
  console.log('OUTBOUND_SCHEDULER_TEST_PASS')
}

run().catch(e => { console.error('OUTBOUND_SCHEDULER_TEST_FAIL', e); process.exit(1) })
