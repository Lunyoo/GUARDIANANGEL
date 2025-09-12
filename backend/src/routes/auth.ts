import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { getDatabase } from '../config/database.js'
import logger from '../config/logger.js'

const router = Router()

// Schemas de validação
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nome: z.string().min(2)
})

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    
    const db = getDatabase()
  const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
    
    // Remove password from response
  const { password: _pw, ...userWithoutPassword } = user as any
    
    res.json({
      token,
      user: userWithoutPassword
    })
  } catch (error) {
    next(error)
  }
})

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, nome } = registerSchema.parse(req.body)
    
    const hashedPassword = bcrypt.hashSync(password, 10)
    
    const db = getDatabase()
    
    const result = db.prepare(`
      INSERT INTO users (email, password, nome, is_admin)
      VALUES (?, ?, ?, ?)
    `).run(email, hashedPassword, nome, email === process.env.ADMIN_EMAIL)
    
  const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
    
  const { password: _pw2, ...userWithoutPassword } = user as any
    
    res.status(201).json({
      token,
      user: userWithoutPassword
    })
  } catch (error) {
    next(error)
  }
})

// Verify token
router.get('/me', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'Token requerido' })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const db = getDatabase()
  const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId)
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }
    
  const { password: _pw3, ...userWithoutPassword } = user as any
    res.json({ user: userWithoutPassword })
  } catch (error) {
    next(error)
  }
})

// DEV ONLY quick login (creates user if not exists) - disabled in production
router.post('/dev/quick-login', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'forbidden' })
    }
    const email = (req.body?.email || 'dev@example.com').toLowerCase()
    const nome = req.body?.nome || 'Dev User'
    const password = req.body?.password || 'password123'
    const db = getDatabase()
    let user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) {
      const hashed = bcrypt.hashSync(password, 10)
      const isAdmin = email === (process.env.ADMIN_EMAIL || '').toLowerCase() ? 1 : 0
      const result = db.prepare('INSERT INTO users (email, password, nome, is_admin) VALUES (?, ?, ?, ?)').run(email, hashed, nome, isAdmin)
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    const { password: _pw, ...rest } = user
    res.json({ token, user: rest })
  } catch (e) {
    next(e)
  }
})

export default router