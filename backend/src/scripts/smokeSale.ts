import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'

async function wait(ms:number){ return new Promise(r=>setTimeout(r,ms)) }

async function main(){
  const prisma = new PrismaClient()
  const phone = '+5511999990000'
  const steps = ['Oi','Meu nome é Teste','Sou de São Paulo','Meu tamanho é M','Quanto custa?','Quero 1 unidade','Fechar pedido']
  const PORT = process.env.PORT || process.env.API_PORT || '3001'
  const BASE = process.env.SMOKE_BASE || `http://localhost:${PORT}`
  console.log('🧪 Smoke sale start for', phone)
  const endpoint = `${BASE}/api/bot/webhook`
  console.log('🔗 Using endpoint', endpoint)
  const authHeader: Record<string,string> = process.env.BOT_API_TOKEN ? { Authorization: process.env.BOT_API_TOKEN } : {}
  for (const s of steps){
    console.log('➡️  Inbound:', s)
  const headers: Record<string,string> = { 'Content-Type':'application/json', ...authHeader }
  const r = await fetch(endpoint, { method:'POST', headers, body: JSON.stringify({ phone, text:s }) })
    console.log('   status', r.status)
    if (r.status !== 200) {
      try { console.log('   body', await r.text()) } catch {}
    }
    await wait(1200)
  }
  await wait(3000)
  // Collect metrics
  const lead = await (prisma as any).lead.findFirst({ where:{ phone: phone.replace('+','').replace('@c.us','') }, include:{ messages:true } })
  const msgs = lead?.messages?.length || 0
  const hasPriceOutbound = (lead?.messages||[]).some((m:any)=> m.direction==='outbound' && /R\$/i.test(m.content||''))
  const orders = (prisma as any).hypeeOrder ? await (prisma as any).hypeeOrder.count({ where:{ customerPhone: lead?.phone } }) : 0
  const pass = msgs>5 && hasPriceOutbound // order optional (may be 0 in early runs)
  console.log('📊 Result: messages=', msgs, 'priceSent=', hasPriceOutbound, 'orders=', orders, 'base=', BASE)
  console.log(pass ? '✅ SMOKE SALE PASS' : '❌ SMOKE SALE FAIL')
  process.exit(pass?0:1)
}
main().catch(e=>{ console.error(e); process.exit(1) })