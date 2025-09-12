// Minimal test module
import logger from '../../config/logger'

export function testFunction() {
  logger.info('Test function called')
  return 'working'
}

export const sendWhatsAppMessage = async (phone: string, message: string) => {
  logger.info(`Would send to ${phone}: ${message}`)
  return { success: true }
}

export const isWhatsAppReady = () => true

export default {
  testFunction,
  sendWhatsAppMessage,
  isWhatsAppReady
}
