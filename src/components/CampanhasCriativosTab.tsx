import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target, Sparkles, Activity, Loader2 } from "lucide-react"
import type { MetricasCampanha, Criativo, InsightPreditivo } from '@/types'

interface CampanhasCriativosTabProps {
  campanhas: MetricasCampanha[]
  criativos: Criativo[]
  insights: InsightPreditivo[]
  isLoadingData: boolean
  carregarDados: () => void
}

// Import the existing card components from App.tsx
import { CampanhaCard, CriativoCard } from './CardComponents'

export default function CampanhasCriativosTab({ 
  campanhas, 
  criativos, 
  insights,
  isLoadingData, 
  carregarDados 
}: CampanhasCriativosTabProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="campanhas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50">
          <TabsTrigger value="campanhas" className="flex items-center gap-2 relative">
            <Target className="h-4 w-4" />
            Campanhas
            {campanhas.length > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 text-[10px]">
                {campanhas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="criativos" className="flex items-center gap-2 relative">
            <Sparkles className="h-4 w-4" />
            Criativos
            {criativos.length > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 text-[10px]">
                {criativos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2 relative">
            <Activity className="h-4 w-4" />
            Insights
            {insights.length > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 text-[10px]">
                {insights.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campanhas" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Gerenciamento de Campanhas</h3>
              <p className="text-muted-foreground text-sm">Monitore e otimize todas suas campanhas do Facebook Ads</p>
            </div>
            <div className="flex items-center gap-3">
              {campanhas.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Total: <span className="font-medium text-foreground">{campanhas.length}</span></span>
                  <span>Ativas: <span className="font-medium text-success">{campanhas.filter(c => c.status === 'ACTIVE').length}</span></span>
                  <span>Pausadas: <span className="font-medium text-warning">{campanhas.filter(c => c.status === 'PAUSED').length}</span></span>
                </div>
              )}
              <Button 
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                size="sm"
                onClick={() => window.open('https://business.facebook.com/adsmanager', '_blank')}
              >
                <Target className="h-4 w-4 mr-2" />
                Gerenciar no Facebook
              </Button>
            </div>
          </div>

          {isLoadingData ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="gaming-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted/20 rounded w-1/3 animate-pulse" />
                        <div className="h-3 bg-muted/20 rounded w-16 animate-pulse" />
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          <div className="h-8 bg-muted/20 rounded animate-pulse" />
                          <div className="h-8 bg-muted/20 rounded animate-pulse" />
                          <div className="h-8 bg-muted/20 rounded animate-pulse" />
                          <div className="h-8 bg-muted/20 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="h-4 bg-muted/20 rounded w-20 animate-pulse" />
                        <div className="h-3 bg-muted/20 rounded w-32 animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {campanhas.map((campanha) => (
                <CampanhaCard key={campanha.id} campanha={campanha} detailed />
              ))}
              
              {campanhas.length === 0 && (
                <Card className="gaming-card">
                  <CardContent className="text-center py-12">
                    <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma campanha encontrada</h3>
                    <p className="text-muted-foreground mb-6">
                      Configure suas campanhas no Facebook Ads Manager para começar a monitorar
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button 
                        onClick={() => window.open('https://business.facebook.com/adsmanager', '_blank')}
                        className="bg-gradient-to-r from-primary to-primary/80"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Criar no Facebook
                      </Button>
                      <Button variant="outline" onClick={carregarDados} disabled={isLoadingData}>
                        {isLoadingData ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Activity className="h-4 w-4 mr-2" />
                        )}
                        Atualizar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="criativos" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Análise de Criativos</h3>
              <p className="text-muted-foreground text-sm">
                Performance detalhada de todos os seus criativos (ativos e inativos)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {criativos.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Total: <span className="font-medium text-foreground">{criativos.length}</span></span>
                  <span>Ativos: <span className="font-medium text-success">{criativos.filter(c => c.metricas.impressoes > 0).length}</span></span>
                  <span>Inativos: <span className="font-medium text-warning">{criativos.filter(c => c.metricas.impressoes === 0).length}</span></span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={carregarDados} disabled={isLoadingData}>
                {isLoadingData ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4 mr-2" />
                )}
                Atualizar
              </Button>
            </div>
          </div>

          {isLoadingData ? (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="gaming-card">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-muted/20 animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted/20 rounded animate-pulse" />
                      <div className="h-3 bg-muted/20 rounded w-2/3 animate-pulse" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-8 bg-muted/20 rounded animate-pulse" />
                        <div className="h-8 bg-muted/20 rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {criativos.map((criativo) => (
                <CriativoCard key={criativo.id} criativo={criativo} />
              ))}
              
              {criativos.length === 0 && (
                <div className="col-span-full">
                  <Card className="gaming-card">
                    <CardContent className="text-center py-12">
                      <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Nenhum criativo encontrado</h3>
                      <p className="text-muted-foreground mb-6">
                        Verifique se existem anúncios configurados na sua conta do Facebook Ads
                      </p>
                      <Button onClick={carregarDados} disabled={isLoadingData}>
                        {isLoadingData ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Activity className="h-4 w-4 mr-2" />
                        )}
                        Tentar novamente
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Insights de Inteligência Artificial</h3>
              <p className="text-muted-foreground text-sm">
                Recomendações personalizadas baseadas na análise dos seus dados em tempo real
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/50">
                <Activity className="h-3 w-3 mr-1" />
                {insights.length} Insights Ativos
              </Badge>
              <Button variant="outline" size="sm" onClick={carregarDados} disabled={isLoadingData}>
                {isLoadingData ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Regenerar IA
              </Button>
            </div>
          </div>

          {/* Content will be imported from existing InsightCard components */}
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Insights serão implementados aqui</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}