import { getCodCities, isCODCity } from './codCitiesProvider'

export interface CustomerProfile { city?:string; hasAskedPrice?:boolean; hasShownInterest?:boolean; objections?:string[]; messageCount?:number; isReturningCustomer?:boolean }
interface PricingRec { qty:number; price:number; context?:any }

export function getOptimalPricing(_p:CustomerProfile):PricingRec{ return { qty:2, price:169.90 } }
export function formatPricingMessage(rec:PricingRec){ return `Temos promoção: ${rec.qty} un por R$ ${rec.price.toFixed(2).replace('.',',')}. Prefere 1 ou ${rec.qty}?` }
export function getAllAvailableOptions(){ return [ { qty:1, price:119.90 }, { qty:2, price:169.90 }, { qty:3, price:199.90 } ] }

/**
 * Verifica se uma cidade está na área de entrega COD (pagamento na entrega)
 */
export function isInDeliveryArea(city?: string): boolean {
  if (!city) return false
  // Use shared provider (handles DB + UB context + fallback)
  if (isCODCity(city)) return true
  // Extra loose check with current list (for partial matches like "curitiba pr")
  const normalizedCity = city.toLowerCase().normalize('NFD').replace(/[^a-záéíóúàèìòùãõâêîôûç\s-]/gi, '')
  return getCodCities().some(codCity => {
    const normalizedCodCity = codCity.toLowerCase().normalize('NFD').replace(/[^a-záéíóúàèìòùãõâêîôûç\s-]/gi, '')
    const cityOnly = normalizedCodCity.split(' - ')[0]
    return normalizedCodCity.includes(normalizedCity) || normalizedCity.includes(cityOnly)
  })
}

/**
 * Retorna o tipo de pagamento baseado na cidade
 */
export function getPaymentType(city?: string): 'cod' | 'prepaid' {
  return isInDeliveryArea(city) ? 'cod' : 'prepaid'
}

/**
 * Retorna as informações de entrega formatadas para o cliente
 */
export function getDeliveryInfo(city?: string): {
  isEligible: boolean
  deliveryTime: string
  paymentMethod: string
  message: string
} {
  const isEligible = isInDeliveryArea(city)
  
  if (isEligible) {
    return {
      isEligible: true,
      deliveryTime: 'no dia seguinte',
      paymentMethod: 'pagamento na entrega',
      message: '🚚 Entrega no dia seguinte com pagamento na entrega!'
    }
  } else {
    return {
      isEligible: false,
      deliveryTime: '7-14 dias úteis',
      paymentMethod: 'pagamento antecipado',
      message: '📦 Entrega em 7-14 dias úteis via Correios com pagamento antecipado'
    }
  }
}

export function recordBanditResult(){}
export function getOptimalCombo(){ return getOptimalPricing({}) }
