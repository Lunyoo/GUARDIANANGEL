import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, Zap, Crown } from "lucide-react"
import { useAuth } from '@/hooks/useAuth'

export default function LoginScreen() {
  const { login, registrar, isLoading, erro } = useAuth()
  const [formLogin, setFormLogin] = useState({ email: '', senha: '' })
  const [formRegistro, setFormRegistro] = useState({ email: '', nome: '', senha: '', confirmarSenha: '' })
  const [erroLocal, setErroLocal] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroLocal('')
    
    if (!formLogin.email || !formLogin.senha) {
      setErroLocal('Preencha todos os campos')
      return
    }
    
    const sucesso = await login(formLogin.email, formLogin.senha)
    if (!sucesso) {
      if (formLogin.email === 'alexvinitius@gmail.com') {
        setErroLocal('Senha incorreta. Use: admin123')
      } else {
        setErroLocal('Credenciais inválidas. Use senha: 123456')
      }
    }
  }

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroLocal('')
    
    if (!formRegistro.email || !formRegistro.nome || !formRegistro.senha) {
      setErroLocal('Preencha todos os campos')
      return
    }
    
    if (formRegistro.senha !== formRegistro.confirmarSenha) {
      setErroLocal('As senhas não coincidem')
      return
    }
    
    if (formRegistro.senha.length < 6) {
      setErroLocal('A senha deve ter pelo menos 6 caracteres')
      return
    }
    
    const sucesso = await registrar(formRegistro.email, formRegistro.nome, formRegistro.senha)
    if (!sucesso) {
      setErroLocal('Erro ao criar conta')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex items-center justify-center p-4">
      {/* Efeitos visuais de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-success/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/20 rounded-2xl mr-3">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Nexus Gaming
            </h1>
          </div>
          <p className="text-muted-foreground">
            Plataforma de Inteligência de Marketing Digital
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Transforme seus dados em poder estratégico
          </p>
        </div>

        <Card className="gaming-card">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="text-sm">
                <Shield className="h-4 w-4 mr-2" />
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" className="text-sm">
                <Crown className="h-4 w-4 mr-2" />
                Registrar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-xl">Bem-vindo de volta, Hunter</CardTitle>
                <CardDescription>
                  Faça login para acessar seu dashboard de inteligência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formLogin.email}
                      onChange={(e) => setFormLogin(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-background/50"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha</Label>
                    <Input
                      id="senha"
                      type="password"
                      placeholder="Sua senha"
                      value={formLogin.senha}
                      onChange={(e) => setFormLogin(prev => ({ ...prev, senha: e.target.value }))}
                      className="bg-background/50"
                      disabled={isLoading}
                    />
                  </div>

                  {(erro || erroLocal) && (
                    <Alert className="border-destructive/50 bg-destructive/10">
                      <AlertDescription className="text-destructive">
                        {erro || erroLocal}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Entrar no Sistema
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    <Crown className="h-3 w-3 inline mr-1 text-accent" />
                    <strong>Admin:</strong> alexvinitius@gmail.com (senha: admin123)
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    <strong>Outros usuários:</strong> qualquer@email.com (senha: 123456)
                  </p>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="register">
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-xl">Junte-se à Elite</CardTitle>
                <CardDescription>
                  Crie sua conta e comece sua jornada rumo ao domínio digital
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegistro} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Seu nome"
                      value={formRegistro.nome}
                      onChange={(e) => setFormRegistro(prev => ({ ...prev, nome: e.target.value }))}
                      className="bg-background/50"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-reg">Email</Label>
                    <Input
                      id="email-reg"
                      type="email"
                      placeholder="seu@email.com"
                      value={formRegistro.email}
                      onChange={(e) => setFormRegistro(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-background/50"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="senha-reg">Senha</Label>
                    <Input
                      id="senha-reg"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={formRegistro.senha}
                      onChange={(e) => setFormRegistro(prev => ({ ...prev, senha: e.target.value }))}
                      className="bg-background/50"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmar-senha">Confirmar Senha</Label>
                    <Input
                      id="confirmar-senha"
                      type="password"
                      placeholder="Confirme sua senha"
                      value={formRegistro.confirmarSenha}
                      onChange={(e) => setFormRegistro(prev => ({ ...prev, confirmarSenha: e.target.value }))}
                      className="bg-background/50"
                      disabled={isLoading}
                    />
                  </div>

                  {(erro || erroLocal) && (
                    <Alert className="border-destructive/50 bg-destructive/10">
                      <AlertDescription className="text-destructive">
                        {erro || erroLocal}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-2" />
                        Criar Conta
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos termos de uso
          </p>
        </div>
      </div>
    </div>
  )
}