import { useState, useEffect } from 'react'
import { useKV } from './useKV'
import { toast } from 'sonner'
import type { MetricasCampanha } from '@/types'

export interface NotificationConfig {
  ctrAlerta: number
  roasAlerta: number
  gastoAlerta: number
  conversaoAlerta: number
  enabled: boolean
}

export interface AlertMetrica {
  id: string
  tipo: 'CTR_BAIXO' | 'ROAS_BAIXO' | 'GASTO_ALTO' | 'CONVERSAO_BAIXA'
  campanhaId: string
  campanhaNome: string
  valor: number
  limite: number
  timestamp: string
  visto: boolean
}

export function useNotifications() {
  const [config, setConfig] = useKV<NotificationConfig>('notification-config', {
    ctrAlerta: 1.0,
    roasAlerta: 2.0,
    gastoAlerta: 1000,
    conversaoAlerta: 5,
    enabled: true
  })
  
  const [alertas, setAlertas] = useKV<AlertMetrica[]>('alertas-metricas', [])
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const solicitarPermissao = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      return permission === 'granted'
    }
    return false
  }

  const enviarNotificacao = (titulo: string, mensagem: string, icon?: string) => {
    if (permission === 'granted' && config.enabled) {
      new Notification(titulo, {
        body: mensagem,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico'
      })
    }
    
    // Toast como fallback
    toast.error(titulo, {
      description: mensagem,
      duration: 5000
    })
  }

  const analisarMetricas = (campanhas: MetricasCampanha[]) => {
    if (!config.enabled) return

    const novosAlertas: AlertMetrica[] = []
    const agora = new Date().toISOString()

    campanhas.forEach(campanha => {
      // Verificar CTR baixo
      if (campanha.ctr < config.ctrAlerta) {
        const alertaId = `ctr-${campanha.id}-${Date.now()}`
        if (!alertas.some(a => a.campanhaId === campanha.id && a.tipo === 'CTR_BAIXO' && !a.visto)) {
          novosAlertas.push({
            id: alertaId,
            tipo: 'CTR_BAIXO',
            campanhaId: campanha.id,
            campanhaNome: campanha.nome,
            valor: campanha.ctr,
            limite: config.ctrAlerta,
            timestamp: agora,
            visto: false
          })
        }
      }

      // Verificar ROAS baixo
      if (campanha.roas < config.roasAlerta) {
        const alertaId = `roas-${campanha.id}-${Date.now()}`
        if (!alertas.some(a => a.campanhaId === campanha.id && a.tipo === 'ROAS_BAIXO' && !a.visto)) {
          novosAlertas.push({
            id: alertaId,
            tipo: 'ROAS_BAIXO',
            campanhaId: campanha.id,
            campanhaNome: campanha.nome,
            valor: campanha.roas,
            limite: config.roasAlerta,
            timestamp: agora,
            visto: false
          })
        }
      }

      // Verificar gasto alto
      if (campanha.gasto > config.gastoAlerta) {
        const alertaId = `gasto-${campanha.id}-${Date.now()}`
        if (!alertas.some(a => a.campanhaId === campanha.id && a.tipo === 'GASTO_ALTO' && !a.visto)) {
          novosAlertas.push({
            id: alertaId,
            tipo: 'GASTO_ALTO',
            campanhaId: campanha.id,
            campanhaNome: campanha.nome,
            valor: campanha.gasto,
            limite: config.gastoAlerta,
            timestamp: agora,
            visto: false
          })
        }
      }

      // Verificar conversões baixas
      if (campanha.conversoes < config.conversaoAlerta) {
        const alertaId = `conversao-${campanha.id}-${Date.now()}`
        if (!alertas.some(a => a.campanhaId === campanha.id && a.tipo === 'CONVERSAO_BAIXA' && !a.visto)) {
          novosAlertas.push({
            id: alertaId,
            tipo: 'CONVERSAO_BAIXA',
            campanhaId: campanha.id,
            campanhaNome: campanha.nome,
            valor: campanha.conversoes,
            limite: config.conversaoAlerta,
            timestamp: agora,
            visto: false
          })
        }
      }
    })

    if (novosAlertas.length > 0) {
      setAlertas((current: AlertMetrica[]) => [...current, ...novosAlertas])
      
      // Enviar notificações
      novosAlertas.forEach(alerta => {
        const mensagem = `${alerta.campanhaNome}: ${getMensagemAlerta(alerta)}`
        enviarNotificacao('⚠️ Alerta de Performance', mensagem)
      })
    }
  }

  const getMensagemAlerta = (alerta: AlertMetrica): string => {
    switch (alerta.tipo) {
      case 'CTR_BAIXO':
        return `CTR muito baixo (${alerta.valor.toFixed(2)}% < ${alerta.limite}%)`
      case 'ROAS_BAIXO':
        return `ROAS abaixo do esperado (${alerta.valor.toFixed(1)}x < ${alerta.limite}x)`
      case 'GASTO_ALTO':
        return `Gasto elevado (R$ ${alerta.valor.toLocaleString()} > R$ ${alerta.limite.toLocaleString()})`
      case 'CONVERSAO_BAIXA':
        return `Poucas conversões (${alerta.valor} < ${alerta.limite})`
      default:
        return 'Métrica fora do esperado'
    }
  }

  const marcarComoVisto = (alertaId: string) => {
    setAlertas((current: AlertMetrica[]) => 
      current.map(alerta => 
        alerta.id === alertaId ? { ...alerta, visto: true } : alerta
      )
    )
  }

  const limparAlertas = () => {
    setAlertas([])
  }

  const alertasNaoVistos = alertas.filter(a => !a.visto)

  return {
    config,
    setConfig,
    alertas,
    alertasNaoVistos,
    permission,
    solicitarPermissao,
    analisarMetricas,
    marcarComoVisto,
    limparAlertas,
    getMensagemAlerta
  }
}