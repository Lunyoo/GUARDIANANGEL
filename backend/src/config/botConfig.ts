export interface BotConfig {
  OVERRIDE_MESSAGES: {
    BOT_IS_EXPERT: string
  }
}

export const BOT_CONFIG: BotConfig = {
  OVERRIDE_MESSAGES: {
    BOT_IS_EXPERT: 'Sou especialista em atendimento e vendas!'
  }
}

export function isBotOnlyMode(): boolean {
  return String(process.env.BOT_AI_ONLY || 'true') === 'true'
}

export function shouldForceBot(): boolean {
  return String(process.env.BOT_FORCE_ACTIVE || 'true') === 'true'
}
