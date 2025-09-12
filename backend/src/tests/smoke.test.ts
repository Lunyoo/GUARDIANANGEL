import assert from 'assert'
import http from 'http'

function get(path:string):Promise<any>{
  return new Promise((resolve,reject)=>{
    const req = http.request({ hostname:'localhost', port: process.env.PORT||3001, path, method:'GET' }, res=>{
      let data=''; res.on('data',c=>data+=c); res.on('end',()=>{ try { resolve(JSON.parse(data)) } catch { resolve(data) } })
    })
    req.on('error',reject); req.end()
  })
}
(async()=>{
  const health = await get('/health')
  assert(health.status==='OK','health not OK')
  const bot = await get('/api/bot/status')
  assert(bot.status==='active','bot not active')
  const decision = await get('/api/ai/system/decision')
  assert(decision.ok===true,'decision endpoint failed')
  console.log('SMOKE_TEST_PASS')
  process.exit(0)
})().catch(e=>{ console.error('SMOKE_TEST_FAIL', e); process.exit(1) })
