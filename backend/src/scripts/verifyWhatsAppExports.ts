import * as mod from '../services/bot/whatsappClient.fixed'
import fs from 'fs'
import path from 'path'

console.log('Export keys:', Object.keys(mod))
console.log('Has isWhatsAppReady:', typeof (mod as any).isWhatsAppReady === 'function')

// Print resolved URL
const spec = '../services/bot/whatsappClient'
// @ts-ignore - Node 20 has import.meta.resolve
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const resolved = import.meta.resolve ? import.meta.resolve(spec) : spec
console.log('Resolved URL:', resolved)

const p = path.resolve(process.cwd(), 'src/services/bot/whatsappClient.ts')
const src = fs.readFileSync(p, 'utf-8')
console.log('File head:', src.split('\n').slice(0, 5).join(' \n '))
