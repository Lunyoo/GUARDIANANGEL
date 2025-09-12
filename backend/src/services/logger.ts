import logger from '../config/logger.js'

export { logger }

// Specialized loggers for different modules
export const dbLogger = logger.child({ module: 'database' })
export const authLogger = logger.child({ module: 'auth' })
export const apiLogger = logger.child({ module: 'api' })
export const queueLogger = logger.child({ module: 'queue' })
export const mlLogger = logger.child({ module: 'ml' })
export const scrapingLogger = logger.child({ module: 'scraping' })

// Helper functions for structured logging
export const logRequest = (method: string, url: string, userId?: string) => {
  apiLogger.info('API Request', {
    method,
    url,
    userId,
    timestamp: new Date().toISOString()
  })
}

export const logResponse = (method: string, url: string, statusCode: number, duration: number, userId?: string) => {
  const level = statusCode >= 400 ? 'warn' : 'info'
  apiLogger.log(level, 'API Response', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId,
    timestamp: new Date().toISOString()
  })
}

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error('Application Error', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString()
  })
}

export const logAuth = (action: string, email: string, success: boolean, details?: Record<string, any>) => {
  const level = success ? 'info' : 'warn'
  authLogger.log(level, `Auth ${action}`, {
    action,
    email,
    success,
    ...details,
    timestamp: new Date().toISOString()
  })
}

export const logDB = (operation: string, table: string, duration?: number, error?: Error) => {
  if (error) {
    dbLogger.error(`DB ${operation} failed`, {
      operation,
      table,
      error: error.message,
      duration: duration ? `${duration}ms` : undefined,
      timestamp: new Date().toISOString()
    })
  } else {
    dbLogger.debug(`DB ${operation} completed`, {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      timestamp: new Date().toISOString()
    })
  }
}

export const logQueue = (jobType: string, jobId: string, status: string, data?: Record<string, any>) => {
  queueLogger.info(`Queue job ${status}`, {
    jobType,
    jobId,
    status,
    ...data,
    timestamp: new Date().toISOString()
  })
}

export const logML = (action: string, modelName: string, data?: Record<string, any>) => {
  mlLogger.info(`ML ${action}`, {
    action,
    modelName,
    ...data,
    timestamp: new Date().toISOString()
  })
}

export const logScraping = (action: string, niche: string, status: string, data?: Record<string, any>) => {
  scrapingLogger.info(`Scraping ${action}`, {
    action,
    niche,
    status,
    ...data,
    timestamp: new Date().toISOString()
  })
}

// Performance monitoring helpers
export const createTimer = () => {
  const start = Date.now()
  return {
    stop: () => Date.now() - start,
    stopAndLog: (operation: string, context?: Record<string, any>) => {
      const duration = Date.now() - start
      logger.debug(`${operation} completed`, {
        operation,
        duration: `${duration}ms`,
        ...context,
        timestamp: new Date().toISOString()
      })
      return duration
    }
  }
}

// Security event logging
export const logSecurityEvent = (event: string, details: Record<string, any>) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    severity: 'security'
  })
}

// Business logic logging
export const logBusinessEvent = (event: string, userId: string, details?: Record<string, any>) => {
  logger.info(`Business Event: ${event}`, {
    event,
    userId,
    ...details,
    timestamp: new Date().toISOString(),
    category: 'business'
  })
}

export default logger