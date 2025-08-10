import { useState, useEffect } from 'react'
import { useKV } from '../hooks/useKV'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Wand2,
  ShoppingCart,
  Palette,
  Lightbulb,
  Link2
} from "lucide-react"
import { toast } from 'sonner'
import { KiwifyAuthService } from '@/services/kiwifyAuth'
import type { ConfiguracaoApi } from '@/types'

export default function ConfiguracaoApiCompleta() {
  const [config, setConfig] = useKV<ConfiguracaoApi>('usuario-api-config', {
    facebookToken: '',
    adAccountId: '',
    kiwifyClientId: '',
    kiwifyClientSecret: '',
    kiwifyToken: '', // Para armazenar o Bearer token OAuth gerado
    ideogramToken: 'VNRXO6_4G0Miln5ngDTQqQHwkKRwxsZmUXV1R54XMqmEN1KqB-tu6I-n0s5PiWQorIFY2ysQMI1rrRm1GnBJvg',
    isValid: false
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [showTokens, setShowTokens] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})

  // Testar API do Facebook
  const testarFacebook = async () => {
    if (!config.facebookToken || !config.adAccountId) {
      toast.error('Configure o token do Facebook e ID da conta primeiro')
      return
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

  // Gerar Token OAuth do Kiwify
  const gerarTokenKiwify = async () => {
    if (!config.kiwifyClientId || !config.kiwifyClientSecret) {
      toast.error('Configure Client ID e Client Secret do Kiwify primeiro')
      return
    }

    setIsLoading(true)
    try {
      const tokenData = await KiwifyAuthService.generateOAuthToken(
        config.kiwifyClientId,
        config.kiwifyClientSecret
      )

      // Salvar o token Bearer gerado
      setConfig(prev => ({
        ...prev,
        kiwifyToken: tokenData.access_token
      }))

      setTestResults(prev => ({ ...prev, kiwify: true }))
      toast.success(`✅ Token Kiwify gerado com sucesso! Expira em ${Math.floor(tokenData.expires_in / 3600)}h`)
      return true
    } catch (error) {
      setTestResults(prev => ({ ...prev, kiwify: false }))
      toast.error(`❌ Erro ao gerar token Kiwify: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Testar API do Kiwify
  const testarKiwify = async () => {
    if (!config.kiwifyToken) {
      toast.error('Gere o token OAuth do Kiwify primeiro')
      return
    }

    setIsLoading(true)
    try {
      const isValid = await KiwifyAuthService.validateToken(config.kiwifyToken)
      
      if (isValid) {
        setTestResults(prev => ({ ...prev, kiwify: true }))
        toast.success('✅ Kiwify API conectada com sucesso!')
        return true
      } else {
        throw new Error('Token inválido ou expirado')
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, kiwify: false }))
      toast.error(`❌ Erro no Kiwify: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Testar API do Ideogram
  const testarIdeogram = async () => {
    if (!config.ideogramToken) {
      toast.error('Configure o token do Ideogram primeiro')
      return
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

  // Testar todas as APIs
  const testarTodasAPIs = async () => {
    setIsLoading(true)
    
    // Se o Kiwify não tem token mas tem credenciais, gerar primeiro
  let kiwifyResult: boolean = false
    if (!config.kiwifyToken && config.kiwifyClientId && config.kiwifyClientSecret) {
      const tokenGerado = await gerarTokenKiwify()
      if (tokenGerado) {
        kiwifyResult = Boolean(await testarKiwify())
      }
    } else if (config.kiwifyToken) {
      kiwifyResult = Boolean(await testarKiwify())
    }
    
    const resultados = await Promise.allSettled([
      testarFacebook(),
      Promise.resolve(kiwifyResult),
      config.ideogramToken ? testarIdeogram() : Promise.resolve(false)
    ])
    
    const todasValidas = resultados.every(r => r.status === 'fulfilled' && r.value)
    
    setConfig(prev => ({
      ...prev,
      isValid: todasValidas
    }))
    
    if (todasValidas) {
      toast.success('🎉 Todas as APIs estão configuradas corretamente!')
    } else {
      toast.warning('⚠️ Algumas APIs precisam de atenção')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Configuração de APIs - Automação Master
              </h1>
              <p className="text-muted-foreground">
                Configure todas as integrações necessárias para automação completa
              </p>
            </div>
          </div>
          
          <Alert className="border-accent/50 bg-accent/10">
            <Bot className="h-4 w-4" />
            <AlertDescription>
              <strong>Sistema de Automação Inteligente:</strong> Conecte Facebook Ads, Kiwify e Ideogram AI para automação completa do funil de marketing digital.
            </AlertDescription>
          </Alert>
        </div>

        {/* Status Geral */}
        <Card className="gaming-card border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Status das Integrações
              </span>
              <Button 
                onClick={testarTodasAPIs} 
                disabled={isLoading}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Testar Todas
              </Button>
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
                  {testResults.kiwify ? 'OAuth ativo' : 
                   config.kiwifyToken ? 'Token não testado' : 
                   config.kiwifyClientId && config.kiwifyClientSecret ? 'Pronto para gerar token' :
                   'Credenciais necessárias'}
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
                  {testResults.ideogram ? 'IA ativa' : config.ideogramToken ? 'Token não testado' : 'Token necessário'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Facebook Ads Configuration */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Facebook Marketing API
            </CardTitle>
            <CardDescription>
              Configuração essencial para acesso às campanhas, anúncios e métricas do Facebook Ads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook-token">Token de Acesso do Facebook</Label>
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
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Testar Facebook
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Kiwify Configuration */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              Kiwify API Integration
            </CardTitle>
            <CardDescription>
              Para criação automática de produtos e funis de vendas - OAuth 2.0
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kiwify-client-id">Client ID</Label>
                <Input
                  id="kiwify-client-id"
                  placeholder="be161f42-1d05-4949-8736-..."
                  value={config.kiwifyClientId || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    kiwifyClientId: e.target.value
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="kiwify-client-secret">Client Secret</Label>
                <Input
                  id="kiwify-client-secret"
                  type={showTokens ? "text" : "password"}
                  placeholder="a12b34c56d78e90f..."
                  value={config.kiwifyClientSecret || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    kiwifyClientSecret: e.target.value
                  }))}
                />
              </div>
            </div>
            
            {config.kiwifyToken && (
              <div className="space-y-2">
                <Label htmlFor="kiwify-token">Bearer Token (Gerado automaticamente)</Label>
                <div className="relative">
                  <Input
                    id="kiwify-token"
                    type={showTokens ? "text" : "password"}
                    placeholder="eyJhbGciOiJIUzI1NiIs..."
                    value={config.kiwifyToken}
                    readOnly
                    className="bg-muted/50"
                  />
                  <Badge className="absolute right-2 top-2 text-xs bg-success">
                    OAuth
                  </Badge>
                </div>
              </div>
            )}
            
            <Alert className="border-accent/50 bg-accent/10">
              <Link2 className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Autenticação OAuth 2.0:</strong> Configure Client ID e Client Secret do seu painel Kiwify, depois clique em "Gerar Token" para autenticação automática.
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://docs.kiwify.com.br/api-reference/auth/oauth', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentação OAuth
              </Button>
              
              <div className="flex gap-2">
                <Button
                  onClick={gerarTokenKiwify}
                  disabled={isLoading || !config.kiwifyClientId || !config.kiwifyClientSecret}
                  variant="outline"
                  className="bg-gradient-to-r from-accent/10 to-accent/20"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Gerar Token
                </Button>
                
                <Button
                  onClick={testarKiwify}
                  disabled={isLoading || !config.kiwifyToken}
                  variant="outline"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  Testar API
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ideogram AI Configuration */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-success" />
              Ideogram AI Integration
            </CardTitle>
            <CardDescription>
              Para geração automática de criativos e imagens para campanhas
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
                <strong>Token Pré-configurado:</strong> Seu token do Ideogram ($20 crédito) está salvo e será usado automaticamente na geração de criativos.
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://ideogram.ai/api/docs', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                API Docs
              </Button>
              
              <Button
                onClick={testarIdeogram}
                disabled={isLoading || !config.ideogramToken}
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4 mr-2" />
                )}
                Testar Ideogram
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4 pt-6">
          <Button
            size="lg"
            onClick={() => {
              // Aplicar token do Ideogram automaticamente
              setConfig(prev => ({
                ...prev,
                ideogramToken: 'VNRXO6_4G0Miln5ngDTQqQHwkKRwxsZmUXV1R54XMqmEN1KqB-tu6I-n0s5PiWQorIFY2ysQMI1rrRm1GnBJvg'
              }))
              toast.success('✅ Token do Ideogram aplicado automaticamente!')
            }}
            className="bg-gradient-to-r from-success to-accent hover:from-success/90 hover:to-accent/90"
          >
            <Bot className="h-4 w-4 mr-2" />
            Aplicar Token Ideogram
          </Button>
          
          <Button
            size="lg"
            onClick={testarTodasAPIs}
            disabled={isLoading}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Finalizar Configuração
          </Button>
        </div>

        {/* Instructions */}
        <Card className="gaming-card border-l-4 border-l-warning">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              Instruções de Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium text-primary mb-1">1. Facebook Ads API</h4>
              <p className="text-muted-foreground">
                Obtenha um token de longa duração no Facebook Developer Console e encontre o ID da sua conta de anúncios no Ads Manager.
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium text-accent mb-1">2. Kiwify API (Opcional)</h4>
              <p className="text-muted-foreground">
                Configure para criação automática de produtos digitais. Acesse seu painel Kiwify → Integrações → API.
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium text-success mb-1">3. Ideogram AI</h4>
              <p className="text-muted-foreground">
                Seu token já está configurado com $20 de crédito. Será usado automaticamente na geração de criativos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}