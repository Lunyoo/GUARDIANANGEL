import { createLogger, format, transports } from 'winston'

// Filter function to suppress venom-bot WAPI errors
// Enhanced format to filter venom errors COMPLETELY
const filterVenomErrors = format((info: any) => {
  if (info.message) {
    const message = String(info.message)
    if (message.includes('getMaybeMeUser') ||
        message.includes('WAPI') ||
        message.includes('sendExist') ||
        message.includes('getHost') ||
        message.includes('venom-bot') ||
        message.includes('sender.layer') ||
        message.includes('Unhandled Rejection at:') ||
        message.includes('[error]: Unhandled Rejection at:') ||
        message.includes('Cannot read properties of undefined')) {
      return false // Completely filter out
    }
  }
  return info
})

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    filterVenomErrors(),
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'nexus-backend' },
  transports: [
    // Write to console
    new transports.Console({
      format: format.combine(
        filterVenomErrors(),
        format.colorize(),
        format.simple()
      )
    }),
    // Write to files
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: format.combine(
        filterVenomErrors(),
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      )
    }),
    new transports.File({ 
      filename: 'logs/combined.log',
      format: format.combine(
        filterVenomErrors(),
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      )
    })
  ]
})

// Create logs directory
import { mkdirSync } from 'fs'
try {
  mkdirSync('logs', { recursive: true })
} catch (err) {
  // Directory already exists
}

export default logger