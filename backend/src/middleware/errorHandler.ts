import { Request, Response, NextFunction } from 'express'
import logger from '../config/logger.js'
import { isWhatsAppReady, sendWhatsAppMessage } from '../services/bot/whatsappClient.fixed'

// Base application error with HTTP status
export class AppError extends Error {
  status: number
  context?: any
  constructor(message: string, status = 500, context?: any) {
    super(message)
    this.status = status
    this.context = context
  }
}

export class NotFoundError extends AppError { constructor(message = 'Recurso não encontrado', ctx?: any) { super(message, 404, ctx) } }
export class ValidationError extends AppError { constructor(message = 'Dados inválidos', ctx?: any) { super(message, 400, ctx) } }
export class AuthError extends AppError { constructor(message = 'Não autorizado', ctx?: any) { super(message, 401, ctx) } }

// Async wrapper to avoid repetitive try/catch in controllers
export const asyncHandler = <T extends (req: Request, res: Response, next: NextFunction) => any>(fn: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function errorHandler(error: any, req: Request, res: Response, _next: NextFunction) {
  const status = error.status || (error.name === 'ZodError' ? 400 : 500)
  const isProd = process.env.NODE_ENV === 'production'

  logger.error('Unhandled error:', {
    name: error.name,
    message: error.message,
    status,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    context: error.context
  })

  // Zod validation
  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.errors
    })
  }

  // JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token inválido' })
  }

  // SQLite constraint
  if (error.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({ error: 'Dados duplicados ou inválidos' })
  }
  // Best-effort admin notification for 5xx errors (throttled)
  try {
    if (status >= 500) {
      const admin = process.env.ADMIN_PHONE?.replace(/\D+/g,'')
      if (admin && isWhatsAppReady()) {
        const key = `__err_last_notify__`
        // simple throttle via process global
        const g: any = global as any
        const now = Date.now()
        const last = typeof g[key] === 'number' ? g[key] : 0
        if (now - last > 60_000) {
          const msg = [
            '🚨 Erro interno no servidor',
            `Rota: ${req.method} ${req.url}`,
            `Mensagem: ${String(error?.message || 'erro')}`,
            `Status: ${status}`
          ].join('\n')
          void sendWhatsAppMessage(`${admin}@c.us`, msg)
          g[key] = now
        }
      }
    }
  } catch {}

  res.status(status).json({
    error: isProd && status === 500 ? 'Erro interno do servidor' : error.message,
    status
  })
}