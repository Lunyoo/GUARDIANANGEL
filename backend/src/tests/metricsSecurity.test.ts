import assert from 'assert'
import http from 'http'

// Start server programmatically to avoid external dependency on tsx command here.
process.env.BOT_METRICS_PUBLIC = 'false'
process.env.BOT_METRICS_KEY = process.env.BOT_METRICS_KEY || 'secret'
process.env.BOT_DB_INMEMORY = '1'
process.env.NODE_ENV = 'test'
// Use dedicated port to avoid clashing with any running dev server
process.env.PORT = process.env.METRICS_TEST_PORT || '3101'

// Dynamically import server (will start listening) – reuse existing server.ts side-effects.
import('../server').catch(e=>{ console.error('Server import failed', e); process.exit(1) })

const PORT = Number(process.env.PORT)||3101

function get(path: string, headers: Record<string,string> = {}) {
  return new Promise<any>((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: PORT, path, method: 'GET', headers }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { resolve({ raw: data }) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function run(){
  // wait for server health
  let attempts = 0
  while (attempts < 30) {
    try { await get('/health'); break } catch { await new Promise(r=>setTimeout(r,200)); attempts++ }
  }
  const noAuth = await get('/api/bot/metrics')
  console.log('NO_AUTH_RESPONSE', noAuth)
  // Expect strict 403 protection when BOT_METRICS_PUBLIC=false
  assert(noAuth.ok === false && (noAuth.error === 'forbidden'), 'metrics should be forbidden without key')
  const key = process.env.BOT_METRICS_KEY || ''
  const withAuth = await get('/api/bot/metrics', { 'x-bot-metrics-key': key })
  console.log('WITH_AUTH_RESPONSE', withAuth, 'USING_KEY', key)
  if (withAuth.ok !== true) {
    console.error('Metrics auth failed with key; dumping env snapshot', { BOT_METRICS_PUBLIC: process.env.BOT_METRICS_PUBLIC, haveKey: Boolean(key) })
  }
  assert(withAuth.ok === true, 'metrics with key should succeed')
  console.log('METRICS_SECURITY_TEST_PASS')
  process.exit(0)
}

run().catch(e=>{ console.error('METRICS_SECURITY_TEST_FAIL', e); process.exit(1) })
