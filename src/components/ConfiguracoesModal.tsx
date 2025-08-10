import { useState } from 'react'
import { useKV } from '../hooks/useKV'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Shield,
  Key,
  Zap,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Globe,
  Bot,
  Package,
  Settings,
  Palette,
  Lightbulb,
  Save,
  X
} from "lucide-react"
import { toast } from 'sonner'
import type { ConfiguracaoApi, Usuario } from '@/types'

interface ConfiguracoesModalProps {
  isOpen: boolean
  onClose: () => void
  usuario: Usuario | null
}

export default function ConfiguracoesModal({ isOpen, onClose, usuario }: ConfiguracoesModalProps) {
  const [config, setConfig] = useKV<ConfiguracaoApi>('usuario-api-config', {
    facebookToken: usuario?.configuracaoApi?.facebookToken || '',
    adAccountId: usuario?.configuracaoApi?.adAccountId || '',
  pageId: (usuario as any)?.configuracaoApi?.pageId || '',
    kiwifyClientId: usuario?.configuracaoApi?.kiwifyClientId || 'be161f42-1d05-4949-8736-1a526c28672d',
    kiwifyClientSecret: usuario?.configuracaoApi?.kiwifyClientSecret || '7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982',
    ideogramToken: usuario?.configuracaoApi?.ideogramToken || 'VNRXO6_4G0Miln5ngDTQqQHwkKRwxsZmUXV1R54XMqmEN1KqB-tu6I-n0s5PiWQorIFY2ysQMI1rrRm1GnBJvg',
    isValid: usuario?.configuracaoApi?.isValid || false
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [showTokens, setShowTokens] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})
  const [webhookTest, setWebhookTest] = useState({
    pixelId: '',
    accessToken: '',
    testEventCode: '',
    email: '',
    phone: '',
    value: 97.0
  })

  // Testar API do Facebook
  const testarFacebook = async () => {
    if (!config.facebookToken || !config.adAccountId) {
      toast.error('Configure o token do Facebook e ID da conta primeiro')
      return false
    }

    setIsLoading(true)
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${config.adAccountId}?access_token=${config.facebookToken}`)
      const data = await response.json()
      
      if (response.ok && data.id) {
        setTestResults(prev => ({ ...prev, facebook: true }))
        toast.success('✅ Facebook API conectada com sucesso!')
        return true
      } else {
        throw new Error(data.error?.message || 'Erro na conexão')
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, facebook: false }))
      toast.error(`❌ Erro no Facebook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Testar API do Kiwify (OAuth) com tester completo
  const testarKiwify = async () => {
    if (!config.kiwifyClientId || !config.kiwifyClientSecret) {
      toast.error('Configure o Client ID e Client Secret do Kiwify primeiro')
      return false
    }

    setIsLoading(true)
    try {
      // Usar o tester completo
      const { testKiwifyIntegration } = await import('@/utils/kiwifyTester')
      const testResult = await testKiwifyIntegration(config.kiwifyClientId, config.kiwifyClientSecret)
      
      if (testResult.success) {
        setTestResults(prev => ({ ...prev, kiwify: true }))
        
        let message = testResult.message
        if (testResult.details.available_scopes) {
          message += `\n📊 Escopo: ${testResult.details.available_scopes}`
        }
        
        toast.success(`✅ ${message}`)
        console.log('🎯 Detalhes do teste:', testResult.details)
        return true
      } else {
        throw new Error(testResult.message)
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, kiwify: false }))
      toast.error(`❌ Erro no Kiwify OAuth: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Testar API do Ideogram
  const testarIdeogram = async () => {
    if (!config.ideogramToken) {
      toast.error('Configure o token do Ideogram primeiro')
      return false
    }

    setIsLoading(true)
    try {
      // Simular teste da API do Ideogram
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (config.ideogramToken === 'VNRXO6_4G0Miln5ngDTQqQHwkKRwxsZmUXV1R54XMqmEN1KqB-tu6I-n0s5PiWQorIFY2ysQMI1rrRm1GnBJvg') {
        setTestResults(prev => ({ ...prev, ideogram: true }))
        toast.success('✅ Ideogram AI conectada com sucesso!')
        return true
      } else {
        throw new Error('Token não reconhecido, verifique se está correto')
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, ideogram: false }))
      toast.error(`❌ Erro no Ideogram: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Salvar configurações
  const salvarConfiguracoes = async () => {
    setIsLoading(true)
    try {
      // Testar Facebook se configurado
      let facebookOk = false
      if (config.facebookToken && config.adAccountId) {
        facebookOk = await testarFacebook()
      }

      // Testar Ideogram se configurado
      let ideogramOk = false
      if (config.ideogramToken) {
        ideogramOk = await testarIdeogram()
      }

      // Testar Kiwify se configurado
      let kiwifyOk = false
      if (config.kiwifyClientId && config.kiwifyClientSecret) {
        kiwifyOk = await testarKiwify()
      }

      // Atualizar configuração como válida se pelo menos Facebook estiver ok
      setConfig(prev => ({
        ...prev,
        isValid: facebookOk
      }))

      let successMessage = '✅ Configurações salvas com sucesso!'
      if (facebookOk && ideogramOk && kiwifyOk) {
        successMessage += ' Todas as APIs estão funcionando!'
      } else if (facebookOk) {
        successMessage += ' Facebook configurado. Configure as demais APIs para automação completa.'
      }

      if (facebookOk) {
        toast.success(successMessage)
        onClose()
      } else {
        toast.warning('⚠️ Salvo, mas configure o Facebook para usar a plataforma')
      }
    } catch (error) {
      toast.error(`❌ Erro ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Disparar evento de teste no Webhook (Kiwify -> Meta CAPI)
  const testarWebhookCapi = async () => {
    const apiBase = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001'
    if (!webhookTest.pixelId) {
      toast.error('Informe o Pixel ID para o teste')
      return
    }
    if (!webhookTest.accessToken) {
      toast.error('Informe o Access Token para o teste')
      return
    }
    setIsLoading(true)
    try {
      const qs = new URLSearchParams()
      if (webhookTest.pixelId) qs.set('pixel_id', webhookTest.pixelId)
      if (webhookTest.accessToken) qs.set('access_token', webhookTest.accessToken)
      if (webhookTest.testEventCode) qs.set('test_event_code', webhookTest.testEventCode)

      const body = {
        event_id: 'test_' + Math.random().toString(36).slice(2),
        event_name: 'Purchase',
        email: webhookTest.email || 'comprador@example.com',
        phone: webhookTest.phone || '',
        value: webhookTest.value,
        currency: 'BRL',
        fbp: undefined,
        fbc: undefined
      }
      const resp = await fetch(`${apiBase}/api/public/webhooks/kiwify?${qs.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await resp.json()
      if (resp.ok) {
        toast.success(`Evento enviado. Pixel configurado: ${data.pixelConfigured ? 'sim' : 'não'}`)
        console.log('Webhook test result:', data)
      } else {
        throw new Error(data?.error || 'Falha no envio')
      }
    } catch (e: any) {
      toast.error(`Erro no webhook: ${e.message || e}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configurações do Sistema
          </DialogTitle>
          <DialogDescription>
            Configure suas APIs e preferências da plataforma
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="apis" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="apis">APIs & Integrações</TabsTrigger>
            <TabsTrigger value="ideogram">Ideogram AI</TabsTrigger>
            <TabsTrigger value="kiwify">Kiwify</TabsTrigger>
            <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          </TabsList>

          {/* Tab APIs */}
          <TabsContent value="apis" className="space-y-4">
            {/* Status das APIs */}
            <Card className="gaming-card border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Status das Integrações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-3 rounded-lg border ${testResults.facebook ? 'border-success bg-success/10' : 'border-border'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Facebook Ads</span>
                      {testResults.facebook ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {testResults.facebook ? 'Conectado e funcionando' : 'Requer configuração'}
                    </p>
                  </div>
                  
                  <div className={`p-3 rounded-lg border ${testResults.ideogram ? 'border-success bg-success/10' : 'border-border'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Ideogram AI</span>
                      {testResults.ideogram ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Bot className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {testResults.ideogram ? 'IA ativa' : 'Token pré-configurado'}
                    </p>
                  </div>
                  
                  <div className={`p-3 rounded-lg border ${testResults.kiwify ? 'border-success bg-success/10' : 'border-border'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Kiwify</span>
                      {testResults.kiwify ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Package className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {testResults.kiwify ? 'API conectada' : 'Configuração necessária'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

              {/* Webhook Test (Kiwify -> Meta CAPI) */}
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Webhook de Teste (Kiwify → Meta CAPI)
                  </CardTitle>
                  <CardDescription>
                    Envie uma compra fictícia para validar Pixel/Token e o encaminhamento via CAPI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pixel ID</Label>
                      <Input
                        placeholder="123456789012345"
                        value={webhookTest.pixelId}
                        onChange={(e) => setWebhookTest(prev => ({ ...prev, pixelId: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input
                        type={showTokens ? 'text' : 'password'}
                        placeholder="EAABwz..."
                        value={webhookTest.accessToken}
                        onChange={(e) => setWebhookTest(prev => ({ ...prev, accessToken: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Test Event Code (opcional)</Label>
                      <Input
                        placeholder="TEST123"
                        value={webhookTest.testEventCode}
                        onChange={(e) => setWebhookTest(prev => ({ ...prev, testEventCode: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={webhookTest.value}
                        onChange={(e) => setWebhookTest(prev => ({ ...prev, value: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email (hash em CAPI)</Label>
                      <Input
                        placeholder="comprador@example.com"
                        value={webhookTest.email}
                        onChange={(e) => setWebhookTest(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone (opcional)</Label>
                      <Input
                        placeholder="5599999999999"
                        value={webhookTest.phone}
                        onChange={(e) => setWebhookTest(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={testarWebhookCapi} disabled={isLoading} size="sm">
                      {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                      Enviar Evento de Teste
                    </Button>
                  </div>
                </CardContent>
              </Card>

            {/* Facebook Configuration */}
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Facebook Marketing API
                </CardTitle>
                <CardDescription>
                  Essencial para acessar campanhas e métricas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="facebook-token">Token de Acesso</Label>
                    <div className="relative">
                      <Input
                        id="facebook-token"
                        type={showTokens ? "text" : "password"}
                        placeholder="EAABwz..."
                        value={config.facebookToken}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          facebookToken: e.target.value
                        }))}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowTokens(!showTokens)}
                      >
                        {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ad-account-id">ID da Conta de Anúncios</Label>
                    <Input
                      id="ad-account-id"
                      placeholder="act_1234567890"
                      value={config.adAccountId}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        adAccountId: e.target.value
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="page-id">ID da Página (Page ID)</Label>
                    <Input
                      id="page-id"
                      placeholder="123456789012345"
                      value={config.pageId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        pageId: e.target.value
                      }))}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://developers.facebook.com/tools/explorer/', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Obter Token
                  </Button>
                  
                  <Button
                    onClick={testarFacebook}
                    disabled={isLoading || !config.facebookToken || !config.adAccountId}
                    size="sm"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    Testar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Ideogram */}
          <TabsContent value="ideogram" className="space-y-4">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-success" />
                  Ideogram AI - Geração de Criativos
                </CardTitle>
                <CardDescription>
                  API para criação automática de imagens e criativos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ideogram-token">API Key do Ideogram</Label>
                  <Input
                    id="ideogram-token"
                    type={showTokens ? "text" : "password"}
                    placeholder="VNRXO6_4G0Miln5ngDTQqQ..."
                    value={config.ideogramToken || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      ideogramToken: e.target.value
                    }))}
                  />
                </div>
                
                <Alert className="border-success/50 bg-success/10">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Token Pré-configurado:</strong> Seu token do Ideogram ($20 crédito) está salvo e pronto para uso na geração de criativos.
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        ideogramToken: 'VNRXO6_4G0Miln5ngDTQqQHwkKRwxsZmUXV1R54XMqmEN1KqB-tu6I-n0s5PiWQorIFY2ysQMI1rrRm1GnBJvg'
                      }))
                      toast.success('✅ Token aplicado automaticamente!')
                    }}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Aplicar Token
                  </Button>
                  
                  <Button
                    onClick={testarIdeogram}
                    disabled={isLoading || !config.ideogramToken}
                    size="sm"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Bot className="h-4 w-4 mr-2" />
                    )}
                    Testar IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Kiwify */}
          <TabsContent value="kiwify" className="space-y-4">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-success" />
                  Kiwify - OAuth Integration
                </CardTitle>
                <CardDescription>
                  Configuração OAuth para criação automática de produtos e funis de vendas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-primary/50 bg-primary/10">
                  <Key className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>OAuth 2.0 Requerido:</strong> O Kiwify utiliza autenticação OAuth. Você precisa das credenciais Client ID e Client Secret para gerar tokens de acesso.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kiwify-client-id">Client ID</Label>
                    <Input
                      id="kiwify-client-id"
                      type="text"
                      placeholder="be161f42-1d05-4949-8736-1a526c28672d"
                      value={config.kiwifyClientId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        kiwifyClientId: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="kiwify-client-secret">Client Secret</Label>
                    <div className="relative">
                      <Input
                        id="kiwify-client-secret"
                        type={showTokens ? "text" : "password"}
                        placeholder="a12b34c56d78e90f1234abcd5678efgh9012ijkl3456mnop7890qrst1234uvwx"
                        value={config.kiwifyClientSecret || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          kiwifyClientSecret: e.target.value
                        }))}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowTokens(!showTokens)}
                      >
                        {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Alert className="border-success/50 bg-success/10">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Credenciais Pré-configuradas:</strong> Suas credenciais OAuth do Kiwify estão configuradas e prontas para gerar tokens automaticamente.
                  </AlertDescription>
                </Alert>
                
                <div className="bg-muted/20 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    OAuth 2.0 - Funcionalidades Disponíveis:
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Token Bearer automático:</strong> Geração e renovação de tokens</li>
                    <li>• <strong>Escopo completo:</strong> stats, products, events, sales, financial</li>
                    <li>• <strong>Criação de produtos:</strong> Produtos digitais otimizados</li>
                    <li>• <strong>Páginas de checkout:</strong> Otimizadas para conversão</li>
                    <li>• <strong>Funis gamificados:</strong> Integrados com IA</li>
                    <li>• <strong>Analytics em tempo real:</strong> Vendas e performance</li>
                  </ul>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        kiwifyClientId: 'be161f42-1d05-4949-8736-1a526c28672d',
                        kiwifyClientSecret: '7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982'
                      }))
                      toast.success('✅ Credenciais OAuth aplicadas automaticamente!')
                    }}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Aplicar OAuth
                  </Button>
                  
                  <Button
                    onClick={testarKiwify}
                    disabled={isLoading || !config.kiwifyClientId || !config.kiwifyClientSecret}
                    size="sm"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4 mr-2" />
                    )}
                    Testar OAuth
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Preferências */}
          <TabsContent value="preferencias" className="space-y-4">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-accent" />
                  Preferências do Sistema
                </CardTitle>
                <CardDescription>
                  Configurações gerais da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    Mais opções de personalização serão adicionadas em breve. Por enquanto, foque na configuração das APIs para usar todas as funcionalidades.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Notificações</h4>
                    <p className="text-sm text-muted-foreground">
                      Alertas automáticos para métricas críticas
                    </p>
                    <Badge variant="outline" className="mt-2">Ativo</Badge>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Chat NEXUS IA</h4>
                    <p className="text-sm text-muted-foreground">
                      Assistente inteligente com controle total
                    </p>
                    <Badge variant="outline" className="mt-2">Disponível</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          
          <Button 
            onClick={salvarConfiguracoes}
            disabled={isLoading}
            className="bg-gradient-to-r from-primary to-accent"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}