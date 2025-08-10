// Utilitário para detectar e corrigir valores de moeda da API do Facebook

interface CurrencyConfig {
  currency: string;
  rate: number;
  isCents: boolean;
}

export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  'USD': { currency: 'USD', rate: 5.2, isCents: true },   // Facebook USA retorna em centavos
  'BRL': { currency: 'BRL', rate: 1.0, isCents: false },  // Facebook Brasil retorna em reais
  'EUR': { currency: 'EUR', rate: 5.6, isCents: true },   // Facebook Europa retorna em centavos
}

export function convertFacebookCurrency(
  value: number, 
  accountCurrency: string = 'USD',
  fieldName: string = 'spend'
): number {
  const config = CURRENCY_CONFIGS[accountCurrency] || CURRENCY_CONFIGS['USD']
  
  console.log(`🔄 Convertendo ${fieldName}: ${value} ${accountCurrency} (isCents: ${config.isCents})`)
  
  // Se a moeda já é BRL, não converter taxa
  if (accountCurrency === 'BRL') {
    return config.isCents ? value / 100 : value
  }
  
  // Para outras moedas
  let baseValue = value
  
  // Se está em centavos, dividir por 100
  if (config.isCents) {
    baseValue = value / 100
  }
  
  // Detectar anomalias: valores muito altos podem indicar que não está em centavos
  if (config.isCents && baseValue > 10000) {
    console.warn(`⚠️ Valor suspeito para ${fieldName}: ${baseValue}. Talvez não seja em centavos?`)
    baseValue = value // Usar valor original
  }
  
  // Aplicar taxa de conversão
  const converted = baseValue * config.rate
  
  console.log(`💰 ${fieldName}: ${value} ${accountCurrency} → R$ ${converted.toFixed(2)}`)
  
  return converted
}

export function detectCurrencyIssues(campaigns: any[]): string[] {
  const issues: string[] = []
  
  if (campaigns.length === 0) return issues
  
  // Verificar se há valores muito altos ou muito baixos
  const gastos = campaigns.map(c => c.gasto).filter(g => g > 0)
  const gastoMedio = gastos.reduce((a, b) => a + b, 0) / gastos.length
  
  if (gastoMedio > 50000) {
    issues.push('Valores de gasto muito altos - possível problema na conversão de centavos')
  }
  
  if (gastoMedio < 0.01) {
    issues.push('Valores de gasto muito baixos - possível problema na conversão de moeda')
  }
  
  // Verificar CTR anormal
  const ctrs = campaigns.map(c => c.ctr).filter(ctr => ctr > 0)
  const ctrMedio = ctrs.reduce((a, b) => a + b, 0) / ctrs.length
  
  if (ctrMedio > 50) {
    issues.push('CTR muito alto - valores podem estar em formato incorreto')
  }
  
  return issues
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}