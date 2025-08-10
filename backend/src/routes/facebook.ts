import { Router } from 'express'
import axios from 'axios'
import { getDatabase } from '../config/database.js'
import logger from '../config/logger.js'

const router = Router()

// Test Facebook API connection
router.get('/test', async (req: any, res, next) => {
  try {
    const user = req.user
    
    if (!user.facebook_token || !user.ad_account_id) {
      return res.status(400).json({ error: 'Token ou conta de anúncios não configurados' })
    }
    
    const response = await axios.get(`https://graph.facebook.com/v18.0/${user.ad_account_id}`, {
      params: {
        access_token: user.facebook_token,
        fields: 'id,name,currency,account_status,business'
      }
    })
    
    res.json({
      status: 'success',
      account: response.data
    })
  } catch (error: any) {
    logger.error('Facebook API test failed:', error.response?.data || error.message)
    res.status(400).json({
      error: 'Erro na API do Facebook',
      details: error.response?.data?.error?.message || error.message
    })
  }
})

// Update Facebook credentials
router.post('/config', async (req: any, res, next) => {
  try {
    const user = req.user
    const { facebook_token, ad_account_id } = req.body
    
    if (!facebook_token || !ad_account_id) {
      return res.status(400).json({ error: 'Token e ID da conta são obrigatórios' })
    }
    
    // Test the token first
    const testResponse = await axios.get(`https://graph.facebook.com/v18.0/${ad_account_id}`, {
      params: {
        access_token: facebook_token,
        fields: 'id,name'
      }
    })
    
    if (!testResponse.data.id) {
      return res.status(400).json({ error: 'Token ou conta inválidos' })
    }
    
    // Update in database
    const db = getDatabase()
    db.prepare(`
      UPDATE users 
      SET facebook_token = ?, ad_account_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(facebook_token, ad_account_id, user.id)
    
    res.json({
      status: 'success',
      message: 'Configuração salva com sucesso',
      account: testResponse.data
    })
  } catch (error: any) {
    logger.error('Facebook config update failed:', error)
    res.status(400).json({
      error: 'Erro ao salvar configuração',
      details: error.response?.data?.error?.message || error.message
    })
  }
})

// Get account info
router.get('/account', async (req: any, res, next) => {
  try {
    const user = req.user
    
    if (!user.facebook_token || !user.ad_account_id) {
      return res.status(400).json({ error: 'Configuração não encontrada' })
    }
    
    const response = await axios.get(`https://graph.facebook.com/v18.0/${user.ad_account_id}`, {
      params: {
        access_token: user.facebook_token,
        fields: 'id,name,currency,account_status,business,spend_cap,balance,timezone_name'
      }
    })
    
    res.json(response.data)
  } catch (error: any) {
    logger.error('Facebook account info failed:', error)
    res.status(400).json({
      error: 'Erro ao obter informações da conta',
      details: error.response?.data?.error?.message || error.message
    })
  }
})

export default router