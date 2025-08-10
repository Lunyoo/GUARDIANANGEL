/**
 * Componente para exibir e gerenciar produtos criados no Kiwify
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useKV } from '../hooks/useKV'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Package,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Eye,
  ShoppingCart,
  Activity,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  BarChart3
} from "lucide-react"
import { toast } from 'sonner'
import { formatCurrency } from '@/utils/currencyDetector'
import type { KiwifyProduct } from '@/services/kiwifyService'

export default function ProdutosKiwify() {
  const { usuarioAtual } = useAuth()
  const [produtos, setProdutos] = useKV<KiwifyProduct[]>('kiwify-produtos', [])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<Record<string, any>>({})

  // Carregar produtos do Kiwify
  const carregarProdutos = async () => {
    if (!usuarioAtual?.configuracaoApi?.kiwifyToken) {
      toast.error('Configure sua API do Kiwify primeiro')
      return
    }

    setIsLoading(true)
    try {
      const { kiwifyService } = await import('@/services/kiwifyService')
      kiwifyService.setApiKey(usuarioAtual.configuracaoApi.kiwifyToken)
      
      console.log('📦 Carregando produtos do Kiwify...')
      const produtosKiwify = await kiwifyService.listProducts()
      
      setProdutos(produtosKiwify)
      
      // Carregar estatísticas para cada produto
      const statsPromises = produtosKiwify.map(async (produto) => {
        try {
          const produtoStats = await kiwifyService.getProductStats(produto.id)
          return { [produto.id]: produtoStats }
        } catch (error) {
          console.warn(`Erro ao carregar stats do produto ${produto.id}:`, error)
          return { [produto.id]: { views: 0, sales: 0, revenue: 0, conversion_rate: 0 } }
        }
      })
      
      const allStats = await Promise.all(statsPromises)
      const statsObject = allStats.reduce((acc, stat) => ({ ...acc, ...stat }), {})
      setStats(statsObject)
      
      toast.success(`✅ ${produtosKiwify.length} produtos carregados`)
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      toast.error(`❌ Erro ao carregar produtos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar produtos ao montar o componente
  useEffect(() => {
    if (usuarioAtual?.configuracaoApi?.kiwifyToken) {
      carregarProdutos()
    }
  }, [usuarioAtual])

  if (!usuarioAtual?.configuracaoApi?.kiwifyToken) {
    return (
      <Alert className="border-warning/50 bg-warning/10">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configure sua API do Kiwify nas configurações para ver seus produtos criados.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Produtos no Kiwify
          </h3>
          <p className="text-sm text-muted-foreground">
            Produtos digitais criados automaticamente pela plataforma
          </p>
        </div>
        
        <Button 
          onClick={carregarProdutos} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      {/* Lista de Produtos */}
      <div className="space-y-4">
        {produtos.length === 0 && !isLoading ? (
          <Card className="gaming-card">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h4 className="font-medium mb-2">Nenhum produto encontrado</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Execute a Automação Master para criar produtos automaticamente
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {produtos.map((produto) => (
                <Card key={produto.id} className="gaming-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base line-clamp-1">
                          {produto.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          ID: {produto.id}
                        </CardDescription>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={produto.status === 'active' ? 'default' : 'secondary'}>
                          {produto.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline" className="text-accent">
                          {formatCurrency(produto.price)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Descrição */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {produto.description}
                    </p>
                    
                    {/* Estatísticas */}
                    {stats[produto.id] && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/20 rounded-lg">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Eye className="h-3 w-3 text-primary" />
                            <span className="text-xs text-muted-foreground">Views</span>
                          </div>
                          <div className="font-semibold text-sm">
                            {stats[produto.id].views.toLocaleString('pt-BR')}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <ShoppingCart className="h-3 w-3 text-success" />
                            <span className="text-xs text-muted-foreground">Vendas</span>
                          </div>
                          <div className="font-semibold text-sm">
                            {stats[produto.id].sales}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <DollarSign className="h-3 w-3 text-accent" />
                            <span className="text-xs text-muted-foreground">Receita</span>
                          </div>
                          <div className="font-semibold text-sm">
                            {formatCurrency(stats[produto.id].revenue)}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingUp className="h-3 w-3 text-warning" />
                            <span className="text-xs text-muted-foreground">CVR</span>
                          </div>
                          <div className="font-semibold text-sm">
                            {(stats[produto.id].conversion_rate * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Ações */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Criado em {(() => {
                          const date = new Date(produto.created_at)
                          return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleDateString('pt-BR')
                        })()}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(produto.checkout_url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver Checkout
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Resumo */}
      {produtos.length > 0 && (
        <Card className="gaming-card border-l-4 border-l-accent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Resumo Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total de Produtos</div>
                <div className="font-semibold text-primary">{produtos.length}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Produtos Ativos</div>
                <div className="font-semibold text-success">
                  {produtos.filter(p => p.status === 'active').length}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Receita Total</div>
                <div className="font-semibold text-accent">
                  {formatCurrency(
                    Object.values(stats).reduce((acc: number, stat: any) => 
                      acc + (stat?.revenue || 0), 0
                    )
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Total de Vendas</div>
                <div className="font-semibold text-warning">
                  {Object.values(stats).reduce((acc: number, stat: any) => 
                    acc + (stat?.sales || 0), 0
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}