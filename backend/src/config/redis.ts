import { createClient } from 'redis'
import logger from './logger.js'

let redisClient: any = null
let redisReady = false

export async function connectRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    })

    redisClient.on('error', (err: Error) => {
      logger.error('Redis error:', err)
    })

    redisClient.on('connect', () => {
      logger.info('Redis connected')
    })

    await redisClient.connect()
    redisReady = true
    return redisClient
  } catch (error) {
    // Não derrubar a aplicação se o Redis não estiver disponível
    logger.warn('Redis indisponível. Continuando sem cache. Detalhes:', error as any)
    redisClient = null
    redisReady = false
    return null
  }
}

export function getRedisClient() {
  return redisClient
}

export async function cacheSet(key: string, value: any, ttl: number = 3600) {
  try {
  if (!redisClient) return false
    await redisClient.setEx(key, ttl, JSON.stringify(value))
    return true
  } catch (error) {
    logger.error('Cache set error:', error)
    return false
  }
}

export async function cacheGet(key: string) {
  try {
  if (!redisClient) return null
    const value = await redisClient.get(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    logger.error('Cache get error:', error)
    return null
  }
}

export async function cacheDel(key: string) {
  try {
    if (!redisClient) return false
    await redisClient.del(key)
    return true
  } catch (error) {
    logger.error('Cache delete error:', error)
    return false
  }
}

export function isRedisReady() {
  return redisReady
}