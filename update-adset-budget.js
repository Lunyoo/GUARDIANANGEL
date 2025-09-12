// Script para atualizar budget de um ad set específico
import axios from 'axios'

const FACEBOOK_TOKEN = process.env.FACEBOOK_TOKEN || 'SEU_TOKEN_AQUI'
const CAMPAIGN_ID = '120234143742540191'

async function updateAdsetBudget() {
  try {
    console.log('🔍 Buscando ad sets da campanha:', CAMPAIGN_ID)
    
    // Primeiro buscar os ad sets da campanha
    const adsetsResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${CAMPAIGN_ID}/adsets`,
      {
        params: {
          fields: 'id,name,daily_budget,status',
          access_token: FACEBOOK_TOKEN
        }
      }
    )
    
    const adsets = adsetsResponse.data?.data || []
    console.log('📊 Ad sets encontrados:', adsets.length)
    
    if (adsets.length === 0) {
      console.log('❌ Nenhum ad set encontrado para esta campanha')
      return
    }
    
    // Mostrar todos os ad sets
    adsets.forEach((adset, index) => {
      console.log(`${index + 1}. ${adset.name} (ID: ${adset.id})`)
      console.log(`   Budget atual: R$${(adset.daily_budget / 100).toFixed(2)}`)
      console.log(`   Status: ${adset.status}`)
      console.log()
    })
    
    // Pegar o primeiro ad set e atualizar para R$60 (6000 centavos)
    const firstAdset = adsets[0]
    const newBudget = 6000 // R$60.00 em centavos
    
    console.log(`🔧 Atualizando budget do ad set "${firstAdset.name}" para R$60...`)
    
    const updateResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${firstAdset.id}`,
      {
        daily_budget: newBudget,
        access_token: FACEBOOK_TOKEN
      }
    )
    
    console.log('✅ Budget atualizado com sucesso!')
    console.log('📊 Resposta:', updateResponse.data)
    
    // Verificar a atualização
    const verifyResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${firstAdset.id}`,
      {
        params: {
          fields: 'id,name,daily_budget',
          access_token: FACEBOOK_TOKEN
        }
      }
    )
    
    const updated = verifyResponse.data
    console.log(`🔍 Verificação - Budget atual: R$${(updated.daily_budget / 100).toFixed(2)}`)
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message)
  }
}

updateAdsetBudget()
