import { PrismaClient } from '@prisma/client'
import { LIPO_MODELADORA } from '../services/bot/productScripts.js'
import { initWhatsApp, isWhatsAppReady } from '../services/bot/whatsappClient.fixed'

// Helper: derive structured name & price table from Universal Bandits (não mais do productScript)
function deriveName() { return 'Calcinha Lipo Modeladora' }
function derivePriceTable() {
  // Preços base para seed - o bot usa Universal Bandits para pricing dinâmico
  return [
    { label: '1 un R$ 89,90', price: 89.90 },
    { label: '2 un R$ 119,90', price: 119.90 },
    { label: '3 un R$ 159,90', price: 159.90 }
  ]
}

async function main(){
  const prisma = new PrismaClient()
  console.log('🔧 Bootstrap LIVE start')
  // Seed product
  if ((prisma as any).product) {
    const sku = 'LIPO-CALCINHA-BASE'
    let prod = await (prisma as any).product.findFirst({ where:{ sku } })
    if(!prod){
      const priceTable = derivePriceTable()
      prod = await (prisma as any).product.create({ data:{
        name: deriveName(),
        description: 'Calcinha modeladora premium com entrega rápida nas capitais selecionadas. Preços multi-combo e pagamento na entrega em áreas elegíveis.',
        price: priceTable[0]?.price || 0,
        originalPrice: priceTable[1]?.price || priceTable[0]?.price || 0,
        images: 'https://example.com/calcinha1.jpg,https://example.com/calcinha2.jpg',
        sku,
        tags: 'modeladora,lingerie,cintura,conforto',
        codCities: JSON.stringify(LIPO_MODELADORA.cities)
      } })
      console.log('✅ Produto semeado:', prod.id)
    } else {
      console.log('ℹ️ Produto já existe:', prod.id)
    }
  } else {
    console.log('⚠️ Modelo Product indisponível (rodar migração).')
  }
  // WhatsApp
  if(!isWhatsAppReady()){
    console.log('⚡ Iniciando WhatsApp...')
    try { await initWhatsApp(); console.log('✅ WhatsApp inicializado') } catch(e:any){ console.log('❌ Falha init WA:', e?.message) }
  } else {
    console.log('✅ WhatsApp já pronto')
  }
  // Summary
  const leadCount = (await (prisma as any).lead?.count?.().catch(()=>0)) || 0
  const msgCount = (await (prisma as any).message?.count?.().catch(()=>0)) || 0
  console.log('📊 Resumo: leads=', leadCount, 'messages=', msgCount, 'waReady=', isWhatsAppReady())
  console.log('🚀 Bootstrap finalizado')
  process.exit(0)
}
main().catch(e=>{ console.error(e); process.exit(1) })