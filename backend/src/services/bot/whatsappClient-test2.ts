// Test 2 - Adding imports progressively
import EventEmitter from 'events'
import logger from '../../config/logger'

export const sendWhatsAppMessage = async (phone: string, message: string) => {
  logger.info(`Would send to ${phone}: ${message}`)
  return { success: true }
}

export const isReady = () => true

export default {
  sendWhatsAppMessage,
  isReady
}
