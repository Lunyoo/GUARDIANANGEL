import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Activity,
  Play,
  Pause,
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react"
import { toast } from 'sonner'

interface RealTimeStatusProps {
  isAutoUpdateEnabled: boolean
  ultimaAtualizacao: Date | null
  isLoadingData: boolean
  toggleAutoUpdate: () => void
  carregarDados: () => void
  erro?: string
}

export default function RealTimeStatus({
  isAutoUpdateEnabled,
  ultimaAtualizacao,
  isLoadingData,
  toggleAutoUpdate,
  carregarDados,
  erro
}: RealTimeStatusProps) {
  const getStatusColor = () => {
    if (erro) return 'destructive'
    if (!isAutoUpdateEnabled) return 'secondary'
    return 'success'
  }

  const getStatusText = () => {
    if (erro) return 'Erro na Conexão'
    if (isLoadingData) return 'Sincronizando...'
    if (isAutoUpdateEnabled) return 'Tempo Real Ativo'
    return 'Modo Manual'
  }

  const getStatusIcon = () => {
    if (erro) return <AlertCircle className="h-3 w-3" />
    if (isLoadingData) return <Loader2 className="h-3 w-3 animate-spin" />
    if (isAutoUpdateEnabled) return <Wifi className="h-3 w-3 animate-pulse" />
    return <WifiOff className="h-3 w-3" />
  }

  return (
    <Card className="gaming-card border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Status do Sistema
          </div>
          
          <Badge 
            variant={getStatusColor() as any}
            className="text-xs flex items-center gap-1 animate-pulse"
          >
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status da Sincronização */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Sincronização Automática</p>
            <p className="text-xs text-muted-foreground">
              {isAutoUpdateEnabled 
                ? 'Dados atualizados a cada 2 minutos' 
                : 'Clique em "Atualizar" para sincronizar'
              }
            </p>
          </div>
          
          <Button
            variant={isAutoUpdateEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleAutoUpdate}
            className={`${
              isAutoUpdateEnabled 
                ? 'bg-gradient-to-r from-primary to-accent' 
                : ''
            }`}
          >
            {isAutoUpdateEnabled ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Pausar
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Ativar
              </>
            )}
          </Button>
        </div>
        
        {/* Última Atualização */}
        {ultimaAtualizacao && ultimaAtualizacao instanceof Date && (
          <div className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3" />
              <span className="text-muted-foreground">Última sincronização:</span>
              <span className="font-medium">
                {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={carregarDados}
              disabled={isLoadingData}
              className="h-6 px-2 text-xs"
            >
              {isLoadingData ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Activity className="h-3 w-3 mr-1" />
                  Sincronizar
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Indicador de Error */}
        {erro && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">Erro de Conexão</span>
            </div>
            <p className="text-xs text-destructive/80 mt-1">
              {erro}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={carregarDados}
              className="mt-2 h-6 px-2 text-xs border-destructive/30 hover:border-destructive"
            >
              Tentar Novamente
            </Button>
          </div>
        )}
        
        {/* Status OK */}
        {!erro && ultimaAtualizacao && ultimaAtualizacao instanceof Date && (
          <div className="flex items-center gap-2 text-success text-xs">
            <CheckCircle2 className="h-3 w-3" />
            <span>Sistema funcionando normalmente</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}