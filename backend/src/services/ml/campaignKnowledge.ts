// Campaign knowledge TypeScript implementation (restored minimal)
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DATA_DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'campaign_knowledge.json')

interface CampaignKnowledgeFile {
  campaigns: Array<{
    id?: string
    ideaHash?: string
    ideaSummary?: string
    objective?: string
    audience?: string | null
    spend?: number
    conversions?: number
    revenue?: number
    createdAt: string
    cpa?: number
    roas?: number
  }>
  aggregates: {
    totalSpend: number
    totalConversions: number
    avgCPA?: number
    avgROAS?: number
    lastUpdated?: string
    topAudiences?: Array<{ audience: string, conversions: number }>
    objectives?: Record<string, number>
  }
}

function ensureFile(): CampaignKnowledgeFile {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }) } catch {}
  if (!fs.existsSync(FILE)) {
    const empty: CampaignKnowledgeFile = { campaigns: [], aggregates: { totalSpend:0, totalConversions:0 } }
    fs.writeFileSync(FILE, JSON.stringify(empty, null, 2))
    return empty
  }
  try {
    return JSON.parse(fs.readFileSync(FILE,'utf-8'))
  } catch {
    return { campaigns: [], aggregates: { totalSpend:0, totalConversions:0 } }
  }
}

function saveFile(data: CampaignKnowledgeFile) {
  data.aggregates.lastUpdated = new Date().toISOString()
  try { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)) } catch {}
}

export async function refreshKnowledgeFromDB(limit=200) {
  const file = ensureFile()
  try {
    const campaigns = await (prisma as any).campaign?.findMany?.({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id:true, idea:true, objective:true, audience:true, spend:true, conversions:true, revenue:true, createdAt:true }
    })
    if (!campaigns) return file
    file.campaigns = campaigns.map((c:any)=>({
      id: c.id,
      ideaSummary: (c.idea||'').slice(0,140),
      objective: c.objective,
      audience: typeof c.audience === 'string' ? c.audience : (c.audience?.demographic || null),
      spend: Number(c.spend||0),
      conversions: Number(c.conversions||0),
      revenue: Number(c.revenue||0),
      createdAt: c.createdAt?.toISOString?.() || new Date().toISOString(),
      cpa: c.conversions ? Number(c.spend||0)/Number(c.conversions||1) : undefined,
      roas: c.spend ? (Number(c.revenue|| (Number(c.conversions||0)*100)) / Number(c.spend||1)) : undefined
    }))
    computeAggregates(file)
    saveFile(file)
  } catch (e) {
    // ignore
  }
  return file
}

function computeAggregates(file: CampaignKnowledgeFile) {
  const totalSpend = file.campaigns.reduce((s,c)=>s+(c.spend||0),0)
  const totalConv = file.campaigns.reduce((s,c)=>s+(c.conversions||0),0)
  const avgCPA = totalConv ? totalSpend / totalConv : undefined
  const avgROAS = file.campaigns.length ? avgRatio(file.campaigns.map(c=>c.roas).filter(Boolean) as number[]) : undefined
  const audMap: Record<string, number> = {}
  const objMap: Record<string, number> = {}
  file.campaigns.forEach(c=>{
    if (c.audience) audMap[c.audience] = (audMap[c.audience]||0) + (c.conversions||0)
    if (c.objective) objMap[c.objective] = (objMap[c.objective]||0) + 1
  })
  const topAudiences = Object.entries(audMap).map(([aud,conv])=>({ audience: aud, conversions: conv }))
    .sort((a,b)=>b.conversions-a.conversions).slice(0,5)
  file.aggregates = { totalSpend, totalConversions: totalConv, avgCPA, avgROAS, topAudiences, objectives: objMap, lastUpdated: new Date().toISOString() }
}

function avgRatio(arr: number[]): number | undefined { if (!arr.length) return undefined; return arr.reduce((a,b)=>a+b,0)/arr.length }

export function summarizeKnowledge() {
  const file = ensureFile()
  computeAggregates(file)
  return file
}

export function registerIdeaOutcome(params: { idea: string; objective?: string; audience?: string; predicted?: any }) {
  const file = ensureFile()
  file.campaigns.unshift({
    id: 'idea-'+Date.now(),
    ideaSummary: params.idea.slice(0,140),
    objective: params.objective,
    audience: params.audience,
    createdAt: new Date().toISOString(),
    spend: params.predicted?.budget || 0,
    conversions: params.predicted?.predictedConversions || 0,
    revenue: params.predicted?.predictedConversions ? params.predicted.predictedConversions * 100 : 0,
    cpa: undefined,
    roas: undefined
  })
  if (file.campaigns.length > 300) file.campaigns.length = 300
  computeAggregates(file)
  saveFile(file)
  return file
}
