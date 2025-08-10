interface KiwifyOAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface KiwifyOAuthRequest {
  client_id: string
  client_secret: string
}

export class KiwifyAuthService {
  private static baseUrl = 'https://public-api.kiwify.com/v1'
  
  /**
   * Gera um token OAuth Bearer para autenticação na API do Kiwify
   * @param clientId - ID do cliente fornecido pelo Kiwify
   * @param clientSecret - Secret do cliente fornecido pelo Kiwify
   * @returns Promise com o token de acesso
   */
  static async generateOAuthToken(
    clientId: string, 
    clientSecret: string
  ): Promise<KiwifyOAuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Erro na autenticação Kiwify: ${response.status} - ${errorData}`)
      }

      const tokenData: KiwifyOAuthResponse = await response.json()
      
      // Validar resposta
      if (!tokenData.access_token) {
        throw new Error('Token de acesso não recebido do Kiwify')
      }

      return tokenData
    } catch (error) {
      console.error('Erro ao gerar token OAuth Kiwify:', error)
      throw error
    }
  }

  /**
   * Valida se um token OAuth ainda está válido
   * @param accessToken - Token Bearer para validar
   * @returns Promise<boolean> indicando se o token é válido
   */
  static async validateToken(accessToken: string): Promise<boolean> {
    try {
      // Tenta fazer uma chamada simples para verificar se o token funciona
      const response = await fetch(`${this.baseUrl}/accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Faz uma requisição autenticada para a API do Kiwify
   * @param endpoint - Endpoint da API (sem o base URL)
   * @param accessToken - Token Bearer válido
   * @param options - Opções da requisição
   */
  static async apiRequest<T = any>(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Erro na API Kiwify (${endpoint}): ${response.status} - ${errorData}`)
    }

    return response.json()
  }
}

export type { KiwifyOAuthResponse, KiwifyOAuthRequest }