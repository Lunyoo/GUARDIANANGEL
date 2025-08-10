import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getDatabase } from '../config/database.js'
import logger from '../config/logger.js'

interface AuthRequest extends Request {
  user?: any
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'Token de acesso requerido' })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // Buscar usuário no banco
    const db = getDatabase()
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId)
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }
    
    req.user = user
    next()
  } catch (error) {
    logger.error('Auth middleware error:', error)
    res.status(401).json({ error: 'Token inválido' })
  }
}