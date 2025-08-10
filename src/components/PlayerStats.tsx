import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  Crown,
  Zap,
  Trophy,
  Star,
  Sword
} from "lucide-react"
import type { DadosGamificacao } from '@/types'

interface PlayerStatsProps {
  usuario: {
    nome: string
    nivel: number
    experiencia: number
    isAdmin: boolean
  }
  dadosGamificacao?: DadosGamificacao
  metricas?: {
    campanhasAtivas: number
    roasTotal: number
    gastoTotal: number
    conversoes: number
  }
  compact?: boolean
}

export default function PlayerStats({ usuario, dadosGamificacao, metricas, compact = false }: PlayerStatsProps) {
  const experienciaParaProximo = dadosGamificacao?.experienciaProximoNivel || 1000
  const progressoNivel = (usuario.experiencia / experienciaParaProximo) * 100
  
  const nivel = usuario.nivel || 1
  const tituloNivel = getTituloNivel(nivel)
  const corNivel = getCorNivel(nivel)

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className={`p-1 rounded-lg bg-gradient-to-br ${corNivel.bg}`}>
            {usuario.isAdmin ? (
              <Crown className={`h-4 w-4 ${corNivel.text}`} />
            ) : (
              <Sword className={`h-4 w-4 ${corNivel.text}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{usuario.nome}</p>
            <p className={`text-xs ${corNivel.text}`}>{tituloNivel}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold">Nv. {nivel}</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Progress 
            value={progressoNivel} 
            className="h-1" 
          />
          {metricas && (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Campanhas: {metricas.campanhasAtivas}</div>
              <div>ROAS: {metricas.roasTotal.toFixed(1)}x</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="gaming-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${corNivel.bg}`}>
              {usuario.isAdmin ? (
                <Crown className={`h-6 w-6 ${corNivel.text}`} />
              ) : (
                <Sword className={`h-6 w-6 ${corNivel.text}`} />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                {usuario.nome}
                {usuario.isAdmin && (
                  <Badge className="ml-2 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground">
                    <Crown className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </CardTitle>
              <p className={`text-sm ${corNivel.text} font-medium`}>
                {tituloNivel}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold font-mono">
              Nv. {nivel}
            </div>
            <div className="text-xs text-muted-foreground">
              {usuario.experiencia.toLocaleString()} XP
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Barra de Progresso de Nível */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Progresso para Nv. {nivel + 1}</span>
            <span>{progressoNivel.toFixed(1)}%</span>
          </div>
          <Progress 
            value={progressoNivel} 
            className="h-2"
            style={{
              background: `linear-gradient(90deg, ${corNivel.gradient})`
            }}
          />
          <div className="text-xs text-muted-foreground text-center">
            {(experienciaParaProximo - usuario.experiencia).toLocaleString()} XP para próximo nível
          </div>
        </div>

        {/* Estatísticas de Performance */}
        {metricas && (
          <div className="grid grid-cols-2 gap-3">
            <StatItem
              icon={<Zap className="h-4 w-4" />}
              label="Campanhas"
              value={metricas.campanhasAtivas}
              color="text-primary"
            />
            <StatItem
              icon={<TrendingUp className="h-4 w-4" />}
              label="ROAS Médio"
              value={`${metricas.roasTotal.toFixed(1)}x`}
              color="text-success"
            />
            <StatItem
              icon={<Trophy className="h-4 w-4" />}
              label="Conversões"
              value={metricas.conversoes}
              color="text-accent"
            />
            <StatItem
              icon={<Star className="h-4 w-4" />}
              label="Investido"
              value={`R$ ${(metricas.gastoTotal / 100).toLocaleString('pt-BR')}`}
              color="text-warning"
            />
          </div>
        )}

        {/* Conquistas Recentes */}
        {dadosGamificacao?.conquistas && dadosGamificacao.conquistas.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Conquistas Recentes
            </h4>
            <div className="flex flex-wrap gap-1">
              {dadosGamificacao.conquistas
                .filter(c => c.desbloqueadoEm)
                .slice(0, 3)
                .map((conquista) => (
                  <Badge
                    key={conquista.id}
                    variant="outline"
                    className="text-xs bg-accent/10 border-accent/30 text-accent"
                  >
                    {conquista.icone} {conquista.nome}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Ranking (se disponível) */}
        {dadosGamificacao?.ranking && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Ranking Global</span>
            <Badge variant="secondary">
              #{dadosGamificacao.ranking}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatItem({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode
  label: string
  value: string | number
  color: string 
}) {
  return (
    <div className="flex items-center space-x-2 p-2 rounded-lg bg-background/30">
      <div className={color}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold font-mono">{value}</p>
      </div>
    </div>
  )
}

function getTituloNivel(nivel: number): string {
  if (nivel >= 100) return "Lenda do Marketing"
  if (nivel >= 50) return "Mestre Estrategista"
  if (nivel >= 30) return "Especialista Avançado"
  if (nivel >= 20) return "Analista Experiente"
  if (nivel >= 10) return "Hunter Competente"
  if (nivel >= 5) return "Aprendiz Dedicado"
  return "Novato Promissor"
}

function getCorNivel(nivel: number) {
  if (nivel >= 100) return {
    bg: "from-yellow-400 to-yellow-600",
    text: "text-yellow-400",
    gradient: "var(--neon-gold), transparent"
  }
  if (nivel >= 50) return {
    bg: "from-purple-400 to-purple-600", 
    text: "text-purple-400",
    gradient: "var(--neon-purple), transparent"
  }
  if (nivel >= 30) return {
    bg: "from-blue-400 to-blue-600",
    text: "text-blue-400", 
    gradient: "var(--neon-blue), transparent"
  }
  if (nivel >= 10) return {
    bg: "from-green-400 to-green-600",
    text: "text-green-400",
    gradient: "var(--neon-green), transparent"
  }
  return {
    bg: "from-gray-400 to-gray-600",
    text: "text-gray-400",
    gradient: "var(--muted), transparent"
  }
}