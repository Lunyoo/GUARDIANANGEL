import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Loader2, Sparkles } from "lucide-react"
import type { InsightPreditivo } from '@/types'

interface InsightsIATabProps {
  insights: InsightPreditivo[]
  isLoadingData: boolean
  carregarDados: () => void
}

export default function InsightsIATab({ 
  insights, 
  isLoadingData, 
  carregarDados 
}: InsightsIATabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/50 mb-2">
            <Lightbulb className="h-3 w-3 mr-1" />
            {insights.length} Insights Ativos
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={carregarDados} disabled={isLoadingData}>
          {isLoadingData ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Regenerar IA
        </Button>
      </div>

      {isLoadingData ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="gaming-card border-l-4 border-l-accent/50">
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-5 w-5 bg-muted/20 rounded animate-pulse" />
                    <div className="h-4 bg-muted/20 rounded w-32 animate-pulse" />
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-5 bg-muted/20 rounded w-16 animate-pulse" />
                    <div className="h-5 bg-muted/20 rounded w-16 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-3 bg-muted/20 rounded w-full animate-pulse" />
                  <div className="h-3 bg-muted/20 rounded w-2/3 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-3 bg-muted/20 rounded w-24 animate-pulse" />
                    <div className="h-3 bg-muted/20 rounded w-40 animate-pulse" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {insights.map((insight) => (
            <Card key={insight.id} className="gaming-card border-l-4 border-l-accent/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5 text-accent" />
                    <h4 className="font-medium">{insight.titulo}</h4>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <Badge variant="outline">{insight.confianca}% confiança</Badge>
                    <Badge variant="outline">+{insight.impactoEstimado}% impacto</Badge>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {insight.descricao}
                </p>
                
                {insight.acoes.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Ações Recomendadas
                    </h5>
                    <ul className="space-y-1">
                      {insight.acoes.slice(0, 2).map((acao, index) => (
                        <li key={index} className="text-xs flex items-center space-x-2">
                          <div className="w-1 h-1 bg-accent rounded-full" />
                          <span>{acao}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {insights.length === 0 && (
            <div className="col-span-full">
              <Card className="gaming-card">
                <CardContent className="text-center py-12">
                  <div className="relative">
                    <Lightbulb className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                      <div className="h-16 w-16 border-4 border-accent/30 border-t-accent rounded-full animate-spin opacity-30" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Gerando insights inteligentes...</h3>
                  <p className="text-muted-foreground mb-6">
                    A IA está analisando seus dados para gerar recomendações personalizadas.
                  </p>
                  <Button onClick={carregarDados} disabled={isLoadingData}>
                    {isLoadingData ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Lightbulb className="h-4 w-4 mr-2" />
                    )}
                    Gerar Insights
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}