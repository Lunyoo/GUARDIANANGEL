import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

router.get('/platform/summary', async (_req, res) => {
  try {
    const result: any = { ts: Date.now() }
    try { result.products = await (prisma as any).product.count() } catch { result.products = 0 }
    try { result.pendingOrders = await (prisma as any).hypeeOrder.count({ where: { status: { in: ['PENDING','PENDING_ADMIN'] } } }) } catch { result.pendingOrders = 0 }
    try { result.conversations = await (prisma as any).conversation.count({ where: { status: { not: 'completed' } } }) } catch { result.conversations = 0 }
    // Quick media count (filesystem)
    try {
      const mediaDir = path.join(process.cwd(), 'backend/src/media/products')
      let mediaFiles = 0
      if (fs.existsSync(mediaDir)) {
        const productDirs = fs.readdirSync(mediaDir).filter(f=> !f.startsWith('.'))
        for (const d of productDirs) {
          const p = path.join(mediaDir, d)
            ;['images','videos','testimonials'].forEach(cat => {
              const cdir = path.join(p, cat)
              if (fs.existsSync(cdir)) mediaFiles += fs.readdirSync(cdir).filter(f=> !f.startsWith('.')).length
            })
        }
      }
      result.mediaFiles = mediaFiles
    } catch { result.mediaFiles = 0 }
    // Facebook campaigns quick indicator (env present)
    result.facebookConfigured = Boolean(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_AD_ACCOUNT_IDS)
    res.json({ success:true, summary: result })
  } catch (e:any) {
    res.status(500).json({ success:false, error: e.message })
  }
})

// Deep readiness report (env + product + media integrity) for final launch checks
router.get('/platform/readiness', async (_req, res) => {
  const startedAt = Date.now()
  const requiredEnv = [
    'FACEBOOK_ACCESS_TOKEN',
    'FACEBOOK_AD_ACCOUNT_IDS',
    'OPENAI_API_KEY',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'JWT_SECRET'
  ]
  const envStatus = requiredEnv.map(k => ({ key: k, present: !!process.env[k], length: (process.env[k]||'').length }))
  const missing = envStatus.filter(e=>!e.present).map(e=>e.key)

  // Product + COD cities validation (flagship calcinha)
  let productCheck: any = { count: 0 }
  const EXPECTED_CITIES = 73
  try {
    const products = await (prisma as any).product.findMany()
    productCheck.count = products.length
    const calcinha = products.find((p:any)=> /calcinha|lipo/i.test(p.name))
    if (calcinha) {
      let cities: string[] = []
      try {
        if (Array.isArray(calcinha.codCities)) cities = calcinha.codCities
        else if (typeof calcinha.codCities === 'string') {
          try { const parsed = JSON.parse(calcinha.codCities); if (Array.isArray(parsed)) cities = parsed; else throw 0 } catch { cities = calcinha.codCities.split(',').map((c:string)=>c.trim()).filter(Boolean) }
        }
      } catch {}
      productCheck.calcinha = {
        id: calcinha.id,
        name: calcinha.name,
        slug: calcinha.slug,
        slugOk: !!calcinha.slug && !/\s/.test(calcinha.slug),
        codCitiesCount: cities.length,
        expected: EXPECTED_CITIES,
        citiesOk: cities.length === EXPECTED_CITIES
      }
    } else {
      productCheck.calcinha = { missing: true }
    }
  } catch (e:any) {
    productCheck.error = e.message
  }

  // Media integrity per product dir
  const mediaRoot = path.join(process.cwd(), 'backend/src/media/products')
  const mediaCheck: any = { rootExists: fs.existsSync(mediaRoot), products: [] }
  if (mediaCheck.rootExists) {
    try {
      const dirs = fs.readdirSync(mediaRoot).filter(f=> !f.startsWith('.'))
      for (const dir of dirs) {
        const base = path.join(mediaRoot, dir)
        const countFor = (cat:string) => {
          const c = path.join(base, cat)
          if (!fs.existsSync(c)) return 0
          return fs.readdirSync(c).filter(f=> !f.startsWith('.') && !f.endsWith('.json')).length
        }
        mediaCheck.products.push({ slug: dir, images: countFor('images'), videos: countFor('videos'), testimonials: countFor('testimonials') })
      }
    } catch (e:any) { mediaCheck.error = e.message }
  }

  const facebookAccounts = (process.env.FACEBOOK_AD_ACCOUNT_IDS||'').split(',').map(s=>s.trim()).filter(Boolean)
  const facebookNormalized = facebookAccounts.map(a => a.startsWith('act_') ? a : `act_${a}`)

  const ok = missing.length === 0 && productCheck.calcinha && productCheck.calcinha.citiesOk && productCheck.calcinha.slugOk
  res.json({
    success: ok,
    tookMs: Date.now() - startedAt,
    env: { status: envStatus, missing },
    productCheck,
    mediaCheck,
    facebook: { accounts: facebookAccounts.length, normalizedSample: facebookNormalized.slice(0,2) }
  })
})

export default router