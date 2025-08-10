import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bell, 
  BellRing, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Target,
  X,
  Check
} from "lucide-react"
import { useNotifications } from '@/hooks/useNotifications'
import type { AlertMetrica } from '@/hooks/useNotifications'

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const {
    config,
    setConfig,
    alertas,
    alertasNaoVistos,
    permission,
    solicitarPermissao,
    marcarComoVisto,
    limparAlertas,
    getMensagemAlerta
  } = useNotifications()

  const [configTemp, setConfigTemp] = useState(config)

  if (!isOpen) return null

  const handleSalvarConfig = () => {
    setConfig(configTemp)
  }

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'CTR_BAIXO':
        return <Target className="h-4 w-4 text-warning" />
      case 'ROAS_BAIXO':
        return <TrendingDown className="h-4 w-4 text-destructive" />
      case 'GASTO_ALTO':
        return <DollarSign className="h-4 w-4 text-destructive" />
      case 'CONVERSAO_BAIXA':
        return <AlertTriangle className="h-4 w-4 text-warning" />
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getAlertColor = (tipo: string) => {
    switch (tipo) {
      case 'ROAS_BAIXO':
      case 'GASTO_ALTO':
        return 'border-l-destructive bg-destructive/5'
      case 'CTR_BAIXO':
      case 'CONVERSAO_BAIXA':
        return 'border-l-warning bg-warning/5'
      default:
        return 'border-l-muted bg-muted/5'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl border-l bg-background shadow-lg">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center space-x-3">
            <BellRing className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Central de Notificações</h2>
            {alertasNaoVistos.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {alertasNaoVistos.length} novos
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="alertas" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 m-4">
            <TabsTrigger value="alertas" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alertas ({alertas.length})
            </TabsTrigger>
            <TabsTrigger value="configuracao" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alertas" className="px-6 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Alertas de Performance</h3>
                <p className="text-sm text-muted-foreground">
                  Monitoramento em tempo real das suas métricas
                </p>
              </div>
              {alertas.length > 0 && (
                <Button variant="outline" size="sm" onClick={limparAlertas}>
                  Limpar Todos
                </Button>
              )}
            </div>

            {permission !== 'granted' && (
              <Alert className="border-warning/50 bg-warning/10">
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span className="text-warning">
                      Permita notificações para receber alertas em tempo real
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={solicitarPermissao}
                      className="text-xs"
                    >
                      Permitir
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[600px] space-y-3">
              {alertas.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-success mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Tudo em ordem!</h3>
                  <p className="text-muted-foreground">
                    Nenhum alerta de performance no momento
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alertas.map((alerta) => (
                    <AlertCard 
                      key={alerta.id} 
                      alerta={alerta} 
                      onMarcarVisto={marcarComoVisto}
                      getMensagemAlerta={getMensagemAlerta}
                      getAlertIcon={getAlertIcon}
                      getAlertColor={getAlertColor}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="configuracao" className="px-6 pb-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-4">Configurações de Alerta</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enabled">Notificações Ativas</Label>
                      <p className="text-xs text-muted-foreground">
                        Ativar/desativar todas as notificações
                      </p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={configTemp.enabled}
                      onCheckedChange={(checked) => 
                        setConfigTemp(prev => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ctr">CTR Mínimo (%)</Label>
                      <Input
                        id="ctr"
                        type="number"
                        step="0.1"
                        value={configTemp.ctrAlerta}
                        onChange={(e) => 
                          setConfigTemp(prev => ({ 
                            ...prev, 
                            ctrAlerta: parseFloat(e.target.value) || 0 
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="roas">ROAS Mínimo</Label>
                      <Input
                        id="roas"
                        type="number"
                        step="0.1"
                        value={configTemp.roasAlerta}
                        onChange={(e) => 
                          setConfigTemp(prev => ({ 
                            ...prev, 
                            roasAlerta: parseFloat(e.target.value) || 0 
                          }))
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="gasto">Gasto Máximo (R$)</Label>
                      <Input
                        id="gasto"
                        type="number"
                        value={configTemp.gastoAlerta}
                        onChange={(e) => 
                          setConfigTemp(prev => ({ 
                            ...prev, 
                            gastoAlerta: parseInt(e.target.value) || 0 
                          }))
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="conversao">Conversões Mínimas</Label>
                      <Input
                        id="conversao"
                        type="number"
                        value={configTemp.conversaoAlerta}
                        onChange={(e) => 
                          setConfigTemp(prev => ({ 
                            ...prev, 
                            conversaoAlerta: parseInt(e.target.value) || 0 
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button onClick={handleSalvarConfig} className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function AlertCard({ 
  alerta, 
  onMarcarVisto, 
  getMensagemAlerta, 
  getAlertIcon, 
  getAlertColor 
}: { 
  alerta: AlertMetrica
  onMarcarVisto: (id: string) => void
  getMensagemAlerta: (alerta: AlertMetrica) => string
  getAlertIcon: (tipo: string) => React.ReactNode
  getAlertColor: (tipo: string) => string
}) {
  return (
    <Card className={`border-l-4 ${getAlertColor(alerta.tipo)} ${!alerta.visto ? 'shadow-md' : 'opacity-75'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getAlertIcon(alerta.tipo)}
            <div>
              <CardTitle className="text-sm">{alerta.campanhaNome}</CardTitle>
              <CardDescription className="text-xs">
                {new Date(alerta.timestamp).toLocaleString('pt-BR')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!alerta.visto && (
              <Badge variant="secondary" className="text-xs">Novo</Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarcarVisto(alerta.id)}
              className="h-6 w-6 p-0"
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          {getMensagemAlerta(alerta)}
        </p>
      </CardContent>
    </Card>
  )
}