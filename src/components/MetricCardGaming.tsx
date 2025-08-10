import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointer, 
  DollarSign,
  Target,
  LineChart,
  Zap,
  Clock
} from "lucide-react"
import type { MetricasCampanha } from '@/types'

interface MetricCardGamingProps {
  titulo: string
  valor: string
  mudanca?: {
    percentual: number
    periodo: string
  }
  tipo: 'impressoes' | 'ctr' | 'gasto' | 'roas' | 'conversoes' | 'cpc'
  subtitulo?: string
  isLoading?: boolean
}

export default function MetricCardGaming({ 
  titulo, 
  valor, 
  mudanca, 
  tipo,
  subtitulo,
  isLoading = false
}: MetricCardGamingProps) {
  const config = getMetricConfig(tipo)
  const isPositive = mudanca && mudanca.percentual > 0
  const isNegative = mudanca && mudanca.percentual < 0
  
  if (isLoading) {
    return (
      <Card className="gaming-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {titulo}
          </CardTitle>
          <div className="animate-spin">
            <config.icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted/30 rounded animate-pulse"></div>
          {subtitulo && (
            <div className="h-4 bg-muted/20 rounded mt-2 animate-pulse"></div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`gaming-card relative overflow-hidden border-l-4 ${config.borderColor} hover:shadow-lg hover:shadow-primary/10 transition-all duration-300`}>
      {/* Glow Effect */}
      <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${config.glowColor}/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300`}></div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {titulo}
        </CardTitle>
        <div className={`p-2 rounded-lg ${config.bgColor} transition-transform hover:scale-110`}>
          <config.icon className={`h-4 w-4 ${config.textColor}`} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className={`text-2xl font-bold font-mono ${config.valueColor} tracking-tight`}>
            {valor}
          </div>
          
          {subtitulo && (
            <p className="text-xs text-muted-foreground">
              {subtitulo}
            </p>
          )}
          
          {mudanca && (
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
                isPositive ? 'bg-success/10 text-success' :
                isNegative ? 'bg-destructive/10 text-destructive' :
                'bg-muted/10 text-muted-foreground'
              }`}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : isNegative ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Target className="h-3 w-3" />
                )}
                <span className="font-medium">
                  {Math.abs(mudanca.percentual)}%
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                vs {mudanca.periodo}
              </span>
            </div>
          )}

          {/* Mini Progress Bar para algumas métricas */}
          {(tipo === 'ctr' || tipo === 'roas') && (
            <div className="mt-2">
              <Progress 
                value={getProgressValue(tipo, valor)} 
                className="h-1" 
              />
              <div className="text-xs text-muted-foreground mt-1">
                {getProgressLabel(tipo, valor)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Sparkle animation para valores excepcionais */}
      {isExceptionalValue(tipo, valor) && (
        <div className="absolute top-2 right-2">
          <Zap className="h-3 w-3 text-accent animate-pulse" />
        </div>
      )}
    </Card>
  )
}

function getMetricConfig(tipo: string) {
  const configs = {
    impressoes: {
      icon: Eye,
      borderColor: 'border-l-primary',
      bgColor: 'bg-primary/10',
      textColor: 'text-primary',
      valueColor: 'text-primary',
      glowColor: 'primary'
    },
    ctr: {
      icon: MousePointer,
      borderColor: 'border-l-accent',
      bgColor: 'bg-accent/10',
      textColor: 'text-accent',
      valueColor: 'text-accent',
      glowColor: 'accent'
    },
    gasto: {
      icon: DollarSign,
      borderColor: 'border-l-warning',
      bgColor: 'bg-warning/10',
      textColor: 'text-warning',
      valueColor: 'text-warning',
      glowColor: 'warning'
    },
    roas: {
      icon: TrendingUp,
      borderColor: 'border-l-success',
      bgColor: 'bg-success/10',
      textColor: 'text-success',
      valueColor: 'text-success',
      glowColor: 'success'
    },
    conversoes: {
      icon: Target,
      borderColor: 'border-l-purple-500',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-500',
      valueColor: 'text-purple-500',
      glowColor: 'purple-500'
    },
    cpc: {
      icon: LineChart,
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-500',
      valueColor: 'text-blue-500',
      glowColor: 'blue-500'
    }
  }
  
  return configs[tipo as keyof typeof configs] || configs.impressoes
}

function getProgressValue(tipo: string, valor: string): number {
  if (tipo === 'ctr') {
    const ctr = parseFloat(valor.replace('%', ''))
    return Math.min((ctr / 10) * 100, 100) // Máximo 10% = 100%
  }
  
  if (tipo === 'roas') {
    const roas = parseFloat(valor.replace('x', ''))
    return Math.min((roas / 5) * 100, 100) // Máximo 5x = 100%
  }
  
  return 0
}

function getProgressLabel(tipo: string, valor: string): string {
  if (tipo === 'ctr') {
    const ctr = parseFloat(valor.replace('%', ''))
    if (ctr >= 8) return 'Excelente'
    if (ctr >= 5) return 'Bom'
    if (ctr >= 2) return 'Médio'
    return 'Baixo'
  }
  
  if (tipo === 'roas') {
    const roas = parseFloat(valor.replace('x', ''))
    if (roas >= 4) return 'Excelente'
    if (roas >= 2.5) return 'Bom'
    if (roas >= 1.5) return 'Médio'
    return 'Baixo'
  }
  
  return ''
}

function isExceptionalValue(tipo: string, valor: string): boolean {
  if (tipo === 'ctr') {
    return parseFloat(valor.replace('%', '')) >= 8
  }
  
  if (tipo === 'roas') {
    return parseFloat(valor.replace('x', '')) >= 4
  }
  
  if (tipo === 'conversoes') {
    return parseInt(valor.replace(/[^\d]/g, '')) >= 100
  }
  
  return false
}