import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Key, 
  Link, 
  Info,
  ExternalLink
} from "lucide-react"
import { useAuth } from '@/hooks/useAuth'

export default function ConfiguracaoApi() {
  const { usuarioAtual, atualizarConfigApi } = useAuth()
  const [formConfig, setFormConfig] = useState({
    facebookToken: usuarioAtual?.configuracaoApi?.facebookToken || '',
    adAccountId: usuarioAtual?.configuracaoApi?.adAccountId || ''
  })
  const [isValidando, setIsValidando] = useState(false)
  const [resultadoValidacao, setResultadoValidacao] = useState<{
    sucesso: boolean
    mensagem: string
  } | null>(null)

  const handleValidarApi = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formConfig.facebookToken || !formConfig.adAccountId) {
      setResultadoValidacao({
        sucesso: false,
        mensagem: 'Preencha todos os campos obrigatórios'
      })
      return
    }
    
    setIsValidando(true)
    setResultadoValidacao(null)
    
    try {
      const sucesso = await atualizarConfigApi({
        facebookToken: formConfig.facebookToken,
        adAccountId: formConfig.adAccountId
      })
      
      if (sucesso) {
        setResultadoValidacao({
          sucesso: true,
          mensagem: 'Configuração validada com sucesso! Você pode começar a usar a plataforma.'
        })
      } else {
        setResultadoValidacao({
          sucesso: false,
          mensagem: 'Token inválido ou conta inacessível. Verifique as credenciais.'
        })
      }
    } catch (error) {
      setResultadoValidacao({
        sucesso: false,
        mensagem: 'Erro ao validar configuração. Tente novamente.'
      })
    } finally {
      setIsValidando(false)
    }
  }

  const configValida = usuarioAtual?.configuracaoApi?.isValid
  const ultimaValidacao = usuarioAtual?.configuracaoApi?.ultimaValidacao

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Configuração de API
          </h1>
          <p className="text-muted-foreground">
            Configure suas credenciais do Facebook para começar a usar a plataforma
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status da Configuração Atual */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {configValida ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                Status da Integração
              </CardTitle>
              <CardDescription>
                Estado atual da sua configuração de API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Facebook Marketing API</span>
                <Badge variant={configValida ? "default" : "destructive"}>
                  {configValida ? 'Conectado' : 'Não Configurado'}
                </Badge>
              </div>
              
              {ultimaValidacao && (
                <div className="text-xs text-muted-foreground">
                  Última validação: {new Date(ultimaValidacao).toLocaleString('pt-BR')}
                </div>
              )}
              
              {!configValida && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Configure suas credenciais para começar a acessar dados de suas campanhas em tempo real.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Formulário de Configuração */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Credenciais de Acesso
              </CardTitle>
              <CardDescription>
                Insira suas credenciais do Facebook Marketing API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleValidarApi} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook-token">
                    Token de Acesso do Facebook *
                  </Label>
                  <Input
                    id="facebook-token"
                    type="password"
                    placeholder="EAAY..."
                    value={formConfig.facebookToken}
                    onChange={(e) => setFormConfig(prev => ({ 
                      ...prev, 
                      facebookToken: e.target.value 
                    }))}
                    className="bg-background/50 font-mono text-sm"
                    disabled={isValidando}
                  />
                  <p className="text-xs text-muted-foreground">
                    Seu token de acesso de longa duração do Facebook
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-account-id">
                    ID da Conta de Anúncios *
                  </Label>
                  <Input
                    id="ad-account-id"
                    type="text"
                    placeholder="act_1234567890"
                    value={formConfig.adAccountId}
                    onChange={(e) => setFormConfig(prev => ({ 
                      ...prev, 
                      adAccountId: e.target.value 
                    }))}
                    className="bg-background/50 font-mono text-sm"
                    disabled={isValidando}
                  />
                  <p className="text-xs text-muted-foreground">
                    ID da sua conta de anúncios (formato: act_xxxxxxxxx)
                  </p>
                </div>

                {resultadoValidacao && (
                  <Alert className={`border-${resultadoValidacao.sucesso ? 'success' : 'destructive'}/50 bg-${resultadoValidacao.sucesso ? 'success' : 'destructive'}/10`}>
                    <AlertDescription className={`text-${resultadoValidacao.sucesso ? 'success' : 'destructive'}`}>
                      {resultadoValidacao.mensagem}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  disabled={isValidando}
                >
                  {isValidando ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Validar e Salvar
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Instruções */}
          <Card className="gaming-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Como obter suas credenciais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Token de Acesso
                  </h4>
                  <ol className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="font-medium text-primary">1.</span>
                      Acesse o <a 
                        href="https://developers.facebook.com/tools/explorer/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Graph API Explorer
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-primary">2.</span>
                      Selecione seu app e gere um token de acesso
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-primary">3.</span>
                      Certifique-se de que tem as permissões: ads_read, ads_management
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-primary">4.</span>
                      Use a ferramenta de depuração para verificar a validade
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    ID da Conta de Anúncios
                  </h4>
                  <ol className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="font-medium text-primary">1.</span>
                      Acesse o <a 
                        href="https://business.facebook.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Business Manager
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-primary">2.</span>
                      Vá em Configurações da Empresa → Contas de Anúncios
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-primary">3.</span>
                      Clique na conta desejada para ver o ID
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-primary">4.</span>
                      O formato deve ser: act_1234567890
                    </li>
                  </ol>
                </div>
              </div>

              <Separator />

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Segurança:</strong> Suas credenciais são armazenadas localmente e criptografadas. 
                  Nunca compartilhamos seus dados com terceiros. Para usuários admin, as credenciais 
                  já estão pré-configuradas com base nas variáveis de ambiente.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}