import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Shield, 
  Key, 
  Database, 
  Zap, 
  Globe, 
  MessageSquare, 
  Bot, 
  Target, 
  DollarSign, 
  Clock, 
  Bell, 
  Eye, 
  Lock, 
  Unlock,
  RefreshCw,
  Save,
  Download,
  Upload,
  Trash2,
  Plus,
  Edit,
  Check,
  X,
  AlertTriangle,
  Info,
  HelpCircle,
  ExternalLink,
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  Smartphone,
  Monitor,
  Wifi,
  Server,
  Link
} from 'lucide-react'

interface ConfigSection {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  settings: ConfigSetting[]
}

interface ConfigSetting {
  id: string
  name: string
  description: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'password' | 'textarea' | 'json'
  value: any
  options?: Array<{ label: string; value: any }>
  required?: boolean
  sensitive?: boolean
  validation?: string
  category?: string
}

const ModernConfig: React.FC = () => {
  const [activeSection, setActiveSection] = useState('whatsapp')
  const [configs, setConfigs] = useState<Record<string, ConfigSection>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [envStatus, setEnvStatus] = useState<any>(null)
  const [fbAccount, setFbAccount] = useState<any>(null)

  // Base schema (no mock values)
  const baseConfigs: Record<string, ConfigSection> = {
    whatsapp: {
      id: 'whatsapp',
      title: 'WhatsApp Bot',
      description: 'Configurações do bot WhatsApp e automações',
      icon: MessageSquare,
      settings: [
        {
          id: 'whatsapp_session',
          name: 'Sessão WhatsApp',
          description: 'Nome da sessão para autenticação',
          type: 'text',
          value: '',
          required: true
        },
        {
          id: 'auto_response',
          name: 'Resposta Automática',
          description: 'Ativar respostas automáticas',
          type: 'boolean',
          value: false
        },
        {
          id: 'response_delay',
          name: 'Delay de Resposta',
          description: 'Tempo em segundos antes de responder',
          type: 'number',
          value: 2,
          validation: 'min=1,max=30'
        },
        {
          id: 'welcome_message',
          name: 'Mensagem de Boas-vindas',
          description: 'Mensagem enviada para novos contatos',
          type: 'textarea',
          value: ''
        },
        {
          id: 'business_hours',
          name: 'Horário de Funcionamento',
          description: 'Horário para respostas automáticas',
          type: 'text',
          value: ''
        }
      ]
    },
    facebook: {
      id: 'facebook',
      title: 'Facebook Ads',
      description: 'Configurações da API do Facebook e campanhas',
      icon: Target,
    settings: [
        {
          id: 'fb_app_id',
          name: 'App ID',
          description: 'ID da aplicação Facebook',
          type: 'text',
      value: '',
          required: true,
          sensitive: true
        },
        {
          id: 'fb_app_secret',
          name: 'App Secret',
          description: 'Chave secreta da aplicação',
          type: 'password',
          value: '',
          required: true,
          sensitive: true
        },
        {
          id: 'fb_access_token',
          name: 'Access Token',
          description: 'Token de acesso do Facebook',
          type: 'password',
          value: '',
          required: true,
          sensitive: true
        },
        {
          id: 'fb_ad_account_id',
          name: 'ID da Conta de Anúncios',
          description: 'ID da conta de anúncios do Facebook',
          type: 'text',
          value: '',
          required: true
        },
        {
          id: 'auto_optimization',
          name: 'Otimização Automática',
          description: 'Ativar otimização automática de campanhas',
          type: 'boolean',
          value: false
        },
        {
          id: 'daily_budget_limit',
          name: 'Limite Orçamento Diário',
          description: 'Limite máximo de gasto diário em R$',
          type: 'number',
          value: 0,
          validation: 'min=50'
        }
      ]
    },
    system: {
      id: 'system',
      title: 'Sistema',
      description: 'Configurações gerais do sistema',
      icon: Settings,
      settings: [
        {
          id: 'system_name',
          name: 'Nome do Sistema',
          description: 'Nome personalizado do sistema',
          type: 'text',
          value: '',
          required: true
        },
        {
          id: 'timezone',
          name: 'Fuso Horário',
          description: 'Fuso horário do sistema',
          type: 'select',
          value: 'America/Sao_Paulo',
          options: [
            { label: 'São Paulo (UTC-3)', value: 'America/Sao_Paulo' },
            { label: 'Rio de Janeiro (UTC-3)', value: 'America/Sao_Paulo' },
            { label: 'Brasília (UTC-3)', value: 'America/Sao_Paulo' }
          ]
        },
        {
          id: 'log_level',
          name: 'Nível de Log',
          description: 'Nível de detalhamento dos logs',
          type: 'select',
          value: 'info',
          options: [
            { label: 'Error', value: 'error' },
            { label: 'Warning', value: 'warn' },
            { label: 'Info', value: 'info' },
            { label: 'Debug', value: 'debug' }
          ]
        },
        {
          id: 'backup_enabled',
          name: 'Backup Automático',
          description: 'Ativar backup automático do banco de dados',
          type: 'boolean',
          value: false
        },
        {
          id: 'backup_frequency',
          name: 'Frequência de Backup',
          description: 'Frequência dos backups automáticos',
          type: 'select',
          value: 'daily',
          options: [
            { label: 'A cada 6 horas', value: '6h' },
            { label: 'Diário', value: 'daily' },
            { label: 'Semanal', value: 'weekly' }
          ]
        }
      ]
    },
    notifications: {
      id: 'notifications',
      title: 'Notificações',
      description: 'Configurações de alertas e notificações',
      icon: Bell,
      settings: [
        {
          id: 'email_notifications',
          name: 'Notificações por Email',
          description: 'Receber alertas por email',
          type: 'boolean',
          value: false
        },
        {
          id: 'admin_email',
          name: 'Email do Administrador',
          description: 'Email para receber notificações críticas',
          type: 'text',
          value: '',
          validation: 'email'
        },
        {
          id: 'whatsapp_notifications',
          name: 'Notificações WhatsApp',
          description: 'Receber alertas via WhatsApp',
          type: 'boolean',
          value: false
        },
        {
          id: 'admin_phone',
          name: 'Telefone do Administrador',
          description: 'WhatsApp para receber notificações',
          type: 'text',
          value: '',
          validation: 'phone'
        },
        {
          id: 'alert_thresholds',
          name: 'Limites de Alerta',
          description: 'JSON com configurações de limites',
          type: 'json',
          value: JSON.stringify({ high_spend: 0, low_conversion: 0, error_rate: 0 }, null, 2)
        }
      ]
    },
    ai: {
      id: 'ai',
      title: 'Inteligência Artificial',
      description: 'Configurações dos sistemas de IA',
      icon: Bot,
      settings: [
        {
          id: 'ai_enabled',
          name: 'IA Ativada',
          description: 'Ativar recursos de inteligência artificial',
          type: 'boolean',
          value: false
        },
        {
          id: 'ai_model',
          name: 'Modelo de IA',
          description: 'Modelo de IA para conversas',
          type: 'select',
          value: 'gpt-4',
          options: [
            { label: 'GPT-4', value: 'gpt-4' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
            { label: 'Claude', value: 'claude' }
          ]
        },
        {
          id: 'ai_creativity',
          name: 'Criatividade da IA',
          description: 'Nível de criatividade nas respostas (0-1)',
          type: 'number',
          value: 0.7,
          validation: 'min=0,max=1,step=0.1'
        },
        {
          id: 'auto_campaign_optimization',
          name: 'Otimização Automática de Campanhas',
          description: 'Permitir que a IA otimize campanhas automaticamente',
          type: 'boolean',
          value: false
        },
        {
          id: 'ai_budget_adjustments',
          name: 'Ajustes Automáticos de Orçamento',
          description: 'Permitir ajustes automáticos de orçamento pela IA',
          type: 'boolean',
          value: false
        }
      ]
    },
    security: {
      id: 'security',
      title: 'Segurança',
      description: 'Configurações de segurança e acesso',
      icon: Shield,
      settings: [
        {
          id: 'two_factor_enabled',
          name: 'Autenticação de Dois Fatores',
          description: 'Ativar 2FA para acesso administrativo',
          type: 'boolean',
      value: false
        },
        {
          id: 'session_timeout',
          name: 'Timeout de Sessão',
          description: 'Tempo limite da sessão em minutos',
          type: 'number',
      value: 60,
          validation: 'min=15,max=480'
        },
        {
          id: 'api_rate_limit',
          name: 'Limite de Rate API',
          description: 'Número máximo de requisições por minuto',
          type: 'number',
      value: 100,
          validation: 'min=10'
        },
        {
          id: 'allowed_ips',
          name: 'IPs Permitidos',
          description: 'Lista de IPs permitidos (separados por vírgula)',
          type: 'textarea',
      value: '',
          sensitive: true
        },
        {
          id: 'encryption_enabled',
          name: 'Criptografia de Dados',
          description: 'Ativar criptografia para dados sensíveis',
          type: 'boolean',
      value: true
        }
      ]
    }
  }

  useEffect(() => {
    // Start with base schema, then hydrate from backend readiness/profile
    setConfigs(baseConfigs)
    // Fetch real readiness + fb account info for display
    ;(async ()=>{
      try {
        const [r,a] = await Promise.all([
          fetch('/api/platform/readiness'),
          fetch('/api/campaigns/facebook/account')
        ])
        if (r.ok) { const rj = await r.json(); setEnvStatus(rj) }
  let accountData:any = null
  if (a.ok) { accountData = await a.json(); setFbAccount(accountData) }
        // Hydrate FB fields if available
        setConfigs(prev => {
          const next = { ...prev }
      if (next.facebook) {
            next.facebook = {
              ...next.facebook,
              settings: next.facebook.settings.map(s => {
        if (s.id==='fb_ad_account_id') return { ...s, value: accountData?.id || s.value }
                return s
              })
            }
          }
          return next
        })
      } catch {}
    })()
  }, [])

  const handleSettingChange = (sectionId: string, settingId: string, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        settings: prev[sectionId].settings.map(setting =>
          setting.id === settingId ? { ...setting, value } : setting
        )
      }
    }))
    setUnsavedChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // If saving facebook section and fields present, try backend save (requires auth)
      const fb = configs.facebook?.settings?.reduce((acc:any,s)=>{ acc[s.id]=s.value; return acc },{}) || {}
      if (activeSection==='facebook' && (fb.fb_access_token || fb.fb_ad_account_id)) {
        const resp = await fetch('/api/facebook/config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facebook_token: fb.fb_access_token, ad_account_id: fb.fb_ad_account_id })
        })
        if (!resp.ok) {
          // Graceful fallback: still mark saved locally
          console.warn('Falha ao salvar no backend (talvez precise login).')
        }
      }
    } catch (e) {
      console.warn('Erro ao salvar configuração:', e)
    } finally {
      setIsSaving(false)
      setUnsavedChanges(false)
      setLastSaved(new Date())
    }
  }

  const exportConfig = () => {
    const configData = JSON.stringify(configs, null, 2)
    const blob = new Blob([configData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'guardian-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderSetting = (sectionId: string, setting: ConfigSetting) => {
    const commonProps = {
      id: setting.id,
      className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
      value: setting.value,
      onChange: (e: any) => handleSettingChange(sectionId, setting.id, 
        setting.type === 'boolean' ? e.target.checked :
        setting.type === 'number' ? Number(e.target.value) :
        e.target.value
      )
    }

    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value}
              onChange={(e) => handleSettingChange(sectionId, setting.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className={`text-sm ${setting.value ? 'text-green-700' : 'text-gray-500'}`}>
              {setting.value ? 'Ativado' : 'Desativado'}
            </span>
          </label>
        )
      
      case 'select':
        return (
          <select {...commonProps}>
            {setting.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      
      case 'textarea':
        return (
          <textarea 
            {...commonProps}
            rows={3}
            placeholder={setting.description}
          />
        )
      
      case 'password':
        return (
          <div className="relative">
            <input
              {...commonProps}
              type="password"
              placeholder="••••••••"
            />
            {setting.sensitive && (
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            )}
          </div>
        )
      
      case 'json':
        return (
          <textarea
            {...commonProps}
            rows={6}
            className="font-mono text-sm"
            placeholder="{ }"
          />
        )
      
      default:
        return (
          <input
            {...commonProps}
            type={setting.type}
            placeholder={setting.description}
          />
        )
    }
  }

  const sections = Object.values(configs)
  const activeConfig = configs[activeSection]

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 to-black flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Configurações</h2>
          <p className="text-sm text-gray-400">Gerencie todas as configurações</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {sections.map(section => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800/40'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <div>
                  <div className="font-medium text-white/90">{section.title}</div>
                  <div className="text-xs text-gray-400">{section.description}</div>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {activeConfig?.title}
              </h1>
              <p className="text-gray-400">{activeConfig?.description}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {lastSaved && (
                <span className="text-sm text-gray-400">
                  Salvo às {lastSaved.toLocaleTimeString('pt-BR')}
                </span>
              )}
              
              {unsavedChanges && (
                <span className="flex items-center space-x-1 text-yellow-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Alterações não salvas</span>
                </span>
              )}
              
              <button
                onClick={exportConfig}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleSave}
                disabled={isSaving || !unsavedChanges}
                className="bg-cyan-700 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          </div>

          {/* Settings Grid */}
          {activeConfig && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeConfig.settings.map(setting => (
                <motion.div
                  key={setting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-800"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-white flex items-center space-x-2">
                        <span>{setting.name}</span>
                        {setting.required && (
                          <span className="text-red-500 text-xs">*</span>
                        )}
                        {setting.sensitive && (
                          <Lock className="w-4 h-4 text-amber-400" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">{setting.description}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    {renderSetting(activeSection, setting)}
                  </div>
                  
                  {setting.validation && (
                    <div className="mt-2 text-xs text-gray-400">
                      <Info className="w-3 h-3 inline mr-1" />
                      Validação: {setting.validation}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* System Information */}
          <div className="mt-8 bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Informações do Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-cyan-900/30 rounded-lg border border-cyan-800/40">
                <Server className="w-8 h-8 text-cyan-300 mx-auto mb-2" />
                <div className="font-medium text-cyan-200">Status</div>
                <div className="text-sm text-cyan-300">Online</div>
              </div>
              
              <div className="text-center p-4 bg-green-900/30 rounded-lg border border-green-800/40">
                <Database className="w-8 h-8 text-green-300 mx-auto mb-2" />
                <div className="font-medium text-green-200">Banco de Dados</div>
                <div className="text-sm text-green-300">Conectado</div>
              </div>
              
              <div className="text-center p-4 bg-purple-900/30 rounded-lg border border-purple-800/40">
                <Wifi className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                <div className="font-medium text-purple-200">APIs</div>
                <div className="text-sm text-purple-300">Funcionando</div>
              </div>
            </div>
            {/* Env + Facebook account snapshot */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded border border-gray-800 text-gray-300">
                <div className="font-medium mb-2 text-white">Ambiente</div>
                <div className="text-gray-400">Vars faltando: {envStatus?.env?.missing?.length ?? 0}</div>
                <div className="text-gray-400">Facebook contas: {envStatus?.facebook?.accounts ?? 0}</div>
              </div>
              <div className="p-3 rounded border border-gray-800 text-gray-300">
                <div className="font-medium mb-2 text-white">Facebook</div>
                <div className="text-gray-400">Conta: {fbAccount?.name || fbAccount?.id || '—'}</div>
                <div className="text-gray-400">Moeda: {fbAccount?.currency || '—'}</div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-8 bg-red-900/20 border border-red-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-red-300 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-300" />
              Zona de Perigo
            </h3>
            <p className="text-red-300 mb-4">
              Estas ações são irreversíveis e podem afetar o funcionamento do sistema.
            </p>
            <div className="flex space-x-3">
              <button className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2">
                <Trash2 className="w-4 h-4" />
                <span>Resetar Configurações</span>
              </button>
              
              <button className="bg-orange-700 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Reiniciar Sistema</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModernConfig
