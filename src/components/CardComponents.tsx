import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle } from "lucide-react"
import { formatCurrency, formatPercentage } from '@/utils/currencyDetector'
import type { MetricasCampanha, Criativo } from '@/types'

export function CampanhaCard({ 
  campanha, 
  rank, 
  detailed = false 
}: { 
  campanha: MetricasCampanha
  rank?: number
  detailed?: boolean 
}) {
  const statusColor = campanha.status === 'ACTIVE' ? 'success' : 
                     campanha.status === 'PAUSED' ? 'warning' : 'secondary'

  return (
    <Card className="gaming-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-3">
              {rank && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  rank === 1 ? 'bg-accent text-accent-foreground' :
                  rank === 2 ? 'bg-primary text-primary-foreground' :
                  'bg-secondary text-secondary-foreground'
                }`}>
                  {rank}
                </div>
              )}
              <div>
                <h3 className="font-medium truncate max-w-xs">{campanha.nome}</h3>
                <Badge 
                  variant={statusColor === 'success' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {campanha.status}
                </Badge>
              </div>
            </div>
            
            {detailed && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="block font-medium text-foreground">
                    {campanha.impressoes.toLocaleString('pt-BR')}
                  </span>
                  <span>Impressões</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    {campanha.cliques.toLocaleString('pt-BR')}
                  </span>
                  <span>Cliques</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    {campanha.conversoes}
                  </span>
                  <span>Conversões</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    {formatCurrency(campanha.gasto)}
                  </span>
                  <span>Investido</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-right space-y-1">
            <div className="text-sm font-semibold font-mono">
              {formatCurrency(campanha.gasto)}
            </div>
            <div className="flex space-x-3 text-xs">
              <span className="text-primary">CTR: {formatPercentage(campanha.ctr)}</span>
              <span className="text-accent">CPA: {formatCurrency(campanha.cpa)}</span>
              <span className="text-success">ROAS: {campanha.roas.toFixed(1)}x</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CriativoCard({ criativo }: { criativo: Criativo }) {
  const isAtivo = criativo.metricas.impressoes > 0
  
  return (
    <Card className={`gaming-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ${!isAtivo ? 'opacity-75 border-warning/30' : ''}`}>
      <CardContent className="p-0">
        {criativo.urlMidia && (
          <div className="aspect-video bg-muted/20 relative overflow-hidden">
            <img 
              src={criativo.urlMidia} 
              alt={criativo.nome}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-image.png'
              }}
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Badge className="bg-background/80">
                {criativo.tipo}
              </Badge>
              {!isAtivo && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/50">
                  Inativo
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-medium truncate">{criativo.nome}</h3>
            {criativo.textoAnuncio && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {criativo.textoAnuncio}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className={`block font-medium ${isAtivo ? 'text-success' : 'text-muted-foreground'}`}>
                {formatPercentage(criativo.metricas.ctr)}
              </span>
              <span className="text-muted-foreground">CTR</span>
            </div>
            <div>
              <span className={`block font-medium ${isAtivo ? 'text-accent' : 'text-muted-foreground'}`}>
                {criativo.metricas.roas.toFixed(1)}x
              </span>
              <span className="text-muted-foreground">ROAS</span>
            </div>
            <div>
              <span className={`block font-medium ${isAtivo ? 'text-primary' : 'text-muted-foreground'}`}>
                {criativo.metricas.impressoes.toLocaleString('pt-BR')}
              </span>
              <span className="text-muted-foreground">Impressões</span>
            </div>
            <div>
              <span className={`block font-medium ${isAtivo ? 'text-warning' : 'text-muted-foreground'}`}>
                {formatCurrency(criativo.metricas.gasto)}
              </span>
              <span className="text-muted-foreground">Investido</span>
            </div>
          </div>
          
          {criativo.scorePreditivo && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Score Preditivo</span>
                <span className="font-medium">{criativo.scorePreditivo}%</span>
              </div>
              <Progress value={criativo.scorePreditivo} className="h-1" />
            </div>
          )}
          
          {!isAtivo && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Criativo sem atividade recente
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}