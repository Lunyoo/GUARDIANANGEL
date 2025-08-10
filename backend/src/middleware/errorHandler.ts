import { Request, Response, NextFunction } from 'express'
import logger from '../config/logger.js'

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  })
  
  // Validation errors (Zod)
  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.errors
    })
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido'
    })
  }
  
  // Database errors
  if (error.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({
      error: 'Dados duplicados ou inválidos'
    })
  }
  
  // Default error
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : error.message
  })
}