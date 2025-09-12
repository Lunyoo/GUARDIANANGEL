import { botImageService } from '../services/bot/botImageService'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

async function main() {
  console.log('🧪 Checking image recommendation and path resolution...')
  const rec = await botImageService.getImageForBotResponse({
    customerMessage: 'Tem foto?',
    previousMessages: ['oi'],
    conversationStage: 'initial',
    productInterest: 'calcinha-lipo-modeladora'
  })
  if (!rec) {
    console.log('❌ No image recommendation returned')
    process.exit(2)
  }
  console.log('✅ Recommendation:', rec.imageUrl)

  const relativePath = rec.imageUrl.replace(/^\/?media\//, 'media/')
  const moduleDir = path.dirname(fileURLToPath(import.meta.url))
  const rawCandidates = [
    path.join(process.cwd(), 'src', relativePath),
    path.join(process.cwd(), 'backend', 'src', relativePath),
    path.join(moduleDir, '..', '..', relativePath)
  ]
  // Deduplicate and prefer the shortest existing path (avoids backend/backend)
  const seen = new Set<string>()
  const candidates = rawCandidates.filter(p => { if (seen.has(p)) return false; seen.add(p); return true })
  console.log('🔎 Candidates:')
  for (const c of candidates) {
    console.log(' -', c, fs.existsSync(c) ? '(exists)' : '(missing)')
  }
  const existing = candidates
    .filter(p => fs.existsSync(p))
    .sort((a,b) => a.length - b.length)[0]
  if (!existing) {
    console.log('❌ None of the paths exist')
    process.exit(3)
  }
  console.log('✅ Using:', existing)
}

main().catch(err => { console.error(err); process.exit(1) })
