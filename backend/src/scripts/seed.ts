import { budgetAllocator } from '../services/ml/budgetAllocator.js'
import { leadScoringEngine } from '../services/ml/leadScoring.js'
import { contextualBotPolicy } from '../services/ml/contextualBotPolicy.js'
import { intelligentQueue } from '../services/ml/intelligentQueue.js'
import { getDatabase } from '../config/database.js'

async function main(){
  console.log('🌱 Running seed script')
  // Ensure DB exists
  const db = getDatabase()
  // Create an admin user if not exists
  try {
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@local.test')
    if(!existing){
      db.prepare('INSERT INTO users (email,password,nome,is_admin) VALUES (?,?,?,?)').run('admin@local.test', '$2a$10$placeholderhashhashhashhashhashhashhashhashha', 'Admin', 1)
      console.log('✅ Seeded admin user (set a real bcrypt hash later)')
    }
  } catch {}
  // Seed a few campaigns into allocator if empty
  const m = budgetAllocator.getMetrics()
  if (m.totalCampaigns === 0){
    const sample = [
      { campaignId:'CAMP-ALFA', name:'Campanha Alfa', totalSpent:1200, totalLeads:40, roas:2.1, budget:1500 },
      { campaignId:'CAMP-BETA', name:'Campanha Beta', totalSpent:800, totalLeads:22, roas:1.4, budget:900 },
      { campaignId:'CAMP-GAMMA', name:'Campanha Gamma', totalSpent:450, totalLeads:15, roas:1.9, budget:600 }
    ]
    sample.forEach(c=> budgetAllocator.addOrUpdateCampaign(c))
    console.log('✅ Seeded campaigns:', sample.length)
  } else {
    console.log('ℹ️ Campaigns already present, skipping allocator seed')
  }
  // Touch other engines for readiness
  console.log('ℹ️ Lead scoring model version', leadScoringEngine.modelVersion)
  console.log('ℹ️ Bot policy arms', contextualBotPolicy.getMetrics().arms.length)
  console.log('ℹ️ Queue length', intelligentQueue.getMetrics().queueLength)
  console.log('🌱 Seed complete')
}
main().catch(e=>{ console.error('Seed failed', e); process.exit(1) })
