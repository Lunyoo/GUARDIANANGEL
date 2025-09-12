import axios from 'axios'

async function main(){
  const BASE = `http://localhost:${process.env.PORT || 3001}`
  const phone = process.env.E2E_PHONE || '5511999990001'
  const log = (...a:any[])=>console.log('[E2E]',...a)

  const get = (p:string)=>axios.get(BASE+p).then(r=>r.data)
  const post = (p:string, data?:any)=>axios.post(BASE+p, data).then(r=>r.data)

  // 1) Health and WA status
  log('health', await get('/health'))
  log('wa', await get('/api/bot/whatsapp/status'))

  // 2) Allocator approvals and seed + allocate
  try { await post('/api/public/allocator/dev/approvals/enable') } catch {}
  await post('/api/public/allocator/dev/seed', { campaigns:[
    { campaignId:'CAMP_A', name:'A', budget:100, roas:1.2 },
    { campaignId:'CAMP_B', name:'B', budget:150, roas:0.8 },
    { campaignId:'CAMP_C', name:'C', budget:50, roas:1.5 },
  ]})
  const alloc = await post('/api/public/allocator/allocate', { strategy:'balanced' })
  log('alloc.id', alloc.id)
  log('pending', await get('/api/public/allocator/pending'))
  log('status', await get('/api/public/allocator/status'))

  // 3) Short sale simulation via webhook
  const msgs = ['Oi', 'Sou de Sao Paulo', 'Quero 1 unidade']
  for (const text of msgs) {
    const resp = await post('/api/bot/webhook', { phone, text })
    log('inbound', text, '->', resp?.result?.conversationId)
  }

  // 4) Wait for dispatcher to send and persist OUT messages
  await new Promise(r=>setTimeout(r, 5000))

  const history = await get(`/api/bot/whatsapp/phone/${phone}/messages`)
  const outs = Array.isArray(history?.messages)? history.messages.filter((m:any)=>m.direction==='OUT'):[]
  log('history.count', history?.messages?.length, 'outs', outs.length)

  // PASS/FAIL summary
  const pass = outs.length > 0
  console.log('\n===== E2E SUMMARY =====')
  console.log('Allocator allocations:', alloc?.allocations?.length||0)
  console.log('OUT messages present:', pass)
  if (!pass) process.exitCode = 2
}

main().catch(e=>{ console.error('[E2E] failed:', e?.response?.data || e.message); process.exit(1) })
