import fetch from 'node-fetch'

async function hit(path:string, opts:any = {}){
  const url = `http://localhost:${process.env.PORT||5000}${path}`
  const t0 = Date.now()
  try {
    const res = await fetch(url, { ...opts, headers:{ 'Accept':'application/json', ...(opts.headers||{}) } })
    const txt = await res.text()
    let json:any = null
    try { json = JSON.parse(txt) } catch {}
    const ms = Date.now()-t0
    const ok = res.ok
    console.log(`${ok? '✅':'❌'} ${path} ${res.status} ${ms}ms`)
    return { ok, status: res.status, ms, json }
  } catch (e:any) {
    console.log(`❌ ${path} ERR ${e.message}`)
    return { ok:false, error:e.message }
  }
}

async function main(){
  const results:any[] = []
  results.push(await hit('/api/bot/healthz'))
  results.push(await hit('/api/bot/whatsapp/status'))
  results.push(await hit('/api/bot/whatsapp/conversations'))
  results.push(await hit('/api/bot/system/health'))
  // Basic SSE connectivity (open briefly)
  try {
    const es = await fetch(`http://localhost:${process.env.PORT||5000}/api/bot/events`)
    console.log(es.ok ? '✅ /events stream opened' : '❌ /events failed')
  } catch(e:any){ console.log('❌ /events stream failed', e.message) }
  const pass = results.every(r=>r.ok)
  console.log(`\nSMOKE SUMMARY: ${pass? 'ALL PASS':'FAILURES'}`)
  if(!pass){ process.exitCode = 1 }
}
main()
