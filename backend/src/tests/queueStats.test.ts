import assert from 'assert'
process.env.BOT_DB_INMEMORY = '1'
process.env.NODE_ENV = process.env.NODE_ENV || 'test'
import { scheduleOutboundMessage, getQueueStats } from '../services/bot/messageQueue.js'

async function run(){
  const before = getQueueStats()
  await scheduleOutboundMessage({ conversationId:'c_queue', content:'Olá XX,XX', msgType:'text', meta:{ variant:'script_intro_v1', phone:'5511999999999' } }, 100)
  const after = getQueueStats()
  assert(after.pending === before.pending + 1, `Expected pending +1 (before=${before.pending} after=${after.pending})`)
  console.log('QUEUE_STATS_TEST_PASS')
}

run().catch(e=>{ console.error('QUEUE_STATS_TEST_FAIL', e); process.exit(1) })