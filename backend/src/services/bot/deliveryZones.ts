import { getCodCities, isCODCity } from './codCitiesProvider'

/**
 * Verifica se uma cidade tem direito a entrega no dia seguinte com pagamento na entrega
 */
export function isFastEligible(city?: string, customList?: string[]): boolean {
  if (!city) return false
  
  const citiesList = customList || getCodCities()
  const normalizedCity = city.toLowerCase().normalize('NFD').replace(/[^a-záéíóúàèìòùãõâêîôûç\s]/gi, '')
  
  return citiesList.some(codCity => {
    const normalizedCodCity = codCity.toLowerCase().normalize('NFD').replace(/[^a-záéíóúàèìòùãõâêîôûç\s]/gi, '')
    return normalizedCodCity.includes(normalizedCity) || normalizedCity.includes(normalizedCodCity.split(' - ')[0])
  })
}

/**
 * Retorna o nível de serviço baseado na cidade
 */
export function getServiceLevel(city?: string): 'fast' | 'standard' {
  return isFastEligible(city) ? 'fast' : 'standard'
}

/**
 * Retorna informações completas sobre o tipo de entrega para uma cidade
 */
export function getDeliveryInfo(city?: string): {
  type: 'COD' | 'CORREIOS'
  paymentMethod: 'na_entrega' | 'antecipado'
  description: string
} {
  if (isFastEligible(city)) {
    return {
      type: 'COD',
      paymentMethod: 'na_entrega',
      description: 'Entrega com nossa equipe, pagamento na entrega'
    }
  } else {
    return {
      type: 'CORREIOS',
      paymentMethod: 'antecipado',
      description: 'Entrega via Correios com pagamento antecipado'
    }
  }
}
