/**
 * Utilitário para testar a integração OAuth do Kiwify
 */

import { kiwifyService } from '@/services/kiwifyService'

export interface KiwifyTestResult {
  success: boolean
  message: string
  details: {
    oauth_token_generated: boolean
    token_expires_at?: number
    account_info?: any
    available_scopes?: string
    error?: string
  }
}

export async function testKiwifyIntegration(
  clientId: string, 
  clientSecret: string
): Promise<KiwifyTestResult> {
  const result: KiwifyTestResult = {
    success: false,
    message: '',
    details: {
      oauth_token_generated: false
    }
  }

  try {
    console.log('🧪 Iniciando teste completo de integração Kiwify OAuth...')
    
    // Configurar credenciais
    kiwifyService.setCredentials(clientId, clientSecret)
    
    // Testar conexão OAuth
    const connectionTest = await kiwifyService.testConnection()
    
    if (connectionTest.success) {
      result.success = true
      result.message = 'Integração Kiwify OAuth funcionando perfeitamente!'
      result.details.oauth_token_generated = true
      result.details.available_scopes = connectionTest.scope || 'Escopo não informado'
      
      // Tentar listar produtos para confirmar acesso completo
      try {
        const products = await kiwifyService.listProducts()
        result.details.account_info = {
          products_accessible: true,
          products_count: products?.length || 0
        }
        result.message += ` Acesso confirmado a ${products?.length || 0} produtos.`
        
        console.log('✅ Teste Kiwify OAuth concluído com sucesso')
        console.log(`🎯 Produtos acessíveis: ${products?.length || 0}`)
      } catch (productError) {
        console.warn('⚠️ Erro ao acessar produtos:', productError)
        result.details.account_info = {
          products_accessible: false,
          error: productError instanceof Error ? productError.message : 'Erro desconhecido'
        }
      }
    } else {
      result.success = false
      result.message = `Erro na autenticação OAuth: ${connectionTest.message}`
      result.details.error = connectionTest.message
    }
    
  } catch (error) {
    console.error('❌ Erro crítico no teste Kiwify:', error)
    result.success = false
    result.message = `Erro crítico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    result.details.error = error instanceof Error ? error.message : 'Erro desconhecido'
  }

  return result
}

// Função para testar apenas a geração do token OAuth
export async function testOAuthTokenGeneration(
  clientId: string, 
  clientSecret: string
): Promise<{ success: boolean; message: string; tokenInfo?: any }> {
  try {
    const formData = new URLSearchParams()
    formData.append('client_id', clientId)
    formData.append('client_secret', clientSecret)

    const response = await fetch('https://api.kiwify.com.br/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    })

    if (response.ok) {
      const tokenData = await response.json()
      return {
        success: true,
        message: `Token gerado com sucesso! Expira em ${tokenData.expires_in} segundos.`,
        tokenInfo: {
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
          has_access_token: !!tokenData.access_token
        }
      }
    } else {
      const errorData = await response.text()
      return {
        success: false,
        message: `Erro ${response.status}: ${errorData}`
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro na requisição OAuth'
    }
  }
}

export default { testKiwifyIntegration, testOAuthTokenGeneration }