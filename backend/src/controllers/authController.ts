import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { AuthenticatedRequest } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { authLogger, logAuth } from '../services/logger'
import { cacheService } from '../services/cache'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Generate JWT token
const generateToken = (userId: string, email: string, isAdmin: boolean): string => {
  return jwt.sign(
    { userId, email, isAdmin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

// Register new user
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name }: RegisterRequest = req.body

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email e senha são obrigatórios'
    })
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    logAuth('register', email, false, { reason: 'user_exists' })
    return res.status(409).json({
      success: false,
      message: 'Usuário já existe'
    })
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || null,
      isAdmin: email === process.env.ADMIN_EMAIL // Auto-promote admin
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      isAdmin: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  })

  // Generate token
  const token = generateToken(user.id, user.email, user.isAdmin)

  // Log successful registration
  logAuth('register', email, true, { userId: user.id })

  const response: AuthResponse = {
    user,
    token,
    expiresIn: JWT_EXPIRES_IN
  }

  res.status(201).json({
    success: true,
    message: 'Usuário criado com sucesso',
    data: response
  })
})

// Login user
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password }: LoginRequest = req.body

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email e senha são obrigatórios'
    })
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user || !user.isActive) {
    logAuth('login', email, false, { reason: 'user_not_found' })
    return res.status(401).json({
      success: false,
      message: 'Credenciais inválidas'
    })
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password)

  if (!isPasswordValid) {
    logAuth('login', email, false, { reason: 'invalid_password' })
    return res.status(401).json({
      success: false,
      message: 'Credenciais inválidas'
    })
  }

  // Generate token
  const token = generateToken(user.id, user.email, user.isAdmin)

  // Cache user session
  await cacheService.cacheUserSession(user.id, {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    lastLogin: new Date()
  })

  // Log successful login
  logAuth('login', email, true, { userId: user.id })

  const { password: _, ...userWithoutPassword } = user

  const response: AuthResponse = {
    user: userWithoutPassword,
    token,
    expiresIn: JWT_EXPIRES_IN
  }

  res.json({
    success: true,
    message: 'Login realizado com sucesso',
    data: response
  })
})

// Get current user profile
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  // Get full user profile with API configuration
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      isAdmin: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      facebookToken: true,
      adAccountId: true,
      facebookAppId: true,
      facebookAppSecret: true,
      kiwifyClientId: true,
      kiwifyClientSecret: true,
      kiwifyAccessToken: true,
      ideogramToken: true
    }
  })

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado'
    })
  }

  res.json({
    success: true,
    data: user
  })
})

// Update user profile
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { name, avatarUrl } = req.body

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      name: name || undefined,
      avatarUrl: avatarUrl || undefined
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      isAdmin: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  })

  // Clear user cache to force refresh
  await cacheService.clearUserCache(req.user.id)

  authLogger.info('Profile updated', { userId: req.user.id })

  res.json({
    success: true,
    message: 'Perfil atualizado com sucesso',
    data: updatedUser
  })
})

// Update API configuration
export const updateApiConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const {
    facebookToken,
    adAccountId,
    facebookAppId,
    facebookAppSecret,
    kiwifyClientId,
    kiwifyClientSecret,
    kiwifyAccessToken,
    ideogramToken
  } = req.body

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      facebookToken: facebookToken || undefined,
      adAccountId: adAccountId || undefined,
      facebookAppId: facebookAppId || undefined,
      facebookAppSecret: facebookAppSecret || undefined,
      kiwifyClientId: kiwifyClientId || undefined,
      kiwifyClientSecret: kiwifyClientSecret || undefined,
      kiwifyAccessToken: kiwifyAccessToken || undefined,
      ideogramToken: ideogramToken || undefined
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      isAdmin: true,
      isActive: true,
      facebookToken: true,
      adAccountId: true,
      facebookAppId: true,
      facebookAppSecret: true,
      kiwifyClientId: true,
      kiwifyClientSecret: true,
      kiwifyAccessToken: true,
      ideogramToken: true
    }
  })

  // Clear user cache to force refresh
  await cacheService.clearUserCache(req.user.id)

  authLogger.info('API configuration updated', { userId: req.user.id })

  res.json({
    success: true,
    message: 'Configuração de APIs atualizada com sucesso',
    data: updatedUser
  })
})

// Change password
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    })
  }

  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Senha atual e nova senha são obrigatórias'
    })
  }

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  })

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado'
    })
  }

  // Check current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)

  if (!isCurrentPasswordValid) {
    logAuth('change_password', user.email, false, { reason: 'invalid_current_password' })
    return res.status(400).json({
      success: false,
      message: 'Senha atual incorreta'
    })
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 12)

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      password: hashedNewPassword
    }
  })

  // Clear user cache
  await cacheService.clearUserCache(req.user.id)

  logAuth('change_password', user.email, true, { userId: req.user.id })

  res.json({
    success: true,
    message: 'Senha alterada com sucesso'
  })
})

// Logout (clear session cache)
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    // Clear user session cache
    await cacheService.clearUserCache(req.user.id)
    
    logAuth('logout', req.user.email, true, { userId: req.user.id })
  }

  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  })
})

// Verify token (for frontend validation)
export const verifyToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    })
  }

  res.json({
    success: true,
    data: {
      valid: true,
      user: req.user
    }
  })
})