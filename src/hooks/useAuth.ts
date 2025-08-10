import { useKV } from './useKV'
import { useState, useEffect } from 'react'
import type { Usuario, ConfiguracaoApi, ApiResponse } from '@/types'

interface UseAuthReturn {
  usuarioAtual: Usuario | null
  isLoading: boolean
  erro: string
  login: (email: string, senha: string) => Promise<boolean>
  registrar: (email: string, nome: string, senha: string) => Promise<boolean>
  logout: () => void
  atualizarConfigApi: (config: ConfiguracaoApi) => Promise<boolean>
  isAuthenticated: boolean
  isAdmin: boolean
  hasValidApi: boolean
  automacaoCompleta: boolean
  hasIdeogramApi: boolean
  hasKiwifyOAuth: boolean
}

export function useAuth(): UseAuthReturn {
  const [usuarioAtual, setUsuarioAtual] = useKV<Usuario | null>('usuario-atual', null)
  const [configApi, setConfigApi] = useKV<ConfiguracaoApi>('usuario-api-config', {
    facebookToken: '',
    adAccountId: '',
    kiwifyClientId: '',
    kiwifyClientSecret: '',
    kiwifyToken: '7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982',
    ideogramToken: 'VNRXO6_4G0Miln5ngDTQqQHwkKRwxsZmUXV1R54XMqmEN1KqB-tu6I-n0s5PiWQorIFY2ysQMI1rrRm1GnBJvg',
    isValid: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [erro, setErro] = useState<string>('')

  // Sincronizar configurações do modal com o usuário logado
  useEffect(() => {
    if (usuarioAtual && configApi) {
      setUsuarioAtual((current: Usuario | null) => 
        current ? { 
          ...current, 
          configuracaoApi: {
            ...configApi,
            ultimaValidacao: configApi.isValid ? new Date().toISOString() : undefined
          }
        } : null
      )
    }
  }, [configApi])

  useEffect(() => {
    // Verificar se há um usuário logado ao carregar
    setIsLoading(false)
  }, [])

  const login = async (email: string, senha: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setErro('')
      
      // Admin especial - senha: admin123
      if (email === 'alexvinitius@gmail.com' && senha === 'admin123') {
        const adminUser: Usuario = {
          id: 'admin-001',
          email,
          nome: 'Alex Vinícius',
          nivel: 999,
          experiencia: 999999,
          isAdmin: true,
          avatarUrl: undefined,
          configuracaoApi: {
            facebookToken: 'EAAVVGCUptjwBPOFUdoqhk9fFAZA3clvMhwcQSp44wmHNJlZCivwJ56I4TaSU2otIjC1LvWZCj2PmonK9ahak1BYgmNcZBMKhSjIIoGKwZBogwamnHGrlxb7yn5GUH0UzEm0SUgPIj0ZBTITAHZCnCvBxc0nhrdNopLzFhLRaAZAcQgaA4BGWZBeKOHYmCEnRSDmZCrdUTXO0CuBhhm6xZC6',
            adAccountId: 'act_1060618782717636',
            kiwifyToken: '7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982',
            kiwifyClientId: 'admin-client-id',
            kiwifyClientSecret: '7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982',
            ideogramToken: 'VNRXO6_4G0Miln5ngDTQqQHwkKRwxsZmUXV1R54XMqmEN1KqB-tu6I-n0s5PiWQorIFY2ysQMI1rrRm1GnBJvg',
            isValid: true,
            ultimaValidacao: new Date().toISOString()
          },
          criadoEm: new Date().toISOString()
        }
        setUsuarioAtual(adminUser)
        
        // Sincronizar configuração inicial para o admin com todas as APIs
        setConfigApi({
          facebookToken: adminUser.configuracaoApi!.facebookToken,
          adAccountId: adminUser.configuracaoApi!.adAccountId,
          kiwifyToken: '7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982',
          kiwifyClientId: 'admin-client-id',
          kiwifyClientSecret: '7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982',
          ideogramToken: adminUser.configuracaoApi!.ideogramToken,
          isValid: true
        })
        
        return true
      }
      
      // Para outros usuários, simular autenticação
      if (senha === '123456') {
        const usuario: Usuario = {
          id: `user-${Date.now()}`,
          email,
          nome: email.split('@')[0],
          nivel: 1,
          experiencia: 0,
          isAdmin: false,
          criadoEm: new Date().toISOString()
        }
        setUsuarioAtual(usuario)
        return true
      }
      
      throw new Error('Credenciais inválidas')
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao fazer login')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const registrar = async (email: string, nome: string, senha: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setErro('')
      
      const novoUsuario: Usuario = {
        id: `user-${Date.now()}`,
        email,
        nome,
        nivel: 1,
        experiencia: 0,
        isAdmin: false,
        criadoEm: new Date().toISOString()
      }
      
      setUsuarioAtual(novoUsuario)
      return true
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao registrar')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUsuarioAtual(null)
    setErro('')
  }

  const atualizarConfigApi = async (config: ConfiguracaoApi): Promise<boolean> => {
    if (!usuarioAtual) return false
    
    try {
      // Validar token com a API do Facebook
      const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${config.facebookToken}`)
      const isValid = response.ok
      
      const novaConfig = {
        ...config,
        isValid,
        ultimaValidacao: new Date().toISOString()
      }
      
      setUsuarioAtual((current: Usuario | null) => 
        current ? { ...current, configuracaoApi: novaConfig } : null
      )
      
      return isValid
    } catch {
      return false
    }
  }

  // Ensure configApi has default values to prevent undefined errors
  const safeConfigApi = configApi || {
    facebookToken: '',
    adAccountId: '',
    kiwifyClientId: '',
    kiwifyClientSecret: '',
    kiwifyToken: '7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982',
    ideogramToken: 'VNRXO6_4G0Miln5ngDTQqQHwkKRwxsZmUXV1R54XMqmEN1KqB-tu6I-n0s5PiWQorIFY2ysQMI1rrRm1GnBJvg',
    isValid: false
  }

  return {
    usuarioAtual,
    isLoading,
    erro,
    login,
    registrar,
    logout,
    atualizarConfigApi,
    isAuthenticated: !!usuarioAtual,
    isAdmin: !!usuarioAtual?.isAdmin,
    hasValidApi: !!(safeConfigApi.facebookToken && safeConfigApi.isValid),
    automacaoCompleta: !!(safeConfigApi.facebookToken && 
                         safeConfigApi.kiwifyToken &&
                         safeConfigApi.ideogramToken),
    hasIdeogramApi: !!safeConfigApi.ideogramToken,
    hasKiwifyOAuth: !!(safeConfigApi.kiwifyToken || 
                      (safeConfigApi.kiwifyClientId && safeConfigApi.kiwifyClientSecret))
  } as UseAuthReturn
}